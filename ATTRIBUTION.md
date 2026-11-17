# Attribution & Credits Registry

This file is the authoritative attribution ledger for all Backrooms wiki material, music, sound effects, textures, and 3D assets referenced or distributed by **Backrooms // Level 0** (`Vendreith`, 2026).

In-game player access: Open **CREDITS & LEGAL** directly from the Main Menu or Pause Screen.  
Detailed level-by-level Backrooms author breakdown: [legal/BACKROOMS_ATTRIBUTION.md](./legal/BACKROOMS_ATTRIBUTION.md)  
Complete binary asset audit & release blockers: [legal/ASSET_PROVENANCE.md](./legal/ASSET_PROVENANCE.md)

---

## 1. The Backrooms Setting & Adapted Levels / Entities (`CC BY-SA 3.0`)

This game adapts level names, classifications, lore summaries, and entity concepts from **The Backrooms Wiki (Wikidot)** (`https://backrooms-wiki.wikidot.com/`) and **Backrooms Wiki (Fandom)** (`https://backrooms.fandom.com/`), distributed under **Creative Commons Attribution-ShareAlike 3.0 Unported (CC BY-SA 3.0)**:

- **License:** Creative Commons Attribution-ShareAlike 3.0 Unported (`CC BY-SA 3.0`)
- **License URL:** `https://creativecommons.org/licenses/by-sa/3.0/` (Local copy: [LICENSES/CC-BY-SA-3.0.txt](./LICENSES/CC-BY-SA-3.0.txt))
- **Wikidot Licensing Guide:** `https://backrooms-wiki.wikidot.com/licensing-guide`
- **Modifications Made:** Original lore articles were interpreted into procedural 3D environments (`src/levels/*.js`), Vietnamese UI names/taglines (`src/levels/catalog.js`), interactive entry mechanics (portals, noclip floors, crouch vents, pickups), and survival/coop gameplay rules.
- **Specific Creator Credits:** All individual authors identified for the 21 playable levels and iconic entities (including `DivineAtlas`, `DrAkimoto`, `Robert Goerman`, `Praetor3005`, `egglord`, `Stretchsterz`, `Bart0nius`, `ratscrapz`, `Greggita Mahayfaio`, `Dr Bierre`, `ShadowOfTheProphet`, `1000dumplings`, `Kai4C`, `jikupa`, `AndromedeadReal`, `u/ThePizzaEater1000`, `u/Nerdykiddo4884`, and `M654z`) are credited individually in [legal/BACKROOMS_ATTRIBUTION.md](./legal/BACKROOMS_ATTRIBUTION.md) and in the in-game **CREDITS & LEGAL** modal.

### Distinction: Independent Creators (Non-CC BY-SA References)

