import React from 'react';
import { TeamAccountBadge } from '@/design-system';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';

/**
 * The session's user, or null outside an AuthProvider (a shell rendered on its own,
 * as in its tests). useAuth reads the context first either way, so hook order holds.
 * No session means no badge: it is never assumed.
 */
function useSignedInUser(): { isTeamAccount?: boolean } | null {
  try {
    return useAuth().user ?? null;
  } catch {
    return null;
  }
}

/**
 * The "Team account" badge for the signed-in session, or nothing. Every console
 * header draws it: a shared team account (one per role, PIN sign-in) must never
 * look like a person's own login. Only the server's `isTeamAccount` turns it on.
 */
export function TeamBadge({ className }: { className?: string }): React.ReactElement | null {
  const user = useSignedInUser();
  const t = useT();
  if (user?.isTeamAccount !== true) return null;
  return <TeamAccountBadge label={t('team.badge')} hint={t('team.badgeHint')} className={className} />;
}
