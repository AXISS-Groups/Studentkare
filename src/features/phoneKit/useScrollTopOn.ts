import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * A new board starts at its top. On the web the page (not a ScrollView)
 * scrolls, so moving between boards of one route would otherwise keep the
 * last board's scroll position. Native screens start at the top already.
 */
export function useScrollTopOn(key: string): void {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [key]);
}
