#!/usr/bin/env node
/**
 * Raw colours in stylesheets (AGENTS.md rule 11, DESIGN.md §3). ESLint's
 * no-restricted-syntax hex rule only sees TS/TSX; this is its CSS twin.
 *
 * Flags a hex (#abc, #aabbcc, #aabbccdd), rgb()/rgba() or hsl()/hsla() colour
 * in any declaration of src/**\/*.css. Colours come from tokens instead:
 * var(--sk-color-…), or color-mix() of tokens for a tint.
 *
 * Exempt: the generated token CSS (src/theme/tokens/generated/), which IS the
 * token source, and the files in config/css-colour-legacy.json, which predate
 * the check. The list only shrinks (scripts/check-legacy-lists.mjs); a listed
 * file that is now clean fails here too, so its entry is removed in the same
 * change that cleans it.
 *
 *   node scripts/check-css-colours.mjs            # check
 *   node scripts/check-css-colours.mjs --list     # print every finding, legacy included
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = 'src';
const LEGACY_PATH = 'config/css-colour-legacy.json';
const EXEMPT_DIRS = [join('src', 'theme', 'tokens', 'generated')];

const COLOUR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\([^)]*\)/g;

function cssFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return EXEMPT_DIRS.includes(path) ? [] : cssFiles(path);
    return name.endsWith('.css') ? [path] : [];
  });
}

/** Line-numbered raw colours found in declaration values (selectors such as `#root` are ignored). */
export function findColours(css) {
  const findings = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
  // A declaration is `property: value` ending at ; or } — selectors end at {.
  const declaration = /([-\w]+)\s*:([^;{}]*)(?=[;}])/g;
  for (let match = declaration.exec(text); match; match = declaration.exec(text)) {
    const [, property, value] = match;
    const found = value.replace(/url\([^)]*\)/g, '').match(COLOUR);
    if (!found) continue;
    const line = text.slice(0, match.index).split('\n').length;
    findings.push({ line, property, colours: found });
  }
  return findings;
}

const posix = (path) => path.split(sep).join('/');

function main() {
  const listAll = process.argv.includes('--list');
  const legacy = new Set(JSON.parse(readFileSync(LEGACY_PATH, 'utf8')));
  const problems = [];
  let legacyFindings = 0;
  for (const file of cssFiles(ROOT).map(posix).sort()) {
    const findings = findColours(readFileSync(file, 'utf8'));
    if (legacy.has(file)) {
      legacyFindings += findings.length;
      if (findings.length === 0) problems.push(`${file}: no raw colours left; remove it from ${LEGACY_PATH}`);
      if (!listAll) continue;
    }
    for (const { line, property, colours } of findings) {
      const message = `${file}:${line} ${property}: raw colour ${colours.join(', ')}; use a design token (var(--sk-color-…)). See DESIGN.md §3.`;
      if (legacy.has(file)) console.log(`legacy ${message}`);
      else problems.push(message);
    }
  }
  console.log(`${LEGACY_PATH}: ${legacy.size} legacy files, ${legacyFindings} raw colours left in them`);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exitCode = 1; // not process.exit(): that can cut off piped output
  }
}

if (posix(relative(process.cwd(), process.argv[1] ?? '')) === 'scripts/check-css-colours.mjs') main();
