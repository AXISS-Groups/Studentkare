import React, { useCallback, useState } from 'react';
import { ConsolePageHeader } from '@/design-system/console/ConsoleTablePage';
import { StatRow } from '@/design-system/data/DataTable';
import type { Stat } from '@/design-system/data/DataTable';
import { Drawer } from '@/design-system/overlays/Drawer';
import { SkButton, Skeleton, StatusPill } from '@/design-system/primitives';
import { Icon, Icon3d } from '@/design-system/icons';
import { apiRequest } from '@/data/services/http';
import { useLanguage, useT } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { CAMPUS_MIN_GROUP, groupFigure, statusOf, useBoardLoad, useBoardRef } from './boardKit';
import './campus-boards.css';

/** GET /camps and GET /camps/{id}/slots, reduced to what this board shows. */
export interface CampSlot { capacity: number; booked: number }
export interface CampListing {
  id: string;
  name: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  location: string;
  /** null: the slots could not be loaded. */
  slots: CampSlot[] | null;
}

export interface NewCamp {
  name: string;
  date: string;
  location: string;
  whatToBring: string;
  /** "9:00 AM", the format the student booking screen reads. */
  slotStart: string;
  slotEnd: string;
  capacity: number;
}

export interface CampsSource {
  load(): Promise<CampListing[]>;
  create(camp: NewCamp): Promise<void>;
}

export const liveCampsSource: CampsSource = {
  async load() {
    const { items } = await apiRequest<{ items: Array<{ id: string; name: string; date: string; location: string }> }>('/camps');
    return Promise.all(items.map(async (camp) => {
      const slots = await apiRequest<{ items: CampSlot[] }>(`/camps/${encodeURIComponent(camp.id)}/slots`)
        .then((body) => body.items.map((slot) => ({ capacity: slot.capacity, booked: slot.booked })))
        .catch(() => null);
      return { id: camp.id, name: camp.name, date: camp.date, location: camp.location, slots };
    }));
  },
  async create(camp) {
    await apiRequest('/ops/camps', {
      method: 'POST',
      body: JSON.stringify({
        name: camp.name,
        date: camp.date,
        location: camp.location,
        whatToBring: camp.whatToBring,
        slots: [{ slotStart: camp.slotStart, slotEnd: camp.slotEnd, capacity: camp.capacity }],
      }),
    });
  },
};

/** The stations every camp runs (backend CAMP_STATIONS); a camp cannot choose them yet. */
const STATIONS = ['campusBoards.camps.station.registration', 'campusBoards.camps.station.vitals', 'campusBoards.camps.station.consultation', 'campusBoards.camps.station.sample', 'campusBoards.camps.station.exit'] as const;

const BOARD = 'CampusCamps';
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const NOON = 12;
const SKELETON_CAMPS = 3;

/** "09:30" (an <input type="time">) to "9:30 AM". */
export function slotTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return '';
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours >= HOURS_PER_DAY || minutes >= MINUTES_PER_HOUR) return '';
  const meridiem = hours >= NOON ? 'PM' : 'AM';
  const twelve = hours % NOON === 0 ? NOON : hours % NOON;
  return `${twelve}:${String(minutes).padStart(2, '0')} ${meridiem}`;
}

type Timing = 'today' | 'upcoming' | 'past';

function timingOf(date: string, today: string): Timing {
  if (date === today) return 'today';
  return date > today ? 'upcoming' : 'past';
}

function localToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Health camps (design page 4, CampusCamps; Tier 2). The camps and their
 * booking counts are real (GET /camps, /camps/{id}/slots); a booking count
 * under the minimum group size is withheld. Staffing, check-in counts and
 * attendance are not reported by any endpoint, so those figures show "—".
 * "Create a camp" posts to /ops/camps with one bookable sitting.
 */
