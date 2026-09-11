/**
 * Wellbeing behaviour tests (safety-critical logic):
 * - Risk signals route to support and suppress numeric surfaces.
 * - Pre-participation screening blocks structured content on any positive.
 * - Content fails closed (unapproved content never renders).
 * - Value restatement never diagnoses or predicts.
 * - Suggestions are contextual-only.
 */
import { describe, expect, it } from 'vitest';
import { detectRiskSignals, shouldSuppressNumericSurfaces, getSupportRouting } from '../riskSignals';
import { evaluateScreening } from '../screening';
import { getRenderableContent, getApprovedContent } from '../contentRegistry';
import { generateContextualSuggestions, takeTopSuggestion } from '../suggestions';
import type { SuggestionContext } from '../types';

describe('risk signals', () => {
  it('detects restriction/compensatory/weight-query language', () => {
    const signals = detectRiskSignals('I have been skipping meals and I want to lose 5 kg fast');
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.some((s) => s.kind === 'RESTRICTION')).toBe(true);
    expect(signals.some((s) => s.kind === 'WEIGHT_QUERY')).toBe(true);
  });

  it('suppresses numeric surfaces and routes to support when signals exist', () => {
    const signals = detectRiskSignals('I am purging after eating and working out twice a day');
    expect(shouldSuppressNumericSurfaces(signals)).toBe(true);
    const route = getSupportRouting(signals);
    expect(route.teleManas).toContain('14416');
  });

  it('returns clear when there is no risk signal', () => {
    const signals = detectRiskSignals('I would like to know about campus gym hours');
    expect(signals).toHaveLength(0);
    expect(shouldSuppressNumericSurfaces(signals)).toBe(false);
  });
});

describe('pre-participation screening', () => {
  it('blocks structured content on any positive answer', () => {
    const result = evaluateScreening({ q2: true });
    expect(result.anyPositive).toBe(true);
    expect(result.blocksStructuredContent).toBe(true);
    expect(result.sensitive).toBe(true);
  });

  it('allows structured content when all answers are negative', () => {
    const result = evaluateScreening({});
    expect(result.anyPositive).toBe(false);
    expect(result.blocksStructuredContent).toBe(false);
  });
});

describe('content registry fails closed', () => {
  it('renders only advisor-approved content', () => {
    const renderable = getRenderableContent();
    expect(renderable.length).toBeGreaterThan(0);
    expect(renderable.every((c) => c.advisorApproved)).toBe(true);
  });

  it('unapproved content never renders', () => {
    expect(getApprovedContent('act-unapproved')).toBeNull();
  });
});

describe('value restatement', () => {
  it('states value + range + meaning, never a diagnosis', async () => {
    const { restateValue } = await import('../insights');
    const record = {
      id: 'r', title: 't', category: 'LAB' as const, date: '2026-08-14',
      facilityName: 'Dr. Lal PathLabs', sourceType: 'SCAN' as const,
      confidenceGatePassed: true, humanReviewRequired: false, isCachedOffline: false,
      syncStatus: 'SYNCED' as const, observations: [],
    };
    const obs = {
      id: 'o', code: '718-7', display: 'Hemoglobin', value: 14.2, unit: 'g/dL',
      referenceRange: '13.0 - 17.0', isAbnormal: false, confidenceScore: 99,
    };
    const v = restateValue(obs, record);
    expect(v.display).toBe('Hemoglobin');
    expect(v.outsideTypicalRange).toBe(false);
    expect(v.plainLanguage).toContain('oxygen');
    // Must never claim a diagnosis or prediction.
    expect(v.plainLanguage.toLowerCase()).not.toContain('anaemic');
    expect(v.plainLanguage.toLowerCase()).not.toContain('will');
  });
});

describe('contextual suggestions', () => {
  it('generates suggestions from campus/calendar/season only', () => {
    const ctx: SuggestionContext = {
      campusName: 'IIT Hyderabad', region: 'Telangana', month: 8,
      isExamWeek: true, campDaySoon: true, monsoonSeason: true, summerHeat: false,
      clearanceExpiring: false, immunisationDue: false, campOverdue: false,
      aggregateGiReports: false,
    };
    const suggestions = generateContextualSuggestions(ctx);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((s) => s.advisorApproved)).toBe(true);
    expect(takeTopSuggestion(suggestions)).not.toBeNull();
  });

  it('is empty when there is no contextual trigger', () => {
    const ctx: SuggestionContext = {
      campusName: 'X', region: 'Y', month: 1,
      isExamWeek: false, campDaySoon: false, monsoonSeason: false, summerHeat: false,
      clearanceExpiring: false, immunisationDue: false, campOverdue: false,
      aggregateGiReports: false,
    };
    expect(generateContextualSuggestions(ctx)).toHaveLength(0);
  });
});
