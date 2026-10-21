import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { Gradient, M2Card, floatTransform, m2Text, useAmbientMotion, useLoop } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, motion, radius, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';

/**
 * Pieces the Mobile 2.0 health screens share (M2Insights, M2Profile,
 * M2AskAyush): the navy hero with its slow glow, a card's own "couldn't load"
 * line with a retry, and the small source line under a value.
 */

/** The navy hero (`hero-bg-top` to `hero-bg`) with two soft rings that drift while motion is allowed. */
export function NavyHero({ children, style, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  const ambient = useAmbientMotion();
  const drift = useLoop(ambient, motion.duration.ambient * 2);
  return (
    <Gradient colors={[color.heroBgTop, color.heroBg]} angle={165} style={[styles.hero, style]} testID={testID}>
      <Animated.View pointerEvents="none" style={[styles.glow, { transform: floatTransform(drift, space.s12) }]} />
      <View pointerEvents="none" style={styles.ring} />
      {children}
    </Gradient>
  );
}

/** A card's read failed: says so and offers a retry, without blanking the rest of the page. */
export function CardError({ title, onRetry, testID }: { title: string; onRetry: () => void; testID?: string }) {
  const t = useT();
  return (
    <M2Card style={styles.error} testID={testID}>
      <View accessibilityRole="alert" style={styles.errorText}>
        <Text style={m2Text.cardTitle}>{title}</Text>
        <Text style={m2Text.meta}>{t('m2h.cardFailed')}</Text>
      </View>
      <Pressable role="button" accessibilityRole="button" accessibilityLabel={`${t('common.tryAgain')}: ${title}`} aria-label={`${t('common.tryAgain')}: ${title}`}
        onPress={onRetry} testID={testID ? `${testID}-retry` : undefined}
        style={({ focused }: PressState) => [styles.retry, focused ? focusRing : null]}>
        <Icon name="refresh" size={16} color={color.action} strokeWidth={2.4} />
        <Text style={m2Text.link}>{t('common.tryAgain')}</Text>
      </Pressable>
    </M2Card>
  );
}

/** A tile on the navy hero: a number (or a short value) over a small label. */
export function HeroStat({ value, label, tone, testID }: { value: string; label: string; tone?: string; testID?: string }) {
  return (
    <View style={styles.stat} testID={testID} accessible accessibilityLabel={`${value} ${label}`} aria-label={`${value} ${label}`}>
      <Text numberOfLines={2} style={[styles.statValue, value.length > 4 ? styles.statValueSmall : null, tone ? { color: tone } : null]}>{value}</Text>
      <Text numberOfLines={1} style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** A soft rounded icon tile on a white card. */
export function TileIcon({ icon, fill, ink, tile = 40 }: { icon: SkIconName; fill: string; ink: string; tile?: number }) {
  return (
    <View style={[styles.tile, { width: tile, height: tile, borderRadius: tile / 2.9, backgroundColor: fill }]}>
      <Icon name={icon} size={20} color={ink} strokeWidth={2.1} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: space.s16, paddingHorizontal: space.gutterPhone, paddingBottom: space.s24, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden' },
  glow: { position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: radius.full, backgroundColor: color.onHeroVeil },
  ring: { position: 'absolute', left: -80, bottom: -110, width: 240, height: 240, borderRadius: radius.full, borderWidth: 28, borderColor: color.onHeroRule },
  error: { padding: space.s14, flexDirection: 'row', alignItems: 'center', gap: space.s12, borderRadius: radius.xl },
  errorText: { flex: 1, minWidth: 0, gap: space.s2 },
  retry: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s6, paddingHorizontal: space.s6 },
  stat: { flex: 1, minWidth: 0, borderRadius: radius.xl, paddingVertical: space.s12, paddingHorizontal: space.s14, gap: space.s2, backgroundColor: color.onHeroVeil },
  statValue: { fontFamily: font.family.sans, fontSize: 24, lineHeight: 29, fontWeight: fontWeight(font.weight.heavy), color: color.onHero, fontVariant: ['tabular-nums'] },
  statValueSmall: { fontSize: font.size.body, lineHeight: 20 },
  statLabel: { fontFamily: font.family.sans, fontSize: 11, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 0.8, textTransform: 'uppercase', color: color.onHeroLabel },
  tile: { alignItems: 'center', justifyContent: 'center' },
});
