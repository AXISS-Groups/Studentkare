import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { color, motion, radius, shadow, shadowStyle, webOnly } from '../../theme';
import { useReducedMotion } from '../../motion';
import { Gradient } from '../../m2/Gradient';
import { SERVICE_HUES, tileStops, type ServiceHue } from '../../m2/servicePalette';

/**
 * The raised 3D tile behind an animated icon (`variant="3d"`), drawn to match
 * <Icon3d>: a service-hue gradient lit from the top left with a gloss, an inner
 * highlight, a soft drop shadow and a ground shadow, all from tokens. The tile
 * leans toward the pointer on hover and presses in on press (web: pointer
 * events; native: touch), and holds still under reduced motion.
 */
export type TileHue = ServiceHue | 'danger';

/** <Icon3d> artwork: a 56 px tile with 18 px corners in a 72 px box. */
const TILE_RATIO = 56 / 72;
const CORNER_RATIO = 18 / 56;
const GLYPH_RATIO = 0.52;
const GROUND_W = 0.62;
const GROUND_H = 0.07;
const GROUND_OPACITY = 0.28;
const HIGHLIGHT_W = 1.5;
/** Most a tile leans toward the pointer, and how far it sinks on press. */
const TILT_DEG = 9;
const PRESS_SCALE = 0.94;
const PERSPECTIVE = 420;

export function tileColours(hue: TileHue): { stops: readonly string[]; deep: string } {
  if (hue === 'danger') return { stops: [color.dangerFill, color.dangerFill], deep: color.dangerFill };
  return { stops: tileStops(hue), deep: SERVICE_HUES[hue].deep };
}

const useNativeDriver = Platform.OS !== 'web';

export function AnimatedTile({ size, hue, children }: { size: number; hue: TileHue; children: (glyph: number, deep: string) => React.ReactNode }): React.ReactElement {
  const reduced = useReducedMotion();
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;
  // The tile's host node (a DOM element on web), for pointer tracking.
  const [node, setNode] = useState<unknown>(null);
  const tile = size * TILE_RATIO;
  const { stops, deep } = tileColours(hue);

  const to = (value: Animated.Value, toValue: number) =>
    Animated.timing(value, { toValue, duration: motion.duration.fast, useNativeDriver }).start();
  const settle = () => { to(tiltX, 0); to(tiltY, 0); to(press, 1); };

  // Web: lean toward the pointer over the tile's control (or the tile), press in on pointer down.
  useEffect(() => {
    if (Platform.OS !== 'web' || reduced) return undefined;
    const el = node;
    if (!(typeof HTMLElement !== 'undefined' && el instanceof HTMLElement)) return undefined;
    const target = el.closest<HTMLElement>('a, button, [role="button"], [role="link"]') ?? el;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      tiltY.setValue(Math.max(-1, Math.min(1, dx)));
      tiltX.setValue(Math.max(-1, Math.min(1, -dy)));
    };
    const down = () => to(press, PRESS_SCALE);
    const up = () => to(press, 1);
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerleave', settle);
    target.addEventListener('pointerdown', down);
    target.addEventListener('pointerup', up);
    return () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerleave', settle);
      target.removeEventListener('pointerdown', down);
      target.removeEventListener('pointerup', up);
    };
    // The handlers only touch Animated values that live as long as the tile.
  }, [reduced, node]);

  useEffect(() => { if (reduced) settle(); }, [reduced]);

  const rotateX = tiltX.interpolate({ inputRange: [-1, 1], outputRange: [`-${TILT_DEG}deg`, `${TILT_DEG}deg`] });
  const rotateY = tiltY.interpolate({ inputRange: [-1, 1], outputRange: [`-${TILT_DEG}deg`, `${TILT_DEG}deg`] });
  const touch = Platform.OS !== 'web' && !reduced
    ? { onTouchStart: () => { to(press, PRESS_SCALE); to(tiltX, 1); }, onTouchEnd: settle, onTouchCancel: settle }
    : {};

  return (
    <View ref={setNode} style={[styles.box, { width: size, height: size }]} {...touch}>
      <View style={[styles.ground, { width: size * GROUND_W, height: size * GROUND_H, backgroundColor: deep }, webOnly({ filter: `blur(${size * GROUND_H / 2}px)` })]} />
      <Animated.View
        style={[
          { width: tile, height: tile, borderRadius: tile * CORNER_RATIO },
          shadowStyle(shadow.float),
          { transform: [{ perspective: PERSPECTIVE }, { rotateX }, { rotateY }, { scale: press }] },
        ]}
      >
        <Gradient colors={stops} gloss style={[StyleSheet.absoluteFill, { borderRadius: tile * CORNER_RATIO }]} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.highlight, { borderRadius: tile * CORNER_RATIO }]} />
        <View style={styles.glyph}>{children(tile * GLYPH_RATIO, deep)}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'flex-start' },
  ground: { position: 'absolute', bottom: 0, borderRadius: radius.full, opacity: GROUND_OPACITY },
  highlight: { borderWidth: HIGHLIGHT_W, borderColor: color.actionHighlight },
  glyph: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
