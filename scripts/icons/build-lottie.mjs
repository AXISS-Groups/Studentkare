#!/usr/bin/env node
// Builds the animated set (Lottie) from the licensed packs into src/assets/lottie/.
//
//   node scripts/icons/build-lottie.mjs --packs <folder with the unzipped packs>   (write)
//   node scripts/icons/build-lottie.mjs --packs <folder> --only anim-check          (one asset)
//
// The packs never enter the repo: only the processed JSON of the animations we use is committed
// (licence terms in docs/licences/animation-packs.md). What each asset is, where it comes from and
// where it is used lives in design/icons/animated/lottie.config.json. For every asset this script:
//   1. drops what never draws: hidden layers, background solids, text layers (chart packs letter fake
//      numbers), image/audio layers, unused precomps, expressions and editor metadata;
//   2. crops the comp to the drawing (config `crop`), so the art fills the box it is given;
//   3. maps every fill, stroke and gradient colour to a design token role and writes the role next
//      to the colour (`"sk"`), with the colour set to the role's light value. The component swaps in
//      the current scheme's value at run time, so dark mode needs no second file. Icons are one ink
//      (`@ink`, coloured by the component's `color` prop; knock-out white becomes `@bg`).
//      Illustrations and charts take the nearest illustration token (DESIGN.md §3: illustration-*);
//      danger roles are never chosen, so red appears only where a config entry says `danger: true`
//      and then only through the component's colour (SOS, errors);
//   4. rounds numbers and writes minified JSON;
// then rewrites the `animated` list in design/icons/icon-manifest.json (check-icons reads it) and the
// table in design/icons/animated/README.md. Run `node scripts/icons/build-icons.mjs` afterwards.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const packsDir = val('--packs');
const only = val('--only');
if (!packsDir || !existsSync(packsDir)) {
  console.error('Usage: node scripts/icons/build-lottie.mjs --packs <folder with the unzipped packs> [--only <name>]');
  process.exit(2);
}

const configPath = join(root, 'design', 'icons', 'animated', 'lottie.config.json');
const manifestPath = join(root, 'design', 'icons', 'icon-manifest.json');
const readmePath = join(root, 'design', 'icons', 'animated', 'README.md');
const tokensPath = join(root, 'design', 'tokens', 'studentkare.tokens.json');
const outDir = join(root, 'src', 'assets', 'lottie');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));

