import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { AnimatedIcon, Icon } from '../icons';
import type { SkAnimatedName, SkIconName, TileHue } from '../icons';
import { color, focusRing, font, fontWeight, radius, shadow, shadowStyle, size, space } from '../theme';
import { cardLabel, LiftCard, M2Card, m2Text, SoftIcon } from './M2Parts';
import type { PressState } from './M2Parts';
import { isWide, useM2Layout } from './m2Layout';
import { SERVICE_HUES } from './servicePalette';
import type { ServiceHue } from './servicePalette';

/**
 * Two Mobile 2.0 pieces the boards repeat but `src/design-system` did not
 * have in this look (parity audit 2026-10-23, phase 1):
 * - `M2ListRow`: the lifted white row of the store boards (Refills, Medicine
 *   info, Kare points): a soft icon tile in a service hue, a title, a line
 *   under it, and a chevron or a trailing value. The core `ListRow` is the
 *   plain console row (rule under it, text chevron) and stays as it is.
 * - `M2EmptyState`: the board's empty card: an animated 3D tile from the
 *   animated set, the title, one line, and at most one next step. The core
 *   `EmptyState` is the console's (secondary button, no card).
 * - `M2ProductCard`: the store boards' listing card (M2Medicines "Below MRP",
 *   M2Home "Recently viewed"), also the web shop's grid card, so phone, app and
 *   desktop draw one card.
 * The row and the empty state widen inside `<M2Responsive>`: the row gets more
 * room, the empty state lays its art beside the words on a desktop. The card
 * fills whatever cell it is given (a 156 px rail slot or a grid column).
 */

