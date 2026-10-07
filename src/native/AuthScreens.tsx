import React, { useState } from 'react';
import { AuthViewModel } from '@/features/auth/viewmodel/AuthViewModel';
import { SignInNativeView } from '@/features/auth/views/SignInNativeView';
import { CreateAccountNativeView } from '@/features/auth/views/CreateAccountNativeView';
import { LostPhoneNativeView } from '@/features/auth/views/LostPhoneNativeView';
import { IdentityVerifyNativeView } from '@/features/auth/views/IdentityVerifyNativeView';
import { VerifyGateNativeView } from '@/features/auth/views/VerifyGateNativeView';
import { GuardianConsentNativeView } from '@/features/auth/views/GuardianConsentNativeView';
import { useNavigate } from './navigation';

export function SignInScreen(): React.ReactElement {
  const navigate = useNavigate();
  const [vm] = useState(() => new AuthViewModel('login', null));

  return (
    <SignInNativeView
      vm={vm}
      onNavigateToSignUp={() => navigate('CreateAccount')}
      onNavigateToLostPhone={() => navigate('LostPhone')}
      onSuccess={() => navigate('Vault')}
    />
  );
}

export function CreateAccountScreen(): React.ReactElement {
  const navigate = useNavigate();
  const [vm] = useState(() => new AuthViewModel('signup', null));

  return (
    <CreateAccountNativeView
      vm={vm}
      onNavigateToSignIn={() => navigate('SignIn')}
      onSuccess={() => navigate('Verify')}
    />
  );
}

export function LostPhoneScreen(): React.ReactElement {
  const navigate = useNavigate();
  return (
    <LostPhoneNativeView
      onBack={() => navigate('SignIn')}
      onSuccess={() => navigate('SignIn')}
    />
  );
}

export function IdentityVerifyScreen(): React.ReactElement {
  const navigate = useNavigate();
  return (
    <IdentityVerifyNativeView
      onBack={() => navigate('Vault')}
      onSuccess={() => navigate('Vault')}
    />
  );
}

export function VerifyGateScreen(): React.ReactElement {
  const navigate = useNavigate();
  return (
    <VerifyGateNativeView
      serviceName="consultations &amp; health records"
      onProceedVerify={() => navigate('Verify')}
      onDismiss={() => navigate('Landing')}
    />
  );
}

export function GuardianConsentScreen(): React.ReactElement {
  const navigate = useNavigate();
  return (
    <GuardianConsentNativeView
      onBack={() => navigate('SignIn')}
      onSuccess={() => navigate('Vault')}
    />
  );
}
