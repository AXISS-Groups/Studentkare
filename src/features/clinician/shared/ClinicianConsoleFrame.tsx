import React, { useEffect, useState } from 'react';
import { useAuth } from '@/data/AuthContext';
import { navigate } from '@/lib/workflowRouting';
import { ConfirmDialog } from '@/components/interface/ConfirmDialog';
import { FormError, useMutation } from '@/components/interface/WorkflowUI';
import { SignOutConsequences } from '@/features/auth/views/SignOutConsequences';
import { ClinicianShell } from '@/design-system';
import type { ClinicianNavId } from '@/design-system';
import { defaultConsoleSummarySource } from './consoleSummary';
import type { ConsoleSummary, ConsoleSummarySource } from './consoleSummary';
import { initialsOf } from './names';

export interface ClinicianConsoleFrameProps {
  current: ClinicianNavId;
  /** Top-bar text; `contextShort` is used at phone width. */
  context: string;
  contextShort?: string;
  summarySource?: ConsoleSummarySource;
  children: React.ReactNode;
}

/**
 * Every clinician console screen sits in this: the shell, the signed-in
 * clinician, sidebar badges, and sign-out with its confirmation. A failed
 * summary load only costs the badges — it never blocks the page.
 */
export function ClinicianConsoleFrame({ current, context, contextShort, summarySource, children }: ClinicianConsoleFrameProps): React.ReactElement | null {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState<ConsoleSummary | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const signOut = useMutation();

  useEffect(() => {
    let live = true;
    const source = summarySource ?? defaultConsoleSummarySource();
    source.load().then((result) => { if (live) setSummary(result); }).catch(() => { if (live) setSummary(null); });
    return () => { live = false; };
  }, [summarySource]);

  if (!user) return null;

  return (
    <ClinicianShell
      current={current}
      context={context}
      contextShort={contextShort}
      clinician={{ fullName: user.fullName, initials: initialsOf(user.fullName), credentials: summary?.credentials }}
      counts={summary?.counts}
      twoFactorOn={summary?.twoFactorOn}
      hasUnreadNotifications={summary?.unreadNotifications}
      onNavigate={navigate}
      onPersonalHealth={() => navigate('health')}
      onSignOut={() => setConfirmSignOut(true)}
    >
      {children}
      <FormError message={signOut.error} />
      <ConfirmDialog
        open={confirmSignOut}
        tone="destructive"
        title="Sign out of this device?"
        body={<SignOutConsequences />}
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        busy={signOut.busy}
        onConfirm={() => { setConfirmSignOut(false); void signOut.run(logout); }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </ClinicianShell>
  );
}
