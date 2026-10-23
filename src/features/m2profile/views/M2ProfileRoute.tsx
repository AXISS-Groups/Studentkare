import React, { useEffect, useState } from 'react';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate } from '@/lib/utils/workflowRouting';
import { usePhoneHeaderSlot } from '@/design-system/navigation/BoardHeader';
import { ProfileViewModel } from '../viewmodel/ProfileViewModel';
import { M2ProfileView } from './M2ProfileView';

/**
 * Mobile 2.0 Profile on the web: /profile for a signed-in student at phone
 * width. Settings opens the frame's More panel (every row the More hub had);
 * Sign out asks through the workspace's own confirm dialog.
 */
export function M2ProfileRoute(): React.ReactElement {
  const slot = usePhoneHeaderSlot();
  const { logout } = useAuth();
  const [vm] = useState(() => new ProfileViewModel());
  useEffect(() => {
    vm.load();
    return () => vm.dispose();
  }, [vm]);
  return (
    <M2ProfileView vm={vm} links={{
      sos: () => (slot?.openSos ? slot.openSos() : navigate('sos')),
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
      signOut: () => (slot?.askSignOut ? slot.askSignOut() : void logout()),
    }} />
  );
}