- **Kane Parsons (Kane Pixels):** References to *"A-Sync Research"*, *"KV-31 Threshold Resonance"*, *"Bacteria"*, and *"Still-Life"* reflect inspiration from Kane Pixels' *Backrooms* series (`youtube.com/@kanepixels`). These elements are **not** CC BY-SA 3.0 wiki property and are flagged in [legal/BACKROOMS_ATTRIBUTION.md](./legal/BACKROOMS_ATTRIBUTION.md) for creator review / genericization if desired.
- **Jared Pike:** Level 37's minimalist surreal tiled aesthetic draws visual inspiration from Jared Pike's *Dream Pools* architectural renders (2020). No images, renders, or 3D files created by Jared Pike are included in this project; all Level 37 geometry, shaders, and textures are custom/procedural.
- **Level 37 V4 research:** ["Sublimity"](https://backrooms-wiki.wikidot.com/level-37) is written by **egglord** (wiki text: CC BY-SA 3.0). The three images displayed in that article (`Poolrooms-1`, `Poolrooms-3`, `Poolrooms-4`) are credited by the article to **u/AnarkyMusic**, under **CC BY-SA 4.0**. Those images and individually licensed bathhouse photographs were studied for architectural principles; no research photograph is bundled or used as a texture. The new geometry is procedural. The game's **Hydrolitis Stalker**, pumps and fixed return portal are custom additions; the Wikidot article describes an entity-free level.

---

## 2. Music Tracks (`CC BY 3.0` / Public Domain / Synthetic / Flagged)

| Work Title | Original Creator | Source URL | License & URL | Game Component | Modifications Made | Required Notice / Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **"Spacial Winds"** (`public/audio/ambient_spacial.mp3`) | Kevin MacLeod (`incompetech.com`) | `https://archive.org/details/Kevin-MacLeod_Supernatural-Haunting_2014_FullAlbum` | **CC BY 3.0** (`https://creativecommons.org/licenses/by/3.0/`) | Ambient exploration track (`MUSIC_TRACKS.spacial`, `src/audio.js`) | Unmodified MP3 from *Supernatural Haunting* (2014) | "Spacial Winds" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 3.0 License |
| **"Apprehension"** (`public/audio/chase_apprehension.mp3`) | Kevin MacLeod (`incompetech.com`) | `https://archive.org/details/Kevin-MacLeod_Supernatural-Haunting_2014_FullAlbum` | **CC BY 3.0** (`https://creativecommons.org/licenses/by/3.0/`) | Chase buildup track (`MUSIC_TRACKS.apprehension`, `src/audio.js`) | Unmodified MP3 | "Apprehension" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 3.0 License |
| **"Controlled Chaos"** (`public/audio/chase_chaos.mp3`) | Kevin MacLeod (`incompetech.com`) | `https://archive.org/details/Kevin-MacLeod_Supernatural-Haunting_2014_FullAlbum` | **CC BY 3.0** (`https://creativecommons.org/licenses/by/3.0/`) | Active Entity chase track (`MUSIC_TRACKS.chaos`, `src/audio.js`) | Unmodified MP3 | "Controlled Chaos" Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 3.0 License |
| **"Deep Noise", "Phantom from Space", "Ghost Story", "Come Play with Me", "Chase Pulse", "Chase Pulse Faster", "Night of Chaos", "Nerves"** (`ambient_deep_noise.mp3`, `ambient_phantom.mp3`, `ambient_ghost_story.mp3`, `ambient_come_play.mp3`, `chase_pulse.mp3`, `chase_pulse_faster.mp3`, `chase_night_chaos.mp3`, `chase_nerves.mp3`) | Kevin MacLeod (`incompetech.com`) | `https://incompetech.com/music/royalty-free/` | **CC BY 3.0** (`https://creativecommons.org/licenses/by/3.0/`) | Ambient exploration & Entity chase music rotation (`src/audio.js`) | Trimmed loop & loudness-normalized (`88 kbps` MP3) | Kevin MacLeod (`incompetech.com`) — Licensed under Creative Commons: By Attribution 3.0 License |
| **Backrooms Level OST Collection** (`backrooms_level0_theme.mp3`, `backrooms_level2_theme.mp3`, `backrooms_level5_hotel.mp3`, `backrooms_level6_dark.mp3`, `backrooms_level_fun.mp3`, `backrooms_level122_mall.mp3`, `backrooms_level18_abyss.mp3`, `backrooms_the_hub.mp3`, `chase_redlands.mp3`, `chase_evacuation.mp3`) | **Piem Ión** | `https://archive.org/search?query=creator%3A%22Piem+I%C3%B3n%22` (Level 0, 2, 5, 6, Fun, 122, 18.1, The Hub, 73 Redlands, 7.6 Evacuation) | **CC BY-SA 4.0** (`https://creativecommons.org/licenses/by-sa/4.0/`) | Per-level ambient themes & intense Entity chase themes (`src/audio.js`) | Loop-trimmed, fade-smoothed & loudness-normalized (`88 kbps` MP3) | Music by Piem Ión — Licensed under CC BY-SA 4.0 (trimmed/normalized for looping) |
| **"Daisy Bell (Music Box Arrangement)"** (`public/audio/daisy_bell_tape.mp3`) | Composition: Harry Dacre (1892); Synth: Vendreith / build script (2026) | `src/audio.js` (`MUSIC_TRACKS.daisy`) | **Public Domain** (1892 composition) + procedural synthesis | Ambient VHS music box track | Synthesized from sine/octave harmonics + FFmpeg vibrato/echo tape filter | Public Domain composition (Harry Dacre, 1892) |
| **"Poolrooms Reverie"** (`public/audio/poolrooms_reverie.mp3`) | Vendreith / build script (2026) | `src/audio.js` (`MUSIC_TRACKS.poolrooms`) | Procedural synthesis (see Category D notes in `ASSET_PROVENANCE.md`) | Level 37 ambient track | Original Amaj7–Gmaj7–Fmaj7–Emadd9 chord synth + FFmpeg echo/lowpass | Procedural / AI-assisted synth |
| **Additional Track Review Queue** (`burning_memory.mp3`, `bewildered.mp3`, `ballroom_memory.mp3`, `sweetest_delusion.mp3`, `faded_angel.mp3`, `velvet_corridor.mp3`, `async_threshold.mp3`, `null_protocol_chase.mp3`) | See [legal/ASSET_PROVENANCE.md](./legal/ASSET_PROVENANCE.md) | Internet Archive / The Caretaker / Extracted video audio | **Category E — Unverified / Release Blocker** | Alternate ambient & chase slots in `src/audio.js` | Pitch/tempo warping or FFmpeg excerpting | **Flagged for replacement** before unrestricted public redistribution |

---

## 3. Sound Effects (`CC BY 3.0` / Public Domain / Flagged)

| Work Title | Original Creator | Source / Metadata | License | Game Component |
| :--- | :--- | :--- | :--- | :--- |
| **"rusty metal door clasp"** (`sfx_clasp.ogg`) | Stephan | Embedded Vorbis metadata (`ARTIST=Stephan`); SoundBible | **CC BY 3.0** (verify exact SoundBible listing ID if updated) | Random horror SFX (`src/audio.js`) |
| **"door handle creaking"** (`sfx_creak.ogg`) | Stephan | Embedded Vorbis metadata (`ARTIST=Stephan`); SoundBible | **CC BY 3.0** | Random horror SFX (`src/audio.js`) |
| **"elevator door closing"** (`sfx_elevator_door.ogg`) | Stephan | Embedded Vorbis metadata (`ARTIST=Stephan`); SoundBible | **CC BY 3.0** | Elevator intro door SFX (`src/audio.js`) |
| **"Knocking on Wood or Door"** (`sfx_knock.ogg`) | Stephan | Embedded Vorbis metadata (`ARTIST=Stephan`); SoundBible | **CC BY 3.0** | Random horror SFX (`src/audio.js`) |
| **"metal cabinet door jarring"** (`sfx_metal_bang.ogg`) | Stephan | Embedded Vorbis metadata (`ARTIST=Stephan`); SoundBible | **CC BY 3.0** | Random horror SFX (`src/audio.js`) |
| **"squeaky door"** (`sfx_squeak.ogg`) | LeonMire | Embedded Vorbis metadata (`ARTIST=LeonMire`) | **Unverified CC license (confirm CC BY 3.0 / CC0 source link)** — see `ASSET_PROVENANCE.md` | Random horror SFX (`src/audio.js`) |
| **Cassini Saturn Radio Emissions** (`sfx_saturn_radio.wav`) | NASA / JPL (Cassini RPWS) | US Government Public Domain (`17 U.S.C. § 105`) | **Public Domain** | Radio anomaly SFX (`src/audio.js`) |
| **"Breathing Tired" / Sprint Panting** (`sfx_sprint_breath.ogg`) | Phani29 (OpenGameArt) | `https://opengameart.org/content/breathing-tired` | **CC0 1.0 Universal** | Heavy sprint breathing layer (`src/audio.js`) |
| **"Horror Breathing"** (`sfx_horror_breath.ogg`) | OpenGameArt Contributor | `https://opengameart.org/content/horror-breathing` | **CC0 1.0 Universal** | Stamina exhaustion gasp & panic breath (`src/audio.js`) |
| **Backrooms Jumpscare Shriek Composite** (`sfx_jumpscare.ogg`) | looneybits & OpenGameArt Contributors | `https://opengameart.org/content/high-pitch-scream-sounds2` + `insect-or-alien-scream-short` | **CC0 1.0 Universal** | Monster attack jumpscare shriek (`src/audio.js`) |
| **Unverified SFX** (`sfx_static.wav`, `sfx_growl1.ogg`, `sfx_growl2.ogg`, `sfx_whisper.ogg`) | Unknown / Missing provenance (`sfx_static.wav` embeds *Bee Movie* text payload) | Local binary audit | **Category E — Flagged for Replacement** | Random horror SFX (`src/audio.js`) |

---

## 4. Textures & Material Maps (`CC0 1.0`)

| Asset Set | Original Creator | Source URL | License & URL | Game Component | Modifications |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `carpet_color.jpg`, `carpet_normal.jpg`, `carpet_rough.jpg` | Lennart Demes (`ambientCG`) | `https://ambientcg.com/` | **CC0 1.0 Universal** ([LICENSES/CC0-1.0.txt](./LICENSES/CC0-1.0.txt)) | Level 0 damp carpet material (`src/textures.js`) | Re-tiled / tinted in PBR material setup |
| `ceiling_color.jpg`, `ceiling_normal.jpg`, `ceiling_rough.jpg` | Lennart Demes (`ambientCG`) | `https://ambientcg.com/` | **CC0 1.0 Universal** | Level 0 acoustic ceiling tiles (`src/textures.js`) | Unmodified / normal-mapped |
| `wall_color.jpg`, `wall_normal.jpg`, `wall_rough.jpg` | Lennart Demes (`ambientCG`) | `https://ambientcg.com/` | **CC0 1.0 Universal** | Level 0 wallpaper PBR base (`src/textures.js`) | Combined with Canvas2D striped wallpaper patterns |
| `decals/AsphaltDamageSet001/*`, `Leaking012A/*`, `Leaking013A/*`, `Leaking019C/*` | Lennart Demes (`ambientCG`) | `https://ambientcg.com/` | **CC0 1.0 Universal** | Wall water-leak stains & floor damage decals (`src/textures.js`) | Converted to alpha-masked grime masks via `buildLeakAlphaTexture()` |

---

## 5. 3D Models

Level 37 V5/V5.1 uses original generated meshes, aquatic props, canvas tile materials and a procedural atmosphere. Its private research index is `research/poolrooms/v5/sources.json` (37 selected images, with per-image source and rights). Jared Pike's Dream Pools images and official WhiteWater/Intex photographs were viewed as private architectural/prop references; their reserved-rights images, models, textures, branding and exact scenes are not included in the game or repository export. No research photograph is used as a runtime texture. The sky/clouds are generated in shaders without an external HDRI or cloud photograph. The original Sublimity/Level 37 lore attribution remains applicable.

| Asset | Source & Attribution | License & Caveat |
| :--- | :--- | :--- |
| `public/models/Soldier.glb` | Redistributed from `mrdoob/three.js` (`examples/models/gltf/Soldier.glb`), originally derived from **Adobe Mixamo** (Vanguard rigged character) | Usable in Three.js MIT contexts / embedded Mixamo game builds; **Mixamo terms restrict raw standalone model redistribution** — flagged in [legal/ASSET_PROVENANCE.md](./legal/ASSET_PROVENANCE.md) for custom character replacement if redistributing standalone raw repo assets broadly. |
