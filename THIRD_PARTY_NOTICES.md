# Third-Party Software & Dependency Notices

This document preserves mandatory copyright notices and license texts for all third-party libraries bundled into the browser build, separately lists development-only build dependencies, and indexes external audiovisual and texture asset packages.

Machine-readable inventory: [legal/THIRD_PARTY_INVENTORY.json](./legal/THIRD_PARTY_INVENTORY.json)  
Creative & Backrooms asset credits: [ATTRIBUTION.md](./ATTRIBUTION.md)

---

## Part 1 — Runtime Dependencies (Bundled in Production Browser Build)

| Package | Version | License (SPDX) | Upstream Copyright Holder | Role |
| :--- | :--- | :--- | :--- | :--- |
| `three` | `0.170.0` | `MIT` | Copyright © 2010-2024 three.js authors | WebGL 3D engine & GLTFLoader |
| `postprocessing` | `6.39.6` | `Zlib` | Copyright © 2015 Raoul van Rüschen | Post-processing EffectComposer & Bloom |
| `peerjs` | `1.5.5` | `MIT` | Copyright (c) 2015 Michelle Bu and Eric Zhang | WebRTC P2P multiplayer rooms |
| `eventemitter3` | `4.0.7` | `MIT` | Copyright (c) 2014 Arnout Kazemier | Transitive dependency of `peerjs` |
| `peerjs-js-binarypack` | `2.1.0` | `MIT` | Copyright (c) 2012 Eric Zhang | Transitive binary serializer of `peerjs` |
| `sdp` | `3.2.3` | `MIT` | Copyright (c) 2017 Philipp Hancke | Transitive WebRTC SDP helper of `peerjs` |
| `webrtc-adapter` | `9.0.6` | `BSD-3-Clause` | Copyright (c) 2014 The WebRTC project authors; Copyright (c) 2018 The adapter.js project authors | Transitive WebRTC shim of `peerjs` |

### Verbatim Notices & License Texts (Runtime Dependencies)

#### 1. `three` (MIT License)
```text
The MIT License

Copyright © 2010-2024 three.js authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

#### 2. `postprocessing` (Zlib License)
```text
Copyright © 2015 Raoul van Rüschen

This software is provided 'as-is', without any express or implied warranty. In
no event will the authors be held liable for any damages arising from the use of
this software.

Permission is granted to anyone to use this software for any purpose, including
commercial applications, and to alter it and redistribute it freely, subject to
the following restrictions:

1. The origin of this software must not be misrepresented; you must not claim
   that you wrote the original software. If you use this software in a product,
   an acknowledgment in the product documentation would be appreciated but is
   not required.

2. Altered source versions must be plainly marked as such, and must not be
   misrepresented as being the original software.

3. This notice may not be removed or altered from any source distribution.
```

#### 3. `peerjs` (MIT License)
```text
Copyright (c) 2015 Michelle Bu and Eric Zhang, http://peerjs.com

(The MIT License)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

#### 4. `eventemitter3` (MIT License)
```text
The MIT License (MIT)

Copyright (c) 2014 Arnout Kazemier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

#### 5. `peerjs-js-binarypack` (MIT License)
```text
Copyright (c) 2012 Eric Zhang, http://binaryjs.com

(The MIT License)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

#### 6. `sdp` (MIT License)
```text
Copyright (c) 2017 Philipp Hancke

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

#### 7. `webrtc-adapter` (BSD-3-Clause License)
```text
Copyright (c) 2014, The WebRTC project authors. All rights reserved.
Copyright (c) 2018, The adapter.js project authors. All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

  * Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.

  * Redistributions in binary form must reproduce the above copyright
    notice, this list of conditions and the following disclaimer in
    the documentation and/or other materials provided with the
    distribution.

  * Neither the name of Google nor the names of its contributors may
    be used to endorse or promote products derived from this software
    without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

---

## Part 2 — Fonts, Shaders & External Asset Packages

- **Fonts:** `index.html` uses browser system monospace (`--mono: 'Consolas', 'Courier New', monospace`) and canvas system sans-serif/serif (`sans-serif`, `serif`, `monospace`). **Zero downloadable third-party font files** are bundled.
- **Textures & Decals:** `public/textures/*` and `public/textures/decals/*` originate from **ambientCG** (Lennart Demes) under **CC0 1.0 Universal**.
- **Music & SFX:** Kevin MacLeod (`incompetech.com`) tracks are licensed under **CC BY 3.0**. Sound effects by Stephan (`SoundBible`, CC BY 3.0), LeonMire, and NASA/JPL (Public Domain) are detailed in [ATTRIBUTION.md](./ATTRIBUTION.md). Several unverified/legacy music & SFX files are flagged as **Category E release blockers** in [legal/ASSET_PROVENANCE.md](./legal/ASSET_PROVENANCE.md).
- **3D Model (`public/models/Soldier.glb`):** Rigged character model redistributed from `three.js` examples (`mrdoob/three.js`, character sourced from Adobe Mixamo Vanguard). See [legal/ASSET_PROVENANCE.md](./legal/ASSET_PROVENANCE.md) for standalone redistribution restrictions (Category E note).
- **Public PeerJS Signaling Server:** Runtime client uses PeerJS default cloud signaling (`0.peerjs.com`) and public STUN servers (`stun.l.google.com`, `stun.cloudflare.com`, `stun.relay.metered.ca`).

---

## Part 3 — Build & Development Dependencies (Excluded from Runtime Player Bundle)

These tools execute only during Vite local development / CI bundling and are not shipped inside the playable browser build:

| Package | Version | License | Author |
| :--- | :--- | :--- | :--- |
| `vite` | `5.4.21` | `MIT` | Evan You |
| `rollup` | `4.68.3` | `MIT` | Rich Harris |
| `esbuild` | `0.21.5` | `MIT` | Evan Wallace |
| `postcss` | `8.5.33` | `MIT` | Andrey Sitnik |
| `nanoid` | `3.3.20` | `MIT` | Andrey Sitnik |
| `picocolors` | `1.1.1` | `ISC` | Alexey Raspopov |
| `source-map-js` | `1.2.2` | `BSD-3-Clause` | Valentin 7rulnik Semirulnik |
