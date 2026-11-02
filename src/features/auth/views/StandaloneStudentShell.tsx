import React, { useState } from 'react';
import { useT } from '@/i18n';
import { useAuth } from '@/data/contexts/AuthContext';
import { useLiveCartCount } from '@/data/contexts/LiveCartContext';
import { StudentWebShell } from '@/design-system/student-shell/StudentWebShell';
import { ConfirmDialog } from '@/design-system/overlays/ConfirmDialog';
import { useMutation } from '@/components/interface/WorkflowUI';
import { EmergencyHelplinesDialog } from '@/components/interface/InterfaceBar';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { SignOutConsequences } from './SignOutConsequences';

/**
 * The student web shell for a page that is not a workspace route because it
 * must also open signed out (/lost-phone, canvas WebLostPhone). Same chrome and
 * the same SOS, alerts and sign-out behaviour the workspace gives its pages
 * (WorkspaceScreen): helplines one tap away, sign-out only after the confirm.
 * Only for a signed-in student; the caller checks.
 */
export function StandaloneStudentShell({ route, children }: { route: RoutePath; children: React.ReactNode }): React.ReactElement | null {
  const t = useT();
  const { user, logout } = useAuth();
  const cartCount = useLiveCartCount();
  const mutation = useMutation();
  const [sosOpen, setSosOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [remember, setRemember] = useState(false);
  if (!user) return null;
  return (
    <>
      <StudentWebShell
        route={route}
        student={{ fullName: user.fullName, campus: user.university || undefined, verified: user.isVerifiedStudent }}
        cartCount={cartCount}
        onNavigate={(target) => navigate(target)}
        onSos={() => setSosOpen(true)}
        onAlerts={() => navigate('notifications')}
        onSearch={(query) => { window.location.assign(`/shop?q=${encodeURIComponent(query)}`); }}
        onSignOut={() => setConfirmSignOut(true)}
        signingOut={mutation.busy}
        signOutError={mutation.error || null}
      >
        {children}
      </StudentWebShell>
      <ConfirmDialog
        open={confirmSignOut}
        tone="action"
        icon="log-out"
        title={t('launch.signout.title.browser')}
        body={t('launch.signout.body.browser')}
        confirmLabel={t('launch.signout.confirm.browser')}
        busyLabel={t('ws.signingOut')}
        cancelLabel={t('ws.staySignedIn')}
        busy={mutation.busy}
        onConfirm={() => { setConfirmSignOut(false); setRemember(false); mutation.run(() => logout({ remember, lastRoute: route })); }}
        onCancel={() => { setConfirmSignOut(false); setRemember(false); }}
      >
        <SignOutConsequences remember={remember} onRememberChange={setRemember} where="browser" account={{ name: user.fullName, contact: user.email || user.phone }} />
      </ConfirmDialog>
      {sosOpen ? <EmergencyHelplinesDialog onClose={() => setSosOpen(false)} onSendSos={() => { setSosOpen(false); navigate('sos'); }} /> : null}
    </>
  );
}
