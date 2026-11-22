/*!
 * Copyright (c) 2026 Vendreith. All rights reserved (Original Engine & Code).
 * Licensing information: see LICENSE.md
 * Third-party notices: see THIRD_PARTY_NOTICES.md
 */

/**
 * Clean 3D Found-Footage Engine & WebRTC P2P Core.
 * Contains only runtime-active modules (Three.js + PMNDRS Postprocessing + PeerJS).
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  Pass,
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
  SMAAEffect,
  SMAAPreset,
  EdgeDetectionMode,
  PredicationMode,
  FXAAEffect
} from 'postprocessing';
import { Peer } from 'peerjs';

export {
  THREE,
  GLTFLoader,
  SkeletonUtils,
  BufferGeometryUtils,
  Pass,
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
  SMAAEffect,
  SMAAPreset,
  EdgeDetectionMode,
  PredicationMode,
  FXAAEffect,
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
    // Occluded windows (headless review, minimized desktop app) stall rAF and
    // would hang the preloader. Either callback settles the same frame yield;
    // normal gameplay still advances by compositor-locked rAF.
    return new Promise(resolve => {
      let settled = false;
      const done = () => { if (!settled) { settled = true; resolve(); } };
      requestAnimationFrame(done);
      setTimeout(done, 120);
    });
  }

  async runAll(onProgress = () => {}) {
    const total = this.tasks.length + 1;
    for (let i = 0; i < this.tasks.length; i++) {
      const task = this.tasks[i];
      onProgress(i / total, task.label);
      await PreloaderSystem.yieldFrame();
      await task.asyncFn();
    }
    onProgress((total - 1) / total, 'Compiling Shaders & loading VRAM (GPU Warm-up)...');
    await PreloaderSystem.yieldFrame();
    await this.warmUpGPU();
    onProgress(1, 'Done!');
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
 * WebRTC ICE config (public STUN + optional TURN relay via environment config) for cross-network browser multiplayer.
 * Vite embeds these values in the browser bundle. Supply only client-scoped TURN
 * credentials, never a provider API key or a TURN shared secret.
 */
const TURN_USERNAME = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_TURN_USERNAME || '') : '';
const TURN_CREDENTIAL = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_TURN_CREDENTIAL || '') : '';
const TURN_URLS = (import.meta.env?.VITE_TURN_URLS || '').split(',').map(url => url.trim()).filter(url => /^turns?:/i.test(url));
export const HAS_TURN_RELAY = Boolean(TURN_USERNAME && TURN_CREDENTIAL);

export const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  ...(HAS_TURN_RELAY
    ? [{
        urls: TURN_URLS.length ? TURN_URLS : [
          'turn:global.relay.metered.ca:80',
          'turn:global.relay.metered.ca:80?transport=tcp',
          'turn:global.relay.metered.ca:443',
          'turns:global.relay.metered.ca:443?transport=tcp'
        ],
        username: TURN_USERNAME,
        credential: TURN_CREDENTIAL
      }]
    : [])
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
