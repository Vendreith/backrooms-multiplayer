# Licensing & Intellectual Property Policy

**Project:** Backrooms // Level 0 (Found Footage Multiplayer & AI Survival)  
**Developer Identity:** Vendreith  
**Repository:** `https://github.com/Vendreith/backrooms-multiplayer`  
**Status:** Free-to-Play Browser Game (Multi-Component / Split Licensing Structure)

> [!IMPORTANT]
> This repository contains **separable components governed by different licenses**. No single blanket license applies blindly to every file. Specifically, **Adapted Backrooms Lore & World Content** derived from Backrooms wiki sources is licensed under **CC BY-SA 3.0**, whereas **original independent engine code, shaders, and build configuration** created by Vendreith remain proprietary unless integrated as an indivisible adaptation of CC BY-SA 3.0 creative expression. See [legal/LICENSING_MATRIX.md](./legal/LICENSING_MATRIX.md) for the exact component breakdown.

---

## Summary Table

| Component | Category | Rights Holder / Licensor | Applicable Terms | Commercial / Modification / Redistribution |
| :--- | :--- | :--- | :--- | :--- |
| **Original Engine, PostFX Shaders, P2P Netcode, UI & Game Loop** (`src/engine.js`, `src/main.js`, `src/ai.js`, `src/network.js`, `src/postfx.js`, `src/levels/terrain.js`, `src/levels/world_mesh.js`) | Category A | **Vendreith** (`© 2026`) | **All Rights Reserved** | Playing in browser is free. Redistributing, extracting, selling, or creating derivative commercial clones of this proprietary code is **not permitted** without written permission. |
| **Adapted Backrooms Levels, Lore Descriptions, Entities & Mixed Files** (`src/constants.js`, `src/levels/catalog.js`, `src/levels/world_generators.js`, `src/levels/level_populator.js`, `src/levels/poolrooms_world.js`, `src/levels/poolrooms_v3_zones.js`, `src/map.js`, etc. — specifically the Backrooms-derived lore/text/design adaptations) | Category C / Mixed | Backrooms Wiki Authors (`backrooms-wiki.wikidot.com` / `backrooms.fandom.com`) & Vendreith (for original procedural implementations) | **CC BY-SA 3.0** (`https://creativecommons.org/licenses/by-sa/3.0/`) for adapted Backrooms creative expression; original non-derivative engine utilities remain © 2026 Vendreith | **CC BY-SA 3.0** portions may be shared, remixed, and adapted (including commercially) **only if** full attribution is preserved and any derivative of the adapted material is released under **CC BY-SA 3.0**. |
| **Third-Party Software Libraries** (`three`, `postprocessing`, `peerjs`, etc.) | Category B | Upstream open-source authors | `MIT`, `Zlib`, `BSD-3-Clause` | Permitted under their respective upstream open-source licenses. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md). |
| **Third-Party CC BY 3.0 / CC0 / Public Domain Assets** | Category B & F | Kevin MacLeod, ambientCG (Lennart Demes), Stephan, LeonMire, NASA/JPL, Harry Dacre (1892) | `CC BY 3.0`, `CC0 1.0`, Public Domain | Governed by their respective upstream licenses. See [ATTRIBUTION.md](./ATTRIBUTION.md). |
| **Unverified / Flagged Assets (Release Blockers)** | Category E | Various third-party rightsholders | **Unverified / Do Not Redistribute** | Specifically flagged in [legal/ASSET_PROVENANCE.md](./legal/ASSET_PROVENANCE.md). Excluded from any license grant by Vendreith and queued for developer replacement prior to formal release. |

---

## Part I — Original Code & Proprietary Rights (`Copyright © 2026 Vendreith`)

Subject to Part II, Part III, and Part IV below:

1. **Ownership:** All original source code, custom WebGL/GLSL post-processing shaders (`src/postfx.js`), WebRTC peer-to-peer synchronization architecture (`src/network.js`, `src/engine.js`), spatial grid and AI patrol algorithms (`src/ai.js`), procedural texture algorithms, procedural audio synthesis (`src/audio.js`), custom 3D mesh builders (`src/levels/world_mesh.js`), UI/HUD styling (`index.html`), and build tooling written independently by **Vendreith** are:

   **Copyright © 2026 Vendreith. All rights reserved.**

