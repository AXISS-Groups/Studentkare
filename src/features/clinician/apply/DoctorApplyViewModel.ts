import { makeAutoObservable, runInAction } from 'mobx';
import type { DoctorApplySource } from './applySource';
import type { ApplyStep, ApplyValue, ApplyValues, UploadedFile } from './applyModel';
import { APPLY_STEPS, checkUpload, stepErrors } from './applyModel';

export type ApplyPhase = 'form' | 'submitting' | 'done';

export class DoctorApplyViewModel {
  stepIndex = 0;
  values: ApplyValues = {};
  /** Errors are shown only after the doctor tries to continue — not while typing. */
  showErrors = false;
  uploadErrors: Record<string, string> = {};
  phase: ApplyPhase = 'form';
  reference: string | null = null;
  submitError: string | null = null;
  /** Picked files stay in memory only — never in browser storage (AGENTS.md rule 9). */
  private files: Record<string, File> = {};

  constructor(private readonly source: DoctorApplySource, readonly steps: ApplyStep[] = APPLY_STEPS) {
    makeAutoObservable<DoctorApplyViewModel, 'source' | 'files'>(this, { source: false, files: false }, { autoBind: true });
  }

  get open(): boolean {
    return this.source.open;
  }

  get step(): ApplyStep {
    return this.steps[this.stepIndex];
  }

  get isLastStep(): boolean {
    return this.stepIndex === this.steps.length - 1;
  }

  get errors(): Record<string, string> {
    return { ...stepErrors(this.step, this.values), ...this.uploadErrors };
  }

  get canContinue(): boolean {
    return Object.keys(this.errors).length === 0;
  }

  /** Error to show for a field right now, if any. */
  errorFor(key: string): string | null {
    if (this.uploadErrors[key]) return this.uploadErrors[key];
    if (!this.showErrors) return null;
    return this.errors[key] ?? null;
  }

  set(key: string, value: ApplyValue | undefined): void {
    this.values = { ...this.values, [key]: value };
  }

  toggle(key: string, option: string): void {
    const current = this.values[key];
    const list = Array.isArray(current) ? current : [];
    this.set(key, list.includes(option) ? list.filter((item) => item !== option) : [...list, option]);
  }

  attach(key: string, file: File | null): void {
    const rest = { ...this.uploadErrors };
    delete rest[key];
    this.uploadErrors = rest;
    if (!file) {
      delete this.files[key];
      this.set(key, undefined);
      return;
    }
    const meta: UploadedFile = { name: file.name, size: file.size, type: file.type };
    const problem = checkUpload(meta);
    if (problem) {
      delete this.files[key];
      this.set(key, undefined);
      this.uploadErrors = { ...this.uploadErrors, [key]: problem };
      return;
    }
    this.files[key] = file;
    this.set(key, meta);
  }

  /**
   * Continue, or submit on the last step. Returns the key of the first field
   * that needs attention so the view can move focus there.
   */
  async next(): Promise<string | null> {
    if (!this.canContinue) {
      this.showErrors = true;
      return Object.keys(this.errors)[0] ?? null;
    }
    this.showErrors = false;
    if (!this.isLastStep) {
      this.stepIndex += 1;
      return null;
    }
    await this.submit();
    return null;
  }

  back(): void {
    if (this.stepIndex > 0 && this.phase === 'form') {
      this.stepIndex -= 1;
      this.showErrors = false;
    }
  }

  private async submit(): Promise<void> {
    this.phase = 'submitting';
    this.submitError = null;
    try {
      const { reference } = await this.source.submit(this.values, { ...this.files });
      runInAction(() => {
        this.reference = reference;
        this.phase = 'done';
        this.files = {};
      });
    } catch {
      runInAction(() => {
        this.phase = 'form';
        this.submitError = 'Your application didn’t go through. Nothing was sent and your answers are still here — try again.';
      });
    }
  }
}
