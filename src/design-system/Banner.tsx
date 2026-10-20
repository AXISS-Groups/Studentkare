import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './icons';
import type { SkIconName } from './icons';
import { color, focusRing, font, fontWeight, radius, size, space } from './theme';

export type BannerTone = 'info' | 'attention' | 'positive' | 'danger' | 'crisis';

interface ToneStyle { icon: SkIconName; bg: string; rule: string; title: string; body: string; ink: string; alert: boolean }

/**
 * Board Feedback, "Banners · persistent, never auto-dismissed". `crisis` is
 * the always-open support line (red is kept for SOS, crisis and danger only);
 * `danger` interrupts as an alert, the rest are read in place.
 */
const tones: Record<BannerTone, ToneStyle> = {
  info: { icon: 'info-4', bg: color.surface3, rule: color.rule, title: color.text, body: color.text2, ink: color.action, alert: false },
  attention: { icon: 'alert-triangle-4', bg: color.attentionBg, rule: color.rule, title: color.attention, body: color.attention, ink: color.attention, alert: false },
  positive: { icon: 'check', bg: color.positiveBg, rule: color.positiveRule, title: color.positive, body: color.positive, ink: color.positive, alert: false },
  danger: { icon: 'x', bg: color.dangerBg, rule: color.dangerRule, title: color.danger, body: color.danger, ink: color.danger, alert: true },
  crisis: { icon: 'shield-2', bg: color.dangerBg, rule: color.dangerRule, title: color.danger, body: color.danger, ink: color.danger, alert: false },
};

export interface BannerProps {
  tone?: BannerTone;
  title?: string;
  children: React.ReactNode;
  /** One verb: Renew, Call, Track. A banner can also be dismissed by its action. */
  action?: { label: string; onPress: () => void };
  /** Read out politely when it appears (a state that changed under the user). `danger` is always an alert. */
  announce?: boolean;
  testID?: string;
}

/**
 * Banner (DESIGN.md §4 Note / Banner; board Feedback). Persistent: it stays
 * until the state it describes changes, because a warning a person must act
 * on is not something to time out.
 */
export function Banner({ tone = 'info', title, children, action, announce = false, testID }: BannerProps) {
  const c = tones[tone];
  return (
    <View
      testID={testID}
      role={c.alert ? 'alert' : announce ? 'status' : undefined}
      style={[styles.banner, { backgroundColor: c.bg, borderColor: c.rule }]}
    >
      <View style={[styles.tile, { backgroundColor: color.surface }]}>
        <Icon name={c.icon} size={18} strokeWidth={2.3} color={c.ink} />
      </View>
      <View style={styles.text}>
        {title ? <Text style={[styles.title, { color: c.title }]}>{title}</Text> : null}
        <Text style={[styles.body, { color: c.body }]}>{children}</Text>
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.cta, focused ? focusRing : null]}
        >
          <Text style={[styles.ctaText, { color: c.ink }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    paddingVertical: space.s16, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1,
  },
  tile: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text: { flex: 1, gap: space.s4 },
  title: { fontFamily: font.family.sans, fontSize: 14, fontWeight: fontWeight(font.weight.heavy) },
  body: { fontFamily: font.family.sans, fontSize: 12.5, lineHeight: 12.5 * 1.5, fontWeight: fontWeight(font.weight.regular) },
  cta: {
    minHeight: size.touchTarget, paddingHorizontal: space.s16, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface, flexShrink: 0,
  },
  ctaText: { fontFamily: font.family.sans, fontSize: 12.5, fontWeight: fontWeight(font.weight.heavy) },
});
