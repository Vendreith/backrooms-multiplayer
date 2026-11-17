# Backrooms // Level 0 — Found Footage Multiplayer & AI Survival

- **Nhà phát triển (Developer):** **Vendreith** (`https://github.com/Vendreith`)
- **Link chơi chính thức (GitHub Pages):** `https://vendreith.github.io/backrooms-multiplayer/`
- **Mã nguồn & Báo lỗi:** `https://github.com/Vendreith/backrooms-multiplayer`
- **Hình thức phát hành:** **Chơi miễn phí (Free-to-Play)** — phiên bản web 3D WebGL (Three.js + Postprocessing + PeerJS WebRTC P2P), tối ưu cho GitHub Pages & các static host.

> [!NOTE]
> **Free to Play ≠ Free to Redistribute or Claim as Your Own:** Trò chơi mở miễn phí để mọi người trải nghiệm trực tuyến trên trình duyệt, nhưng điều đó **không** đồng nghĩa toàn bộ mã nguồn hay tài sản gốc do **Vendreith** tạo ra là Public Domain. Dự án áp dụng **cấu trúc bản quyền phân tách (Split Licensing)** để vừa bảo vệ phần mã nguồn/shader gốc của Vendreith, vừa tuân thủ đầy đủ giấy phép **CC BY-SA 3.0** đối với các nội dung chuyển thể từ Backrooms Wiki và các giấy phép mã nguồn mở / Creative Commons của bên thứ ba. Xem [LICENSE.md](./LICENSE.md).

---

## Bản cập nhật V12

Level 0 có mê cung classic 150 × 150 m, 4.000 vật thể môi trường mới thuộc 108 mẫu hình học gốc và 48 điểm nhấn kiến trúc. Đi bộ 1,99 m/s; chạy 7,4 m/s; thể lực cơ bản 18,4 giây. Camera cầm tay có ba thanh chỉnh độc lập và chế độ giảm chuyển động. Level 37 Sublimity, hệ thống vũ khí nguyên bản và các tầng cũ được giữ trong bản phát hành.

- Phím **2**: súng; **3**: dao; **T**: flex/kiểm tra vũ khí; **R**: nạp đạn.
- Bunny hop của chế độ Explorer cộng cố định **0,45 m/s**; chế độ Tactical dùng cấu hình chuyển động riêng.
- Chạy **npm run check:runtime** để kiểm tra 10 nhóm hồi quy, rồi **npm run build** và **npm run check:legal**.
- Chi tiết phạm vi đã kiểm chứng: [V12 release notes](./docs/V12_RELEASE.md).

## Cấu trúc thư mục

- `index.html`: Giao diện Preloader, Phòng chờ Multiplayer (Co-op / PvP), Pause, Teleport/No-Clip, Camcorder HUD & Bảng **CREDITS & LEGAL**.
- `src/`: Mã nguồn game (`engine.js`, `main.js`, `postfx.js`, `network.js`, `ai.js`, `audio.js`, `textures.js`, `models.js`, `map.js`, `constants.js`) và hệ thống tạo thế giới 20 tầng con (`src/levels/*.js`, gồm Level 37 Sublimity và thế giới Level 0 mở rộng 96 khu vực).
- `public/`: Tài nguyên tĩnh (`audio/`, `models/`, `textures/`, `.nojekyll`).
- `legal/` & `LICENSES/`: Hệ thống tài liệu pháp lý, ma trận giấy phép, hồ sơ nguồn gốc tài nguyên (`ASSET_PROVENANCE.md`), ghi nhận tác giả Backrooms (`BACKROOMS_ATTRIBUTION.md`), chính sách quyền riêng tư, điều khoản chơi & toàn văn giấy phép chuẩn.
- `.github/workflows/deploy.yml`: Workflow GitHub Actions kiểm tra tuân thủ (`npm run check:legal`), build Vite và deploy lên GitHub Pages.

---

## Chạy thử tại máy (Local)

```bash
npm install
npm run dev
```

Build bản production static (`dist/`, tự động giữ banner bản quyền và copy toàn bộ tài liệu pháp lý vào bản phát hành):

```bash
npm run build
npm run check:legal
npm run preview
```

---

## Chơi Multiplayer Online

1. Người làm chủ phòng bấm **Tạo Phòng Online** để nhận mã 6 ký tự hoặc bấm **Copy Link Mời** (`?room=XXXXXX`).
2. Bạn bè mở link mời (hoặc nhập mã vào ô **Mã phòng**) và bấm **Vào Phòng**.
3. Host có thể bật **Tự động dùng AI Entity** để chơi Co-op cùng bạn, hoặc chuyển 1 người trong phòng thành **Quái vật (Entity)**.
4. Bấm **BẮT ĐẦU TRẬN ĐẤU**.

---

## Deploy lên GitHub Pages (`github.io`)

1. Push toàn bộ repository này lên nhánh `main` của GitHub.
2. Vào **Settings -> Pages -> Build and deployment -> Source** chọn **GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` sẽ chạy `npm run check:legal`, build và phát hành tại `https://vendreith.github.io/backrooms-multiplayer/`.

