# Takedown Contact, Attribution Requests & Infringement Response Guide

**Project:** Backrooms // Level 0  
**Repository:** `https://github.com/Vendreith/backrooms-multiplayer`  
**Developer Identity:** Vendreith

---

## Part 1 — Public Contact for Rights Holders (Takedown & Attribution Inquiries)

Vendreith respects intellectual property rights and Creative Commons attribution obligations. If you are a copyright owner, authorized agent, or Backrooms wiki contributor and believe that any file, audio track, texture, 3D model, or text in this repository:
1. Infringes your copyright or lacks required license authorization, or
2. Displays incomplete or inaccurate attribution (`CC BY-SA 3.0` / `CC BY 3.0`),

please open a clearly titled issue at:  
`https://github.com/Vendreith/backrooms-multiplayer/issues`  
with the prefix `[COPYRIGHT / ATTRIBUTION REQUEST]` containing:
- Exact file path, track title, level ID, or commit SHA;
- Your creator identity / Wikidot / Fandom username or rightsholder authorization;
- Specific corrective action requested (e.g., attribution update or file removal).

Verified requests are prioritized promptly. *(Note for Developer: Add a monitored email address here if a non-public takedown inbox is established.)*

---

## Part 2 — Developer Guide: Practical Copyright Infringement Response (If Copied Without Authorization)

This section provides a balanced, lawful workflow for **Vendreith** if a third party copies and republishes **Category A** proprietary code, shaders (`Preset 5`), or original work without authorization:

### Step 1: Verify Which Rights Apply Before Acting
**Critical Check:** Never file a takedown notice if the third party's reuse is actually **authorized**!
- If they only reused **Backrooms wiki lore/level concepts** from `catalog.js` with proper **CC BY-SA 3.0** attribution and ShareAlike license, that reuse is legally permitted under CC BY-SA 3.0.
- If they only extracted `three` / `peerjs` / `postprocessing` or `ambientCG` CC0 textures, those are permitted under MIT/Zlib/BSD/CC0.
- Infringement applies when a third party copies **Vendreith's original proprietary code or original creative work** (`src/postfx.js`, custom shaders, game loop, HUD design, complete bundled game) **outside** any permissive license (e.g., rebranding the built game on itch.io, CrazyGames, Poki, Chrome Web Store, or Steam and claiming authorship or monetizing unauthorized builds).

### Step 2: Preserve & Document Evidence Calmly
1. Capture full-page screenshots, archived URLs (e.g., Wayback Machine), and downloaded copies/hashes (`SHA-256`) of the infringing page/build and network requests.
2. Collect matching original evidence from [COPYRIGHT_EVIDENCE.md](./COPYRIGHT_EVIDENCE.md): original Git commits (`git log`), source timestamps, private development archives, and unique code identifiers/shaders (`sampleBicubicSoft`, `BackroomsCRTGradeEffect`).
3. Create a side-by-side comparison table noting exact matching files, CSS/HTML structure, shader math, or asset hashes.

### Step 3: Attempt Direct Good-Faith Contact First
Send a polite, factual notice to the publisher identifying:
- Your public project URL (`https://github.com/Vendreith/backrooms-multiplayer`) and earlier creation dates;
- The specific proprietary files copied;
- Clear distinction noting you do not claim community Backrooms lore under CC BY-SA, only your original game implementation;
- Request for removal or compliance within a reasonable window.

### Step 4: Platform Notice / Takedown Submission (If Needed)
Only when you have confirmed a violation of rights **you actually own/control** (never file false or overbroad notices):
- Submit accurate copyright infringement notices via the hosting platform's official process (e.g., GitHub DMCA Takedown Policy, itch.io DMCA form, Google Search/AdSense copyright removal).
- Do not fabricate statutory penalties, claim fake court orders, or assert rights over CC BY-SA or public-domain portions.

### Step 5: Escalate Serious Commercial Disputes
If a commercial publisher refuses removal or submits a counter-notice, consult a qualified intellectual property attorney in the applicable jurisdiction before pursuing formal litigation or statutory notices.
