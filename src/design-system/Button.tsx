import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, focusRing, font, fontWeight, motion, radius, size, space, webOnly } from './theme';
import { useReducedMotion } from './motion';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** `cta` is the 54 px primary call to action; `default` is the 50 px control. */
  size?: 'default' | 'cta';
  disabled?: boolean;
  /** Work in progress. The button stops taking presses and says so to assistive tech. */
  busy?: boolean;
  /** Spoken instead of the label when the visible label alone is ambiguous. */
  accessibilityLabel?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  testID?: string;
}

const palette: Record<ButtonVariant, { bg: string; bgHover: string; fg: string; border: string }> = {
  primary: { bg: color.action, bgHover: color.actionHover, fg: color.onAction, border: color.action },
  secondary: { bg: color.surface, bgHover: color.surface2, fg: color.action, border: color.rule },
  ghost: { bg: 'transparent', bgHover: color.surface2, fg: color.action, border: 'transparent' },
  danger: { bg: color.danger, bgHover: color.danger, fg: color.onAction, border: color.danger },
};

/**
 * The design-system button (DESIGN.md §4): primary, secondary, ghost, danger ·
 * default, hover, focus, busy, disabled.
 *
 * Press drops it 1 px so a tap is acknowledged before a slow route change
 * lands; reduced motion removes that movement and keeps everything else.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size: sizeName = 'default',
  disabled = false,
  busy = false,
  accessibilityLabel,
  icon,
  fullWidth = false,
  testID,
}: ButtonProps) {
  const reduced = useReducedMotion();
  const inert = disabled || busy;
  const tone = palette[variant];
  const fg = disabled ? color.text2 : tone.fg;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inert}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inert, busy }}
      aria-busy={busy}
      style={({ pressed, hovered, focused }: { pressed: boolean; hovered?: boolean; focused?: boolean }) => [
        styles.base,
        {
          minHeight: sizeName === 'cta' ? size.controlLg : size.control,
          backgroundColor: disabled ? color.actionSoft : hovered && !inert ? tone.bgHover : tone.bg,
          borderColor: disabled ? color.actionSoft : tone.border,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          transform: [{ translateY: pressed && !reduced ? 1 : 0 }],
        },
        reduced ? null : transition,
        focused ? focusRing : null,
      ]}
    >
      <View style={styles.row}>
        {busy ? (
          <ActivityIndicator size="small" color={fg} accessibilityElementsHidden importantForAccessibility="no" />
        ) : icon ? (
          <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {icon}
          </View>
        ) : null}
        <Text style={[styles.label, { color: fg }]} numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const transition = webOnly({
  transitionProperty: 'background-color, transform',
  transitionDuration: `${motion.duration.fast}ms`,
  transitionTimingFunction: motion.easing.standard,
});

const styles = StyleSheet.create({
  base: {
    minWidth: size.touchTarget,
    paddingHorizontal: space.s20,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s8,
  },
  label: {
    fontFamily: font.family.sans,
    fontSize: font.size.body,
    fontWeight: fontWeight(font.weight.strong),
    textAlign: 'center',
  },
});
