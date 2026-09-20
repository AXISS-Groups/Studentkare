import { authStore } from '../state/AuthStore';
import type { AuthMode, Channel, AuthUser, SessionResponse } from '../domain/Auth';

export interface AuthViewModelState {
  mode: AuthMode;
  step: number;
  channel: Channel;
  identifier: string;
  code: string;
  masked: string;
  fallbackEmail: string;
  fallbackNotice: string;
  tempToken: string;
  twoFaCode: string;
  fullName: string;
  dob: string;
  bloodGroup: string;
  university: string;
  rollNumber: string;
  channels: Channel[];
  isLogin: boolean;
  isBusy: boolean;
  error: string | null;
  currentUser: AuthUser | null;
}

export interface AuthViewModelActions {
  setMode: (mode: AuthMode) => void;
  setChannel: (channel: Channel) => void;
  setIdentifier: (val: string) => void;
  setCode: (val: string) => void;
  setFallbackEmail: (val: string) => void;
  setTwoFaCode: (val: string) => void;
  setField: (field: 'fullName' | 'dob' | 'bloodGroup' | 'university' | 'rollNumber', val: string) => void;
  advance: (step: number) => void;
  loadOptions: () => Promise<void>;
  sendCode: () => Promise<boolean>;
  verify: () => Promise<SessionResponse | null>;
  completeSignup: () => Promise<SessionResponse | null>;
  reset: () => void;
}

export interface AuthViewModelHook {
  state: AuthViewModelState;
  actions: AuthViewModelActions;
}

export function useAuthViewModel(): AuthViewModelHook {
  return {
    state: {
      mode: authStore.mode,
      step: authStore.step,
      channel: authStore.channel,
      identifier: authStore.identifier,
      code: authStore.code,
      masked: authStore.masked,
      fallbackEmail: authStore.fallbackEmail,
      fallbackNotice: authStore.fallbackNotice,
      tempToken: authStore.tempToken,
      twoFaCode: authStore.twoFaCode,
      fullName: authStore.fullName,
      dob: authStore.dob,
      bloodGroup: authStore.bloodGroup,
      university: authStore.university,
      rollNumber: authStore.rollNumber,
      channels: authStore.channels,
      isLogin: authStore.isLogin,
      isBusy: authStore.isBusy,
      error: authStore.errorMessage,
      currentUser: authStore.currentUser,
    },
    actions: {
      setMode: (m) => authStore.setMode(m),
      setChannel: (c) => authStore.setChannel(c),
      setIdentifier: (val) => authStore.setIdentifier(val),
      setCode: (val) => authStore.setCode(val),
      setFallbackEmail: (val) => authStore.setFallbackEmail(val),
      setTwoFaCode: (val) => authStore.setTwoFaCode(val),
      setField: (field, val) => authStore.setField(field, val),
      advance: (step) => authStore.advance(step),
      loadOptions: () => authStore.loadOptions(),
      sendCode: () => authStore.sendCode(),
      verify: () => authStore.verify(),
      completeSignup: () => authStore.completeSignup(),
      reset: () => authStore.reset(),
    },
  };
}

export { authStore };
