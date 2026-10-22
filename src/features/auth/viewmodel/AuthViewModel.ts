import { makeAutoObservable, runInAction } from 'mobx';
import { ApiError, apiRequest, setCsrfToken } from '@/data/services/http';
import type { SessionResponse } from '@/data/types/workflowTypes';
import { canAccessRoute, homeForRole, isRoutePath, navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import type { Lang, MessageKey } from '@/i18n';
import { SignupConsentState } from './signupConsent';
import { normalizeInviteCode } from '@/features/rewards/inviteCode';
import { getSetting } from '@/data/services/config';
import { PASSCODE_MAX_LENGTH, isPasscodeShape, passcodeDetail } from './passcodeRules';

type AuthMode = 'login' | 'signup';
/** The board's order for the channel switcher: Email first, then WhatsApp. */
const CHANNEL_ORDER: readonly Channel[] = ['EMAIL', 'WHATSAPP'];
const HTTP_NOT_FOUND = 404;
const HTTP_UNAVAILABLE = 503;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_UNPROCESSABLE = 422;

/**
 * A send that failed because the channel could not deliver (503). The server
 * names the channel and what still works; never the number or address.
 */
export interface ChannelFailure {
  channel: Channel;
  /** Channels that can still deliver, from the server's answer. */
  remaining: Channel[];
}

function isChannel(value: unknown): value is Channel {
  return value === 'EMAIL' || value === 'WHATSAPP';
}

/** Reads the 503 detail ({ code, channel, channels }); anything else is treated as the chosen channel failing. */
export function channelFailureFrom(error: ApiError, chosen: Channel, known: Channel[]): ChannelFailure {
  const detail = error.detail;
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const record = detail as { channel?: unknown; channels?: unknown };
    const channel = isChannel(record.channel) ? record.channel : chosen;
    const remaining = Array.isArray(record.channels) ? record.channels.filter(isChannel).filter((c) => c !== channel) : known.filter((c) => c !== channel);
    return { channel, remaining };
  }
  return { channel: chosen, remaining: known.filter((c) => c !== chosen) };
}
/** STAFF: the staff sign-in page (AdminSignIn). The server then sends codes only to staff accounts. */
export type AuthAudience = 'STUDENT' | 'STAFF';
/**
 * Staff page only: an emailed code, or a team account's ID with its PIN
 * (POST /auth/staff-pin/sign-in) or its password (POST /auth/staff-password/sign-in).
 */
export type StaffSignInMethod = 'CODE' | 'PIN' | 'PASSWORD';
/** A team account's PIN is six digits (services/team_accounts.py PIN_LENGTH). */
export const STAFF_PIN_LENGTH = 6;
/** The longest password the server takes (services/account_password.py MAX_PASSWORD_LENGTH). */
export const PASSWORD_MAX_LENGTH = 128;
/** Sign-up: verify the other contact (after the first code), then create a password (before consent). */
export const SECOND_CONTACT_STEP = 9;
export const PASSWORD_STEP = 10;
const CODE_LENGTH = 6;
/** Why a student password sign-in didn't open a session. FAILED is the server's one answer for everything. */
export type PasswordProblem = 'FAILED' | 'DISABLED' | 'NEED_ID' | 'OTHER' | '';

