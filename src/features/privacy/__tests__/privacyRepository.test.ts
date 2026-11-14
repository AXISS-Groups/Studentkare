import { describe, expect, it, vi } from 'vitest';
vi.mock('@/data/services/http', () => ({ apiRequest: vi.fn() }));
import { apiRequest } from '@/data/services/http';
import { OPTIONAL_PURPOSES, privacyRepository, readConsentOverview } from '../privacyRepository';

const overview = () => ({
  required: null,
  optional: OPTIONAL_PURPOSES.map((purpose) => ({
    purpose, on: false, canGiveHere: false, version: null, givenAt: null, withdrawnAt: null,
  })),
  history: [{ purposes: ['DOCUMENT_AI_ANALYSIS'], version: 'test', givenAt: 1, withdrawnAt: null }],
});

describe('privacy ledger response boundary', () => {
  it('keeps a supported ledger, including historical purposes that are not switches', () => {
    const response = overview();
    expect(readConsentOverview(response)).toBe(response);
  });
  it.each([
    { ...overview(), optional: [{ ...overview().optional[0], purpose: 'DOCUMENT_AI_ANALYSIS' }] },
    { ...overview(), optional: [{ ...overview().optional[0], on: 'false' }] },
    { ...overview(), optional: [{ ...overview().optional[0], givenAt: Number.NaN }] },
    { ...overview(), optional: [overview().optional[0], overview().optional[0]] },
    { ...overview(), required: { purposes: [] } },
    { ...overview(), history: null },
    null,
  ])('rejects unsupported or malformed data without exposing response values', (response) => {
    expect(() => readConsentOverview(response)).toThrow('INVALID_CONSENT_RESPONSE');
  });
  it('validates both initial loads and server-confirmed changes', async () => {
    const invalid = { ...overview(), optional: [{ purpose: 'DOCUMENT_AI_ANALYSIS' }] };
    vi.mocked(apiRequest).mockResolvedValue(invalid);
    await expect(privacyRepository.consents()).rejects.toThrow('INVALID_CONSENT_RESPONSE');
    await expect(privacyRepository.change('AYUSH_HISTORY', false, 'en')).rejects.toThrow('INVALID_CONSENT_RESPONSE');
  });
});
