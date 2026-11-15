/**
 * Clean 3D Found-Footage Engine & WebRTC P2P Core.
 * Contains only runtime-active modules (Three.js + PMNDRS Postprocessing + PeerJS).
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  Effect,
  EffectAttribute,
  EffectComposer,
  RenderPass,
  EffectPass,
  SavePass,
  BloomEffect,
  VignetteEffect,
  NoiseEffect,
  BlendFunction
} from 'postprocessing';
import { Peer } from 'peerjs';

export {
  THREE,
  GLTFLoader,
  SkeletonUtils,
  BufferGeometryUtils,
  Effect,
  EffectAttribute,
  EffectComposer,
  RenderPass,
  EffectPass,
  SavePass,
  BloomEffect,
  VignetteEffect,
  NoiseEffect,
  BlendFunction,
  Peer
};

/**
 * Asynchronous preloader with GPU shader warm-up pass to avoid first-frame stutter.
 */
export class PreloaderSystem {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.tasks = [];
  }

  addTask(label, asyncFn) {
    this.tasks.push({ label, asyncFn });
  }

  static yieldFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  async runAll(onProgress = () => {}) {
    const total = this.tasks.length + 1;
    for (let i = 0; i < this.tasks.length; i++) {
      const task = this.tasks[i];
      onProgress(i / total, task.label);
      await PreloaderSystem.yieldFrame();
      await task.asyncFn();
    }
    onProgress((total - 1) / total, 'Đang biên dịch Shaders & nạp VRAM (GPU Warm-up)...');
    await PreloaderSystem.yieldFrame();
    await this.warmUpGPU();
    onProgress(1, 'Hoàn tất!');
    await PreloaderSystem.yieldFrame();
  }

  async warmUpGPU() {
    try {
      this.renderer.compile(this.scene, this.camera);
    } catch {}
    this.renderer.render(this.scene, this.camera);
  }
}

/**
 * O(1) 2D Spatial Hash Grid for collision and line-of-sight wall queries.
 */
export class SpatialGrid2D {
  constructor(cellSize = 2) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.allRects = [];
  }

  clear() {
    this.cells.clear();
    this.allRects = [];
  }

  build(rects) {
    this.clear();
    this.allRects = rects;
    const cs = this.cellSize;
    for (const r of rects) {
      const i0 = Math.floor(r.x0 / cs), i1 = Math.floor(r.x1 / cs);
      const j0 = Math.floor(r.z0 / cs), j1 = Math.floor(r.z1 / cs);
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const key = `${i},${j}`;
          let bucket = this.cells.get(key);
          if (!bucket) {
            bucket = [];
            this.cells.set(key, bucket);
          }
          bucket.push(r);
        }
      }
    }
  }

  queryNear(x, z, radius = 1) {
    const cs = this.cellSize;
    const i0 = Math.floor((x - radius) / cs), i1 = Math.floor((x + radius) / cs);
    const j0 = Math.floor((z - radius) / cs), j1 = Math.floor((z + radius) / cs);
    const out = new Set();
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const bucket = this.cells.get(`${i},${j}`);
        if (bucket) for (const r of bucket) out.add(r);
      }
    }
    return out;
  }
}

/**
 * WebRTC ICE config (multi-STUN + TURN relays) for cross-network browser multiplayer.
 */
const METERED_RELAY = {
  username: 'e07241262509f7010002b8d2',
  credential: 'LTVELjLJXWi0nSmu'
};

export const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  {
    urls: [
      'turn:global.relay.metered.ca:80',
      'turn:global.relay.metered.ca:80?transport=tcp',
      'turn:global.relay.metered.ca:443',
      'turns:global.relay.metered.ca:443?transport=tcp'
    ],
    ...METERED_RELAY
  }
];

export const PEER_OPTS = {
  debug: 1,
  config: {
    iceServers: DEFAULT_ICE_SERVERS,
    sdpSemantics: 'unified-plan'
  }
};

export function createResilientPeer(id = undefined, extraIceServers = []) {
  return new Peer(id, {
    debug: 1,
    config: {
      iceServers: [...DEFAULT_ICE_SERVERS, ...extraIceServers],
      sdpSemantics: 'unified-plan'
    }
  });
}
