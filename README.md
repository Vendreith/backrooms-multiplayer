# Backrooms Multiplayer

A free browser game by [Vendreith](https://github.com/Vendreith) with found-footage visuals, solo AI survival, online co-op and PvP.

[Play on GitHub Pages](https://vendreith.github.io/backrooms-multiplayer/) · [Report an issue](https://github.com/Vendreith/backrooms-multiplayer/issues)

## Level 94 — Dreamcore Hills

Explore a miniature suburb with rolling hills, curved roads, white fences and a water tower. Find the isolated doors leading to Underhill. To preview the level, start a solo match, press **F2** and choose **Dreamcore Hills**. The earlier Motion town is available as Level 94.1.

The game interface is in English. A fresh desktop profile starts at **Ultra**, **60 FPS**, **4:3** and **Found/VHS at 35%**. Graphics preferences are saved in your browser. The movement presets, handheld camera controls and reduced-motion option are available in the graphics menu.

## Online rooms

1. Select **Create Online Room** and share the six-character code or the invite link.
2. On another device, enter the code and select **Join Room**.
3. Wait for the guest to appear in the roster, then select **Start Match**. Enable the AI Entity for co-op or assign a player to the Entity role.

Run the same build on each device. PeerJS provides signaling. Connections across restrictive networks may need a TURN relay. For your own deployment, copy `.env.example` to `.env.local` and configure the TURN URLs and client credentials before rebuilding. Vite embeds these values in the browser bundle. Use client-scoped credentials and keep provider API keys and TURN shared secrets on the server.

## Run locally

```sh
npm ci
npm run dev
```

Run `npm run check:runtime`, `npm run build` and `npm run check:legal` to verify a change. `npm run preview` serves the production build locally. The GitHub Actions workflow runs the checks and publishes successful builds from `main` to GitHub Pages.

The source is in `src/`, Level 94 gameplay modules are in `level94_gameplay/`, static assets are in `public/`, and verification scripts are in `scripts/`. See the [V12 release notes](./docs/V12_RELEASE.md) for the earlier Level 0 and Poolrooms update.

## Licensing and attribution

| Component | Terms and credits |
| --- | --- |
| Original engine, shaders, interface and gameplay code | Copyright © 2026 Vendreith. See the [license](./LICENSE.md), [copyright statement](./COPYRIGHT.md) and [distribution notice](./NOTICE.md). |
| Adapted Backrooms levels, entities and lore | CC BY-SA 3.0 where applicable. See the [attribution register](./ATTRIBUTION.md) and [level-by-level credits](./legal/BACKROOMS_ATTRIBUTION.md). |
| Third-party libraries and media | See the [third-party notices](./THIRD_PARTY_NOTICES.md), [full licenses](./LICENSES/) and [asset provenance register](./legal/ASSET_PROVENANCE.md). |

See the [ownership policy](./legal/OWNERSHIP_AND_RIGHTS.md), [licensing matrix](./legal/LICENSING_MATRIX.md), [content usage policy](./legal/CONTENT_USAGE_POLICY.md), [privacy policy](./legal/PRIVACY_POLICY.md), [terms of play](./legal/TERMS_OF_PLAY.md), [copyright evidence](./legal/COPYRIGHT_EVIDENCE.md) and [takedown contact](./legal/TAKEDOWN_CONTACT.md).

Please read the [contribution guide](./CONTRIBUTING.md) before submitting code or assets. See the [security policy](./SECURITY.md) for security reports.
