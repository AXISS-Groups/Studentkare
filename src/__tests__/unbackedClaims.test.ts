import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guardrail 6: no compliance or security claim the system cannot prove.
 * Health records are not encrypted at rest (see PricingScreen), and there is no
 * live video service, so these rendered screens must not say otherwise.
 */
const RENDERED = [
  'src/features/teleconsult/views/TeleconsultNativeView.tsx',
  'src/features/landing/views/LandingPlansNativeView.tsx',
  'src/features/auth/views/IdentityVerifyPanel.tsx',
  'src/features/digital_id/views/WebPass.tsx',
];

describe('unbacked security claims', () => {
  it.each(RENDERED)('%s makes no encryption claim', (file) => {
    expect(readFileSync(resolve(process.cwd(), file), 'utf8')).not.toMatch(/encrypt/i);
  });

  it.each([
    'src/components/clinical/BodyMetricsCalculator.tsx',
    'src/screens/institution/StudentRosterScreen.tsx',
    'src/screens/clinician/NMCDoctorEPrescriptionScreen.tsx',
  ])('%s asserts no compliance state (guardrail 6)', (file) => {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    expect(source).not.toMatch(/compliant/i);
    expect(source).not.toMatch(/digitally signed/i);
  });

  it('the support screen promises no points (no rewards backend exists)', () => {
    expect(readFileSync(resolve(process.cwd(), 'src/screens/workspace/MemberPanels.tsx'), 'utf8')).not.toMatch(/Care Points|🎉/);
  });
});
