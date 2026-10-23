import React, { useEffect, useState } from 'react';
import { Animated, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AnimatedIcon, Icon } from '../icons';
import type { SkAnimatedName, SkIconName } from '../icons';
import { color, focusRing, font, fontWeight, motion, radius, shadow, shadowStyle, size, space } from '../theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Gradient } from './Gradient';
import { useAmbientMotion, useLoop } from './m2Motion';
import { NAVY_STOPS, ORB_STOPS } from './servicePalette';
import { webAttrs } from './M2Parts';
import type { PressState } from './M2Parts';

/**
 * The Mobile 2.0 floating pill nav (canvas page 9, every board): Home ·
 * Orders · Ask Ayush (the centre orb) · My health · Profile, on the navy
 * gradient. The current destination is the white pill with its icon and name
 * (`hero-current` / `on-hero-current`); the others are icons in `nav-text`,
 * each named for screen readers. The orb's spark turns slowly, only while
 * motion is allowed and the screen is in front.
 *
 * It replaces the five-tab bar (TabBar) for the student on the web phone frame
 * and in the Expo app; it steps aside while the keyboard is up.
 */
export type PillNavKey = 'home' | 'orders' | 'ayush' | 'health' | 'profile';

export interface PillNavDestination {
  key: PillNavKey;
  label: MessageKey;
  icon: SkIconName;
  /** The drawing in the white pill when this is the current destination, where the boards draw another (My health: plain heart). */
  currentIcon?: SkIconName;
  /** The same drawing, animated: it draws itself once when this destination becomes current (still under reduced motion). */
  currentAnim?: SkAnimatedName;
}

/** In the boards' order, with the icons from their briefs (`ayush-spark` in the orb). */
export const PILL_NAV: readonly PillNavDestination[] = [
  { key: 'home', label: 'm2.nav.home', icon: 'home', currentAnim: 'anim-home' },
  { key: 'orders', label: 'm2.nav.orders', icon: 'box', currentAnim: 'anim-package' },
  { key: 'ayush', label: 'm2.nav.ayush', icon: 'ayush-spark' },
  { key: 'health', label: 'm2.nav.health', icon: 'heart-3', currentAnim: 'anim-heart' },
  { key: 'profile', label: 'm2.nav.profile', icon: 'user-5', currentAnim: 'anim-user' },
];

export interface PillNavProps {
  /** The destination being shown, or null on a screen that is none of them. */
  current: PillNavKey | null;
  onSelect: (key: PillNavKey) => void;
  /** Bottom safe-area inset (native). */
  bottomInset?: number;
  testID?: string;
}

const KEYBOARD_SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const KEYBOARD_HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(KEYBOARD_SHOW, () => setShown(true));
    const hide = Keyboard.addListener(KEYBOARD_HIDE, () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}

const ORB = 52;
const BAR_HEIGHT = 70;

function Orb({ current, label, onPress }: { current: boolean; label: string; onPress: () => void }) {
  const ambient = useAmbientMotion();
  const turn = useLoop(ambient, motion.duration.orbit);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Pressable role="link" accessibilityRole="link" accessibilityLabel={label} aria-label={label} accessibilityState={{ selected: current }}
      {...webAttrs({ 'aria-current': current ? 'page' : undefined })}
      onPress={onPress} testID="pill-nav-ayush"
      style={({ focused }: PressState) => [styles.orbRing, current ? styles.orbRingCurrent : null, focused ? focusRing : null]}>
      <Gradient colors={ORB_STOPS} radial={{ x: 0.35, y: 0.3 }} style={styles.orb}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Icon name="ayush-spark" size={24} color={color.onHero} />
        </Animated.View>
      </Gradient>
    </Pressable>
  );
}

export function PillNav({ current, onSelect, bottomInset = 0, testID = 'pill-nav' }: PillNavProps): React.ReactElement | null {
  const t = useT();
  const keyboardShown = useKeyboardShown();
  if (keyboardShown) return null;
  return (
    <View style={[styles.dock, { paddingBottom: Math.max(bottomInset, space.s16) }]} pointerEvents="box-none">
      <Gradient colors={NAVY_STOPS} angle={160} style={styles.bar} testID={testID}>
        <View role="navigation" accessibilityLabel={t('m2.nav.label')} aria-label={t('m2.nav.label')} style={styles.row}>
          {PILL_NAV.map((item) => {
            const isCurrent = item.key === current;
            const label = t(item.label);
            if (item.key === 'ayush') return <Orb key={item.key} current={isCurrent} label={label} onPress={() => onSelect(item.key)} />;
            return (
              <Pressable
                key={item.key}
                testID={`pill-nav-${item.key}`}
                role="link"
                accessibilityRole="link"
                accessibilityLabel={label}
                aria-label={label}
                accessibilityState={{ selected: isCurrent }}
                {...webAttrs({ 'aria-current': isCurrent ? 'page' : undefined })}
                onPress={() => onSelect(item.key)}
                style={({ focused }: PressState) => [styles.item, isCurrent ? styles.current : null, focused ? focusRing : null]}
              >
                {isCurrent && item.currentAnim ? (
                  <AnimatedIcon key={item.key} name={item.currentAnim} size="icon" color={color.onHeroCurrent} background={color.heroCurrent}
                    poster={<Icon name={item.currentIcon ?? item.icon} size={19} strokeWidth={2.3} color={color.onHeroCurrent} />} />
                ) : (
                  <Icon name={isCurrent ? item.currentIcon ?? item.icon : item.icon} size={isCurrent ? 19 : 22} strokeWidth={isCurrent ? 2.3 : 2} color={isCurrent ? color.onHeroCurrent : color.navText} />
                )}
                {isCurrent ? <Text numberOfLines={1} style={styles.currentLabel}>{label}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </Gradient>
    </View>
  );
}

/** Height the nav takes at the bottom of a screen (bar + its bottom margin), for layouts that must clear it. */
export const PILL_NAV_HEIGHT = BAR_HEIGHT + space.s16 + space.s8;

/**
 * Bottom padding for a board's scroll content so its last field and button
 * scroll fully clear of the floating pill nav: the nav's height and offset plus
 * breathing room. The bottom safe area is added by the dock (web:
 * env(safe-area-inset-bottom)) and by the native shell, which lays the nav out
 * under the screens with the inset.
 */
export const M2_NAV_CLEARANCE = PILL_NAV_HEIGHT + space.s24;

const styles = StyleSheet.create({
  dock: { paddingHorizontal: space.s16, paddingTop: space.s8 },
  bar: { height: BAR_HEIGHT, borderRadius: radius.full, ...shadowStyle(shadow.float) },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.s10 },
  item: {
    minWidth: size.touchTarget + space.s4, height: size.touchTarget + space.s4, borderRadius: radius.full,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s6,
  },
  current: { height: 52, paddingHorizontal: space.s16, backgroundColor: color.heroCurrent, flexShrink: 1 },
  currentLabel: { flexShrink: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHeroCurrent },
  orbRing: { width: ORB + space.s8, height: ORB + space.s8, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil },
  orbRingCurrent: { backgroundColor: color.heroCurrent },
  orb: { width: ORB, height: ORB, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
});
