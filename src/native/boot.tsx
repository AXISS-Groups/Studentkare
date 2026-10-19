import React, { Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, Appearance, View } from 'react-native';
import { apiRequest } from '@/data/services/http';
import { getSetting, loadPublicConfig } from '@/data/services/config';
import { LanguageProvider, useT } from '@/i18n';
import { skTokens } from '@/theme/tokens/generated/skTokens';
import { setLaunchAppearance } from '@/design-system/nativeScheme';
import { launchAppearance } from '@/features/account/appearance';

/**
 * The longest the launch waits for the account's appearance: the
 * `appearance.boot_wait_ms` setting (backend/core/settings_registry.py). Past
 * it the app opens in the phone's scheme; the session check that follows
 * waits on the network anyway.
 */
export const appearanceWaitMs = (): number => getSetting('appearance.boot_wait_ms');

// Loaded only after the scheme is known: every screen's styles read the palette once, at load.
const NativeApp = React.lazy(() => import('./App'));

/**
 * Must not import '@/design-system/theme' or anything that does, directly or
 * through a screen: that would fix the palette before the account's choice
 * is known. Plain tokens only. Has its own LanguageProvider (the app's is
 * inside ./App), so the label follows the language saved on this phone.
 */
function OpeningSpinner() {
  const t = useT();
  const palette = skTokens.color[Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.canvas }}>
      <ActivityIndicator color={palette.action} accessibilityLabel={t('appearance.opening')} />
    </View>
  );
}

function Opening() {
  return (
    <LanguageProvider>
      <OpeningSpinner />
    </LanguageProvider>
  );
}

export default function NativeBoot() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    // The public settings are fetched once here for the whole native app (getSetting
    // reads them from then on); the appearance read does not wait for them.
    void launchAppearance(apiRequest, appearanceWaitMs, loadPublicConfig()).then((preference) => {
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
