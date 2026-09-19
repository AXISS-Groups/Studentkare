/**
 * Accessibility regression guard (source-level).
 * Enforces the shared focus-visible rule and flags genuinely unnamed
 * single-line icon-only buttons. The authoritative live check for accessible
 * names runs in the browser E2E suite (buttons with no accessible name = 0).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../..');

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d)) {
      const full = path.join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith('.tsx')) out.push(full);
    }
  };
  walk(path.join(ROOT, dir));
  return out;
}

describe('T-A11y Accessibility Conventions', () => {
  it('provides a visible focus-visible outline in the shared theme', () => {
    const themePath = existsSync(path.join(ROOT, 'src/theme/styles/indigo.css'))
      ? path.join(ROOT, 'src/theme/styles/indigo.css')
      : path.join(ROOT, 'src/theme/indigo.css');
    const theme = readFileSync(themePath, 'utf8');
    expect(theme).toContain(':focus-visible');
    expect(theme).toContain('outline');
    expect(theme).toContain('outline-offset');
  });

  it('marks single-line icon-only buttons with an accessible name', () => {
    const offenders: string[] = [];
    const files = collectFiles('src/components').concat(collectFiles('src/screens'));
    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, idx) => {
        // A button that opens and closes on ONE line, contains an icon, and has
        // no aria-label/aria-labelledby/title/visible text.
        const singleLineButton = /<button[^>]*>.*<\/button>/.test(line.trim());
        const hasIcon = /<[A-Z][A-Za-z]+ size/.test(line);
        const hasName = /aria-label|aria-labelledby|title=|aria-label=/.test(line);
        // Any alphabetic text between the tags (excluding the icon element) means
        // the button has a visible accessible name.
        const inner = line.match(/<button[^>]*>(.*)<\/button>/s)?.[1] || '';
        const innerWithoutIcon = inner.replace(/<[^>]+>/g, '');
        const hasText = /[A-Za-z]/.test(innerWithoutIcon);
        if (singleLineButton && hasIcon && !hasName && !hasText) {
          offenders.push(`${path.relative(ROOT, file)}:${idx + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});
