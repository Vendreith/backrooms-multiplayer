# V12 release notes

This release publishes the reviewed Level 0 V12 runtime alongside Level 37 Sublimity, the original first-person weapon module and the existing multiplayer game.

## Changes

- Compact classic labyrinth, thinner ordinary partitions, higher ceilings and square fluorescent fixtures, while preserving the extended world and elevator routes.
- 4,000 additional environmental instances, 108 original procedural archetypes and 48 architectural landmarks, spatially batched with distance-based detail.
- Walking speed 1.99 m/s, sprint 7.4 m/s, baseline stamina 18.4 seconds. Explorer bunny hop retains a fixed 0.45 m/s bonus.
- Sight/hearing pursuit, restrained entity speed and attack range, collision-aware attacks, and patrol recovery.
- Handheld camera controls: movement 0–300%, tremor 0–300%, vertical bob 0–250%, with independent persistence and reduced-motion support.
- Original weapon handling and authored procedural models; 2 equips the gun, 3 the knife, T performs the configured inspect/flex action.

## Validation

Ten automated runtime programs passed in the development review, together with the production build. The clean publishing layout runs the same checks with adapted source paths; CI runs them before deployment. Local browser review included three deterministic seeds, actual walking routes, stamina timing, local host/client transport, camera extremes and Level 37 regression coverage. Controlled full-stamina pursuit trials escaped in 15/15 runs. High settings on the reviewed RTX 3060 desktop measured approximately 60 FPS across the sampled views. These are measured fixtures and sampled scenes, not a universal performance or gameplay guarantee.

Not tested: first-time human navigation/comfort, weak/mobile GPUs, multiple-machine WAN/TURN conditions, every sublevel pursuit scenario, and individual visual inspection of every environmental instance. Existing third-party asset provenance caveats remain recorded in the legal documentation.

## Packaging

The clean repository flattens the game entry into the root, places static assets in public/, and preserves the existing Vite, Pages, legal-notice and dependency setup. Source logic is preserved from reviewed runtime SHA-256 db35b1c5cc6f96e96bd9f8310f890d0233ccc4b0f4599cc452b10097cf1c58c7; added licensing comments do not affect behavior. Test report output is ignored by Git. Private research images, local configuration, development recordings, dependencies and build output are not included in the source commit.
