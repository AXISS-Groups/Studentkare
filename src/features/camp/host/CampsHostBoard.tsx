import React, { useCallback, useEffect, useState } from 'react';
import { ConsolePageHeader } from '@/design-system/console/ConsoleTablePage';
import { StatRow } from '@/design-system/data/DataTable';
import type { Stat } from '@/design-system/data/DataTable';
import { Drawer } from '@/design-system/overlays/Drawer';
import { SkButton, Skeleton, StatusPill } from '@/design-system/primitives';
import type { SkTone } from '@/design-system/primitives';
import { Icon, Icon3d } from '@/design-system/icons';
import { getSetting } from '@/data/services/config';
import { useLanguage, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { CAMPUS_MIN_GROUP, groupFigure, statusOf, useBoardLoad, useBoardRef } from '@/features/campus/boards/boardKit';
import { rupees } from '@/features/phoneboards/format';
import { SERVICE_KEYS, refusalKey } from '../data/campsApi';
import type { CampBase, CampEligibility, CampService } from '../data/campsApi';
import { liveHostSource } from './hostApi';
import type { CampsHostSource, HostCamp, HostOptions, NewCampBody } from './hostApi';
import { campCsv, downloadCsv } from './campCsv';
import './camps-host.css';

/**
 * The health camps a host runs (campus console page 4 CampusCamps, Tier 2; the
 * partner console's Health camps page, Tier 3, designed in code). Real camps
 * and counts from GET /ops/camps: per slot, places, booked, waitlist, checked
 * in and cancelled — never who. On the campus console every count under the
 * campus minimum group size is withheld (the console's k-anonymity floor), in
 * the page and in the CSV. A partner sees its own camps' exact counts.
 *
 * Create a camp (POST /ops/camps): date, place, services, who may book, price
 * (only when paid camps are on), slots with places. A partner's camp waits for
 * the campus to approve it. Vaccination and blood donation are listed but held
 * for clinical review (docs/plans/tier1-health-camps-2026-10-23.md).
 */
export type HostMode = 'campus' | 'partner';

const BOARD: Record<HostMode, string> = { campus: 'CampusCamps', partner: 'PartnerCamps' };
const SKELETON_CAMPS = 3;

type Timing = 'today' | 'upcoming' | 'past';

export function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function timingOf(date: string, today: string): Timing {
  if (date === today) return 'today';
  return date > today ? 'upcoming' : 'past';
}

/** The pill on a camp row: its approval state, else when it is. */
function pillOf(camp: HostCamp, today: string): { key: MessageKey; tone: SkTone } {
  if (camp.status === 'PENDING_APPROVAL') return { key: 'camps.host.status.pending', tone: 'attention' };
  if (camp.status === 'DECLINED') return { key: 'camps.host.status.declined', tone: 'neutral' };
  if (camp.status === 'CANCELLED') return { key: 'camps.host.status.cancelled', tone: 'neutral' };
  const timing = timingOf(camp.date, today);
  if (timing === 'today') return { key: 'campusBoards.camps.status.today', tone: 'action' };
  return timing === 'upcoming' ? { key: 'campusBoards.camps.status.upcoming', tone: 'action' } : { key: 'campusBoards.camps.status.past', tone: 'neutral' };
}

export function totals(camp: HostCamp) {
  return camp.slots.reduce((sum, s) => ({
    capacity: sum.capacity + s.capacity, booked: sum.booked + s.booked, waitlisted: sum.waitlisted + s.waitlisted,
    checkedIn: sum.checkedIn + s.checkedIn, cancelled: sum.cancelled + s.cancelled,
  }), { capacity: 0, booked: 0, waitlisted: 0, checkedIn: 0, cancelled: 0 });
}

export function CampsHostBoard({ mode, source = liveHostSource }: { mode: HostMode; source?: CampsHostSource }): React.ReactElement {
  const t = useT();
  const { lang } = useLanguage();
  const boardRef = useBoardRef();
  const load = useCallback(() => source.load(), [source]);
  const { state, retry } = useBoardLoad(load);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const locale = lang === 'en' ? 'en-IN' : `${lang}-IN`;
  const today = localToday();
  const board = BOARD[mode];
  const withhold = mode === 'campus';

  const count = (value: number): string => {
    if (!withhold) return value.toLocaleString(locale);
    const figure = groupFigure(value);
    return figure.shown ? figure.value.toLocaleString(locale) : t('campusBoards.withheld', { floor: CAMPUS_MIN_GROUP });
  };
  const dateLabel = (iso: string) => {
    const date = new Date(`${iso}T00:00:00`);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const header = (
    <ConsolePageHeader
      eyebrow={t(mode === 'campus' ? 'campusBoards.camps.eyebrow' : 'camps.host.partnerEyebrow')}
      title={t('campusBoards.camps.title')}
      actions={(
        <SkButton onClick={() => { setNotice(null); setCreating(true); }}>
          <Icon name="plus" size={17} strokeWidth={1.9} />
          {t('campusBoards.camps.create')}
        </SkButton>
      )}
    />
  );
  const drawer = (
    <NewCampDrawer open={creating} source={source} board={board} onClose={() => setCreating(false)}
      onCreated={(pending) => { setCreating(false); setNotice(pending ? 'camps.host.createdPending' : 'camps.host.created'); retry(); }} />
  );

  if (state.kind === 'loading') {
    return (
      <div className="sk-ds cb-board cb-camps" role="status" aria-busy="true" aria-label={t('campusBoards.camps.loading')}>
        <Skeleton width={280} height={30} />
        <div className="cb-skel-row">{[0, 1, 2, 3].map((key) => <Skeleton key={key} height={64} />)}</div>
        {Array.from({ length: SKELETON_CAMPS }, (_, key) => <Skeleton key={key} height={96} />)}
      </div>
    );
  }

  if (state.kind === 'failed') {
    return (
      <div className="sk-ds cb-board">
        <div className="sk-state">
          <div className="sk-state__body sk-state__body--card" role="alert">
            <span className="sk-state__badge"><Icon name="alert-triangle" size={30} strokeWidth={2.2} /></span>
            <h1 className="sk-state__title">{t('campusBoards.camps.error')}</h1>
            <p className="sk-state__text">{state.status === 403 ? t('camps.host.noAccess') : t('console.error.body')}</p>
            <div className="sk-state__actions">
              <SkButton onClick={retry}>{t('common.tryAgain')}</SkButton>
              <SkButton variant="secondary" onClick={() => navigate('support')}>{t('console.error.help')}</SkButton>
            </div>
            <span className="sk-state__ref">{boardRef(state.status, board)}</span>
          </div>
        </div>
      </div>
    );
  }

  const camps = state.data.items;
  const live = camps.filter((c) => c.status === 'PUBLISHED' && c.date >= today);
  const sum = live.reduce((acc, c) => { const x = totals(c); return { booked: acc.booked + x.booked, capacity: acc.capacity + x.capacity }; }, { booked: 0, capacity: 0 });
  const checkedToday = camps.filter((c) => c.date === today).reduce((acc, c) => acc + totals(c).checkedIn, 0);
  const stats: Stat[] = [
    { label: t('camps.host.stat.upcoming'), value: live.length.toLocaleString(locale) },
    { label: t('camps.host.stat.pending'), value: camps.filter((c) => c.status === 'PENDING_APPROVAL').length.toLocaleString(locale) },
    { label: t('camps.host.stat.booked'), value: count(sum.booked), meta: t('camps.host.stat.ofPlaces', { n: sum.capacity.toLocaleString(locale) }) },
    { label: t('camps.host.stat.checkedToday'), value: count(checkedToday) },
  ];

  return (
    <div className="sk-ds cb-board cb-camps">
      {header}
      {notice ? (
        <div className="sk-note sk-note--positive" role="status">
          <Icon name="check-2" size={16} strokeWidth={2.2} />
          <span>{t(notice)}</span>
        </div>
      ) : null}
      {camps.length === 0 ? (
        <div className="sk-state">
          <div className="sk-state__body">
            <Icon3d name="chart-alt--p4" size={96} />
            <h2 className="sk-state__title">{t('campusBoards.camps.empty')}</h2>
            <p className="sk-state__text">{t('camps.host.emptyBody')}</p>
            <div className="sk-state__actions">
              <SkButton onClick={() => setCreating(true)}>{t('campusBoards.camps.create')}</SkButton>
            </div>
          </div>
        </div>
      ) : (
        <>
          <StatRow stats={stats} variant="plain" />
          <p className="cb-scope-note">{t(withhold ? 'camps.host.scopeCampus' : 'camps.host.scopePartner')}</p>
          <ul className="cb-camp-list" aria-label={t('campusBoards.camps.title')}>
            {camps.map((camp) => (
              <CampRow key={camp.id} camp={camp} today={today} dateLabel={dateLabel(camp.date)} count={count} withhold={withhold}
                source={source} board={board} onChanged={(key) => { setNotice(key); retry(); }} />
            ))}
          </ul>
        </>
      )}
      <p className="cb-footnote">{t('camps.host.footnote')}</p>
      {drawer}
    </div>
  );
}

function serviceList(camp: CampBase, t: ReturnType<typeof useT>): string {
  return camp.services.map((code) => t(SERVICE_KEYS[code])).join(' · ');
}

function CampRow({ camp, today, dateLabel, count, withhold, source, board, onChanged }: {
  camp: HostCamp; today: string; dateLabel: string; count: (n: number) => string; withhold: boolean;
  source: CampsHostSource; board: string; onChanged: (notice: MessageKey) => void;
}): React.ReactElement {
  const t = useT();
  const boardRef = useBoardRef();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const pill = pillOf(camp, today);
  const sum = totals(camp);
  const titleId = `camp-${camp.id}`;
  const panelId = `camp-panel-${camp.id}`;
  const where = camp.location ? t('campusBoards.camps.where', { place: camp.location, date: dateLabel }) : dateLabel;
  const price = camp.pricePaise > 0 ? rupees(camp.pricePaise) : t('camps.free');
  const eligibility = t(camp.eligibility === 'CAMPUS_VERIFIED' ? 'camps.host.elig.CAMPUS_VERIFIED' : camp.eligibility === 'CAMPUS_ANY' ? 'camps.host.elig.CAMPUS_ANY' : 'camps.host.elig.OPEN');

  const decide = async (decision: 'APPROVE' | 'DECLINE') => {
    setBusy(true);
    setFailure(null);
    try {
      await source.decide(camp.id, decision);
      onChanged(decision === 'APPROVE' ? 'camps.host.approved' : 'camps.host.declined');
    } catch (reason) {
      setFailure(boardRef(statusOf(reason), board));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="cb-camp ch-camp" aria-labelledby={titleId}>
      <div className="ch-camp__top">
        <div className="cb-camp__main">
          <span className="cb-camp__title-row">
            <h2 id={titleId} className="cb-camp__title">{camp.name}</h2>
            <StatusPill tone={pill.tone} small>{t(pill.key)}</StatusPill>
          </span>
          <span className="cb-camp__where">{where}</span>
          <span className="cb-camp__staffing">{[camp.campus, serviceList(camp, t), eligibility, price].filter(Boolean).join(' · ')}</span>
          {camp.status === 'CANCELLED' && camp.cancelReason ? <span className="cb-camp__staffing">{t('camps.host.cancelledBecause', { reason: camp.cancelReason })}</span> : null}
        </div>
        <dl className="cb-camp__metrics">
          <div><dt>{t('campusBoards.camps.metric.capacity')}</dt><dd className="sk-mono">{sum.capacity.toLocaleString()}</dd></div>
          <div><dt>{t('campusBoards.camps.metric.booked')}</dt><dd className="sk-mono">{count(sum.booked)}</dd></div>
          <div><dt>{t('camps.host.metric.waitlist')}</dt><dd className="sk-mono">{count(sum.waitlisted)}</dd></div>
          <div><dt>{t('camps.host.metric.checkedIn')}</dt><dd className="sk-mono">{count(sum.checkedIn)}</dd></div>
        </dl>
      </div>
      <div className="ch-camp__actions">
        <button type="button" className="sk-link ch-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
          {t(open ? 'camps.host.hideSlots' : 'camps.host.showSlots')}
          <span className={open ? 'ch-flip' : 'ch-chevron'} aria-hidden="true"><Icon name="chevron-down" size={16} strokeWidth={2.2} /></span>
        </button>
        <SkButton variant="secondary" onClick={() => downloadCsv(campCsv(camp, withhold, t), camp)}>
          <Icon name="download" size={16} strokeWidth={2} />
          {t('camps.host.export')}
        </SkButton>
        {camp.canDecide ? (
          <>
            <SkButton busy={busy} onClick={() => void decide('APPROVE')}>{t('camps.host.approve')}</SkButton>
            <SkButton variant="secondary" disabled={busy} onClick={() => void decide('DECLINE')}>{t('camps.host.decline')}</SkButton>
          </>
        ) : null}
        {camp.canCancel ? <SkButton variant="secondary" onClick={() => setCancelling(true)}>{t('camps.host.cancelCamp')}</SkButton> : null}
      </div>
      {failure ? <div className="sk-note sk-note--danger" role="alert"><Icon name="alert-triangle" size={16} strokeWidth={2} /><span>{t('camps.host.actionFailed', { ref: failure })}</span></div> : null}
      {open ? (
        <div id={panelId} className="ch-slots">
          <table className="ch-table">
            <caption className="sk-visually-hidden">{t('camps.host.slotsCaption', { camp: camp.name })}</caption>
            <thead>
              <tr>
                <th scope="col">{t('camps.host.col.slot')}</th>
                <th scope="col">{t('campusBoards.camps.metric.capacity')}</th>
                <th scope="col">{t('campusBoards.camps.metric.booked')}</th>
                <th scope="col">{t('camps.host.metric.waitlist')}</th>
                <th scope="col">{t('camps.host.metric.checkedIn')}</th>
                <th scope="col">{t('camps.host.col.cancelled')}</th>
              </tr>
            </thead>
            <tbody>
              {camp.slots.map((s) => (
                <tr key={s.id}>
                  <th scope="row">{t('camps.slotRange', { start: s.slotStart, end: s.slotEnd })}</th>
                  <td className="sk-mono">{s.capacity.toLocaleString()}</td>
                  <td className="sk-mono">{count(s.booked)}</td>
                  <td className="sk-mono">{count(s.waitlisted)}</td>
                  <td className="sk-mono">{count(s.checkedIn)}</td>
                  <td className="sk-mono">{count(s.cancelled)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cb-field__hint">{t('camps.host.noNames')}</p>
        </div>
      ) : null}
      <CancelCampDrawer open={cancelling} camp={camp} source={source} board={board} onClose={() => setCancelling(false)}
        onDone={() => { setCancelling(false); onChanged('camps.host.cancelled'); }} />
    </li>
  );
}

function CancelCampDrawer({ open, camp, source, board, onClose, onDone }: {
  open: boolean; camp: HostCamp; source: CampsHostSource; board: string; onClose: () => void; onDone: () => void;
}): React.ReactElement | null {
  const t = useT();
  const boardRef = useBoardRef();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const ready = reason.trim().length >= MIN_REASON;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      await source.cancel(camp.id, reason.trim());
      setReason('');
      onDone();
    } catch (error) {
      setFailure(boardRef(statusOf(error), board));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Drawer open={open} title={t('camps.host.cancelTitle', { camp: camp.name })} busy={busy} onClose={onClose}>
      <form className="cb-form" onSubmit={submit} noValidate>
        <p className="cb-field__plain">{t('camps.host.cancelBody')}</p>
        <label className="cb-field">
          <span className="cb-field__label">{t('camps.host.cancelReason')}</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} required />
        </label>
        <p className="cb-field__hint">{t('camps.host.cancelHint')}</p>
        {failure ? <div className="sk-note sk-note--danger" role="alert"><Icon name="alert-triangle" size={16} strokeWidth={2} /><span>{t('camps.host.actionFailed', { ref: failure })}</span></div> : null}
        <SkButton type="submit" variant="danger" busy={busy} disabled={!ready} className="cb-form__submit">{t('camps.host.cancelConfirm')}</SkButton>
      </form>
    </Drawer>
  );
}

const MIN_NAME = 3;
const MIN_REASON = 3;

interface SlotDraft { key: number; start: string; end: string; capacity: string }
interface Draft { name: string; date: string; campus: string; location: string; whatToBring: string; services: CampService[]; eligibility: CampEligibility; price: string; slots: SlotDraft[] }

const emptyDraft = (): Draft => ({ name: '', date: '', campus: '', location: '', whatToBring: '', services: [], eligibility: 'CAMPUS_VERIFIED', price: '', slots: [{ key: 0, start: '', end: '', capacity: '' }] });

/** "09:30" (an <input type="time">) to "9:30 AM", the format students are shown. "" when it isn't a time. */
export function slotTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return '';
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const noon = 12;
  if (hours >= noon * 2 || minutes >= 60) return '';
  const twelve = hours % noon === 0 ? noon : hours % noon;
  return `${twelve}:${String(minutes).padStart(2, '0')} ${hours >= noon ? 'PM' : 'AM'}`;
}

function slotReady(s: SlotDraft): boolean {
  const capacity = Number(s.capacity);
  return Boolean(slotTime(s.start)) && Boolean(slotTime(s.end)) && s.end > s.start && Number.isInteger(capacity) && capacity > 0
    && capacity <= getSetting('camps.slot_capacity_max');
}

function NewCampDrawer({ open, source, board, onClose, onCreated }: {
  open: boolean; source: CampsHostSource; board: string; onClose: () => void; onCreated: (pending: boolean) => void;
}): React.ReactElement | null {
  const t = useT();
  const boardRef = useBoardRef();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [options, setOptions] = useState<HostOptions | null>(null);
  const [optionsFailed, setOptionsFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const paidOn = getSetting('camps.paid_camps_enabled');
  const slotsMax = getSetting('camps.slots_per_camp_max');

  useEffect(() => {
    if (!open || options) return;
    let live = true;
    setOptionsFailed(false);
    source.options().then((o) => { if (live) { setOptions(o); setDraft((d) => ({ ...d, campus: o.campusFixed ? o.campuses[0] ?? '' : d.campus })); } },
      () => { if (live) setOptionsFailed(true); });
    return () => { live = false; };
  }, [open, options, source]);

  const set = (key: 'name' | 'date' | 'campus' | 'location' | 'whatToBring' | 'price') =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft((d) => ({ ...d, [key]: event.target.value }));
  const setSlot = (index: number, key: 'start' | 'end' | 'capacity') => (event: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, slots: d.slots.map((s, i) => (i === index ? { ...s, [key]: event.target.value } : s)) }));
  const toggle = (code: CampService) => setDraft((d) => ({ ...d, services: d.services.includes(code) ? d.services.filter((c) => c !== code) : [...d.services, code] }));
  const addSlot = () => setDraft((d) => ({ ...d, slots: [...d.slots, { key: Math.max(...d.slots.map((s) => s.key)) + 1, start: '', end: '', capacity: '' }] }));
  const removeSlot = (index: number) => setDraft((d) => ({ ...d, slots: d.slots.filter((_, i) => i !== index) }));

  const pricePaise = paidOn && draft.price ? Math.round(Number(draft.price) * 100) : 0;
  const priceOk = !paidOn || !draft.price || (Number.isFinite(pricePaise) && pricePaise >= 0 && pricePaise <= getSetting('camps.price_paise_max'));
  const ready = Boolean(options) && draft.name.trim().length >= MIN_NAME && Boolean(draft.date) && Boolean(draft.campus) && draft.services.length > 0
    && draft.slots.length > 0 && draft.slots.every(slotReady) && priceOk;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || busy || !options) return;
    setBusy(true);
    setFailure(null);
    const body: NewCampBody = {
      name: draft.name.trim(), date: draft.date, campus: draft.campus, location: draft.location.trim(), whatToBring: draft.whatToBring.trim(),
      services: draft.services, eligibility: draft.eligibility, pricePaise,
      slots: draft.slots.map((s) => ({ start: s.start, end: s.end, capacity: Number(s.capacity) })),
    };
    try {
      const created = await source.create(body);
      setDraft(emptyDraft());
      onCreated(created.status === 'PENDING_APPROVAL');
    } catch (reason) {
      const key = refusalKey(reason);
      setFailure(key === 'camps.err.generic' ? t('campusBoards.camps.drawer.failed', { ref: boardRef(statusOf(reason), board) }) : t(key));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} title={t('campusBoards.camps.drawer.title')} busy={busy} onClose={onClose}>
      {optionsFailed ? (
        <div className="sk-note sk-note--danger" role="alert"><Icon name="alert-triangle" size={16} strokeWidth={2} /><span>{t('camps.host.optionsFailed')}</span></div>
      ) : null}
      <form className="cb-form" onSubmit={submit} noValidate>
        <label className="cb-field">
          <span className="cb-field__label">{t('campusBoards.camps.drawer.name')}</span>
          <input value={draft.name} onChange={set('name')} required minLength={MIN_NAME} maxLength={120} />
        </label>
        <div className="cb-field-row">
          <label className="cb-field">
            <span className="cb-field__label">{t('campusBoards.camps.drawer.date')}</span>
            <input type="date" value={draft.date} min={localToday()} onChange={set('date')} required />
          </label>
          <label className="cb-field">
            <span className="cb-field__label">{t('campusBoards.camps.drawer.where')}</span>
            <input value={draft.location} onChange={set('location')} maxLength={160} />
          </label>
        </div>
        {options && !options.campusFixed ? (
          <label className="cb-field">
            <span className="cb-field__label">{t('camps.host.campus')}</span>
            <select className="ch-select" value={draft.campus} onChange={set('campus')} required>
              <option value="">{t('camps.host.campusPick')}</option>
              {options.campuses.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            {options.campuses.length === 0 ? <span className="cb-field__hint">{t('camps.host.noCampuses')}</span> : null}
          </label>
        ) : options ? (
          <div className="cb-field">
            <span className="cb-field__label">{t('camps.host.campus')}</span>
            <p className="cb-field__plain">{draft.campus}</p>
          </div>
        ) : null}
        <fieldset className="cb-fieldset">
          <legend className="cb-field__label">{t('camps.host.services')}</legend>
          <ul className="cb-chips">
            {(options?.services ?? []).map((s) => (
              <li key={s.code}>
                <button type="button" className={`cb-chip${draft.services.includes(s.code) ? ' is-on' : ''}`} aria-pressed={draft.services.includes(s.code)}
                  disabled={s.held} onClick={() => toggle(s.code)}>
                  {draft.services.includes(s.code) ? <Icon name="check" size={14} strokeWidth={2.6} /> : null}
                  {t(SERVICE_KEYS[s.code])}
                </button>
              </li>
            ))}
          </ul>
          {options?.services.some((s) => s.held) ? <p className="cb-field__hint">{t('camps.host.heldHint')}</p> : null}
        </fieldset>
        <fieldset className="cb-fieldset">
          <legend className="cb-field__label">{t('camps.host.who')}</legend>
          {(options?.eligibility ?? []).map((code) => (
            <label key={code} className="ch-radio">
              <input type="radio" name="camp-eligibility" value={code} checked={draft.eligibility === code} onChange={() => setDraft((d) => ({ ...d, eligibility: code }))} />
              <span>{t(code === 'CAMPUS_VERIFIED' ? 'camps.host.elig.CAMPUS_VERIFIED' : 'camps.host.elig.CAMPUS_ANY')}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="cb-fieldset">
          <legend className="cb-field__label">{t('camps.host.slots')}</legend>
          {draft.slots.map((s, index) => (
            <div key={s.key} className="cb-field-row cb-field-row--three ch-slot-row">
              <label className="cb-field">
                <span className="cb-field__sub">{t('campusBoards.camps.drawer.start')}</span>
                <input type="time" value={s.start} onChange={setSlot(index, 'start')} required />
              </label>
              <label className="cb-field">
                <span className="cb-field__sub">{t('campusBoards.camps.drawer.end')}</span>
                <input type="time" value={s.end} onChange={setSlot(index, 'end')} required />
              </label>
              <label className="cb-field">
                <span className="cb-field__sub">{t('campusBoards.camps.drawer.capacity')}</span>
                <input type="number" inputMode="numeric" min={1} max={getSetting('camps.slot_capacity_max')} value={s.capacity} onChange={setSlot(index, 'capacity')} required />
              </label>
              {draft.slots.length > 1 ? (
                <button type="button" className="ch-remove" aria-label={t('camps.host.removeSlot', { n: index + 1 })} onClick={() => removeSlot(index)}>
                  <Icon name="x" size={16} strokeWidth={2.2} />
                </button>
              ) : null}
            </div>
          ))}
          {draft.slots.length < slotsMax ? (
            <button type="button" className="sk-link ch-add" onClick={addSlot}><Icon name="plus" size={16} strokeWidth={2.2} />{t('camps.host.addSlot')}</button>
          ) : null}
          <p className="cb-field__hint">{t('camps.host.slotsHint', { max: getSetting('camps.slot_capacity_max') })}</p>
        </fieldset>
        <label className="cb-field">
          <span className="cb-field__label">{t('camps.host.price')}</span>
          {paidOn ? <input type="number" inputMode="decimal" min={0} value={draft.price} onChange={set('price')} /> : <p className="cb-field__plain">{t('camps.free')}</p>}
          <span className="cb-field__hint">{t(paidOn ? 'camps.host.priceHint' : 'camps.host.priceOff')}</span>
        </label>
        <label className="cb-field">
          <span className="cb-field__label">{t('campusBoards.camps.drawer.bring')}</span>
          <input value={draft.whatToBring} onChange={set('whatToBring')} maxLength={400} />
        </label>
        {failure ? (
          <div className="sk-note sk-note--danger" role="alert">
            <Icon name="alert-triangle" size={16} strokeWidth={2} />
            <span>{failure}</span>
          </div>
        ) : null}
        <SkButton type="submit" busy={busy} disabled={!ready} className="cb-form__submit">{t('campusBoards.camps.drawer.submit')}</SkButton>
        <p className="cb-field__hint">{t(options?.needsApproval ? 'camps.host.needsApproval' : 'camps.host.publishNow')}</p>
      </form>
    </Drawer>
  );
}
