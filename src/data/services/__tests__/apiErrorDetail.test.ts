import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from '../http';

afterEach(() => vi.unstubAllGlobals());

describe('apiRequest error detail', () => {
  it('keeps an object detail and uses its message (e.g. a 409 allergy conflict)', async () => {
    const detail = { message: 'This prescription conflicts with an allergy.', conflicts: [{ genericName: 'Amoxicillin', conflicts: [] }] };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ detail }), { status: 409 })));
    const error = await apiRequest('/prescriptions', { method: 'POST', body: '{}' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe(detail.message);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).detail).toEqual(detail);
  });

  it('still reads a plain string detail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ detail: 'Slot not found.' }), { status: 404 })));
    const error = await apiRequest('/x').catch((e: unknown) => e);
    expect((error as ApiError).message).toBe('Slot not found.');
  });
});
