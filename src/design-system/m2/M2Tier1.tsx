import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Icon } from '../icons';
import type { SkIconName } from '../icons';
import { color, focusRing, font, fontWeight, motion, radius, shadow, shadowStyle, size, space } from '../theme';
import { Gradient } from './Gradient';
import { floatTransform, useAmbientMotion, useLoop } from './m2Motion';
import { M2Card, M2Heading, cardLabel, m2Text } from './M2Parts';
import type { PressState } from './M2Parts';
import { isWide, useM2Layout } from './m2Layout';
import { ProgressRing } from './ProgressRing';
import { heroStops, SERVICE_HUES, tileStops } from './servicePalette';
import type { ServiceHue } from './servicePalette';

/**
 * The pieces the Tier 1 boards share (canvas page 3 "Tier 1: vault, ID,
 * privacy, safety", approved by Krishna Chintakayala 2026-10-24; plan
 * docs/plans/tier1-parity-2026-10-24.md §13–21): a glossy 3D icon tile built
 * from tokens, the gradient page hero (not a link, unlike GradientHeroCard),
 * a tinted callout with its tile and one action, the consent-history
 * timeline row, and the deletion countdown. React Native primitives, so the
 * phone frame, the desktop shell and Expo draw one thing; every loop rests
 * under reduced motion (`useAmbientMotion`).
 */

/** A tile hue: the service palette, or `danger` for SOS, lost phone and deletion only (founder colour rule). */
export type TileHue3d = ServiceHue | 'danger';

function tileColours(hue: TileHue3d): { stops: readonly string[]; shadowColor: string } {
  if (hue === 'danger') return { stops: [color.dangerFill, color.dangerFill], shadowColor: color.dangerFill };
  return { stops: tileStops(hue), shadowColor: SERVICE_HUES[hue].deep };
}

/** The glossy 3D icon tile (canvas `.sk-t3d`): hue gradient lit top-left, white glyph, soft drop shadow. Decoration: the row names itself. */
export function M2Tile3d({ icon, hue, size: side = 44, float = false, style, testID }: {
  icon: SkIconName; hue: TileHue3d; size?: number;
  /** A slow float (hero art only); still under reduced motion. */
  float?: boolean;
  style?: StyleProp<ViewStyle>; testID?: string;
}) {
  const { stops } = tileColours(hue);
  const ambient = useAmbientMotion();
  const drift = useLoop(ambient && float, motion.duration.ambient);
  const tile = (
    <Gradient colors={stops} gloss angle={150} style={[styles.tile, { width: side, height: side, borderRadius: Math.round(side * 0.32) }, style]} testID={testID}>
      <Icon name={icon} size={Math.round(side * 0.5)} color={color.onHero} strokeWidth={2.1} />
    </Gradient>
  );
  if (!float) return tile;
  return <Animated.View pointerEvents="none" style={{ transform: floatTransform(drift, space.s6) }}>{tile}</Animated.View>;
}

