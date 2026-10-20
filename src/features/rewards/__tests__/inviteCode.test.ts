import { describe, expect, it } from 'vitest';
import { INVITE_CODE_LENGTH, INVITE_CODE_PARAM, inviteCodeFromSearch, normalizeInviteCode } from '../inviteCode';

describe('invite code protocol', () => {
  it('normalises spacing, dashes and case', () => {
    expect(normalizeInviteCode(' abcd-2345 ')).toBe('ABCD2345');
  });

  it('refuses the wrong length and the ambiguous characters', () => {
    expect(normalizeInviteCode('ABCD234')).toBe('');
    expect(normalizeInviteCode('ABCD23456')).toBe('');
    expect(normalizeInviteCode('ABCD0O1I')).toBe('');
    expect(normalizeInviteCode(null)).toBe('');
    expect(normalizeInviteCode('A'.repeat(INVITE_CODE_LENGTH))).toBe('A'.repeat(INVITE_CODE_LENGTH));
  });

  it('reads the code from the sign-up link parameter only', () => {
    expect(inviteCodeFromSearch(`?${INVITE_CODE_PARAM}=abcd2345`)).toBe('ABCD2345');
    expect(inviteCodeFromSearch('?code=ABCD2345')).toBe('');
    expect(inviteCodeFromSearch('')).toBe('');
  });
});
