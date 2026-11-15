import { Peer, PEER_OPTS } from './engine.js';
import { MAXP, SURV_COLORS, ENTITY_ARCHETYPES } from './constants.js';

const ROOM_PREFIX = 'br-dbd-v2-';

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
    for (const c of this.conns.values()) { try { c.close(); } catch {} }
    this.conns.clear();
    if (this.hostConn) { try { this.hostConn.close(); } catch {} this.hostConn = null; }
    if (this.peer) { try { this.peer.destroy(); } catch {} this.peer = null; }
  }

  startSolo(playerName, playAsKiller = false) {
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
      for (const arch of ENTITY_ARCHETYPES) {
        this.roster.push({
          id: arch.id,
          aiKind: arch.kind,
          name: arch.name,
          role: 'k',
          colorIdx: 0,
          isAI: true
        });
      }
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
    this.h.onStatus('Đang khởi tạo phòng P2P Online (STUN/TURN)...');

    const peer = new Peer(ROOM_PREFIX + this.roomCode, PEER_OPTS);
    this.peer = peer;

    peer.on('open', (id) => {
      if (this.peer !== peer) return;
      this.myId = id;
      this.roster = [
        { id, name: (playerName || 'Host').slice(0, 18), role: 's', colorIdx: 0, isAI: false }
      ];
      this.h.onStatus(`Phòng sẵn sàng: ${this.roomCode}`);
      this.h.onLobbyUpdate(this.roster, this);
    });

    peer.on('connection', (conn) => {
      if (this.conns.size >= MAXP - 1) {
        conn.on('open', () => { conn.send({ t: 'err', msg: 'Phòng đã đầy!' }); conn.close(); });
        return;
      }
      conn.on('open', () => {
        this.conns.set(conn.peer, conn);
        const usedColors = new Set(this.roster.map(r => r.colorIdx));
        let colorIdx = 0;
        for (let i = 0; i < SURV_COLORS.length; i++) {
          if (!usedColors.has(i)) { colorIdx = i; break; }
        }
        const guest = {
          id: conn.peer,
          name: (conn.metadata?.name || `Khách ${this.conns.size}`).slice(0, 18),
          role: 's',
          colorIdx,
          isAI: false
        };
        this.roster.push(guest);
        conn.send({ t: 'welcome', id: conn.peer, roster: this.roster, aiEnabled: this.aiEnabled });
        this.broadcast({ t: 'lobby', roster: this.roster, aiEnabled: this.aiEnabled });
        this.h.onLobbyUpdate(this.roster, this);
      });

      conn.on('data', (msg) => {
        if (!msg || typeof msg !== 'object') return;
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
        this.conns.delete(conn.peer);
        this.roster = this.roster.filter(r => r.id !== conn.peer);
        this.broadcast({ t: 'lobby', roster: this.roster, aiEnabled: this.aiEnabled });
        this.h.onLobbyUpdate(this.roster, this);
        this.h.onPeerDisconnect?.(conn.peer);
      });
    });

    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      if (err?.type === 'unavailable-id' && !preferredCode && _retryCount < 2) {
        this.createOnlineRoom(playerName, '', _retryCount + 1);
        return;
      }
      this.h.onStatus(`Lỗi kết nối P2P: ${err.type || err.message}`);
    });
  }

  joinOnlineRoom(code, playerName) {
    this.destroy();
    this.isHost = false;
    this.isSolo = false;
    this.roomCode = code.trim().toUpperCase();
    this.h.onStatus(`Đang kết nối vào phòng ${this.roomCode}...`);

    const peer = new Peer(undefined, PEER_OPTS);
    this.peer = peer;

    this._joinTimer = setTimeout(() => {
      if (this.peer === peer && (!this.hostConn || !this.hostConn.open)) {
        this.h.onStatus(`Hết thời gian kết nối vào phòng ${this.roomCode} — Kiểm tra mã phòng hoặc mạng!`);
      }
    }, 12000);

    peer.on('open', (id) => {
      if (this.peer !== peer) return;
      this.myId = id;
      const conn = peer.connect(ROOM_PREFIX + this.roomCode, {
        reliable: true,
        metadata: { name: (playerName || 'Operative').slice(0, 18) }
      });
      this.hostConn = conn;

      conn.on('open', () => {
        if (this._joinTimer) { clearTimeout(this._joinTimer); this._joinTimer = null; }
        this.h.onStatus(`Đã vào phòng ${this.roomCode}! Đang chờ Host bắt đầu...`);
        this._pingTimer = setInterval(() => {
          if (conn.open) conn.send({ t: 'ping', ts: performance.now() });
        }, 2000);
      });

      conn.on('data', (msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.t === 'pong') {
          this.pingMs = Math.round(performance.now() - msg.ts);
          this.h.onPing?.(this.pingMs);
          return;
        }
        if (msg.t === 'err') {
          this.h.onStatus(msg.msg);
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
        this._clearTimers();
        this.h.onStatus('Mất kết nối tới Host.');
        this.h.onHostDisconnect?.();
      });
    });

    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      if (this._joinTimer) { clearTimeout(this._joinTimer); this._joinTimer = null; }
      this.h.onStatus(`Không tìm thấy phòng hoặc lỗi mạng: ${err.type || err.message}`);
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

  toggleAIEntity(enabled) {
    if (!this.isHost) return;
    this.aiEnabled = enabled;
    this.roster = this.roster.filter(r => r.id !== 'AI_ENTITY' && !r.id.startsWith('AI_ENT_'));
    if (enabled) {
      for (const r of this.roster) if (r.role === 'k') r.role = 's';
      for (const arch of ENTITY_ARCHETYPES) {
        this.roster.push({
          id: arch.id,
          aiKind: arch.kind,
          name: arch.name,
          role: 'k',
          colorIdx: 0,
          isAI: true
        });
      }
    }
    this.broadcast({ t: 'lobby', roster: this.roster, aiEnabled: this.aiEnabled });
    this.h.onLobbyUpdate(this.roster, this);
  }

  broadcast(msg) {
    if (!this.isHost || this.isSolo) return;
    for (const c of this.conns.values()) {
      if (c.open) {
        try { c.send(msg); } catch {}
      }
    }
  }

  sendToHost(msg) {
    if (this.isHost) return;
    if (this.hostConn && this.hostConn.open) {
      try { this.hostConn.send(msg); } catch {}
    }
  }
}
