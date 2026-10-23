import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon, Icon3d } from '../icons';
import type { SkIcon3dName, SkIconName } from '../icons';
import { Button } from '../Button';
import { usePhoneHeaderSlot } from '../navigation/BoardHeader';
import { canvasImages } from '../art/canvasAssets';
import type { CanvasImageName } from '../art/canvasAssets';
import { color, focusRing, font, fontWeight, radius, size, space } from '../theme';

/**
 * The phone boards' shared pieces (canvas page 2: YourCare, Appointments,
 * Notifications, MoreHub, HelpCentre and the rest): eyebrow sections, white
 * row cards with a tinted icon tile, status pills, the navy hero card, the
 * lock privacy note, choice cards and the first-time / offline states.
 *
 * React Native, so one source draws the web phone frame and the Expo app.
 * Icons are always named by the screen (props), never here, so each screen's
 * icon check counts only what that screen draws.
 */

export type BoardTone = 'action' | 'positive' | 'attention' | 'danger' | 'neutral';

const TONE: Record<BoardTone, { bg: string; ink: string }> = {
  action: { bg: color.surface3, ink: color.action },
  positive: { bg: color.positiveBg, ink: color.positive },
  attention: { bg: color.attentionBg, ink: color.attention },
  danger: { bg: color.dangerBg, ink: color.danger },
  neutral: { bg: color.neutralBg, ink: color.text2 },
};

export function toneColors(tone: BoardTone): { bg: string; ink: string } {
  return TONE[tone];
}

type PressState = { pressed: boolean; focused?: boolean; hovered?: boolean };

/**
 * The page body. In the web phone frame the frame scrolls and already has the
 * gutter; drawn on its own (Expo) it is a scroll view with the phone gutter.
 */
export function BoardScreen({ children, testID, footer }: { children: React.ReactNode; testID?: string; footer?: React.ReactNode }): React.ReactElement {
  const inFrame = usePhoneHeaderSlot() !== null;
  if (inFrame) {
    return (
      <View testID={testID} style={styles.frameBody}>
        {children}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    );
  }
  return (
    <View style={styles.screen}>
      <ScrollView testID={testID} style={styles.screen} contentContainerStyle={styles.ownBody}>{children}</ScrollView>
      {footer ? <View style={[styles.footer, styles.ownFooter]}>{footer}</View> : null}
    </View>
  );
}

/** An eyebrow-labelled block (canvas: "NEEDS YOU", "UPCOMING", "ACCOUNT"), with an optional link on the right. */
export function BoardSection({ label, link, children, testID }: { label: string; link?: { label: string; onPress: () => void }; children?: React.ReactNode; testID?: string }): React.ReactElement {
  return (
    <View style={styles.section} testID={testID}>
      <View style={styles.sectionHead}>
        <Text accessibilityRole="header" style={styles.eyebrow}>{label}</Text>
        {link ? <TextLink label={link.label} onPress={link.onPress} /> : null}
      </View>
      {children}
    </View>
  );
}

/** A white rounded card. `selected` draws the board's indigo outline. */
export function BoardCard({ children, selected = false, tone, style, testID }: { children: React.ReactNode; selected?: boolean; tone?: BoardTone; style?: object; testID?: string }): React.ReactElement {
  return (
    <View testID={testID} style={[styles.card, tone ? { backgroundColor: TONE[tone].bg, borderColor: TONE[tone].bg } : null, selected ? styles.cardSelected : null, style]}>
      {children}
    </View>
  );
}

