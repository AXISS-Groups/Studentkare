import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

function matchesQuery(query: string): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(query).matches;
}

/**
 * SSR-safe hook that evaluates a CSS media query and tracks viewport changes.
 *
 * @param query CSS media query string, e.g. "(min-width: 1024px)"
 * @returns boolean indicating whether the query currently matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => matchesQuery(query));

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQueryList = window.matchMedia(query);
    const update = () => setMatches(mediaQueryList.matches);
    update();

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', update);
      return () => {
        mediaQueryList.removeEventListener('change', update);
      };
    }

    // Fallback for older browsers / webkit implementations
    if (typeof mediaQueryList.addListener === 'function') {
      mediaQueryList.addListener(update);
      return () => {
        mediaQueryList.removeListener(update);
      };
    }
  }, [query]);

  return matches;
}
