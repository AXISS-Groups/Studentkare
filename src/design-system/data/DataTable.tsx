import React from 'react';
import { StatusPill } from '../primitives';
import type { SkTone } from '../primitives';
import './data.css';

/* ------------------------------------------------------------------ StatRow */

export type StatTone = 'text' | 'positive' | 'attention' | 'danger';

export interface Stat {
  value: string;
  label: string;
  tone?: StatTone;
  /** One line under the value (plain variant), e.g. "Oldest 38 minutes". */
  meta?: string;
}

/**
 * The four figures above a console table. Numbers are coloured by meaning only.
 * `tile`: white cards (most screens). `plain`: eyebrow, value and meta on the
 * canvas (critical results, report reviews).
 */
export function StatRow({ stats, variant = 'tile' }: { stats: Stat[]; variant?: 'tile' | 'plain' }): React.ReactElement {
  return (
    <dl className={`sk-stats sk-stats--${variant}`}>
      {stats.map((stat) => (
        <div key={stat.label} className="sk-stat sk-rise">
          <dt className="sk-stat__label">{variant === 'plain' ? stat.label.toUpperCase() : stat.label}</dt>
          <dd className={`sk-stat__value sk-stat__value--${stat.tone ?? 'text'}`}>{stat.value}</dd>
          {stat.meta ? <dd className="sk-stat__meta">{stat.meta}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

/* ---------------------------------------------------------------- DataTable */

export interface DataTableColumn {
  label: string;
  /** CSS width for the column, e.g. "140px"; omit for the flexible column. */
  width?: string;
  align?: 'start' | 'end';
}

export type CellTone = 'action' | 'attention' | 'danger' | 'positive';

export interface TextCell {
  text: string;
  /** Second line in the meta style. */
  sub?: string;
  /** `strong` for names and identifiers; `muted` for dates and meta. */
  weight?: 'strong' | 'regular' | 'muted';
  tone?: CellTone;
  mono?: boolean;
}

export interface PillCell {
  pill: { label: string; tone: SkTone };
}

/** Anything else — a flag badge, a row action. */
export interface NodeCell {
  node: React.ReactNode;
}

export type DataTableCell = TextCell | PillCell | NodeCell;

export interface DataTableRow {
  id: string;
  /** One cell per column, in column order. The first is the row header. */
  cells: DataTableCell[];
  /** A row kept for the record but no longer live (lapsed, ended). */
  muted?: boolean;
}

export interface DataTableProps {
  caption: string;
  columns: DataTableColumn[];
  rows: DataTableRow[];
  footnote?: string;
  /** Heading inside the card (e.g. "This week"). */
  title?: string;
  /** Keep column headings for assistive tech only. */
  hideHeadings?: boolean;
}

function isPill(cell: DataTableCell): cell is PillCell {
  return 'pill' in cell;
}

function CellContent({ cell }: { cell: DataTableCell }): React.ReactElement {
  if ('node' in cell) return <>{cell.node}</>;
  if (isPill(cell)) return <StatusPill tone={cell.pill.tone} className="sk-table__pill">{cell.pill.label}</StatusPill>;
  const classes = [
    'sk-table__text',
    `sk-table__text--${cell.weight ?? 'regular'}`,
    cell.tone ? `sk-table__text--${cell.tone}` : '',
    cell.mono ? 'sk-mono' : '',
  ].filter(Boolean).join(' ');
  return (
    <>
      <span className={classes}>{cell.text}</span>
      {cell.sub ? <span className="sk-table__sub">{cell.sub}</span> : null}
    </>
  );
}

/**
 * Console table. A real <table> for assistive tech; below 760 px each row
 * becomes a card with its column labels, so nothing scrolls sideways.
 */
export function DataTable({ caption, columns, rows, footnote, title, hideHeadings = false }: DataTableProps): React.ReactElement {
  return (
    <div className="sk-table-card sk-rise">
      {title ? <h2 className="sk-table__title">{title}</h2> : null}
      <table className="sk-table">
        <caption className="sk-visually-hidden">{caption}</caption>
        <colgroup>
          {columns.map((column) => <col key={column.label} style={column.width ? { width: column.width } : undefined} />)}
        </colgroup>
        <thead className={hideHeadings ? 'sk-visually-hidden' : undefined}>
          <tr>
            {columns.map((column) => (
              <th key={column.label} scope="col" className={column.align === 'end' ? 'is-end' : undefined}>{column.label.toUpperCase()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.muted ? 'is-muted' : undefined}>
              {row.cells.map((cell, index) => {
                const column = columns[index];
                const Tag = index === 0 ? 'th' : 'td';
                return (
                  <Tag
                    key={column?.label ?? index}
                    scope={index === 0 ? 'row' : undefined}
                    data-label={column?.label}
                    className={column?.align === 'end' ? 'is-end' : undefined}
                  >
                    <CellContent cell={cell} />
                  </Tag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {footnote ? <p className="sk-table__footnote">{footnote}</p> : null}
    </div>
  );
}
