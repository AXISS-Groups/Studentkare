import { useSyncExternalStore } from 'react';
import { isDev } from '@/core/env';
import type { AccountRole, PartnerKind } from '../../data/workflowTypes';
import { PARTNER_KINDS, partnerKindOf } from './partnerAccess';

/**
 * Development only: preview the partner console as another partner type, without a
 * super admin re-assigning the account. Kept in sessionStorage so a refresh keeps it.
 * In a production build `isDev()` is false, so this is never read and never shown —
 * a real partner only ever gets the type a super admin assigned.
 */
const KEY = 'sk.dev.partnerPreview';
const listeners = new Set<() => void>();

function read(): PartnerKind | null {
  if (!isDev()) return null;
  try {
    const stored = window.sessionStorage.getItem(KEY);
    return PARTNER_KINDS.find(kind => kind === stored) ?? null;
  } catch {
    return null;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** null goes back to the account's assigned type. */
export function setPartnerPreview(kind: PartnerKind | null): void {
  if (!isDev()) return;
  try {
    if (kind) window.sessionStorage.setItem(KEY, kind);
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: the preview simply does not stick */
  }
  listeners.forEach(listener => listener());
}

export function usePartnerPreview(): PartnerKind | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** The type the console is drawn for: the dev preview if one is set, else the assigned type. */
export function useEffectivePartnerKind(user: { role: AccountRole; partnerKind?: string } | null | undefined): PartnerKind | null {
  const preview = usePartnerPreview();
  if (user?.role === 'VENDOR' && preview) return preview;
  return partnerKindOf(user);
}