/** The rounded square holding a line icon (canvas: 38–40 px, tinted by meaning). */
export function IconTile({ icon, tone = 'action', box = 40 }: { icon: SkIconName; tone?: BoardTone; box?: number }): React.ReactElement {
  return (
    <View style={[styles.tile, { width: box, height: box, backgroundColor: TONE[tone].bg }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Icon name={icon} size={Math.round(box / 2)} color={TONE[tone].ink} />
    </View>
  );
}

/** A small status pill ("DUE", "Paid", "In review"). Colour is never the only cue: the label says it. */
export function Pill({ label, tone = 'action', dot = false, testID }: { label: string; tone?: BoardTone; dot?: boolean; testID?: string }): React.ReactElement {
  const c = TONE[tone];
  return (
    <View testID={testID} style={[styles.pill, { backgroundColor: c.bg }]}>
      {dot ? <View style={[styles.pillDot, { backgroundColor: c.ink }]} /> : null}
      <Text style={[styles.pillText, { color: c.ink }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/** A text button in the action colour, with a 44 px hit area (canvas: "Book", "New claim", "Change"). */
export function TextLink({ label, onPress, tone = 'action', accessibilityLabel, testID }: { label: string; onPress: () => void; tone?: 'action' | 'danger'; accessibilityLabel?: string; testID?: string }): React.ReactElement {
  return (
    <Pressable
      testID={testID}
      role="link"
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ focused }: PressState) => [styles.textLink, focused ? focusRing : null]}
    >
      <Text style={[styles.textLinkLabel, { color: tone === 'danger' ? color.danger : color.action }]}>{label}</Text>
    </Pressable>
  );
}

export interface BoardRowProps {
  title: string;
  meta?: string;
  icon?: SkIconName;
  tone?: BoardTone;
  /** A pill, a value or a chevron on the right. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  /** Spoken instead of title + meta. */
  accessibilityLabel?: string;
  /** A row inside a grouped card (no own border). */
  grouped?: boolean;
  /** Draws the row's divider (grouped rows, all but the last). */
  divider?: boolean;
  unread?: boolean;
  /** Extra lines under the meta (a time, a source). */
  children?: React.ReactNode;
  testID?: string;
}

/** One board row: icon tile, title and meta, and something on the right. The whole row is the button. */
export function BoardRow({ title, meta, icon, tone = 'action', trailing, onPress, accessibilityLabel, grouped = false, divider = false, unread = false, children, testID }: BoardRowProps): React.ReactElement {
  const body = (
    <>
      {icon ? <IconTile icon={icon} tone={tone} /> : null}
      <View style={styles.rowWords}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle}>{title}</Text>
          {unread ? <View style={styles.unreadDot} /> : null}
        </View>
        {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
        {children}
      </View>
      {trailing}
    </>
  );
  const look = [styles.row, grouped ? styles.rowGrouped : styles.rowCard, unread ? styles.rowUnread : null, divider ? styles.rowDivider : null];
  if (!onPress) return <View testID={testID} style={look}>{body}</View>;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, meta].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ focused }: PressState) => [...look, focused ? focusRing : null]}
    >
      {body}
    </Pressable>
  );
}

/** The navy card at the top of a board (Your Care "This week", the cover card, the ID card). */
export function HeroCard({ children, testID }: { children: React.ReactNode; testID?: string }): React.ReactElement {
  return <View testID={testID} style={styles.hero}>{children}</View>;
}

/** A plain-language privacy promise with its icon (canvas: the lock note at the foot of a board). */
export function PrivacyNote({ icon, children, testID }: { icon: SkIconName; children: string; testID?: string }): React.ReactElement {
  return (
    <View style={styles.note} testID={testID}>
      <Icon name={icon} size={size.navIcon} color={color.action} />
      <Text style={styles.noteText}>{children}</Text>
    </View>
  );
}

/** A selectable option card (canvas: radio cards on Hostel visit, Leaving campus, slot pickers). */
export function ChoiceCard({ title, meta, tail, selected, onPress, radio = false, testID }: { title: string; meta?: string; tail?: string; selected: boolean; onPress: () => void; radio?: boolean; testID?: string }): React.ReactElement {
  return (
    <Pressable
      testID={testID}
      role="radio"
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      accessibilityLabel={[title, meta, tail].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ focused }: PressState) => [styles.choice, selected ? styles.choiceOn : null, focused ? focusRing : null]}
    >
      {radio ? <View style={[styles.radio, selected ? styles.radioOn : null]} /> : null}
      <View style={styles.rowWords}>
        <Text style={styles.rowTitle}>{title}</Text>
        {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
      </View>
      {tail ? <Text style={[styles.choiceTail, selected ? { color: color.action } : null]}>{tail}</Text> : null}
    </Pressable>
  );
}

