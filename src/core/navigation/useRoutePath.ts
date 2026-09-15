import { useLocation } from './navigation';

/**
 * Normalized current route path (no leading slash), e.g. `health`, `admin`,
 * `shop`. Platform-agnostic: reads from whatever router the facade provides.
 */
export function useRoutePath(): string {
  const location = useLocation();
  return location.pathname.replace(/^\//, '');
}
