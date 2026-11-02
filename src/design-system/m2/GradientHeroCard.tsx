import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Icon } from '../icons';
import type { SkIconName } from '../icons';
import { color, font, fontWeight, motion, radius, shadow, shadowStyle, space } from '../theme';
import { Gradient } from './Gradient';
import { floatTransform, useAmbientMotion, useLoop } from './m2Motion';
import { cardLabel, useLift } from './M2Parts';
import type { PressState } from './M2Parts';
import { isWide, useM2Layout } from './m2Layout';

/**
 * The Mobile 2.0 gradient hero card (Home highlights, the Labs hero, the
 * GENERICS card): a `deep to end` gradient that keeps white text AA across its
 * whole length, two soft rings for depth, an eyebrow chip on the darker end,
 * the title, a line of body, a white call to action and a floating glyph.
 * The whole card is one link; the floating glyph is decoration.
 *
 * Wider than a phone (inside `<M2Responsive>`) the card is taller, the title
 * and body may run wider, and on a desktop the title is a size up. It fills its
 * cell's width; the art stays in the corner.
 */
export interface GradientHeroCardProps {
  /** `heroStops(hue)` or NAVY_STOPS: never a light stop under white text. */
  stops: readonly string[];
  /** Fill of the eyebrow chip: the gradient's darker end, so the chip text stays AA. */
  chipFill: string;
  eyebrow: string;
  title: string;
  body?: string;
  /** Text on the white call-to-action pill; its colour is the card's ink. */
  cta?: { label: string; ink: string };
  /** A price or other line drawn next to the call to action. */
  aside?: string;
  /** The floating glyph in the top-right corner. */
  icon?: SkIconName;
  /** Custom art instead of the glyph (the Labs test tube). */
  art?: React.ReactNode;
  onPress: () => void;
  /** Accessible name of the whole card. */
  label: string;
  /** Card height. Default 214 on a phone (the boards), 240 wider. */
  height?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const HEIGHT_PHONE = 214;
const HEIGHT_WIDE = 240;

export function GradientHeroCard({ stops, chipFill, eyebrow, title, body, cta, aside, icon, art, onPress, label, height, style, testID }: GradientHeroCardProps) {
  const layout = useM2Layout();
  const wide = isWide(layout);
  const ambient = useAmbientMotion();
  const float = useLoop(ambient, motion.duration.ambient);
  const lift = useLift();
  return (
    <Pressable role="link" accessibilityRole="link" {...cardLabel(label)} onPress={onPress} testID={testID}
      style={(state: PressState) => [styles.press, style, lift(state)]}>
      <Gradient colors={stops} style={[styles.card, wide ? styles.cardWide : null, { height: height ?? (wide ? HEIGHT_WIDE : HEIGHT_PHONE) }]}>
        <View pointerEvents="none" style={styles.ringBig} />
        <View pointerEvents="none" style={styles.ringSmall} />
        {art ?? (icon ? (
          <Animated.View pointerEvents="none" style={[styles.glyph, { transform: floatTransform(float, space.s6) }]}>
            <Icon name={icon} size={32} color={color.onHero} strokeWidth={1.9} />
          </Animated.View>
        ) : null)}
        <View style={[styles.chip, { backgroundColor: chipFill }]}>
          <Text style={styles.chipText}>{eyebrow}</Text>
        </View>
        <Text style={[styles.title, wide ? styles.titleWide : null, layout === 'desktop' ? styles.titleDesktop : null]}>{title}</Text>
        {body ? <Text style={[styles.body, wide ? styles.bodyWide : null]}>{body}</Text> : null}
        <View style={styles.foot}>
          {aside ? <Text style={styles.aside}>{aside}</Text> : null}
          {cta ? (
            <View style={styles.cta}>
              <Text style={[styles.ctaText, { color: cta.ink }]}>{cta.label}</Text>
              <Icon name="arrow-right" size={15} color={cta.ink} strokeWidth={2.6} />
            </View>
          ) : null}
        </View>
      </Gradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: { borderRadius: 28, ...shadowStyle(shadow.float) },
  card: { borderRadius: 28, padding: space.s20, gap: space.s8, overflow: 'hidden' },
  cardWide: { padding: space.s24 },
  titleWide: { maxWidth: 420 },
  titleDesktop: { fontSize: font.size.heading, lineHeight: 32 },
  bodyWide: { maxWidth: 400 },
  ringBig: { position: 'absolute', right: -40, bottom: -60, width: 190, height: 190, borderRadius: radius.full, borderWidth: 26, borderColor: color.onHeroRule },
  ringSmall: { position: 'absolute', right: 40, top: -50, width: 120, height: 120, borderRadius: radius.full, backgroundColor: color.onHeroVeil },
  glyph: {
    position: 'absolute', right: 22, top: 52, width: 64, height: 64, borderRadius: radius.xl,
    alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil,
  },
  chip: { alignSelf: 'flex-start', paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 0.4, textTransform: 'uppercase', color: color.onHero },
  title: { maxWidth: 250, fontFamily: font.family.sans, fontSize: font.size.title, lineHeight: 26, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.5, color: color.onHero },
  body: { maxWidth: 240, fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: 19, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
  foot: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  aside: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  cta: {
    minHeight: 38, paddingHorizontal: space.s16, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: space.s6,
    backgroundColor: color.heroCurrent,
  },
  ctaText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy) },
});