2. **Free-to-Play vs. Open Source:** Making this game **free to play** via GitHub Pages does **not** make Vendreith's proprietary source code public domain or open source, and does **not** grant permission to:
   - Extract, rip, or repackage Vendreith's proprietary source code or original assets;
   - Re-upload, rebrand, or host unauthorized copies of the complete game claiming it as another developer's work;
   - Sell copies, monetize, or build unauthorized commercial derivative products from Vendreith's proprietary code.

3. **No Incompatible Overreach:** Nothing in Part I overrides, restricts, or imposes DRM/All-Rights-Reserved terms upon any component governed by **CC BY-SA 3.0**, **CC BY 3.0**, **CC0 1.0**, **MIT**, **Zlib**, or **BSD-3-Clause**.

---

## Part II — Backrooms-Derived Material (`CC BY-SA 3.0`)

This project incorporates and adapts concepts, level names, classifications, entity archetypes, and descriptive text originating from collaborative Backrooms wikis (`https://backrooms-wiki.wikidot.com/` and `https://backrooms.fandom.com/`), which publish content under the **Creative Commons Attribution-ShareAlike 3.0 Unported License (CC BY-SA 3.0)**:

- License text: [LICENSES/CC-BY-SA-3.0.txt](./LICENSES/CC-BY-SA-3.0.txt)
- Official URL: `https://creativecommons.org/licenses/by-sa/3.0/`
- Wikidot Licensing Guide: `https://backrooms-wiki.wikidot.com/licensing-guide`

In strict compliance with CC BY-SA 3.0:
1. All adapted Backrooms creative expression contained in this project (including adapted level catalogs, entity descriptions, lore texts, and derivative level designs) is licensed to the public under **CC BY-SA 3.0**.
2. Full author, source URL, and modification credits are maintained in [legal/BACKROOMS_ATTRIBUTION.md](./legal/BACKROOMS_ATTRIBUTION.md), [ATTRIBUTION.md](./ATTRIBUTION.md), and inside the playable **CREDITS & LEGAL** menu.
3. No effective technological measures (DRM) or restrictive contractual terms are placed on any CC BY-SA 3.0 covered portion of the game.
4. Independent creators outside CC BY-SA wikis (notably **Kane Parsons / Kane Pixels** regarding *A-Sync* / *KV-31* / *Bacteria* references, and **Jared Pike** regarding the *Dream Pools* architectural inspiration) retain their own independent rights; see [legal/BACKROOMS_ATTRIBUTION.md](./legal/BACKROOMS_ATTRIBUTION.md) for human-review guidance and separation recommendations.

---

## Part III — Third-Party Software & Open-Licensed Assets

All bundled open-source packages (`three`, `postprocessing`, `peerjs`, `eventemitter3`, `peerjs-js-binarypack`, `sdp`, `webrtc-adapter`) and external `CC BY 3.0` / `CC0 1.0` / Public Domain assets remain governed solely by their original licenses. Full license texts are stored in [LICENSES/](./LICENSES/) and reproduced with copyright notices in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) and [ATTRIBUTION.md](./ATTRIBUTION.md).

---

## Part IV — Scope of Certainty & Legal Review Status

> [!WARNING]
> Because this game combines original code, procedural geometry, CC BY-SA 3.0 Backrooms wiki adaptations, references to non-CC creators (*A-Sync* / *Bacteria*), and several unverified audio/model files flagged as **Category E release blockers** in [legal/ASSET_PROVENANCE.md](./legal/ASSET_PROVENANCE.md), legal counsel has **not** issued a formal certification that the entire repository can be safely commercialized or cleanly severed under a proprietary license without replacing Category E assets and clarifying mixed-work CC BY-SA 3.0 boundaries.  
> Until those items are resolved by the developer, this `LICENSE.md` accurately separates rights **without overclaiming exclusive ownership over any third-party or ShareAlike-encumbered element**.
