import React, { useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Icon } from '../icons';
import type { SkIconName } from '../icons';
import { useReducedMotion } from '../motion';
import { color, focusRing, font, fontWeight, motion, radius, shadow, shadowStyle, size, space, webOnly } from '../theme';
import { useAmbientMotion, useLoop } from './m2Motion';
import { SERVICE_HUES } from './servicePalette';
import type { ServiceHue } from './servicePalette';
import { isWide, m2Gutter, useM2Layout } from './m2Layout';
import type { M2Layout } from './m2Layout';
import { M2HeaderSos } from './m2Sos';

/**
 * Small pieces every Mobile 2.0 board shares (canvas page 9): the round
 * header buttons, the SOS pill, the white search field, the lifting card, the
 * soft concern tiles, section heads and the "not available yet" tile. React
 * Native primitives, so the web phone frame and Expo draw the same thing.
 */

export type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

/** Hover and press lift a card 2 px (canvas .sk-card), unless motion is reduced. */
export function useLift(): (state: PressState) => StyleProp<ViewStyle> {
  const reduced = useReducedMotion();
  return ({ pressed, hovered, focused }: PressState) => [
    !reduced && (hovered || pressed) ? styles.lifted : null,
    focused ? focusRing : null,
  ];
}

/** Web-only handlers React Native's View types do not carry (focus moving inside a group). */
export function webHandlers(handlers: Record<string, () => void>): Record<string, () => void> {
  return Platform.OS === 'web' ? handlers : {};
}

/** Web-only attributes React Native's types do not carry (aria-current, aria-roledescription). */
export function webAttrs(attrs: Record<string, string | undefined>): Record<string, string | undefined> {
  return Platform.OS === 'web' ? attrs : {};
}

export const m2Text = StyleSheet.create({
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.text3 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, lineHeight: font.size.title * font.lineHeight.tight + space.s2, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  section: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.3, color: color.text },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.tight + space.s2, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 0, color: color.text },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.text3 },
  body: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  link: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  price: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text, fontVariant: ['tabular-nums'] },
  tileLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption + space.s2, fontWeight: fontWeight(font.weight.strong), color: color.text, textAlign: 'center' },
});

/** A heading (role header) whose text keeps its own colour on the web's global heading rule. */
export function M2Heading({ children, style, level = 2, testID }: { children: React.ReactNode; style: StyleProp<TextStyle>; level?: 1 | 2; testID?: string }) {
  return (
    <View accessibilityRole="header" {...webAttrs({ 'aria-level': String(level) })} testID={testID}>
      <Text style={style}>{children}</Text>
    </View>
  );
}

/**
 * The label for a tappable card whose visible text already names it. On the web
 * the browser names it from that text (joining its lines), so voice-control
 * users can say what they see (WCAG 2.5.3, axe label-content-name-mismatch,
 * live-run audit #10); a native screen reader gets `label`, where the card's
 * lines are not read as one.
 */
export function cardLabel(label: string): { accessibilityLabel?: string; 'aria-label'?: string } {
  return Platform.OS === 'web' ? {} : { accessibilityLabel: label, 'aria-label': label };
}

/** A tappable card: lifts on hover and press, focus ring, ≥ 44 px. Named as `cardLabel` says. */
export function LiftCard({ label, onPress, role = 'link', style, children, testID, disabled = false, fill = false }: {
  label: string; onPress?: () => void; role?: 'link' | 'button'; style?: StyleProp<ViewStyle>; children: React.ReactNode; testID?: string; disabled?: boolean;
  /** Grows to its grid cell's height (`M2Grid`), so cards in a row line up. */
  fill?: boolean;
}) {
  const lift = useLift();
  return (
    <Pressable
      role={role}
      accessibilityRole={role}
      {...cardLabel(label)}
      accessibilityState={disabled ? { disabled: true } : undefined}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={(state: PressState) => [styles.liftBase, fill ? styles.fill : null, style, lift(state)]}
    >
      {children}
    </Pressable>
  );
}

