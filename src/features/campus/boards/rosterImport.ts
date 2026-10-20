/**
 * Reads a roster CSV in the browser for the campus "Import students" drawer
 * (design page 4, CampusRoster). Nothing here sends anything: the file is
 * parsed on the admin's computer so they can check it before an import
 * endpoint exists.
 */

/** The template's columns, in order (canvas: "name, roll_no, email, phone, programme, year, hostel, room"). */
export const ROSTER_FIELDS = ['name', 'roll_no', 'email', 'phone', 'programme', 'year', 'hostel', 'room'] as const;
export type RosterField = typeof ROSTER_FIELDS[number];

/** Columns a row cannot do without. */
const REQUIRED: readonly RosterField[] = ['name', 'roll_no', 'email'];

export type RowProblem = 'missingName' | 'missingRoll' | 'badEmail' | 'duplicateRoll';

export interface RosterCheck {
  /** Header text to template field, for each header the file has (null: not used). */
  mapping: Array<{ column: string; field: RosterField | null }>;
  /** Template fields the file has no column for. */
  missingFields: RosterField[];
  rows: number;
  ready: number;
  /** 1-based data-row numbers (the header is row 1, so the first data row is 2). */
  problems: Array<{ row: number; problem: RowProblem }>;
}

const QUOTE = '"';

/** RFC 4180-ish: commas, quoted fields, doubled quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === QUOTE && text[i + 1] === QUOTE) { field += QUOTE; i += 1; }
      else if (char === QUOTE) quoted = false;
      else field += char;
    } else if (char === QUOTE) {
      quoted = true;
    } else if (char === ',') {
      row.push(field); field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

const normalise = (header: string) => header.trim().toLowerCase().replace(/[\s.-]+/g, '_');
const ALIASES: Record<string, RosterField> = { roll: 'roll_no', roll_number: 'roll_no', rollno: 'roll_no', full_name: 'name', mobile: 'phone', block: 'hostel' };

function fieldFor(header: string): RosterField | null {
  const key = normalise(header);
  const direct = ROSTER_FIELDS.find((field) => field === key);
  return direct ?? ALIASES[key] ?? null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIRST_DATA_ROW = 2;

export function checkRoster(text: string): RosterCheck {
  const [header = [], ...data] = parseCsv(text.replace(/^﻿/, ''));
  const mapping = header.map((column) => ({ column: column.trim(), field: fieldFor(column) }));
  const indexOf = (field: RosterField) => mapping.findIndex((entry) => entry.field === field);
  const missingFields = ROSTER_FIELDS.filter((field) => indexOf(field) < 0);
  const seen = new Set<string>();
  const problems: RosterCheck['problems'] = [];
  data.forEach((cells, index) => {
    const value = (field: RosterField) => { const at = indexOf(field); return at < 0 ? '' : (cells[at] ?? '').trim(); };
    const row = index + FIRST_DATA_ROW;
    const roll = value('roll_no').toUpperCase();
    if (!value('name')) problems.push({ row, problem: 'missingName' });
    else if (!roll) problems.push({ row, problem: 'missingRoll' });
    else if (!EMAIL.test(value('email'))) problems.push({ row, problem: 'badEmail' });
    else if (seen.has(roll)) problems.push({ row, problem: 'duplicateRoll' });
    if (roll) seen.add(roll);
  });
  const badRows = new Set(problems.map((problem) => problem.row)).size;
  return { mapping, missingFields, rows: data.length, ready: data.length - badRows, problems };
}

export function rosterTemplate(): string {
  return `${ROSTER_FIELDS.join(',')}\n`;
}

export function hasRequiredColumns(check: RosterCheck): boolean {
  return REQUIRED.every((field) => !check.missingFields.includes(field));
}
