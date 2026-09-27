import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The medical incident screen is live, and it is the one surface a student in
 * trouble fills in believing somebody will read it.
 *
 * `MedicalIncidentStore.reportIncident` appends to an in-memory array. Nothing
 * is transmitted, and no incident endpoint exists in the backend. The screen
 * nevertheless said the report was "dispatched to Chief Medical Officer
 * (MEO)", and filled the blood group and allergies it did not have with 'O+'
 * and ['Sulfa'].
 *
 * These assert the source directly. The screen is React Native primitives
 * rendered through react-native-web and reaches MobX stores through a provider
 * chain, so a render test here would assert the harness more than the screen —
 * whereas the exact strings are the defect.
 */
/** Comments name the old values on purpose; only the code is asserted. */
function codeOf(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const SOURCE = codeOf('src/screens/medical/MedicalIncidentScreen.tsx');
const STORE = codeOf('src/features/care/store/MedicalIncidentStore.tsx');

describe('it does not invent what a responder would act on', () => {
  it('substitutes no blood group', () => {
    expect(SOURCE).not.toMatch(/bloodGroup:\s*student\.bloodGroup\s*\|\|\s*'O\+'/);
    expect(SOURCE).toMatch(/bloodGroup:\s*student\.bloodGroup\s*\|\|\s*''/);
  });

  it('substitutes no allergy', () => {
    expect(SOURCE).not.toMatch(/allergies:.*\['Sulfa'\]/);
    expect(SOURCE).toMatch(/allergies:\s*student\.allergies\s*\?\?\s*\[\]/);
  });

  it('substitutes no address', () => {
    expect(SOURCE).not.toMatch(/502285/);
  });

  it('reaches past no types to do it', () => {
    // The fabricated pincode was only possible through `student as any`.
    expect(SOURCE).not.toMatch(/student as any/);
  });
});

describe('it does not claim a dispatch that never happens', () => {
  it('the store still transmits nothing, so the claim must stay gone', () => {
    // If this ever fails, an incident service arrived and the copy below
    // should be revisited rather than this test deleted.
    expect(STORE).not.toMatch(/apiRequest|fetch\(/);
  });

  it('says it was saved on the device, not dispatched to anyone', () => {
    expect(SOURCE).not.toMatch(/dispatched to Chief Medical Officer|dispatched to/i);
    expect(SOURCE).toMatch(/Saved on this device/);
    expect(SOURCE).toMatch(/has not been sent/);
  });

  it('points somewhere that does work, for anything urgent', () => {
    expect(SOURCE).toMatch(/call 112|crisis bar/i);
  });
});

describe('the crisis path does reach somebody', () => {
  it('signals the crisis kind to the follow-up queue', () => {
    expect(SOURCE).toMatch(/\/care\/crisis-signal/);
    expect(SOURCE).toMatch(/kind: crisisCheck\.kind/);
  });

  it('never sends what the student wrote', () => {
    // /care/crisis-signal records the kind only, by design. The description is
    // the student's own words about a crisis and must not leave the device.
    const call = SOURCE.slice(SOURCE.indexOf('/care/crisis-signal'));
    const body = call.slice(0, call.indexOf('})'));
    expect(body).not.toMatch(/description|title|message/);
  });
});
