import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { color, size as sizeToken } from '../../theme';
import { skAnimated, type SkAnimatedName } from '../generated/skAnimatedData';
import { LottiePlayer } from './LottiePlayer';
import { AnimatedTile, type TileHue } from './AnimatedTile';
import type { AnimatedPlay } from './types';

/**
 * Animated icons and illustrations (design/icons/animated/README.md): the
 * licensed Lottie set, recoloured to tokens. Web plays them with lottie-web in
 * a lazy chunk, native with lottie-react-native. Every one:
 * - rests on a still frame under reduced motion, and stops off screen, in the
 *   background and when unmounted;
 * - is decorative unless given a `label` (then an image with that name);
 * - takes its size from the `size.anim-*` tokens and its ink from `color`.
 */
export type AnimatedIconSize = 'inline' | 'icon' | 'mark' | 'tile';
export type AnimatedIllustrationSize = 'sm' | 'md' | 'lg';

const ICON_SIZE: Record<AnimatedIconSize, number> = {
  inline: sizeToken.animInline, icon: sizeToken.animIcon, mark: sizeToken.animMark, tile: sizeToken.animTile,
};
const SCENE_WIDTH: Record<AnimatedIllustrationSize, number> = {
  sm: sizeToken.animSceneSm, md: sizeToken.animScene, lg: sizeToken.animSceneLg,
};

const a11y = (label?: string) => (label
  ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label, 'aria-label': label, role: 'img' as const }
  : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const, 'aria-hidden': true });

export interface AnimatedIconProps {
  name: SkAnimatedName;
  /** A `size.anim-*` token. Default: `icon` (24), or `tile` (72) for the 3D variant. */
  size?: AnimatedIconSize;
  /** Ink, as a token value (`color.positive`). Default `color.action`. Red only for errors and SOS. */
  color?: string;
  /** What starts it. Default: `loop` for loaders, else `mount` (plays once when it comes into view). */
  play?: AnimatedPlay;
  /** Plays once each time this turns true (a tab becoming current). */
  active?: boolean;
  /** `3d`: white drawing on a raised tile, like <Icon3d>. */
  variant?: 'flat' | '3d';
  /** Tile gradient for the 3D variant (service hues; `danger` only for errors and SOS). Default `indigo`. */
  hue?: TileHue;
  /** The surface the icon sits on, for drawings with knock-out lines. Default `color.surface`. */
  background?: string;
  /** Shown until the animation is drawn (keep the canvas icon here when the board draws one). */
  poster?: React.ReactNode;
  /** Accessible name. Leave empty when the icon sits beside visible text. */
  label?: string;
  testID?: string;
}

function WithPoster({ poster, ready, children, width, height }: { poster?: React.ReactNode; ready: boolean; children: React.ReactNode; width: number; height: number }) {
  return (
    <View style={{ width, height }}>
      {children}
      {poster && !ready ? <View style={[StyleSheet.absoluteFill, styles.centre]}>{poster}</View> : null}
    </View>
  );
}

/** One animated icon from the manifest (`anim-*`). */
export function AnimatedIcon({
  name, size, color: ink = color.action, play, active = false, variant = 'flat', hue = 'indigo',
  background = color.surface, poster, label, testID,
}: AnimatedIconProps): React.ReactElement | null {
  const def = skAnimated[name];
  const [ready, setReady] = useState(false);
  if (!def) return null;
  const px = ICON_SIZE[size ?? (variant === '3d' ? 'tile' : 'icon')];
  const trigger = play ?? (def.loop ? 'loop' : 'mount');
  const body = variant === '3d'
    ? (
      <AnimatedTile size={px} hue={hue}>
        {(glyph, deep) => <LottiePlayer name={name} width={glyph} height={glyph} trigger={trigger} active={active} ink={color.onHero} bg={deep} onReady={() => setReady(true)} />}
      </AnimatedTile>
    )
    : <LottiePlayer name={name} width={px} height={px} trigger={trigger} active={active} ink={ink} bg={background} onReady={() => setReady(true)} />;
  return (
    <View testID={testID} {...a11y(label)} {...{ dataSet: { animIcon: name } }} style={styles.wrap}>
      <WithPoster poster={poster} ready={ready} width={px} height={px}>{body}</WithPoster>
    </View>
  );
}

export interface AnimatedIllustrationProps {
  name: SkAnimatedName;
  /** Width from the `size.anim-scene*` tokens; the height follows the drawing. Default `md`. */
  size?: AnimatedIllustrationSize;
  /** Default `loop` (scenes and chart loops); `mount` plays once. */
  play?: AnimatedPlay;
  poster?: React.ReactNode;
  /** Accessible name; decorative when empty (most uses: it sits beside a heading that says it all). */
  label?: string;
  testID?: string;
}

/** An animated scene or decorative chart loop (`scene-*`, `loop-chart-*`). Never stands in for data. */
export function AnimatedIllustration({ name, size = 'md', play = 'loop', poster, label, testID }: AnimatedIllustrationProps): React.ReactElement | null {
  const def = skAnimated[name];
  const [ready, setReady] = useState(false);
  if (!def) return null;
  const width = SCENE_WIDTH[size];
  const height = Math.round(width * (def.height / def.width));
  return (
    <View testID={testID} {...a11y(label)} {...{ dataSet: { animIllustration: name } }} style={styles.wrap}>
      <WithPoster poster={poster} ready={ready} width={width} height={height}>
        <LottiePlayer name={name} width={width} height={height} trigger={play} active={false} ink={color.action} bg={color.surface} onReady={() => setReady(true)} />
      </WithPoster>
    </View>
  );
}

export type { SkAnimatedName, AnimatedPlay, TileHue };

const styles = StyleSheet.create({
  wrap: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  centre: { alignItems: 'center', justifyContent: 'center' },
});
