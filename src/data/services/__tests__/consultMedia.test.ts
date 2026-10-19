import { afterEach, describe, expect, it, vi } from 'vitest';
import * as http from '../http';
import { parseMediaGrant, requestMediaToken } from '../consultMedia';

vi.mock('../http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../http')>();
  return { ...actual, apiRequest: vi.fn() };
});
const mocked = vi.mocked(http.apiRequest);
afterEach(() => { mocked.mockReset(); });

const grant = { available: true, url: 'wss://lk.example.test', token: 't', room: 'sk-consult-a1', identity: 'acc1', expiresAt: 1 };

describe('consult media token', () => {
  it('accepts only a complete grant with a websocket/https url', () => {
    expect(parseMediaGrant(grant)).toEqual({ url: grant.url, token: 't', room: 'sk-consult-a1', identity: 'acc1', expiresAt: 1 });
    expect(parseMediaGrant({ ...grant, available: false })).toBeNull();
    expect(parseMediaGrant({ ...grant, token: '' })).toBeNull();
    expect(parseMediaGrant({ ...grant, url: 'javascript:alert(1)' })).toBeNull();
    expect(parseMediaGrant({ ...grant, expiresAt: '1' })).toBeNull();
    expect(parseMediaGrant(null)).toBeNull();
  });

  it('maps the server answers, failing closed on anything unexpected', async () => {
    mocked.mockResolvedValueOnce(grant);
    expect((await requestMediaToken('a1')).kind).toBe('granted');
    expect(mocked).toHaveBeenCalledWith('/consultation/a1/media-token', { method: 'POST' });

    mocked.mockResolvedValueOnce({ available: true });
    expect((await requestMediaToken('a1')).kind).toBe('error');

    mocked.mockRejectedValueOnce(new http.ApiError('off', 503, { code: 'MEDIA_UNAVAILABLE', message: 'off' }));
    expect(await requestMediaToken('a1')).toEqual({ kind: 'unavailable' });

    mocked.mockRejectedValueOnce(new http.ApiError('Not yet', 409, { code: 'OUTSIDE_WINDOW', message: 'Not yet' }));
    expect(await requestMediaToken('a1')).toEqual({ kind: 'refused', code: 'OUTSIDE_WINDOW', message: 'Not yet' });

    mocked.mockRejectedValueOnce(new http.ApiError('Appointment not found.', 404));
    expect((await requestMediaToken('a1')).kind).toBe('refused');

    mocked.mockRejectedValueOnce(new http.ApiError('busy', 503, null));
    expect((await requestMediaToken('a1')).kind).toBe('error');
  });
});
