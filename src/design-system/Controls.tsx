import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, focusRing, font, fontWeight, radius, size, space } from './theme';

export interface CheckboxProps {
  label: string;
  /** Shown under the label, e.g. what ticking this commits you to. */
  detail?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * Checkbox (DESIGN.md §4: off, on, disabled, focus). The whole row is the
 * hit area (≥ 44 px), and the label is part of the control's name.
 */
export function Checkbox({ label, detail, checked, onChange, disabled = false, testID }: CheckboxProps) {
  return (
    <Pressable
      testID={testID}
      role="checkbox"
      aria-checked={checked}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.row, focused ? focusRing : null, disabled ? styles.disabled : null]}
    >
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[styles.box, checked ? { backgroundColor: color.action, borderColor: color.action } : null]}
      >
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      <View style={styles.words}>
        <Text style={styles.label}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  /** What a screen reader says when the short label needs context ("App for Orders"). Defaults to the label. */
  spokenLabel?: string;
}

/** Chip (DESIGN.md §4: off, on, disabled, focus): a filter or choice token, 44 px tall. */
export function Chip({ label, selected, onPress, disabled = false, testID, spokenLabel }: ChipProps) {
  return (
    <Pressable
      testID={testID}
      role="button"
      aria-pressed={selected}
      accessibilityRole="button"
      accessibilityLabel={spokenLabel ?? label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ focused }: { pressed: boolean; focused?: boolean }) => [
        styles.chip,
        selected ? { backgroundColor: color.actionSoft, borderColor: color.action } : null,
        focused ? focusRing : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Text style={[styles.chipText, selected ? { color: color.action } : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s8 },
  box: {
    width: 22, height: 22, borderRadius: radius.sm, borderWidth: 2, borderColor: color.ruleStrong,
    backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center',
  },
  tick: { color: color.onAction, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy) },
  words: { flex: 1, gap: space.s2 },
  label: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text },
  detail: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
  chip: {
    minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, borderWidth: 1,
    borderColor: color.rule, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center',
  },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  disabled: { opacity: 0.5 },
});
