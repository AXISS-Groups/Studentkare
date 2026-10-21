import React from 'react';
import { TeamAccountBadge } from '@/design-system';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';

/**
 * The "Team account" badge for the signed-in session, or nothing. Every console
 * header draws it: a shared team account (one per role, PIN sign-in) must never
 * look like a person's own login. Only the server's `isTeamAccount` turns it on.
 */
export function TeamBadge({ className }: { className?: string }): React.ReactElement | null {
  const { user } = useAuth();
  const t = useT();
  if (user?.isTeamAccount !== true) return null;
  return <TeamAccountBadge label={t('team.badge')} hint={t('team.badgeHint')} className={className} />;
}
