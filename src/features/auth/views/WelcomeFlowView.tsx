import React, { useState } from 'react';
import { useNavigate } from '@/core/navigation';
import { SplashView } from './SplashView';
import { WelcomeCarouselView } from './WelcomeCarouselView';

/**
 * The pre-account entry: splash, then the three-slide intro.
 *
 * They are separate screens in the design pack but one flow in the product,
 * and keeping them on one route means the carousel has something that leads
 * into it. Nothing here touches a session, so it is safe before sign-in.
 */
export function WelcomeFlowView(): React.ReactElement {
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);

  if (started) return <WelcomeCarouselView />;

  return (
    <SplashView
      onStart={() => setStarted(true)}
      onSignIn={() => {
        void navigate('/login');
      }}
    />
  );
}
