#!/usr/bin/env node
// Checks that a built screen uses every icon, glyph, illustration and image its design has.
//
//   node scripts/icons/check-icons.mjs --screen WebHome                 # files from design/screens/implementation-map.json
//   node scripts/icons/check-icons.mjs --screen WebHome --files src/a.tsx src/b.tsx
//   node scripts/icons/check-icons.mjs --all                            # every mapped screen + a coverage report
//   node scripts/icons/check-icons.mjs --ratchet                        # CI gate: mapped screens may not add gaps
//
// --ratchet is the blocking CI check. A mapped screen passes when everything it is missing is listed
// for it in config/icon-coverage-legacy.json (gaps that predate the gate). The list may only shrink:
// a new gap, a newly mapped screen with gaps, or a raw <svg>/lucide/text-glyph problem fails. Gaps that
// have since been fixed are reported so they can be removed from the list.
//
// A screen listed under `superseded` in the implementation map (a board replaced by a newer one,
// e.g. MyReports by Mobile 2.0 M2Insights) is not built: --screen names its successor and passes,
// --all reports it as "superseded" instead of "not started", and every mode fails if the entry is
// inconsistent (unknown screen, also mapped, no successor, or a successor that is not built).
//
// A required icon counts as used when its name appears as a string literal ('name', "name" or `name`)
// in the screen's files — e.g. <Icon name="bell" />. Exact-drawing variants can be consolidated in
// design/icons/aliases.json ({ "lock-3": "lock" }): either name then satisfies the check.
//
// An icon a recorded decision took off a screen (the founder removing a duplicated entry point, say) is
// listed under `retiredIcons` in the implementation map with the `source` of the decision: it is then not
// required on that screen. Every mode fails if such an entry has no source, names an icon the screen's
// brief does not have, or names an icon the screen still uses (a stale entry).
//
// Animations (<AnimatedIcon name="anim-…">, <AnimatedIllustration name="scene-…">) are checked the same way:
// a screen may name only animations in the manifest's `animated` list, and a screen listed under an
// animation's `screens` must use it (missing animated: …).
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
const mapJson = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf8')) : {};
const implMap = mapJson.screens || {};
const superseded = Object.fromEntries(Object.entries(mapJson.superseded || {}).filter(([k]) => !k.startsWith('_')));
const retiredIcons = Object.fromEntries(Object.entries(mapJson.retiredIcons || {}).filter(([k]) => !k.startsWith('_')));
const aliasPath = join(D, 'icons', 'aliases.json');
const aliases = existsSync(aliasPath) ? JSON.parse(readFileSync(aliasPath, 'utf8')) : {};
const alts = (n) => [n, aliases[n]].filter(Boolean);
const BANNED_TEXT = Object.entries(m.textGlyphs).filter(([, v]) => v.useIcon).map(([g]) => g);
// Animated set (design/icons/animated): names a screen may use, and the screens each must appear in.
const ANIMATED = new Map((m.animated || []).map((a) => [a.name, a]));
const ANIMATED_NAME = /(['"`])((?:anim|scene|loop-chart)-[a-z0-9-]+)\1/g;

function checkScreen(screen, files) {
  const need = m.screens[screen];
  if (!need) return { screen, error: `Unknown screen "${screen}" — names are in design/screens/INDEX.md` };
  const missingFiles = files.filter((f) => !existsSync(join(root, f)));
  const code = files.filter((f) => existsSync(join(root, f))).map((f) => readFileSync(join(root, f), 'utf8')).join('\n');
  const has = (name) => alts(name).some((n) => new RegExp(`(['"\`])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`).test(code));
  const hasFile = (name) => code.includes(name) || code.includes(name.replace(/\.[a-z0-9]+$/, ''));
  const retired = new Set(retiredIcons[screen]?.icons || []);
  const missing = {
    icons: need.icons.filter((n) => !retired.has(n) && !has(n)),
    icons3d: need.icons3d.filter((n) => !has(n)),
    glyphs: need.glyphs.filter((n) => !has(n)),
    brand: need.brand.length && !/skBrandLogo|BrandLogo|studentkare-logo/.test(code) ? need.brand : [],
    illustrations: need.illustrations.filter((n) => !has(n) && !hasFile(n)),
    assets: need.assets.filter((n) => !hasFile(n)),
    textGlyphIcons: (need.textGlyphs || []).map((g) => m.textGlyphs[g]?.useIcon).filter(Boolean).filter((n) => !has(n)),
    animated: [...ANIMATED.values()].filter((a) => a.screens.includes(screen)).map((a) => a.name).filter((n) => !has(n)),
  };
  const problems = [];
  if (missingFiles.length) problems.push(`files not found: ${missingFiles.join(', ')}`);
  if (/<svg[\s>]/.test(code)) problems.push('raw <svg> in screen code — use <Icon>, <Icon3d>, <Glyph> or an illustration component');
  if (/from ['"]lucide-react['"]/.test(code)) problems.push('lucide-react imported — use the design-system <Icon> so drawings match the canvas');
  const unknownAnimated = [...new Set([...code.matchAll(ANIMATED_NAME)].map((x) => x[2]))].filter((n) => !ANIMATED.has(n));
  if (unknownAnimated.length) problems.push(`animations not in the manifest: ${unknownAnimated.join(', ')} — add them through design/icons/animated/lottie.config.json`);
  const textHits = BANNED_TEXT.filter((g) => code.includes(g));
  if (textHits.length) problems.push(`text symbols used as icons: ${textHits.join(' ')} — draw them with <Icon> (see skTextGlyphIcons)`);
  const entry = retiredIcons[screen];
  if (entry) {
    if (!entry.source) problems.push('retiredIcons: "source" must say where the decision is recorded');
    for (const n of retired) {
      if (!need.icons.includes(n)) problems.push(`retiredIcons: ${n} is not in this screen's brief`);
      else if (has(n)) problems.push(`retiredIcons: ${n} is still used here; remove it from the list`);
    }
  }
  const total = Object.values(missing).reduce((a, b) => a + b.length, 0);
  return { screen, files, missing, total, problems, required: need };
}

// Every superseded entry must name a canvas screen that is not also mapped, and successors that are
// canvas screens built under `screens` (files listed). Returns one message per problem.
function supersededProblems() {
  const out = [];
  for (const a of ANIMATED.values()) {
    if (!existsSync(join(root, a.file))) out.push(`animated ${a.name}: ${a.file} is missing (scripts/icons/build-lottie.mjs)`);
    for (const s of a.screens) if (!m.screens[s]) out.push(`animated ${a.name}: screen ${s} is not a canvas screen`);
  }
  for (const [screen, entry] of Object.entries(superseded)) {
    const by = Array.isArray(entry?.by) ? entry.by : [];
    if (!m.screens[screen]) out.push(`superseded ${screen}: not a canvas screen (names are in design/screens/INDEX.md)`);
    if ((implMap[screen] || []).length) out.push(`superseded ${screen}: also has files under "screens"; a superseded board is not built`);
    if ((mapJson.inProgress?.[screen] || []).length) out.push(`superseded ${screen}: still listed under "inProgress"`);
    if (!by.length) out.push(`superseded ${screen}: "by" must name the screen(s) that replace it`);
    for (const next of by) {
      if (!m.screens[next]) out.push(`superseded ${screen}: successor ${next} is not a canvas screen`);
      else if (superseded[next]) out.push(`superseded ${screen}: successor ${next} is itself superseded`);
      else if (!(implMap[next] || []).length) out.push(`superseded ${screen}: successor ${next} has no files under "screens"`);
    }
    if (!entry?.source) out.push(`superseded ${screen}: "source" must say where the decision is recorded`);
  }
  return out;
}

function print(r) {
  if (r.error) { console.log(`✗ ${r.error}`); return; }
  const ok = r.total === 0 && r.problems.length === 0;
  console.log(`${ok ? '✓' : '✗'} ${r.screen}  (${r.files.length} file${r.files.length === 1 ? '' : 's'})`);
  for (const [k, v] of Object.entries(r.missing)) if (v.length) console.log(`    missing ${k}: ${v.join(', ')}`);
  for (const p of r.problems) console.log(`    problem: ${p}`);
}

const results = [];
if (flag('--ratchet')) {
  const legacyPath = join(root, 'config', 'icon-coverage-legacy.json');
  const legacy = existsSync(legacyPath) ? JSON.parse(readFileSync(legacyPath, 'utf8')) : {};
  const gapsOf = (r) => Object.entries(r.missing).flatMap(([k, v]) => v.map((n) => `${k}:${n}`));
  let failed = 0;
  let fixed = 0;
  for (const p of supersededProblems()) { failed++; console.log(`✗ ${p}`); }
  for (const screen of Object.keys(m.screens)) {
    const files = implMap[screen] || [];
    if (!files.length) continue;
    const r = checkScreen(screen, files);
    if (r.error) { console.log(`✗ ${r.error}`); failed++; continue; }
    const allowed = new Set(legacy[screen] || []);
    const gaps = gapsOf(r);
    const added = gaps.filter((g) => !allowed.has(g));
    const gone = [...allowed].filter((g) => !gaps.includes(g));
    if (added.length || r.problems.length) {
      failed++;
      console.log(`✗ ${screen}`);
      if (added.length) console.log(`    new gaps (not in config/icon-coverage-legacy.json): ${added.join(', ')}`);
      for (const p of r.problems) console.log(`    problem: ${p}`);
    } else {
      console.log(`✓ ${screen}${gaps.length ? `  (${gaps.length} known gap${gaps.length === 1 ? '' : 's'})` : ''}`);
    }
    if (gone.length) { fixed += gone.length; console.log(`    fixed, remove from the legacy list: ${gone.join(', ')}`); }
  }
  for (const screen of Object.keys(legacy)) {
    if (!(implMap[screen] || []).length) { failed++; console.log(`✗ ${screen} is in config/icon-coverage-legacy.json but no longer mapped${superseded[screen] ? ' (superseded)' : ''}; remove it from the list`); }
  }
  if (fixed) console.log(`\n${fixed} listed gap${fixed === 1 ? ' is' : 's are'} fixed; remove ${fixed === 1 ? 'it' : 'them'} from config/icon-coverage-legacy.json.`);
  process.exit(failed ? 1 : 0);
} else if (flag('--all')) {
  for (const screen of Object.keys(m.screens)) {
    const files = implMap[screen] || [];
    if (files.length) results.push(checkScreen(screen, files));
  }
  const retired = Object.keys(m.screens).filter((s) => superseded[s] && !(implMap[s] || []).length);
  const notStarted = Object.keys(m.screens).filter((s) => !(implMap[s] || []).length && !superseded[s]);
  const mapProblems = supersededProblems();
  results.forEach(print);
  for (const p of mapProblems) console.log(`✗ ${p}`);
  const done = results.filter((r) => !r.error && r.total === 0 && r.problems.length === 0).length;
  const live = Object.keys(m.screens).length - retired.length;
  const lines = ['# Icon coverage', '', `Screens built and passing: **${done} / ${live}** · built with gaps: ${results.length - done} · not started: ${notStarted.length} · superseded: ${retired.length}`, '',
    '| Screen | Status | Missing |', '|---|---|---|',
    ...results.map((r) => `| ${r.screen} | ${r.total === 0 && !r.problems?.length ? 'pass' : 'gaps'} | ${r.error || Object.entries(r.missing).filter(([, v]) => v.length).map(([k, v]) => `${k}: ${v.join(', ')}`).concat(r.problems).join('; ') || '—'} |`),
    ...notStarted.map((s) => `| ${s} | not started | — |`),
    ...retired.map((s) => `| ${s} | superseded | by ${superseded[s].by.join(', ')} |`),
    ...mapProblems.map((p) => `| — | map problem | ${p} |`)];
  writeFileSync(join(D, 'screens', 'icon-coverage.md'), lines.join('\n') + '\n');
  console.log(`\n${done}/${live} screens pass (${retired.length} superseded) · report: design/screens/icon-coverage.md`);
  process.exit(results.some((r) => r.error || r.total || r.problems.length) || mapProblems.length ? 1 : 0);
} else {
  const screen = val('--screen');
  if (!screen) { console.log('Usage: --screen <Name> [--files a.tsx b.tsx]  |  --all'); process.exit(2); }
  if (superseded[screen] && !list('--files').length) {
    const own = supersededProblems().filter((p) => p.startsWith(`superseded ${screen}:`));
    if (own.length) { own.forEach((p) => console.log(`✗ ${p}`)); process.exit(1); }
    console.log(`↷ ${screen} is superseded by ${superseded[screen].by.join(', ')} (${superseded[screen].source}); nothing to build. Check ${superseded[screen].by.join(', ')} instead.`);
    process.exit(0);
  }
  const files = list('--files').length ? list('--files') : implMap[screen] || [];
  if (!files.length) { console.log(`No files for ${screen}. Pass --files or add them to design/screens/implementation-map.json.`); process.exit(2); }
  const r = checkScreen(screen, files);
  print(r);
  if (!r.error && flag('--list')) {
    console.log('\nRequired:', JSON.stringify(r.required, null, 1));
  }
  process.exit(r.error || r.total || r.problems.length ? 1 : 0);
}
