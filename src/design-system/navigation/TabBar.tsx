import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../icons';
import type { SkIconName } from '../icons';
import { useReducedMotion } from '../motion';
import { color, font, fontWeight, focusRing, motion, radius, shadowStyle, shadow, size, space } from '../theme';

export interface TabBarItem<K extends string> {
  key: K;
  /** Already translated: shown on the selected tab, and the accessible name of every tab. */
  label: string;
  /** A name from design/icons/icon-manifest.json. */
  icon: SkIconName;
}

export interface TabBarProps<K extends string> {
  /** Accessible name of the tab list, already translated. */
  label: string;
  items: readonly TabBarItem<K>[];
  /** The current destination, or null when the screen on top is not one of the tabs. */
  selected: K | null;
  onSelect: (key: K) => void;
  /** Bottom safe-area inset (home indicator / gesture bar), from the shell. */
  bottomInset?: number;
}

/** iOS reports the keyboard before it moves; Android only once it has. */
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

/**
 * The phone app's floating tab bar (canvas: the HomeDiscover bottom bar, in
 * the founder's navy). A navy pill inset from the screen edges; the current
 * tab is the white pill (`nav-current`) with its icon and label in navy
 * (`on-nav-current`); the others are icon-only in `nav-text`, each still
 * named for screen readers. Navy in both schemes (DESIGN.md §3).
 *
 * It steps aside while the keyboard is up so it never covers a field, and
 * comes back with a short fade that is skipped under reduced motion.
 */
export function TabBar<K extends string>({ label, items, selected, onSelect, bottomInset = 0 }: TabBarProps<K>): React.ReactElement | null {
  const keyboardShown = useKeyboardShown();
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const wasHidden = useRef(false);

  useEffect(() => {
    if (keyboardShown) {
      wasHidden.current = true;
      return;
    }
    const comingBack = wasHidden.current;
    wasHidden.current = false;
    if (!comingBack || reduced) {
      opacity.setValue(1);
      return;
    }
    opacity.setValue(0);
    const fade = Animated.timing(opacity, { toValue: 1, duration: motion.duration.fast, useNativeDriver: Platform.OS !== 'web' });
    fade.start();
    return () => fade.stop();
  }, [keyboardShown, reduced, opacity]);

  if (keyboardShown) return null;

  return (
    <Animated.View style={[styles.dock, { paddingBottom: Math.max(bottomInset, space.s12), opacity }]}>
      <View role="tablist" accessibilityRole="tablist" accessibilityLabel={label} aria-label={label} style={styles.bar}>
        {items.map((item) => {
          const isSelected = item.key === selected;
          return (
            <Pressable
              key={item.key}
              testID={`tab-${item.key}`}
              role="tab"
              aria-selected={isSelected}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isSelected }}
              onPress={() => {
                if (!isSelected) onSelect(item.key);
              }}
              style={({ focused }: { pressed: boolean; focused?: boolean }) => [
                styles.tab,
                isSelected ? styles.current : null,
                focused ? focusRing : null,
              ]}
            >
              <Icon name={item.icon} size={size.navIcon} color={isSelected ? color.onNavCurrent : color.navText} />
              {isSelected ? (
                <Text numberOfLines={1} style={styles.currentLabel}>
                  {item.label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dock: {
    paddingHorizontal: space.gutterPhone,
    paddingTop: space.s8,
    backgroundColor: color.canvas,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s4,
    padding: space.s6,
    borderRadius: radius.full,
    backgroundColor: color.navBg,
    ...shadowStyle(shadow.float),
  },
  tab: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: size.touchTarget,
    minHeight: size.touchTarget,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s6,
  },
  current: {
    flexGrow: 2,
    paddingHorizontal: space.s14,
    backgroundColor: color.navCurrent,
  },
  currentLabel: {
    flexShrink: 1,
    fontFamily: font.family.sans,
    fontSize: font.size.caption,
    fontWeight: fontWeight(font.weight.heavy),
    color: color.onNavCurrent,
  },
});
