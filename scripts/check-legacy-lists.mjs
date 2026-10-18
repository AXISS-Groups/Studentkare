#!/usr/bin/env node
/**
 * Lint ratchets only shrink (audit TD-23). Every config/*-legacy.json list must
 * name only files that exist, and must not gain entries compared with the base
 * branch (default origin/main; override with LEGACY_BASE=<ref>).
 *
 *   node scripts/check-legacy-lists.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.env.LEGACY_BASE || 'origin/main';
const lists = readdirSync('config').filter((name) => name.endsWith('-legacy.json'));
const problems = [];

function atBase(path) {
  try {
    return JSON.parse(execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    return null; // new list, or base not fetched: nothing to compare with
  }
}

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
  const previous = atBase(path);
  if (previous) {
    const before = new Set(Array.isArray(previous) ? previous : Object.keys(previous));
    for (const entry of entries) {
      if (!before.has(entry)) problems.push(`${path}: ${entry} was added; legacy lists may only shrink`);
    }
  }
  console.log(`${path}: ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
