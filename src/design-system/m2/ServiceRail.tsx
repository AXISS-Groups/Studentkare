import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedIcon, Icon } from '../icons';
import type { SkAnimatedName, SkIconName } from '../icons';
import { useReducedMotion } from '../motion';
import { color, focusRing, font, fontWeight, motion, radius, space, webOnly } from '../theme';
import { SERVICE_HUES } from './servicePalette';
import type { ServiceHue } from './servicePalette';
import { webAttrs } from './M2Parts';
import type { PressState } from './M2Parts';
import { isWide, useM2Layout } from './m2Layout';

/**
 * The service tile rail at the top of Mobile 2.0 Home (For You · Medicines ·
 * Lab tests · Consults · Vaccines · Insurance · Campus): flat tiles (no
 * gradient or gloss — Krishna, 2026-11-01) in the tile's `deep` hue, a white
 * glyph, the name under each, a lift on hover and a distinct press-down scale
 * for tap feedback. The current one has a ring in its hue and `aria-current`.
 *
 * A phone scrolls the rail sideways, as on the board. Wider (inside
 * `<M2Responsive>`) every tile shows at once in a wrapping row of larger
 * tiles, with no scroll. A tile whose glyph has a drawing in the animated set
 * (`anim`, design/icons/animated) plays it once as it comes into view, white
 * on the tile; the still glyph is the poster and the reduced-motion frame.
 */
export interface ServiceTile {
  key: string;
  label: string;
  icon: SkIconName;
  hue: ServiceHue;
  onPress: () => void;
  /** The same drawing from the animated set (`anim-home` for `home-2`), when there is one. Never a look-alike. */
  anim?: SkAnimatedName;
}

const TILE = 60;
/** The tile wider than a phone. */
const TILE_WIDE = 72;

export function ServiceRail({ label, tiles, current, testID = 'service-rail' }: { label: string; tiles: readonly ServiceTile[]; current: string | null; testID?: string }) {
  const reduced = useReducedMotion();
  const wide = isWide(useM2Layout());
  const side = wide ? TILE_WIDE : TILE;
  const cells = tiles.map((tile) => {
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
          wide ? styles.cellWide : null,
          !reduced && hovered && !pressed ? styles.lifted : null,
          !reduced && pressed ? styles.pressed : null,
          focused ? focusRing : null,
        ]}
      >
        <View style={[styles.ring, isCurrent ? { borderColor: SERVICE_HUES[tile.hue].deep } : null]}>
          <View style={[styles.tile, { width: side, height: side, backgroundColor: SERVICE_HUES[tile.hue].deep }]}>
            {tile.anim ? (
              <AnimatedIcon name={tile.anim} size="icon" color={color.onHero} background={SERVICE_HUES[tile.hue].deep}
                poster={<Icon name={tile.icon} size={26} color={color.onHero} />} testID={`${testID}-${tile.key}-anim`} />
            ) : <Icon name={tile.icon} size={wide ? 30 : 26} color={color.onHero} />}
          </View>
        </View>
        <Text numberOfLines={1} style={[styles.label, isCurrent ? styles.labelCurrent : null]}>{tile.label}</Text>
      </Pressable>
    );
  });
  return (
    <View role="navigation" accessibilityLabel={label} aria-label={label} testID={testID}>
      {wide ? (
        <View style={[styles.rail, styles.railWide]} testID={`${testID}-wrap`}>{cells}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>{cells}</ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { paddingHorizontal: space.gutterPhone, paddingVertical: space.s4, gap: space.s12 },
  /** Wider, the rail is one more section of the page: the page's gutter, not its own. */
  railWide: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 0, rowGap: space.s16, gap: space.s20 },
  cellWide: { width: TILE_WIDE + space.s24 },
  cell: {
    width: TILE + space.s10, alignItems: 'center', gap: space.s6, borderRadius: radius.xl,
    ...webOnly({
      transitionProperty: 'transform', transitionDuration: `${motion.duration.fast}ms`, transitionTimingFunction: motion.easing.standard,
      // The browser's own tap flash/outline, not this app's focus ring — strip it; focusRing below still shows for keyboard use.
      WebkitTapHighlightColor: 'transparent', outlineStyle: 'none',
    }),
  },
  lifted: { transform: [{ translateY: -3 }, { scale: 1.04 }] },
  /** The press-down: a distinct, smaller feel from the hover lift, so a tap reads as a tap. */
  pressed: { transform: [{ scale: 0.93 }], opacity: 0.88 },
  ring: { padding: space.s2, borderRadius: 24, borderWidth: 2, borderColor: 'transparent' },
  tile: { width: TILE, height: TILE, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  label: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  labelCurrent: { fontWeight: fontWeight(font.weight.heavy), color: color.action },
});
