import React from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import type { DataTableColumn } from '@/design-system/data/DataTable';
import { CanvasImage } from '@/design-system/art/CanvasMedia';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import './campus-boards.css';

/**
 * The five public-health and configuration boards of design page 4 that share
 * one layout: header, four figures, one table card (CampusWater,
 * CampusSanitary, CampusMess, CampusBlocks, CampusOutbreak; Tier 2/3).
 *
 * None has a data source: no water sensor or lab feed, no inspection log, no
 * diet register, no block configuration and no symptom surveillance reaches
 * the server. So each board draws its real layout with every figure as "—",
 * its designed columns and a plain "not connected" line. Never a sample row,
 * and never the board's closing sentence where it describes behaviour the app
 * does not have yet (a threshold opening an incident, a lab result cutting a
 * supply).
 */
export type RadarBoardId = 'water' | 'sanitary' | 'mess' | 'blocks' | 'outbreak';

interface RadarSpec {
  /** Canvas board name, for the error reference. */
  board: string;
  stats: readonly MessageKey[];
  columns: ReadonlyArray<{ label: MessageKey; width?: string; align?: 'end' }>;
  /** The board's picture top right (CampusOutbreak). */
  art?: 'image-b2694b.png';
}

const STATE_WIDTH = '170px';
const NUMBER_WIDTH = '120px';

export const RADAR_BOARDS: Record<RadarBoardId, RadarSpec> = {
  water: {
    board: 'CampusWater',
    stats: ['campusBoards.water.stat.outOfLimit', 'campusBoards.water.stat.offline', 'campusBoards.water.stat.supplyCut', 'campusBoards.water.stat.lastLab'],
    columns: [
      { label: 'campusBoards.water.col.point', width: '150px' },
      { label: 'campusBoards.water.col.reading' },
      { label: 'campusBoards.water.col.limit', width: NUMBER_WIDTH },
      { label: 'campusBoards.water.col.source', width: '150px' },
      { label: 'campusBoards.water.col.state', width: STATE_WIDTH, align: 'end' },
    ],
  },
  sanitary: {
    board: 'CampusSanitary',
    stats: ['campusBoards.sanitary.stat.closed', 'campusBoards.sanitary.stat.reinspect', 'campusBoards.sanitary.stat.overdue', 'campusBoards.sanitary.stat.mean'],
    columns: [
      { label: 'campusBoards.sanitary.col.area', width: '150px' },
      { label: 'campusBoards.sanitary.col.last' },
      { label: 'campusBoards.sanitary.col.score', width: NUMBER_WIDTH },
      { label: 'campusBoards.sanitary.col.inspector', width: '150px' },
      { label: 'campusBoards.sanitary.col.state', width: STATE_WIDTH, align: 'end' },
    ],
  },
  mess: {
    board: 'CampusMess',
    stats: ['campusBoards.mess.stat.active', 'campusBoards.mess.stat.anaphylaxis', 'campusBoards.mess.stat.confirmed', 'campusBoards.mess.stat.diagnoses'],
    columns: [
      { label: 'campusBoards.mess.col.student', width: '150px' },
      { label: 'campusBoards.mess.col.requirement' },
      { label: 'campusBoards.mess.col.source', width: '170px' },
      { label: 'campusBoards.mess.col.kitchen', width: '190px' },
      { label: 'campusBoards.mess.col.state', width: STATE_WIDTH, align: 'end' },
    ],
  },
  blocks: {
    board: 'CampusBlocks',
    stats: ['campusBoards.blocks.stat.blocks', 'campusBoards.blocks.stat.rooms', 'campusBoards.blocks.stat.belowCover', 'campusBoards.blocks.stat.noWarden'],
    columns: [
      { label: 'campusBoards.blocks.col.block', width: '130px' },
      { label: 'campusBoards.blocks.col.config' },
      { label: 'campusBoards.blocks.col.rooms', width: NUMBER_WIDTH },
      { label: 'campusBoards.blocks.col.warden', width: '150px' },
      { label: 'campusBoards.blocks.col.cover', width: STATE_WIDTH, align: 'end' },
    ],
  },
  outbreak: {
    board: 'CampusOutbreak',
    stats: ['campusBoards.outbreak.stat.over', 'campusBoards.outbreak.stat.watching', 'campusBoards.outbreak.stat.floor', 'campusBoards.outbreak.stat.names'],
    columns: [
      { label: 'campusBoards.outbreak.col.block', width: '130px' },
      { label: 'campusBoards.outbreak.col.signal' },
      { label: 'campusBoards.outbreak.col.baseline', width: '130px' },
      { label: 'campusBoards.outbreak.col.now', width: '130px' },
      { label: 'campusBoards.outbreak.col.state', width: STATE_WIDTH, align: 'end' },
    ],
    art: 'image-b2694b.png',
  },
};

