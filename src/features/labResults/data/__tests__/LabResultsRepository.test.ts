import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/data/services/http';
import { LabResultsRepository } from '../LabResultsRepository';

afterEach(() => vi.unstubAllGlobals());

function respond(status: number, body: unknown) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const repo = () => new LabResultsRepository();

describe('LabResultsRepository', () => {
  it('reads the list from the clinical endpoint', async () => {
    const fetchMock = respond(200, { reports: [], bodySystems: [], total: 0 });
    expect(await repo().list()).toEqual({ reports: [], bodySystems: [], total: 0 });
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/health\/lab-results$/);
  });

  it('refuses a malformed response instead of showing nothing as if it were empty', async () => {
    respond(200, { reports: null });
    await expect(repo().list()).rejects.toThrow('Invalid');
    respond(200, {});
    await expect(repo().trend('4548-4')).rejects.toThrow('Invalid');
  });

  it('encodes the test key in the trends query', async () => {
    const fetchMock = respond(200, { testKey: 'name:vitamin d', testName: null, items: [], pinned: false, minPointsForLine: 2 });
    await repo().trend('name:vitamin d');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/health/lab-results/trends?test=name%3Avitamin%20d');
  });

  it('confirms with exactly the ticked ids', async () => {
    const fetchMock = respond(200, { documentId: 'd', confirmed: 1, discarded: 2, outsideRange: 0,
      rangeCounts: { IN_RANGE: 1, ABOVE: 0, BELOW: 0, NO_RANGE: 0 }, items: [] });
    await repo().confirm('d/1', ['a']);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain('/health/documents/d%2F1/lab-results/confirm');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ ids: ['a'] });
  });

  it('passes the server refusal through as an ApiError', async () => {
    respond(422, { detail: 'Some values are not part of this report. Nothing was saved.' });
    const error = await repo().confirm('d', ['x']).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).message).toContain('Nothing was saved');
  });

  it('saves bookmarks server-side', async () => {
    const fetchMock = respond(200, { codes: ['4548-4'], max: 8 });
    expect(await repo().setPinned(['4548-4'])).toEqual({ codes: ['4548-4'], max: 8 });
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PUT');
  });
});
