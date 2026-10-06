import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import type { FollowUpTask, StaffAppointment, WorkRequest } from '@/data/workflowTypes';
import type { WorkRepository } from '../model/workRepository';
import { WORK_REQUEST_FILTERS } from '../model/types';
import type { AppointmentTransition, AppointmentList, FollowUpList, WorkRequestFilter, WorkRequestPage, WorkRequestQuery, WorkRequestTransition } from '../model/types';

export const WORK_REQUEST_PAGE_SIZE = 15;
const FAILED = 'The request could not be completed.';
type Resource = 'requests' | 'appointments' | 'followUps';

/**
 * Provider requests: a filterable page of service requests, the appointments and the
 * follow-ups assigned to the caller, and the steps staff take on each.
 *
 * Each of the three loads independently, the way useApiResource did (see
 * CatalogueViewModel); the requests reload only when their filter or page changes.
 * Every change (request steps, appointment decisions, follow-up resolution) shares one
 * lock and one error, as the single useMutation it replaces did: one at a time, the
 * error kept until the next attempt, and no state change after the screen has gone.
 * A successful change reloads only the list it changed.
 */
export class WorkRequestsViewModel {
  filter: WorkRequestFilter = 'ALL';
  page = 0;
  requests: WorkRequestPage | null = null;
  requestsLoading = true;
  requestsError = '';
  appointments: AppointmentList | null = null;
  appointmentsLoading = true;
  appointmentsError = '';
  followUps: FollowUpList | null = null;
  followUpsLoading = true;
  followUpsError = '';
  busy = false;
  actionError = '';
  private versions: Record<Resource, number> = { requests: 0, appointments: 0, followUps: 0 };
  private controllers: Partial<Record<Resource, AbortController>> = {};
  private requestedKey = '';
  // Bumped on dispose only, so a change finishing after the screen has gone changes nothing.
  private generation = 0;

  constructor(private readonly work: WorkRepository) {
    makeAutoObservable<this, 'work' | 'versions' | 'controllers' | 'requestedKey' | 'generation'>(
      this,
      { work: false, versions: false, controllers: false, requestedKey: false, generation: false, requests: observableRef, appointments: observableRef, followUps: observableRef },
      { autoBind: true },
    );
  }

  // ── Requests ───────────────────────────────────────────────────────────────
  get requestItems(): WorkRequest[] { return this.requests?.items || []; }
  /** The server's total, or the requests on this page when it reports none. */
  get requestTotal(): number { return this.requests?.total || this.requestItems.length; }

  /** A new filter starts from the first page. Values outside the filter list are ignored. */
  setFilter(value: string) {
    const filter = WORK_REQUEST_FILTERS.find(option => option === value);
    if (!filter) return;
    this.filter = filter;
    this.page = 0;
    this.refreshRequests();
  }

  setPage(page: number) { this.page = page; this.refreshRequests(); }

  /** The steps open to a request: accept or decline it, then dispatch a product or complete anything else. */
  requestSteps(request: WorkRequest): WorkRequestTransition[] {
    if (request.status === 'REQUESTED') return ['ACCEPTED', 'DECLINED'];
    if (request.status === 'ACCEPTED') return [request.kind === 'product' ? 'DISPATCHED' : 'COMPLETED'];
    if (request.status === 'DISPATCHED') return ['COMPLETED'];
    return [];
  }

  updateRequest(request: WorkRequest, status: WorkRequestTransition): Promise<boolean> {
    return this.change(() => this.work.updateRequest(request.id, status), this.reloadRequests);
  }

  // ── Appointments ───────────────────────────────────────────────────────────
  get appointmentItems(): StaffAppointment[] { return this.appointments?.items || []; }

  /** Confirm or decline a request; once confirmed, complete it or record a no-show. */
  appointmentDecisions(appointment: StaffAppointment): AppointmentTransition[] {
    if (appointment.status === 'REQUESTED') return ['CONFIRMED', 'CANCELLED'];
    if (appointment.status === 'CONFIRMED') return ['COMPLETED', 'NO_SHOW'];
    return [];
  }

  /** Only a confirmed appointment has a consultation to join. */
  canJoinConsultation(appointment: StaffAppointment): boolean { return appointment.status === 'CONFIRMED'; }

