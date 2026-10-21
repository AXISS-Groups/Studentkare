import React, { useMemo, useRef, useState } from 'react';
import { PhoneHeader } from '@/design-system/navigation/PhoneHeader';
import { BoardToolbar, PhoneHeaderSlotProvider } from '@/design-system/navigation/BoardHeader';
import type { BoardHeaderConfig, PhoneHeaderSlot } from '@/design-system/navigation/BoardHeader';
import type { PhoneHeaderAction } from '@/design-system/navigation/PhoneHeader';
import { PillNav } from '@/design-system/m2';
import type { PillNavKey } from '@/design-system/m2';
import { useT } from '@/i18n';
import { EmergencyHelplinesDialog } from '@/components/interface/InterfaceBar';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';

/**
 * The Mobile 2.0 pill nav on the web (canvas page 9, approved 2026-10-21): Home
 * · Orders · Ask Ayush · My health · Profile, replacing the five-tab bar
 * (Discover · Wellness · Ayush AI · Lab Tests · Your Care). Destination, then
 * the web route it opens:
 * - Home (M2Home) opens /health, the student home.
 * - Orders (M2Orders) opens /orders.
 * - Ask Ayush (M2AskAyush) opens /ayush.
 * - My health (M2Insights) opens /your-care.
 * - Profile (M2Profile) opens /profile.
 * The old tabs' shop and lab tests are on Home's service rail.
 */
export const STUDENT_NAV_ROUTES: Readonly<Record<PillNavKey, RoutePath>> = {
  home: 'health',
  orders: 'orders',
  ayush: 'ayush',
  health: 'your-care',
  profile: 'profile',
};

/** The store boards opened from Home's rail: the boards draw Home as current there. */
const HOME_STORE_ROUTES: ReadonlySet<RoutePath> = new Set<RoutePath>([
  // keep-sorted start
  'care',
  'find-care',
  'insurance',
  'lab-tests',
  'preventive-care',
  'shop',
  // keep-sorted end
]);

/** The My health screens opened from Insights (M2Trends, M2ReportUpload, M2Steps): the nav shows My health there. */
const HEALTH_ROUTES: ReadonlySet<RoutePath> = new Set<RoutePath>([
  // keep-sorted start
  'health/medicines',
  'health/report-upload',
  'health/steps',
  'health/trends',
  'health/water',
  // keep-sorted end
]);

/** The pill-nav destination a route belongs to (null: none is current). */
export function studentNavFor(route: RoutePath): PillNavKey | null {
  const key = (Object.keys(STUDENT_NAV_ROUTES) as PillNavKey[]).find((k) => STUDENT_NAV_ROUTES[k] === route);
  if (key) return key;
  if (HEALTH_ROUTES.has(route)) return 'health';
  return HOME_STORE_ROUTES.has(route) ? 'home' : null;
}

/** Whether a route is a nav destination itself (no back button in the header). */
export function isStudentNavRoot(route: RoutePath): boolean {
  return (Object.values(STUDENT_NAV_ROUTES) as RoutePath[]).includes(route);
}

export interface StudentPhoneFrameProps {
  route: RoutePath;
  /** Already translated page title (ignored on Discover, which shows the brand). */
  title: string;
  /** The More panel (the student menu): open state, toggle, and the panel's id. */
  menu: { open: boolean; onToggle: () => void; controls: string };
  /** Drawn under the header while the menu is open. */
  menuPanel?: React.ReactNode;
  /** The page draws its own back control (a phone board's search bar or header), so the header adds none. */
  ownBack?: boolean;
  /** The page draws its own gutters and full-width bands (the phone boards), so the frame adds no side padding. */
  bleed?: boolean;
  /** Asks to sign out (a board's own Sign out, M2Profile). */
  onSignOut?: () => void;
  children: React.ReactNode;
}

function goBack(): void {
  if (typeof window !== 'undefined' && window.history.length > 1) window.history.back();
  else navigate('health');
}

