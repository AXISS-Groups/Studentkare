#!/usr/bin/env node
// Resolves the merge conflicts that parallel ticket branches always produce in the shared
// registries, and refuses everything else.
//
//   npm run merge:resolve            # during a conflicted `git merge` / `git rebase` / cherry-pick
//
// What it resolves (and stages with `git add`):
//   design/screens/implementation-map.json  3-way merge against the merge base: a screen's file list
//                                            is the union of both sides' additions minus what either
//                                            side removed; a screen with files lives in `screens`, never
//                                            also in `inProgress`; an `inProgress` entry one side removed
//                                            stays removed (no stale entry comes back); a `superseded`
//                                            screen keeps no files.
//   config/*legacy*.json                     shrink-only lists: an entry either side removed is removed;
//                                            new entries (a `git mv` rename) are kept for the ratchet
//                                            (npm run lint:ratchet) to judge. Without additions this is
//                                            the intersection of both sides.
//   generated files                          rebuilt with the repo's own scripts once their sources merged:
//                                            src/generated/settings.ts (npm run settings:build),
//                                            src/theme/tokens/generated/* (npm run tokens:build),
//                                            src/design-system/icons/generated/skIconData.ts (npm run icons:build),
//                                            design/screens/icon-coverage.md (check-icons --all).
//   src/**/*.ts(x) list hunks                a conflict hunk whose every line is a one-line list entry
//                                            (a quoted entry or key, an import, a spread, a type member,
//                                            a lazy screen, a `case` line, a <Stack.Screen />) is merged as
//                                            a union: both sides' new lines, minus lines either side removed.
// Afterwards every `// keep-sorted start` list in src/ is sorted again (the union driver in
// .gitattributes and the hunk union above append lines). Anything else is refused: the script
// prints the files it left and exits 1. It never edits code with logic in it.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { filesWithLists, sortBlocks } from './keep-sorted.mjs';

const git = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const tryGit = (args) => { try { return git(args); } catch { return null; } };
const log = (msg) => console.log(msg);

// ---------------------------------------------------------------- 3-way helpers

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
class Unresolvable extends Error {}

/** 3-way list: ours, minus what theirs removed, plus what theirs added (in theirs' order). */
export function mergeList(base = [], ours = [], theirs = []) {
  const has = (list, x) => list.some((y) => same(x, y));
  const kept = ours.filter((x) => !(has(base, x) && !has(theirs, x)));
  return [...kept, ...theirs.filter((x) => !has(ours, x) && !has(base, x))];
}

/** 3-way value: identical or one-sided changes win; lists merge; objects merge per key; else throw. */
export function mergeValue(base, ours, theirs, path = '') {
  if (same(ours, theirs)) return ours;
  if (same(base, ours)) return theirs;
  if (same(base, theirs)) return ours;
  if (Array.isArray(ours) && Array.isArray(theirs) && (base === undefined || Array.isArray(base))) return mergeList(base, ours, theirs);
  if (isObj(ours) && isObj(theirs) && (base === undefined || isObj(base))) return mergeObject(base || {}, ours, theirs, path);
  throw new Unresolvable(`${path || '(root)'}: both sides changed it differently`);
}

/** Keys in ours' order, then theirs' new keys. A key one side deleted is deleted if the other left it alone. */
export function mergeObject(base, ours, theirs, path = '', { deletionWins = false } = {}) {
  const out = {};
  const keys = [...Object.keys(ours), ...Object.keys(theirs).filter((k) => !(k in ours))];
  for (const k of keys) {
    const inB = k in base;
    const inO = k in ours;
    const inT = k in theirs;
    const p = path ? `${path}.${k}` : k;
    if (inO && inT) out[k] = mergeValue(base[k], ours[k], theirs[k], p);
    else if (!inB) out[k] = inO ? ours[k] : theirs[k]; // added on one side
    else {
      const kept = inO ? ours[k] : theirs[k]; // deleted on the other side
      if (same(kept, base[k]) || deletionWins) continue;
      throw new Unresolvable(`${p}: deleted on one side, changed on the other`);
    }
  }
  return out;
}

// ---------------------------------------------------------------- git stages

/** Stage n of a conflicted path (1 base, 2 ours, 3 theirs); null when that side has no file. */
const stage = (n, path) => tryGit(['show', `:${n}:${path}`]);
const json = (text, fallback) => (text === null ? fallback : JSON.parse(text));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

// ---------------------------------------------------------------- resolvers