---

## Tóm tắt Bản quyền & Giấy phép (Licensing & Attribution Summary)

| Thành phần | Quyền sở hữu / Nguồn | Giấy phép áp dụng | Tài liệu chi tiết |
| :--- | :--- | :--- | :--- |
| **Mã nguồn Engine, Shader (kể cả Preset 5 Dreamcam), WebRTC Netcode, UI & Hệ thống gốc** | **Copyright © 2026 Vendreith** | **All Rights Reserved** (trừ các phần chuyển thể trực tiếp CC BY-SA 3.0 hoặc thư viện bên thứ ba) | [LICENSE.md](./LICENSE.md) · [COPYRIGHT.md](./COPYRIGHT.md) |
| **Nội dung chuyển thể 21 Tầng Backrooms & Thực thể Wiki** | Cộng đồng & tác giả tại `backrooms-wiki.wikidot.com` & `backrooms.fandom.com` + phần chuyển thể của Vendreith | **CC BY-SA 3.0** (`https://creativecommons.org/licenses/by-sa/3.0/`) | [ATTRIBUTION.md](./ATTRIBUTION.md) · [legal/BACKROOMS_ATTRIBUTION.md](./legal/BACKROOMS_ATTRIBUTION.md) |
| **Thư viện JavaScript & Tài nguyên CC BY 3.0 / CC0 1.0 / Public Domain** | Three.js authors, Raoul van Rüschen (`postprocessing`), PeerJS, Kevin MacLeod, ambientCG, Stephan, NASA/JPL, Harry Dacre | `MIT`, `Zlib`, `BSD-3-Clause`, `CC BY 3.0`, `CC0 1.0`, Public Domain | [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) · [LICENSES/](./LICENSES/) |
| **Tài nguyên đang rà soát / chờ thay thế (Category E)** | Xem danh sách từng file audio & `Soldier.glb` | **Chưa xác minh quyền phân phối lại** (đã gắn cảnh báo phát hành) | [legal/ASSET_PROVENANCE.md](./legal/ASSET_PROVENANCE.md) |

### Danh mục Tài liệu Pháp lý Đầy đủ

- [LICENSE.md](./LICENSE.md) — Chính sách cấp phép phân tách chính thức
- [COPYRIGHT.md](./COPYRIGHT.md) — Tuyên bố quyền tác giả & phạm vi miễn trừ
- [NOTICE.md](./NOTICE.md) — Thông báo bản quyền phân phối kèm bản build
- [ATTRIBUTION.md](./ATTRIBUTION.md) — Sổ ghi công đầy đủ (Wikidot, Kevin MacLeod, ambientCG, SFX)
- [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) — Toàn văn giấy phép thư viện phần mềm
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Chính sách đóng góp & nguồn gốc PR
- [SECURITY.md](./SECURITY.md) — Chính sách bảo mật & tách biệt bí mật TURN/WebRTC
- [legal/OWNERSHIP_AND_RIGHTS.md](./legal/OWNERSHIP_AND_RIGHTS.md) — Phân biệt bản quyền, thương hiệu & nhận diện
- [legal/LICENSING_MATRIX.md](./legal/LICENSING_MATRIX.md) — Ma trận phân loại A–F từng module & file
- [legal/ASSET_PROVENANCE.md](./legal/ASSET_PROVENANCE.md) — Hồ sơ nguồn gốc từng file media & danh sách blocker
- [legal/BACKROOMS_ATTRIBUTION.md](./legal/BACKROOMS_ATTRIBUTION.md) — Đối chiếu chi tiết 21 Tầng & Thực thể Backrooms
- [legal/CONTENT_USAGE_POLICY.md](./legal/CONTENT_USAGE_POLICY.md) — Quy định quay video, livestream & sáng tạo cộng đồng
- [legal/PRIVACY_POLICY.md](./legal/PRIVACY_POLICY.md) — Minh bạch dữ liệu PeerJS/WebRTC & `localStorage`
- [legal/TERMS_OF_PLAY.md](./legal/TERMS_OF_PLAY.md) — Điều khoản trải nghiệm & cảnh báo quang học
- [legal/TAKEDOWN_CONTACT.md](./legal/TAKEDOWN_CONTACT.md) — Kênh liên hệ gỡ bỏ/sửa ghi công & quy trình xử lý vi phạm
- [legal/COPYRIGHT_EVIDENCE.md](./legal/COPYRIGHT_EVIDENCE.md) — Lịch sử phát triển Git & quy trình lưu chứng cứ tác giả

---

## Báo lỗi & Đóng góp (Bug Reporting & Contributions)

- Gặp lỗi game, lỗi WebRTC hoặc phát hiện thiếu sót ghi công tác giả: mở Issue tại `https://github.com/Vendreith/backrooms-multiplayer/issues`.
- Trước khi gửi Pull Request mã nguồn hoặc tài nguyên mới, vui lòng đọc kỹ [CONTRIBUTING.md](./CONTRIBUTING.md).