function errorCode(error: unknown): string {
  if (!(error instanceof ApiError) || !error.detail || typeof error.detail !== 'object') return '';
  const code = (error.detail as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

/** A refused new password or second contact, as a message key the sign-up screens show. */
function signupProblem(error: unknown): MessageKey {
  const code = errorCode(error);
  if (code === 'PASSWORD_WEAK') return 'authpw.weak';
  if (code === 'PASSWORD_LENGTH') return 'authpw.length';
  if (code === 'PASSWORD_CHARACTERS') return 'authpw.characters';
  if (code === 'CONTACT_IN_USE') return 'contacts.inUse';
  if (code === 'CONTACT_CODE_FAILED') return 'contacts.codeFailed';
  if (error instanceof ApiError && error.status === HTTP_TOO_MANY_REQUESTS) return 'contacts.tooMany';
  if (error instanceof ApiError && error.status === HTTP_UNAVAILABLE) return 'contacts.unavailable';
  if (error instanceof ApiError && error.status === HTTP_UNPROCESSABLE) return 'contacts.invalid';
  return 'contacts.failed';
}
type Channel = 'EMAIL' | 'WHATSAPP';

/** What the server says about the account this device remembers (masked). Never a session. */
export interface RememberedDevice {
  targetMasked: string;
  channel: Channel;
  lastRoute: string;
  /** The account has a passcode and passcodes are on: "Use my passcode" applies. */
  passcode: boolean;
}

/**
 * Why a passcode sign-in didn't open a session. NEW_DEVICE: this device hasn't
 * signed in to the account before (a code first). FAILED: one answer for wrong,
 * locked or none set. DISABLED: the switch is off. NEED_ID: nothing typed yet.
 */
export type PasscodeProblem = 'NEW_DEVICE' | 'FAILED' | 'DISABLED' | 'NEED_ID' | 'OTHER' | '';

type RememberedResponse = ({ remembered: true } & Omit<RememberedDevice, 'passcode'> & { passcode?: boolean }) | { remembered: false };

interface OtpSendResponse {
  targetMasked: string;
  /** How long the code lives, from the server (it issues 300 s today). The screen never assumes it. */
  expiresInSeconds?: number;
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
  /** Lifetime of the code just sent, as the server reported it; 0 until a code is sent. */
  expiresInSeconds = 0;
  /** HTTP status of the last failed request (401 wrong code, 429 too many tries), or 0. */
  errorStatus = 0;
  audience: AuthAudience = 'STUDENT';
  fullName = '';
  dob = '';
  bloodGroup = '';
  university = '';
  rollNumber = '';
  /**
   * A friend's invite code from the ?ref= link, already normalised, or ''.
   * Optional: the server ignores a code it doesn't know and never blocks
   * registration over one (backend/services/rewards.py).
   */
  referralCode = '';
  /** DPDP consent: three required items, each ticked by the student. */
  consent = new SignupConsentState();
  consentLanguage: Lang = 'en';

  channels: Channel[] = [];
  /** True once GET /auth/options answered: only then does an empty list mean "nothing can deliver". */
  optionsLoaded = false;
  /** The last send failed because its channel could not deliver (503); the screen offers what still works. */
  channelFailure: ChannelFailure | null = null;
  /** Bumped when the screen should move focus to the contact field (after switching to email). */
  focusContactRequest = 0;
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
  /** Staff page: which way the person signs in. */
  signInMethod: StaffSignInMethod = 'CODE';
  /** A team account's PIN while it is typed. Never kept after a try, right or wrong. */
  pin = '';
  /** A team account's password while it is typed. Never kept after a try, right or wrong, and never stored. */
  password = '';
  /** Student sign-in: the passcode panel is open instead of the code form. */
  passcodeEntry = false;
  /** The student's passcode while it is typed. Never kept after a try, right or wrong, and never stored. */
  passcode = '';
  passcodeProblem: PasscodeProblem = '';
  /** The server's own words for a refused passcode (they carry its attempt and lockout numbers). */
  passcodeMessage = '';
  /** Student sign-in: the password panel is open instead of the code form. */
  passwordEntry = false;
  passwordProblem: PasswordProblem = '';
  passwordMessage = '';
  /** Sign-up: the other contact, verified with its own code before the account exists. */
  secondValue = '';
  secondCode = '';
  secondMasked = '';
  secondSent = false;
  secondVerified = false;
  secondProblem: MessageKey | null = null;
  /** Sign-up: the password typed twice. Never stored; emptied after it is sent. */
  passwordAgain = '';
  newPasswordProblem: MessageKey | null = null;

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

  /** Keeps only something shaped like an invite code (src/features/rewards/inviteCode.ts). */
  setReferralCode(raw: string | null): void {
    this.referralCode = normalizeInviteCode(raw);
  }

  setConsentLanguage(lang: Lang): void {
    this.consentLanguage = lang;
  }

  get isLogin(): boolean {
    return this.mode === 'login';
  }

  reset(): void {
    this.step = 1;
    this.channel = this.audience === 'STAFF' ? 'EMAIL' : 'WHATSAPP';
    if (this.audience === 'STUDENT') this.pickOfferedChannel();
    this.identifier = '';
    this.code = '';
    this.masked = '';
    this.fallbackEmail = '';
    this.fallbackNotice = '';
    this.tempToken = '';
    this.twoFaCode = '';
    this.resendAt = 0;
    this.seconds = 0;
    this.expiresInSeconds = 0;
    this.errorStatus = 0;
    this.fullName = '';
    this.dob = '';
    this.bloodGroup = '';
    this.university = '';
    this.rollNumber = '';
    this.consent.reset();
    this.pin = '';
    this.password = '';
    this.passwordAgain = '';
    this.passwordEntry = false;
    this.passwordProblem = '';
    this.newPasswordProblem = null;
    this.secondValue = '';
    this.secondCode = '';
    this.secondSent = false;
    this.secondVerified = false;
    this.secondProblem = null;
    this.passcodeEntry = false;
    this.passcode = '';
    this.passcodeProblem = '';
    this.passcodeMessage = '';
    this.error = '';
    this.twoFaRestart = '';
    this.channelFailure = null;
    this.busy = false;
  }

  dispose(): void {
    this.reset();
  }

  setChannel(channel: Channel): void {
    if (channel !== this.channel) this.identifier = '';
    this.channel = channel;
    this.channelFailure = null;
    if (this.errorStatus === HTTP_UNAVAILABLE) {
      this.error = '';
      this.errorStatus = 0;
    }
  }

  /**
   * The channels to draw, in the board's order. Once /auth/options has
   * answered, exactly what it listed; before that (or if it couldn't be read)
   * both, so a slow network never locks the form: the send itself answers.
   */
  get offeredChannels(): Channel[] {
    if (!this.optionsLoaded) return [...CHANNEL_ORDER];
    return CHANNEL_ORDER.filter((c) => this.channels.includes(c));
  }

  /** The server said no channel can deliver a code right now. */
  get noChannel(): boolean {
    return this.optionsLoaded && this.offeredChannels.length === 0;
  }

  /** The last request was refused because no account uses this address or number (sign in). */
  get noAccount(): boolean {
    return this.isLogin && this.errorStatus === HTTP_NOT_FOUND && this.step === 1;
  }

  /**
   * "Send the code by email instead": one tap after a WhatsApp failure. The
   * typed name is kept; the number is cleared (it is not an email address) and
   * the screen moves focus to the email field.
   */
  useEmailInstead(): void {
    this.setChannel('EMAIL');
    // From the code step (a resend failed), back to the form that asks for it.
    if (this.step === 3) this.step = this.isLogin ? 1 : 2;
    this.focusContactRequest += 1;
  }

  setIdentifier(value: string): void {
    this.identifier = value;
    if (this.passcodeProblem === 'NEED_ID') this.passcodeProblem = '';
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

  setSignInMethod(method: StaffSignInMethod): void {
    this.signInMethod = method;
    this.pin = '';
    this.password = '';
    this.error = '';
    this.errorStatus = 0;
    this.twoFaRestart = '';
  }

  setPin(value: string): void {
    this.pin = value.replace(/\D/g, '').slice(0, STAFF_PIN_LENGTH);
  }

  get canSubmitPin(): boolean {
    return !this.busy && this.identifier.includes('@') && this.pin.length === STAFF_PIN_LENGTH;
  }

  /** Kept exactly as typed: spaces inside a password are part of it. */
  setPassword(value: string): void {
    this.password = value;
  }

  get canSubmitPassword(): boolean {
    return !this.busy && this.identifier.includes('@') && this.password.length > 0;
  }

  /**
   * A team account's ID and PIN (staff page). The server answers every failure
   * the same way and decides lockout; the authenticator step follows when the
   * account has one, exactly as after an emailed code. Nothing is kept from a
   * refused try: no session, and the PIN field empties.
   */
  async signInWithPin(onAccept: (response: SessionResponse) => void): Promise<void> {
    if (!this.canSubmitPin) return;
    const pin = this.pin;
    this.pin = '';
    await this.signInWithSecret('/auth/staff-pin/sign-in', { identifier: this.identifier.trim(), pin }, onAccept);
  }

  /** A team account's ID and password (staff page): the same rules as the PIN, and the field empties. */
  async signInWithPassword(onAccept: (response: SessionResponse) => void): Promise<void> {
    if (!this.canSubmitPassword) return;
    const password = this.password;
    this.password = '';
    await this.signInWithSecret('/auth/staff-password/sign-in', { identifier: this.identifier.trim(), password }, onAccept);
  }

  private async signInWithSecret(path: string, body: Record<string, string>, onAccept: (response: SessionResponse) => void): Promise<void> {
    this.busy = true;
    this.error = '';
    this.errorStatus = 0;
    this.twoFaRestart = '';
    try {
      const response = await apiRequest<SessionResponse>(path, { method: 'POST', body: JSON.stringify(body) });
      runInAction(() => {
        if (response.requires2FA && response.tempToken) {
          this.tempToken = response.tempToken;
          this.twoFaCode = '';
          this.step = 7;
          return;
        }
        this.accept(response, onAccept);
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : 'Could not sign in.';
        this.errorStatus = error instanceof ApiError ? error.status : 0;
      });
    } finally {
      runInAction(() => {
        this.busy = false;
      });
    }
  }

  setField(field: 'fullName' | 'dob' | 'bloodGroup' | 'university' | 'rollNumber', value: string): void {
    this[field] = value;
  }

  setAudience(audience: AuthAudience): void {
    this.audience = audience;
    // Staff sign in by work email only (the server refuses anything else).
    if (audience === 'STAFF') this.channel = 'EMAIL';
  }

  advance(step: number): void {
    this.step = step;
    this.error = '';
    this.errorStatus = 0;
    this.twoFaRestart = '';
  }

  async loadOptions(): Promise<void> {
    this.optionsLoading = true;
    this.optionsError = '';
    try {
      const res = await apiRequest<{ channels?: unknown }>('/auth/options');
      // An answer without a list is not "nothing can deliver": treat it as unread.
      if (!Array.isArray(res?.channels)) throw new Error('Could not load sign-in options.');
      const listed = res.channels;
      runInAction(() => {
        this.channels = listed.filter(isChannel);
        this.optionsLoaded = true;
        this.channelFailure = null;
        this.pickOfferedChannel();
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

  /** Keeps the chosen channel only if it is offered; otherwise the first one that is. */
  private pickOfferedChannel(): void {
    const offered = this.offeredChannels;
    if (offered.length > 0 && !offered.includes(this.channel)) {
      this.channel = offered[0];
      this.identifier = '';
    }
  }

  /** Login only. Any failure shows the normal form: a missing hint costs nothing. */
  async loadRemembered(): Promise<void> {
    if (!this.isLogin) return;
    try {
      const res = await apiRequest<RememberedResponse>('/auth/remembered');
      runInAction(() => {
        this.remembered = res.remembered
          ? { targetMasked: res.targetMasked, channel: res.channel, lastRoute: res.lastRoute, passcode: res.passcode === true }
          : null;
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
        this.expiresInSeconds = response.expiresInSeconds ?? 0;
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
    this.leavePasscode();
  }

  /** The public master switch (auth.passcode_login_enabled): off, no passcode option is drawn. */
  get passcodeEnabled(): boolean {
    return this.audience === 'STUDENT' && this.isLogin && getSetting('auth.passcode_login_enabled') === true;
  }

  /** "Use my passcode" beside "Continue as …": only when the remembered account has one. */
  get rememberedPasscode(): boolean {
    return this.passcodeEnabled && this.remembered?.passcode === true;
  }

  get canSubmitPasscode(): boolean {
    return !this.busy && isPasscodeShape(this.passcode);
  }

  /** Opens the passcode panel. From the typed form it needs the email or number first. */
  startPasscode(): void {
    this.error = '';
    this.errorStatus = 0;
    this.passcode = '';
    this.passcodeMessage = '';
    if (!this.remembered && !this.identifier.trim()) {
      this.passcodeProblem = 'NEED_ID';
      this.focusContactRequest += 1;
      return;
    }
    this.passcodeProblem = '';
    this.passcodeEntry = true;
  }

  leavePasscode(): void {
    this.passcodeEntry = false;
    this.passcode = '';
    this.passcodeProblem = '';
    this.passcodeMessage = '';
  }

  setPasscode(value: string): void {
    this.passcode = value.slice(0, PASSCODE_MAX_LENGTH);
    if (this.passcodeProblem === 'FAILED') this.passcodeProblem = '';
  }

  /**
   * POST /auth/passcode/sign-in. On "Continue as …" the device's remembered
   * account is used (nothing typed is sent); otherwise the typed email or number.
   * The server decides everything: a device that hasn't signed in before is told
   * to use a code first, and every other failure gets one answer. Nothing is kept
   * from a refused try: no session, and the field empties.
   */
  async signInWithPasscode(onAccept: (response: SessionResponse) => void): Promise<void> {
    if (!this.canSubmitPasscode) return;
    const passcode = this.passcode;
    this.passcode = '';
    this.busy = true;
    this.passcodeProblem = '';
    this.passcodeMessage = '';
    this.twoFaRestart = '';
    try {
      const response = await apiRequest<SessionResponse>('/auth/passcode/sign-in', {
        method: 'POST',
        body: JSON.stringify({ passcode, ...(this.remembered ? {} : { identifier: this.identifier.trim() }) }),
      });
      runInAction(() => {
        if (response.requires2FA && response.tempToken) {
          this.tempToken = response.tempToken;
          this.twoFaCode = '';
          this.passcodeEntry = false;
          this.step = 7;
          return;
        }
        this.accept(response, onAccept);
      });
    } catch (error) {
      runInAction(() => {
        const { code } = passcodeDetail(error);
        this.passcodeProblem = code === 'PASSCODE_NEW_DEVICE' ? 'NEW_DEVICE'
          : code === 'PASSCODE_FAILED' ? 'FAILED'
            : code === 'PASSCODE_DISABLED' ? 'DISABLED' : 'OTHER';
        this.passcodeMessage = error instanceof Error ? error.message : '';
      });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  /** Leaves the passcode for a code: "Send a code instead", and the new-device answer's action. */
  async useCodeInstead(): Promise<void> {
    this.leavePasscode();
    if (this.remembered) await this.continueRemembered();
    else await this.sendCode();
  }

  /**
   * "Forgot your passcode?": sign in with a code, then straight on to set a new
   * one (the server lets a fresh code sign-in replace it without the old one).
   */
  async forgotPasscode(): Promise<void> {
    this.next = 'set-passcode';
    await this.useCodeInstead();
  }

  async forgetDevice(): Promise<void> {
    this.busy = true;
    this.error = '';
    try {
      await apiRequest('/auth/remembered/forget', { method: 'POST' });
      runInAction(() => {
        this.remembered = null;
        this.leavePasscode();
      });
    } catch (error) {
      runInAction(() => { this.error = error instanceof Error ? error.message : 'Could not forget this device.'; });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  /** The wait before "Send a new code" comes back: a screen pace from the settings registry. */
  startResendTimer(): void {
    const wait = getSetting('auth.otp_resend_seconds');
    this.resendAt = Date.now() + wait * 1000;
    this.seconds = wait;
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
    this.errorStatus = 0;
    try {
      const response = await apiRequest<OtpSendResponse>('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          identifier: this.identifier,
          channel: this.channel,
          intent: this.isLogin ? 'LOGIN' : 'SIGNUP',
          fallbackEmail: this.channel === 'WHATSAPP' && this.fallbackEmail.includes('@') ? this.fallbackEmail : undefined,
          ...(this.audience === 'STAFF' ? { audience: 'STAFF' } : {}),
        }),
      });
      runInAction(() => {
        this.masked = response.targetMasked;
        this.expiresInSeconds = response.expiresInSeconds ?? 0;
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
        this.errorStatus = error instanceof ApiError ? error.status : 0;
        if (error instanceof ApiError && error.status === HTTP_UNAVAILABLE && this.audience === 'STUDENT') {
          // The channel can't deliver: it drops out of the choice (the server
          // stops offering it too), and the screen offers what still works.
          const failure = channelFailureFrom(error, this.channel, this.offeredChannels);
          this.channelFailure = failure;
          this.channels = failure.remaining;
          this.optionsLoaded = true;
        }
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
    this.errorStatus = 0;
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
          // D-2: the other contact is verified too, whenever its channel can deliver a code.
          this.step = this.secondRequired ? SECOND_CONTACT_STEP : 4;
          return;
        }
        this.accept(response, onAccept);
      });
    } catch (error) {
      runInAction(() => {
        // Nothing is kept from a refused code: no session, and the boxes empty for a fresh try.
        this.error = error instanceof Error ? error.message : 'Could not verify the code.';
        this.errorStatus = error instanceof ApiError ? error.status : 0;
        this.code = '';
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

  // --- student password sign-in (plan tier1-auth-password-2026-10-22, D) ---------

  /** The public switch (auth.password_login_enabled): off, no password option is drawn for students. */
  get studentPasswordEnabled(): boolean {
    return this.audience === 'STUDENT' && this.isLogin && getSetting('auth.password_login_enabled') === true;
  }

  get canSubmitStudentPassword(): boolean {
    return !this.busy && this.identifier.trim().length > 0 && this.password.length > 0;
  }

  /** Opens the password panel. It needs the email or number typed first. */
  startPassword(): void {
    this.error = '';
    this.errorStatus = 0;
    this.password = '';
    this.passwordMessage = '';
    if (!this.identifier.trim()) {
      this.passwordProblem = 'NEED_ID';
      this.focusContactRequest += 1;
      return;
    }
    this.passwordProblem = '';
    this.passwordEntry = true;
  }

  leavePassword(): void {
    this.passwordEntry = false;
    this.password = '';
    this.passwordProblem = '';
    this.passwordMessage = '';
  }

  setStudentPassword(value: string): void {
    this.password = value.slice(0, PASSWORD_MAX_LENGTH);
    if (this.passwordProblem === 'FAILED') this.passwordProblem = '';
  }

  /**
   * POST /auth/password/sign-in with the typed email or number. One answer for
   * every failure; the authenticator step follows where there is one. The field
   * empties after every try, right or wrong.
   */
  async signInWithStudentPassword(onAccept: (response: SessionResponse) => void): Promise<void> {
    if (!this.canSubmitStudentPassword) return;
    const password = this.password;
    this.password = '';
    this.busy = true;
    this.passwordProblem = '';
    this.passwordMessage = '';
    this.twoFaRestart = '';
    try {
      const response = await apiRequest<SessionResponse>('/auth/password/sign-in', {
        method: 'POST',
        body: JSON.stringify({ identifier: this.identifier.trim(), password }),
      });
      runInAction(() => {
        if (response.requires2FA && response.tempToken) {
          this.tempToken = response.tempToken;
          this.twoFaCode = '';
          this.passwordEntry = false;
          this.step = 7;
          return;
        }
        this.accept(response, onAccept);
      });
    } catch (error) {
      runInAction(() => {
        const code = errorCode(error);
        this.passwordProblem = code === 'PASSWORD_FAILED' ? 'FAILED' : code === 'PASSWORD_DISABLED' ? 'DISABLED' : 'OTHER';
        this.passwordMessage = error instanceof Error ? error.message : '';
      });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  /** "Forgot your password?": sign in with a code, then on to Sign-in & security to set a new one. */
  async forgotPassword(): Promise<void> {
    this.next = 'security';
    this.leavePassword();
    await this.sendCode();
  }

  // --- sign-up: the other contact, then a password ------------------------------

  /** The contact not used to start sign-up: email if it began with WhatsApp, and the other way round. */
  get secondChannel(): Channel {
    return this.channel === 'EMAIL' ? 'WHATSAPP' : 'EMAIL';
  }

  /** Required while its channel can deliver a code (the server checks the same). */
  get secondRequired(): boolean {
    return this.offeredChannels.includes(this.secondChannel);
  }

  setSecondValue(value: string): void {
    this.secondValue = value;
    this.secondProblem = null;
  }

  setSecondCode(value: string): void {
    this.secondCode = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    this.secondProblem = null;
  }

  /** Back to typing the other contact (a mistyped one). */
  editSecond(): void {
    this.secondSent = false;
    this.secondVerified = false;
    this.secondCode = '';
    this.secondProblem = null;
  }

  async sendSecondCode(): Promise<void> {
    if (this.busy || !this.secondValue.trim()) return;
    this.busy = true;
    this.secondProblem = null;
    try {
      const sent = await apiRequest<{ targetMasked: string }>('/auth/signup/contact/send-code', {
        method: 'POST', body: JSON.stringify({ value: this.secondValue.trim() }),
      });
      runInAction(() => {
        this.secondMasked = sent.targetMasked;
        this.secondSent = true;
        this.secondVerified = false;
        this.secondCode = '';
      });
    } catch (error) {
      runInAction(() => { this.secondProblem = signupProblem(error); });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  async verifySecondCode(): Promise<void> {
    if (this.busy || this.secondCode.length !== CODE_LENGTH) return;
    const otp = this.secondCode;
    this.secondCode = '';
    this.busy = true;
    this.secondProblem = null;
    try {
      await apiRequest('/auth/signup/contact/verify', { method: 'POST', body: JSON.stringify({ otp }) });
      runInAction(() => {
        this.secondVerified = true;
        this.step = 4;
      });
    } catch (error) {
      runInAction(() => { this.secondProblem = signupProblem(error); });
    } finally {
      runInAction(() => { this.busy = false; });
    }
  }

  setNewPassword(value: string): void {
    this.password = value.slice(0, PASSWORD_MAX_LENGTH);
    this.newPasswordProblem = null;
  }

  setPasswordAgain(value: string): void {
    this.passwordAgain = value.slice(0, PASSWORD_MAX_LENGTH);
    this.newPasswordProblem = null;
  }

  /** The shortest password the server takes (public setting auth.password_min_length). */
  get passwordMinLength(): number {
    return getSetting('auth.password_min_length');
  }

  get newPasswordReady(): boolean {
    return this.password.length >= this.passwordMinLength && this.password === this.passwordAgain;
  }

  /** The password step's Continue: checks length and match here; strength is the server's, at sign-up. */
  confirmNewPassword(next: number): void {
    if (this.password.length < this.passwordMinLength) {
      this.newPasswordProblem = 'authpw.length';
      return;
    }
    if (this.password !== this.passwordAgain) {
      this.newPasswordProblem = 'authpw.mismatch';
      this.passwordAgain = '';
      return;
    }
    this.newPasswordProblem = null;
    this.advance(next);
  }

  async completeSignup(onAccept: (response: SessionResponse) => void): Promise<void> {
    // No consent, no request: the server refuses it too, but don't send it.
    const consent = this.consent.payload(this.consentLanguage);
    if (!consent) {
      this.error = 'Tick the three required items to create your account.';
      return;
    }
    if (!this.newPasswordReady) {
      this.step = PASSWORD_STEP;
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
          password: this.password,
          ...(this.referralCode ? { referralCode: this.referralCode } : {}),
        }),
      });
      runInAction(() => {
        this.password = '';
        this.passwordAgain = '';
        this.accept(response, onAccept);
      });
    } catch (error) {
      runInAction(() => {
        const code = errorCode(error);
        if (code.startsWith('PASSWORD_')) {
          // Back to the password step with the reason; nothing was spent.
          this.newPasswordProblem = signupProblem(error);
          this.password = '';
          this.passwordAgain = '';
          this.step = PASSWORD_STEP;
          return;
        }
        if (code === 'SECOND_CONTACT_REQUIRED') {
          this.secondVerified = false;
          this.step = SECOND_CONTACT_STEP;
          return;
        }
        this.error = error instanceof Error ? error.message : 'Could not complete registration.';
      });
    } finally {
      runInAction(() => {
        this.busy = false;
      });
    }
  }
}