const COPY: Record<RadarBoardId, { title: MessageKey; subtitle: MessageKey; unconnectedTitle: MessageKey; unconnectedBody: MessageKey; empty: MessageKey; error: MessageKey; loading: MessageKey }> = {
  water: { title: 'campusBoards.water.title', subtitle: 'campusBoards.water.subtitle', unconnectedTitle: 'campusBoards.water.unconnectedTitle', unconnectedBody: 'campusBoards.water.unconnectedBody', empty: 'campusBoards.water.empty', error: 'campusBoards.water.error', loading: 'campusBoards.water.loading' },
  sanitary: { title: 'campusBoards.sanitary.title', subtitle: 'campusBoards.sanitary.subtitle', unconnectedTitle: 'campusBoards.sanitary.unconnectedTitle', unconnectedBody: 'campusBoards.sanitary.unconnectedBody', empty: 'campusBoards.sanitary.empty', error: 'campusBoards.sanitary.error', loading: 'campusBoards.sanitary.loading' },
  mess: { title: 'campusBoards.mess.title', subtitle: 'campusBoards.mess.subtitle', unconnectedTitle: 'campusBoards.mess.unconnectedTitle', unconnectedBody: 'campusBoards.mess.unconnectedBody', empty: 'campusBoards.mess.empty', error: 'campusBoards.mess.error', loading: 'campusBoards.mess.loading' },
  blocks: { title: 'campusBoards.blocks.title', subtitle: 'campusBoards.blocks.subtitle', unconnectedTitle: 'campusBoards.blocks.unconnectedTitle', unconnectedBody: 'campusBoards.blocks.unconnectedBody', empty: 'campusBoards.blocks.empty', error: 'campusBoards.blocks.error', loading: 'campusBoards.blocks.loading' },
  outbreak: { title: 'campusBoards.outbreak.title', subtitle: 'campusBoards.outbreak.subtitle', unconnectedTitle: 'campusBoards.outbreak.unconnectedTitle', unconnectedBody: 'campusBoards.outbreak.unconnectedBody', empty: 'campusBoards.outbreak.empty', error: 'campusBoards.outbreak.error', loading: 'campusBoards.outbreak.loading' },
};

/** The board's 3D tile in its empty state (every page-4 board draws this one). */
const EMPTY_TILE = 'chart-alt--p4';

export function RadarBoard({ id }: { id: RadarBoardId }): React.ReactElement {
  const t = useT();
  const spec = RADAR_BOARDS[id];
  const copy = COPY[id];
  const columns: DataTableColumn[] = spec.columns.map((column) => ({ label: t(column.label), width: column.width, align: column.align }));
  return (
    <ConsoleTablePage
      className="cb-board"
      status="unconnected"
      header={{
        title: t(copy.title),
        subtitle: t(copy.subtitle),
        actions: spec.art ? <CanvasImage name={spec.art} className="cb-art" width={112} height={104} /> : undefined,
      }}
      statLabels={spec.stats.map((key) => t(key))}
      table={{ caption: t(copy.title), columns, rows: [] }}
      unconnected={{ title: t(copy.unconnectedTitle), body: t(copy.unconnectedBody) }}
      empty={{ title: t(copy.empty), body: t('campusBoards.emptyBody'), icon3d: EMPTY_TILE, action: { label: t('campusBoards.emptyCta'), onSelect: () => navigate('campus/students') } }}
      error={{ title: t(copy.error), reference: t('campusBoards.ref', { code: 'NET', board: spec.board }), onRetry: () => undefined }}
      loadingLabel={t(copy.loading)}
    />
  );
}

export function CampusWaterScreen(): React.ReactElement { return <RadarBoard id="water" />; }
export function CampusSanitaryScreen(): React.ReactElement { return <RadarBoard id="sanitary" />; }
export function CampusMessScreen(): React.ReactElement { return <RadarBoard id="mess" />; }
export function CampusBlocksScreen(): React.ReactElement { return <RadarBoard id="blocks" />; }
export function CampusOutbreakScreen(): React.ReactElement { return <RadarBoard id="outbreak" />; }
