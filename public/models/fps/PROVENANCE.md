# Original first-person assets

Created independently for this project. Copyright (c) 2026 Vendreith, governed by the original independent asset/code component of the project's [license](https://github.com/Vendreith/backrooms-multiplayer/blob/main/LICENSE.md).

The Desert Eagle-inspired pistol, Meridian-6 frontier revolver, butterfly knife, articulated gloves/sleeves, procedural motions, muzzle flash, casings and synthesized sounds are original assets implemented in `src/fps/`. They contain no imported proprietary game model, texture, skin, animation or sound recording. No manufacturer artwork or game branding is reproduced.

The runtime models are generated from native Three.js geometry. The pistol has a separate slide and magazine, an open trigger guard, barrel/muzzle, grip relief, controls, rear notch and front sight. Meridian-6 uses an original surveyor/frontier design: a stepped bridge and counterweight, graphite frame, satin cylinder with six through-bores, ceramic/wood grip inlays and mathematical contour engravings. Its cylinder crane, extractor, cartridges, hammer and loader are separate mechanisms. The knife has a faceted spear blade, ceramic counterweights and two separately articulated, slotted handles whose pivots sit at the tang pins. Each hand has 14 finger joints, padded gloves, seams and a two-segment sleeve solved from the wrist contact.

`deagle-original.glb`, `butterfly-original.glb` and `meridian-6-original.glb` are portable exports of those same first-person rigs, with indexed geometry and named moving nodes. They round-trip through Three.js GLTFLoader. Runtime generation avoids extra model requests and keeps direct references to procedural animation pivots. The GLBs contain the rig/rest pose; animation is implemented by the authored controller rather than baked GLTF clips. Regeneration/verification: `output/playwright/tactical/prepare-export.cjs`, then `output/playwright/tactical/export-models.cjs` with the local Vite server running.

Three.js and its bundled geometry, environment and merge utilities retain their upstream MIT license. A room environment is generated once for material reflections; no external HDR photograph is used.

## Reference review

- [threejs-multiplayer-fps](https://github.com/chrisbuczek/threejs-multiplayer-fps): inspected weapon controller/view and architecture. No license file found in the inspected root/tree; no code or assets copied.
- [arena-breach](https://github.com/HadiMustaffa/arena-breach): inspected procedural viewmodel, sight-axis convention and handling layers. No license found in the inspected root; no code or assets copied.
- [COD](https://github.com/delightc123/COD): verified [MIT license](https://github.com/delightc123/COD/blob/main/LICENSE), inspected viewmodel/hand architecture. Used as a technical reference; no source or assets copied.

Reviewed source is reference material, not a replacement game. Existing map/lore and third-party asset licenses remain governed by their own notices.

## Tactical reference principles

Read only public developer explanations: [How the VALORANT Arsenal was built](https://playvalorant.com/en-us/news/dev/how-the-valorant-arsenal-was-built/) and [The Craft and Fantasy of VALORANT Weapon Skins](https://playvalorant.com/en-gb/news/dev/the-craft-and-fantasy-of-valorant-weapon-skins/). References informed readable action beats, restrained feedback and sound synchronization. No proprietary asset files, installations, models, shaders, patterns, rigs, audio or captured animation were accessed or reused. Meridian-6 geometry, contour decoration, flourish paths, timing and synthesized modal/noise audio were authored independently. This is an original game feature with no official association with Riot Games.
