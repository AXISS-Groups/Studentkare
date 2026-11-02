import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { M2SosProvider, PillNav } from '@/design-system/m2';
import type { PillNavKey } from '@/design-system/m2';
import { color } from '@/design-system/theme';

/** A pill-nav destination opens the native screen registered under this route. */
export type StudentTabRoute = 'Home' | 'Orders' | 'AiChat' | 'Insights' | 'Profile';

/**
 * The student's Mobile 2.0 pill nav (canvas page 9, approved 2026-10-21):
 * Home · Orders · Ask Ayush (the orb) · My health · Profile, replacing the
 * five-tab bar (Discover · Wellness · Ayush AI · Records · Your Care). My
 * health opens M2Insights and Profile M2Profile (whose Settings opens the More
 * hub). The vault and the wellness shop are reached from Home (service rail,
 * "Upload a lab report"), My health and More.
 */
export const STUDENT_NAV: Readonly<Record<PillNavKey, StudentTabRoute>> = {
  home: 'Home',
  orders: 'Orders',
  ayush: 'AiChat',
  health: 'Insights',
  profile: 'Profile',
};

/** Store boards opened from Home: the nav shows there with Home current (as on the boards). */
const HOME_STORE_ROUTES: ReadonlySet<string> = new Set([
  // keep-sorted start
  'Consults',
  'Insurance',
  'Labs',
  'Medicines',
  'Vaccines',
  // keep-sorted end
]);

/** My health's own screens (M2Trends, M2ReportUpload, M2Reminders, M2Water, M2Steps): the nav shows My health there. */
const HEALTH_ROUTES: ReadonlySet<string> = new Set([
  // keep-sorted start
  'MedicineReminders',
  'Refills',
  'ReportUpload',
  'Steps',
  'Trends',
  'Water',
  // keep-sorted end
]);

export function isStudentTabRoute(route: string): route is StudentTabRoute {
  return (Object.values(STUDENT_NAV) as string[]).includes(route);
}

/** The destination a route shows as current, or null where the nav is not drawn. */
export function studentNavKeyFor(route: string): PillNavKey | null {
  const key = (Object.keys(STUDENT_NAV) as PillNavKey[]).find((k) => STUDENT_NAV[k] === route);
  if (key) return key;
  if (HEALTH_ROUTES.has(route)) return 'health';
  return HOME_STORE_ROUTES.has(route) ? 'home' : null;
}

export interface StudentTabBarProps {
  /** Name of the route on top of the stack. */
  currentRoute: string;
  navigate: (route: StudentTabRoute) => void;
  bottomInset?: number;
}

/** Shown on the nav roots and the store boards; other screens keep the full height. */
export function StudentTabBar({ currentRoute, navigate, bottomInset }: StudentTabBarProps): React.ReactElement | null {
  const current = studentNavKeyFor(currentRoute);
  if (!current) return null;
  return <PillNav current={current} onSelect={(key) => { if (currentRoute !== STUDENT_NAV[key]) navigate(STUDENT_NAV[key]); }} bottomInset={bottomInset} />;
}

/** The signed-in student's stack with the pill nav under it (navigator `layout`). */
export function StudentShell({ currentRoute, navigate, onSos, children }: Omit<StudentTabBarProps, 'bottomInset'> & {
  /** What SOS in a board's header opens (the Emergency screen): every Mobile 2.0 header carries it (founder decision, 23 Oct 2026). */
  onSos: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.shell}>
      <View style={styles.screens}><M2SosProvider value={onSos}>{children}</M2SosProvider></View>
      <StudentTabBar currentRoute={currentRoute} navigate={navigate} bottomInset={insets.bottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: color.canvas },
  screens: { flex: 1 },
});