export interface M2PageHeroProps {
  hue: ServiceHue;
  eyebrow?: string;
  title?: string;
  body?: string;
  /** The glass chip's glyph (top-left on the boards). */
  icon?: SkIconName;
  /** Art on the right (an illustration, an animated scene, a 3D tile); hidden on the phone when `artOnPhone` is false. */
  art?: React.ReactNode;
  artOnPhone?: boolean;
  /** Buttons under the copy (Call 112, Print). */
  actions?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** The Tier 1 page hero: a deep-to-shade gradient (white text AA across it), two soft rings, a glass chip, the title and one line. */
export function M2PageHero({ hue, eyebrow, title, body, icon, art, artOnPhone = true, actions, children, style, testID }: M2PageHeroProps) {
  const layout = useM2Layout();
  const wide = isWide(layout);
  const ambient = useAmbientMotion();
  const drift = useLoop(ambient, motion.duration.ambient * 2);
  const showArt = art && (wide || artOnPhone);
  return (
    <Gradient colors={heroStops(hue)} angle={140} style={[styles.hero, wide ? styles.heroWide : null, style]} testID={testID}>
      <View pointerEvents="none" style={[styles.heroRingSmall, wide ? styles.heroRingSmallWide : null]} />
      <Animated.View pointerEvents="none" style={[styles.heroRingBig, wide ? styles.heroRingBigWide : null, { transform: floatTransform(drift, space.s8) }]} />
      <View style={[styles.heroRow, wide ? styles.heroRowWide : null]}>
        <View style={styles.heroWords}>
          {icon ? (
            <View style={styles.glassChip}>
              <Icon name={icon} size={wide ? 26 : 24} color={color.onHero} strokeWidth={2} />
            </View>
          ) : null}
          {eyebrow ? <Text style={styles.heroEyebrow}>{eyebrow}</Text> : null}
          {title ? (
            <M2Heading level={1} style={[styles.heroTitle, layout === 'desktop' ? styles.heroTitleDesktop : null]}>{title}</M2Heading>
          ) : null}
          {body ? <Text style={[styles.heroBody, wide ? styles.heroBodyWide : null]}>{body}</Text> : null}
          {children}
          {actions ? <View style={styles.heroActions}>{actions}</View> : null}
        </View>
        {showArt ? <View style={[styles.heroArt, wide ? styles.heroArtWide : null]} pointerEvents="none">{art}</View> : null}
      </View>
    </Gradient>
  );
}

export type CalloutTone = 'danger' | 'attention' | 'positive' | 'info' | 'neutral';

const CALLOUT: Record<CalloutTone, { bg: string; ink: string; rule: string }> = {
  danger: { bg: color.dangerBg, ink: color.danger, rule: color.dangerRule },
  attention: { bg: color.attentionBg, ink: color.attention, rule: color.attentionBg },
  positive: { bg: color.positiveBg, ink: color.positive, rule: color.positiveRule },
  info: { bg: color.surface3, ink: color.info, rule: color.surface3 },
  neutral: { bg: color.surface2, ink: color.text, rule: color.ruleSoft },
};

/**
 * A tinted callout with a 3D tile, a title, a line and at most one action
 * ("Lost your phone? · Secure it", "You sign in with your college email").
 * Red only for safety (lost phone, deletion, SOS).
 */
export function M2Callout({ tone, icon, hue, title, body, action, children, role, testID }: {
  tone: CalloutTone; icon: SkIconName; hue: TileHue3d; title?: string; body: string;
  action?: { label: string; onPress: () => void; spoken?: string; testID?: string };
  children?: React.ReactNode;
  role?: 'alert' | 'status';
  testID?: string;
}) {
  const wide = isWide(useM2Layout());
  const c = CALLOUT[tone];
  return (
    <View role={role} accessibilityRole={role === 'alert' ? 'alert' : undefined} style={[styles.callout, { backgroundColor: c.bg, borderColor: c.rule }, wide ? styles.calloutWide : null]} testID={testID}>
      <M2Tile3d icon={icon} hue={hue} size={wide ? 48 : 44} />
      <View style={styles.calloutWords}>
        {title ? <Text style={[styles.calloutTitle, { color: c.ink }]}>{title}</Text> : null}
        <Text style={[m2Text.body, tone === 'neutral' ? null : { color: color.text }]}>{body}</Text>
        {children}
      </View>
      {action ? (
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={action.spoken ?? action.label} aria-label={action.spoken ?? action.label} onPress={action.onPress} testID={action.testID}
          style={({ focused }: PressState) => [styles.calloutAction, tone === 'danger' ? styles.calloutActionDanger : styles.calloutActionPlain, focused ? focusRing : null]}>
          <Text style={[styles.calloutActionText, tone === 'danger' ? styles.calloutActionTextDanger : null]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export interface M2TimelineItem {
  key: string;
  /** What was agreed to. */
  what: string;
  /** The wording version it was given under. */
  wording: string;
  given: string;
  /** When it was withdrawn, or null while it is still on. */
  withdrawn: string | null;
}

export interface M2TimelineLabels { what: string; wording: string; given: string; withdrawn: string; stillOn: string }

/**
 * One entry of the consent record (canvas "Full record"): a dot on a line
 * (filled while still on), then what · wording · given · withdrawn. Four
 * columns on a desktop, stacked on the phone. Read as one row by a screen reader.
 */
export function M2TimelineRow({ item, labels, last = false, testID }: { item: M2TimelineItem; labels: M2TimelineLabels; last?: boolean; testID?: string }) {
  const desktop = useM2Layout() === 'desktop';
  const on = item.withdrawn === null;
  const withdrawn = item.withdrawn ?? labels.stillOn;
  const spoken = `${labels.what}: ${item.what}. ${labels.wording}: ${item.wording}. ${labels.given}: ${item.given}. ${labels.withdrawn}: ${withdrawn}`;
  const cell = (label: string, value: string, tone?: StyleProp<TextStyle>) => (
    <View style={[styles.tlCell, desktop ? styles.tlCellDesktop : null]}>
      <Text style={styles.tlLabel}>{label}</Text>
      <Text style={[styles.tlValue, tone]}>{value}</Text>
    </View>
  );
  return (
    <View accessible {...cardLabel(spoken)} role="listitem" style={styles.tlRow} testID={testID}>
      <View style={styles.tlRail}>
        <View style={[styles.tlDot, on ? styles.tlDotOn : styles.tlDotOff]} />
        {last ? null : <View style={styles.tlLine} />}
      </View>
      <View style={[styles.tlCells, desktop ? styles.tlCellsDesktop : null]}>
        {cell(labels.what, item.what, styles.tlStrong)}
        {cell(labels.wording, item.wording, styles.tlMono)}
        {cell(labels.given, item.given)}
        {cell(labels.withdrawn, withdrawn, on ? styles.tlOn : null)}
      </View>
    </View>
  );
}

/** The consent record as a timeline (newest first, as the server sends it). */
export function M2Timeline({ items, labels, caption, testID }: { items: readonly M2TimelineItem[]; labels: M2TimelineLabels; caption: string; testID?: string }) {
  return (
    <View role="list" accessibilityLabel={caption} aria-label={caption} testID={testID}>
      {items.map((item, i) => <M2TimelineRow key={item.key} item={item} labels={labels} last={i === items.length - 1} testID={testID ? `${testID}-${i}` : undefined} />)}
    </View>
  );
}

/**
 * The deletion countdown (canvas DeleteAccountPending): a ring, "Day n of N"
 * and one segment per day of the grace period, the days gone filled in red
 * (deletion is on the founder's danger list). `day` and `of` come from the
 * server's request and the grace setting, never a client constant. No motion
 * beyond the ring's single draw.
 */
export function M2Countdown({ day, of, label, testID }: { day: number; of: number; label: string; testID?: string }) {
  const segments = Array.from({ length: Math.max(1, of) }, (_, i) => i < day);
  return (
    <View style={styles.countdown} accessible accessibilityLabel={label} aria-label={label} testID={testID}>
      <View style={styles.countRing}>
        <ProgressRing value={of > 0 ? day / of : 0} centre="" size={72} tone={color.danger} track={color.surface3} />
        <View style={styles.countRingIcon} pointerEvents="none"><Icon name="clock" size={22} color={color.danger} /></View>
      </View>
      <View style={styles.countWords}>
        <Text style={styles.countLabel}>{label}</Text>
        <View style={styles.segments} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {segments.map((gone, i) => <View key={i} style={[styles.segment, gone ? styles.segmentGone : null]} />)}
        </View>
      </View>
    </View>
  );
}

/** A card whose top edge carries a hue (the board's "Stays yours" / "Changes" / rights cards). */
export function M2EdgeCard({ edge, children, fill = false, style, testID }: { edge: string; children: React.ReactNode; fill?: boolean; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <M2Card fill={fill} style={[styles.edgeCard, { borderTopColor: edge }, style]} testID={testID}>
      {children}
    </M2Card>
  );
}

/** A tick / arrow / cross list line used by the "what stays, what changes, what is deleted" cards. */
export function M2ListLine({ icon, ink, children }: { icon: SkIconName; ink: string; children: string }) {
  return (
    <View style={styles.listLine}>
      <Icon name={icon} size={16} color={ink} strokeWidth={2.6} />
      <Text style={[styles.listLineText, styles.grow]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  tile: { alignItems: 'center', justifyContent: 'center', ...shadowStyle(shadow.float) },
  hero: { borderRadius: 28, padding: space.s20, overflow: 'hidden', ...shadowStyle(shadow.float) },
  heroWide: { borderRadius: 32, paddingVertical: space.s32, paddingHorizontal: space.s32 },
  heroRingSmall: { position: 'absolute', top: -70, right: -50, width: 210, height: 210, borderRadius: radius.full, backgroundColor: color.onHeroVeil },
  heroRingSmallWide: { top: -90, right: '18%', width: 260, height: 260 },
  heroRingBig: { position: 'absolute', bottom: -110, left: -50, width: 230, height: 230, borderRadius: radius.full, borderWidth: 30, borderColor: color.onHeroRule },
  heroRingBigWide: { left: undefined, right: -60, bottom: -170, width: 360, height: 360, borderWidth: 40 },
  heroRow: { gap: space.s12 },
  heroRowWide: { flexDirection: 'row', alignItems: 'center', gap: space.s24, minHeight: 150 },
  heroWords: { flex: 1, minWidth: 0, gap: space.s8 },
  glassChip: { width: 52, height: 52, borderRadius: radius.lg + space.s2, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil, marginBottom: space.s6 },
  heroEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1.2, textTransform: 'uppercase', color: color.onHeroLabel },
  heroTitle: { fontFamily: font.family.sans, fontSize: font.size.title, lineHeight: 26, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.4, color: color.onHero },
  heroTitleDesktop: { fontSize: font.size.display, lineHeight: 38 },
  heroBody: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
  heroBodyWide: { fontSize: font.size.body, lineHeight: font.size.body * font.lineHeight.body, maxWidth: 640 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s10, marginTop: space.s6 },
  heroArt: { alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  heroArtWide: { width: 300, alignSelf: 'center' },
  callout: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.s12, padding: space.s14, borderRadius: radius.xl, borderWidth: 1 },
  calloutWide: { padding: space.s16, paddingHorizontal: space.s20 },
  calloutWords: { flex: 1, minWidth: 180, gap: space.s2 },
  calloutTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy) },
  calloutAction: { minHeight: size.touchTarget, paddingHorizontal: space.s16, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  calloutActionDanger: { backgroundColor: color.dangerFill },
  calloutActionPlain: { backgroundColor: color.surface3 },
  calloutActionText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  calloutActionTextDanger: { color: color.onDangerFill },
  tlRow: { flexDirection: 'row', gap: space.s12 },
  tlRail: { width: 16, alignItems: 'center' },
  tlDot: { width: 14, height: 14, borderRadius: radius.full, marginTop: space.s4 },
  tlDotOn: { backgroundColor: color.positive },
  tlDotOff: { backgroundColor: color.ruleStrong },
  tlLine: { flex: 1, width: 2, backgroundColor: color.ruleSoft, marginVertical: space.s4 },
  tlCells: { flex: 1, minWidth: 0, gap: space.s6, paddingBottom: space.s16 },
  tlCellsDesktop: { flexDirection: 'row', gap: space.s16 },
  tlCell: { gap: space.s2 },
  tlCellDesktop: { flex: 1, minWidth: 0 },
  tlLabel: { fontFamily: font.family.sans, fontSize: 11, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 0.8, textTransform: 'uppercase', color: color.text3 },
  tlValue: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  tlStrong: { fontWeight: fontWeight(font.weight.heavy) },
  tlMono: { fontFamily: font.family.mono, color: color.clinicalValue },
  tlOn: { color: color.positive, fontWeight: fontWeight(font.weight.heavy) },
  countdown: { flexDirection: 'row', alignItems: 'center', gap: space.s16 },
  countRing: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  countRingIcon: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  countWords: { flex: 1, minWidth: 0, gap: space.s8 },
  countLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  segments: { flexDirection: 'row', gap: space.s6, flexWrap: 'wrap' },
  segment: { flex: 1, minWidth: 18, maxWidth: 40, height: 8, borderRadius: radius.full, backgroundColor: color.surface3 },
  segmentGone: { backgroundColor: color.danger },
  edgeCard: { borderTopWidth: 3, padding: space.s16, gap: space.s10 },
  listLine: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s10 },
  listLineText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
});
