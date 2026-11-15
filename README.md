# Backrooms Level 0 — Web Multiplayer

Phiên bản web tối giản & sạch sẽ (Three.js + Postprocessing + PeerJS WebRTC P2P), tối ưu để chạy trực tiếp trên **GitHub Pages (`*.github.io`)** hoặc bất kỳ static host nào.

## Cấu trúc thư mục

- `index.html`: Giao diện Preloader, Phòng chờ Multiplayer (Co-op / PvP), Pause & Camcorder HUD.
- `src/`: Mã nguồn game & `engine.js` đã loại bỏ các thư viện dư thừa.
- `public/`: Tài nguyên tĩnh (`audio/`, `models/`, `textures/`, `.nojekyll`).
- `.github/workflows/deploy.yml`: Workflow GitHub Actions tự động build và deploy lên GitHub Pages.

## Chạy thử tại máy (Local)

```bash
npm install
npm run dev
```

Build bản production static (`dist/`):

```bash
npm run build
npm run preview
```

## Chơi Multiplayer Online

1. Người làm chủ phòng bấm **Tạo Phòng Online** để nhận mã 6 ký tự hoặc bấm **Copy Link Mời** (`?room=XXXXXX`).
2. Bạn bè mở link mời (hoặc nhập mã vào ô **Mã phòng**) và bấm **Vào Phòng**.
3. Host có thể bật **Tự động dùng AI Entity** để chơi Co-op cùng bạn, hoặc chuyển 1 người trong phòng thành **Quái vật (Entity)**.
4. Bấm **BẮT ĐẦU TRẬN ĐẤU**.

## Deploy lên GitHub Pages (`github.io`)

1. Tạo repository mới trên GitHub và push toàn bộ thư mục này lên nhánh `main`.
2. Vào **Settings -> Pages -> Build and deployment -> Source** chọn **GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` sẽ tự build và phát hành tại `https://<username>.github.io/<repo>/`.
