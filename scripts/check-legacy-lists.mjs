#!/usr/bin/env node
/**
 * Lint ratchets only shrink (audit TD-23). Every config/*-legacy.json list must
 * name only files that exist, and must not gain entries compared with the base
 * branch (default origin/main; override with LEGACY_BASE=<ref>).
 *
 * A file moved with `git mv` carries its entry: the new path may replace the old
 * one when git reports the move as a rename at RENAME_SIMILARITY or above, the
 * old path was on the list at the base, and the old path is gone from the list.
 * The list never grows; any other new entry still fails.
 *
 * In CI (CI set) the base must be readable, or the check fails. Locally a missing
 * base only warns, so the check still runs without a fetch.
 *
 *   node scripts/check-legacy-lists.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.env.LEGACY_BASE || 'origin/main';
const inCi = Boolean(process.env.CI) && !['0', 'false'].includes(process.env.CI.toLowerCase());
// git similarity index (percent) at which a move carries its entry. A pure move is
// 100; 90 leaves room for the import paths a move rewrites inside the file.
const RENAME_SIMILARITY = 90;
const lists = readdirSync('config').filter((name) => name.endsWith('-legacy.json'));
const problems = [];

function baseReadable() {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', `${base}^{commit}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function atBase(path) {
  try {
    return JSON.parse(execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    return null; // the list is new since the base: nothing to compare with
  }
}

// New path -> old path, for every rename between the base and the working tree.
function renamesSinceBase() {
  const output = execFileSync(
    'git',
    ['diff', '--name-status', '-z', `-M${RENAME_SIMILARITY}%`, '-l0', '--diff-filter=R', base, '--'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const fields = output.split('\0');
  const renames = new Map();
  for (let i = 0; i + 2 < fields.length; i += 3) {
    renames.set(fields[i + 2], fields[i + 1]);
  }
  return renames;
}

const compare = baseReadable();
if (!compare) {
  const message = `cannot read the base ref ${base}; fetch it (or set LEGACY_BASE) so the lists can be compared`;
  if (inCi) problems.push(message);
  else console.warn(`warning: ${message}. Skipping the shrink-only comparison.`);
}
const renames = compare ? renamesSinceBase() : new Map();

for (const name of lists) {
  const path = join('config', name);
  const current = JSON.parse(readFileSync(path, 'utf8'));
  // icon-coverage-legacy.json maps screens to gap lists; the others are file arrays.
  const entries = Array.isArray(current) ? current : Object.keys(current);
  if (Array.isArray(current)) {
    for (const file of current) {
      if (!existsSync(file)) problems.push(`${path}: ${file} does not exist; remove it from the list`);
    }
  }
  const previous = compare ? atBase(path) : null;
  if (previous) {
    const before = new Set(Array.isArray(previous) ? previous : Object.keys(previous));
    const now = new Set(entries);
    for (const entry of entries) {
      if (before.has(entry)) continue;
      const from = renames.get(entry);
      if (from && before.has(from) && !now.has(from)) {
        console.log(`${path}: ${from} -> ${entry} (renamed)`);
        continue;
      }
      problems.push(`${path}: ${entry} was added; legacy lists may only shrink`);
    }
  }
  console.log(`${path}: ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
