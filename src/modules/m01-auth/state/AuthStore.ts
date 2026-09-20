import { makeAutoObservable, runInAction } from 'mobx';
import type { AuthMode, Channel, AuthUser, SessionResponse } from '../domain/Auth';
import { authRepository } from '../data/AuthRepository';

export type AuthStoreStatus =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'authenticated'; user: AuthUser }
  | { kind: 'error'; message: string };

export class AuthStore {
  mode: AuthMode = 'login';
  step = 1;
  channel: Channel = 'WHATSAPP';
  identifier = '';
  code = '';
  masked = '';
  fallbackEmail = '';
  fallbackNotice = '';
  tempToken = '';
  twoFaCode = '';
  fullName = '';
  dob = '';
  bloodGroup = '';
  university = '';
  rollNumber = '';

  channels: Channel[] = [];
  status: AuthStoreStatus = { kind: 'idle' };
  currentUser: AuthUser | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get isLogin(): boolean {
    return this.mode === 'login';
  }

  get isBusy(): boolean {
    return this.status.kind === 'busy';
  }

  get errorMessage(): string | null {
    return this.status.kind === 'error' ? this.status.message : null;
  }

  setMode(mode: AuthMode): void {
    this.mode = mode;
  }

  setChannel(channel: Channel): void {
    this.channel = channel;
    this.identifier = '';
  }

  setIdentifier(val: string): void {
    this.identifier = val;
  }

  setCode(val: string): void {
    this.code = val.replace(/\D/g, '').slice(0, 6);
  }

  setFallbackEmail(val: string): void {
    this.fallbackEmail = val;
  }

  setTwoFaCode(val: string): void {
    this.twoFaCode = val.replace(/\D/g, '').slice(0, 6);
  }

  setField(field: 'fullName' | 'dob' | 'bloodGroup' | 'university' | 'rollNumber', val: string): void {
    this[field] = val;
  }

  advance(step: number): void {
    this.step = step;
    this.status = { kind: 'idle' };
  }

  async loadOptions(): Promise<void> {
    try {
      const channels = await authRepository.loadOptions();
      runInAction(() => {
        this.channels = channels;
        if (channels.length === 1) this.channel = channels[0];
      });
    } catch {
      runInAction(() => {
        this.channels = ['WHATSAPP', 'EMAIL'];
      });
    }
  }

  async sendCode(): Promise<boolean> {
    this.status = { kind: 'busy' };
    try {
      const response = await authRepository.sendCode({
        identifier: this.identifier,
        channel: this.channel,
        intent: this.isLogin ? 'LOGIN' : 'SIGNUP',
        fallbackEmail: this.channel === 'WHATSAPP' && this.fallbackEmail.includes('@') ? this.fallbackEmail : undefined,
      });

      runInAction(() => {
        this.masked = response.targetMasked;
        this.code = '';
        this.step = 3;
        this.fallbackNotice = response.fallbackSent ? (response.message || 'Sent to backup email.') : '';
        this.status = { kind: 'idle' };
      });
      return true;
    } catch (err: unknown) {
      runInAction(() => {
        const message = err instanceof Error ? err.message : 'Could not send the code.';
        this.status = { kind: 'error', message };
      });
      return false;
    }
  }

  async verify(): Promise<SessionResponse | null> {
    this.status = { kind: 'busy' };
    try {
      const response = await authRepository.verifyCode({ otp: this.code });
      runInAction(() => {
        if (response.requires2FA && response.tempToken) {
          this.tempToken = response.tempToken;
          this.twoFaCode = '';
          this.step = 7;
          this.status = { kind: 'idle' };
          return;
        }
        if (this.mode === 'signup' && response.requiresSignup) {
          if (response.csrfToken) authRepository.setCsrfToken(response.csrfToken);
          this.step = 4;
          this.status = { kind: 'idle' };
          return;
        }
        if (response.user) {
          this.currentUser = response.user;
          this.status = { kind: 'authenticated', user: response.user };
        }
      });
      return response;
    } catch (err: unknown) {
      runInAction(() => {
        const message = err instanceof Error ? err.message : 'Could not verify the code.';
        this.status = { kind: 'error', message };
      });
      return null;
    }
  }

  async completeSignup(): Promise<SessionResponse | null> {
    this.status = { kind: 'busy' };
    try {
      const response = await authRepository.completeSignup({
        fullName: this.fullName,
        dob: this.dob,
        university: this.university,
        rollNumber: this.rollNumber,
        bloodGroup: this.bloodGroup,
      });

      runInAction(() => {
        if (response.user) {
          this.currentUser = response.user;
          this.status = { kind: 'authenticated', user: response.user };
        }
      });
      return response;
    } catch (err: unknown) {
      runInAction(() => {
        const message = err instanceof Error ? err.message : 'Could not complete registration.';
        this.status = { kind: 'error', message };
      });
      return null;
    }
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
    this.fullName = '';
    this.dob = '';
    this.bloodGroup = '';
    this.university = '';
    this.rollNumber = '';
    this.status = { kind: 'idle' };
    this.currentUser = null;
  }
}

export const authStore = new AuthStore();
