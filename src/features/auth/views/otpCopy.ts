import type { MessageKey, Vars } from '@/i18n';

/** Code-screen copy shared by the web (OtpVerifyView) and Expo (SignInNativeView) sign-in. */
const SECONDS_PER_MINUTE = 60;

/** "It expires in 5 minutes", from the seconds the server sent — never the board's 10 minutes (D3-3). */
export function expiryCopy(seconds: number): { key: MessageKey; vars?: Vars } {
  if (seconds <= 0) return { key: 'ident.otp.leadUnknown' };
  if (seconds < SECONDS_PER_MINUTE) return { key: 'ident.otp.leadSeconds', vars: { seconds } };
  const minutes = Math.round(seconds / SECONDS_PER_MINUTE);
  return minutes === 1 ? { key: 'ident.otp.leadOne' } : { key: 'ident.otp.lead', vars: { minutes } };
}

/** 29 gives "00:29". */
export function clock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(safe / SECONDS_PER_MINUTE)).padStart(2, '0');
  const ss = String(safe % SECONDS_PER_MINUTE).padStart(2, '0');
  return `${mm}:${ss}`;
}