export function mergeImplementationMap(base, ours, theirs) {
  const warnings = [];
  const merged = {};
  const keys = [...Object.keys(ours), ...Object.keys(theirs).filter((k) => !(k in ours))];
  for (const k of keys) {
    const b = base[k];
    const o = ours[k];
    const t = theirs[k];
    if (k === 'inProgress') {
      // Never revive an entry that one side finished or removed.
      merged[k] = mergeObject(b || {}, o || {}, t || {}, k, { deletionWins: true });
    } else if (o !== undefined && t !== undefined) merged[k] = mergeValue(b, o, t, k);
    else merged[k] = o !== undefined ? o : t;
  }
  const screens = merged.screens || {};
  const inProgress = merged.inProgress || {};
  for (const [screen, files] of Object.entries(screens)) {
    if (files.length && screen in inProgress) delete inProgress[screen];
  }
  const superseded = Object.keys(merged.superseded || {}).filter((k) => !k.startsWith('_'));
  for (const screen of superseded) {
    for (const section of ['screens', 'inProgress']) {
      const files = merged[section]?.[screen];
      if (files === undefined) continue;
      if (files.length) warnings.push(`${screen} is superseded but had files under "${section}" (${files.join(', ')}); dropped them. Check this is right.`);
      delete merged[section][screen];
    }
  }
  return { merged, warnings };
}

/** Shrink-only lists: what either side removed stays removed; additions (renames) are kept. */
export function mergeLegacy(base, ours, theirs) {
  if (Array.isArray(ours)) return mergeList(base || [], ours, theirs || []);
  return mergeObject(base || {}, ours, theirs || {}, '', { deletionWins: true });
}

// One-line list entries (trimmed). A hunk is merged only if every line in it is one of these.
const LIST_LINE = [
  /^$/, // blank
  /^\/\/.*$/, // comment
  /^'[^'\\]*'(?:\s*:\s*.+)?,(?:\s*\/\/.*)?$/, // 'route',  'key': value,
  /^\[\s*'[^'\\]*',\s*\w+\s*\],(?:\s*\/\/.*)?$/, // ['prefix/', ROLES],
  /^\.\.\.[\w$]+,$/, // ...areaEn,
  /^import (?:type )?\{[\w$, ]+\} from '[^']+';$/, // import { a, b } from './x';
  /^import [\w$]+ from '[^']+';$/,
  /^[\w$]+(?: as [\w$]+)?,$/, // a name in a multi-line import
  /^[\w$]+\??: [^;{}]+;$/, // Name: undefined;  (type members)
  /^[\w$]+: '[^'\\]*',$/, // home: 'Home',
  /^const [\w$]+ = lazy\(.*\);$/, // const Screen = lazy(() => import(...));
  /^(?:case '[^'\\]*':\s*)+return .*;$/, // case 'route': return <Page />;
  /^<Stack\.Screen [^<>]*(?:<[^<>]*>[^<>]*)*\/>$/, // <Stack.Screen name="X" ... />
  /^\{ [^{}]*(?:\{[^{}]*\}[^{}]*)*\},$/, // { path: 'x' as RoutePath, label: ..., icon: X },
];
const isListLine = (line) => LIST_LINE.some((re) => re.test(line.trim()));