export interface M2ListRowProps {
  icon: SkIconName;
  hue: ServiceHue;
  title: string;
  meta?: string;
  /** With an action the whole row is one link; without, it is plain content. */
  onPress?: () => void;
  /** A value at the end instead of the chevron (a count, "Not added"). */
  trailing?: React.ReactNode;
  /** Neutral tile (no hue) for a row that is not a service. */
  neutral?: boolean;
  /** Grows to its grid cell's height. */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function M2ListRow({ icon, hue, title, meta, onPress, trailing, neutral = false, fill = false, style, testID }: M2ListRowProps) {
  const wide = isWide(useM2Layout());
  const body = (
    <>
      <SoftIcon icon={icon} hue={hue} neutral={neutral} tile={wide ? 48 : 44} iconSize={wide ? 24 : 22} />
      <View style={styles.words}>
        <Text style={m2Text.cardTitle}>{title}</Text>
        {meta ? <Text style={m2Text.meta}>{meta}</Text> : null}
      </View>
      {trailing ?? (onPress ? <Icon name="chevron-right" size={16} color={color.text3} strokeWidth={2.6} /> : null)}
    </>
  );
  const label = meta ? `${title}. ${meta}` : title;
  if (!onPress) {
    return (
      <M2Card fill={fill} style={[styles.row, wide ? styles.rowWide : null, style]} testID={testID}>
        <View style={styles.inner} accessible {...cardLabel(label)}>{body}</View>
      </M2Card>
    );
  }
  return (
    <LiftCard label={label} onPress={onPress} fill={fill} style={[styles.row, styles.card, wide ? styles.rowWide : null, style]} testID={testID}>
      <View style={styles.inner}>{body}</View>
    </LiftCard>
  );
}

export interface M2EmptyStateProps {
  /** An icon from the animated set (`anim-*`): drawn on a raised 3D tile, played once as it comes into view. */
  animation: SkAnimatedName;
  /** Tile hue (service hues). Default `indigo`. Never `danger` here. */
  hue?: Exclude<TileHue, 'danger'>;
  /** Still art shown until the animation is drawn, and the reduced-motion frame (the board's `<Icon3d>`). */
  poster?: React.ReactNode;
  title: string;
  body: string;
  /** The one next step. Omit only when there is genuinely nothing to do. */
  action?: { label: string; onPress: () => void };
  testID?: string;
}

export function M2EmptyState({ animation, hue = 'indigo', poster, title, body, action, testID = 'm2-empty' }: M2EmptyStateProps) {
  const desktop = useM2Layout() === 'desktop';
  return (
    <M2Card style={[styles.empty, desktop ? styles.emptyDesktop : null]} testID={testID}>
      <AnimatedIcon name={animation} variant="3d" hue={hue} poster={poster} testID={`${testID}-art`} />
      <View style={[styles.emptyWords, desktop ? styles.emptyWordsDesktop : null]}>
        <View accessibilityRole="header">
          <Text style={[styles.emptyTitle, desktop ? styles.left : null]}>{title}</Text>
        </View>
        <Text style={[m2Text.body, desktop ? styles.left : styles.centre]}>{body}</Text>
        {action ? (
          <Pressable role="button" accessibilityRole="button" accessibilityLabel={action.label} aria-label={action.label} onPress={action.onPress} testID={`${testID}-action`}
            style={({ focused }: PressState) => [styles.action, desktop ? styles.actionDesktop : null, focused ? focusRing : null]}>
            <Text style={styles.actionText}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </M2Card>
  );
}

export interface M2ProductCardProps {
  /** Decoration only: a listing's art follows its kind, category and name, never the person looking (Rule L). */
  art: { icon: SkIconName; hue: ServiceHue };
  /** "13% off", drawn on the art. */
  off?: string;
  /** A small line over the name (the maker). */
  eyebrow?: string;
  name: string;
  pack: string;
  /** Short lines under the pack: "Prescription needed" (attention), "40 available" (meta), "Provider booking" (positive). */
  notes?: readonly { text: string; tone: 'attention' | 'positive' | 'meta' }[];
  price: string;
  /** The MRP, struck through, when the price is below it. */
  mrp?: string;
  /** A line under the art saying it is a drawing, not the real pack. */
  artNote?: string;
  /** Opens the listing. The card is one link, named by its text on the web (`cardLabel`). */
  onOpen: () => void;
  /** Spoken name of the card on native (name, pack, price). */
  label: string;
  /** The one action under the card (Add, Book a slot). Omitted: no action is drawn. */
  action?: { label: string; spoken: string; onPress: () => void; disabled?: boolean; tone?: 'outline' | 'positive' };
  /** A last small line (what kind of listing it is). */
  footnote?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function M2ProductCard({ art, off, eyebrow, name, pack, notes = [], price, mrp, artNote, onOpen, label, action, footnote, style, testID }: M2ProductCardProps) {
  const hue = SERVICE_HUES[art.hue];
  const tone = (t: 'attention' | 'positive' | 'meta') => (t === 'attention' ? styles.noteAttention : t === 'positive' ? styles.notePositive : m2Text.meta);
  return (
    <View style={[styles.product, style]} testID={testID}>
      <LiftCard label={label} onPress={onOpen} fill testID={testID ? `${testID}-open` : undefined} style={[styles.productOpen, action ? styles.productOpenAction : null]}>
        <View style={[styles.productArt, { backgroundColor: hue.soft }]}>
          {off ? <View style={styles.off}><Text style={styles.offText}>{off}</Text></View> : null}
          <Icon name={art.icon} size={34} color={hue.ink} strokeWidth={1.8} />
          {artNote ? <Text style={[styles.artNote, { color: hue.ink }]}>{artNote}</Text> : null}
        </View>
        {eyebrow ? <Text numberOfLines={1} style={styles.productEyebrow}>{eyebrow}</Text> : null}
        <Text numberOfLines={2} style={m2Text.cardTitle}>{name}</Text>
        <Text numberOfLines={1} style={m2Text.meta}>{pack}</Text>
        {notes.map((note) => <Text key={note.text} style={tone(note.tone)}>{note.text}</Text>)}
        <View style={styles.priceRow}>
          <Text style={m2Text.price}>{price}</Text>
          {mrp ? <Text style={styles.mrp}>{mrp}</Text> : null}
        </View>
        {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
      </LiftCard>
      {action ? (
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={action.spoken} aria-label={action.spoken} onPress={action.onPress}
          disabled={action.disabled} accessibilityState={action.disabled ? { disabled: true } : undefined} testID={testID ? `${testID}-action` : undefined}
          style={({ focused }: PressState) => [styles.productAction, action.tone === 'positive' ? styles.productActionPositive : null,
            action.disabled ? styles.productActionOff : null, focused ? focusRing : null]}>
          <Text style={[styles.productActionText, action.tone === 'positive' ? styles.productActionTextPositive : null]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  product: { flexGrow: 1 },
  productOpen: { borderRadius: 22, padding: space.s12, gap: space.s6, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  productOpenAction: { paddingBottom: space.s12 + size.touchTarget + space.s4 },
  productArt: { height: 92, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  artNote: { position: 'absolute', bottom: space.s4, fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong) },
  off: { position: 'absolute', top: space.s8, left: space.s8, paddingHorizontal: space.s8, paddingVertical: space.s2, borderRadius: radius.full, backgroundColor: color.brandNavy },
  offText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  productEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 0.6, textTransform: 'uppercase', color: color.action },
  noteAttention: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.attention },
  notePositive: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.positive },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.s6, flexWrap: 'wrap' },
  mrp: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3, textDecorationLine: 'line-through' },
  footnote: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
  productAction: {
    position: 'absolute', left: space.s12, right: space.s12, bottom: space.s10, minHeight: size.touchTarget, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: color.action, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface,
  },
  productActionPositive: { borderColor: color.positiveBg, backgroundColor: color.positiveBg },
  productActionOff: { opacity: 0.5 },
  productActionText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  productActionTextPositive: { color: color.positive },
  row: { minHeight: size.touchTarget + space.s20, paddingHorizontal: space.s14, paddingVertical: space.s12, justifyContent: 'center' },
  card: { borderRadius: 22, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  rowWide: { paddingHorizontal: space.s16, paddingVertical: space.s14 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  words: { flex: 1, minWidth: 0, gap: space.s2 },
  empty: { alignItems: 'center', gap: space.s12, paddingHorizontal: space.s20, paddingVertical: space.s24 },
  emptyDesktop: { flexDirection: 'row', gap: space.s24, paddingHorizontal: space.s32 },
  emptyWords: { alignItems: 'center', gap: space.s8, maxWidth: 420 },
  emptyWordsDesktop: { alignItems: 'flex-start', flex: 1 },
  emptyTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center' },
  left: { textAlign: 'left' },
  centre: { textAlign: 'center' },
  action: {
    marginTop: space.s4, minHeight: size.control, paddingHorizontal: space.s20, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center',
    backgroundColor: color.action,
  },
  actionDesktop: { alignSelf: 'flex-start' },
  actionText: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
