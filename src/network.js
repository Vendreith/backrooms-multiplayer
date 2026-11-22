/*!
 * Copyright (c) 2026 Vendreith. All rights reserved (Original Engine & Code).
 * Licensing information: see LICENSE.md
 * Third-party notices: see THIRD_PARTY_NOTICES.md
 */

import { Peer, PEER_OPTS, HAS_TURN_RELAY } from './engine.js';
import { MAXP, SURV_COLORS, ENTITY_ARCHETYPES, selectMatchEntities } from './constants.js';

const ROOM_PREFIX = 'br-dbd-v2-';
const JOIN_TIMEOUT_MS = 30000;

export function randomRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[(Math.random() * chars.length) | 0];
  return out;
}

/**
 * PeerJS WebRTC P2P Multiplayer & Solo Host Manager.
 * Supports room codes, ?room=CODE invite URLs, and multi-STUN/TURN relay traversal.
 */
export class NetworkManager {
  constructor(handlers) {
    this.h = handlers; // { onLobbyUpdate, onStartGame, onSnapshot, onEvent, onStatus, onPing, onHostDisconnect }
    this.peer = null;
    this.isHost = true;
    this.isSolo = false;
    this.roomCode = '';
    this.myId = 'LOCAL';
    this.conns = new Map(); // peerId -> DataConnection (host side)
    this.hostConn = null;   // client side
    this.pending = new Set();
    this.joined = false;
    this.roomStarted = false;
    this.roster = [];       // [{ id, name, role: 's'|'k', colorIdx, isAI }]
    this.aiEnabled = false;
    this.pingMs = 0;
    this._pingTimer = null;
    this._joinTimer = null;
  }

  _clearTimers() {
    if (this._pingTimer) { clearInterval(this._pingTimer); this._pingTimer = null; }
    if (this._joinTimer) { clearTimeout(this._joinTimer); this._joinTimer = null; }
  }

  destroy() {
    this._clearTimers();
    const peer = this.peer;
    const connections = [...this.conns.values(), ...this.pending, this.hostConn];
    this.peer = null;
    this.hostConn = null;
    this.joined = false;
    this.roomStarted = false;
    this.conns.clear();
    this.pending.clear();
    for (const connection of connections) { try { connection?.close(); } catch {} }
    peer?.destroy();
  }

  _appendAIEntities(seed) {
    const selected = selectMatchEntities(seed ?? ((Math.random() * 89999 + 10000) | 0), 9);
    for (const arch of selected) {
      this.roster.push({
        id: arch.id,
        aiKind: arch.kind,
        name: arch.name,
        role: 'k',
        colorIdx: 0,
        spawnQuadrant: arch.spawnQuadrant,
        spawnJitter: arch.spawnJitter,
        isAI: true
      });
    }
  }

  startSolo(playerName, playAsKiller = false, seed = ((Math.random() * 89999 + 10000) | 0)) {
    this.destroy();
    this.isHost = true;
    this.isSolo = true;
    this.aiEnabled = !playAsKiller;
    this.myId = 'P1';
    this.roomCode = 'SOLO';
    this.roster = [
      { id: 'P1', name: (playerName || 'Wanderer').slice(0, 18), role: playAsKiller ? 'k' : 's', colorIdx: 0, isAI: false }
    ];
    if (!playAsKiller) {
      this._appendAIEntities(seed);
    } else {
      this.roster.push({ id: 'BOT_S1', name: 'M.E.G. Operative 1', role: 's', colorIdx: 1, isAI: true });
      this.roster.push({ id: 'BOT_S2', name: 'M.E.G. Operative 2', role: 's', colorIdx: 2, isAI: true });
    }
    this.h.onLobbyUpdate(this.roster, this);
  }

