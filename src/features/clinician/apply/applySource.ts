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

/** Development only: accepts the form and returns a sample reference. Sends nothing. */
export const sampleApplySource: DoctorApplySource = {
  open: true,
  async submit() {
    return { reference: 'CL-2026-0417' };
  },
};

/** Production until an application endpoint exists. */
export const closedApplySource: DoctorApplySource = {
  open: false,
  async submit() {
    throw new Error('Doctor applications are not connected.');
  },
};

export function defaultApplySource(): DoctorApplySource {
  return isDev() ? sampleApplySource : closedApplySource;
}
