import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => true,
}));

import { StyleSheet, Text } from 'react-native';
import { LanguageProvider, translate } from '@/i18n';
import { font } from '@/design-system/theme';
import { M2SosProvider } from '@/design-system/m2';
import { fakeRequest } from '@/features/phoneKit/__tests__/fixtures';
import { list, value } from '@/features/labResults/viewmodel/__tests__/labFixtures';
import { axeViolations, describeViolations } from '@/test/axe';
import { InsightsViewModel } from '../viewmodel/InsightsViewModel';
import type { LabOrder } from '../viewmodel/InsightsViewModel';
import { pickReport, releasedReports } from '../viewmodel/releasedReports';
import { M2InsightsView } from '../views/M2InsightsView';
import type { M2InsightsLinks } from '../views/M2InsightsView';

/**
 * My health laid out wide (Tier 1 parity plan 2026-10-24 §1–3): one view at
 * both widths, SOS only from the shell, and the "Reviewed lab reports" card.
 */
const en = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) => translate('en', key, vars);
const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const probe = StyleSheet.create({ mono: { fontFamily: font.family.mono } });

const ORDER: LabOrder = { id: 'o1', status: 'BOOKED', testPanel: ['Vitamin D'], orderedByDoctor: 'Dr. S. Kumar', collectedAt: null, slotStart: null, createdAt: 1782000000 };
const RELEASED: LabOrder = {
  ...ORDER, id: 'r-new', status: 'REPORT_RELEASED', testPanel: ['Thyroid profile'], reportDocumentId: 'doc-9', reviewNote: 'TSH is a little high. Retest in 6 weeks.',
  reviewedByDoctor: 'Dr. A. Rao', reviewedAt: 1782100000, collectedAt: 1781900000,
};

function routes(over: Record<string, unknown> = {}) {
  return {
    '/health/lab-results': { ...list([value({ testName: 'HbA1c', rangeState: 'ABOVE' }), value({ testName: 'LDL', rangeState: 'IN_RANGE', bodySystem: 'HEART_BLOOD' })]),
      bodySystems: [{ bodySystem: 'HEART_BLOOD', tests: 2, outsideRange: 1, noRange: 0 }] },
    '/appointments': { items: [] },
    '/health/documents': { items: [], total: 4, categoryCounts: {} },
    '/records/shares': { items: [] },
    '/preventive/report-reviews': { items: [], total: 0 },
    '/refills/plans': { items: [] },
    '/lab-orders': { items: [ORDER, { ...RELEASED, id: 'r-old', reviewedAt: 1781000000, reviewNote: 'Older note.' }, RELEASED, { ...RELEASED, id: 'no-doc', reportDocumentId: '' }], total: 4 },
    '/meds/today': { date: '2026-10-21', timezone: 'Asia/Kolkata', plans: [] },
    '/wellness/water/today': { date: '2026-10-21', timezone: 'Asia/Kolkata', consumedMl: 0, goalMl: 2000, goalSource: 'DEFAULT', percent: 0, entries: [] },
    '/wellness/water/goal': { goalMl: 2000, goalSource: 'DEFAULT', minMl: 500, maxMl: 6000 },
    ...over,
  };
}

function links(): M2InsightsLinks {
  return {
    trends: vi.fn(), records: vi.fn(), reportUpload: vi.fn(), medicines: vi.fn(), water: vi.fn(), refill: vi.fn(), collection: vi.fn(),
    addVaccineCard: vi.fn(), appointments: vi.fn(), allReports: vi.fn(), downloadReport: vi.fn(),
  };
}

function loaded(over: Record<string, unknown> = {}) {
  const { request, calls } = fakeRequest(routes(over));
  const vm = new InsightsViewModel(request);
  vm.load();
  return { vm, calls };
}

