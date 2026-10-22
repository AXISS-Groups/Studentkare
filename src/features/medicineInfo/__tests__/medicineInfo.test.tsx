import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const motionFlag = vi.hoisted(() => ({ reduced: true }));
vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => motionFlag.reduced,
}));

import { LanguageProvider } from '@/i18n';
import { ApiError } from '@/data/services/http';
import { applyPublicConfig, resetPublicConfig } from '@/data/services/config';
import { fakeRequest } from '@/features/phoneKit/__tests__/fixtures';
import { axeViolations, describeViolations } from '@/test/axe';
import { MedicineInfoRepository } from '../data/MedicineInfoRepository';
import type { MedicineDetail, MedicineSummary, PickedPhoto } from '../data/MedicineInfoRepository';
import { bandOptions, labelFormsFor } from '../model/ageBands';
import { MedicineInfoViewModel } from '../viewmodel/MedicineInfoViewModel';
import { M2MedicineInfoView } from '../views/M2MedicineInfoView';
import type { MedicineInfoLinks } from '../views/M2MedicineInfoView';

/**
 * Medicine information (plan tier1-medicine-info-2026-10-22). Only the HTTP layer
 * is faked. What these prove: crisis text is never sent; only reviewed fields are
 * drawn; the photo flow never picks for the person and says honestly when the
 * reader is off; the age bands come from settings, under-12 and pregnancy always
 * say to ask first, and the band is never sent; OTC buys and Rx goes to the
 * prescription flow.
 */
const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);
beforeEach(() => { motionFlag.reduced = true; resetPublicConfig(); });
afterEach(() => { cleanup(); resetPublicConfig(); });

const summary = (over: Partial<MedicineSummary> = {}): MedicineSummary => ({
  id: 'med-dolo', brand: 'Dolo 650', composition: 'Paracetamol 650 mg', form: 'TABLET', pack: 'Strip of 15', manufacturer: 'Micro Labs',
  schedule: 'OTC', requiresPrescription: false, reviewed: true, matchedOn: ['brand'], ...over,
});

const note = { source: { title: 'Approved label', url: null }, reviewedOn: '2026-10-22' };
const detail = (over: Partial<MedicineDetail> = {}): MedicineDetail => ({
  id: 'med-dolo', brand: 'Dolo 650', composition: 'Paracetamol 650 mg', form: 'TABLET', pack: 'Strip of 15', manufacturer: 'Micro Labs',
  schedule: 'OTC', requiresPrescription: false, identityReview: note,
  fields: {
    uses: { items: ['Fever', 'Mild to moderate pain'], ...note }, side_effects: null, warnings: { items: ['Do not take with other paracetamol products'], ...note },
    storage: null,
    age_availability: { items: [{ band: 'ADULT', form: 'TABLET', strength: '650 mg' }, { band: 'TEEN', form: 'TABLET', strength: '650 mg' }], ...note },
  },
  reviewed: true,
  sameSalt: [{
    id: 'med-calpol', brand: 'Calpol Suspension', composition: 'Paracetamol 120 mg/5ml', form: 'SUSPENSION', pack: '60 ml', manufacturer: 'GSK',
    schedule: 'OTC', requiresPrescription: false, buy: { state: 'BUY', itemId: 'item-calpol', pricePaise: 4500 },
    ageAvailability: { items: [{ band: 'CHILD', form: 'SUSPENSION', strength: '120 mg/5ml' }], ...note },
  }],
  alternatives: [],
  alternativesRestricted: false,
  buy: { state: 'BUY', itemId: 'item-dolo', pricePaise: 3300 },
  ...over,
});

function links() {
  return {
    back: vi.fn(), consult: vi.fn(), pharmacy: vi.fn(), sendRx: vi.fn(), product: vi.fn<(id: string) => void>(), crisis: vi.fn(),
    takePhoto: vi.fn(), uploadPhoto: vi.fn(),
  } satisfies MedicineInfoLinks;
}

function setup(routes: Record<string, unknown>) {
  const fake = fakeRequest({ '/medicine-info/photo/status': { state: 'READY' }, ...routes });
  const vm = new MedicineInfoViewModel(new MedicineInfoRepository(fake.request));
  return { vm, calls: fake.calls };
}

const photo: PickedPhoto = { append: (form) => form.append('file', new Blob(['x'], { type: 'image/png' })) };

