# Privacy & Multiplayer Data Notice

**Effective / Last Reviewed:** 2026-11-15  
**Status:** Accurate Technical Disclosure (Pending formal jurisdictional contact email/controller review by Developer)

This notice describes strictly what data **Backrooms // Level 0** (`https://github.com/Vendreith/backrooms-multiplayer`) processes in your browser and over the network when you play Solo or Online Multiplayer.

---

## 1. Summary — No Central Account Server, Cookies, or Analytics

- The game does **not** run a custom central backend server or database.
- The game does **not** require account registration, passwords, email addresses, or real names.
- The game sets **zero HTTP tracking cookies** and loads **zero third-party advertising or analytics scripts** (no Google Analytics, Meta Pixel, Sentry, etc.).

---

## 2. Data Categories Processed & Purposes

### A. Browser Local Storage (`localStorage`) — Strictly Local Preferences
The game saves display and control preferences strictly on your own device using the browser `localStorage` API (`src/main.js`). None of these values are transmitted to Vendreith:
- `br_gfx_v2`: Graphics quality preset (`mobile` / `low` / `med` / `high` / `ultra`)
- `br_fx_v2`: Custom camcorder/CRT post-processing sliders & footage filter mode
- `br_fps_v2`: Frame rate limit preference
- `br_aspect_v2`: Camera aspect ratio (`16:9` / `4:3`)
- `br_sens_v2`: Mouse/touch look sensitivity
- `br_mvol_v2` & `br_svol_v2`: Music & sound effects volume levels

You may clear all saved preferences at any time via your browser's site data settings.

### B. Ephemeral Gameplay & Lobby Information
- **Player Nickname (`#nameInput`, max 18 chars):** Chosen locally by you (`Operative` by default) and broadcast peer-to-peer only to other players currently inside your multiplayer room. Not saved permanently by any server.
- **6-Character Room Code & Invite URL (`?room=XXXXXX`):** Generated locally (`src/network.js`) to address a Host's PeerJS room ID (`br-dbd-v2-XXXXXX`). Exists only while the Host keeps the browser tab open.
- **Game State Sync:** Player coordinates, facing angle, crouch/flashlight/inventory states, Entity positions, and teleport/noclip triggers transmitted in memory over WebRTC DataChannels.

### C. WebRTC Peer-to-Peer Networking & IP Address Visibility
When you use **Online Multiplayer** ("Tạo Phòng Online" or "Vào Phòng"):
1. **Direct Peer-to-Peer Connections (WebRTC):** Because WebRTC establishes direct peer connections between the Host and joined Guests (`PeerJS`), **your public (and sometimes local ICE candidate) IP address is technically visible at the network protocol level to the peers connected in the same multiplayer room.** Only share room codes/links with players you trust.
2. **Signaling Service (`PeerJS Cloud — 0.peerjs.com`):** Your Peer ID and WebRTC SDP session offers pass through PeerJS's default public signaling server solely to pair players into a room.
3. **STUN Servers (`src/engine.js`):** Public STUN servers (`stun.l.google.com:19302`, `stun1.l.google.com:19302`, `stun.cloudflare.com:3478`, `stun.relay.metered.ca:80`) receive NAT-discovery requests containing your IP address to determine reachable connection candidates. Optional TURN relay servers are disabled unless configured at build time (`VITE_TURN_USERNAME`).
4. **Encryption in Transit:** WebRTC data channels (`RTCPeerConnection` / `RTCDataChannel`) enforce DTLS transport encryption between peers, while PeerJS WebSocket signaling uses TLS (`wss://`) when loaded over HTTPS (GitHub Pages). However, signaling metadata and direct peer IP exchange occur per standard WebRTC architecture — this game does **not** claim "end-to-end anonymous privacy" against peers you join.
5. **Solo Mode Exception:** Selecting *Solo* mode operates entirely offline in local browser memory without opening any WebRTC peer connections.

### D. Hosting Provider Infrastructure (GitHub Pages)
When accessing the live web build on GitHub Pages (`*.github.io`), **GitHub, Inc.** automatically receives standard HTTP server logs (IP address, user-agent, timestamp, requested asset paths) under the [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

---

## 3. Data Retention & Player Rights

- **Vendreith's Retention:** Zero server-side player data is collected or stored by Vendreith.
- **Local Data Erasure:** Clear site storage (`localStorage`) in your browser to delete all local settings immediately.
- **Multiplayer Opt-Out:** Use Solo Mode or avoid joining untrusted room codes if you do not wish to expose your IP address over WebRTC to other players.
- **Privacy Contact (Manual Completion Notice):** Before commercial launch or formal EU GDPR / CCPA applicability assessment, the developer should add a monitored contact email address in [TAKEDOWN_CONTACT.md](./TAKEDOWN_CONTACT.md) and update this section. Currently, inquiries can be submitted via GitHub Issues (`https://github.com/Vendreith/backrooms-multiplayer/issues`).
