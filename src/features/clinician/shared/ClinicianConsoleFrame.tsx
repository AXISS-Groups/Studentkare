import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { demoDataEnabled } from '@/core/env';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate } from '@/lib/utils/workflowRouting';
import { ConfirmDialog } from '@/components/interface/ConfirmDialog';
import { FormError, useMutation } from '@/components/interface/WorkflowUI';
import { SignOutConsequences } from '@/features/auth/views/SignOutConsequences';
import { ClinicianShell } from '@/design-system';
import type { ClinicianNavId } from '@/design-system';
import { defaultConsoleSummarySource } from './consoleSummary';
import type { ConsoleSummary, ConsoleSummarySource } from './consoleSummary';
import { initialsOf } from './names';
import { TeamBadge } from '@/features/team-accounts/TeamBadge';

export interface ClinicianConsoleFrameProps {
  /** The sidebar item this page belongs to; null for pages outside the sidebar. */
  current: ClinicianNavId | null;
  /** Top-bar text; `contextShort` is used at phone width. */
  context: string;
  contextShort?: string;
  summarySource?: ConsoleSummarySource;
  children: React.ReactNode;
}

type FramePage = Pick<ClinicianConsoleFrameProps, 'current' | 'context' | 'contextShort'>;

/** Set by ClinicianConsoleLayout: pages inside it report their title instead of drawing a shell. */
const LayoutContext = createContext<((page: FramePage) => void) | null>(null);

/**
 * The shell, the signed-in clinician, sidebar badges, and sign-out with its
 * confirmation. A failed summary load only costs the badges — it never blocks the page.
 */
function ConsoleShell({ page, summarySource, children }: { page: FramePage; summarySource?: ConsoleSummarySource; children: React.ReactNode }): React.ReactElement | null {
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
      current={page.current}
      context={page.context}
      contextShort={page.contextShort}
      clinician={{ fullName: user.fullName, initials: initialsOf(user.fullName), credentials: summary?.credentials }}
      counts={summary?.counts}
      twoFactorOn={summary?.twoFactorOn}
      hasUnreadNotifications={summary?.unreadNotifications}
      usePreviewRoutes={demoDataEnabled()}
      onNavigate={navigate}
      onPersonalHealth={() => navigate('health')}
      badge={<TeamBadge />}
      onSignOut={() => setConfirmSignOut(true)}
    >
      {children}
      <FormError message={signOut.error} />
      <ConfirmDialog
        open={confirmSignOut}
        tone="destructive"
        size="compact"
        title="Sign out?"
        body={<SignOutConsequences />}
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        busy={signOut.busy}
        onConfirm={() => { setConfirmSignOut(false); void signOut.run(logout); }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </ClinicianShell>
  );
}

/**
 * One clinician shell for the whole console, mounted once (see App.tsx
 * pageTransitionKey): moving between pages swaps only the page, so the sidebar
 * keeps its place and scroll and the badges load once. Each page still names its
 * sidebar item and title through ClinicianConsoleFrame.
 */
export function ClinicianConsoleLayout({ summarySource, children }: { summarySource?: ConsoleSummarySource; children: React.ReactNode }): React.ReactElement | null {
  const [page, setPage] = useState<FramePage>({ current: null, context: '' });
  return (
    <LayoutContext.Provider value={setPage}>
      <ConsoleShell page={page} summarySource={summarySource}>{children}</ConsoleShell>
    </LayoutContext.Provider>
  );
}

/**
 * Every clinician console page sits in this. Inside ClinicianConsoleLayout it only
 * reports its sidebar item and title to the shared shell; on its own (a page
 * rendered by itself) it draws the whole shell.
 */
export function ClinicianConsoleFrame({ current, context, contextShort, summarySource, children }: ClinicianConsoleFrameProps): React.ReactElement | null {
  const report = useContext(LayoutContext);
  // Before paint, so the shell never shows the previous page's highlight or title.
  useLayoutEffect(() => { report?.({ current, context, contextShort }); }, [report, current, context, contextShort]);

  if (report) return <>{children}</>;
  return <ConsoleShell page={{ current, context, contextShort }} summarySource={summarySource}>{children}</ConsoleShell>;
}
