// Sorted one-per-line lists ("registries") that parallel branches all add to.
//
// A list is the lines between a `// keep-sorted start` and a `// keep-sorted end` comment. Each line
// is one entry; entries are sorted by plain code-point order of the trimmed line and appear once.
// src/lib/__tests__/registryLists.test.ts checks every list in src/; `npm run merge:resolve` sorts
// them again after a merge (git's union driver appends both sides' lines, so a merged list can come
// out unsorted).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const START = 'keep-sorted start';
export const END = 'keep-sorted end';

const isMarker = (line, word) => new RegExp(`^\\s*//\\s*${word}\\s*$`).test(line);

/** Code-point order of the trimmed line (stable across machines, unlike localeCompare). */
export function compareEntries(a, b) {
  const x = a.trim();
  const y = b.trim();
  return x < y ? -1 : x > y ? 1 : 0;
}

/** The lists in a file: [{ start, end, lines }] with start/end the marker line indexes. */
export function findBlocks(text) {
  const lines = text.split('\n');
  const blocks = [];
  let open = -1;
  lines.forEach((line, i) => {
    if (isMarker(line, START)) {
      if (open >= 0) throw new Error(`line ${i + 1}: "${START}" inside another list (opened on line ${open + 1})`);
      open = i;
    } else if (isMarker(line, END)) {
      if (open < 0) throw new Error(`line ${i + 1}: "${END}" without a start`);
      blocks.push({ start: open, end: i, lines: lines.slice(open + 1, i) });
      open = -1;
    }
  });
  if (open >= 0) throw new Error(`line ${open + 1}: "${START}" is never closed`);
  return blocks;
}

/** What is wrong with one list (empty when it is fine). */
export function blockProblems(lines) {
  const problems = [];
  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t) problems.push(`entry ${i + 1} is a blank line`);
    else if (t.startsWith('//')) problems.push(`entry ${i + 1} is a comment line: put the comment at the end of its entry`);
    // Two entries on one line: 'a', 'b',  ...a, ...b,
    else if (/'\s*,\s*'/.test(t) || /,\s*\.\.\./.test(t)) problems.push(`entry ${i + 1} holds more than one entry: ${t}`);
  });
  for (let i = 1; i < lines.length; i++) {
    const c = compareEntries(lines[i - 1], lines[i]);
    if (c === 0) problems.push(`duplicate entry: ${lines[i].trim()}`);
    else if (c > 0) problems.push(`not sorted: "${lines[i].trim()}" belongs before "${lines[i - 1].trim()}"`);
  }
  return problems;
}

/** The text with every list sorted and exact duplicates dropped. */
export function sortBlocks(text) {
  const lines = text.split('\n');
  for (const block of findBlocks(text).reverse()) {
    const seen = new Set();
    const sorted = [...block.lines].sort(compareEntries).filter((line) => {
      const key = line.trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    lines.splice(block.start + 1, block.lines.length, ...sorted);
  }
  return lines.join('\n');
}

/** Tracked files under src/ that hold a list. */
export function filesWithLists(cwd = process.cwd()) {
  try {
    const out = execFileSync('git', ['grep', '-l', '-F', START, '--', 'src'], { cwd, encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch {
    return []; // git grep exits 1 when nothing matches
  }
}

export const readText = (path) => readFileSync(path, 'utf8');
