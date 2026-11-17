# Security, Privacy & Public Build Architecture Policy

## 1. Public Browser Client vs. Peer-to-Peer Architecture

**Backrooms // Level 0** runs purely as a client-side static web application (HTML5, JavaScript ES Modules, WebGL, WebAudio) hosted on **GitHub Pages**, using **PeerJS / WebRTC** for peer-to-peer multiplayer communication:

- **No Private Game Backend / Database:** There is no proprietary centralized game server, user account database, password store, payment gateway, or admin API endpoint in this repository.
- **Publicly Inspectable Client Assets:** All HTML, bundled JavaScript, textures, models, and audio delivered to the browser can be viewed or downloaded by end users via browser developer tools. Notice headers in JS bundles exist for **legal attribution and transparency**, not as DRM or technical copy protection.

---

## 2. Secret & Credential Hygiene (TURN / Relay Configuration)

- Previously, `src/engine.js` contained a hardcoded metered TURN relay username and credential string (`e07241262509f7010002b8d2`).
- **Remediated:** Those hardcoded credentials have been removed from source control (`src/engine.js`).
- The public client now uses **public STUN servers only** (`stun.l.google.com`, `stun.cloudflare.com`, `stun.relay.metered.ca`).
- If a deployer wishes to attach a TURN relay for strict NAT traversal in their own private build/CI pipeline, credentials must be injected strictly via build environment variables (`VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL`) using GitHub Actions encrypted Secrets (keeping in mind that WebRTC ICE configuration delivered to browsers is still visible to connected clients at runtime — prefer short-lived ephemeral TURN tokens via an external token endpoint in production deployments).

---

## 3. Repository Separation Consideration (Advisory)

Currently, source code (`src/`), raw third-party media (`public/`), and GitHub Pages deployment workflow (`.github/workflows/deploy.yml`) reside together in one public repository (`Vendreith/backrooms-multiplayer`).

- If the developer wishes in the future to distribute only compiled browser bundles publicly while developing **Category A** proprietary gameplay/engine code privately, keeping development in a private source repository and publishing compiled output (`dist/`) plus required `LICENSES/`, `THIRD_PARTY_NOTICES.md`, `ATTRIBUTION.md`, and CC BY-SA 3.0 compliance packages to a public Pages repo is a valid option — **provided** any component licensed under **CC BY-SA 3.0** remains publicly accessible in compliant form with required notices.
- Automated repository relocation or privatization is **not** performed automatically.

---

## 4. Reporting Security or Secret-Exposure Issues

If you discover a security vulnerability, cross-site scripting vector in lobby/chat/room inputs, or accidentally committed credentials:
- Do **not** exploit the issue against active players.
- Report it privately or via the repository issue tracker (`https://github.com/Vendreith/backrooms-multiplayer/issues`) with reproduction steps. If GitHub Private Vulnerability Reporting is enabled on the repository, prefer the **Security -> Advisories -> Report a vulnerability** workflow.