/* ------------------------------------------------------------------ colour */

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const rgbToHex = (c) => `#${c.slice(0, 3).map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
function toLab([r, g, b]) {
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
  const y = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
  const z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** Token role (kebab, as in the token file) → camelCase key used in code (`skTokens.color.light`). */
const camel = (role) => role.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const lightHex = (role) => {
  const t = tokens.color.light[role];
  if (!t) throw new Error(`Unknown colour token "${role}"`);
  return t.$value.slice(0, 7);
};

/** Picks the token role for one source colour. Icons: one ink. Art: nearest allowed token. */
function roleFor(asset, rgb) {
  const hex = rgbToHex(rgb);
  const map = { ...config.maps?.[asset.kind], ...asset.map };
  const override = map[hex.toLowerCase()];
  if (override) return override;
  if (asset.kind === 'icon') return Math.min(...rgb.slice(0, 3)) > 0.92 ? '@bg' : '@ink';
  const allowed = config.palettes.illustration;
  if (args.includes('--verbose')) console.log(`  ${asset.name}: ${hex} → nearest token`);
  const lab = toLab(rgb);
  let best = allowed[0];
  let bestD = Infinity;
  for (const role of allowed) {
    const d = dist(lab, toLab(hexToRgb(lightHex(role))));
    if (d < bestD) { bestD = d; best = role; }
  }
  return best;
}

/** The colour written into the file for a role: its light value (icons: the action navy for @ink, surface for @bg). */
function paint(role) {
  if (role === '@ink') return hexToRgb(lightHex('action'));
  if (role === '@bg') return hexToRgb(lightHex('surface'));
  return hexToRgb(lightHex(role));
}
const tokenKey = (role) => (role.startsWith('@') ? role : camel(role));

/** Walks every colour-bearing property and annotates it with its role(s). Returns the set of roles. */
function recolour(asset, node, used) {
  if (Array.isArray(node)) { node.forEach((n) => recolour(asset, n, used)); return; }
  if (!node || typeof node !== 'object') return;
  if ((node.ty === 'fl' || node.ty === 'st') && node.c) {
    const c = node.c;
    if (c.a === 1 && Array.isArray(c.k)) {
      node.sk = c.k.map((kf) => {
        const src = kf.s ?? kf.e;
        if (!src) return null;
        const role = roleFor(asset, src);
        used.add(role);
        const [r, g, b] = paint(role);
        if (kf.s) kf.s = [r, g, b, kf.s[3] ?? 1];
        if (kf.e) kf.e = [r, g, b, kf.e[3] ?? 1];
        return tokenKey(role);
      });
    } else if (Array.isArray(c.k)) {
      const role = roleFor(asset, c.k);
      used.add(role);
      const [r, g, b] = paint(role);
      c.k = [r, g, b, c.k[3] ?? 1];
      node.sk = tokenKey(role);
    }
  }
  if ((node.ty === 'gf' || node.ty === 'gs') && node.g?.k && !node.g.k.a) {
    const n = node.g.p;
    const k = node.g.k.k;
    const roles = [];
    for (let i = 0; i < n; i++) {
      const role = roleFor(asset, k.slice(i * 4 + 1, i * 4 + 4));
      used.add(role);
      const [r, g, b] = paint(role);
      k[i * 4 + 1] = r; k[i * 4 + 2] = g; k[i * 4 + 3] = b;
      roles.push(tokenKey(role));
    }
    node.sk = roles;
  }
  for (const [key, v] of Object.entries(node)) if (key !== 'sk') recolour(asset, v, used);
}

/* ------------------------------------------------------------------- strip */

const DROP_KEYS = new Set(['nm', 'mn', 'cl', 'ln', 'markers', 'meta', 'fonts', 'chars', 'props']);
// Only `hd: false` is safe to drop: lottie-web divides precomp time by `sr` and reads `ddd`/`ao`/`bm` as given.
const DEFAULTS = { hd: false };

function keepLayer(layer, comp) {
  if (layer.hd === true) return false;
  if (layer.ty === 1 || layer.ty === 2 || layer.ty === 5 || layer.ty === 6) return false; // solid, image, text, audio
  if (layer.ip >= comp.op || layer.op <= comp.ip) return false;
  return true;
}

function stripLayers(layers, comp) {
  const kept = layers.filter((l) => keepLayer(l, comp));
  // A null (ty 3) that nothing is parented to draws nothing.
  const parents = new Set(kept.map((l) => l.parent).filter((p) => p !== undefined));
  return kept.filter((l) => l.ty !== 3 || parents.has(l.ind) || l.tt);
}

function scrub(node) {
  if (Array.isArray(node)) return node.map(scrub);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (DROP_KEYS.has(k)) continue;
    if (k === 'x' && typeof v === 'string') continue; // an expression (players here don't run them); a non-string `x` is data
    if (k in DEFAULTS && v === DEFAULTS[k]) continue;
    out[k] = scrub(v);
  }
  return out;
}

const round = (precision) => (key, v) => (typeof v === 'number' && !Number.isInteger(v) ? Number(v.toFixed(precision)) : v);

function build(asset) {
  const pack = config.packs[asset.pack];
  const src = join(packsDir, pack.dir, asset.file);
  const data = JSON.parse(readFileSync(src, 'utf8'));
  const comp = { ip: data.ip, op: data.op };
  data.layers = stripLayers(data.layers, comp);
  // Keep only precomps something still references (following nested precomps).
  const byId = new Map((data.assets || []).map((a) => [a.id, a.layers ? { ...a, layers: stripLayers(a.layers, comp) } : a]));
  const refs = new Set();
  const visit = (layers) => layers.forEach((l) => {
    if (l.refId && !refs.has(l.refId)) { refs.add(l.refId); const a = byId.get(l.refId); if (a?.layers) visit(a.layers); }
  });
  visit(data.layers);
  data.assets = [...byId.values()].filter((a) => refs.has(a.id));

  let out = scrub(data);
  if (asset.crop) {
    // Wrap the drawing in a precomp shifted by the crop origin, and size the comp to the crop.
    const [x, y, w, h] = asset.crop;
    const scene = { id: 'sk_scene', layers: out.layers };
    out = {
      ...out,
      w, h,
      assets: [...out.assets, scene],
      layers: [{
        ty: 0, ind: 1, refId: 'sk_scene', w: data.w, h: data.h, ip: out.ip, op: out.op, st: 0,
        ks: { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [-x, -y, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] } },
      }],
    };
  }
  const used = new Set();
  recolour(asset, out, used);
  const roles = [...used].sort();
  const forbidden = roles.filter((r) => /^danger/.test(r));
  if (forbidden.length) throw new Error(`${asset.name}: red roles ${forbidden.join(', ')} are not allowed in artwork`);
  out.sk = { v: 1, name: asset.name, roles: roles.map(tokenKey) };
  const json = JSON.stringify(out, round(asset.kind === 'icon' ? 2 : 2));
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `${asset.name}.json`);
  writeFileSync(file, json);
  return {
    name: asset.name,
    kind: asset.kind,
    file: `src/assets/lottie/${asset.name}.json`,
    source: { pack: pack.title, author: pack.author, file: asset.file, licence: `docs/licences/animation-packs.md#${pack.licence}` },
    width: out.w,
    height: out.h,
    frames: out.op - out.ip,
    fps: out.fr,
    loop: Boolean(asset.loop),
    rest: asset.rest,
    danger: Boolean(asset.danger),
    roles: roles.map(tokenKey),
    bytes: Buffer.byteLength(json),
    originalBytes: readFileSync(src).length,
    screens: asset.screens,
    uses: asset.uses,
    ...(asset.alt ? { alt: asset.alt } : {}),
  };
}

