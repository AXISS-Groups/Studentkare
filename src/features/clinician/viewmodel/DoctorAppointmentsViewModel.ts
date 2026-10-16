import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import type { StaffAppointment } from '@/data/workflowTypes';
import type { WorkRepository } from '@/features/admin/model/workRepository';
import type { AppointmentList, AppointmentTransition } from '@/features/admin/model/types';

/** The two calls this screen makes. The server scopes both to the signed-in provider. */
export type DoctorAppointmentsRepository = Pick<WorkRepository, 'listAppointments' | 'updateAppointment'>;

/** Ends or removes the appointment, so it is asked about before it is sent. */
const NEEDS_CONFIRMATION: ReadonlySet<AppointmentTransition> = new Set(['CANCELLED', 'NO_SHOW']);

/**
 * A doctor's own appointments, and the steps they take on each: confirm or decline a
 * request; complete, cancel or record a no-show on a confirmed one. These are the same
 * transitions PATCH /work/appointments/{id} allows; anything else is refused there.
 *
 * One change at a time. A failed change keeps its message until the next attempt, and
 * nothing changes after the screen has gone.
 */
export class DoctorAppointmentsViewModel {
  appointments: AppointmentList | null = null;
  loading = true;
  loadError = '';
  busy = false;
  actionFailed = false;
  /** The destructive change waiting on the doctor's confirmation. */
  pending: { appointment: StaffAppointment; status: AppointmentTransition } | null = null;
  private version = 0;
  private controller: AbortController | null = null;
  private generation = 0;

  constructor(private readonly work: DoctorAppointmentsRepository) {
    makeAutoObservable<this, 'work' | 'version' | 'controller' | 'generation'>(
      this,
      { work: false, version: false, controller: false, generation: false, appointments: observableRef, pending: observableRef },
      { autoBind: true },
    );
  }

  get items(): StaffAppointment[] { return this.appointments?.items || []; }

  /** The steps open to an appointment, in the order they are offered. */
  steps(appointment: StaffAppointment): AppointmentTransition[] {
    if (appointment.status === 'REQUESTED') return ['CONFIRMED', 'CANCELLED'];
    if (appointment.status === 'CONFIRMED') return ['COMPLETED', 'NO_SHOW', 'CANCELLED'];
    return [];
  }

  /** Sends a safe step straight away; holds a destructive one for confirmation. */
  request(appointment: StaffAppointment, status: AppointmentTransition): Promise<boolean> {
    if (NEEDS_CONFIRMATION.has(status)) {
      this.pending = { appointment, status };
      return Promise.resolve(false);
    }
    return this.decide(appointment, status);
  }

  confirmPending(): Promise<boolean> {
    const pending = this.pending;
    if (!pending) return Promise.resolve(false);
    return this.decide(pending.appointment, pending.status).then(done => {
      runInAction(() => { this.pending = null; });
      return done;
    });
  }

  cancelPending() { this.pending = null; }

  load() { void this.loadAppointments(); }

  async loadAppointments() {
    const version = ++this.version;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;
    this.loadError = '';
    this.appointments = null;
    try {
      const result = await this.work.listAppointments(controller.signal);
      if (version === this.version) runInAction(() => { this.appointments = result; });
    } catch (reason) {
      if (version === this.version) runInAction(() => { this.loadError = reason instanceof Error ? reason.message : ''; });
    } finally {
      if (version === this.version) runInAction(() => { this.loading = false; });
    }
  }

  dispose() {
    this.version += 1;
    this.generation += 1;
    this.controller?.abort();
    this.controller = null;
  }

  private async decide(appointment: StaffAppointment, status: AppointmentTransition): Promise<boolean> {
    if (this.busy) return false;
    const generation = this.generation;
    this.busy = true;
    this.actionFailed = false;
    try {
      await this.work.updateAppointment(appointment.id, status);
      if (generation !== this.generation) return false;
      void this.loadAppointments();
      return true;
    } catch {
      // The server's message is English-only; the screen shows a translated one.
      if (generation === this.generation) runInAction(() => { this.actionFailed = true; });
      return false;
    } finally {
      if (generation === this.generation) runInAction(() => { this.busy = false; });
    }
  }
}