/**
 * The phone boards' frame for a signed-in student on the web at phone width
 * (`size.phoneFrameMax`): the phone header on top (a Mobile 2.0 board draws
 * its own), the page, and the Mobile 2.0 pill nav floating at the bottom. Replaces the desktop web shell (sidebar, app
 * bar and its quick links) there. SOS stays one tap away in the header on
 * every page, as it was in the app bar it replaces.
 */
export function StudentPhoneFrame({ route, title, menu, menuPanel, ownBack = false, bleed = false, onSignOut, children }: StudentPhoneFrameProps): React.ReactElement {
  const t = useT();
  const [sosOpen, setSosOpen] = useState(false);
  // A phone board's own header (BoardHeader), when the page draws one.
  const [board, setBoard] = useState<BoardHeaderConfig | null>(null);
  // A Mobile 2.0 board draws its whole header itself (back, cart, SOS).
  const [ownChrome, setOwnChrome] = useState(false);
  const menuNow = useRef(menu);
  menuNow.current = menu;
  const signOutNow = useRef(onSignOut);
  signOutNow.current = onSignOut;
  // Stable for the frame's life, so a re-render of the page never re-sends its header.
  const slot = useMemo<PhoneHeaderSlot>(() => ({
    set: setBoard,
    openMore: () => { if (!menuNow.current.open) menuNow.current.onToggle(); },
    setOwnChrome,
    openSos: () => setSosOpen(true),
    askSignOut: () => signOutNow.current?.(),
  }), []);
  const current = studentNavFor(route);
  const root = isStudentNavRoot(route);
  const discover = route === 'health';
  const actions: PhoneHeaderAction[] = [
    ...(discover ? [{ key: 'notifications', icon: 'bell-dome' as const, label: t('bar.notifications'), onPress: () => navigate('notifications') }] : []),
    { key: 'menu', icon: 'menu', label: menu.open ? t('ws.closeNav') : t('ws.openNav'), onPress: menu.onToggle, expanded: menu.open, controls: menu.controls },
    { key: 'sos', icon: 'shield-2', label: t('bar.sos'), onPress: () => setSosOpen(true), tone: 'sos', showLabel: true },
  ];
  return (
    <div className="sk-phone-frame" style={frame}>
      {ownChrome ? null : <div style={top}>
        <PhoneHeader
          title={discover ? t('phone.brand') : board?.title ?? title}
          subtitle={board?.subtitle}
          brand={discover}
          back={root || ownBack ? undefined : { label: board?.backLabel ?? t('common.back'), onPress: goBack, icon: board?.backIcon }}
          actions={actions}
        />
        <BoardToolbar actions={board?.actions} trailing={board?.trailing} />
      </div>}
      {menu.open ? <div style={menuWrap}>{menuPanel}</div> : null}
      <main className="sk-phone-frame__main" style={bleed ? bleedMain : main}><PhoneHeaderSlotProvider value={slot}>{children}</PhoneHeaderSlotProvider></main>
      <div style={dock}>
        <PillNav current={current} onSelect={(key) => navigate(STUDENT_NAV_ROUTES[key])} />
      </div>
      {sosOpen && <EmergencyHelplinesDialog onClose={() => setSosOpen(false)} onSendSos={() => { setSosOpen(false); navigate('sos'); }} onFindCare={() => { setSosOpen(false); navigate('find-care'); }} />}
    </div>
  );
}

const frame: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  width: '100%',
  background: 'var(--sk-color-canvas)',
};

const top: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 20,
};

/** A block box, so the panel spans the frame instead of shrinking to its content. */
const menuWrap: React.CSSProperties = { display: 'block', width: '100%' };

const main: React.CSSProperties = {
  flex: '1 0 auto',
  minWidth: 0,
  padding: '0 var(--sk-space-gutter-phone) var(--sk-space-24)',
};

const bleedMain: React.CSSProperties = { ...main, padding: 0 };

/** The pill floats over the page (canvas page 9): the dock itself is see-through. */
const dock: React.CSSProperties = {
  position: 'sticky',
  bottom: 0,
  zIndex: 20,
  paddingBottom: 'env(safe-area-inset-bottom)',
  pointerEvents: 'none',
};
