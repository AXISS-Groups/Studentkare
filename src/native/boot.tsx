import React, { Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, Appearance, View } from 'react-native';
import { apiRequest } from '@/data/services/http';
import { skTokens } from '@/theme/tokens/generated/skTokens';
import { setLaunchAppearance } from '@/design-system/nativeScheme';
import { launchAppearance } from '@/features/account/appearance';

/**
 * The longest the launch waits for the account's appearance. Past it the app
 * opens in the phone's scheme; the session check that follows waits on the
 * network anyway.
 */
export const APPEARANCE_WAIT_MS = 1500;

// Loaded only after the scheme is known: every screen's styles read the palette once, at load.
const NativeApp = React.lazy(() => import('./App'));

/**
 * Must not import '@/design-system/theme' or anything that does, directly or
 * through a screen: that would fix the palette before the account's choice
 * is known. Plain tokens only.
 */
function Opening() {
  const palette = skTokens.color[Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.canvas }}>
      <ActivityIndicator color={palette.action} accessibilityLabel="Opening Studentkare" />
    </View>
  );
}

export default function NativeBoot() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    void launchAppearance(apiRequest, APPEARANCE_WAIT_MS).then((preference) => {
      if (!live) return;
      setLaunchAppearance(preference);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);
  if (!ready) return <Opening />;
  return (
    <Suspense fallback={<Opening />}>
      <NativeApp />
    </Suspense>
  );
}
