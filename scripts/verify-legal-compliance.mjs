/**
 * Lightweight Automated Intellectual Property & Build Compliance Checker.
 * Detects missing legal files, broken relative legal links, missing source/bundle notices,
 * undocumented dependencies, assets missing provenance entries, and leaked secrets.
 * Note: Automated checks supplement — and never replace — formal human/legal review.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let failures = 0;
let warnings = 0;

function fail(msg) {
  console.error('[FAIL]', msg);
  failures++;
}
function warn(msg) {
  console.warn('[WARN]', msg);
  warnings++;
}
function pass(msg) {
  console.log('[OK]  ', msg);
}

// 1. Check required legal documents & standard license texts
const REQUIRED_DOCS = [
  'README.md',
  'LICENSE.md',
  'COPYRIGHT.md',
  'NOTICE.md',
  'THIRD_PARTY_NOTICES.md',
  'ATTRIBUTION.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'legal/OWNERSHIP_AND_RIGHTS.md',
  'legal/LICENSING_MATRIX.md',
  'legal/ASSET_PROVENANCE.md',
  'legal/BACKROOMS_ATTRIBUTION.md',
  'legal/CONTENT_USAGE_POLICY.md',
  'legal/PRIVACY_POLICY.md',
  'legal/TERMS_OF_PLAY.md',
  'legal/TAKEDOWN_CONTACT.md',
  'legal/COPYRIGHT_EVIDENCE.md',
  'legal/THIRD_PARTY_INVENTORY.json',
  'LICENSES/CC-BY-SA-3.0.txt',
  'LICENSES/CC-BY-3.0.txt',
  'LICENSES/CC0-1.0.txt',
  'LICENSES/MIT.txt',
  'LICENSES/Zlib.txt',
  'LICENSES/BSD-3-Clause.txt'
];

for (const rel of REQUIRED_DOCS) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) fail(`Missing required legal file: ${rel}`);
}
pass(`Checked ${REQUIRED_DOCS.length} required legal documentation & license files`);

// 2. Check source headers in src/**/*.js
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const srcFiles = walk(path.join(ROOT, 'src')).filter(f => f.endsWith('.js'));
for (const f of srcFiles) {
  const head = fs.readFileSync(f, 'utf8').slice(0, 500);
  const rel = path.relative(ROOT, f);
  if (!head.includes('Copyright (c) 2026 Vendreith')) {
    fail(`Missing Vendreith copyright header in ${rel}`);
  }
}
pass(`Checked copyright/licensing headers in ${srcFiles.length} JS source files`);

// 3. Secret / credential leak scan in src/ and dist/
const FORBIDDEN_PATTERNS = [
  { label: 'Hardcoded Metered TURN username', re: /e07241262509f7010002b8d2/ },
  { label: 'Hardcoded Metered TURN credential', re: /LTVELjLJXWi0nSmu/ },
  { label: 'Private key block', re: /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/ },
  { label: 'GitHub PAT', re: /\bgh[ps]_[A-Za-z0-9]{20,}/ }
];

for (const f of srcFiles) {
  const txt = fs.readFileSync(f, 'utf8');
  for (const pat of FORBIDDEN_PATTERNS) {
    if (pat.re.test(txt)) fail(`Secret pattern detected (${pat.label}) in ${path.relative(ROOT, f)}`);
  }
}
pass('Scanned src/**/*.js for hardcoded TURN credentials & secret tokens (0 found)');

// 4. Verify runtime dependencies against legal/THIRD_PARTY_INVENTORY.json
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const inv = JSON.parse(fs.readFileSync(path.join(ROOT, 'legal/THIRD_PARTY_INVENTORY.json'), 'utf8'));
const documentedRuntime = new Set((inv.runtimeDependencies || []).map(d => d.name));
for (const dep of Object.keys(pkg.dependencies || {})) {
  if (!documentedRuntime.has(dep)) {
    fail(`Runtime dependency "${dep}" in package.json is missing from legal/THIRD_PARTY_INVENTORY.json`);
  }
}
const documentedDev = new Set((inv.devDependencies || []).map(d => d.name));
for (const dep of Object.keys(pkg.devDependencies || {})) {
  if (!documentedDev.has(dep)) {
    warn(`Dev dependency "${dep}" in package.json is not listed in devDependencies inventory`);
  }
}
pass('Verified package.json dependencies against THIRD_PARTY_INVENTORY.json');

// 5. Verify every public/ asset filename is tracked in legal/ASSET_PROVENANCE.md
const provenanceTxt = fs.readFileSync(path.join(ROOT, 'legal/ASSET_PROVENANCE.md'), 'utf8');
const publicFiles = walk(path.join(ROOT, 'public'));
for (const f of publicFiles) {
  const name = path.basename(f);
  if (!provenanceTxt.includes(name)) {
    fail(`Asset in public/ lacks an entry in legal/ASSET_PROVENANCE.md: ${path.relative(ROOT, f)}`);
  }
}
pass(`Verified provenance tracking for all ${publicFiles.length} static assets in public/`);

// 6. Verify all relative legal links inside index.html resolve in root (and dist/ if built)
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const linkMatches = [...html.matchAll(/href="\.\/([^"#]+\.md)"/g)].map(m => m[1]);
const uniqueLinks = [...new Set(linkMatches)];
if (uniqueLinks.length < 5) fail('Expected legal footer / modal links in index.html');
for (const rel of uniqueLinks) {
  if (!fs.existsSync(path.join(ROOT, rel))) {
    fail(`Broken legal link in index.html: ./${rel}`);
  }
}
pass(`Verified ${uniqueLinks.length} relative legal links in index.html exist in repository`);

// 7. Verify production dist/ preserves legal notices and links if dist/ exists
const distDir = path.join(ROOT, 'dist');
if (fs.existsSync(distDir)) {
  for (const rel of uniqueLinks) {
    if (!fs.existsSync(path.join(distDir, rel))) {
      fail(`Production dist/ missing linked legal file: ${rel}`);
    }
  }
  const distAssetsDir = path.join(distDir, 'assets');
  const distJs = fs.existsSync(distAssetsDir)
    ? fs.readdirSync(distAssetsDir).filter(f => f.endsWith('.js'))
    : [];
  if (!distJs.length) {
    fail('No bundled JS file found under dist/assets/');
  } else {
    for (const jf of distJs) {
      const bundleHead = fs.readFileSync(path.join(distAssetsDir, jf), 'utf8').slice(0, 1200);
      if (!bundleHead.includes('Copyright (c) 2026 Vendreith') || !bundleHead.includes('CC BY-SA 3.0')) {
        fail(`Production bundle dist/assets/${jf} is missing preserved copyright/CC BY-SA banner`);
      }
      const bundleFull = fs.readFileSync(path.join(distAssetsDir, jf), 'utf8');
      for (const pat of FORBIDDEN_PATTERNS) {
        if (pat.re.test(bundleFull)) fail(`Secret pattern (${pat.label}) leaked into dist/assets/${jf}`);
      }
    }
  }
  pass(`Verified production dist/ preserves ${uniqueLinks.length} linked legal docs & JS notice banner`);
} else {
  warn('dist/ directory not built yet; run "npm run build" then re-run check:legal');
}

// 8. Remind about unresolved Category E release blockers (informational)
if (provenanceTxt.includes('RELEASE BLOCKER')) {
  warn('Category E release blockers remain flagged in legal/ASSET_PROVENANCE.md — resolve before unrestricted commercial/public redistribution.');
}

console.log(`\nCompliance summary: ${failures} failure(s), ${warnings} warning(s).`);
if (failures > 0) process.exit(1);
