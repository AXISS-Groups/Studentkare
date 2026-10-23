import React from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import type { DataTableColumn } from '@/design-system/data/DataTable';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { EmergencyLines } from './safetyKit';
import './campus-safety.css';

/**
 * The four Tier 1 table boards of design page 4 that share one layout
 * (CampusIsolation, CampusAmbulance, CampusSla, CampusDischarge): header, four
 * figures, one table card and the board's rule underneath.
 *
 * None has a data source: there are no isolation bays, stays or daily checks,
 * no vehicle or GPS feed, no escalation timers and no clinician discharge
 * sign-off in the server. So each board draws its real layout with every
 * figure as "—", its designed columns and a plain "not connected" line, and
 * never a sample row, name, bay, vehicle, registration number or time. A
 * board's closing sentence is kept only where it states a rule that is true
 * of this page; one that describes behaviour the app does not have (a breached
 * timer escalating to a named person) is left out.
 */
export type SafetyBoardId = 'isolation' | 'ambulance' | 'sla' | 'discharge';

interface SafetySpec {
  /** Canvas board name, for the error reference. */
  board: string;
  title: MessageKey;
  subtitle: MessageKey;
  stats: readonly MessageKey[];
  columns: ReadonlyArray<{ label: MessageKey; width?: string; align?: 'end' }>;
  /** The board's rule, shown whether or not data is connected. */
  note?: MessageKey;
  unconnectedTitle: MessageKey;
  unconnectedBody: MessageKey;
  empty: MessageKey;
  error: MessageKey;
  loading: MessageKey;
}

const ID_WIDTH = '110px';
const STATE_WIDTH = '170px';

export const SAFETY_BOARDS: Record<SafetyBoardId, SafetySpec> = {
  isolation: {
    board: 'CampusIsolation',
    title: 'campusSafety.isolation.title',
    subtitle: 'campusSafety.isolation.subtitle',
    stats: ['campusSafety.isolation.stat.occupied', 'campusSafety.isolation.stat.overdue', 'campusSafety.isolation.stat.extended', 'campusSafety.isolation.stat.median'],
    columns: [
      { label: 'campusSafety.isolation.col.bay', width: ID_WIDTH },
      { label: 'campusSafety.isolation.col.student', width: '140px' },
      { label: 'campusSafety.isolation.col.reason' },
      { label: 'campusSafety.isolation.col.check', width: '220px' },
      { label: 'campusSafety.isolation.col.status', width: STATE_WIDTH, align: 'end' },
    ],
    note: 'campusSafety.isolation.note',
    unconnectedTitle: 'campusSafety.isolation.unconnectedTitle',
    unconnectedBody: 'campusSafety.isolation.unconnectedBody',
    empty: 'campusSafety.isolation.empty',
    error: 'campusSafety.isolation.error',
    loading: 'campusSafety.isolation.loading',
  },
  ambulance: {
    board: 'CampusAmbulance',
    title: 'campusSafety.ambulance.title',
    subtitle: 'campusSafety.ambulance.subtitle',
    stats: ['campusSafety.ambulance.stat.live', 'campusSafety.ambulance.stat.median', 'campusSafety.ambulance.stat.transfer', 'campusSafety.ambulance.stat.vehicle'],
    columns: [
      { label: 'campusSafety.ambulance.col.call', width: ID_WIDTH },
      { label: 'campusSafety.ambulance.col.destination' },
      { label: 'campusSafety.ambulance.col.vehicle', width: '180px' },
      { label: 'campusSafety.ambulance.col.eta', width: '150px' },
      { label: 'campusSafety.ambulance.col.state', width: '130px', align: 'end' },
    ],
    note: 'campusSafety.ambulance.note',
    unconnectedTitle: 'campusSafety.ambulance.unconnectedTitle',
    unconnectedBody: 'campusSafety.ambulance.unconnectedBody',
    empty: 'campusSafety.ambulance.empty',
    error: 'campusSafety.ambulance.error',
    loading: 'campusSafety.ambulance.loading',
  },
  sla: {
    board: 'CampusSla',
    title: 'campusSafety.sla.title',
    subtitle: 'campusSafety.sla.subtitle',
    stats: ['campusSafety.sla.stat.breached', 'campusSafety.sla.stat.within', 'campusSafety.sla.stat.worst', 'campusSafety.sla.stat.autoClosed'],
    columns: [
      { label: 'campusSafety.sla.col.request', width: ID_WIDTH },
      { label: 'campusSafety.sla.col.waiting' },
      { label: 'campusSafety.sla.col.target', width: '100px' },
      { label: 'campusSafety.sla.col.elapsed', width: '110px' },
      { label: 'campusSafety.sla.col.escalation', width: '210px', align: 'end' },
    ],
    unconnectedTitle: 'campusSafety.sla.unconnectedTitle',
    unconnectedBody: 'campusSafety.sla.unconnectedBody',
    empty: 'campusSafety.sla.empty',
    error: 'campusSafety.sla.error',
    loading: 'campusSafety.sla.loading',
  },
  discharge: {
    board: 'CampusDischarge',
    title: 'campusSafety.discharge.title',
    subtitle: 'campusSafety.discharge.subtitle',
    stats: ['campusSafety.discharge.stat.issued', 'campusSafety.discharge.stat.extended', 'campusSafety.discharge.stat.refused', 'campusSafety.discharge.stat.unsigned'],
    columns: [
      { label: 'campusSafety.discharge.col.bay', width: '90px' },
      { label: 'campusSafety.discharge.col.student', width: '130px' },
      { label: 'campusSafety.discharge.col.clearance' },
      { label: 'campusSafety.discharge.col.certifiedBy', width: '230px' },
      { label: 'campusSafety.discharge.col.state', width: STATE_WIDTH, align: 'end' },
    ],
    note: 'campusSafety.discharge.note',
    unconnectedTitle: 'campusSafety.discharge.unconnectedTitle',
    unconnectedBody: 'campusSafety.discharge.unconnectedBody',
    empty: 'campusSafety.discharge.empty',
    error: 'campusSafety.discharge.error',
    loading: 'campusSafety.discharge.loading',
  },
};

