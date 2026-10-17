import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, focusRing, font, fontWeight, radius, size, space } from './theme';

export interface RadioOption<T extends string> {
  value: T;
  label: string;
}

export interface RadioGroupProps<T extends string> {
  /** Names the group for assistive tech, e.g. "What's happening?". */
  label: string;
  options: ReadonlyArray<RadioOption<T>>;
  value: T | null;
  onChange: (value: T) => void;
}

/** Radio (DESIGN.md §4: off, on, disabled, focus). Each option is a full-width 50 px row. */
export function RadioGroup<T extends string>({ label, options, value, onChange }: RadioGroupProps<T>) {
  return (
    <View role="radiogroup" accessibilityLabel={label} style={styles.group}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="radio"
            aria-checked={on}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: on }}
            onPress={() => onChange(option.value)}
            style={({ focused }: { pressed: boolean; focused?: boolean }) => [
              styles.option,
              on ? styles.optionOn : null,
              focused ? focusRing : null,
            ]}
          >
            <View style={[styles.dot, on ? styles.dotOn : null]} />
            <Text style={styles.label}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.s8 },
  option: {
    minHeight: size.control,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s10,
    paddingHorizontal: space.s14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.rule,
    backgroundColor: color.surface,
  },
  optionOn: { borderColor: color.action, backgroundColor: color.surface3 },
  dot: { width: 20, height: 20, borderRadius: radius.full, borderWidth: 2, borderColor: color.ruleStrong },
  dotOn: { borderWidth: 6, borderColor: color.action },
  label: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
});
