import React from 'react';
import type { ComponentProps } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Icon } from '../icons';
import type { SkIconName } from '../icons';
import { tileColours } from '../icons/animated/AnimatedTile';
import type { TileHue } from '../icons/animated/AnimatedTile';
import { color, focusRing, font, fontWeight, radius, shadow, shadowStyle, size, space } from '../theme';
import { Gradient } from './Gradient';
import { cardLabel, M2Heading, useLift, webAttrs } from './M2Parts';
import type { PressState } from './M2Parts';
import { isWide, useM2Layout } from './m2Layout';
import { heroStops, NAVY_STOPS } from './servicePalette';
import type { ServiceHue } from './servicePalette';

/**
 * The Tier 1 records boards (docs/plans/tier1-parity-2026-10-24.md, designs
 * approved 24 Oct 2026) repeat five pieces the Mobile 2.0 set did not have:
 * - `GlossTile`: the small glossy 3D tile that fronts a row, a note or a hero
 *   (the still twin of the animated tile, same gradient and highlight);
 * - `M2Pill`: a status pill (Shared · 1, Private, Issued, Expired);
 * - `M2Note`: a soft note with a gloss tile and one line of copy;
 * - `M2HeroPanel`: a gradient hero section (not a link) with a glass tile, a
 *   title, a line under it, actions and optional art, laid out wide on a
 *   desktop with the art beside the words;
 * - `M2StatCard`: a gradient count card (the Profile "Health documents" cards),
 *   optionally a filter button.
 * Tokens only; white copy sits on the deep end of every gradient (DESIGN.md §3).
 */

/** A still glossy tile with a white glyph, in a service hue (or `danger` for SOS and errors only). */
export function GlossTile({ icon, hue = 'indigo', size: px = 44, iconSize, testID }: { icon: SkIconName; hue?: TileHue; size?: number; iconSize?: number; testID?: string }) {
  const { stops } = tileColours(hue);
  const corner = Math.round(px * 18 / 56);
  return (
    <Gradient colors={stops} gloss style={[styles.gloss, { width: px, height: px, borderRadius: corner }]} testID={testID}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glossHighlight, { borderRadius: corner }]} />
      <Icon name={icon} size={iconSize ?? Math.round(px * 0.5)} color={color.onHero} strokeWidth={2.1} />
    </Gradient>
  );
}

export type M2PillTone = 'action' | 'positive' | 'attention' | 'danger' | 'neutral' | 'hero';

const PILL: Record<M2PillTone, { bg: string; fg: string }> = {
  action: { bg: color.surface3, fg: color.action },
  positive: { bg: color.positiveBg, fg: color.positive },
  attention: { bg: color.attentionBg, fg: color.attention },
  danger: { bg: color.dangerBg, fg: color.danger },
  neutral: { bg: color.neutralBg, fg: color.text2 },
  /** On a navy or gradient surface. */
  hero: { bg: color.onHeroVeil, fg: color.onHero },
};

/** A small status pill. Its text is read as it is; the tone only colours it. */
export function M2Pill({ label, tone = 'neutral', icon, testID }: { label: string; tone?: M2PillTone; icon?: SkIconName; testID?: string }) {
  const p = PILL[tone];
  return (
    <View style={[styles.pill, { backgroundColor: p.bg }]} testID={testID}>
      {icon ? <Icon name={icon} size={13} color={p.fg} strokeWidth={2.4} /> : null}
      <Text style={[styles.pillText, { color: p.fg }]}>{label}</Text>
    </View>
  );
}

export type M2NoteTone = 'info' | 'positive' | 'attention' | 'danger' | 'neutral';

const NOTE: Record<M2NoteTone, { bg: string; fg: string; hue: TileHue }> = {
  info: { bg: color.surface3, fg: color.text, hue: 'indigo' },
  positive: { bg: color.positiveBg, fg: color.text, hue: 'green' },
  attention: { bg: color.attentionBg, fg: color.text, hue: 'amber' },
  danger: { bg: color.dangerBg, fg: color.text, hue: 'danger' },
  neutral: { bg: color.surface2, fg: color.text, hue: 'indigo' },
};

/**
 * A soft note with a gloss tile and short copy. Red (`danger`) only for
 * safety lines and failures (DESIGN.md §3). `announce` makes it a live region:
 * an alert for `danger`, a polite status otherwise (a change of state the
 * reader should hear: offline, stale, failed).
 */
export function M2Note({ tone = 'info', icon, title, children, announce = false, testID }: { tone?: M2NoteTone; icon: SkIconName; title?: string; children: React.ReactNode; announce?: boolean; testID?: string }) {
  const n = NOTE[tone];
  const role = announce ? (tone === 'danger' ? 'alert' : 'status') : undefined;
  return (
    <View
      style={[styles.note, { backgroundColor: n.bg }]}
      testID={testID}
      role={role}
      accessibilityRole={role === 'alert' ? 'alert' : undefined}
      accessibilityLiveRegion={role === 'status' ? 'polite' : undefined}
    >
      <GlossTile icon={icon} hue={n.hue} size={30} iconSize={15} />
      <View style={styles.noteWords}>
        {title ? <Text style={[styles.noteTitle, { color: n.fg }]}>{title}</Text> : null}
        <Text style={[styles.noteBody, { color: n.fg }]}>{children}</Text>
      </View>
    </View>
  );
}

