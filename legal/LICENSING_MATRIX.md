# Project Licensing Matrix (Categories A–F)

This matrix maps every directory, code module, library, and media asset group in `backrooms-multiplayer` (`2026-11-15`) to its IP classification, rights holder, governing license, and verification state.

**Category Key:**
- **A:** Original Controlled Material (Vendreith)
- **B:** Third-Party Open-License Material (MIT, Zlib, BSD-3-Clause, CC BY 3.0)
- **C:** Backrooms-Derived Material (CC BY-SA 3.0 Wiki / Independent Creator Review)
- **D:** AI-Assisted or Procedurally Generated Material
- **E:** Unknown, Unverified, or Redistribution-Restricted Material (**Release Blocker**)
- **F:** Public Domain or CC0 1.0 Material

---

## 1. Source Code & Configuration Matrix

| File / Path | Category | Owner / Author | License / Legal Basis | Status & Notes |
| :--- | :--- | :--- | :--- | :--- |
| `src/engine.js` | **A** | Vendreith (`2026`) | `Copyright © 2026 Vendreith. All rights reserved.` | Three.js/Postprocessing/PeerJS facade & SpatialGrid2D. Hardcoded TURN creds removed (`VITE_TURN_*` env vars only). |
| `src/postfx.js` | **A** | Vendreith (`2026`) | `Copyright © 2026 Vendreith. All rights reserved.` | Custom GLSL shaders (`MOTION_BLUR_FRAG`, `CRT_GRADE_FRAG`, `Preset 5: Soft Upscale / Dreamcam` bicubic & halation). Uses `postprocessing` (`Zlib`) classes via import. |
| `src/network.js` | **A** | Vendreith (`2026`) | `Copyright © 2026 Vendreith. All rights reserved.` | PeerJS lobby, P2P snapshots, `?room=` invites, AI/host role management. |
| `src/ai.js` | **A** | Vendreith (`2026`) | `Copyright © 2026 Vendreith. All rights reserved.` | Bounded local sight/hearing Entity AI & dynamic grid A* steering. |
| `src/main.js` | **A** (+ embeds UI links/refs to C) | Vendreith (`2026`) | `Copyright © 2026 Vendreith. All rights reserved.` (level display labels synced from CC BY-SA 3.0 catalog) | Core game loop, bunny-hop physics, HUD, Teleport/No-Clip panel, `#test` harness, Credits & Legal modal wiring. |
| `src/levels/terrain.js` | **A** | Vendreith (`2026`) | `Copyright © 2026 Vendreith. All rights reserved.` | Heightfield, water depth, slide acceleration & A* grid queries. |
| `src/levels/world_mesh.js` | **A** (+ uses level metadata from C) | Vendreith (`2026`) | `Copyright © 2026 Vendreith. All rights reserved.` | Batched BufferGeometry, InstancedMesh, GPU Sky Dome & animated water shader. |
| `src/constants.js` | **C / Mixed (A + C)** | Vendreith (`2026`) + Wikidot/Fandom + Indie Refs | Original config/presets (© 2026 Vendreith); Adapted Backrooms item/entity/lore concepts (**CC BY-SA 3.0**). Note: references *"A-Sync"* / *"Bacteria"* / *"Still-Life"* (flagged in `BACKROOMS_ATTRIBUTION.md`). | Dual-noticed file header applied. |
| `src/levels/catalog.js` | **C / Mixed (A + C)** | Backrooms Wiki Authors (`CC BY-SA 3.0`) + Vendreith (`2026`) | **CC BY-SA 3.0** (level names, codes, entity archetypes, adapted Vietnamese taglines & hints) + Original technical schema/palettes (Vendreith). | Full author table in `legal/BACKROOMS_ATTRIBUTION.md`. |
| `src/levels/world_generators.js`, `src/levels/level_populator.js`, `src/levels/poolrooms_world.js`, `src/levels/poolrooms_v3_zones.js`, `src/levels/prop_builder.js` | **Mixed (A + C + D)** | Vendreith (`2026`) + Backrooms Wiki (`CC BY-SA 3.0`) + Jared Pike visual aesthetic inspiration | Procedural 3D architecture & geometry code by Vendreith; derivative Backrooms level layouts/lore governed by **CC BY-SA 3.0** where reproducing protected lore concepts. | No external images or 3D files by Jared Pike used. |
| `src/map.js` | **Mixed (A + C)** | Vendreith (`2026`) + Backrooms/FF Refs | Original procedural maze/zone generator; contains sector labels (`ff1_*`, `ff2_*`, `async_*`, `redrooms`, etc.) flagged for trademark/creator separation review. | Dual-noticed file header applied. |
| `src/levels/level_textures.js`, `src/textures.js` | **A / D** (+ loads F) | Vendreith (`2026`) | Original procedural Canvas2D generators; loads **CC0 1.0** `ambientCG` JPGs (`public/textures/*`). Uses *"ASYNC RESEARCH"* poster text string. | `async` poster text flagged in `BACKROOMS_ATTRIBUTION.md`. |
| `src/models.js` | **Mixed (A + E)** | Vendreith (`2026`) + Three.js/Mixamo (`Soldier.glb`) | Procedural geometry & animations (`© 2026 Vendreith`); loads `./models/Soldier.glb` (**Category E** standalone caveat). Includes fallback procedural Hazmat model. | Removing/replacing `Soldier.glb` cleanly activates fallback Hazmat mesh. |
| `src/audio.js` | **Mixed (A + B + E + F)** | Vendreith (`2026`) + Third-Party Audio Creators | Procedural WebAudio synthesizer code (`© 2026 Vendreith`); loads music/SFX tracks categorized across B, D, E, F. | Audio provenance ledger in `ASSET_PROVENANCE.md`. |
| `index.html`, `vite.config.js`, `package.json`, `.github/workflows/deploy.yml`, `scripts/verify-legal-compliance.mjs` | **A** | Vendreith (`2026`) | `Copyright © 2026 Vendreith. All rights reserved.` | HTML5 UI, CSS, Vite bundle/banner & legal compliance tooling. |
| `LICENSE.md`, `COPYRIGHT.md`, `NOTICE.md`, `ATTRIBUTION.md`, `THIRD_PARTY_NOTICES.md`, `CONTRIBUTING.md`, `SECURITY.md`, `legal/*.md` | **A** (Documentation) | Vendreith (`2026`) | Project legal documentation (reproduces upstream notices verbatim where required). | Published in both repo root and `dist/` via Vite build plugin. |
| `LICENSES/*` | **B / F** | Creative Commons, MIT/Zlib/BSD upstream texts | Verbatim standard license texts. | Preserved untouched in `LICENSES/`. |