/* ------------------------------------------------------------------ output */

const results = [];
for (const asset of config.assets) {
  if (only && asset.name !== only) continue;
  results.push(build(asset));
}

/** JSON as the manifest is written (one-space indent, UTF-8 as is), so diffs stay small. */
const asciiJson = (o) => `${JSON.stringify(o, null, 1)}\n`;

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const previous = new Map((manifest.animated || []).map((a) => [a.name, a]));
for (const r of results) previous.set(r.name, r);
manifest.animated = config.assets.map((a) => previous.get(a.name)).filter(Boolean);
const rawManifest = readFileSync(manifestPath, 'utf8');
writeFileSync(manifestPath, rawManifest.endsWith('\n') ? asciiJson(manifest) : asciiJson(manifest).trimEnd());

const kb = (n) => (n / 1024).toFixed(1);
const table = [
  '| Asset | Kind | Source pack → file | Screens (check-icons) | Also used | KB (original → shipped) |',
  '|---|---|---|---|---|---|',
  ...manifest.animated.map((a) => `| \`${a.name}\` | ${a.kind}${a.loop ? ', loop' : ''}${a.danger ? ', may be red' : ''} | ${a.source.pack} → \`${a.source.file}\` | ${a.screens.join(', ') || '—'} | ${a.uses} | ${kb(a.originalBytes)} → ${kb(a.bytes)} |`),
].join('\n');
const total = manifest.animated.reduce((s, a) => s + a.bytes, 0);
const readme = readFileSync(readmePath, 'utf8');
const start = '<!-- build-lottie:table:start -->';
const end = '<!-- build-lottie:table:end -->';
const body = `${start}\n${table}\n\n${manifest.animated.length} animations, ${kb(total)} KB of JSON in all.\n${end}`;
writeFileSync(readmePath, readme.replace(new RegExp(`${start}[\\s\\S]*?${end}`), body));

for (const r of results) console.log(`${r.name.padEnd(24)} ${kb(r.originalBytes).padStart(6)} KB → ${kb(r.bytes).padStart(6)} KB  roles: ${r.roles.join(' ')}`);
console.log(`\n${results.length} built into src/assets/lottie/. Now run: node scripts/icons/build-icons.mjs`);
