import { ApiError, apiRequest } from './http';

/**
 * LiveKit join token for a video consult (POST /consultation/{id}/media-token).
 *
 * The backend decides who may join: the booking student or the assigned doctor,
 * only for a confirmed consult inside its join window. Without a configured
 * LiveKit server it answers 503 MEDIA_UNAVAILABLE and no call can happen.
 * Anything that does not parse as a grant is treated as a failure (fail closed).
 */
export interface MediaGrant {
  url: string;
  token: string;
  room: string;
  identity: string;
  expiresAt: number;
}

type MediaRefusal = 'NOT_CONFIRMED' | 'OUTSIDE_WINDOW' | 'NOT_A_CONSULTATION' | 'NOT_FOUND';

export type MediaTokenResult =
  | { kind: 'granted'; grant: MediaGrant }
  | { kind: 'unavailable' }
  | { kind: 'refused'; code: MediaRefusal; message: string }
  | { kind: 'error'; message: string };

const REFUSALS: readonly MediaRefusal[] = ['NOT_CONFIRMED', 'OUTSIDE_WINDOW', 'NOT_A_CONSULTATION'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMediaUrl(value: string): boolean {
  try {
    return ['wss:', 'ws:', 'https:', 'http:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function parseMediaGrant(body: unknown): MediaGrant | null {
  if (!isRecord(body) || body.available !== true) return null;
  const { url, token, room, identity, expiresAt } = body;
  if (typeof url !== 'string' || !isMediaUrl(url)) return null;
  if (typeof token !== 'string' || !token || typeof room !== 'string' || !room) return null;
  if (typeof identity !== 'string' || !identity || typeof expiresAt !== 'number') return null;
  return { url, token, room, identity, expiresAt };
}

export async function requestMediaToken(appointmentId: string): Promise<MediaTokenResult> {
  try {
    const body = await apiRequest<unknown>(`/consultation/${encodeURIComponent(appointmentId)}/media-token`, { method: 'POST' });
    const grant = parseMediaGrant(body);
    return grant ? { kind: 'granted', grant } : { kind: 'error', message: '' };
  } catch (cause) {
    if (!(cause instanceof ApiError)) return { kind: 'error', message: '' };
    const code = isRecord(cause.detail) && typeof cause.detail.code === 'string' ? cause.detail.code : '';
    if (cause.status === 503 && code === 'MEDIA_UNAVAILABLE') return { kind: 'unavailable' };
    if (cause.status === 404) return { kind: 'refused', code: 'NOT_FOUND', message: cause.message };
    const refusal = REFUSALS.find(entry => entry === code);
    if (cause.status === 409 && refusal) return { kind: 'refused', code: refusal, message: cause.message };
    return { kind: 'error', message: cause.status ? cause.message : '' };
  }
}
