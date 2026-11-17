import { defineConfig } from 'vite';
import { resolve } from 'path';
import { cpSync, existsSync } from 'fs';

const LEGAL_FILES = [
  'LICENSE.md',
  'COPYRIGHT.md',
  'NOTICE.md',
  'THIRD_PARTY_NOTICES.md',
  'ATTRIBUTION.md',
  'CONTRIBUTING.md',
  'SECURITY.md'
];

const LEGAL_DIRS = ['legal', 'LICENSES'];

const BUNDLE_BANNER = `/*!
 * Backrooms // Level 0 — Found Footage Multiplayer & AI Survival
 * Original Engine, Shaders & UI: Copyright (c) 2026 Vendreith. All rights reserved.
 * Adapted Backrooms Lore & Level Concepts: CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/)
 * Full attribution & third-party licenses (Three.js MIT, postprocessing Zlib, PeerJS MIT):
 * see ./LICENSE.md, ./ATTRIBUTION.md, and ./THIRD_PARTY_NOTICES.md
 */`;

function copyLegalDocsPlugin() {
  return {
    name: 'copy-legal-docs-to-dist',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      if (!existsSync(distDir)) return;
      for (const file of LEGAL_FILES) {
        const src = resolve(__dirname, file);
        const dst = resolve(distDir, file);
        if (existsSync(src)) cpSync(src, dst, { force: true });
      }
      for (const dir of LEGAL_DIRS) {
        const src = resolve(__dirname, dir);
        const dst = resolve(distDir, dir);
        if (existsSync(src)) cpSync(src, dst, { recursive: true, force: true });
      }
    }
  };
}

export default defineConfig({
  base: './',
  publicDir: 'public',
  plugins: [copyLegalDocsPlugin()],
  server: {
    port: 5173,
    host: true,
    open: true
  },
  preview: {
    port: 4173,
    host: true
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        banner: BUNDLE_BANNER
      }
    }
  }
});
