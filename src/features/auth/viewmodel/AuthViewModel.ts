import { makeAutoObservable, runInAction } from 'mobx';
import { ApiError, apiRequest, setCsrfToken } from '@/data/http';
import type { SessionResponse } from '@/data/workflowTypes';
import { canAccessRoute, homeForRole, isRoutePath, navigate } from '@/lib/workflowRouting';
import type { RoutePath } from '@/lib/workflowRouting';
import type { Lang } from '@/i18n';
import { SignupConsentState } from './signupConsent';

type AuthMode = 'login' | 'signup';
type Channel = 'EMAIL' | 'WHATSAPP';

/** What the server says about a device the student chose to be remembered on. Never a session. */
export interface RememberedDevice {
  targetMasked: string;
  channel: Channel;
  lastRoute: string;
}

type RememberedResponse = ({ remembered: true } & RememberedDevice) | { remembered: false };

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
  /** DPDP consent: three required items, each ticked by the student. */
  consent = new SignupConsentState();
  consentLanguage: Lang = 'en';

  channels: Channel[] = [];
  remembered: RememberedDevice | null = null;
  optionsError = '';
  optionsLoading = false;
  busy = false;
  error = '';
  /**
   * Why sign-in started over after the two-step check, as a message key. The
   * second-step token is single use, so a wrong code (or one we couldn't
   * check) closes that attempt: retrying it could only fail.
   */
  twoFaRestart: 'auth.twofa.restart' | 'auth.twofa.restartOther' | '' = '';

  constructor(
    mode: AuthMode,
    next: RoutePath | null,
    /**
     * Where to go once the server has opened a session. The web routes by URL;
     * the native app passes a no-op, because its stack is rebuilt from the
     * server-confirmed session (src/native/session.tsx), held sessions included.
     */
    private readonly go: (path: RoutePath) => void = navigate,
  ) {
    this.mode = mode;
    this.next = next;
    makeAutoObservable<AuthViewModel, 'go'>(this, { go: false }, { autoBind: true });
  }

  setConsentLanguage(lang: Lang): void {
    this.consentLanguage = lang;
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
    this.consent.reset();
    this.error = '';
    this.twoFaRestart = '';
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
    this.twoFaRestart = '';
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

  /** Login only. Any failure shows the normal form: a missing hint costs nothing. */
  async loadRemembered(): Promise<void> {
    if (!this.isLogin) return;
    try {
      const res = await apiRequest<RememberedResponse>('/auth/remembered');
      runInAction(() => {
        this.remembered = res.remembered ? { targetMasked: res.targetMasked, channel: res.channel, lastRoute: res.lastRoute } : null;
      });
    } catch {
      runInAction(() => { this.remembered = null; });
    }
  }

  /** Sends a code to the remembered account; the code is still required to sign in. */
  async continueRemembered(): Promise<void> {
    const device = this.remembered;
    if (!device) return;
    this.busy = true;
    this.error = '';
    this.twoFaRestart = '';
    try {
      const response = await apiRequest<OtpSendResponse>('/auth/remembered/send', { method: 'POST' });
      runInAction(() => {
        this.channel = device.channel;
        // Back to the same spot — accept() still checks the route against the signed-in role.
        if (!this.next && isRoutePath(device.lastRoute)) this.next = device.lastRoute;
        this.masked = response.targetMasked;
        this.startResendTimer();
        this.code = '';
        this.step = 3;
        this.fallbackNotice = response.fallbackSent ? (response.message || '') : '';
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Could not send the code.';
        if (error instanceof ApiError && error.status === 404) this.remembered = null;
      });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  /** "Not you?": hides the hint for this visit only; the device stays remembered. */
  useAnotherAccount(): void {
    this.remembered = null;
    this.error = '';
  }

  async forgetDevice(): Promise<void> {
    this.busy = true;
    this.error = '';
    try {
      await apiRequest('/auth/remembered/forget', { method: 'POST' });
      runInAction(() => { this.remembered = null; });
    } catch (error) {
      runInAction(() => { this.error = error instanceof Error ? error.message : 'Could not forget this device.'; });
    } finally {
      runInAction(() => { this.busy = false; });
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
    // The role must use two-step sign-in and it isn't on yet: the server opens
    // nothing else until it is, so go straight to setting it up.
    if (response.user.twoFactorSetupRequired) {
      this.go('security');
      return;
    }
    // Somewhere specific was asked for — a protected page the student was
    // bounced off. Honour it rather than interrupting with a welcome.
    if (this.next && canAccessRoute(this.next, response.user.role)) {
      this.go(this.next);
      return;
    }
    // A brand-new account gets told what it can now do and what is still
    // pending. A returning student goes straight to work.
    this.go(this.isLogin ? homeForRole(response.user.role) : 'account-ready');
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
        // The server spends the second-step token on every attempt. Staying on
        // this step would only meet "expired" next time, so start sign-in again
        // with the contact details kept, and say why.
        this.tempToken = '';
        this.twoFaCode = '';
        this.code = '';
        this.step = 1;
        this.error = '';
        this.twoFaRestart = error instanceof ApiError && error.status === 400 ? 'auth.twofa.restart' : 'auth.twofa.restartOther';
      });
    } finally {
      runInAction(() => {
        this.busy = false;
      });
    }
  }

  async completeSignup(onAccept: (response: SessionResponse) => void): Promise<void> {
    // No consent, no request: the server refuses it too, but don't send it.
    const consent = this.consent.payload(this.consentLanguage);
    if (!consent) {
      this.error = 'Tick the three required items to create your account.';
      return;
    }
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
          consent,
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
