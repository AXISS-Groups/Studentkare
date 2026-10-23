import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { CAMPUS_NAV_ITEMS, CampusShell } from '@/design-system';
import type { CampusScopeOption } from '@/design-system';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { ConfirmDialog } from '@/components/interface/ConfirmDialog';
import { FormError, useMutation } from '@/components/interface/WorkflowUI';
import { PageTransition } from '@/components/interface/PageTransition';
import { ScreenLoading } from '@/components/health/ScreenLoading';
import { SignOutConsequences } from '@/features/auth/views/SignOutConsequences';
import { initialsOf } from '@/features/clinician/shared/names';
import { CAMPUS_PAGES } from './campusPages';
import { CampusPendingPage } from './CampusPendingPage';
import { liveCampusConsoleSummarySource } from './campusConsoleSummary';
import type { CampusConsoleSummary, CampusConsoleSummarySource } from './campusConsoleSummary';
import { CampusScopeContext, WHOLE_CAMPUS_SCOPE_ID } from './campusScope';
import { TeamBadge } from '@/features/team-accounts/TeamBadge';
import './campus-console.css';

export function hasCampusPage(route: RoutePath): boolean {
  return CAMPUS_PAGES[route] !== undefined;
}

/**
 * The campus console: one shell for every page-4 board, mounted once (see
 * App.tsx pageTransitionKey), so moving between boards swaps only the page and
 * the sidebar keeps its place. Badges, the 2FA chip and the unread dot reload
 * on each move; a failed load costs only those, never the page.
 */
export function CampusConsole({ route, summarySource = liveCampusConsoleSummarySource }: { route: RoutePath; summarySource?: CampusConsoleSummarySource }): React.ReactElement | null {
  const t = useT();
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState<CampusConsoleSummary | null>(null);
  const [scope, setScope] = useState(WHOLE_CAMPUS_SCOPE_ID);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const signOut = useMutation();

  useEffect(() => {
    let live = true;
    summarySource.load().then((result) => { if (live) setSummary(result); }).catch(() => { if (live) setSummary(null); });
    return () => { live = false; };
  }, [summarySource, route]);

  const scopes = useMemo<CampusScopeOption[]>(() => [
    { id: WHOLE_CAMPUS_SCOPE_ID, label: t('campusShell.scope.campus'), meta: t('campusShell.scope.campusMeta') },
  ], [t]);
  const scopeValue = useMemo(() => {
    const chosen = scopes.find((option) => option.id === scope) ?? scopes[0];
    return { id: chosen.id, label: chosen.label };
  }, [scopes, scope]);

  const page = CAMPUS_PAGES[route];
  if (!user || !page) return null;

  const superAdmin = user.role === 'SUPER_ADMIN';
  const campus = user.university.trim();
  const campusLabel = superAdmin ? t('campusShell.allCampuses') : campus || t('campusShell.noCampus');
  const roleLine = superAdmin ? t('campusShell.roleLineAll') : t('campusShell.roleLine', { campus: campusLabel });
  const navItem = CAMPUS_NAV_ITEMS.find((item) => item.id === page.current);
  const Screen = page.screen;

  return (
    <CampusScopeContext.Provider value={scopeValue}>
      <CampusShell
        current={page.current}
        identity={{ fullName: user.fullName, initials: initialsOf(user.fullName), roleLabel: t(superAdmin ? 'campusShell.role.SUPER_ADMIN' : 'campusShell.role.CAMPUS_ADMIN') }}
        roleLine={roleLine}
        campusLabel={campusLabel}
        scopes={scopes}
        scope={scopeValue.id}
        onScopeChange={setScope}
        scopeNote={t('campusShell.scope.blocksPending')}
        counts={summary?.counts}
        twoFactorOn={summary?.twoFactorOn}
        unreadNotifications={summary?.unreadNotifications}
        topBar={page.topBar}
        onNavigate={(target) => navigate(target)}
        onSignOut={() => setConfirmSignOut(true)}
        badge={<TeamBadge />}
      >
        <PageTransition key={route}>
          <Suspense fallback={<ScreenLoading />}>
            {Screen ? <Screen /> : <CampusPendingPage title={page.title} icon={navItem?.icon ?? 'info'} />}
          </Suspense>
        </PageTransition>
        <FormError message={signOut.error} />
        <ConfirmDialog
          open={confirmSignOut}
          tone="destructive"
          size="compact"
          title={t('ws.signOutTitle')}
          body={<SignOutConsequences remember={rememberDevice} onRememberChange={setRememberDevice} />}
          confirmLabel={t('home.signOut')}
          cancelLabel={t('ws.staySignedIn')}
          busy={signOut.busy}
          onConfirm={() => { setConfirmSignOut(false); setRememberDevice(false); void signOut.run(() => logout({ remember: rememberDevice, lastRoute: route })); }}
          onCancel={() => { setConfirmSignOut(false); setRememberDevice(false); }}
        />
      </CampusShell>
    </CampusScopeContext.Provider>
  );
}