/** Merge one conflicted text file from its stages; null if a hunk is not a pure list hunk. */
export function mergeListHunks(base, ours, theirs) {
  const dir = mkdtempSync(join(tmpdir(), 'sk-merge-'));
  try {
    const [o, b, t] = ['ours', 'base', 'theirs'].map((name, i) => {
      const p = join(dir, name);
      writeFileSync(p, [ours, base, theirs][i]);
      return p;
    });
    const r = spawnSync('git', ['merge-file', '-p', '--diff3', '-L', 'ours', '-L', 'base', '-L', 'theirs', o, b, t], { encoding: 'utf8' });
    if (r.status < 0 || r.status === null) return null;
    const lines = r.stdout.split('\n');
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('<<<<<<< ')) { out.push(lines[i]); continue; }
      const take = (stop) => { const acc = []; i++; while (i < lines.length && !stop(lines[i])) acc.push(lines[i++]); return acc; };
      const O = take((l) => l.startsWith('||||||| '));
      const B = take((l) => l === '=======');
      const T = take((l) => l.startsWith('>>>>>>> '));
      if (![...O, ...B, ...T].every(isListLine)) return null;
      const removedByTheirs = new Set(B.filter((l) => !T.includes(l)));
      const kept = O.filter((l) => !removedByTheirs.has(l));
      out.push(...kept, ...T.filter((l) => !O.includes(l) && !B.includes(l)));
    }
    return out.join('\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- generated files

const GENERATED = [
  { files: ['src/generated/settings.ts'], sources: ['backend/core/settings_registry.py'], cmd: ['npm', ['run', '-s', 'settings:build']] },
  { files: ['src/theme/tokens/generated/skTokens.ts', 'src/theme/tokens/generated/sk-tokens.css'], sources: ['design/tokens/'], cmd: ['npm', ['run', '-s', 'tokens:build']] },
  { files: ['src/design-system/icons/generated/skIconData.ts'], sources: ['design/icons/', 'design/brand/'], cmd: ['npm', ['run', '-s', 'icons:build']] },
  // Last: it reads the merged map and the merged screen code. It exits 1 when any screen has gaps,
  // but still writes the report, so only a missing report counts as a failure.
  { files: ['design/screens/icon-coverage.md'], sources: ['design/screens/implementation-map.json', 'design/icons/', 'src/'], cmd: ['node', ['scripts/icons/check-icons.mjs', '--all']], anyExit: true },
];

// ---------------------------------------------------------------- main

function inMergeState() {
  const gitDir = git(['rev-parse', '--git-dir']).trim();
  return ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply'].some((f) => existsSync(join(gitDir, f)));
}

function main() {
  const root = git(['rev-parse', '--show-toplevel']).trim();
  process.chdir(root);
  const merging = inMergeState();
  const conflicted = (tryGit(['diff', '--name-only', '--diff-filter=U']) || '').split('\n').filter(Boolean);
  const refused = [];
  const resolved = [];
  const warnings = [];
  const pendingGenerated = new Set();

  for (const path of conflicted) {
    const base = stage(1, path);
    const ours = stage(2, path);
    const theirs = stage(3, path);
    if (ours === null || theirs === null) { refused.push(`${path} (deleted on one side)`); continue; }
    try {
      if (path === 'design/screens/implementation-map.json') {
        const r = mergeImplementationMap(json(base, {}), json(ours, {}), json(theirs, {}));
        writeJson(path, r.merged);
        warnings.push(...r.warnings);
      } else if (/^config\/[^/]*legacy[^/]*\.json$/.test(path)) {
        writeJson(path, mergeLegacy(json(base, null), json(ours, []), json(theirs, [])));
      } else if (GENERATED.some((g) => g.files.includes(path))) {
        pendingGenerated.add(path);
        continue;
      } else if (/^src\/.*\.(ts|tsx)$/.test(path)) {
        const text = mergeListHunks(base ?? '', ours, theirs);
        if (text === null) { refused.push(`${path} (a conflict that is not a one-line-per-entry list)`); continue; }
        writeFileSync(path, text);
      } else {
        refused.push(path);
        continue;
      }
      resolved.push(path);
    } catch (e) {
      if (e instanceof Unresolvable || e instanceof SyntaxError) { refused.push(`${path} (${e.message})`); continue; }
      throw e;
    }
  }

  // Re-sort every list: both the union driver and the hunk union append.
  const resorted = [];
  for (const path of filesWithLists()) {
    if (!existsSync(path) || refused.some((r) => r.startsWith(`${path} `) || r === path)) continue;
    const text = readFileSync(path, 'utf8');
    if (text.includes('<<<<<<< ')) continue;
    let next;
    try { next = sortBlocks(text); } catch (e) { refused.push(`${path} (${e.message})`); continue; }
    if (next !== text) { writeFileSync(path, next); resorted.push(path); }
  }

  // Rebuild generated files once nothing they are built from is still conflicted.
  const stillConflicted = (sources) => conflicted.filter((c) => !resolved.includes(c) && !pendingGenerated.has(c)).some((c) => sources.some((s) => c.startsWith(s)));
  for (const g of GENERATED) {
    const mine = g.files.filter((f) => pendingGenerated.has(f));
    if (!mine.length) continue;
    if (stillConflicted(g.sources)) { mine.forEach((f) => refused.push(`${f} (its sources ${g.sources.join(', ')} are still conflicted)`)); continue; }
    const r = spawnSync(g.cmd[0], g.cmd[1], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const ok = g.anyExit ? mine.every((f) => existsSync(f) && !readFileSync(f, 'utf8').includes('<<<<<<< ')) : r.status === 0;
    if (!ok) { mine.forEach((f) => refused.push(`${f} (\`${g.cmd.flat().join(' ')}\` failed: ${(r.stderr || r.stdout).trim().split('\n').slice(-3).join(' / ')})`)); continue; }
    resolved.push(...mine);
  }

  const toStage = [...new Set([...resolved, ...(merging ? resorted : [])])];
  if (toStage.length && merging) git(['add', '--', ...toStage]);

  resolved.forEach((p) => log(`resolved  ${p}`));
  resorted.forEach((p) => log(`sorted    ${p}`));
  warnings.forEach((w) => log(`warning   ${w}`));
  if (!conflicted.length) log(merging ? 'No conflicted files.' : 'No merge in progress: only re-sorted the lists.');
  if (refused.length) {
    console.error(`\nNot resolved (fix by hand, then \`git add\`):\n${refused.map((r) => `  ${r}`).join('\n')}`);
    process.exit(1);
  }
  if (conflicted.length) log('\nAll conflicts resolved. Now run the checks in docs/tickets/RULES.md ("Done means"), at least `npx tsc --noEmit` and `npx vitest run`.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
