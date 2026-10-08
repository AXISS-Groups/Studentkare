/**
 * Doctor application — WebClinicianApply / ClinicianApply (design page 5, Tier 3).
 * Four steps from the canvas, and the checks each field must pass. Pure data.
 */

export type ApplyField =
  | { kind: 'text'; key: string; label: string; placeholder: string; pattern?: RegExp; error?: string; mono?: boolean; autoComplete?: string; inputMode?: 'numeric' | 'text' }
  | { kind: 'choice'; key: string; label: string; options: string[]; hint?: string }
  | { kind: 'multi'; key: string; label: string; options: string[] }
  | { kind: 'upload'; key: string; label: string }
  | { kind: 'agree'; key: string; label: string };

export interface ApplyStep {
  title: string;
  note?: string;
  fields: ApplyField[];
}

export const APPLY_STEPS: ApplyStep[] = [
  {
    title: 'You and your registration',
    note: 'We check your number against the NMC / state council register before anything else.',
    fields: [
      { kind: 'text', key: 'name', label: 'Full name as registered', placeholder: 'Dr. Sameer Menon', autoComplete: 'name' },
      { kind: 'text', key: 'nmc', label: 'NMC / state council registration no.', placeholder: '71842', pattern: /^[A-Z]{0,5}[- ]?[0-9]{4,7}$/i, error: 'Numbers only, e.g. 71842', mono: true },
      { kind: 'choice', key: 'council', label: 'Council', options: ['NMC (national)', 'Telangana State', 'Andhra Pradesh', 'Other state'] },
      { kind: 'upload', key: 'regdoc', label: 'Registration certificate' },
    ],
  },
  {
    title: 'Qualifications',
    fields: [
      { kind: 'choice', key: 'degree', label: 'Highest qualification', options: ['MBBS', 'MD / MS', 'DNB', 'BAMS / BHMS (AYUSH)'] },
      { kind: 'text', key: 'speciality', label: 'Speciality', placeholder: 'General medicine' },
      { kind: 'upload', key: 'degdoc', label: 'Degree certificate' },
      { kind: 'text', key: 'years', label: 'Years in practice', placeholder: '8', pattern: /^[0-9]{1,2}$/, error: 'A number, e.g. 8', inputMode: 'numeric' },
    ],
  },
  {
    title: 'How you’ll see students',
    fields: [
      { kind: 'multi', key: 'modes', label: 'Consult types', options: ['Video', 'Chat', 'Campus clinic in person'] },
      { kind: 'multi', key: 'languages', label: 'Languages', options: ['English', 'తెలుగు', 'हिंदी', 'اردو'] },
      { kind: 'choice', key: 'fee', label: 'Video consult fee', options: ['₹199', '₹299', '₹399'], hint: 'Students see the fee before booking. We keep 10% — published on the Plans page.' },
    ],
  },
  {
    title: 'Our clinical rules',
    fields: [
      { kind: 'agree', key: 'a1', label: 'I only see records a student shares with me, and only for this consult.' },
      { kind: 'agree', key: 'a2', label: 'I follow Telemedicine Practice Guidelines 2020 — no Schedule X drugs by video.' },
      { kind: 'agree', key: 'a3', label: 'Critical results reach me first and I act within the stated window.' },
      { kind: 'agree', key: 'a4', label: 'I never promote a product or partner to a student.' },
    ],
  },
];

/** What happens after submitting, in order (the canvas's tracker). */
export const APPLY_TRACK: { label: string; when: string }[] = [
  { label: 'Application submitted', when: 'Today' },
  { label: 'Registration checked with the council', when: 'Within 1 working day' },
  { label: '15-minute video interview with our medical advisor', when: 'Within 5 days' },
  { label: 'Trial consult reviewed', when: 'Before go-live' },
  { label: 'Live — students can book you', when: '' },
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

/** Checks a picked file before it is kept; the message says what to do. */
export function checkUpload(file: UploadedFile): string | null {
  if (!UPLOAD_TYPES.test(file.type)) return 'Use a PDF or a photo (JPG, PNG, HEIC).';
  if (file.size > MAX_UPLOAD_BYTES) return 'This file is over 10 MB. A photo or a scanned PDF under 10 MB works.';
  return null;
}

/** Null when the field is fine; otherwise the message shown under it. */
export function fieldError(field: ApplyField, value: ApplyValue | undefined): string | null {
  switch (field.kind) {
    case 'text': {
      const text = typeof value === 'string' ? value.trim() : '';
      if (text.length === 0) return 'Fill this in';
      if (field.pattern) return field.pattern.test(text) ? null : field.error ?? 'Check this';
      return text.length >= 2 ? null : 'Check this';
    }
    case 'choice':
      return typeof value === 'string' && field.options.includes(value) ? null : 'Choose one';
    case 'multi':
      return Array.isArray(value) && value.length > 0 ? null : 'Choose at least one';
    case 'upload':
      return value && typeof value === 'object' && !Array.isArray(value) ? null : 'Add the certificate';
    case 'agree':
      return value === true ? null : 'Tick to agree — every rule applies to every consult';
  }
}

export function stepErrors(step: ApplyStep, values: ApplyValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of step.fields) {
    const error = fieldError(field, values[field.key]);
    if (error) errors[field.key] = error;
  }
  return errors;
}