describe('crisis words', () => {
  it('show crisis help and never send the text', async () => {
    const { vm, calls } = setup({});
    wrap(<M2MedicineInfoView vm={vm} links={links()} />);
    fireEvent.change(screen.getByTestId('mi-search-input'), { target: { value: 'overdose on dolo' } });
    fireEvent.click(screen.getByTestId('mi-search-go'));
    expect(await screen.findByTestId('mi-crisis')).toBeTruthy();
    expect(calls.some((c) => c.path.includes('/medicine-info/search'))).toBe(false);
    expect(screen.queryByTestId('mi-results')).toBeNull();
    expect(screen.getByTestId('mi-note')).toBeTruthy();
  });

  it('also when typed as the printed text, and when the server gate answers CRISIS', async () => {
    const { vm, calls } = setup({ '/medicine-info/search?q=': { status: 'CRISIS', kind: 'CRISIS_OVERDOSE', resources: [], results: [] } });
    vm.openTyping();
    vm.setPrinted('overdose');
    await vm.matchPrinted();
    expect(vm.crisis).toBe(true);
    expect(calls.some((c) => c.path.includes('search'))).toBe(false);
    vm.setQuery('pyrexa');
    await vm.submit();
    expect(vm.crisis).toBe(true);
    expect(vm.results).toEqual([]);
  });
});

describe('search', () => {
  it('lists matches with their review state and opens one', async () => {
    const { vm } = setup({
      '/medicine-info/search?q=dollo': { status: 'OK', results: [summary(), summary({ id: 'med-x', brand: 'Azimax 500', requiresPrescription: true, reviewed: false })] },
      '/medicine-info/medicines/med-dolo': detail(),
    });
    const { container } = wrap(<M2MedicineInfoView vm={vm} links={links()} />);
    fireEvent.change(screen.getByTestId('mi-search-input'), { target: { value: 'dollo' } });
    fireEvent.click(screen.getByTestId('mi-search-go'));
    const rx = await screen.findByTestId('mi-result-med-x');
    expect(within(rx).getByText('Needs a prescription')).toBeTruthy();
    expect(within(rx).getByText('Not reviewed yet')).toBeTruthy();
    expect(within(screen.getByTestId('mi-result-med-dolo')).getByText('Reviewed by a pharmacist')).toBeTruthy();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
    fireEvent.click(screen.getByTestId('mi-result-med-dolo'));
    expect(await screen.findByTestId('mi-detail')).toBeTruthy();
  });

  it('says plainly when nothing reviewed is found', async () => {
    const { vm } = setup({ '/medicine-info/search?q=': { status: 'OK', results: [] } });
    wrap(<M2MedicineInfoView vm={vm} links={links()} />);
    vm.setQuery('zzqx');
    await vm.submit();
    const card = await screen.findByTestId('mi-no-match');
    expect(card.textContent).toContain("We don't have reviewed information for this medicine yet — ask a pharmacist or doctor.");
  });
});