describe('My health SOS (parity plan §1)', () => {
  it('phone: one SOS, bound to the shell (the frame’s helplines dialog / the app’s Emergency screen)', () => {
    const sos = vi.fn();
    wrap(<M2SosProvider value={sos}><M2InsightsView vm={loaded().vm} name="Asha Rao" links={links()} /></M2SosProvider>);
    const buttons = screen.getAllByRole('button', { name: en('m2.sosSpoken') });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0] as HTMLElement);
    expect(sos).toHaveBeenCalledTimes(1);
  });

  it('desktop: no second SOS (the shell’s top bar has it), in every state', async () => {
    const { vm } = loaded({ '/health/lab-results': new Error('down') });
    wrap(<M2InsightsView vm={vm} name="Asha Rao" links={links()} wide />);
    await waitFor(() => expect(vm.values.phase).toBe('error'));
    expect(screen.queryByTestId('m2-ins-sos')).toBeNull();
    expect(screen.queryByRole('button', { name: en('m2.sosSpoken') })).toBeNull();
  });
});

describe('My health wide (parity plan §2)', () => {
  it('draws the same view at both layouts; desktop puts the four hero counts in one row', async () => {
    const phone = wrap(<M2InsightsView vm={loaded().vm} name="Asha Rao" links={links()} />);
    const phoneStats = await screen.findByTestId('m2-ins-stats');
    expect(phoneStats.children).toHaveLength(2);
    expect(screen.queryByTestId('m2-ins-row-report')).toBeNull();
    phone.unmount();

    const { container } = wrap(<M2InsightsView vm={loaded().vm} name="Asha Rao" links={links()} wide />);
    const stats = await screen.findByTestId('m2-ins-stats');
    expect(stats.children).toHaveLength(4);
    ['todo', 'consult', 'docs', 'shared'].forEach((id) => expect(within(stats).getByTestId(`m2-ins-stat-${id}`)).toBeInTheDocument());
    expect(await screen.findByTestId('m2-ins-row-report')).toContainElement(screen.getByTestId('m2-ins-report'));
    expect(screen.getByTestId('m2-ins-row-due')).toContainElement(screen.getByTestId('m2-ins-refills'));
    expect(screen.getByTestId('m2-ins-row-more')).toContainElement(screen.getByTestId('m2-ins-vaccines'));
    expect(await screen.findByTestId('m2-ins-system-HEART_BLOOD')).toBeInTheDocument();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('one card failing does not hide the others at the desktop layout', async () => {
    const { vm } = loaded({ '/refills/plans': new Error('down'), '/health/lab-results': new Error('down') });
    wrap(<M2InsightsView vm={vm} name="Asha Rao" links={links()} wide />);
    expect(await screen.findByTestId('m2-ins-refills-error')).toBeInTheDocument();
    expect(await screen.findByTestId('m2-ins-values-retry')).toBeInTheDocument();
    expect(await screen.findByTestId('m2-ins-ordered')).toHaveTextContent('Vitamin D');
    expect(screen.getByTestId('m2-ins-vaccines')).toBeInTheDocument();
    expect(screen.getByTestId('m2-ins-stat-todo')).toHaveTextContent('–');
  });

  it.each([false, true])('values keep the clinical mono chip and amber outside range, and no route carries a value (wide=%s)', async (wide) => {
    const l = links();
    wrap(<M2InsightsView vm={loaded().vm} name="Asha Rao" links={l} wide={wide} />);
    const rows = within(await screen.findByTestId('m2-ins-values'));
    const above = rows.getByRole('link', { name: /^HbA1c/ });
    const chipOf = (link: HTMLElement) => link.querySelector('[data-testid^="m2-ins-value-chip-"]') as HTMLElement;
    const style = window.getComputedStyle(chipOf(above));
    // react-native-web turns fontFamily into a class: the chip carries the mono family's class.
    render(<Text testID="mono-probe" style={probe.mono}>0</Text>);
    const monoClass = screen.getByTestId('mono-probe').className.split(' ').find((c) => c.startsWith('r-fontFamily-'));
    expect(monoClass).toBeTruthy();
    expect(chipOf(above).className.split(' ')).toContain(monoClass);
    expect(style.color).toMatch(/attention/);
    expect(window.getComputedStyle(chipOf(rows.getByRole('link', { name: /^LDL/ }))).color).toMatch(/positive/);
    fireEvent.click(above);
    expect((l.trends as unknown as { mock: { calls: unknown[][] } }).mock.calls.flat().every((a) => typeof a !== 'string' && typeof a !== 'number')).toBe(true);
  });
});

describe('Reviewed lab reports card (parity plan §3, Q3)', () => {
  it('reuses the Report insights pick rule and counts only released reports with a document', () => {
    const items = routes()['/lab-orders'].items as LabOrder[];
    expect(pickReport(items, null)?.id).toBe('r-new');
    expect(releasedReports(items).map((o) => o.id)).toEqual(['r-old', 'r-new']);
  });

  it.each([false, true])('shows the newest released report: note verbatim, who and when, Download by document id, All reports (wide=%s)', async (wide) => {
    const l = links();
    wrap(<M2InsightsView vm={loaded().vm} name="Asha Rao" links={l} wide={wide} />);
    const card = await screen.findByTestId('m2-ins-reviewed');
    expect(card).toHaveTextContent(en('m2.ins.reviewedReports'));
    expect(card).toHaveTextContent('Thyroid profile');
    expect(within(card).getByTestId('m2-ins-reviewed-note').textContent).toBe('TSH is a little high. Retest in 6 weeks.');
    expect(within(card).getByTestId('m2-ins-reviewed-by')).toHaveTextContent('Dr. A. Rao');
    fireEvent.click(within(card).getByRole('link', { name: en('swt.insights.download') }));
    expect(l.downloadReport).toHaveBeenCalledWith('doc-9');
    fireEvent.click(within(card).getByRole('link', { name: en('m2.ins.allReports', { count: 2 }) }));
    expect(l.allReports).toHaveBeenCalledTimes(1);
  });

  it('reads the same /lab-orders page the Report insights page reads (no extra request)', async () => {
    const { vm, calls } = loaded();
    wrap(<M2InsightsView vm={vm} name="Asha Rao" links={links()} />);
    await screen.findByTestId('m2-ins-reviewed');
    expect(calls.filter((c) => c.path.startsWith('/lab-orders')).map((c) => c.path)).toEqual(['/lab-orders?limit=50']);
  });

  it('a report released without a note says so, in the page’s words', async () => {
    wrap(<M2InsightsView vm={loaded({ '/lab-orders': { items: [{ ...RELEASED, reviewNote: '', reviewedByDoctor: undefined }] } }).vm} name="Asha Rao" links={links()} />);
    expect(await screen.findByTestId('m2-ins-reviewed-note')).toHaveTextContent(en('swt.insights.noNote'));
    expect(screen.getByTestId('m2-ins-reviewed-by').textContent).toContain(en('swt.insights.writtenOn', { date: '' }).replace(/\s·\s$/, '').trim().slice(0, 12));
  });

  it('is hidden when nothing is released (or only an order without a document)', async () => {
    const { vm } = loaded({ '/lab-orders': { items: [ORDER, { ...RELEASED, reportDocumentId: '' }] } });
    wrap(<M2InsightsView vm={vm} name="Asha Rao" links={links()} wide />);
    expect(await screen.findByTestId('m2-ins-ordered')).toHaveTextContent('Vitamin D');
    expect(screen.queryByTestId('m2-ins-reviewed')).toBeNull();
  });

  it('offline: Download is not offered, and says why', async () => {
    const online = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    wrap(<M2InsightsView vm={loaded().vm} name="Asha Rao" links={links()} wide />);
    const card = await screen.findByTestId('m2-ins-reviewed');
    expect(within(card).queryByRole('link', { name: en('swt.insights.download') })).toBeNull();
    expect(within(card).getByTestId('m2-ins-reviewed-offline')).toHaveTextContent(en('m2v.up.needsConnection'));
    online.mockRestore();
  });
});
