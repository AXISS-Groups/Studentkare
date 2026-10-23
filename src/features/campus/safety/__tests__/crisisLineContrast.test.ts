import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Live-run audit #10: inside the app frame `.wf-application a { color: inherit }`
 * (specificity 0,1,1) beat `.cs-line--first` (0,1,0), so "Call 108" / Tele-MANAS
 * took the dark text colour on the red fill (3.65:1). The crisis lines' colours
 * must come from a rule of at least two classes, from tokens only.
 */
const css = readFileSync(resolve(__dirname, '../campus-safety.css'), 'utf8');
const frame = readFileSync(resolve(__dirname, '../../../../theme/styles/workflows.css'), 'utf8');

describe('crisis call lines keep their contrast inside the app frame', () => {
  it('the frame still resets link colour with one class and an element', () => {
    expect(frame).toMatch(/\.wf-application a\s*\{[^}]*color:\s*inherit/);
  });

  it('the first line is white on the danger fill from a two-class rule', () => {
    expect(css).toMatch(/\.cs-lines \.cs-line--first\s*\{\s*color:\s*var\(--sk-color-on-danger-fill\);\s*\}/);
    expect(css).toMatch(/\.cs-lines \.cs-line\s*\{\s*color:\s*var\(--sk-color-danger\);\s*\}/);
  });
});
