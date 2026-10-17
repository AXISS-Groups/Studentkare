import { describe, expect, it, vi } from 'vitest';

describe('review-pending routes', () => {
  it('keeps production on the live screen (or nothing) until sign-off', async () => {
    vi.resetModules();
    vi.doMock('@/core/env', () => ({ isDev: () => true, demoDataEnabled: () => false }));
    const { REVIEW_ROUTES } = await import('../reviewRoutes');
    expect(REVIEW_ROUTES.criticalResults()).toBe('clinical-review');
    expect(REVIEW_ROUTES.reportReviews()).toBe('report-reviews');
    expect(REVIEW_ROUTES.encounterNote()).toBe('clinical-notes');
    // Built from the design and live, empty until connected (Prescribe read-only, Tier 1).
    expect(REVIEW_ROUTES.prescribe()).toBe('clinician/prescribe');
    expect(REVIEW_ROUTES.inbox()).toBe('clinician/inbox');
    expect(REVIEW_ROUTES.consultRoom()).toBe('clinician/consult-room');
    vi.doUnmock('@/core/env');
  });

  it('opens the preview screens in demo mode', async () => {
    vi.resetModules();
    vi.doMock('@/core/env', () => ({ isDev: () => true, demoDataEnabled: () => true }));
    const { REVIEW_ROUTES } = await import('../reviewRoutes');
    expect(REVIEW_ROUTES.criticalResults()).toBe('clinician/critical-results');
    expect(REVIEW_ROUTES.prescribe()).toBe('clinician/prescribe');
    vi.doUnmock('@/core/env');
  });
});
