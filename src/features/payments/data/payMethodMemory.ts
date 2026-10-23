import { CrossPlatformStorage } from '@/core/storage/CrossPlatformStorage';
import type { PayMethod } from '../viewmodel/PayStepViewModel';

/**
 * The way the student last paid on this device (UPI, card or net banking), so a
 * one-tap reorder can start from the same choice. Only the kind of method is
 * kept: no card, account, VPA, order or item, and nothing about health
 * (guardrail 9). It is a preselection; the gateway still asks for everything.
 */
const KEY = 'studentkare_last_pay_method_v1';
const METHODS: readonly PayMethod[] = ['upi', 'card', 'netbanking'];

export function isPayMethod(value: unknown): value is PayMethod {
  return typeof value === 'string' && (METHODS as readonly string[]).includes(value);
}

export async function lastPayMethod(): Promise<PayMethod | null> {
  const value = await CrossPlatformStorage.get<unknown>(KEY, null);
  return isPayMethod(value) ? value : null;
}

export function rememberPayMethod(method: PayMethod): Promise<void> {
  return CrossPlatformStorage.set(KEY, method);
}