/** The round white header button (back, cart), with an optional count badge. */
export function RoundButton({ icon, label, onPress, badge, onHero = false, testID }: {
  icon: SkIconName; label: string; onPress: () => void; badge?: number; onHero?: boolean; testID?: string;
}) {
  return (
    <Pressable role="button" accessibilityRole="button" accessibilityLabel={label} aria-label={label} onPress={onPress} testID={testID}
      style={({ focused }: PressState) => [styles.round, onHero ? styles.roundOnHero : null, focused ? focusRing : null]}>
      <Icon name={icon} size={size.navIcon} color={onHero ? color.onHero : color.text} />
      {badge ? (
        <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** SOS, always one tap away (DESIGN.md §2.4): the red pill with a soft pulse that stops under reduced motion. */
export function SosButton({ label, spoken, onPress, testID = 'm2-sos' }: { label: string; spoken: string; onPress: () => void; testID?: string }) {
  const ambient = useAmbientMotion();
  const pulse = useLoop(ambient, motion.duration.ambient / 2);
  const ring = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
  };
  return (
    <View style={styles.sosWrap}>
      {ambient ? <Animated.View pointerEvents="none" style={[styles.sosRing, ring]} /> : null}
      <Pressable role="button" accessibilityRole="button" accessibilityLabel={spoken} aria-label={spoken} onPress={onPress} testID={testID}
        style={({ focused }: PressState) => [styles.sos, focused ? focusRing : null]}>
        <Icon name="shield-alert" size={16} color={color.onDangerFill} strokeWidth={2.4} />
        <Text style={styles.sosText}>{label}</Text>
      </Pressable>
    </View>
  );
}

/**
 * A store board's header: the round back button, a small line over the title,
 * and its own controls. Wider than a phone it sits in the page's own gutter, with a
 * larger title. `onBack` is optional so a navigation root draws no back
 * button. SOS is at the end of every header (founder decision, 23 Oct 2026):
 * by default it opens the shell's SOS (`M2SosProvider`); `sos` gives it its own
 * handler, and `sos={false}` leaves it out only where the board draws SOS
 * somewhere else in the same header.
 */
export function M2Header({ backLabel, onBack, eyebrow, title, trailing, sos, testID = 'm2-header' }: {
  backLabel?: string; onBack?: () => void; eyebrow?: string; title: string; trailing?: React.ReactNode;
  sos?: { label: string; spoken: string; onPress: () => void } | false;
  testID?: string;
}) {
  const layout = useM2Layout();
  return (
    // Wider, the header sits in a page that already has its gutter (the web shell's column).
    <View style={[styles.header, { paddingHorizontal: layout === 'phone' ? m2Gutter(layout) : 0 }]} testID={testID}>
      {onBack && backLabel ? <RoundButton icon="arrow-left" label={backLabel} onPress={onBack} testID={`${testID}-back`} /> : null}
      <View style={styles.grow}>
        {eyebrow ? <Text numberOfLines={1} style={styles.headerEyebrow}>{eyebrow}</Text> : null}
        <M2Heading level={1} style={[styles.headerTitle, layout === 'desktop' ? styles.headerTitleDesktop : null]}>{title}</M2Heading>
      </View>
      {trailing}
      {sos === false ? null : sos ? <SosButton label={sos.label} spoken={sos.spoken} onPress={sos.onPress} testID={`${testID}-sos`} /> : <M2HeaderSos testID={`${testID}-sos`} />}
    </View>
  );
}

export interface M2SearchFieldProps {
  placeholder: string;
  /** Accessible name. */
  label: string;
  /** Tapping opens search elsewhere: the field is a button. */
  onPress?: () => void;
  value?: string;
  onChangeText?: (value: string) => void;
  onSubmit?: () => void;
  /** Voice search, shown as not available (no speech input is connected). */
  micUnavailable?: string;
  testID?: string;
}

/** The white search field with the magnifier (and the microphone, unavailable). */
export function M2SearchField({ placeholder, label, onPress, value = '', onChangeText, onSubmit, micUnavailable, testID = 'm2-search' }: M2SearchFieldProps) {
  const [inputFocused, setInputFocused] = useState(false);
  // Wider than a phone: the taller primary-control height and body-size text.
  const wide = isWide(useM2Layout()) ? styles.searchWide : null;
  const wideText = wide ? styles.searchTextWide : null;
  const body = (
    <>
      <Icon name="search" size={19} color={color.text3} strokeWidth={2.2} />
      {onPress ? (
        <Text numberOfLines={1} style={[styles.searchText, wideText, styles.searchPlaceholder]}>{placeholder}</Text>
      ) : (
        <TextInput
          testID={`${testID}-input`}
          accessibilityLabel={label}
          aria-label={label}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={color.text3}
          returnKeyType="search"
          autoCorrect={false}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          style={[styles.searchText, wideText, webOnly({ outlineStyle: 'none' as const })]}
        />
      )}
      {micUnavailable ? (
        <View role="img" accessibilityLabel={micUnavailable} aria-label={micUnavailable} style={styles.mic} testID={`${testID}-mic`}>
          <Icon name="mic" size={18} color={color.text3} strokeWidth={2.2} />
        </View>
      ) : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable testID={testID} {...webAttrs({ role: 'search' })} accessibilityRole="search" accessibilityLabel={label} aria-label={label} onPress={onPress}
        style={({ focused }: PressState) => [styles.search, wide, focused ? focusRing : null]}>
        {body}
      </Pressable>
    );
  }
  return <View testID={testID} {...webAttrs({ role: 'search' })} accessibilityRole="search" style={[styles.search, wide, inputFocused ? focusRing : null]}>{body}</View>;
}

/** A section's heading row, with an optional link on the right ("See all"). */
export function M2SectionHead({ title, action, testID }: { title: string; action?: { label: string; spoken?: string; onPress: () => void }; testID?: string }) {
  const desktop = useM2Layout() === 'desktop';
  return (
    <View style={styles.sectionHead} testID={testID}>
      <M2Heading style={[m2Text.section, desktop ? styles.sectionDesktop : null]}>{title}</M2Heading>
      {action ? (
        <Pressable role="link" accessibilityRole="link" accessibilityLabel={action.spoken ?? action.label} aria-label={action.spoken ?? action.label} onPress={action.onPress}
          style={({ focused }: PressState) => [styles.sectionLink, focused ? focusRing : null]}>
          <Text style={m2Text.link}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** The rounded soft tile holding an icon in its hue's ink (concern / category tiles, row icons). */
export function SoftIcon({ icon, hue, tile = 58, iconSize = 24, neutral = false }: { icon: SkIconName; hue: ServiceHue; tile?: number; iconSize?: number; neutral?: boolean }) {
  const h = SERVICE_HUES[hue];
  return (
    <View style={[styles.softIcon, { width: tile, height: tile, borderRadius: tile / 2.9, backgroundColor: neutral ? color.neutralBg : h.soft }]}>
      <Icon name={icon} size={iconSize} color={neutral ? color.text2 : h.ink} />
    </View>
  );
}

export interface SoftTileItem {
  key: string;
  label: string;
  icon: SkIconName;
  hue: ServiceHue;
  neutral?: boolean;
  onPress: () => void;
}

/** Tiles a row per layout: four on a phone (as on the boards), six on a tablet, eight on a desktop. */
export const SOFT_TILE_COLUMNS: Readonly<Record<M2Layout, number>> = { phone: 4, tablet: 6, desktop: 8 };

const PERCENT = 100;

/** Soft tiles with their names under them (Shop by concern, Categories): four a row on a phone, more wider. */
export function SoftTileGrid({ items, columns, testID }: { items: readonly SoftTileItem[]; columns?: number; testID?: string }) {
  const lift = useLift();
  const layout = useM2Layout();
  const width = `${PERCENT / Math.max(1, columns ?? SOFT_TILE_COLUMNS[layout])}%` as const;
  return (
    <View style={styles.tileGrid} testID={testID}>
      {items.map((item) => (
        <Pressable key={item.key} role="link" accessibilityRole="link" accessibilityLabel={item.label} aria-label={item.label} onPress={item.onPress}
          testID={`${testID ?? 'tile'}-${item.key}`} style={(state: PressState) => [styles.tileCell, { width }, lift(state)]}>
          <SoftIcon icon={item.icon} hue={item.hue} neutral={item.neutral} />
          <Text style={m2Text.tileLabel}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** A white card (no action). */
export function M2Card({ children, style, fill = false, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; fill?: boolean; testID?: string }) {
  return <View style={[styles.card, fill ? styles.fill : null, style]} testID={testID}>{children}</View>;
}

/**
 * A feature the board draws that has no backend yet: the tile stays, muted,
 * with "not available yet" (or "soon"), and does nothing when pressed — it is
 * not a button (rule 2 of the M2 build brief; DESIGN.md §2.7).
 */
export function NotYetTile({ icon, title, note, style, centred = false, fill = false, testID }: { icon: SkIconName; title: string; note: string; style?: StyleProp<ViewStyle>; centred?: boolean; fill?: boolean; testID?: string }) {
  const wide = isWide(useM2Layout());
  return (
    <View style={[styles.notYet, wide ? styles.notYetWide : null, fill ? styles.fill : null, style, centred ? styles.notYetCentred : null]} testID={testID} accessible accessibilityLabel={`${title}, ${note}`} aria-label={`${title}, ${note}`}
      {...webAttrs({ role: 'group' })}>
      <Icon name={icon} size={22} color={color.text2} strokeWidth={2.1} />
      <Text style={[styles.notYetTitle, centred ? styles.textCentre : null]}>{title}</Text>
      <Text style={[styles.notYetNote, centred ? styles.textCentre : null]}>{note}</Text>
    </View>
  );
}

/** Space under a Mobile 2.0 board so its last card clears the pill nav. */
export const M2_BOTTOM_SPACE = space.s32;

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  liftBase: webOnly({ transitionProperty: 'transform, box-shadow', transitionDuration: `${motion.duration.fast}ms`, transitionTimingFunction: motion.easing.standard }),
  lifted: { transform: [{ translateY: -space.s2 }], ...shadowStyle(shadow.float) },
  round: {
    width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
    backgroundColor: color.surface, ...shadowStyle(shadow.hairline),
  },
  roundOnHero: { backgroundColor: color.onHeroVeil, ...(Platform.OS === 'web' ? { boxShadow: 'none' } : { shadowOpacity: 0, elevation: 0 }) },
  badge: {
    position: 'absolute', top: space.s2, right: space.s2, minWidth: 18, height: 18, paddingHorizontal: space.s4, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center', backgroundColor: color.action, borderWidth: 2, borderColor: color.canvas,
  },
  badgeText: { fontFamily: font.family.sans, fontSize: 10, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  sosWrap: { position: 'relative' },
  sosRing: { ...StyleSheet.absoluteFillObject, borderRadius: radius.full, backgroundColor: color.dangerFill },
  sos: {
    minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: space.s6,
    backgroundColor: color.dangerFill,
  },
  sosText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onDangerFill },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.gutterPhone, paddingTop: space.s16 },
  headerEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.text3 },
  headerTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.5, color: color.text },
  headerTitleDesktop: { fontSize: font.size.heading },
  fill: { flexGrow: 1 },
  search: {
    flexGrow: 1, flexShrink: 1, minHeight: 52, borderRadius: 18, paddingHorizontal: space.s14, flexDirection: 'row', alignItems: 'center', gap: space.s10,
    backgroundColor: color.surface, ...shadowStyle(shadow.card),
  },
  searchWide: { minHeight: size.controlLg },
  searchTextWide: { fontSize: font.size.body },
  searchText: { flex: 1, minWidth: 0, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text, paddingVertical: space.s8 },
  searchPlaceholder: { color: color.text3 },
  mic: { width: size.touchTarget, height: size.touchTarget, alignItems: 'center', justifyContent: 'center', marginRight: -space.s10 },
  sectionDesktop: { fontSize: font.size.title },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s12, marginBottom: space.s12 },
  sectionLink: { minHeight: size.touchTarget, justifyContent: 'center' },
  softIcon: { alignItems: 'center', justifyContent: 'center' },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.s14 },
  tileCell: { alignItems: 'center', gap: space.s6, paddingHorizontal: space.s2, minHeight: size.touchTarget, borderRadius: radius.lg },
  card: { borderRadius: 22, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  notYet: { borderRadius: radius.xl, padding: space.s12, gap: space.s6, backgroundColor: color.neutralBg },
  notYetWide: { padding: space.s16 },
  notYetCentred: { alignItems: 'center' },
  textCentre: { textAlign: 'center' },
  notYetTitle: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption + space.s4, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  notYetNote: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
});
