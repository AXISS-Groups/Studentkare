#!/usr/bin/env node
// Checks that a built screen uses every icon, glyph, illustration and image its design has.
//
//   node scripts/icons/check-icons.mjs --screen WebHome                 # files from design/screens/implementation-map.json
//   node scripts/icons/check-icons.mjs --screen WebHome --files src/a.tsx src/b.tsx
//   node scripts/icons/check-icons.mjs --all                            # every mapped screen + a coverage report
//
// A required icon counts as used when its name appears as a string literal ('name', "name" or `name`)
// in the screen's files — e.g. <Icon name="bell" />. Exact-drawing variants can be consolidated in
// design/icons/aliases.json ({ "lock-3": "lock" }): either name then satisfies the check.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const root = process.cwd();
const D = join(root, 'design');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const list = (f) => { const i = args.indexOf(f); if (i < 0) return []; const out = []; for (let j = i + 1; j < args.length && !args[j].startsWith('--'); j++) out.push(args[j]); return out; };

const m = JSON.parse(readFileSync(join(D, 'icons', 'icon-manifest.json'), 'utf8'));
const mapPath = join(D, 'screens', 'implementation-map.json');
const implMap = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8')).screens : {};
const aliasPath = join(D, 'icons', 'aliases.json');
const aliases = existsSync(aliasPath) ? JSON.parse(readFileSync(aliasPath, 'utf8')) : {};
const alts = (n) => [n, aliases[n]].filter(Boolean);
const BANNED_TEXT = Object.entries(m.textGlyphs).filter(([, v]) => v.useIcon).map(([g]) => g);

function checkScreen(screen, files) {
  const need = m.screens[screen];
  if (!need) return { screen, error: `Unknown screen "${screen}" — names are in design/screens/INDEX.md` };
  const missingFiles = files.filter((f) => !existsSync(join(root, f)));
  const code = files.filter((f) => existsSync(join(root, f))).map((f) => readFileSync(join(root, f), 'utf8')).join('\n');
  const has = (name) => alts(name).some((n) => new RegExp(`(['"\`])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`).test(code));
  const hasFile = (name) => code.includes(name) || code.includes(name.replace(/\.[a-z0-9]+$/, ''));
  const missing = {
    icons: need.icons.filter((n) => !has(n)),
    icons3d: need.icons3d.filter((n) => !has(n)),
    glyphs: need.glyphs.filter((n) => !has(n)),
    brand: need.brand.length && !/skBrandLogo|BrandLogo|studentkare-logo/.test(code) ? need.brand : [],
    illustrations: need.illustrations.filter((n) => !has(n) && !hasFile(n)),
    assets: need.assets.filter((n) => !hasFile(n)),
    textGlyphIcons: (need.textGlyphs || []).map((g) => m.textGlyphs[g]?.useIcon).filter(Boolean).filter((n) => !has(n)),
  };
  const problems = [];
  if (missingFiles.length) problems.push(`files not found: ${missingFiles.join(', ')}`);
  if (/<svg[\s>]/.test(code)) problems.push('raw <svg> in screen code — use <Icon>, <Icon3d>, <Glyph> or an illustration component');
  if (/from ['"]lucide-react['"]/.test(code)) problems.push('lucide-react imported — use the design-system <Icon> so drawings match the canvas');
  const textHits = BANNED_TEXT.filter((g) => code.includes(g));
  if (textHits.length) problems.push(`text symbols used as icons: ${textHits.join(' ')} — draw them with <Icon> (see skTextGlyphIcons)`);
  const total = Object.values(missing).reduce((a, b) => a + b.length, 0);
  return { screen, files, missing, total, problems, required: need };
}

function print(r) {
  if (r.error) { console.log(`✗ ${r.error}`); return; }
  const ok = r.total === 0 && r.problems.length === 0;
  console.log(`${ok ? '✓' : '✗'} ${r.screen}  (${r.files.length} file${r.files.length === 1 ? '' : 's'})`);
  for (const [k, v] of Object.entries(r.missing)) if (v.length) console.log(`    missing ${k}: ${v.join(', ')}`);
  for (const p of r.problems) console.log(`    problem: ${p}`);
}

const results = [];
if (flag('--all')) {
  for (const screen of Object.keys(m.screens)) {
    const files = implMap[screen] || [];
    if (files.length) results.push(checkScreen(screen, files));
  }
  const notStarted = Object.keys(m.screens).filter((s) => !(implMap[s] || []).length);
  results.forEach(print);
  const done = results.filter((r) => !r.error && r.total === 0 && r.problems.length === 0).length;
  const lines = ['# Icon coverage', '', `Screens built and passing: **${done} / ${Object.keys(m.screens).length}** · built with gaps: ${results.length - done} · not started: ${notStarted.length}`, '',
    '| Screen | Status | Missing |', '|---|---|---|',
    ...results.map((r) => `| ${r.screen} | ${r.total === 0 && !r.problems?.length ? 'pass' : 'gaps'} | ${r.error || Object.entries(r.missing).filter(([, v]) => v.length).map(([k, v]) => `${k}: ${v.join(', ')}`).concat(r.problems).join('; ') || '—'} |`),
    ...notStarted.map((s) => `| ${s} | not started | — |`)];
  writeFileSync(join(D, 'screens', 'icon-coverage.md'), lines.join('\n') + '\n');
  console.log(`\n${done}/${Object.keys(m.screens).length} screens pass · report: design/screens/icon-coverage.md`);
  process.exit(results.some((r) => r.error || r.total || r.problems.length) ? 1 : 0);
} else {
  const screen = val('--screen');
  if (!screen) { console.log('Usage: --screen <Name> [--files a.tsx b.tsx]  |  --all'); process.exit(2); }
  const files = list('--files').length ? list('--files') : implMap[screen] || [];
  if (!files.length) { console.log(`No files for ${screen}. Pass --files or add them to design/screens/implementation-map.json.`); process.exit(2); }
  const r = checkScreen(screen, files);
  print(r);
  if (!r.error && flag('--list')) {
    console.log('\nRequired:', JSON.stringify(r.required, null, 1));
  }
  process.exit(r.error || r.total || r.problems.length ? 1 : 0);
}
