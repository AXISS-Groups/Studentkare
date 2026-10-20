/**
 * Doctor application — WebClinicianApply / ClinicianApply (design page 5, Tier 2).
 * Four steps from the canvas, and the checks each field must pass. Pure data:
 * every label is an i18n key (`clinApply.*`), every stored value an option id.
 *
 * Only what the backend can stand behind. There is no fee setting and no
 * register lookup on the server, so the canvas's fee choice ("₹199 · We keep
 * 10%") is not asked, and the registration number is checked for its format
 * only — the copy never says it is verified against the council register.
 */
import type { MessageKey } from '@/i18n';

export interface ApplyOption {
  id: string;
  label: MessageKey;
}

export type ApplyField =
  | { kind: 'text'; key: string; label: MessageKey; placeholder: MessageKey; pattern?: RegExp; error?: MessageKey; mono?: boolean; autoComplete?: string; inputMode?: 'numeric' | 'text' }
  | { kind: 'choice'; key: string; label: MessageKey; options: ApplyOption[] }
  | { kind: 'multi'; key: string; label: MessageKey; options: ApplyOption[] }
  | { kind: 'upload'; key: string; label: MessageKey }
  | { kind: 'agree'; key: string; label: MessageKey };

export interface ApplyStep {
  id: string;
  title: MessageKey;
  note?: MessageKey;
  fields: ApplyField[];
}

export const APPLY_STEPS: ApplyStep[] = [
  {
    id: 'registration',
    title: 'clinApply.step1.title',
    note: 'clinApply.step1.note',
    fields: [
      { kind: 'text', key: 'name', label: 'clinApply.name', placeholder: 'clinApply.namePh', autoComplete: 'name' },
      { kind: 'text', key: 'nmc', label: 'clinApply.nmc', placeholder: 'clinApply.nmcPh', pattern: /^[A-Z]{0,5}[- ]?[0-9]{4,7}$/i, error: 'clinApply.err.nmc', mono: true },
      {
        kind: 'choice', key: 'council', label: 'clinApply.council',
        options: [
          { id: 'nmc', label: 'clinApply.council.nmc' },
          { id: 'telangana', label: 'clinApply.council.telangana' },
          { id: 'andhra', label: 'clinApply.council.andhra' },
          { id: 'other', label: 'clinApply.council.other' },
        ],
      },
      { kind: 'upload', key: 'regdoc', label: 'clinApply.regdoc' },
    ],
  },
  {
    id: 'qualifications',
    title: 'clinApply.step2.title',
    fields: [
      {
        kind: 'choice', key: 'degree', label: 'clinApply.degree',
        options: [
          { id: 'mbbs', label: 'clinApply.degree.mbbs' },
          { id: 'md', label: 'clinApply.degree.md' },
          { id: 'dnb', label: 'clinApply.degree.dnb' },
          { id: 'ayush', label: 'clinApply.degree.ayush' },
        ],
      },
      { kind: 'text', key: 'speciality', label: 'clinApply.speciality', placeholder: 'clinApply.specialityPh' },
      { kind: 'upload', key: 'degdoc', label: 'clinApply.degdoc' },
      { kind: 'text', key: 'years', label: 'clinApply.years', placeholder: 'clinApply.yearsPh', pattern: /^[0-9]{1,2}$/, error: 'clinApply.err.years', inputMode: 'numeric' },
    ],
  },
  {
    id: 'consults',
    title: 'clinApply.step3.title',
    fields: [
      {
        kind: 'multi', key: 'modes', label: 'clinApply.modes',
        options: [
          { id: 'video', label: 'clinApply.mode.video' },
          { id: 'chat', label: 'clinApply.mode.chat' },
          { id: 'clinic', label: 'clinApply.mode.clinic' },
        ],
      },
      {
        kind: 'multi', key: 'languages', label: 'clinApply.languages',
        options: [
          { id: 'en', label: 'clinApply.lang.en' },
          { id: 'te', label: 'clinApply.lang.te' },
          { id: 'hi', label: 'clinApply.lang.hi' },
          { id: 'ur', label: 'clinApply.lang.ur' },
        ],
      },
    ],
  },
  {
    id: 'rules',
    title: 'clinApply.step4.title',
    fields: [
      { kind: 'agree', key: 'a1', label: 'clinApply.rule1' },
      { kind: 'agree', key: 'a2', label: 'clinApply.rule2' },
      { kind: 'agree', key: 'a3', label: 'clinApply.rule3' },
      { kind: 'agree', key: 'a4', label: 'clinApply.rule4' },
    ],
  },
];

/**
 * What happens after submitting, in order (the canvas's tracker). No times:
 * nothing on the server commits to one, so none is promised.
 */
export const APPLY_TRACK: MessageKey[] = [
  'clinApply.track.submitted',
  'clinApply.track.registration',
  'clinApply.track.interview',
  'clinApply.track.trial',
  'clinApply.track.live',
];

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

export type ApplyValue = string | string[] | boolean | UploadedFile;
export type ApplyValues = Record<string, ApplyValue | undefined>;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const UPLOAD_TYPES = /^(application\/pdf|image\/(jpeg|png|heic|heif|webp))$/;
const MIN_TEXT = 2;

/** Checks a picked file before it is kept; the message says what to do. */
export function checkUpload(file: UploadedFile): MessageKey | null {
  if (!UPLOAD_TYPES.test(file.type)) return 'clinApply.err.fileType';
  if (file.size > MAX_UPLOAD_BYTES) return 'clinApply.err.fileSize';
  return null;
}

/** Null when the field is fine; otherwise the message key shown under it. */
export function fieldError(field: ApplyField, value: ApplyValue | undefined): MessageKey | null {
  switch (field.kind) {
    case 'text': {
      const text = typeof value === 'string' ? value.trim() : '';
      if (text.length === 0) return 'clinApply.err.empty';
      if (field.pattern) return field.pattern.test(text) ? null : field.error ?? 'clinApply.err.check';
      return text.length >= MIN_TEXT ? null : 'clinApply.err.check';
    }
    case 'choice':
      return typeof value === 'string' && field.options.some((option) => option.id === value) ? null : 'clinApply.err.choose';
    case 'multi':
      return Array.isArray(value) && value.length > 0 ? null : 'clinApply.err.chooseAny';
    case 'upload':
      return value && typeof value === 'object' && !Array.isArray(value) ? null : 'clinApply.err.upload';
    case 'agree':
      return value === true ? null : 'clinApply.err.agree';
  }
}

export function stepErrors(step: ApplyStep, values: ApplyValues): Record<string, MessageKey> {
  const errors: Record<string, MessageKey> = {};
  for (const field of step.fields) {
    const error = fieldError(field, values[field.key]);
    if (error) errors[field.key] = error;
  }
  return errors;
}