  decideAppointment(appointment: StaffAppointment, status: AppointmentTransition): Promise<boolean> {
    return this.change(() => this.work.updateAppointment(appointment.id, status), this.reloadAppointments);
  }

  // ── Follow-ups ─────────────────────────────────────────────────────────────
  get followUpItems(): FollowUpTask[] { return this.followUps?.items || []; }

  canResolve(task: FollowUpTask): boolean { return task.status === 'OPEN'; }

  resolveFollowUp(task: FollowUpTask): Promise<boolean> {
    return this.change(() => this.work.resolveFollowUp(task.id), this.reloadFollowUps);
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  /** The first page of requests, the appointments and the follow-ups, in that order. */
  load() {
    void this.loadRequests();
    void this.loadAppointments();
    void this.loadFollowUps();
  }

  reloadRequests() { void this.loadRequests(); }
  reloadAppointments() { void this.loadAppointments(); }
  reloadFollowUps() { void this.loadFollowUps(); }

  async loadRequests() {
    const version = ++this.versions.requests;
    const query = this.requestQuery();
    this.requestedKey = JSON.stringify(query);
    const signal = this.restart('requests');
    this.requestsLoading = true;
    this.requestsError = '';
    this.requests = null;
    try {
      const result = await this.work.listRequests(query, signal);
      if (version === this.versions.requests) runInAction(() => { this.requests = result; });
    } catch (reason) {
      if (version === this.versions.requests) runInAction(() => { this.requestsError = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.versions.requests) runInAction(() => { this.requestsLoading = false; });
    }
  }

  async loadAppointments() {
    const version = ++this.versions.appointments;
    const signal = this.restart('appointments');
    this.appointmentsLoading = true;
    this.appointmentsError = '';
    this.appointments = null;
    try {
      const result = await this.work.listAppointments(signal);
      if (version === this.versions.appointments) runInAction(() => { this.appointments = result; });
    } catch (reason) {
      if (version === this.versions.appointments) runInAction(() => { this.appointmentsError = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.versions.appointments) runInAction(() => { this.appointmentsLoading = false; });
    }
  }

  async loadFollowUps() {
    const version = ++this.versions.followUps;
    const signal = this.restart('followUps');
    this.followUpsLoading = true;
    this.followUpsError = '';
    this.followUps = null;
    try {
      const result = await this.work.listFollowUps(signal);
      if (version === this.versions.followUps) runInAction(() => { this.followUps = result; });
    } catch (reason) {
      if (version === this.versions.followUps) runInAction(() => { this.followUpsError = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.versions.followUps) runInAction(() => { this.followUpsLoading = false; });
    }
  }

  /** Stops every request in flight and ignores late answers. A later load works again. */
  dispose() {
    this.versions = { requests: this.versions.requests + 1, appointments: this.versions.appointments + 1, followUps: this.versions.followUps + 1 };
    this.generation += 1;
    Object.values(this.controllers).forEach(controller => controller?.abort());
    this.controllers = {};
    this.requestedKey = '';
  }

  private requestQuery(): WorkRequestQuery {
    return { limit: WORK_REQUEST_PAGE_SIZE, offset: this.page * WORK_REQUEST_PAGE_SIZE, status: this.filter };
  }

  /** Loads the requests only when their query differs from the one last requested. */
  private refreshRequests() {
    if (JSON.stringify(this.requestQuery()) !== this.requestedKey) void this.loadRequests();
  }

  /** Cancels the previous request of this kind and returns the signal for the next. */
  private restart(kind: Resource): AbortSignal {
    this.controllers[kind]?.abort();
    const controller = new AbortController();
    this.controllers[kind] = controller;
    return controller.signal;
  }

  private async change(task: () => Promise<unknown>, onSuccess: () => void): Promise<boolean> {
    if (this.busy) return false;
    const generation = this.generation;
    this.busy = true;
    this.actionError = '';
    try {
      await task();
      if (generation !== this.generation) return false;
      onSuccess();
      return true;
    } catch (reason) {
      if (generation === this.generation) runInAction(() => { this.actionError = reason instanceof Error ? reason.message : FAILED; });
      return false;
    } finally {
      if (generation === this.generation) runInAction(() => { this.busy = false; });
    }
  }
}
