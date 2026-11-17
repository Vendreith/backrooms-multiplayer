# Digital Asset Provenance Register

**Last Forensic Binary & Metadata Audit:** 2026-11-15  
**Scope:** Every static file under `public/` (`69` files total), plus procedural asset pipelines (`src/textures.js`, `src/levels/level_textures.js`, `src/audio.js`, `src/models.js`).

> [!CAUTION]
> **RELEASE BLOCKERS IDENTIFIED (Category E Assets):** Binary inspection of ID3/Vorbis/WAV/XMP/GLB headers revealed **13 audio files** and **1 3D model** that lack verified redistribution licenses or contain third-party copyrighted recordings / payloads. **Vendreith does not claim copyright over these files**, and they must be replaced or cleared prior to unrestricted public/commercial release.

---

## 1. Music Assets (`public/audio/*.mp3`)

| Asset Path | Size (Bytes) | Forensic Metadata / Origin | Category | Creator / Supplier | License | Distribution Status & Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `public/audio/ambient_spacial.mp3` | `6,055,936` | ID3v2/v1: *"Spacial Winds"*, Artist: `Kevin MacLeod`, Album: `Supernatural Haunting` (2014), downloaded from `archive.org` via `dl_assets.js` | **B** | Kevin MacLeod (`incompetech.com`) | **CC BY 3.0** | **APPROVED** — Notice required & present in `ATTRIBUTION.md` and in-game Credits. |
| `public/audio/chase_apprehension.mp3` | `3,273,029` | ID3: *"Apprehension"*, `Kevin MacLeod`, `incompetech.com`, *Supernatural Haunting* | **B** | Kevin MacLeod (`incompetech.com`) | **CC BY 3.0** | **APPROVED** — Notice present. |
| `public/audio/chase_chaos.mp3` | `14,202,880` | ID3v2/v1: *"Controlled Chaos"*, `Kevin MacLeod`, `Supernatural Haunting` (2014) | **B** | Kevin MacLeod (`incompetech.com`) | **CC BY 3.0** | **APPROVED** — Notice present. |
| `public/audio/ambient_deep_noise.mp3` | `779,274` | `incompetech.com/music/royalty-free/mp3-royaltyfree/Deep%20Noise.mp3`, loop-trimmed & normalized via FFmpeg | **B** | Kevin MacLeod (`incompetech.com`) | **CC BY 3.0** | **APPROVED** — Notice present in `ATTRIBUTION.md` & Credits. |
| `public/audio/ambient_phantom.mp3` | `758,910` | `incompetech.com/music/royalty-free/mp3-royaltyfree/Phantom%20from%20Space.mp3`, loop-trimmed via FFmpeg | **B** | Kevin MacLeod (`incompetech.com`) | **CC BY 3.0** | **APPROVED** — Notice present. |
| `public/audio/ambient_ghost_story.mp3` | `759,144` | `incompetech.com/music/royalty-free/mp3-royaltyfree/Ghost%20Story.mp3`, loop-trimmed via FFmpeg | **B** | Kevin MacLeod (`incompetech.com`) | **CC BY 3.0** | **APPROVED** — Notice present. |
| `public/audio/ambient_come_play.mp3` | `733,827` | `incompetech.com/music/royalty-free/mp3-royaltyfree/Come%20Play%20with%20Me.mp3`, loop-trimmed via FFmpeg | **B** | Kevin MacLeod (`incompetech.com`) | **CC BY 3.0** | **APPROVED** — Notice present. |
| `public/audio/chase_pulse.mp3` | `739,291` | `incompetech.com/music/royalty-free/mp3-royaltyfree/Chase%20Pulse.mp3`, loop-trimmed via FFmpeg | **B** | Kevin MacLeod (`incompetech.com`) | **CC BY 3.0** | **APPROVED** — Notice present. |
| `public/audio/chase_pulse_faster.mp3` | `699,069` | `incompetech.com/music/royalty-free/mp3-royaltyfree/Chase%20Pulse%20Faster.mp3`, loop-trimmed via FFmpeg | **B** | Kevin MacLeod (`incompetech.com`) | **CC BY 3.0** | **APPROVED** — Notice present. |
| `public/audio/chase_night_chaos.mp3` | `739,031` | `incompetech.com/music/royalty-free/mp3-royaltyfree/Night%20of%20Chaos.mp3`, loop-trimmed via FFmpeg | **B** | Kevin MacLeod (`incompetech.com`) | **CC BY 3.0** | **APPROVED** — Notice present. |
| `public/audio/chase_nerves.mp3` | `739,047` | `incompetech.com/music/royalty-free/mp3-royaltyfree/Nerves.mp3`, loop-trimmed via FFmpeg | **B** | Kevin MacLeod (`incompetech.com`) | **CC BY 3.0** | **APPROVED** — Notice present. |
| `public/audio/backrooms_level0_theme.mp3` | `778,634` | Archive.org (`backrooms-level-0-theme`), normalized loop via FFmpeg | **B / C** | Piem Ión (`archive.org/details/backrooms-level-0-theme`) | **CC BY-SA 4.0** | **APPROVED** — Attribution & ShareAlike notice present. |
| `public/audio/backrooms_level2_theme.mp3` | `758,277` | Archive.org (`backrooms-level-2-theme`), normalized loop via FFmpeg | **B / C** | Piem Ión (`archive.org/details/backrooms-level-2-theme`) | **CC BY-SA 4.0** | **APPROVED** — Attribution & ShareAlike notice present. |
| `public/audio/backrooms_level5_hotel.mp3` | `818,906` | Archive.org (`backrooms-level-5-terror-hotel-theme`), normalized loop via FFmpeg | **B / C** | Piem Ión (`archive.org/details/backrooms-level-5-terror-hotel-theme`) | **CC BY-SA 4.0** | **APPROVED** — Attribution & ShareAlike notice present. |
| `public/audio/backrooms_level6_dark.mp3` | `758,695` | Archive.org (`backrooms-level-6-theme`), normalized loop via FFmpeg | **B / C** | Piem Ión (`archive.org/details/backrooms-level-6-theme`) | **CC BY-SA 4.0** | **APPROVED** — Attribution & ShareAlike notice present. |
| `public/audio/backrooms_level_fun.mp3` | `758,688` | Archive.org (`backrooms-level-fun`), normalized loop via FFmpeg | **B / C** | Piem Ión (`archive.org/details/backrooms-level-fun`) | **CC BY-SA 4.0** | **APPROVED** — Attribution & ShareAlike notice present. |
| `public/audio/backrooms_level122_mall.mp3` | `778,830` | Archive.org (`backrooms-level-122-mallsoft`), normalized loop via FFmpeg | **B / C** | Piem Ión (`archive.org/details/backrooms-level-122-mallsoft`) | **CC BY-SA 4.0** | **APPROVED** — Attribution & ShareAlike notice present. |
| `public/audio/backrooms_level18_abyss.mp3` | `778,690` | Archive.org (`backrooms-level-18.1-the-lucid-abyss-theme`), normalized loop via FFmpeg | **B / C** | Piem Ión (`archive.org/details/backrooms-level-18.1-the-lucid-abyss-theme`) | **CC BY-SA 4.0** | **APPROVED** — Attribution & ShareAlike notice present. |
| `public/audio/backrooms_the_hub.mp3` | `758,532` | Archive.org (`backrooms-level-the-hub-theme`), normalized loop via FFmpeg | **B / C** | Piem Ión (`archive.org/details/backrooms-level-the-hub-theme`) | **CC BY-SA 4.0** | **APPROVED** — Attribution & ShareAlike notice present. |
| `public/audio/chase_redlands.mp3` | `758,827` | Archive.org (`backrooms-level-73-the-redlands-theme`), normalized loop via FFmpeg | **B / C** | Piem Ión (`archive.org/details/backrooms-level-73-the-redlands-theme`) | **CC BY-SA 4.0** | **APPROVED** — Attribution & ShareAlike notice present. |
| `public/audio/chase_evacuation.mp3` | `758,561` | Archive.org (`backrooms-level-7.6-evacuation-theme`), normalized loop via FFmpeg | **B / C** | Piem Ión (`archive.org/details/backrooms-level-7.6-evacuation-theme`) | **CC BY-SA 4.0** | **APPROVED** — Attribution & ShareAlike notice present. |
| `public/audio/daisy_bell_tape.mp3` | `778,283` | `Lavf63.1.101`; synthesized locally in `scratch/build_audio.py` using pure Python sine math + FFmpeg tape filter | **D + F** | Composition: Harry Dacre (1892); Synth: local `build_audio.py` (`2026-11-15`) | Composition: **Public Domain**; Synth: AI-assisted procedural | **APPROVED** — Public domain melody + procedural waveform; no third-party sound recording sampled. |
| `public/audio/poolrooms_reverie.mp3` | `843,484` | `Lavf63.1.101`; synthesized locally in `scratch/build_audio.py` (Amaj7–Gmaj7–Fmaj7–Emadd9 sine pad + FFmpeg echo) | **D** | Local `build_audio.py` (`2026-11-15`) | Procedural / AI-assisted synth (no external recording) | **APPROVED (with Category D note)** — Developer review recommended if strict human-authorship copyright claim is desired over audio. |
| `public/audio/burning_memory.mp3` | `4,886,508` | ID3: *"A1 - It's just a burning memory"*, Artist: `The Caretaker`, Album: *Everywhere at the end of time* (2016) | **E** | Leyland James Kirby (*The Caretaker*) | **All Rights Reserved / Unlicensed** | **RELEASE BLOCKER** — Commercial/copyrighted album track without redistribution permission. Must remove & replace (e.g., with `incompetech.com` CC BY 3.0 / `FreePD` CC0 ambient or original synth). |
| `public/audio/bewildered.mp3` | `1,979,155` | ID3: *"A5 - Slightly bewildered"*, Artist: `The Caretaker`, Album: *Everywhere at the end of time* (2016) | **E** | Leyland James Kirby (*The Caretaker*) | **All Rights Reserved / Unlicensed** | **RELEASE BLOCKER** — Same as above. Must remove & replace before release. |
| `public/audio/ballroom_memory.mp3` | `1,683,663` | Comment: `https://archive.org/details/01-turkish-delight` (`03-THE VERY THOUGHT OF YOU.mp3`, Al Bowlly / Ray Noble 1934), slowed/echoed in `build_audio.py` | **E** | Ray Noble & Al Bowlly (`1934` 78rpm) / Archive uploader | **Unverified Public Domain Status** (US sound recordings from 1934 have copyright protection under the US CLASSICS Act until `2029–2030`, plus underlying composition) | **RELEASE BLOCKER** — Do not assume Archive.org upload = Public Domain worldwide. Replace with pre-1923 public domain recording / CC0 / CC BY 3.0 music. |
| `public/audio/sweetest_delusion.mp3` | `1,656,717` | ID3: *"Love is the Sweetest Thing"*, `Ray Noble and His New Mayfair Orchestra` (`1932`), comment: `https://archive.org/details/AlBowllyCollection1928-1935...` | **E** | Ray Noble (`1932` recording) | **Unverified** (US 1932 recording term protected ~100 yrs under CLASSICS Act; UK recording copyright expired after 50/70 yrs, US does not) | **RELEASE BLOCKER** — Replace prior to global GitHub Pages release. |
| `public/audio/faded_angel.mp3` | `1,522,664` | ID3: *"Got A Date With An Angel 1931"*, `Al Bowlly + Howard Godfrey`, Piccadilly 855 (`Nov 1931`) | **E** | Howard Godfrey / Al Bowlly (`1931`) | **Unverified** (US sound recording copyright for 1931 runs through end of `2026` under 95-year CLASSICS Act rule + composition copyright by Jack Waller & Joseph Tunbridge) | **RELEASE BLOCKER** — Replace prior to release. |
| `public/audio/velvet_corridor.mp3` | `1,659,007` | Comment: `https://archive.org/details/01-turkish-delight` (`04-I'LL BE GOOD BECAUSE OF YOU.mp3`, ~1931), slowed/filtered in `build_audio.py` | **E** | Archival 1930s ensemble | **Unverified** | **RELEASE BLOCKER** — Replace prior to release. |
| `public/audio/async_threshold.mp3` | `1,046,297` | `Lavf63.1.101`; FFmpeg audio excerpt (`ss=75, t=65`) from user-uploaded `.mp4` (`media_1794693980848_bc6d733b.mp4`) in `build_audio.py` | **E** | Unknown / Third-party `.mp4` video | **Unlicensed Third-Party Extract** | **RELEASE BLOCKER** — Derived from unverified external `.mp4` video audio track. Must replace with procedural WebAudio / CC0 / CC BY synth. |
| `public/audio/null_protocol_chase.mp3` | `884,129` | `Lavf63.1.101`; FFmpeg audio excerpt (`ss=730, t=55`) from user-uploaded `.mp4` (`media_1794693980848_bc6d733b.mp4`) in `build_audio.py` | **E** | Unknown / Third-party `.mp4` video | **Unlicensed Third-Party Extract** | **RELEASE BLOCKER** — Same as above. Must replace. |

