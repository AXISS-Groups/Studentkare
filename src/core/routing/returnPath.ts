import { isRoutePath, publicRoutes } from '@/lib/workflowRouting';
import type { RoutePath } from '@/lib/workflowRouting';

/** Only a single known, protected application route can be a sign-in return target. */
export function readReturnPath(search: string): RoutePath | null {
  const values = new URLSearchParams(search).getAll('next');
  const value = values[0];
  return values.length === 1 && isRoutePath(value) && !publicRoutes.includes(value) ? value : null;
}
