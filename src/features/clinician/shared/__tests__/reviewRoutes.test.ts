import { describe, expect, it, vi } from 'vitest';

describe('review-pending routes', () => {
  it('keeps production on the live screen (or nothing) until sign-off', async () => {
    vi.resetModules();
    vi.doMock('@/core/env', () => ({ isDev: () => false }));
    const { REVIEW_ROUTES } = await import('../reviewRoutes');
    expect(REVIEW_ROUTES.criticalResults()).toBe('clinical-review');
    expect(REVIEW_ROUTES.reportReviews()).toBe('report-reviews');
    expect(REVIEW_ROUTES.encounterNote()).toBe('clinical-notes');
    expect(REVIEW_ROUTES.prescribe()).toBeNull();
    expect(REVIEW_ROUTES.inbox()).toBeNull();
    expect(REVIEW_ROUTES.consultRoom()).toBeNull();
    vi.doUnmock('@/core/env');
  });

  it('opens the preview screens in development', async () => {
    vi.resetModules();
    vi.doMock('@/core/env', () => ({ isDev: () => true }));
    const { REVIEW_ROUTES } = await import('../reviewRoutes');
    expect(REVIEW_ROUTES.criticalResults()).toBe('clinician/critical-results');
    expect(REVIEW_ROUTES.prescribe()).toBe('clinician/prescribe');
    vi.doUnmock('@/core/env');
  });
});
