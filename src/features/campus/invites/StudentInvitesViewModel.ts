import { makeAutoObservable, observableRef, runInAction } from 'mobx';
import { ApiError } from '@/data/services/http';
import type { MessageKey } from '@/i18n';
import type { InviteChannel, IssuedInvite, StudentInvite, StudentInvitesRepository } from './studentInvitesRepository';

/** A temporary password just issued: shown once, then forgotten. */
export interface ShownTemp { name: string; password: string; linkSent: boolean; channel: InviteChannel }

const HTTP_UNPROCESSABLE = 422;

function problemOf(error: unknown): MessageKey {
  const code = error instanceof ApiError && error.detail && typeof error.detail === 'object'
    ? (error.detail as { code?: unknown }).code : null;
  if (code === 'INVITE_CONTACT_IN_USE') return 'invite.inUse';
  if (error instanceof ApiError && error.status === HTTP_UNPROCESSABLE) return 'invite.failed';
  return 'invite.failed';
}

/**
 * Campus, Students, Invite students (B2B; plan tier1-auth-password-2026-10-22 b).
 * The list, the "Invite a student" form, Resend and Cancel. A temporary password
 * lives only in `shown` until its dialog is closed, never in the list, storage or a
 * log. Loads are version-guarded and abortable; an action finishing after the
 * screen has gone changes nothing.
 */
export class StudentInvitesViewModel {
  items: StudentInvite[] = [];
  loading = true;
  error = '';
  formOpen = false;
  fullName = '';
  rollNumber = '';
  email = '';
  phone = '';
  sendBy: InviteChannel = 'EMAIL';
  university = '';
  saving = false;
  problem: MessageKey | null = null;
  shown: ShownTemp | null = null;
  busyId = '';
  cancelTarget: StudentInvite | null = null;
  notice: MessageKey | null = null;
  /** The server says whether this admin names the campus (a super admin). */
  superAdmin = false;

  private version = 0;
  private controller: AbortController | null = null;
  private generation = 0;

  constructor(private readonly repository: StudentInvitesRepository) {
    makeAutoObservable<this, 'repository' | 'version' | 'controller' | 'generation'>(
      this,
      { repository: false, version: false, controller: false, generation: false, shown: observableRef, cancelTarget: observableRef },
      { autoBind: true },
    );
  }

  get contactForLink(): string { return this.sendBy === 'EMAIL' ? this.email.trim() : this.phone.trim(); }

  get canSave(): boolean {
    return !this.saving && this.fullName.trim().length >= 2 && this.rollNumber.trim().length > 0
      && this.contactForLink.length > 0 && (!this.superAdmin || this.university.trim().length >= 2);
  }

  async load(): Promise<void> {
    const version = ++this.version;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.loading = true;
    this.error = '';
    try {
      const data = await this.repository.list(controller.signal);
      runInAction(() => {
        if (version !== this.version) return;
        this.items = data.items;
        this.superAdmin = data.chooseCampus === true;
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      runInAction(() => { if (version === this.version) this.error = error instanceof Error ? error.message : 'failed'; });
    } finally {
      runInAction(() => { if (version === this.version) this.loading = false; });
    }
  }

  reload() { void this.load(); }

  openForm() { this.formOpen = true; this.problem = null; this.notice = null; }
  closeForm() { if (!this.saving) { this.formOpen = false; this.problem = null; this.resetForm(); } }

  set(field: 'fullName' | 'rollNumber' | 'email' | 'phone' | 'university', value: string) {
    this[field] = value;
    this.problem = null;
  }

  setSendBy(channel: InviteChannel) { this.sendBy = channel; this.problem = null; }

  async save(): Promise<void> {
    if (!this.canSave) {
      if (!this.contactForLink) this.problem = 'invite.needContact';
      return;
    }
    const generation = this.generation;
    this.saving = true;
    this.problem = null;
    try {
      const issued = await this.repository.create({
        fullName: this.fullName.trim(), rollNumber: this.rollNumber.trim(), sendBy: this.sendBy,
        ...(this.email.trim() ? { email: this.email.trim() } : {}),
        ...(this.phone.trim() ? { phone: this.phone.trim() } : {}),
        ...(this.superAdmin ? { university: this.university.trim() } : {}),
      });
      if (generation !== this.generation) return;
      runInAction(() => { this.show(issued); this.formOpen = false; this.resetForm(); });
      void this.load();
    } catch (error) {
      if (generation !== this.generation) return;
      runInAction(() => { this.problem = problemOf(error); });
    } finally {
      runInAction(() => { this.saving = false; });
    }
  }

  async resend(invite: StudentInvite): Promise<void> {
    const generation = this.generation;
    this.busyId = invite.id;
    this.notice = null;
    try {
      const issued = await this.repository.resend(invite.id);
      if (generation !== this.generation) return;
      runInAction(() => { this.show(issued); });
      void this.load();
    } catch {
      if (generation !== this.generation) return;
      runInAction(() => { this.notice = 'invite.failed'; });
    } finally {
      runInAction(() => { this.busyId = ''; });
    }
  }

  askCancel(invite: StudentInvite) { this.cancelTarget = invite; this.notice = null; }
  closeCancel() { if (!this.busyId) this.cancelTarget = null; }

  async cancel(): Promise<void> {
    const target = this.cancelTarget;
    if (!target) return;
    const generation = this.generation;
    this.busyId = target.id;
    try {
      await this.repository.cancel(target.id);
      if (generation !== this.generation) return;
      runInAction(() => { this.items = this.items.filter(item => item.id !== target.id); this.notice = 'invite.cancelled'; });
    } catch {
      if (generation !== this.generation) return;
      runInAction(() => { this.notice = 'invite.failed'; });
    } finally {
      runInAction(() => { this.busyId = ''; this.cancelTarget = null; });
    }
  }

  closeShown() { this.shown = null; }

  dispose() {
    this.generation += 1;
    this.version += 1;
    this.controller?.abort();
    this.shown = null;
  }

  private show(issued: IssuedInvite) {
    this.shown = { name: issued.fullName, password: issued.tempPassword, linkSent: issued.linkSent, channel: issued.sentBy };
  }

  private resetForm() {
    this.fullName = '';
    this.rollNumber = '';
    this.email = '';
    this.phone = '';
    this.sendBy = 'EMAIL';
    this.university = '';
  }
}
