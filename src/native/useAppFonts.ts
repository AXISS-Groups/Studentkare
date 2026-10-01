import { useEffect, useState } from 'react';
import * as Font from 'expo-font';

/**
 * Mobile font loader hook.
 * Loads Plus Jakarta Sans and IBM Plex Mono for Expo/React Native,
 * falling back gracefully to system sans-serif / monospace.
 */
export function useAppFonts(): boolean {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        await Font.loadAsync({
          'Plus Jakarta Sans': 'https://fonts.gstatic.com/s/plusjakartasans/v8/LDIbaomQNQcsPfG8CQe6379321U-VPLEV_b6-V_CeLy2i5s.woff2',
          'IBM Plex Mono': 'https://fonts.gstatic.com/s/ibmplexmono/v19/-F6qfjptAgt5VM-kVkqdyU8n1ioa1XN5gg.woff2',
        });
      } catch {
        // Progressive enhancement: system sans/mono used on error or offline
      } finally {
        if (mounted) setFontsLoaded(true);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return fontsLoaded;
}