export interface M2HeroPanelProps {
  title: string;
  sub?: string;
  eyebrow?: string;
  /** The glass tile's glyph. */
  icon?: SkIconName;
  /** `navy` (indigo) or a service hue; white copy sits on its deep end. */
  hue?: ServiceHue;
  /** Canvas art beside the words (desktop) or in the corner (phone); decorative unless `artLabel` is given. */
  art?: ComponentProps<typeof Image>['source'];
  artLabel?: string;
  /** Art drawn by a component instead (an animated scene); takes the art's place. */
  artNode?: React.ReactNode;
  /** Buttons under the words (Add a document, Export all). */
  actions?: React.ReactNode;
  /** Keep the phone arrangement (art in the corner, phone title) even on a desktop: a hero in a narrow side column. */
  compact?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** The records boards' gradient hero: a section, not a link. */
export function M2HeroPanel({ title, sub, eyebrow, icon, hue = 'indigo', art, artLabel, artNode: artGiven, actions, compact = false, children, style, testID }: M2HeroPanelProps) {
  const layout = useM2Layout();
  const wide = isWide(layout) && !compact;
  const stops = hue === 'indigo' ? NAVY_STOPS : heroStops(hue);
  const artNode = artGiven ?? (art ? (
    <Image
      source={art}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      accessible={Boolean(artLabel)}
      accessibilityLabel={artLabel}
      {...webAttrs({ 'aria-hidden': artLabel ? undefined : 'true' })}
      style={wide ? styles.heroArtWide : styles.heroArtPhone}
    />
  ) : null);
  return (
    <Gradient colors={stops} style={[styles.hero, wide ? styles.heroWide : null, style]} testID={testID}>
      <View pointerEvents="none" style={styles.heroRingBig} />
      <View pointerEvents="none" style={styles.heroRingSmall} />
      <View style={styles.heroWords}>
        {!wide && (icon || artNode) ? (
          // The phone board's top row: the glass tile on the left, the art on the right, the words under both (never overlapping).
          <View style={[styles.heroTop, artNode ? styles.heroTopWithArt : null]}>
            {icon ? <View style={styles.glassTile}><Icon name={icon} size={24} color={color.onHero} strokeWidth={2.1} /></View> : null}
            {artNode ? <View style={styles.heroArtCornerBox}>{artNode}</View> : null}
          </View>
        ) : null}
        {wide && icon ? <View style={styles.glassTile}><Icon name={icon} size={24} color={color.onHero} strokeWidth={2.1} /></View> : null}
        {eyebrow ? <Text style={styles.heroEyebrow}>{eyebrow}</Text> : null}
        <M2Heading level={1} style={[styles.heroTitle, wide && layout === 'desktop' ? styles.heroTitleDesktop : null]}>{title}</M2Heading>
        {sub ? <Text style={[styles.heroSub, wide ? styles.heroSubWide : null]}>{sub}</Text> : null}
        {children}
        {actions ? <View style={styles.heroActions}>{actions}</View> : null}
      </View>
      {wide && artNode ? <View style={styles.heroArtSideBox}>{artNode}</View> : null}
    </Gradient>
  );
}

/** A white pill button on a hero (Add a document) or a translucent one (Export all). */
export function HeroButton({ label, icon, onPress, variant = 'white', disabled = false, busy = false, testID }: {
  label: string; icon?: SkIconName; onPress: () => void; variant?: 'white' | 'glass'; disabled?: boolean; busy?: boolean; testID?: string;
}) {
  const ink = variant === 'white' ? color.onHeroCurrent : color.onHero;
  return (
    <Pressable role="button" accessibilityRole="button" accessibilityLabel={label} aria-label={label} onPress={onPress} disabled={disabled || busy}
      accessibilityState={{ disabled: disabled || busy, busy }} aria-busy={busy} testID={testID}
      style={({ focused }: PressState) => [styles.heroBtn, variant === 'white' ? styles.heroBtnWhite : styles.heroBtnGlass, disabled ? styles.disabled : null, focused ? focusRing : null]}>
      {icon ? <Icon name={icon} size={16} color={ink} strokeWidth={2.4} /> : null}
      <Text style={[styles.heroBtnText, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

export interface M2StatCardProps {
  icon: SkIconName;
  hue: ServiceHue;
  count: number | string;
  label: string;
  /** With an action the card is a toggle button (a filter), named by its label and count. */
  onPress?: () => void;
  selected?: boolean;
  /** Grows to its grid cell's height. */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** The gradient count card (M2Profile "Health documents"), here also a filter. */
export function M2StatCard({ icon, hue, count, label, onPress, selected = false, fill = false, style, testID }: M2StatCardProps) {
  const lift = useLift();
  const wide = isWide(useM2Layout());
  const body = (
    <Gradient colors={heroStops(hue)} gloss style={[styles.stat, wide ? styles.statWide : null, fill ? styles.fill : null, selected ? styles.statSelected : null]}>
      <View pointerEvents="none" style={styles.statRing} />
      <View style={styles.statIcon}><Icon name={icon} size={20} color={color.onHero} strokeWidth={2.1} /></View>
      <View>
        <Text style={styles.statCount}>{count}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </Gradient>
  );
  if (!onPress) return <View style={[fill ? styles.fill : null, style]} testID={testID} accessible {...cardLabel(`${label} · ${count}`)}>{body}</View>;
  return (
    <Pressable role="button" accessibilityRole="button" accessibilityLabel={`${label} · ${count}`} aria-label={`${label} · ${count}`} aria-pressed={selected}
      accessibilityState={{ selected }} onPress={onPress} testID={testID}
      style={(state: PressState) => [styles.statPress, fill ? styles.fill : null, style, lift(state)]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flexGrow: 1 },
  disabled: { opacity: 0.5 },
  gloss: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...shadowStyle(shadow.hairline) },
  glossHighlight: { borderWidth: 1.5, borderColor: color.actionHighlight },
  pill: { flexDirection: 'row', alignItems: 'center', gap: space.s4, alignSelf: 'flex-start', paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full },
  pillText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12, padding: space.s14, borderRadius: radius.xl },
  noteWords: { flex: 1, minWidth: 0, gap: space.s2 },
  noteTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy) },
  noteBody: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * font.lineHeight.body, fontWeight: fontWeight(font.weight.strong) },
  hero: { borderRadius: 28, padding: space.s20, gap: space.s8, overflow: 'hidden', ...shadowStyle(shadow.float) },
  heroWide: { borderRadius: 32, padding: space.s32, flexDirection: 'row', alignItems: 'center', gap: space.s24, minHeight: 220 },
  heroRingBig: { position: 'absolute', right: -40, bottom: -60, width: 190, height: 190, borderRadius: radius.full, borderWidth: 26, borderColor: color.onHeroRule },
  heroRingSmall: { position: 'absolute', right: 40, top: -50, width: 120, height: 120, borderRadius: radius.full, backgroundColor: color.onHeroVeil },
  heroWords: { flex: 1, minWidth: 0, gap: space.s8 },
  heroTop: { height: 56, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroTopWithArt: { height: 110 },
  heroArtCornerBox: { width: 150, height: 110, alignItems: 'flex-end', justifyContent: 'center', marginTop: -space.s8, marginRight: -space.s8 },
  heroArtSideBox: { width: 260, height: 200, alignItems: 'center', justifyContent: 'flex-end' },
  heroArtPhone: { width: 150, height: 110 },
  heroArtWide: { width: 260, height: 200 },
  glassTile: { width: 52, height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil, borderWidth: 1, borderColor: color.onHeroRule, marginBottom: space.s8 },
  heroEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.onHeroLabel },
  heroTitle: { fontFamily: font.family.sans, fontSize: font.size.heading, lineHeight: 32, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.5, color: color.onHero, maxWidth: 420 },
  heroTitleDesktop: { fontSize: font.size.display, lineHeight: 40 },
  heroSub: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: 19, fontWeight: fontWeight(font.weight.strong), color: color.onHero, maxWidth: 300 },
  heroSubWide: { fontSize: font.size.body, lineHeight: 22, maxWidth: 520 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s10, marginTop: space.s8 },
  heroBtn: { minHeight: size.touchTarget, paddingHorizontal: space.s16, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  heroBtnWhite: { backgroundColor: color.heroCurrent },
  heroBtnGlass: { backgroundColor: color.onHeroVeil, borderWidth: 1, borderColor: color.onHeroRule },
  heroBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy) },
  statPress: { borderRadius: 24 },
  stat: { minHeight: 132, borderRadius: 24, padding: space.s14, justifyContent: 'space-between', gap: space.s10, overflow: 'hidden', ...shadowStyle(shadow.card) },
  statWide: { minHeight: 140, padding: space.s16 },
  statSelected: { borderWidth: 2, borderColor: color.heroCurrent },
  statRing: { position: 'absolute', right: -36, bottom: -36, width: 110, height: 110, borderRadius: radius.full, borderWidth: 16, borderColor: color.onHeroRule },
  statIcon: { width: 42, height: 42, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil, borderWidth: 1, borderColor: color.onHeroRule },
  statCount: { fontFamily: font.family.sans, fontSize: 28, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.5, color: color.onHero, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
});
