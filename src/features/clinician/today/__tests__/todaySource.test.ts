import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportsToSignCount } from '../todaySource';

// A plain function, not vi.fn(): a spy also watches a rejected promise and
// reports it as unhandled even though todaySource catches it.
let answer: (path: string) => Promise<unknown> = async () => ({});
const paths: string[] = [];
vi.mock('@/data/services/http', () => ({ apiRequest: (path: string) => { paths.push(path); return answer(path); } }));

describe('todaySource', () => {
  beforeEach(() => { paths.length = 0; });

  it('counts reports to sign from the preventive review queue the server serves', async () => {
    answer = async () => ({ items: [], total: 3 });
    await expect(reportsToSignCount()).resolves.toBe(3);
    expect(paths).toEqual(['/preventive/work/report-reviews?limit=1']);
  });

  it('shows "—" (null) when the queue cannot be read', async () => {
    answer = () => Promise.reject(new Error('down'));
    await expect(reportsToSignCount()).resolves.toBeNull();
  });
});
