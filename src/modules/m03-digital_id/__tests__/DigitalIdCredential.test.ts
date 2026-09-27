import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '@/data/http';
import { DigitalIdStore } from '../state/DigitalIdStore';
import { DigitalIdRepository } from '../data/DigitalIdRepository';

vi.mock('@/data/http', () => ({ apiRequest: vi.fn() }));

const mocked = vi.mocked(apiRequest);

const serverProfile = {
  id: 'STU-1',
  fullName: 'A Student',
  rollNumber: 'R-1',
  university: 'Demo University',
  bloodGroup: '',
  isVerifiedStudent: false,
  ageVerified: false,
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  issuedAt: 0,
};

/** The store fetches in its constructor, so let that settle before asserting. */
async function storeAfterFetch(): Promise<DigitalIdStore> {
  const store = new DigitalIdStore();
  await vi.waitFor(() => expect(store.isLoading).toBe(false));
  return store;
}

beforeEach(() => mocked.mockReset());

describe('the repository never substitutes a credential', () => {
  it('propagates a failure instead of returning a verified stranger', async () => {
    // It used to catch and return a hardcoded profile — isVerifiedStudent:
    // true, ageVerified: true, blood group O+ — so going offline issued a
    // campus ID reading VERIFIED CAMPUS MEMBER backed by nothing.
    mocked.mockRejectedValueOnce(new Error('offline'));
    await expect(new DigitalIdRepository().fetchDigitalId()).rejects.toThrow('offline');
  });

  it('propagates a failed QR refresh instead of minting a pass', async () => {
    mocked.mockRejectedValueOnce(new Error('offline'));
    await expect(new DigitalIdRepository().refreshQrToken()).rejects.toThrow('offline');
  });
});

describe('a campus ID that will not load', () => {
  it('leaves the student unverified and says why', async () => {
    mocked.mockRejectedValueOnce(new Error('offline'));
    const store = await storeAfterFetch();
    expect(store.profile).toBeNull();
    expect(store.qrToken).toBe('');
    expect(store.verificationBadgeText).toBe('UNVERIFIED');
    expect(store.errorMessage).toBeTruthy();
  });

  it('shows exactly the verification the server sent, and no more', async () => {
    mocked.mockResolvedValueOnce({ profile: serverProfile, qrToken: 'QR-FROM-SERVER', ttlSeconds: 300 } as never);
    const store = await storeAfterFetch();
    expect(store.profile).toEqual(serverProfile);
    expect(store.verificationBadgeText).toBe('SELF-REPORTED');
    expect(store.qrToken).toBe('QR-FROM-SERVER');
    expect(store.errorMessage).toBeNull();
  });
});

describe('refreshing the pass', () => {
  async function loadedStore(): Promise<DigitalIdStore> {
    mocked.mockResolvedValueOnce({ profile: serverProfile, qrToken: 'OLD', ttlSeconds: 300 } as never);
    return storeAfterFetch();
  }

  it('clears the pass when the refresh fails', async () => {
    const store = await loadedStore();
    mocked.mockRejectedValueOnce(new Error('offline'));
    await store.refreshQrPass();
    expect(store.qrToken).toBe('');
    expect(store.expiresAt).toBe(0);
    expect(store.errorMessage).toBeTruthy();
    expect(store.refreshingQr).toBe(false);
  });

  it('takes the pass the server issued', async () => {
    const store = await loadedStore();
    mocked.mockResolvedValueOnce({ qrToken: 'NEW-FROM-SERVER', ttlSeconds: 300 } as never);
    await store.refreshQrPass();
    expect(store.qrToken).toBe('NEW-FROM-SERVER');
    expect(store.expiresAt).toBeGreaterThan(Date.now());
  });

  it('never produces a device-minted pass on any path', async () => {
    // The old fallbacks were recognisable by this prefix.
    const store = await loadedStore();
    mocked.mockRejectedValueOnce(new Error('offline'));
    await store.refreshQrPass();
    expect(store.qrToken).not.toMatch(/^QR-PASS-/);
  });
});
