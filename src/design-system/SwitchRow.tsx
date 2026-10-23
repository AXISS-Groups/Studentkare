import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, focusRing, font, fontWeight, motion, radius, size, space, webOnly } from './theme';
import { useReducedMotion } from './motion';

export interface SwitchRowProps {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * Switch (DESIGN.md §4: off, on, disabled, focus). The whole row is the
 * control, so the hit area is the row, never just the 50 × 30 track.
 */
export function SwitchRow({ label, detail, value, onChange, disabled = false, testID }: SwitchRowProps) {
  const reduced = useReducedMotion();
  return (
    <Pressable
      testID={testID}
      role="switch"
      aria-checked={value}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.row, focused ? focusRing : null, disabled ? styles.disabled : null]}
    >
      <View style={styles.words}>
        <Text style={styles.label}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[styles.track, { backgroundColor: value ? color.action : color.ruleStrong }]}
      >
        <View style={[styles.thumb, { transform: [{ translateX: value ? 20 : 0 }] }, reduced ? null : thumbMotion]} />
      </View>
    </Pressable>
  );
}

const thumbMotion = webOnly({
  transitionProperty: 'transform',
  transitionDuration: `${motion.duration.fast}ms`,
  transitionTimingFunction: motion.easing.standard,
});

const styles = StyleSheet.create({
  row: {
    minHeight: size.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s16,
    paddingVertical: space.s10,
    borderRadius: radius.md,
  },
  disabled: { opacity: 0.6 },
  words: { flex: 1, gap: space.s2 },
  label: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
  detail: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, lineHeight: font.size.bodySm * font.lineHeight.body },
  track: { width: 50, height: 30, borderRadius: radius.full, padding: 3 },
  thumb: { width: 24, height: 24, borderRadius: radius.full, backgroundColor: color.surface },
});
