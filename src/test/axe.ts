import axe from 'axe-core';
import type { AxeResults, Result } from 'axe-core';

/**
 * Runs axe-core on a rendered container (guardrail 7: accessibility is
 * asserted, not assumed). jsdom has no layout or colour, so rules that need
 * them are off here; contrast is covered by the token test, and Storybook's
 * browser run covers the rest.
 */
const JSDOM_UNSUPPORTED = ['color-contrast', 'target-size', 'scrollable-region-focusable'];

export async function axeViolations(container: Element): Promise<Result[]> {
  // axe probes icon fonts through <canvas>; jsdom has none and logs an error per probe.
  if (typeof HTMLCanvasElement !== 'undefined') HTMLCanvasElement.prototype.getContext = () => null;
  const results: AxeResults = await axe.run(container, {
    rules: Object.fromEntries(JSDOM_UNSUPPORTED.map((id) => [id, { enabled: false }])),
  });
  return results.violations;
}

/** A readable one-line-per-problem summary for test failures. */
export function describeViolations(violations: Result[]): string {
  return violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`).join('\n');
}
