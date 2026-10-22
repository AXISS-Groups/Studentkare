import React, { useEffect, useState } from 'react';
import { usePhoneFrame } from '@/design-system/navigation/usePhoneFrame';
import { useAuth } from '@/data/contexts/AuthContext';
import { homeForRole, navigate } from '@/lib/utils/workflowRouting';
import { PasscodeViewModel } from '../viewmodel/PasscodeViewModel';
import { SignInFrame } from '../views/SignInFrame';
import { SetPasscodeView } from '../views/SetPasscodeView';

/**
 * /set-passcode (students): after creating an account, from Sign-in & security,
 * and after "forgot passcode" (a fresh code sign-in lands here). Drawn in the
 * sign-in frame, so the emergency strip and language switch stay in view. The
 * view model is dropped with the screen, and what was typed with it.
 */
export function SetPasscodeScreen(): React.ReactElement {
  const auth = useAuth();
  const phone = usePhoneFrame();
  const [vm] = useState(() => new PasscodeViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  const done = () => navigate(auth.user ? homeForRole(auth.user.role) : 'login');
  return (
    <SignInFrame web={!phone} onBack={done} regionLabel="authpc.set.region">
      <SetPasscodeView vm={vm} onDone={done} />
    </SignInFrame>
  );
}