/** A canvas raster (design/assets, copied to src/assets), drawn by React Native on both platforms. */
export function BoardArt({ name, width, height, alt = '' }: { name: CanvasImageName; width: number; height: number; alt?: string }): React.ReactElement {
  const src: unknown = canvasImages[name];
  const source = typeof src === 'number' ? src : { uri: typeof src === 'string' ? src : '' };
  return (
    <Image
      source={source}
      style={{ width, height }}
      resizeMode="contain"
      accessible={Boolean(alt)}
      accessibilityLabel={alt || undefined}
      accessibilityElementsHidden={!alt}
      importantForAccessibility={alt ? 'yes' : 'no-hide-descendants'}
    />
  );
}

export interface BoardAction { label: string; onPress: () => void; testID?: string }

/** First time on a board (canvas "First time" preview): the 3D tile, what will appear here, and a way forward. */
export function FirstTime({ tile, title, body, actions, testID }: { tile: SkIcon3dName; title: string; body: string; actions: readonly BoardAction[]; testID?: string }): React.ReactElement {
  return (
    <View testID={testID} role="status" style={styles.first}>
      <Icon3d name={tile} size={72} />
      <Text accessibilityRole="header" style={styles.firstTitle}>{title}</Text>
      <Text style={styles.firstBody}>{body}</Text>
      <View style={styles.firstActions}>
        {actions.map((a, i) => (
          <Button key={a.label} label={a.label} onPress={a.onPress} testID={a.testID} variant={i === 0 ? 'primary' : 'secondary'} fullWidth />
        ))}
      </View>
    </View>
  );
}

export interface OfflineLink { label: string; onPress: () => void }

/**
 * Offline on a board (canvas "Offline" preview): what is shown, that booking
 * and ordering need a connection, a retry, and what still works without
 * internet. Help is never behind the network (DESIGN.md §2.4).
 */
