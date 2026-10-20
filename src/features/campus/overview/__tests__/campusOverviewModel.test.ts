import { describe, expect, it } from 'vitest';
import { ageOf, buildCampusOverview } from '../campusOverviewModel';
import type { CampusOverviewInput, OpenSosAlert, Phrase } from '../campusOverviewModel';

const NOW = 1_800_000_000;
const say = (phrase: Phrase) => `${phrase.key}${phrase.vars ? JSON.stringify(phrase.vars) : ''}`;
const ok = <T,>(value: T) => ({ ok: true as const, value });
const failed = (status: number) => ({ ok: false as const, status });
const sos = (status: OpenSosAlert['status'], minutesAgo: number): OpenSosAlert => ({ status, createdAt: NOW - minutesAgo * 60 });

function build(input: CampusOverviewInput) {
  return buildCampusOverview(input, NOW, say);
}

describe('ageOf', () => {
  it('reads seconds, minutes, hours and days', () => {
    expect(ageOf(NOW - 20, NOW)).toEqual({ key: 'campusOverview.age.justNow' });
    expect(ageOf(NOW - 18 * 60, NOW)).toEqual({ key: 'campusOverview.age.minutes', vars: { count: 18 } });
    expect(ageOf(NOW - 3 * 3600, NOW)).toEqual({ key: 'campusOverview.age.hours', vars: { count: 3 } });
    expect(ageOf(NOW - 2 * 86400, NOW)).toEqual({ key: 'campusOverview.age.days', vars: { count: 2 } });
    expect(ageOf(NOW + 50, NOW)).toEqual({ key: 'campusOverview.age.justNow' });
  });
});

describe('buildCampusOverview', () => {
  it('is empty only when both live sources answered and nothing is waiting', () => {
    expect(build({ pending: ok([]), sos: ok([]) })).toEqual({ kind: 'empty' });
    // Resolved and cancelled alerts are not open.
    expect(build({ pending: ok([]), sos: ok([sos('RESOLVED', 5), sos('CANCELLED', 9)]) })).toEqual({ kind: 'empty' });
  });

  it('fails closed to "no campus" when the server refuses both for a missing campus', () => {
    expect(build({ pending: failed(403), sos: failed(403) })).toEqual({ kind: 'no-campus' });
  });

  it('shows the error state with the server status, or NET when it was never reached', () => {
    expect(build({ pending: failed(503), sos: failed(503) })).toEqual({ kind: 'error', code: '503' });
    expect(build({ pending: failed(0), sos: failed(0) })).toEqual({ kind: 'error', code: 'NET' });
  });

  it('counts real queues and marks every unsourced tile "not connected" with no number', () => {
    const view = build({ pending: ok([{ accountId: 'a' }, { accountId: 'b' }]), sos: ok([sos('ACTIVE', 18), sos('ACKNOWLEDGED', 40)]) });
    if (view.kind !== 'data') throw new Error(view.kind);
    const byId = Object.fromEntries(view.kpis.map((kpi) => [kpi.id, kpi]));
    expect(view.kpis.map((kpi) => kpi.id)).toEqual(['seats', 'to-verify', 'screened', 'vaccinated', 'sos', 'counsellor']);
    expect(byId['to-verify']).toMatchObject({ value: 2, chip: { label: 'campusOverview.chip.pending', tone: 'attention' }, route: 'campus/verification' });
    expect(byId.sos).toMatchObject({ value: 2, chip: { label: 'campusOverview.chip.live', tone: 'danger' }, route: 'campus/sos' });
    expect(byId.sos.meta).toEqual({ key: 'campusOverview.kpi.sosMetaOldest', vars: { age: 'campusOverview.age.minutes{"count":40}' } });
    for (const id of ['seats', 'screened', 'vaccinated', 'counsellor']) {
      expect(byId[id].value).toBeNull();
      expect(byId[id].chip.label).toBe('campusOverview.chip.notConnected');
    }
    expect(view.partial).toBe(false);
  });

  it('lists what needs attention oldest first, each linking to its queue', () => {
    const view = build({ pending: ok([{ accountId: 'a' }]), sos: ok([sos('ACTIVE', 3), sos('ACTIVE', 11), sos('ACKNOWLEDGED', 30)]) });
    if (view.kind !== 'data') throw new Error(view.kind);
    expect(view.attention.map((item) => [item.id, item.route, item.tone])).toEqual([
      ['sos-waiting', 'campus/sos', 'danger'],
      ['sos-open', 'campus/sos', 'attention'],
      ['verify', 'campus/verification', 'action'],
    ]);
    expect(view.attention[0].title).toEqual({ key: 'campusOverview.attention.sosActiveOther', vars: { count: 2 } });
    expect(view.attention[0].meta.vars).toEqual({ age: 'campusOverview.age.minutes{"count":11}' });
    expect(view.attention[1].title).toEqual({ key: 'campusOverview.attention.sosAckOne' });
    expect(view.attention[2].title).toEqual({ key: 'campusOverview.attention.verifyOne' });
  });

  it('never turns a failed source into a zero or an all-clear', () => {
    const view = build({ pending: ok([]), sos: failed(500) });
    if (view.kind !== 'data') throw new Error(view.kind);
    const sosTile = view.kpis.find((kpi) => kpi.id === 'sos');
    expect(sosTile?.value).toBeNull();
    expect(sosTile?.chip.label).toBe('campusOverview.chip.unavailable');
    expect(sosTile?.meta.key).not.toBe('campusOverview.kpi.sosMetaNone');
    expect(view.partial).toBe(true);

    const other = build({ pending: failed(500), sos: ok([]) });
    if (other.kind !== 'data') throw new Error(other.kind);
    expect(other.kpis.find((kpi) => kpi.id === 'to-verify')?.value).toBeNull();
    expect(other.partial).toBe(true);
  });
});