/** The board's 3D tile in its empty state (every page-4 board draws this one). */
const EMPTY_TILE = 'chart-alt--p4';

export function SafetyTableBoard({ id }: { id: SafetyBoardId }): React.ReactElement {
  const t = useT();
  const spec = SAFETY_BOARDS[id];
  const columns: DataTableColumn[] = spec.columns.map((column) => ({ label: t(column.label), width: column.width, align: column.align }));
  // Ambulance: the state's 108 service is the only dispatch that works today, so it leads the page.
  const actions = id === 'ambulance' ? <EmergencyLines numbers={['108']} icon="ambulance-2" trailing="arrow-right" /> : undefined;
  return (
    <ConsoleTablePage
      className="cs-board"
      status="unconnected"
      header={{ title: t(spec.title), subtitle: t(spec.subtitle), actions }}
      statLabels={spec.stats.map((key) => t(key))}
      table={{ caption: t(spec.title), columns, rows: [], footnote: spec.note ? t(spec.note) : undefined }}
      unconnected={{ title: t(spec.unconnectedTitle), body: t(spec.unconnectedBody) }}
      empty={{ title: t(spec.empty), body: t('campusSafety.emptyBody'), icon3d: EMPTY_TILE, action: { label: t('campusSafety.emptyCta'), onSelect: () => navigate('campus/students') } }}
      error={{ title: t(spec.error), reference: t('campusBoards.ref', { code: 'NET', board: spec.board }), onRetry: () => undefined }}
      loadingLabel={t(spec.loading)}
    />
  );
}

export function CampusIsolationScreen(): React.ReactElement { return <SafetyTableBoard id="isolation" />; }
export function CampusAmbulanceScreen(): React.ReactElement { return <SafetyTableBoard id="ambulance" />; }
export function CampusSlaScreen(): React.ReactElement { return <SafetyTableBoard id="sla" />; }
export function CampusDischargeScreen(): React.ReactElement { return <SafetyTableBoard id="discharge" />; }