---

## 2. External Libraries & Assets Summary

| Group | Category | License | Safe to Distribute on GitHub Pages Today? |
| :--- | :--- | :--- | :--- |
| `three`, `peerjs`, `eventemitter3`, `peerjs-js-binarypack`, `sdp`, `postprocessing`, `webrtc-adapter` | **B** | `MIT`, `Zlib`, `BSD-3-Clause` | **YES** (verbatim notices preserved in `THIRD_PARTY_NOTICES.md` & `dist/`). |
| `ambientCG` textures & decals (`public/textures/**/*.jpg`) | **F** | `CC0 1.0 Universal` | **YES** (Public Domain dedication; credit included in `ATTRIBUTION.md`). |
| Kevin MacLeod tracks (`ambient_spacial.mp3`, `chase_apprehension.mp3`, `chase_chaos.mp3`) | **B** | `CC BY 3.0` | **YES** (Required attribution included in `ATTRIBUTION.md` and in-game Credits modal). |
| Stephan SFX (`sfx_clasp`, `sfx_creak`, `sfx_elevator_door`, `sfx_knock`, `sfx_metal_bang`) | **B** | `CC BY 3.0` (SoundBible) | **YES — minor action**: log exact SoundBible URLs/clip IDs in `ASSET_PROVENANCE.md` if desired. |
| `sfx_saturn_radio.wav` | **F** | US Gov Public Domain (NASA/JPL Cassini) | **YES**. |
| `daisy_bell_tape.mp3`, `poolrooms_reverie.mp3` | **D / F** | 1892 Public Domain melody / Procedural synth | **YES** (note limited copyrightability of purely AI/algorithmic synth). |
| `burning_memory.mp3`, `bewildered.mp3`, `ballroom_memory.mp3`, `sweetest_delusion.mp3`, `faded_angel.mp3`, `velvet_corridor.mp3`, `async_threshold.mp3`, `null_protocol_chase.mp3`, `sfx_static.wav`, `sfx_growl1.ogg`, `sfx_growl2.ogg`, `sfx_whisper.ogg`, `sfx_squeak.ogg` | **E** (or unverified B) | **Unverified / Copyrighted Upstream** | **NO — RELEASE BLOCKER**: Replace or obtain verified license before unrestricted public distribution. |
| `Soldier.glb` | **E** | Three.js example / Adobe Mixamo Vanguard | **CONDITIONAL**: Embedded game playback permitted under Mixamo terms for licensed accounts; raw `.glb` in public repo/Pages folder carries Mixamo raw-redistribution caveat. Procedural fallback already exists in `src/models.js`. |