export function CampusCampsScreen({ source = liveCampsSource }: { source?: CampsSource }): React.ReactElement {
  const t = useT();
  const { lang } = useLanguage();
  const boardRef = useBoardRef();
  const load = useCallback(() => source.load(), [source]);
  const { state, retry } = useBoardLoad(load);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const locale = lang === 'en' ? 'en-IN' : `${lang}-IN`;
  const today = localToday();

  const dateLabel = (iso: string) => {
    const date = new Date(`${iso}T00:00:00`);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const header = (
    <ConsolePageHeader
      eyebrow={t('campusBoards.camps.eyebrow')}
      title={t('campusBoards.camps.title')}
      actions={(
        <SkButton onClick={() => { setCreated(false); setCreating(true); }}>
          <Icon name="plus" size={17} strokeWidth={1.9} />
          {t('campusBoards.camps.create')}
        </SkButton>
      )}
    />
  );

  const drawer = (
    <NewCampDrawer
      open={creating}
      source={source}
      onClose={() => setCreating(false)}
      onCreated={() => { setCreating(false); setCreated(true); retry(); }}
    />
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
            <p className="sk-state__text">{t('console.error.body')}</p>
            <div className="sk-state__actions">
              <SkButton onClick={retry}>{t('common.tryAgain')}</SkButton>
              <SkButton variant="secondary" onClick={() => navigate('support')}>{t('console.error.help')}</SkButton>
            </div>
            <span className="sk-state__ref">{boardRef(state.status, BOARD)}</span>
          </div>
        </div>
      </div>
    );
  }

  const camps = [...state.data].sort((a, b) => a.date.localeCompare(b.date));
  const todayCount = camps.filter((camp) => camp.date === today).length;
  const stats: Stat[] = [
    { label: t('campusBoards.camps.stat.today'), value: todayCount.toLocaleString(locale) },
    { label: t('campusBoards.camps.stat.staffing'), value: null, meta: t('campusBoards.notConnectedShort') },
    { label: t('campusBoards.camps.stat.attendance'), value: null, meta: t('campusBoards.notConnectedShort') },
    { label: t('campusBoards.camps.stat.reached'), value: null, meta: t('campusBoards.notConnectedShort') },
  ];

  return (
    <div className="sk-ds cb-board cb-camps">
      {header}
      {created ? (
        <div className="sk-note sk-note--positive" role="status">
          <Icon name="check-2" size={16} strokeWidth={2.2} />
          <span>{t('campusBoards.camps.created')}</span>
        </div>
      ) : null}
      {camps.length === 0 ? (
        <div className="sk-state">
          <div className="sk-state__body">
            <Icon3d name="chart-alt--p4" size={96} />
            <h2 className="sk-state__title">{t('campusBoards.camps.empty')}</h2>
            <p className="sk-state__text">{t('campusBoards.emptyBody')}</p>
            <div className="sk-state__actions">
              <SkButton onClick={() => navigate('campus/students')}>{t('campusBoards.emptyCta')}</SkButton>
            </div>
          </div>
        </div>
      ) : (
        <>
          <StatRow stats={stats} variant="plain" />
          <p className="cb-scope-note">{t('campusBoards.camps.scopeNote')}</p>
          <ul className="cb-camp-list" aria-label={t('campusBoards.camps.title')}>
            {camps.map((camp) => <CampRow key={camp.id} camp={camp} timing={timingOf(camp.date, today)} dateLabel={dateLabel(camp.date)} locale={locale} />)}
          </ul>
        </>
      )}
      <p className="cb-footnote">{t('campusBoards.camps.footnote')}</p>
      {drawer}
    </div>
  );
}

const TIMING: Record<Timing, { label: 'campusBoards.camps.status.today' | 'campusBoards.camps.status.upcoming' | 'campusBoards.camps.status.past'; tone: 'action' | 'neutral' | 'positive' }> = {
  today: { label: 'campusBoards.camps.status.today', tone: 'action' },
  upcoming: { label: 'campusBoards.camps.status.upcoming', tone: 'action' },
  past: { label: 'campusBoards.camps.status.past', tone: 'neutral' },
};

function CampRow({ camp, timing, dateLabel, locale }: { camp: CampListing; timing: Timing; dateLabel: string; locale: string }): React.ReactElement {
  const t = useT();
  const capacity = camp.slots?.reduce((sum, slot) => sum + slot.capacity, 0) ?? null;
  const booked = camp.slots?.reduce((sum, slot) => sum + slot.booked, 0) ?? null;
  const bookedFigure = booked === null ? null : groupFigure(booked);
  const tone = TIMING[timing];
  const titleId = `camp-${camp.id}`;
  return (
    <li className="cb-camp" aria-labelledby={titleId}>
      <div className="cb-camp__main">
        <span className="cb-camp__title-row">
          <h2 id={titleId} className="cb-camp__title">{camp.name}</h2>
          <StatusPill tone={tone.tone} small>{t(tone.label)}</StatusPill>
        </span>
        <span className="cb-camp__where">{camp.location ? t('campusBoards.camps.where', { place: camp.location, date: dateLabel }) : dateLabel}</span>
        <span className="cb-camp__staffing">{t('campusBoards.camps.staffingUnknown')}</span>
      </div>
      <dl className="cb-camp__metrics">
        <div>
          <dt>{t('campusBoards.camps.metric.capacity')}</dt>
          <dd className="sk-mono">{capacity === null ? '—' : capacity.toLocaleString(locale)}</dd>
        </div>
        <div>
          <dt>{t('campusBoards.camps.metric.booked')}</dt>
          <dd className="sk-mono">
            {bookedFigure === null ? '—' : bookedFigure.shown ? bookedFigure.value.toLocaleString(locale) : t('campusBoards.withheld', { floor: CAMPUS_MIN_GROUP })}
          </dd>
        </div>
      </dl>
    </li>
  );
}

