import React from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../icons';
import type { SkIconName } from '../icons';
import { useReducedMotion } from '../motion';
import { color, focusRing, font, fontWeight, motion, radius, space, webOnly } from '../theme';
import { Gradient } from './Gradient';
import { useAmbientMotion, useLoop } from './m2Motion';
import { SERVICE_HUES, tileStops } from './servicePalette';
import type { ServiceHue } from './servicePalette';
import { webAttrs } from './M2Parts';
import type { PressState } from './M2Parts';

/**
 * The service tile rail at the top of Mobile 2.0 Home (For You · Medicines ·
 * Lab tests · Consults · Vaccines · Insurance · Campus): glossy gradient tiles
 * with a white glyph on the deep end, the name under each, a light sweep that
 * runs only while motion is allowed, and a lift on hover. The current one has
 * a ring in its hue and `aria-current`.
 */
export interface ServiceTile {
  key: string;
  label: string;
  icon: SkIconName;
  hue: ServiceHue;
  onPress: () => void;
}

const TILE = 60;
const SHINE_TRAVEL = TILE * 2.2;

function Shine({ index }: { index: number }) {
  const ambient = useAmbientMotion();
  const sweep = useLoop(ambient, motion.duration.ambient, index * motion.duration.fast);
  if (!ambient) return null;
  // The band crosses in the last part of each loop (canvas skShine: still for 60 %, then across).
  const translateX = sweep.interpolate({ inputRange: [0, 0.6, 1], outputRange: [-TILE, -TILE, SHINE_TRAVEL] });
  return <Animated.View pointerEvents="none" style={[styles.shine, { transform: [{ translateX }, { rotate: '18deg' }] }]} />;
}

export function ServiceRail({ label, tiles, current, testID = 'service-rail' }: { label: string; tiles: readonly ServiceTile[]; current: string | null; testID?: string }) {
  const reduced = useReducedMotion();
  return (
    <View role="navigation" accessibilityLabel={label} aria-label={label} testID={testID}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {tiles.map((tile, i) => {
          const isCurrent = tile.key === current;
          return (
            <Pressable
              key={tile.key}
              role="link"
              accessibilityRole="link"
              accessibilityLabel={tile.label}
              aria-label={tile.label}
              accessibilityState={{ selected: isCurrent }}
              {...webAttrs({ 'aria-current': isCurrent ? 'page' : undefined })}
              onPress={tile.onPress}
              testID={`${testID}-${tile.key}`}
              style={({ hovered, pressed, focused }: PressState) => [
                styles.cell,
                !reduced && (hovered || pressed) ? styles.lifted : null,
                focused ? focusRing : null,
              ]}
            >
              <View style={[styles.ring, isCurrent ? { borderColor: SERVICE_HUES[tile.hue].deep } : null]}>
                <Gradient colors={tileStops(tile.hue)} gloss style={styles.tile}>
                  <Icon name={tile.icon} size={26} color={color.onHero} />
                  <Shine index={i} />
                </Gradient>
              </View>
              <Text numberOfLines={1} style={[styles.label, isCurrent ? styles.labelCurrent : null]}>{tile.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { paddingHorizontal: space.gutterPhone, paddingVertical: space.s4, gap: space.s12 },
  cell: {
    width: TILE + space.s10, alignItems: 'center', gap: space.s6, borderRadius: radius.xl,
    ...webOnly({ transitionProperty: 'transform', transitionDuration: `${motion.duration.fast}ms`, transitionTimingFunction: motion.easing.standard }),
  },
  lifted: { transform: [{ translateY: -3 }, { scale: 1.04 }] },
  ring: { padding: space.s2, borderRadius: 24, borderWidth: 2, borderColor: 'transparent' },
  tile: { width: TILE, height: TILE, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  shine: { position: 'absolute', top: -TILE * 0.4, left: 0, width: TILE * 0.38, height: TILE * 1.8, backgroundColor: color.illustrationHighlight, opacity: 0.28 },
  label: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  labelCurrent: { fontWeight: fontWeight(font.weight.heavy), color: color.action },
});