---

## 2. Sound Effects (`public/audio/sfx_*`)

| Asset Path | Size (Bytes) | Forensic Metadata / Origin | Category | Creator / Supplier | License | Status & Required Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `public/audio/sfx_clasp.ogg` | `605,949` | Vorbis: `TITLE=rusty metal door clasp`, `ARTIST=Stephan` | **B** | Stephan (SoundBible contributor) | **CC BY 3.0** | **NEEDS SOURCE URL VERIFICATION** — Retain `Stephan` credit & add exact SoundBible URL if preserved. |
| `public/audio/sfx_creak.ogg` | `145,741` | Vorbis: `TITLE=door handle creaking`, `ARTIST=Stephan` | **B** | Stephan (SoundBible contributor) | **CC BY 3.0** | **NEEDS SOURCE URL VERIFICATION** — Credit present. |
| `public/audio/sfx_elevator_door.ogg` | `235,530` | Vorbis: `TITLE=elevator door closing`, `ARTIST=Stephan` | **B** | Stephan (SoundBible contributor) | **CC BY 3.0** | **NEEDS SOURCE URL VERIFICATION** — Credit present. |
| `public/audio/sfx_knock.ogg` | `155,680` | Vorbis: `TITLE=Knocking on Wood or Door`, `ARTIST=Stephan` | **B** | Stephan (SoundBible contributor) | **CC BY 3.0** | **NEEDS SOURCE URL VERIFICATION** — Credit present. |
| `public/audio/sfx_metal_bang.ogg` | `334,059` | Vorbis: `TITLE=metal cabinet door jarring`, `ARTIST=Stephan` | **B** | Stephan (SoundBible contributor) | **CC BY 3.0** | **NEEDS SOURCE URL VERIFICATION** — Credit present. |
| `public/audio/sfx_squeak.ogg` | `96,166` | Vorbis: `TITLE=squeaky door`, `ARTIST=LeonMire` | **E (Unverified B)** | LeonMire (Freesound / Wikimedia Commons) | Likely CC0 or CC BY (`unverified` without clip ID) | **PENDING REVIEW** — Verify exact Freesound/Commons page URL and license (CC0 vs CC BY) or replace. |
| `public/audio/sfx_saturn_radio.wav` | `734,972` | Unlabeled PCM WAV (`WAVEfmt`); identified by project commit/usage as NASA Cassini Saturn radio emissions | **F** | NASA / JPL (Cassini RPWS) | **Public Domain** (US Gov Work, `17 U.S.C. § 105`) | **NEEDS DOWNLOAD RECEIPT ARCHIVE** — Save official `nasa.gov`/`jpl.nasa.gov` source URL in private receipt folder. |
| `public/audio/sfx_static.wav` | `49,518` | RIFF WAV whose PCM payload literally contains ASCII text from the **2007 film *Bee Movie*** script (`"According to all known laws of aviation..."`) used as noise | **E** | DreamWorks Animation (*Bee Movie* script text) / Unknown WAV packager | **All Rights Reserved (Embedded Text)** | **RELEASE BLOCKER** — Replace immediately with generated white/pink noise WAV or WebAudio buffer in `src/audio.js`. |
| `public/audio/sfx_growl1.ogg` | `771,883` | Ogg Vorbis (`ffmpeg2theora-0.29`, `SOURCE_OSHASH=882c0ecd89b90a88`), no artist/license tag | **E** | Unknown | **Unknown** | **RELEASE BLOCKER** — Missing provenance; replace with verified CC0 Freesound SFX or WebAudio synthesis. |
| `public/audio/sfx_growl2.ogg` | `460,289` | Ogg Vorbis (`ffmpeg2theora-0.29`, `SOURCE_OSHASH=bbc346f6280460c4`), no artist/license tag | **E** | Unknown | **Unknown** | **RELEASE BLOCKER** — Same as above. |
| `public/audio/sfx_whisper.ogg` | `30,283` | Ogg Vorbis (`Xiph.Org libVorbis I 20070622`), no artist/license tag | **E** | Unknown | **Unknown** | **RELEASE BLOCKER** — Same as above. |
| `public/audio/sfx_sprint_breath.ogg` | `33,135` | OpenGameArt (`opengameart.org/content/breathing-tired`), trimmed & normalized via FFmpeg | **F** | Phani29 / OpenGameArt | **CC0 1.0 Universal** | **APPROVED** — Sprint exertion panting layer (`src/audio.js`). |
| `public/audio/sfx_horror_breath.ogg` | `31,584` | OpenGameArt (`opengameart.org/content/horror-breathing`), trimmed & normalized via FFmpeg | **F** | OpenGameArt CC0 contributor | **CC0 1.0 Universal** | **APPROVED** — Exhausted stamina gasp & panic breathing (`src/audio.js`). |
| `public/audio/sfx_jumpscare.ogg` | `24,650` | Composite FFmpeg mix of OpenGameArt CC0 `high-pitch-scream-sounds2` + `insect-or-alien-scream-short` + sub-bass sine sweep | **F** | looneybits & OpenGameArt CC0 contributors | **CC0 1.0 Universal** | **APPROVED** — Jumpscare attack shriek (`src/audio.js`). |