interface Draft { name: string; date: string; location: string; whatToBring: string; start: string; end: string; capacity: string }
const EMPTY_DRAFT: Draft = { name: '', date: '', location: '', whatToBring: '', start: '', end: '', capacity: '' };
const MIN_NAME = 3;

function NewCampDrawer({ open, source, onClose, onCreated }: { open: boolean; source: CampsSource; onClose: () => void; onCreated: () => void }): React.ReactElement | null {
  const t = useT();
  const boardRef = useBoardRef();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<number | null>(null);
  const set = (key: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement>) => setDraft((value) => ({ ...value, [key]: event.target.value }));

  const capacity = Number(draft.capacity);
  const start = slotTime(draft.start);
  const end = slotTime(draft.end);
  const ready = draft.name.trim().length >= MIN_NAME && Boolean(draft.date) && Boolean(start) && Boolean(end)
    && draft.end > draft.start && Number.isInteger(capacity) && capacity > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      await source.create({ name: draft.name.trim(), date: draft.date, location: draft.location.trim(), whatToBring: draft.whatToBring.trim(), slotStart: start, slotEnd: end, capacity });
      setDraft(EMPTY_DRAFT);
      onCreated();
    } catch (reason) {
      setFailure(statusOf(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} title={t('campusBoards.camps.drawer.title')} busy={busy} onClose={onClose}>
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
        <fieldset className="cb-fieldset">
          <legend className="cb-field__label">{t('campusBoards.camps.drawer.sitting')}</legend>
          <div className="cb-field-row cb-field-row--three">
            <label className="cb-field">
              <span className="cb-field__sub">{t('campusBoards.camps.drawer.start')}</span>
              <input type="time" value={draft.start} onChange={set('start')} required />
            </label>
            <label className="cb-field">
              <span className="cb-field__sub">{t('campusBoards.camps.drawer.end')}</span>
              <input type="time" value={draft.end} onChange={set('end')} required />
            </label>
            <label className="cb-field">
              <span className="cb-field__sub">{t('campusBoards.camps.drawer.capacity')}</span>
              <input type="number" inputMode="numeric" min={1} value={draft.capacity} onChange={set('capacity')} required />
            </label>
          </div>
        </fieldset>
        <label className="cb-field">
          <span className="cb-field__label">{t('campusBoards.camps.drawer.bring')}</span>
          <input value={draft.whatToBring} onChange={set('whatToBring')} maxLength={400} />
        </label>
        <div className="cb-field">
          <span className="cb-field__label">{t('campusBoards.camps.drawer.invited')}</span>
          <p className="cb-field__plain">{t('campusBoards.camps.drawer.invitedAll')}</p>
        </div>
        <div className="cb-field">
          <span className="cb-field__label">{t('campusBoards.camps.drawer.stations')}</span>
          <ul className="cb-chips" aria-label={t('campusBoards.camps.drawer.stations')}>
            {STATIONS.map((key) => <li key={key} className="cb-chip is-on">{t(key)}</li>)}
          </ul>
          <p className="cb-field__hint">{t('campusBoards.camps.drawer.stationsFixed')}</p>
        </div>
        {failure !== null ? (
          <div className="sk-note sk-note--danger" role="alert">
            <Icon name="alert-triangle" size={16} strokeWidth={2} />
            <span>{t('campusBoards.camps.drawer.failed', { ref: boardRef(failure, BOARD) })}</span>
          </div>
        ) : null}
        <SkButton type="submit" busy={busy} disabled={!ready} className="cb-form__submit">{t('campusBoards.camps.drawer.submit')}</SkButton>
        <p className="cb-field__hint">{t('campusBoards.camps.drawer.optIn')}</p>
      </form>
    </Drawer>
  );
}
