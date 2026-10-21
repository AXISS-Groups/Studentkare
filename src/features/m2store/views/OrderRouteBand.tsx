import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { Gradient, floatTransform, useAmbientMotion, useLoop } from '@/design-system/m2';
import { color, motion, radius, shadow, shadowStyle, space } from '@/design-system/theme';
import type { RouteProgress } from '../data/orderProgress';

/**
 * The order's route band on M2Orders (canvas `chart-order-route`): the
 * partner pharmacy on the left, the student's place on the right, and between
 * them one dot per step of the order. The marker sits on the step the order
 * is at — it is a progress chart, not a map: there is no rider or location
 * data, so nothing moves along the line. The scooter is drawn only once the
 * order is on its way to a delivery address; before that the marker is the
 * parcel. Motion: the current dot pulses and the marker floats in place, only
 * while ambient motion is allowed (reduced motion, screen behind, unmounted:
 * still).
 */
export function OrderRouteBand({ progress, delivery, label, testID = 'm2-ord-route' }: {
  progress: RouteProgress; delivery: boolean; label: string; testID?: string;
}): React.ReactElement {
  const ambient = useAmbientMotion();
  const float = useLoop(ambient, motion.duration.ambient);
  const pulse = useLoop(ambient, motion.duration.ambient / 2);
  const last = progress.steps.length - 1;
  const percent = `${Math.round(progress.fraction * 100)}%` as const;
  return (
    <Gradient colors={[color.surface3, color.actionSoft]} angle={160} style={styles.band} testID={testID}>
      <View role="img" accessibilityLabel={label} aria-label={label} style={styles.fill}>
        <View style={styles.start} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Icon name="first-aid-kit" size={16} color={color.onHero} strokeWidth={2.2} />
        </View>
        <View style={styles.track} pointerEvents="none">
          <View style={styles.dashed} />
          <View style={[styles.solid, { width: percent }]} />
          {progress.steps.map((s, i) => {
            const show = progress.show[i] ?? 'todo';
            const current = show === 'now';
            return (
              <View key={s.key} style={[styles.dotAt, { left: `${last > 0 ? (i / last) * 100 : 100}%` }]}>
                {current && ambient ? (
                  <Animated.View testID={`${testID}-pulse`} style={[styles.pulse, {
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
                    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
                  }]} />
                ) : null}
                <View style={[styles.dot, show === 'done' ? styles.dotDone : current ? styles.dotNow : styles.dotTodo]} />
              </View>
            );
          })}
          <Animated.View testID={`${testID}-marker`} style={[styles.marker, { left: percent, transform: floatTransform(float, space.s4) }]}>
            <Icon name={progress.moving ? 'scooter' : 'box'} size={22} color={color.action} strokeWidth={2} />
          </Animated.View>
        </View>
        <View style={styles.end} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Icon name={delivery ? 'home-2' : 'first-aid-kit'} size={17} color={color.onHero} strokeWidth={2.3} />
        </View>
      </View>
    </Gradient>
  );
}

const MARKER = 40;
const DOT = 10;

const styles = StyleSheet.create({
  band: { height: 120, overflow: 'hidden' },
  fill: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.s16, gap: space.s14 },
  start: { width: 30, height: 30, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandNavy },
  end: { width: 34, height: 34, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.serviceGreenDeep },
  track: { flex: 1, height: MARKER + space.s24, justifyContent: 'center' },
  dashed: { position: 'absolute', left: 0, right: 0, borderTopWidth: 3, borderStyle: 'dashed', borderColor: color.action, opacity: 0.45 },
  solid: { position: 'absolute', left: 0, height: 3, borderRadius: radius.full, backgroundColor: color.action },
  dotAt: { position: 'absolute', width: DOT, height: DOT, marginLeft: -DOT / 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: radius.full, borderWidth: 2 },
  dotDone: { backgroundColor: color.action, borderColor: color.action },
  dotNow: { backgroundColor: color.positiveFill, borderColor: color.surface },
  dotTodo: { backgroundColor: color.surface, borderColor: color.ruleStrong },
  pulse: { position: 'absolute', width: DOT, height: DOT, borderRadius: radius.full, backgroundColor: color.positiveFill },
  marker: {
    position: 'absolute', top: 0, width: MARKER, height: MARKER, marginLeft: -MARKER / 2, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface, ...shadowStyle(shadow.float),
  },
});