export function OfflinePanel({ title, body, retryLabel, onRetry, stillWorksLabel, tickIcon, links, testID }: {
  title: string; body: string; retryLabel: string; onRetry: () => void;
  stillWorksLabel: string; tickIcon: SkIconName; links: readonly OfflineLink[]; testID?: string;
}): React.ReactElement {
  return (
    <View testID={testID} style={styles.offlineWrap}>
      <View role="status" accessibilityLiveRegion="polite" style={styles.offline}>
        <View style={styles.offlineDot} />
        <View style={styles.rowWords}>
          <Text style={styles.offlineTitle}>{title}</Text>
          <Text style={styles.offlineBody}>{body}</Text>
        </View>
        <TextLink label={retryLabel} onPress={onRetry} />
      </View>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>{stillWorksLabel}</Text>
        {links.map((link) => (
          <Pressable key={link.label} accessibilityRole="link" accessibilityLabel={link.label} onPress={link.onPress}
            style={({ focused }: PressState) => [styles.stillRow, focused ? focusRing : null]}>
            <Icon name={tickIcon} size={size.navIcon - space.s4} color={color.positive} />
            <Text style={styles.stillText}>{link.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** A thin progress bar (canvas: cover used, consults used). Data, not a score: always labelled beside it. */
export function Meter({ fraction, tone = 'action', onHero = false }: { fraction: number; tone?: BoardTone; onHero?: boolean }): React.ReactElement {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  return (
    <View style={[styles.meter, onHero ? { backgroundColor: color.onHeroTrack } : null]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.meterFill, { width: `${clamped * 100}%`, backgroundColor: onHero ? color.onHeroPositive : TONE[tone].ink }]} />
    </View>
  );
}

export const boardText = StyleSheet.create({
  heroEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.onHeroLabel },
  heroTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  heroBig: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  heroBody: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.onHero2, lineHeight: font.size.bodySm * font.lineHeight.body },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, lineHeight: font.size.bodySm * font.lineHeight.body },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3, lineHeight: font.size.caption * font.lineHeight.body },
  strong: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
  mono: { fontFamily: font.family.mono, fontSize: font.size.bodySm, color: color.clinicalValue },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.text3 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  frameBody: { gap: space.s20, paddingTop: space.s8, paddingBottom: space.s24 },
  ownBody: { paddingHorizontal: space.gutterPhone, paddingTop: space.s8, paddingBottom: space.s32, gap: space.s20 },
  footer: { gap: space.s10 },
  ownFooter: { paddingHorizontal: space.gutterPhone, paddingVertical: space.s12, backgroundColor: color.canvas },
  section: { gap: space.s10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s8, minHeight: space.s24 },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.text3 },
  card: { backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, padding: space.s16, gap: space.s10 },
  cardSelected: { borderColor: color.selectedRule, borderWidth: 1.5 },
  tile: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: space.s6, borderRadius: radius.full, paddingHorizontal: space.s10, paddingVertical: space.s4, flexShrink: 0, alignSelf: 'flex-start' },
  pillDot: { width: space.s6, height: space.s6, borderRadius: radius.full },
  pillText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  textLink: { minHeight: size.touchTarget, minWidth: size.touchTarget, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.s4, borderRadius: radius.sm },
  textLinkLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy) },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: size.touchTarget },
  rowCard: { backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, padding: space.s14 },
  rowGrouped: { paddingVertical: space.s14, paddingHorizontal: space.s16 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  rowUnread: { borderColor: color.selectedRule, borderWidth: 1.5 },
  rowWords: { flex: 1, minWidth: 0, gap: space.s2 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: space.s6 },
  rowTitle: { flexShrink: 1, fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
  rowMeta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, lineHeight: font.size.bodySm * font.lineHeight.body },
  unreadDot: { width: space.s8, height: space.s8, borderRadius: radius.full, backgroundColor: color.action },
  hero: { backgroundColor: color.heroBg, borderRadius: radius.sheet, padding: space.s20, gap: space.s14, overflow: 'hidden' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12, backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, padding: space.s16 },
  noteText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, lineHeight: font.size.bodySm * font.lineHeight.body },
  choice: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: size.control, padding: space.s14, borderRadius: radius.xl - space.s4, borderWidth: 1, borderColor: color.rule, backgroundColor: color.surface },
  choiceOn: { borderColor: color.action, borderWidth: 1.5, backgroundColor: color.surface3 },
  choiceTail: { fontFamily: font.family.mono, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  radio: { width: space.s20, height: space.s20, borderRadius: radius.full, borderWidth: 2, borderColor: color.ruleStrong },
  radioOn: { borderWidth: space.s6, borderColor: color.action },
  first: { alignItems: 'center', gap: space.s12, backgroundColor: color.surface, borderRadius: radius.sheet, borderWidth: 1, borderColor: color.ruleSoft, padding: space.s24 },
  firstTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center' },
  firstBody: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, textAlign: 'center', lineHeight: font.size.bodySm * font.lineHeight.body },
  firstActions: { alignSelf: 'stretch', gap: space.s10, marginTop: space.s4 },
  offlineWrap: { gap: space.s12 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: space.s10, backgroundColor: color.attentionBg, borderRadius: radius.xl, padding: space.s14 },
  offlineDot: { width: space.s8, height: space.s8, borderRadius: radius.full, backgroundColor: color.attention },
  offlineTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.attention },
  offlineBody: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.attention, lineHeight: font.size.caption * font.lineHeight.body },
  stillRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8, minHeight: size.touchTarget },
  stillText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  meter: { height: space.s6, borderRadius: radius.full, backgroundColor: color.surface3, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: radius.full },
});
