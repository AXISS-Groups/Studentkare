import React, { useMemo, useRef, useState } from 'react';
import { PhoneHeader } from '@/design-system/navigation/PhoneHeader';
import { BoardToolbar, PhoneHeaderSlotProvider } from '@/design-system/navigation/BoardHeader';
import type { BoardHeaderConfig, PhoneHeaderSlot } from '@/design-system/navigation/BoardHeader';
import type { PhoneHeaderAction } from '@/design-system/navigation/PhoneHeader';
import { TabBar } from '@/design-system/navigation/TabBar';
import type { SkIconName } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { EmergencyHelplinesDialog } from '@/components/interface/InterfaceBar';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';

export type StudentTabKey = 'discover' | 'wellness' | 'ayush' | 'labTests' | 'yourCare';

export interface StudentWebTab {
  key: StudentTabKey;
  label: `tabbar.${string}` & MessageKey;
  /** The exact icon name from the HomeDiscover brief. */
  icon: SkIconName;
  /** Where the tab opens on the web today. */
  path: RoutePath;
}

/**
 * The student tab bar on the web, in the canvas HomeDiscover order and icons.
 * Canvas target, then the web route it opens:
 * - Discover (HomeDiscover) opens /health, the student home.
 * - Wellness (ShopHome) opens /shop.
 * - Ayush AI (AyushChat) opens /ayush.
 * - Lab Tests (LabPackages) opens /lab-tests: LabPackages has no route of its own
 *   (it is a shelf inside /shop), so the tab opens the lab-test catalogue.
 * - Your Care (YourCare) opens /your-care, the Your Care overview; the
 *   Appointments board's back button returns to it.
 */
export const STUDENT_WEB_TABS: readonly StudentWebTab[] = [
  { key: 'discover', label: 'tabbar.discover', icon: 'compass', path: 'health' },
  { key: 'wellness', label: 'tabbar.wellness', icon: 'map-pin', path: 'shop' },
  { key: 'ayush', label: 'tabbar.ayush', icon: 'sparkle', path: 'ayush' },
  { key: 'labTests', label: 'tabbar.labTests', icon: 'flask-2', path: 'lab-tests' },
  { key: 'yourCare', label: 'tabbar.yourCare', icon: 'stethoscope', path: 'your-care' },
];

/** The tab a route belongs to; null for a screen opened from a tab (it gets a back button). */
export function studentTabFor(route: RoutePath): StudentTabKey | null {
  return STUDENT_WEB_TABS.find((tab) => tab.path === route)?.key ?? null;
}

export interface StudentPhoneFrameProps {
  route: RoutePath;
  /** Already translated page title (ignored on Discover, which shows the brand). */
  title: string;
  /** The More panel (the student menu): open state, toggle, and the panel's id. */
  menu: { open: boolean; onToggle: () => void; controls: string };
  /** Drawn under the header while the menu is open. */
  menuPanel?: React.ReactNode;
  children: React.ReactNode;
}

function goBack(): void {
  if (typeof window !== 'undefined' && window.history.length > 1) window.history.back();
  else navigate('health');
}

/**
 * The phone boards' frame for a signed-in student on the web at phone width
 * (`size.phoneFrameMax`): the phone header on top, the page, and the student
 * tab bar docked at the bottom. Replaces the desktop web shell (sidebar, app
 * bar and its quick links) there. SOS stays one tap away in the header on
 * every page, as it was in the app bar it replaces.
 */
export function StudentPhoneFrame({ route, title, menu, menuPanel, children }: StudentPhoneFrameProps): React.ReactElement {
  const t = useT();
  const [sosOpen, setSosOpen] = useState(false);
  // A phone board's own header (BoardHeader), when the page draws one.
  const [board, setBoard] = useState<BoardHeaderConfig | null>(null);
  const menuNow = useRef(menu);
  menuNow.current = menu;
  // Stable for the frame's life, so a re-render of the page never re-sends its header.
  const slot = useMemo<PhoneHeaderSlot>(() => ({
    set: setBoard,
    openMore: () => { if (!menuNow.current.open) menuNow.current.onToggle(); },
  }), []);
  const tab = studentTabFor(route);
  const discover = tab === 'discover';
  const actions: PhoneHeaderAction[] = [
    ...(discover ? [{ key: 'notifications', icon: 'bell-dome' as const, label: t('bar.notifications'), onPress: () => navigate('notifications') }] : []),
    { key: 'menu', icon: 'menu', label: menu.open ? t('ws.closeNav') : t('ws.openNav'), onPress: menu.onToggle, expanded: menu.open, controls: menu.controls },
    { key: 'sos', icon: 'shield-2', label: t('bar.sos'), onPress: () => setSosOpen(true), tone: 'sos', showLabel: true },
  ];
  return (
    <div className="sk-phone-frame" style={frame}>
      <div style={top}>
        <PhoneHeader
          title={discover ? t('phone.brand') : board?.title ?? title}
          subtitle={board?.subtitle}
          brand={discover}
          back={tab ? undefined : { label: board?.backLabel ?? t('common.back'), onPress: goBack, icon: board?.backIcon }}
          actions={actions}
        />
        <BoardToolbar actions={board?.actions} trailing={board?.trailing} />
      </div>
      {menu.open ? <div style={menuWrap}>{menuPanel}</div> : null}
      <main className="sk-phone-frame__main" style={main}><PhoneHeaderSlotProvider value={slot}>{children}</PhoneHeaderSlotProvider></main>
      <div style={dock}>
        <TabBar
          label={t('tabbar.label')}
          items={STUDENT_WEB_TABS.map((item) => ({ key: item.key, label: t(item.label), icon: item.icon }))}
          selected={tab}
          onSelect={(key) => {
            const target = STUDENT_WEB_TABS.find((item) => item.key === key);
            if (target) navigate(target.path);
          }}
        />
      </div>
      {sosOpen && <EmergencyHelplinesDialog onClose={() => setSosOpen(false)} onSendSos={() => { setSosOpen(false); navigate('sos'); }} />}
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

const dock: React.CSSProperties = {
  position: 'sticky',
  bottom: 0,
  zIndex: 20,
  paddingBottom: 'env(safe-area-inset-bottom)',
  background: 'var(--sk-color-canvas)',
};
