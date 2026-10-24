import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate } from '@/lib/utils/workflowRouting';
import { usePhoneHeaderSlot } from '@/design-system/navigation/BoardHeader';
import { ProfileViewModel } from '../viewmodel/ProfileViewModel';
import { AccountDetailsCard } from './AccountDetailsCard';
import { M2ProfileView } from './M2ProfileView';

/**
 * Mobile 2.0 Profile on the web: /profile for a signed-in student. At phone
 * width, Settings opens the frame's More panel (every row the More hub had)
 * and Sign out asks through the frame. Above it (`wide`, Tier 1 parity plan
 * 2026-10-24 §11) the same view is laid out wide with the "Account details"
 * card, and Sign out asks through the desktop shell's own confirm
 * (`onSignOut`). SOS is the shell's (§1).
 */
export const M2ProfileRoute = observer(function M2ProfileRoute({ wide = false, onSignOut }: { wide?: boolean; onSignOut?: () => void } = {}): React.ReactElement {
  const slot = usePhoneHeaderSlot();
  const { logout } = useAuth();
  const [vm] = useState(() => new ProfileViewModel());
  useEffect(() => {
    vm.load();
    return () => vm.dispose();
  }, [vm]);
  const accountDetails = wide ? (
    <AccountDetailsCard
      profile={vm.profile.data ?? null}
      profileFailed={vm.profile.phase === 'error'}
      onRetryProfile={() => void vm.profile.load()}
      onEdited={() => void vm.profile.load()}
      links={{
        verify: () => navigate('verify'),
        rewards: () => navigate('rewards'),
        notifications: () => navigate('notification-settings'),
        privacy: () => navigate('privacy-consent'),
        leaveCampus: () => navigate('leave-campus'),
        deleteAccount: () => navigate('delete-account'),
        digitalId: () => navigate('digital-id'),
      }}
    />
  ) : undefined;
  return (
    <M2ProfileView vm={vm} wide={wide} accountDetails={accountDetails} links={{
      settings: () => (slot ? slot.openMore() : navigate('account')),
      account: () => navigate('account'),
      emergencyCard: () => navigate('emergency-card'),
      pass: () => navigate('pass'),
      documents: () => navigate('records'),
      addDocument: () => navigate('health/report-upload'),
      plus: () => navigate('billing'),
      orders: () => navigate('orders'),
      privacy: () => navigate('privacy-consent'),
      help: () => navigate('support'),
      whatsNew: () => navigate('whats-new'),
      signOut: () => (slot?.askSignOut ? slot.askSignOut() : onSignOut ? onSignOut() : void logout()),
    }} />
  );
});
