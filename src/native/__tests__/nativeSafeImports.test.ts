import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('code the native app renders', () => {
  it.each(['src/components/clinical/ComprehensiveHealthCalculators.tsx', 'src/components/clinical/BodyMetricsCalculator.tsx'])(
    '%s takes icons from the platform-split module, not lucide-react (DOM svg crashes on device)',
    (file) => expect(read(file)).not.toMatch(/from 'lucide-react'/),
  );

  it('the native icon module does not import lucide-react', () => {
    expect(read('src/components/clinical/calculatorIcons.ts')).not.toMatch(/from 'lucide-react'/);
  });

  it.each(['src/features/landing/views/LandingLabTestsNativeView.tsx', 'src/features/landing/views/LandingConsultNativeView.tsx'])(
    '%s uses bundled images, not browser-relative URIs',
    (file) => expect(read(file)).not.toMatch(/uri:\s*'\//),
  );
});

describe('touch targets (guardrail 7)', () => {
  it.each([
    ['src/theme/styles/workflows.css', /\.wf-modal-close \{[^}]*width: 32px/],
    ['src/theme/styles/indigo.css', /\.shop-quantity button \{[^}]*min-height: 36px/],
    ['src/theme/styles/indigo.css', /\.wf-promo-controls button \{[^}]*width: 28px/],
  ])('%s has no undersized control matching %s', (file, pattern) => {
    expect(read(file)).not.toMatch(pattern);
  });
});
