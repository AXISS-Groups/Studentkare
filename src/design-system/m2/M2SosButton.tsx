import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../icons';
import { color, focusRing, font, fontWeight, motion, radius, size, space } from '../theme';
import { useAmbientMotion, useLoop } from './m2Motion';
import type { PressState } from './M2Parts';

/**
 * The SOS pill (canvas page 9), on its own file: M2Parts.tsx (the round
 * header buttons, search field, cards, …) and m2Sos.tsx (the shell's default
 * SOS handler, M2HeaderSos) both need it, and each used to import the other,
 * an import cycle the architecture guardrail disallows. Moved out
 * (architecture guardrail, phase 3) so both can import this instead of each
 * other.
 */
export function SosButton({ label, spoken, onPress, testID = 'm2-sos' }: { label: string; spoken: string; onPress: () => void; testID?: string }) {
  const ambient = useAmbientMotion();
  const pulse = useLoop(ambient, motion.duration.ambient / 2);
  const ring = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
  };
  return (
    <View style={styles.sosWrap}>
      {ambient ? <Animated.View style={[styles.sosRing, ring, { pointerEvents: 'none' }]} /> : null}
      <Pressable role="button" accessibilityRole="button" accessibilityLabel={spoken} aria-label={spoken} onPress={onPress} testID={testID}
        style={({ focused }: PressState) => [styles.sos, focused ? focusRing : null]}>
        <Icon name="shield-alert" size={16} color={color.onDangerFill} strokeWidth={2.4} />
        <Text style={styles.sosText}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sosWrap: { position: 'relative' },
  sosRing: { ...StyleSheet.absoluteFillObject, borderRadius: radius.full, backgroundColor: color.dangerFill },
  sos: {
    minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: space.s6,
    backgroundColor: color.dangerFill,
  },
  sosText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onDangerFill },
});
