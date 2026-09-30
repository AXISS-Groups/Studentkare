import React, { useEffect, useState } from 'react';
import { isDev } from '@/core/env';
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
  /**
   * A Tier 1 screen built ahead of its named design review and clinical
   * sign-off. Shows a banner saying so; the screen is reachable in
   * development only.
   */
  reviewPending?: boolean;
  children: React.ReactNode;
}

/**
 * Every clinician console screen sits in this: the shell, the signed-in
 * clinician, sidebar badges, and sign-out with its confirmation. A failed
 * summary load only costs the badges — it never blocks the page.
 */
export function ClinicianConsoleFrame({ current, context, contextShort, summarySource, reviewPending = false, children }: ClinicianConsoleFrameProps): React.ReactElement | null {
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
      usePreviewRoutes={isDev()}
      onNavigate={navigate}
      onPersonalHealth={() => navigate('health')}
      onSignOut={() => setConfirmSignOut(true)}
    >
      {reviewPending ? (
        <p className="sk-review-banner" role="note">
          <strong>Preview — awaiting clinical sign-off.</strong> Built from the design with sample data. A named design reviewer and clinical sign-off are needed before this screen reaches production.
        </p>
      ) : null}
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