---

## 3. Textures & Surface Decals (`public/textures/`)

| Asset Group | Files | Forensic XMP Metadata | Category | Creator / Supplier | License | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Carpet PBR (`carpet_*.jpg`) | `carpet_color.jpg`, `carpet_normal.jpg`, `carpet_rough.jpg` | `xmp:CreatorTool: Substance Designer` (characteristic ambientCG 8K master downscaled to 1K JPG) | **F** | Lennart Demes (`ambientCG.com`) | **CC0 1.0 Universal** | **APPROVED** — Zero restrictions; credited in `ATTRIBUTION.md`. |
| Ceiling PBR (`ceiling_*.jpg`) | `ceiling_color.jpg`, `ceiling_normal.jpg`, `ceiling_rough.jpg` | `xmp:CreatorTool: Substance Designer` | **F** | Lennart Demes (`ambientCG.com`) | **CC0 1.0 Universal** | **APPROVED**. |
| Wall PBR (`wall_*.jpg`) | `wall_color.jpg`, `wall_normal.jpg`, `wall_rough.jpg` | `xmp:CreatorTool: Substance Designer` | **F** | Lennart Demes (`ambientCG.com`) | **CC0 1.0 Universal** | **APPROVED**. |
| Asphalt Damage Decals (`decals/AsphaltDamageSet001/*`) | `AsphaltDamageSet001_1K-JPG_Color.jpg`, `AsphaltDamageSet001_1K-JPG_NormalGL.jpg`, `AsphaltDamageSet001_1K-JPG_Opacity.jpg`, `AsphaltDamageSet001_1K-JPG_Roughness.jpg` | Downloaded via `scratch/dl_assets.js` directly from `https://ambientcg.com/get?file=AsphaltDamageSet001_1K-JPG.zip` | **F** | Lennart Demes (`ambientCG.com`) | **CC0 1.0 Universal** | **APPROVED** (`src/textures.js`). |
| Wall Leak Decals (`decals/Leaking012A/*`, `Leaking013A/*`, `Leaking019C/*`) | `Leaking012A_1K-JPG_Color.jpg`, `Leaking012A_1K-JPG_NormalGL.jpg`, `Leaking012A_1K-JPG_Roughness.jpg`, `Leaking013A_1K-JPG_Color.jpg`, `Leaking013A_1K-JPG_NormalGL.jpg`, `Leaking013A_1K-JPG_Roughness.jpg`, `Leaking019C_1K-JPG_Color.jpg`, `Leaking019C_1K-JPG_NormalGL.jpg`, `Leaking019C_1K-JPG_Roughness.jpg` | Downloaded via `scratch/dl_assets.js` directly from `ambientcg.com`; `Substance Designer` XMP | **F** | Lennart Demes (`ambientCG.com`) | **CC0 1.0 Universal** | **APPROVED** (`buildLeakAlphaTexture` converts white matte to alpha grime in `src/textures.js`). |
| Procedural Level & Decal Textures | Runtime `CanvasTexture` generators in `src/textures.js` & `src/levels/level_textures.js` | Generated dynamically in browser JS | **A / D** | Vendreith (`2026`) | Original JS code (`© 2026 Vendreith`) | **APPROVED** (Note: `"ASYNC RESEARCH"` poster text on flyer #0 references Kane Pixels — see `BACKROOMS_ATTRIBUTION.md`). |

---

## 4. 3D Models & Procedural Geometry (`public/models/` & `src/`)

| Asset | Origin / Metadata | Category | License & Restrictions | Status & Remediation Plan |
| :--- | :--- | :--- | :--- | :--- |
| `public/models/Soldier.glb` (`2,160,468` bytes) | Contains `mixamorig:*` skeleton buffers (`Character_TPose_0`, `Character_Run_0`, `Character_Idle_0`). Sourced from `three.js/examples/models/gltf/Soldier.glb` (`mrdoob/three.js`). | **E (Conditional)** | Originally **Adobe Mixamo Vanguard** rigged mesh. Adobe Mixamo FAQ allows royalty-free use of downloaded characters/animations in commercial & non-commercial games, **but prohibits redistributing the raw character asset itself as a downloadable model or inside open-source model libraries**. Hosting `Soldier.glb` as a static asset in a public GitHub repo makes the raw `.glb` directly downloadable. | **FLAGGED FOR REPLACEMENT / REVIEW** — `src/models.js` already includes a complete procedural Hazmat Explorer fallback (`buildHazmatSuit`) and procedural Entities; consider switching default survivors to the procedural rigged Hazmat explorer or a verified CC0 low-poly character mesh. |
| Procedural Level Geometry (`src/levels/*.js`, `src/models.js`) | Box, arch, cylinder, lathe, torus, slide chute, foliage & prop BufferGeometry generated mathematically in JS | **A** (technical geometry) / **C** (level concepts) | Code by Vendreith; derivative Backrooms architectural lore under CC BY-SA 3.0 where applicable. | **APPROVED**. |

---

## 5. Fonts & Miscellaneous Files

| Asset | Details | Category | License | Status |
| :--- | :--- | :--- | :--- | :--- |
| UI Typography (`index.html`, Canvas2D) | CSS `font-family: 'Consolas', 'Courier New', monospace`, standard `sans-serif` / `serif` system fallback | **F / System** | System-installed OS fonts; zero webfont `.woff2`/`.ttf` files bundled or fetched. | **APPROVED** — Zero font licensing burden. |
| `public/.nojekyll` (`0` bytes) | GitHub Pages build directive preventing Jekyll from skipping `_` directories | **F** | Standard configuration marker. | **APPROVED**. |

## Original first-person assets (V12 release)

`public/models/fps/deagle-original.glb`, `public/models/fps/butterfly-original.glb`, and `public/models/fps/meridian-6-original.glb` are original procedural rigs created for this project. `public/models/fps/PROVENANCE.md` records construction, licensing, and reference boundaries. No proprietary game assets, textures, sounds, rigs, or animation clips were imported. See [FPS provenance](../public/models/fps/PROVENANCE.md). Runtime environment geometry in `src/levels/environment_*.js` is also authored procedural geometry.
