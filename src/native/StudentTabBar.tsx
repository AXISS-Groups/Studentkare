import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar } from '@/design-system';
import type { SkIconName } from '@/design-system/icons';
import { color } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { DestinationRoute } from './homeDestinations';

/** A tab opens the native screen registered under this route. */
export type StudentTabRoute = 'Home' | Extract<DestinationRoute, 'Marketplace' | 'AiChat' | 'Vault' | 'YourCare'>;

export interface StudentTab {
  route: StudentTabRoute;
  label: `tabbar.${string}` & MessageKey;
  icon: SkIconName;
}

/**
 * The student tab bar, in the canvas's HomeDiscover bottom-bar order and
 * icons: Discover (compass), Wellness (map-pin, opening ShopHome), Ayush AI
 * (sparkle, opening AyushChat) and Your Care (YourCare), under the same
 * `stethoscope` as the web phone frame. Lab Tests (LabPackages) has no native
 * screen, so its slot holds the vault, under the canvas's own "Records" tab
 * (lock-5, the YourCare bar). (The consult rows' doctor-2 was tried for Your
 * Care, but its SVG only draws a stethoscope's U-shaped tube, which reads as a
 * letter at tab-bar size.)
 */
export const STUDENT_TABS: readonly StudentTab[] = [
  { route: 'Home', label: 'tabbar.discover', icon: 'compass' },
  { route: 'Marketplace', label: 'tabbar.wellness', icon: 'map-pin' },
  { route: 'AiChat', label: 'tabbar.ayush', icon: 'sparkle' },
  { route: 'Vault', label: 'tabbar.records', icon: 'lock-5' },
  { route: 'YourCare', label: 'tabbar.yourCare', icon: 'stethoscope' },
];

export function isStudentTabRoute(route: string): route is StudentTabRoute {
  return STUDENT_TABS.some((tab) => tab.route === route);
}

export interface StudentTabBarProps {
  /** Name of the route on top of the stack. */
  currentRoute: string;
  navigate: (route: StudentTabRoute) => void;
  bottomInset?: number;
}

/** Shown on the tab roots only; screens opened from them keep the full height. */
export function StudentTabBar({ currentRoute, navigate, bottomInset }: StudentTabBarProps): React.ReactElement | null {
  const t = useT();
  if (!isStudentTabRoute(currentRoute)) return null;
  return (
    <TabBar
      label={t('tabbar.label')}
      items={STUDENT_TABS.map((tab) => ({ key: tab.route, label: t(tab.label), icon: tab.icon }))}
      selected={currentRoute}
      onSelect={navigate}
      bottomInset={bottomInset}
    />
  );
}

/** The signed-in student's stack with the tab bar under it (navigator `layout`). */
export function StudentShell({ currentRoute, navigate, children }: Omit<StudentTabBarProps, 'bottomInset'> & { children: React.ReactNode }): React.ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.shell}>
      <View style={styles.screens}>{children}</View>
      <StudentTabBar currentRoute={currentRoute} navigate={navigate} bottomInset={insets.bottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: color.canvas },
  screens: { flex: 1 },
});
