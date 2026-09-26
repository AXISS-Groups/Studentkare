import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LifeShareStore } from '@/features/care/store/LifeShareStore';
import { getCompatibleDonorTypes, BLOOD_COMPATIBILITY_MAP } from '@/data/lifeshareData';

/**
 * `/lifeshare` is a public route. It presented invented ICU bed counts,
 * ventilator counts, oxygen reserves and blood unit stock against five named
 * real hospitals, and told students a transfer request had notified a hospital
 * network that was never contacted.
 *
 * Two of the tests this file used to carry asserted that fabrication: one
 * expected a pincode search to return a hospital, the other expected a request
 * to land in the store. Both passed, and both pinned a screen that could have
 * sent someone to the wrong hospital. They are replaced below.
 */
function codeOf(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const SCREEN = codeOf('src/screens/emergency/LifeShareExchangeScreen.tsx');
const DATASET = codeOf('src/data/datasets/lifeshareData.ts');
const STORE = codeOf('src/features/care/store/LifeShareStore.tsx');

describe('transfusion compatibility — real medicine, kept', () => {
  it('resolves the universal donor', () => {
    expect(getCompatibleDonorTypes('O-')).toEqual(['O-']);
  });

  it('resolves the universal recipient', () => {
    expect(getCompatibleDonorTypes('AB+')).toHaveLength(8);
  });

  it('resolves a recipient of A+', () => {
    const donors = getCompatibleDonorTypes('A+');
    expect(donors).toContain('A+');
    expect(donors).toContain('O-');
    expect(donors).not.toContain('B+');
  });

  it('never lets an RhD-negative recipient receive positive red cells', () => {
    // If this map is ever edited, this is the error that matters most.
    for (const recipient of ['A-', 'B-', 'AB-', 'O-']) {
      for (const donor of BLOOD_COMPATIBILITY_MAP[recipient]) {
        expect(donor.endsWith('-')).toBe(true);
      }
    }
  });

  it('lets every recipient receive from its own group', () => {
    for (const [recipient, donors] of Object.entries(BLOOD_COMPATIBILITY_MAP)) {
      expect(donors).toContain(recipient);
    }
  });
});

describe('no hospital availability is invented', () => {
  it('ships no seeded hospitals', () => {
    expect(DATASET).not.toMatch(/INITIAL_HOSPITAL_NODES|INITIAL_TRANSFER_REQUESTS/);
  });

  it('names no real hospital', () => {
    // The store too: a vacuity check that seeded one hospital there slipped
    // past this assertion when it only covered the dataset and the screen.
    for (const source of [DATASET, SCREEN, STORE]) {
      expect(source).not.toMatch(/Yashoda|Apollo|Kamineni/i);
    }
  });

  it('opens with nothing to report rather than with stock', () => {
    const store = new LifeShareStore();
    expect(store.hospitals).toEqual([]);
    expect(store.transferRequests).toEqual([]);
  });

  it('finds nothing to search, so it cannot answer a pincode with a guess', () => {
    const store = new LifeShareStore();
    expect(store.searchHospitals('502285', 'O-')).toEqual([]);
  });

  it('asserts no NABH verification', () => {
    // Guardrail 6: compliance states are computed from evidence or they do not
    // exist. `isVerifiedNABH: true` on a seeded row is neither.
    expect(DATASET).not.toMatch(/isVerifiedNABH:\s*true/);
    expect(SCREEN).not.toMatch(/NABH VERIFIED|100% NABH/);
  });

  it('claims no network size or rating', () => {
    expect(SCREEN).not.toMatch(/30,273|2,947|4\.92|CONNECTED HOSPITALS|Synergy/i);
  });

  it('says plainly that availability is not connected', () => {
    expect(SCREEN).toMatch(/not connected/i);
  });
});

describe('no transfer request pretends to have been sent', () => {
  it('the store can no longer mint one', () => {
    expect(STORE).not.toMatch(/submitTransferRequest/);
    expect(new LifeShareStore()).not.toHaveProperty('submitTransferRequest');
  });

  it('the screen claims no dispatch and no notification', () => {
    expect(SCREEN).not.toMatch(
      /Hospital network notified|dispatched to|Submit & Dispatch|Ready for dispatch/i,
    );
  });
});

describe('it points at numbers that do answer', () => {
  it('offers 112 and an ambulance', () => {
    expect(SCREEN).toMatch(/tel:112/);
    expect(SCREEN).toMatch(/tel:108/);
  });
});