  createOnlineRoom(playerName, preferredCode = '', _retryCount = 0) {
    this.destroy();
    this.isHost = true;
    this.isSolo = false;
    this.roomCode = (preferredCode || randomRoomCode()).toUpperCase();
    this.h.onStatus('Opening an online room…');

    const peer = new Peer(ROOM_PREFIX + this.roomCode, PEER_OPTS);
    this.peer = peer;

    peer.on('open', (id) => {
      if (this.peer !== peer) return;
      this.myId = id;
      this.roster = [
        { id, name: (playerName || 'Host').slice(0, 18), role: 's', colorIdx: 0, isAI: false }
      ];
      this.h.onStatus(`Room ready: ${this.roomCode}`);
      this.h.onLobbyUpdate(this.roster, this);
    });

    peer.on('connection', (conn) => {
      if (this.peer !== peer) { conn.close(); return; }
      this.pending.add(conn);
      const pendingTimeout = setTimeout(() => conn.close(), JOIN_TIMEOUT_MS);
      let offered = false;
      const reject = message => {
        conn.send({ t: 'err', msg: message });
        setTimeout(() => conn.close(), 1000);
      };
      const admit = () => {
        if (this.conns.has(conn.peer)) return;
        if (this.roomStarted) { reject('This match has already started.'); return; }
        if (this.conns.size >= MAXP - 1) { reject('This room is full.'); return; }
        clearTimeout(pendingTimeout);
        this.pending.delete(conn);
        this.conns.set(conn.peer, conn);
        const usedColors = new Set(this.roster.map(r => r.colorIdx));
        let colorIdx = 0;
        for (let i = 0; i < SURV_COLORS.length; i++) {
          if (!usedColors.has(i)) { colorIdx = i; break; }
        }
        const guest = {
          id: conn.peer,
          name: (typeof conn.metadata?.name === 'string' ? conn.metadata.name.trim().slice(0, 18) : '') || `Guest ${this.conns.size}`,
          role: 's',
          colorIdx,
          isAI: false
        };
        this.roster.push(guest);
        conn.send({ t: 'welcome', id: conn.peer, roster: this.roster, aiEnabled: this.aiEnabled });
        this.broadcast({ t: 'lobby', roster: this.roster, aiEnabled: this.aiEnabled });
        this.h.onLobbyUpdate(this.roster, this);
      };

      conn.on('data', (msg) => {
        if (this.peer !== peer || !msg || typeof msg !== 'object') return;
        if (msg.t === 'join-request' && !this.conns.has(conn.peer)) {
          if (this.roomStarted) { reject('This match has already started.'); return; }
          if (this.conns.size >= MAXP - 1) { reject('This room is full.'); return; }
          offered = true;
          conn.send({ t: 'join-offer' });
          return;
        }
        if (msg.t === 'join-ack' && offered) { admit(); return; }
        if (this.conns.get(conn.peer) !== conn) return;
        if (msg.t === 'ping') {
          conn.send({ t: 'pong', ts: msg.ts });
          return;
        }
        if (msg.t === 'input') {
          this.h.onClientInput?.(conn.peer, msg);
        } else if (msg.t === 'act') {
          this.h.onClientAction?.(conn.peer, msg);
        } else if (msg.t === 'rename') {
          const entry = this.roster.find(r => r.id === conn.peer);
          if (entry && msg.name) {
            entry.name = String(msg.name).slice(0, 18);
            this.broadcast({ t: 'lobby', roster: this.roster, aiEnabled: this.aiEnabled });
            this.h.onLobbyUpdate(this.roster, this);
          }
        }
      });

      conn.on('close', () => {
        clearTimeout(pendingTimeout);
        this.pending.delete(conn);
        if (this.peer !== peer || this.conns.get(conn.peer) !== conn) return;
        this.conns.delete(conn.peer);
        this.roster = this.roster.filter(r => r.id !== conn.peer);
        this.broadcast({ t: 'lobby', roster: this.roster, aiEnabled: this.aiEnabled });
        this.h.onLobbyUpdate(this.roster, this);
        this.h.onPeerDisconnect?.(conn.peer);
      });
      conn.on('error', () => conn.close());
    });

    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      if (err?.type === 'unavailable-id' && !preferredCode && _retryCount < 2) {
        this.createOnlineRoom(playerName, '', _retryCount + 1);
        return;
      }
      this.h.onStatus(`P2P connection error: ${err.type || err.message}`);
    });
  }

  joinOnlineRoom(code, playerName) {
    this.destroy();
    this.isHost = false;
    this.isSolo = false;
    this.roomCode = code.trim().toUpperCase();
    this.roster = [];
    this.aiEnabled = false;
    this.h.onLobbyUpdate(this.roster, this);
    if (!/^[A-Z0-9]{6}$/.test(this.roomCode)) {
      this.h.onStatus('Enter a valid six-character room code.');
      return;
    }
    this.h.onStatus(`Connecting to room ${this.roomCode}...`);

    const peer = new Peer(undefined, PEER_OPTS);
    this.peer = peer;

    const fail = message => {
      if (this.peer !== peer) return;
      this.destroy();
      this.roster = [];
      this.h.onLobbyUpdate(this.roster, this);
      this.h.onStatus(message);
    };
    this._joinTimer = setTimeout(() => {
      if (!this.joined) {
        const relayHint = HAS_TURN_RELAY ? '' : ' This build has no TURN relay for restricted networks.';
        fail(`Could not join room ${this.roomCode}. Check the code and internet connection.${relayHint}`);
      }
    }, JOIN_TIMEOUT_MS);

    peer.on('open', (id) => {
      if (this.peer !== peer) return;
      this.myId = id;
      const conn = peer.connect(ROOM_PREFIX + this.roomCode, {
        reliable: true,
        serialization: 'json',
        metadata: { name: (playerName || 'Operative').slice(0, 18) }
      });
      if (!conn) { fail('Could not open a connection to the host.'); return; }
      this.hostConn = conn;

      conn.on('open', () => {
        if (this.hostConn === conn) conn.send({ t: 'join-request' });
      });

      conn.on('data', (msg) => {
        if (this.hostConn !== conn || !msg || typeof msg !== 'object') return;
        if (msg.t === 'join-offer') { conn.send({ t: 'join-ack' }); return; }
        if (msg.t === 'err') { fail(String(msg.msg || 'The host rejected the connection.')); return; }
        if (!this.joined) {
          if (msg.t !== 'welcome' || msg.id !== this.myId || !Array.isArray(msg.roster) || !msg.roster.some(player => player.id === this.myId)) return;
          this.joined = true;
          clearTimeout(this._joinTimer);
          this._joinTimer = null;
          this.h.onStatus(`Joined room ${this.roomCode}. Waiting for the host to start.`);
          this._pingTimer = setInterval(() => {
            if (conn.open) conn.send({ t: 'ping', ts: performance.now() });
          }, 2000);
        }
        if (msg.t === 'pong') {
          this.pingMs = Math.round(performance.now() - msg.ts);
          this.h.onPing?.(this.pingMs);
          return;
        }
        if (msg.t === 'welcome' || msg.t === 'lobby') {
          this.roster = msg.roster || [];
          this.aiEnabled = !!msg.aiEnabled;
          this.h.onLobbyUpdate(this.roster, this);
        } else if (msg.t === 'start') {
          this.h.onStartGame?.(msg);
        } else if (msg.t === 'snap') {
          this.h.onSnapshot?.(msg);
        } else if (msg.t === 'ev') {
          this.h.onEvent?.(msg);
        }
      });

      conn.on('close', () => {
        if (this.hostConn !== conn) return;
        const wasJoined = this.joined;
        fail(wasJoined ? 'Disconnected from the host.' : 'The connection closed before the host confirmed your join.');
        if (wasJoined) this.h.onHostDisconnect?.();
      });
      conn.on('error', () => {
        if (!this.joined) fail('The data channel could not connect to the host.');
      });
    });

    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      if (!this.joined) fail(`Could not connect to room ${this.roomCode}: ${err.type || err.message}`);
    });
  }

  renameSelf(name) {
    const clean = String(name || '').trim().slice(0, 18);
    if (!clean || this.isSolo) return;
    if (this.isHost) {
      const entry = this.roster.find(r => r.id === this.myId);
      if (entry) {
        entry.name = clean;
        this.broadcast({ t: 'lobby', roster: this.roster, aiEnabled: this.aiEnabled });
        this.h.onLobbyUpdate(this.roster, this);
      }
    } else if (this.hostConn?.open) {
      this.sendToHost({ t: 'rename', name: clean });
    }
  }

  assignRole(targetId, role) {
    if (!this.isHost) return;
    if (role === 'k') {
      for (const r of this.roster) {
        if (r.role === 'k' && r.id !== targetId) r.role = 's';
      }
      this.aiEnabled = false;
    }
    const t = this.roster.find(r => r.id === targetId);
    if (t) t.role = role;
    this.broadcast({ t: 'lobby', roster: this.roster, aiEnabled: this.aiEnabled });
    this.h.onLobbyUpdate(this.roster, this);
  }

  toggleAIEntity(enabled, seed = ((Math.random() * 89999 + 10000) | 0)) {
    if (!this.isHost) return;
    this.aiEnabled = enabled;
    this.roster = this.roster.filter(r => r.id !== 'AI_ENTITY' && !r.id.startsWith('AI_ENT_'));
    if (enabled) {
      for (const r of this.roster) if (r.role === 'k') r.role = 's';
      this._appendAIEntities(seed);
    }
    this.broadcast({ t: 'lobby', roster: this.roster, aiEnabled: this.aiEnabled });
    this.h.onLobbyUpdate(this.roster, this);
  }

  broadcast(msg) {
    if (!this.isHost || this.isSolo) return;
    if (msg.t === 'start') this.roomStarted = true;
    for (const c of this.conns.values()) {
      if (c.open) {
        try { c.send(msg); } catch {}
      }
    }
  }

  sendToHost(msg) {
    if (this.isHost) return;
    if (this.joined && this.hostConn?.open) {
      try { this.hostConn.send(msg); } catch {}
    }
  }
}
