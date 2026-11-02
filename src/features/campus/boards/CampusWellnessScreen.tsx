import React from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import type { DataTableRow, Stat } from '@/design-system/data/DataTable';
import { apiRequest } from '@/data/services/http';
import { useLanguage, useT } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { CAMPUS_MIN_GROUP, groupFigure, useBoardLoad, useBoardRef } from './boardKit';
import './campus-boards.css';

/** One sitting of a wellness session, as GET /wellness/timetable returns it. */
interface WellnessSitting {
  slotId: string;
  slotStart: string;
  slotEnd: string;
  capacity: number;
  spotsLeft: number;
}

export interface WellnessSession {
  id: string;
  name: string;
  category: string;
  description: string;
  /** What the listing calls the format: a venue, "Mats provided", a duration. */
  pack: string;
  pricePaise: number;
  providerName: string;
  sittings: WellnessSitting[];
}

export interface WellnessSource { load(): Promise<WellnessSession[]> }

/** The same timetable the student screen reads: what students see is what the campus sees. */
const liveWellnessSource: WellnessSource = {
  load: () => apiRequest<WellnessSession[]>('/wellness/timetable'),
};

const BOARD = 'CampusWellness';

/**
 * Wellness workshops (design page 4, CampusWellness; Tier 3). One row per
 * upcoming sitting. Take-up is the real booking count, never who booked: the
 * endpoint returns no names to anyone. A sitting with fewer bookings than the
 * campus minimum group size shows "fewer than N", not the number.
 */
export function CampusWellnessScreen({ source = liveWellnessSource }: { source?: WellnessSource }): React.ReactElement {
  const t = useT();
  const { lang } = useLanguage();
  const boardRef = useBoardRef();
  const { state, retry } = useBoardLoad(source.load);
  const locale = lang === 'en' ? 'en-IN' : `${lang}-IN`;

  const when = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    const day = date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
    const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
    return t('campusBoards.wellness.when', { day, time });
  };
  const count = (value: number) => value.toLocaleString(locale);

  const sittings = state.kind === 'ready'
    ? state.data.flatMap((session) => session.sittings.map((sitting) => ({ session, sitting })))
      .sort((a, b) => a.sitting.slotStart.localeCompare(b.sitting.slotStart))
    : [];
  const bookedOf = (sitting: WellnessSitting) => Math.max(sitting.capacity - sitting.spotsLeft, 0);
  // The total counts only sittings that are shown: adding a withheld sitting in
  // would let anyone subtract the others and recover it.
  const withheldAny = sittings.some(({ sitting }) => !groupFigure(bookedOf(sitting)).shown);
  const taken = sittings.reduce((sum, { sitting }) => (groupFigure(bookedOf(sitting)).shown ? sum + bookedOf(sitting) : sum), 0);
  const full = sittings.filter(({ sitting }) => sitting.spotsLeft === 0).length;
  const allTaken = sittings.reduce((sum, { sitting }) => sum + bookedOf(sitting), 0);
  const takenText = !groupFigure(allTaken).shown
    ? t('campusBoards.withheld', { floor: CAMPUS_MIN_GROUP })
    : withheldAny ? t('campusBoards.atLeast', { count: count(taken) }) : count(taken);

  const stats: Stat[] = [
    { label: t('campusBoards.wellness.stat.upcoming'), value: count(sittings.length) },
    { label: t('campusBoards.wellness.stat.taken'), value: takenText },
    { label: t('campusBoards.wellness.stat.full'), value: count(full), tone: full > 0 ? 'attention' : 'text' },
    // The timetable carries no attendee identity, so nothing about who attended can reach a faculty.
    { label: t('campusBoards.wellness.stat.reported'), value: count(0), tone: 'positive' },
  ];

  const rows: DataTableRow[] = sittings.map(({ session, sitting }) => {
    const figure = groupFigure(bookedOf(sitting));
    const isFull = sitting.spotsLeft === 0;
    return {
      id: sitting.slotId,
      cells: [
        { text: when(sitting.slotStart), weight: 'strong' },
        { text: t('campusBoards.wellness.session', { name: session.name, provider: session.providerName }) },
        { text: session.pack || t('campusBoards.notGiven'), weight: 'muted' },
        {
          text: figure.shown
            ? t('campusBoards.wellness.signedUp', { taken: count(figure.value), capacity: count(sitting.capacity) })
            : t('campusBoards.wellness.signedUpWithheld', { floor: CAMPUS_MIN_GROUP, capacity: count(sitting.capacity) }),
        },
        { pill: isFull ? { label: t('campusBoards.wellness.full'), tone: 'action' } : { label: t('campusBoards.wellness.open'), tone: 'positive' } },
      ],
    };
  });

  const status = state.kind === 'loading' ? 'loading' : state.kind === 'failed' ? 'error' : rows.length === 0 ? 'empty' : 'ready';

  return (
    <ConsoleTablePage
      className="cb-board"
      status={status}
      header={{
        title: t('campusBoards.wellness.title'),
        subtitle: t('campusBoards.wellness.subtitle'),
        badge: full > 0 ? { label: t('campusBoards.wellness.badgeFull', { count: full }), tone: 'action' } : undefined,
      }}
      note={(
        <p className="cb-scope-note">{t('campusBoards.wellness.scopeNote')}</p>
      )}
      stats={stats}
      statLabels={stats.map((stat) => stat.label)}
      table={{
        caption: t('campusBoards.wellness.title'),
        columns: [
          { label: t('campusBoards.wellness.col.date'), width: '150px' },
          { label: t('campusBoards.wellness.col.session') },
          { label: t('campusBoards.wellness.col.place'), width: '170px' },
          { label: t('campusBoards.wellness.col.signedUp'), width: '170px' },
          { label: t('campusBoards.wellness.col.state'), width: '110px', align: 'end' },
        ],
        rows,
        footnote: t('campusBoards.wellness.footnote', { floor: CAMPUS_MIN_GROUP }),
      }}
      unconnected={{ title: t('campusBoards.wellness.error'), body: '' }}
      empty={{ title: t('campusBoards.wellness.empty'), body: t('campusBoards.wellness.emptyBody'), icon3d: 'chart-alt--p4', action: { label: t('campusBoards.emptyCta'), onSelect: () => navigate('campus/students') } }}
      error={{ title: t('campusBoards.wellness.error'), reference: boardRef(state.kind === 'failed' ? state.status : 0, BOARD), onRetry: retry, onHelp: () => navigate('support') }}
      loadingLabel={t('campusBoards.wellness.loading')}
    />
  );
}
