# Copyright & Authorship Statement

**Public Developer Identity:** Vendreith  
**Verified Project Creation Year:** 2026 (Git history verified from `2026-11-15`, initial commit `0913b31` through `c000dfd`)  
**Official Repository:** `https://github.com/Vendreith/backrooms-multiplayer`

---

## 1. Original Authorship Claims (Vendreith)

Subject to applicable law and existing third-party licenses, **Vendreith** holds copyright in the original authorship created for this project, including:

- Core Three.js rendering, camera rig, bunny-hop movement physics, crouch-vent collision, and spatial grid queries (`src/engine.js`, `src/main.js`, `src/levels/terrain.js`);
- Custom GLSL post-processing effects including VHS/CRT grading, temporal motion blur, optical bloom, and **Preset 5: Soft Upscale / Dreamcam** bicubic reconstruction & halation shaders (`src/postfx.js`);
- PeerJS WebRTC peer-to-peer lobby, matchmaking, role selection, and host/client state synchronization (`src/network.js`);
- Bounded local-awareness AI pathfinding and chase controllers (`src/ai.js`);
- Procedural 3D architectural generation across Level 0 and the 20 Backrooms sub-levels, including the 40-zone Living Labyrinth redesign of Level 37 (`src/levels/*.js`, `src/models.js`);
- Procedural WebAudio synthesizer, spatial audio mixing, and adaptive horror soundscape logic (`src/audio.js`);
- Procedural Canvas2D texture generators (`src/textures.js`, `src/levels/level_textures.js`);
- HTML5 / CSS3 found-footage camcorder HUD, Lobby UI, Telemetry/Teleport console UI, Mobile virtual controls, and In-Game Credits/Legal overlay (`index.html`).

Where legally eligible, these original expressions are protected under copyright law (`Copyright © 2026 Vendreith`). Notice of copyright does **not** imply that formal government copyright registration certificates have been issued; as of this documentation update, **no formal copyright registration number or registered trademark is claimed**.

---

## 2. What Vendreith Does NOT Claim Exclusive Ownership Over

Vendreith explicitly **disclaims** exclusive ownership over:

1. **The Underlying Backrooms Concept & Lore:** The overarching "Backrooms" setting (originally popularized anonymously on 4chan `/x/` in 2019 and expanded across collaborative wikis) belongs to collective internet folklore and its respective wiki contributors under **CC BY-SA 3.0**.
2. **Community-Created Backrooms Levels & Entities:** Names, level numbers, entity concepts, and wiki lore sourced from `backrooms-wiki.wikidot.com` and `backrooms.fandom.com` belong to their individual credited authors under **CC BY-SA 3.0** (see [legal/BACKROOMS_ATTRIBUTION.md](./legal/BACKROOMS_ATTRIBUTION.md)).
3. **Independent Creator Worlds:** Specific concepts associated with **Kane Parsons (Kane Pixels)** (*A-Sync*, *KV-31*, *Bacteria*) and **Jared Pike** (*Dream Pools*) remain the intellectual property of their respective creators. No official affiliation or endorsement exists.
4. **Open-Source Software Libraries:** `three`, `postprocessing`, `peerjs`, `eventemitter3`, `peerjs-js-binarypack`, `sdp`, `webrtc-adapter`, and build tools (`vite`, `rollup`, etc.) belong to their respective authors (see [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)).
5. **Third-Party Music, SFX, 3D Models & Textures:** All external media assets (`public/audio/*`, `public/models/Soldier.glb`, `public/textures/*.jpg`, `public/textures/decals/*`) remain the property of their respective creators or rightsholders under their stated licenses or unverified status (see [ATTRIBUTION.md](./ATTRIBUTION.md) and [legal/ASSET_PROVENANCE.md](./legal/ASSET_PROVENANCE.md)).
6. **Public Domain Works:** Public domain compositions (such as Harry Dacre's 1892 *"Daisy Bell"*) and US Government public domain audio (NASA Cassini Saturn radio emissions) are free of copyright restriction.
7. **AI-Assisted Material:** For any code, procedural parameters, or synthesized audio produced with AI tooling assistance, Vendreith makes no unfounded copyright claim over purely unedited machine-generated outputs where human authorship criteria under applicable copyright law are not satisfied.

---

## 3. No Official Endorsement

This project is an independent fan/indie game. It is **not** affiliated with, sponsored by, or officially endorsed by the Backrooms Wikidot community, Fandom, Kane Parsons (Kane Pixels), A24, Jared Pike, Three.js, or PeerJS.

---

## 4. Permissions, Licensing Inquiries & Takedowns

- For permissions regarding **original code created by Vendreith** (Category A), or to report attribution errors, licensing concerns, or copyright/takedown requests:
  - Open an issue at `https://github.com/Vendreith/backrooms-multiplayer/issues` (or follow [legal/TAKEDOWN_CONTACT.md](./legal/TAKEDOWN_CONTACT.md)).
- For reuse of **CC BY-SA 3.0 Backrooms adaptations**, **CC BY 3.0** tracks, or **MIT/Zlib/BSD** software libraries, see the respective licenses linked in [LICENSE.md](./LICENSE.md), [ATTRIBUTION.md](./ATTRIBUTION.md), and [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
