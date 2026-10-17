import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import { ApiError } from '@/data/http';
import type { LabReviewsRepository } from '../model/labReviewsRepository';
import type { ReviewerChoice, UnassignedLabReview, UnassignedLabReviews } from '../model/types';

/** Why an assignment did not go through: the server refused the doctor, the report is no longer waiting, or anything else. */
export type AssignFailure = 'invalidDoctor' | 'notWaiting' | 'other';

/** The last assignment that went through, for the success notice. */
export interface AssignedNotice { tests: string[]; doctorName: string }

/**
 * Gatekeeping → Lab report reviewers: held lab reports nobody can review yet, and the
 * dialog that assigns an active doctor to one. The admin never sees a result: the list
 * carries the panel, the critical flag and the wait only. Loads the way the other admin
 * ViewModels do (version-guarded, abortable); an assignment runs one at a time and changes
 * nothing once the screen has gone. A report that is assigned leaves the list at once.
 */
export class LabReviewerAssignmentViewModel {
  reviews: UnassignedLabReviews | null = null;
  // True before the first load, so the first render shows loading rather than an empty list.
  loading = true;
  error = '';
  reviewers: ReviewerChoice[] | null = null;
  reviewersLoading = false;
  reviewersError = '';
  reviewersTruncated = false;
  /** The report the assign dialog is open for. */
  target: UnassignedLabReview | null = null;
  doctorId = '';
  assigning = false;
  assignFailure: AssignFailure | null = null;
  assignMessage = '';
  notice: AssignedNotice | null = null;
  private version = 0;
  private reviewersVersion = 0;
  private controller: AbortController | null = null;
  private reviewersController: AbortController | null = null;
  // Bumped on dispose only, so an assignment finishing after the screen has gone changes nothing.
  private generation = 0;

  constructor(private readonly repository: LabReviewsRepository) {
    makeAutoObservable<this, 'repository' | 'version' | 'reviewersVersion' | 'controller' | 'reviewersController' | 'generation'>(
      this,
      { repository: false, version: false, reviewersVersion: false, controller: false, reviewersController: false, generation: false, reviews: observableRef, reviewers: observableRef, target: observableRef, notice: observableRef },
      { autoBind: true },
    );
  }

  get items(): UnassignedLabReview[] { return this.reviews?.items ?? []; }
  get criticalCount(): number { return this.items.filter(item => item.criticalFlag).length; }
  /** The longest wait in seconds, or null with nothing waiting. */
  get longestWait(): number | null { return this.items.length ? Math.max(...this.items.map(item => item.waitingSeconds)) : null; }
  get selectedDoctor(): ReviewerChoice | null { return this.reviewers?.find(doctor => doctor.id === this.doctorId) ?? null; }

  reload() { void this.load(); }
  reloadReviewers() { void this.loadReviewers(); }

  /** Opens the assign dialog for one report. The doctor list loads the first time it is needed. */
  open(review: UnassignedLabReview) {
    this.target = review;
    this.doctorId = '';
    this.assignFailure = null;
    this.assignMessage = '';
    if (!this.reviewers && !this.reviewersLoading) this.reloadReviewers();
  }

  close() {
    if (this.assigning) return;
    this.target = null;
    this.doctorId = '';
    this.assignFailure = null;
    this.assignMessage = '';
  }

  setDoctorId(value: string) { this.doctorId = value; this.assignFailure = null; this.assignMessage = ''; }

  dismissNotice() { this.notice = null; }

  /** Assigns the chosen doctor. True when it went through and the screen is still open. */
  async assign(): Promise<boolean> {
    const target = this.target;
    const doctor = this.selectedDoctor;
    if (this.assigning || !target || !doctor) return false;
    const generation = this.generation;
    this.assigning = true;
    this.assignFailure = null;
    this.assignMessage = '';
    this.notice = null;
    try {
      await this.repository.assign(target.id, doctor.id);
      if (generation !== this.generation) return false;
      runInAction(() => {
        if (this.reviews) {
          const items = this.reviews.items.filter(item => item.id !== target.id);
          this.reviews = { items, total: Math.max(0, this.reviews.total - (this.reviews.items.length - items.length)) };
        }
        this.notice = { tests: target.testPanel, doctorName: doctor.fullName };
        this.target = null;
        this.doctorId = '';
      });
      return true;
    } catch (reason) {
      if (generation !== this.generation) return false;
      const status = reason instanceof ApiError ? reason.status : 0;
      runInAction(() => {
        this.assignFailure = status === 422 ? 'invalidDoctor' : status === 404 ? 'notWaiting' : 'other';
        this.assignMessage = reason instanceof Error ? reason.message : '';
      });
      // A doctor refused by the server may have been deactivated: read the list again.
      if (status === 422) { runInAction(() => { this.reviewers = null; this.doctorId = ''; }); this.reloadReviewers(); }
      // Someone else assigned it, or it was released: the list is out of date.
      if (status === 404) this.reload();
      return false;
    } finally {
      if (generation === this.generation) runInAction(() => { this.assigning = false; });
    }
  }

  async load() {
    const version = ++this.version;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;
    this.error = '';
    this.reviews = null;
    try {
      const result = await this.repository.listUnassigned(controller.signal);
      if (version === this.version) runInAction(() => { this.reviews = result; });
    } catch (reason) {
      if (version === this.version) runInAction(() => { this.error = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.version) runInAction(() => { this.loading = false; });
    }
  }

  async loadReviewers() {
    const version = ++this.reviewersVersion;
    this.reviewersController?.abort();
    const controller = new AbortController();
    this.reviewersController = controller;
    this.reviewersLoading = true;
    this.reviewersError = '';
    try {
      const result = await this.repository.listReviewers(controller.signal);
      if (version === this.reviewersVersion) runInAction(() => { this.reviewers = result.items; this.reviewersTruncated = result.truncated; });
    } catch (reason) {
      if (version === this.reviewersVersion) runInAction(() => { this.reviewersError = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.reviewersVersion) runInAction(() => { this.reviewersLoading = false; });
    }
  }

  /** Stops requests in flight and ignores late answers. A later load works again. */
  dispose() {
    this.version += 1;
    this.reviewersVersion += 1;
    this.generation += 1;
    this.controller?.abort();
    this.reviewersController?.abort();
    this.controller = null;
    this.reviewersController = null;
  }
}
