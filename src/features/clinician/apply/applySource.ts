import { isDev } from '@/core/env';
import type { ApplyValues } from './applyModel';

export interface DoctorApplySource {
  /**
   * False when nothing receives applications. The page then says so before
   * anyone spends ten minutes on the form.
   */
  readonly open: boolean;
  /** Resolves with the application reference. */
  submit(values: ApplyValues, files: Record<string, File>): Promise<{ reference: string }>;
}

/**
 * Development only, so the form can be reviewed against the canvas. Sends
 * nothing, and its reference says so rather than looking like a real one.
 */
export const sampleApplySource: DoctorApplySource = {
  open: true,
  async submit() {
    return { reference: 'DEV-PREVIEW · not sent' };
  },
};

/**
 * Production: no application endpoint exists in the backend (checked
 * 2026-10-21), so the page says applications aren't open before anyone
 * fills in a form that goes nowhere.
 */
export const closedApplySource: DoctorApplySource = {
  open: false,
  async submit() {
    throw new Error('Doctor applications are not connected.');
  },
};

export function defaultApplySource(): DoctorApplySource {
  return isDev() ? sampleApplySource : closedApplySource;
}
