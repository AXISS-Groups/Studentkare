import { describe, expect, it } from 'vitest';
import { REVIEW_ROUTES } from '../reviewRoutes';
import { CLINICIAN_NAV } from '@/design-system/clinician-shell/clinicianNav';

describe('doctor clinical routes (Tier 1, approved 2026-10-21)', () => {
  it('opens the canvas screens in every build', () => {
    expect(REVIEW_ROUTES.criticalResults()).toBe('clinician/critical-results');
    expect(REVIEW_ROUTES.reportReviews()).toBe('clinician/report-reviews');
    expect(REVIEW_ROUTES.encounterNote()).toBe('clinician/encounter-note');
    expect(REVIEW_ROUTES.prescribe()).toBe('clinician/prescribe');
    expect(REVIEW_ROUTES.inbox()).toBe('clinician/inbox');
    expect(REVIEW_ROUTES.consultRoom()).toBe('clinician/consult-room');
  });

  it('points the sidebar at the same screens, with no preview-only route left', () => {
    const items = CLINICIAN_NAV.flatMap((group) => group.items);
    const route = (id: string) => items.find((item) => item.id === id)?.route;
    expect(route('critical-results')).toBe('clinician/critical-results');
    expect(route('report-reviews')).toBe('clinician/report-reviews');
    expect(route('encounter-note')).toBe('clinician/encounter-note');
    expect(items.some((item) => item.previewRoute)).toBe(false);
  });
});
