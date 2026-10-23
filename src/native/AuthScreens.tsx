import React, { useEffect, useState } from 'react';
import { AuthViewModel } from '@/features/auth/viewmodel/AuthViewModel';
import { TwoFactorViewModel } from '@/features/account/viewmodel/TwoFactorViewModel';
import { TwoFactorHeldNativeView } from '@/features/auth/views/TwoFactorHeldNativeView';
import { SignInNativeView } from '@/features/auth/views/SignInNativeView';
import { CreateAccountNativeView } from '@/features/auth/views/CreateAccountNativeView';
import { LostPhoneNativeView } from '@/features/auth/views/LostPhoneNativeView';
import { IdentityVerifyRoute } from '@/features/auth/views/IdentityVerifyPanel';
import { VerifyGateNativeView } from '@/features/auth/views/VerifyGateNativeView';
import { useNavigate } from './navigation';
import { useNativeSession } from './session';

/**
 * After sign-in the native app does not route by URL: `refresh` re-reads the
 * session and the stack is rebuilt from what the server says (signed in, or
 * held to two-step set-up). The web `navigate` would touch window.location.
 */
const routedBySession = () => undefined;

export function SignInScreen(): React.ReactElement {
  const navigate = useNavigate();
  const { refresh } = useNativeSession();
  const [vm] = useState(() => new AuthViewModel('login', null, routedBySession));

  return (
    <SignInNativeView
      vm={vm}
      onNavigateToSignUp={() => navigate('CreateAccount')}
      onNavigateToLostPhone={() => navigate('LostPhone')}
      onSuccess={refresh}
      onHome={() => navigate('Landing')}
    />
  );
}

export function CreateAccountScreen(): React.ReactElement {
  const navigate = useNavigate();
  const { refresh } = useNativeSession();
  const [vm] = useState(() => new AuthViewModel('signup', null, routedBySession));

  return (
    <CreateAccountNativeView
      vm={vm}
      onNavigateToSignIn={() => navigate('SignIn')}
      onSuccess={refresh}
      onHome={() => navigate('Landing')}
    />
  );
}

/** A session held to two-step set-up. The secret goes with the view model when the screen does. */
export function TwoFactorHeldScreen(): React.ReactElement {
  const { refresh, signOut } = useNativeSession();
  const [vm] = useState(() => new TwoFactorViewModel(undefined, refresh));
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <TwoFactorHeldNativeView viewModel={vm} onContinue={refresh} onSignOut={() => void signOut()} />;
}

export function LostPhoneScreen(): React.ReactElement {
  const navigate = useNavigate();
  const { status } = useNativeSession();
  const signedIn = status === 'signedIn';
  return (
    <LostPhoneNativeView
      signedIn={signedIn}
      links={{ signIn: () => navigate('SignIn'), openDigitalId: signedIn ? () => navigate('DigitalId') : undefined }}
    />
  );
}

export function IdentityVerifyScreen(): React.ReactElement {
  const navigate = useNavigate();
  // No campus-verification screen in the app yet: the College ID row says it is done on the web.
  return (
    <IdentityVerifyRoute links={{ back: () => navigate('Home'), openCrisis: () => navigate('Emergency') }} />
  );
}

export function VerifyGateScreen(): React.ReactElement {
  const navigate = useNavigate();
  const emergency = () => navigate('Emergency');
  return (
    <VerifyGateNativeView
      onProceedVerify={() => navigate('Verify')}
      onDismiss={() => navigate('Home')}
      always={{ crisis: emergency, sos: emergency, emergencyCard: emergency }}
    />
  );
}
