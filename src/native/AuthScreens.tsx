import React, { useState } from 'react';
import { AuthViewModel } from '@/features/auth/viewmodel/AuthViewModel';
import { SignInNativeView } from '@/features/auth/views/SignInNativeView';
import { CreateAccountNativeView } from '@/features/auth/views/CreateAccountNativeView';
import { LostPhoneNativeView } from '@/features/auth/views/LostPhoneNativeView';
import { IdentityVerifyNativeView } from '@/features/auth/views/IdentityVerifyNativeView';
import { VerifyGateNativeView } from '@/features/auth/views/VerifyGateNativeView';
import { useNavigate } from './navigation';
import { useNativeSession } from './session';

export function SignInScreen(): React.ReactElement {
  const navigate = useNavigate();
  const { refresh } = useNativeSession();
  const [vm] = useState(() => new AuthViewModel('login', null));

  return (
    <SignInNativeView
      vm={vm}
      onNavigateToSignUp={() => navigate('CreateAccount')}
      onNavigateToLostPhone={() => navigate('LostPhone')}
      onSuccess={refresh}
    />
  );
}

export function CreateAccountScreen(): React.ReactElement {
  const navigate = useNavigate();
  const { refresh } = useNativeSession();
  const [vm] = useState(() => new AuthViewModel('signup', null));

  return (
    <CreateAccountNativeView
      vm={vm}
      onNavigateToSignIn={() => navigate('SignIn')}
      onSuccess={refresh}
    />
  );
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
  return (
    <IdentityVerifyNativeView
      onBack={() => navigate('Home')}
      onSuccess={() => navigate('Home')}
    />
  );
}

export function VerifyGateScreen(): React.ReactElement {
  const navigate = useNavigate();
  return (
    <VerifyGateNativeView
      serviceName="consultations and health records"
      onProceedVerify={() => navigate('Verify')}
      onDismiss={() => navigate('Home')}
    />
  );
}
