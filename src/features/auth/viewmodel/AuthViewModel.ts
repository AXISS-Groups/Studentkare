import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest, setCsrfToken } from '@/data/http';
import type { SessionResponse } from '@/data/workflowTypes';
import { canAccessRoute, homeForRole, navigate } from '@/lib/workflowRouting';
import type { RoutePath } from '@/lib/workflowRouting';

type AuthMode = 'login' | 'signup';
type Channel = 'EMAIL' | 'WHATSAPP';

interface OtpSendResponse {
  targetMasked: string;
  fallbackSent?: boolean;
  fallbackTargetMasked?: string;
  message?: string;
}

/**
 * MVVM ViewModel for the authentication flow.
 *
 * Owns all form state and API orchestration as observable state + actions.
 * The screen binds to it with `observer`; it never calls setState.
 */
export class AuthViewModel {
  mode: AuthMode;
  next: RoutePath | null;

  step = 1;
  channel: Channel = 'WHATSAPP';
  identifier = '';
  code = '';
  masked = '';
  fallbackEmail = '';
  fallbackNotice = '';
  tempToken = '';
  twoFaCode = '';
  resendAt = 0;
  seconds = 0;
  fullName = '';
  dob = '';
  bloodGroup = '';
  university = '';
  rollNumber = '';

  channels: Channel[] = [];
  optionsError = '';
  optionsLoading = false;
  busy = false;
  error = '';

  constructor(mode: AuthMode, next: RoutePath | null) {
    this.mode = mode;
    this.next = next;
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get isLogin(): boolean {
    return this.mode === 'login';
  }

  reset(): void {
    this.step = 1;
    this.channel = 'WHATSAPP';
    this.identifier = '';
    this.code = '';
    this.masked = '';
    this.fallbackEmail = '';
    this.fallbackNotice = '';
    this.tempToken = '';
    this.twoFaCode = '';
    this.resendAt = 0;
    this.seconds = 0;
    this.fullName = '';
    this.dob = '';
    this.bloodGroup = '';
    this.university = '';
    this.rollNumber = '';
    this.error = '';
    this.busy = false;
  }

  dispose(): void {
    this.reset();
  }

  setChannel(channel: Channel): void {
    this.channel = channel;
    this.identifier = '';
  }

  setIdentifier(value: string): void {
    this.identifier = value;
  }

  setCode(value: string): void {
    this.code = value.replace(/\D/g, '').slice(0, 6);
  }

  setFallbackEmail(value: string): void {
    this.fallbackEmail = value;
  }

  setTwoFaCode(value: string): void {
    this.twoFaCode = value.replace(/\D/g, '').slice(0, 6);
  }

  setField(field: 'fullName' | 'dob' | 'bloodGroup' | 'university' | 'rollNumber', value: string): void {
    this[field] = value;
  }

  advance(step: number): void {
    this.step = step;
    this.error = '';
  }

  async loadOptions(): Promise<void> {
    this.optionsLoading = true;
    this.optionsError = '';
    try {
      const res = await apiRequest<{ channels: Channel[] }>('/auth/options');
      runInAction(() => {
        this.channels = res.channels;
        if (res.channels.length === 1) this.channel = res.channels[0];
      });
    } catch (error) {
      runInAction(() => {
        this.optionsError = error instanceof Error ? error.message : 'Could not load sign-in options.';
      });
    } finally {
      runInAction(() => {
        this.optionsLoading = false;
      });
    }
  }

  startResendTimer(): void {
    this.resendAt = Date.now() + 45000;
    this.seconds = 45;
  }

  tick(): void {
    this.seconds = Math.max(0, Math.ceil((this.resendAt - Date.now()) / 1000));
  }

  private accept(response: SessionResponse, onAccept: (response: SessionResponse) => void): void {
    if (!response.user) throw new Error('The server did not establish a signed-in session.');
    onAccept(response);
    const target = this.next && canAccessRoute(this.next, response.user.role) ? this.next : homeForRole(response.user.role);
    navigate(target);
  }

  async sendCode(): Promise<void> {
    this.busy = true;
    this.error = '';
    try {
      const response = await apiRequest<OtpSendResponse>('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          identifier: this.identifier,
          channel: this.channel,
          intent: this.isLogin ? 'LOGIN' : 'SIGNUP',
          fallbackEmail: this.channel === 'WHATSAPP' && this.fallbackEmail.includes('@') ? this.fallbackEmail : undefined,
        }),
      });
      runInAction(() => {
        this.masked = response.targetMasked;
        this.startResendTimer();
        this.code = '';
        this.step = 3;
        this.fallbackNotice = response.fallbackSent
          ? (response.message || `WhatsApp was not reachable — the same code was also sent to email ${response.fallbackTargetMasked || 'your backup address'}.`)
          : '';
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Could not send the code.';
      });
    } finally {
      runInAction(() => {
        this.busy = false;
      });
    }
  }

  async verify(onAccept: (response: SessionResponse) => void): Promise<void> {
    this.busy = true;
    this.error = '';
    try {
      const response = await apiRequest<SessionResponse>('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ otp: this.code }) });
      runInAction(() => {
        if (response.requires2FA && response.tempToken) {
          this.tempToken = response.tempToken;
          this.twoFaCode = '';
          this.step = 7;
          return;
        }
        if (this.mode === 'signup' && response.requiresSignup) {
          setCsrfToken(response.csrfToken);
          this.step = 4;
          return;
        }
        this.accept(response, onAccept);
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Could not verify the code.';
      });
    } finally {
      runInAction(() => {
        this.busy = false;
      });
    }
  }

  async verify2FA(onAccept: (response: SessionResponse) => void): Promise<void> {
    this.busy = true;
    this.error = '';
    try {
      const response = await apiRequest<SessionResponse>('/auth/2fa/challenge', {
        method: 'POST',
        body: JSON.stringify({ tempToken: this.tempToken, token: this.twoFaCode }),
      });
      runInAction(() => {
        this.accept(response, onAccept);
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Two-factor check failed.';
      });
    } finally {
      runInAction(() => {
        this.busy = false;
      });
    }
  }

  async completeSignup(onAccept: (response: SessionResponse) => void): Promise<void> {
    this.busy = true;
    this.error = '';
    try {
      const response = await apiRequest<SessionResponse>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          fullName: this.fullName,
          dob: this.dob,
          university: this.university,
          rollNumber: this.rollNumber,
          bloodGroup: this.bloodGroup,
        }),
      });
      runInAction(() => {
        this.accept(response, onAccept);
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Could not complete registration.';
      });
    } finally {
      runInAction(() => {
        this.busy = false;
      });
    }
  }
}
