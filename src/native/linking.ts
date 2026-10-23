import type { LinkingOptions, NavigationState, PartialState } from '@react-navigation/native';
import type { NativeSessionStatus } from './session';
import type { RootStackParamList } from './App';

/**
 * Deep links for the phone app: the `studentkare://` scheme and the public web
 * domain (universal links on iOS, verified App Links on Android). A link opens
 * the matching screen when it exists in the current session's stack and the
 * nearest honest screen otherwise (a signed-out student opening an order gets
 * Sign in). Nothing from the link is logged, and a fragment (`#token=…` on an
 * invite) is dropped: the phone has no invite redemption yet, so `/claim` is
 * served by the web and only the custom scheme reaches the app (see
 * deploy/well-known/).
 *
 * Keep the web paths in step with LINK_PATH_PREFIXES in app.config.ts.
 */
export const LINK_PREFIXES = ['studentkare://', 'https://studentkare.co', 'https://www.studentkare.co'];

type RouteName = keyof RootStackParamList;
export type DeepLinkTarget = { [K in RouteName]: { name: K; params?: RootStackParamList[K] } }[RouteName];

const FIND_CARE_SEGMENTS = ['hospitals', 'pharmacies', 'ambulance', 'doctors'] as const;
type FindCareSegment = (typeof FIND_CARE_SEGMENTS)[number];

function isFindCareSegment(value: string | null): value is FindCareSegment {
  return FIND_CARE_SEGMENTS.some((segment) => segment === value);
}

function nonEmpty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function safeDecode(part: string): string | undefined {
  try {
    return nonEmpty(decodeURIComponent(part));
  } catch {
    return undefined;
  }
}

/** Splits a path such as `/orders/abc?x=1#frag` (scheme and host already removed). */
function splitPath(path: string): { segments: string[]; query: URLSearchParams } {
  const withoutFragment = path.split('#')[0] ?? '';
  const [pathname = '', search = ''] = withoutFragment.split('?');
  return {
    segments: pathname.split('/').filter((segment) => segment.length > 0),
    query: new URLSearchParams(search),
  };
}

/**
 * Which screen a link opens for this session, or null when the app has no
 * screen for it (the link is then ignored and the app opens as usual).
 */
export function resolveDeepLink(path: string, status: NativeSessionStatus): DeepLinkTarget | null {
  if (status !== 'signedIn' && status !== 'signedOut') return null;
  const signedIn = status === 'signedIn';
  const { segments, query } = splitPath(path);
  const [first, second] = segments;

  switch (first) {
    case 'login':
    case 'claim':
      return signedIn ? { name: 'Home' } : { name: 'SignIn' };
    case 'orders': {
      if (!signedIn) return { name: 'SignIn' };
      const orderId = second === undefined ? undefined : safeDecode(second);
      return orderId ? { name: 'Orders', params: { orderId } } : { name: 'Orders' };
    }
    // Where a tapped push opens (backend/core/push_copy.CATEGORIES path). All signed in.
    case 'notifications':
      return signedIn ? { name: 'Notifications' } : { name: 'SignIn' };
    case 'medications':
      return signedIn ? { name: 'MedicineReminders' } : { name: 'SignIn' };
    case 'health-camp':
      return signedIn ? { name: 'Camps' } : { name: 'SignIn' };
    case 'consult':
    case 'consults':
      return signedIn ? { name: 'Consults' } : { name: 'Consult' };
    case 'medicine-info': {
      const medicineId = nonEmpty(query.get('medicine')) ?? (second === undefined ? undefined : safeDecode(second));
      if (medicineId) return { name: 'MedicineInfo', params: { medicineId } };
      const search = nonEmpty(query.get('q'));
      return search ? { name: 'MedicineInfo', params: { query: search } } : { name: 'MedicineInfo' };
    }
    case 'find-care': {
      const segment = query.get('segment');
      const placeId = nonEmpty(query.get('place'));
      if (!isFindCareSegment(segment) && !placeId) return { name: 'FindCare' };
      return { name: 'FindCare', params: { ...(isFindCareSegment(segment) ? { segment } : {}), ...(placeId ? { placeId } : {}) } };
    }
    default:
      return null;
  }
}

type RootState = PartialState<NavigationState<RootStackParamList>>;

/** The stack a link opens: the session's start screen with the target on top, so Back works. */
export function deepLinkState(path: string, status: NativeSessionStatus): RootState | undefined {
  const target = resolveDeepLink(path, status);
  if (!target) return undefined;
  const base: RouteName = status === 'signedIn' ? 'Home' : 'Landing';
  const routes = target.name === base ? [target] : [{ name: base }, target];
  return { index: routes.length - 1, routes };
}

/**
 * A tapped push as a link: its path (a site path such as `/orders`) on the app scheme.
 */
export function pushLink(path: string): string {
  return `studentkare:/${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Linking options for the NavigationContainer. The first URL is held until the
 * session check settles (the stack does not exist before that); later links
 * use whatever the session is when they arrive.
 */
export function createLinking(
  readStatus: () => NativeSessionStatus,
  sessionSettled: () => Promise<void>,
  initialUrl: () => Promise<string | null>,
  subscribe?: LinkingOptions<RootStackParamList>['subscribe'],
): LinkingOptions<RootStackParamList> {
  return {
    prefixes: LINK_PREFIXES,
    // Links and tapped pushes (src/native/App.tsx); without it, links only.
    ...(subscribe ? { subscribe } : {}),
    async getInitialURL() {
      const url = await initialUrl();
      await sessionSettled();
      return url;
    },
    getStateFromPath: (path) => deepLinkState(path, readStatus()),
  };
}