describe('the medicine', () => {
  it('draws only reviewed fields, with their source and date', async () => {
    const { vm } = setup({ '/medicine-info/medicines/med-dolo': detail() });
    const { container } = wrap(<M2MedicineInfoView vm={vm} links={links()} />);
    await vm.open('med-dolo');
    expect(await screen.findByTestId('mi-sec-uses')).toBeTruthy();
    expect(screen.getByTestId('mi-sec-warnings')).toBeTruthy();
    expect(screen.queryByTestId('mi-sec-side_effects')).toBeNull();
    expect(screen.queryByTestId('mi-sec-storage')).toBeNull();
    expect(screen.getByTestId('mi-sec-uses').textContent).toContain('Reviewed by a pharmacist on 2026-10-22 · Source: Approved label');
    expect(screen.getByTestId('mi-identity-reviewed')).toBeTruthy();
    expect(screen.getByTestId('mi-note').textContent).toContain('Take medicines only as prescribed by a doctor or as advised by a pharmacist. Consult a doctor before taking any medicine.');
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('without reviewed fields says so, still shows the composition, and keeps the note', async () => {
    const empty = { uses: null, side_effects: null, warnings: null, storage: null, age_availability: null };
    const { vm } = setup({ '/medicine-info/medicines/med-dolo': detail({ fields: empty, reviewed: false, identityReview: null, sameSalt: [] }) });
    wrap(<M2MedicineInfoView vm={vm} links={links()} />);
    await vm.open('med-dolo');
    expect((await screen.findByTestId('mi-no-reviewed')).textContent).toContain("We don't have reviewed information");
    expect(screen.getByTestId('mi-identity-unreviewed')).toBeTruthy();
    expect(screen.getByText('Contains: Paracetamol 650 mg')).toBeTruthy();
    expect(screen.getByTestId('mi-note')).toBeTruthy();
  });

  it('a missing medicine is said plainly', async () => {
    const { vm } = setup({ '/medicine-info/medicines/gone': new ApiError('Medicine not found.', 404) });
    wrap(<M2MedicineInfoView vm={vm} links={links()} />);
    await vm.open('gone');
    expect(await screen.findByTestId('mi-detail-missing')).toBeTruthy();
  });
});

describe('buy paths', () => {
  it('OTC in stock opens the product page', async () => {
    const l = links();
    const { vm } = setup({ '/medicine-info/medicines/med-dolo': detail() });
    wrap(<M2MedicineInfoView vm={vm} links={l} />);
    await vm.open('med-dolo');
    fireEvent.click(await screen.findByTestId('mi-buy'));
    expect(l.product).toHaveBeenCalledWith('item-dolo');
    expect(l.sendRx).not.toHaveBeenCalled();
  });

  it('a prescription medicine goes only through the prescription flow, with no other makers', async () => {
    const l = links();
    const { vm } = setup({ '/medicine-info/medicines/med-azi': detail({ id: 'med-azi', brand: 'Azimax 500', schedule: 'H', requiresPrescription: true, alternativesRestricted: true, buy: { state: 'PRESCRIPTION', itemId: 'item-azi' } }) });
    wrap(<M2MedicineInfoView vm={vm} links={l} />);
    await vm.open('med-azi');
    expect(await screen.findByTestId('mi-rx-chip')).toBeTruthy();
    expect(screen.getByTestId('mi-note-rx')).toBeTruthy();
    expect(screen.queryByText(/^Buy/)).toBeNull();
    fireEvent.click(screen.getByTestId('mi-buy-rx'));
    expect(l.sendRx).toHaveBeenCalled();
    expect(screen.getByTestId('mi-alts-restricted')).toBeTruthy();
    expect(screen.queryByTestId('mi-alts')).toBeNull();
  });

  it('not sold has no buy control', async () => {
    const { vm } = setup({ '/medicine-info/medicines/med-dolo': detail({ buy: { state: 'NOT_SOLD', itemId: null } }) });
    wrap(<M2MedicineInfoView vm={vm} links={links()} />);
    await vm.open('med-dolo');
    expect((await screen.findByTestId('mi-buy')).textContent).toBe("We don't sell this medicine.");
  });
});

describe('who is it for', () => {
  it('takes its bands and ranges from settings', () => {
    applyPublicConfig({ settings: { 'medicine_info.teen_from_years': 13, 'medicine_info.ask_doctor_below_years': 13 } });
    const options = bandOptions();
    const child = options.find((o) => o.band === 'CHILD');
    expect(child?.range?.vars).toEqual({ from: 2, to: 12 });
    expect(child?.askFirst).toBe(true);
    expect(options.find((o) => o.band === 'TEEN')?.askFirst).toBe(false);
    expect(options.find((o) => o.band === 'PREGNANT_BREASTFEEDING')?.askFirst).toBe(true);
  });

  it('adults see the label strengths, never a dose; the band is never sent', async () => {
    const { vm, calls } = setup({ '/medicine-info/medicines/med-dolo': detail() });
    wrap(<M2MedicineInfoView vm={vm} links={links()} />);
    await vm.open('med-dolo');
    const before = calls.length;
    fireEvent.click(await screen.findByTestId('mi-band-ADULT'));
    const answer = await screen.findByTestId('mi-age-answer');
    expect(within(answer).getByText('Tablet · 650 mg')).toBeTruthy();
    expect(screen.queryByTestId('mi-ask-first')).toBeNull();
    expect(answer.textContent).toContain('not a dose');
    expect(answer.textContent).not.toMatch(/times a day|every \d|per kg|mg\/kg/i);
    expect(calls.length).toBe(before);
    expect(screen.getByTestId('mi-band-ADULT').getAttribute('aria-checked')).toBe('true');
  });

  it('a child always gets "ask first", then the same-salt forms the labels list', async () => {
    const l = links();
    const { vm } = setup({ '/medicine-info/medicines/med-dolo': detail() });
    wrap(<M2MedicineInfoView vm={vm} links={l} />);
    await vm.open('med-dolo');
    fireEvent.click(await screen.findByTestId('mi-band-CHILD'));
    expect((await screen.findByTestId('mi-ask-first')).textContent).toContain('Ask a doctor or pharmacist before giving this.');
    expect(screen.getByText('Suspension · 120 mg/5ml')).toBeTruthy();
    fireEvent.click(screen.getByTestId('mi-ask-consult'));
    expect(l.consult).toHaveBeenCalled();
  });

  it('under-2 and pregnancy with nothing on the label: only "ask first" and the actions, no strengths', async () => {
    const l = links();
    const { vm } = setup({ '/medicine-info/medicines/med-dolo': detail() });
    wrap(<M2MedicineInfoView vm={vm} links={l} />);
    await vm.open('med-dolo');
    for (const band of ['UNDER_2', 'PREGNANT_BREASTFEEDING'] as const) {
      fireEvent.click(await screen.findByTestId(`mi-band-${band}`));
      expect(await screen.findByTestId('mi-ask-first')).toBeTruthy();
      expect(screen.queryByTestId('mi-age-forms')).toBeNull();
      expect(screen.queryByTestId('mi-age-none')).toBeNull();
    }
    fireEvent.click(screen.getByTestId('mi-ask-pharmacy'));
    expect(l.pharmacy).toHaveBeenCalled();
  });

  it('an older adult with nothing on the label is told the label does not list it', async () => {
    const { vm } = setup({ '/medicine-info/medicines/med-dolo': detail() });
    wrap(<M2MedicineInfoView vm={vm} links={links()} />);
    await vm.open('med-dolo');
    fireEvent.click(await screen.findByTestId('mi-band-OLDER_ADULT'));
    expect((await screen.findByTestId('mi-age-none')).textContent).toContain("The reviewed label doesn't list a form for this age group.");
  });

  it('labelFormsFor lists this medicine first, then same-salt ones', () => {
    expect(labelFormsFor(detail(), 'TEEN').map((f) => f.medicineId)).toEqual(['med-dolo']);
    expect(labelFormsFor(detail(), 'CHILD').map((f) => [f.medicineId, f.self])).toEqual([['med-calpol', false]]);
  });
});

describe('photo', () => {
  it('says honestly when reading photos is not switched on, and offers typing instead', async () => {
    const { vm } = setup({ '/medicine-info/photo/status': { state: 'NOT_CONFIGURED' } });
    vm.start();
    wrap(<M2MedicineInfoView vm={vm} links={links()} />);
    expect((await screen.findByTestId('mi-photo-off')).textContent).toContain("Reading photos isn't switched on yet");
    expect(screen.queryByTestId('mi-photo-take')).toBeNull();
    expect(screen.getByTestId('mi-photo').textContent).toContain('Your photo is read once and not stored.');
    fireEvent.click(screen.getByTestId('mi-type-open'));
    expect(screen.getByTestId('mi-type-input')).toBeTruthy();
  });

  it('a read photo shows candidates to confirm; nothing opens until the person picks one', async () => {
    const { vm, calls } = setup({
      'POST /medicine-info/photo': { state: 'READ', text: 'DOLO 650 Paracetamol Tablets IP', candidates: [summary({ matchedOn: ['brand', 'strength'] }), summary({ id: 'med-other', brand: 'Dolopar' })] },
      '/medicine-info/medicines/med-dolo': detail(),
    });
    vm.start();
    const { container } = wrap(<M2MedicineInfoView vm={vm} links={links()} />);
    await vm.readPhoto(photo);
    expect(await screen.findByTestId('mi-confirm')).toBeTruthy();
    expect(screen.getByTestId('mi-printed').textContent).toContain('DOLO 650');
    expect(within(screen.getByTestId('mi-candidate-med-dolo')).getByText('Strength matches')).toBeTruthy();
    expect(calls.some((c) => c.path.startsWith('/medicine-info/medicines/'))).toBe(false);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
    fireEvent.click(screen.getByTestId('mi-confirm-med-dolo'));
    await waitFor(() => expect(calls.some((c) => c.path === '/medicine-info/medicines/med-dolo')).toBe(true));
  });

  it('"None of these" guesses nothing', async () => {
    const { vm } = setup({ 'POST /medicine-info/photo': { state: 'READ', text: 'X', candidates: [summary()] } });
    wrap(<M2MedicineInfoView vm={vm} links={links()} />);
    await vm.readPhoto(photo);
    fireEvent.click(await screen.findByTestId('mi-confirm-none'));
    expect(await screen.findByTestId('mi-photo-noMatch')).toBeTruthy();
    expect(vm.detailPhase).toBe('idle');
  });

  it('no match, no text and a reader that went off are each said plainly', async () => {
    for (const [state, phase] of [['READ', 'noMatch'], ['NO_TEXT', 'noText'], ['UNAVAILABLE', 'unavailable'], ['FAILED', 'failed']] as const) {
      const { vm } = setup({ 'POST /medicine-info/photo': { state, text: '', candidates: [] } });
      await vm.readPhoto(photo);
      expect(vm.photoPhase).toBe(phase);
    }
  });
});
