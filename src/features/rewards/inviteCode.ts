/**
 * The invite-code protocol shared with the server (backend/services/rewards.py:
 * CODE_ALPHABET, CODE_LENGTH, INVITE_CODE_PARAM). These are definitions, not
 * tunables: changing one would orphan every code already handed out.
 * backend/tests/test_rewards.py checks that both copies stay equal.
 */

/** No 0/O, 1/I/L, so a code read aloud or typed from a screenshot is unambiguous. */
const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;
/** The query parameter of the sign-up link that carries a code (/signup?ref=CODE). */
export const INVITE_CODE_PARAM = 'ref';

/** The code in canonical form (upper case, no spaces or dashes), or '' if it cannot be one. */
export function normalizeInviteCode(raw: string | null | undefined): string {
  const code = (raw ?? '').replace(/[\s-]/g, '').toUpperCase();
  if (code.length !== INVITE_CODE_LENGTH) return '';
  return [...code].every((ch) => INVITE_CODE_ALPHABET.includes(ch)) ? code : '';
}

/** The code carried by a sign-up link's query string (`location.search`), or ''. */
export function inviteCodeFromSearch(search: string): string {
  return normalizeInviteCode(new URLSearchParams(search).get(INVITE_CODE_PARAM));
}
