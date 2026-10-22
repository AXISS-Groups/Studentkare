import React from 'react';
import { StatusPill } from '../primitives';
import type { SkTone } from '../primitives';
import { Icon } from '../icons';
import type { SkIconName } from '../icons';
import './data.css';

/* ------------------------------------------------------------------ StatRow */

export type StatTone = 'text' | 'positive' | 'attention' | 'danger';

export interface Stat {
  /** `null` = no source reports this figure yet: shown as "—", never as 0. */
  value: string | null;
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
export interface StatRowProps {
  stats: Stat[];
  variant?: 'tile' | 'plain';
  /** Names the group for assistive tech, e.g. "Accounts summary". */
  label?: string;
}

const UNKNOWN_FIGURE = '\u2014';

export function StatRow({ stats, variant = 'tile', label }: StatRowProps): React.ReactElement {
  // A role on the <dl> itself drops its list semantics, leaving every <dt>/<dd> outside a list
  // (axe dlitem, live-run audit #10): the name goes on a wrapping group instead.
  const list = (
    <dl className={`sk-stats sk-stats--${variant}`}>
      {stats.map((stat) => (
        <div key={stat.label} className={`sk-stat sk-rise${stat.value === null ? ' is-unknown' : ''}`}>
          <dt className="sk-stat__label">{stat.label}</dt>
          <dd className={`sk-stat__value sk-stat__value--${stat.value === null ? 'unknown' : stat.tone ?? 'text'}`}>{stat.value ?? UNKNOWN_FIGURE}</dd>
          {stat.meta ? <dd className="sk-stat__meta">{stat.meta}</dd> : null}
        </div>
      ))}
    </dl>
  );
  return label ? <div role="group" aria-label={label}>{list}</div> : list;
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
  /** Buttons in the trailing actions column (needs `actionsLabel` on the table). */
  actions?: DataTableRowAction[];
}

export interface DataTableRowAction {
  label: string;
  onSelect: () => void;
  icon?: SkIconName;
  /** `primary` for the row's one main step; everything else is secondary. */
  variant?: 'primary' | 'secondary';
  /** Names the row for assistive tech when the label alone is ambiguous, e.g. "Open Krishna C.". */
  accessibleLabel?: string;
  /** While another change runs (one change at a time). */
  disabled?: boolean;
}

/** Row checkboxes. Every label arrives translated. */
export interface DataTableSelection {
  selectedIds: ReadonlySet<string>;
  onChange: (next: ReadonlySet<string>) => void;
  /** Accessible name of the header checkbox, e.g. "Select all rows". */
  selectAllLabel: string;
  /** Accessible name of a row's checkbox, e.g. "Select Aarav Sharma". */
  rowLabel: (row: DataTableRow) => string;
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
  /** One full-width row when there are no rows, e.g. a data source not connected yet. */
  emptyMessage?: { title: string; body: string };
  /** `card`: on a white card (most boards). `plain`: straight on the canvas (super admin). */
  variant?: 'card' | 'plain';
  /** Heading of the trailing actions column (visually hidden); rows then carry `actions`. */
  actionsLabel?: string;
  selection?: DataTableSelection;
  /** Below the table inside the card, e.g. pagination. */
  footer?: React.ReactNode;
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

function RowActions({ actions }: { actions: DataTableRowAction[] }): React.ReactElement {
  return (
    <span className="sk-table__actions">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          className={`sk-table__action sk-table__action--${action.variant ?? 'secondary'}`}
          aria-label={action.accessibleLabel}
          disabled={action.disabled}
          onClick={action.onSelect}
        >
          {action.icon ? <Icon name={action.icon} size={15} /> : null}
          {action.label}
        </button>
      ))}
    </span>
  );
}

function SelectBox({ checked, mixed = false, label, onToggle }: { checked: boolean; mixed?: boolean; label: string; onToggle: () => void }): React.ReactElement {
  return (
    <label className="sk-table__select">
      <input
        type="checkbox"
        checked={checked}
        aria-label={label}
        ref={(element) => { if (element) element.indeterminate = mixed; }}
        onChange={onToggle}
      />
    </label>
  );
}

/**
 * Console table. A real <table> for assistive tech; below 760 px each row
 * becomes a card with its column labels, so nothing scrolls sideways.
 * Optional row checkboxes (leading) and row actions (trailing).
 */
export function DataTable({
  caption, columns, rows, footnote, title, hideHeadings = false, emptyMessage, variant = 'card', actionsLabel, selection, footer,
}: DataTableProps): React.ReactElement {
  const withActions = Boolean(actionsLabel);
  const span = columns.length + (selection ? 1 : 0) + (withActions ? 1 : 0);
  const selectedCount = selection ? rows.filter((row) => selection.selectedIds.has(row.id)).length : 0;
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  const toggleAll = () => {
    if (!selection) return;
    selection.onChange(new Set(allSelected ? [] : rows.map((row) => row.id)));
  };
  const toggleRow = (id: string) => {
    if (!selection) return;
    const next = new Set(selection.selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    selection.onChange(next);
  };
  return (
    <div className={`sk-table-card sk-table-card--${variant} sk-rise`}>
      {title ? <h2 className="sk-table__title">{title}</h2> : null}
      <table className="sk-table">
        <caption className="sk-visually-hidden">{caption}</caption>
        <colgroup>
          {selection ? <col className="sk-table__col-select" /> : null}
          {columns.map((column) => <col key={column.label} style={column.width ? { width: column.width } : undefined} />)}
          {withActions ? <col className="sk-table__col-actions" /> : null}
        </colgroup>
        <thead className={[hideHeadings ? 'sk-visually-hidden' : '', selection && rows.length > 0 ? 'has-select' : ''].filter(Boolean).join(' ') || undefined}>
          <tr>
            {selection ? (
              <td className="sk-table__select-cell">
                {rows.length > 0 ? <SelectBox checked={allSelected} mixed={selectedCount > 0 && !allSelected} label={selection.selectAllLabel} onToggle={toggleAll} /> : null}
              </td>
            ) : null}
            {columns.map((column) => (
              <th key={column.label} scope="col" className={column.align === 'end' ? 'is-end' : undefined}>{column.label}</th>
            ))}
            {withActions ? <th scope="col" className="is-end"><span className="sk-visually-hidden">{actionsLabel}</span></th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && emptyMessage ? (
            <tr className="sk-table__empty">
              <td colSpan={span}>
                <strong>{emptyMessage.title}</strong>
                <span>{emptyMessage.body}</span>
              </td>
            </tr>
          ) : null}
          {rows.map((row) => {
            const selected = selection?.selectedIds.has(row.id) ?? false;
            const classes = [row.muted ? 'is-muted' : '', selected ? 'is-selected' : ''].filter(Boolean).join(' ');
            return (
              <tr key={row.id} className={classes || undefined}>
                {selection ? (
                  <td className="sk-table__select-cell">
                    <SelectBox checked={selected} label={selection.rowLabel(row)} onToggle={() => toggleRow(row.id)} />
                  </td>
                ) : null}
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
                {withActions ? (
                  <td className="is-end sk-table__actions-cell">
                    {row.actions?.length ? <RowActions actions={row.actions} /> : null}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
      {footnote ? <p className="sk-table__footnote">{footnote}</p> : null}
      {footer}
    </div>
  );
}
