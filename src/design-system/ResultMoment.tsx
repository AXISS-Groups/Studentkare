import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { Glyph, Icon, Illustration } from './icons';
import type { SkGlyphName, SkIconName, SkIllustrationName } from './icons';
import { usePulse, useReducedMotion } from './motion';
import { color, focusRing, font, fontWeight, motion, radius, shadow, shadowStyle, size, space, webOnly } from './theme';

/**
 * Result moment (DESIGN.md §4 "Result moment": success, failure, pending; canvas
 * boards StatusMoments, PaymentResult, ResultLabBooked — "one card, three moods").
 *
 * "Never celebrate the body" (DESIGN.md §2.2): success, and with it the
 * confetti, exists only for commerce and bookings, and the type makes that the
 * caller's explicit claim. A health result, vital or diagnosis must use
 * `pending` or a Note — there is deliberately no `context` that would allow it.
 *
 * Copy always comes from the caller so it can be localised; nothing here
 * invents text. Web and native share this file (react-native-web).
 */
export type ResultMoment =
  | { kind: 'success'; context: 'order' | 'booking' | 'payment' }
  | { kind: 'failure' }
  | { kind: 'pending' };

export type ResultKind = ResultMoment['kind'];

const MARK: Record<ResultKind, SkIllustrationName> = {
  success: 'illustration-result-success',
  failure: 'illustration-result-failure',
  pending: 'illustration-result-pending',
};

/** The wash behind the mark and the title ink, by mood. Status colours keep their role (DESIGN.md §3). */
const TONE: Record<ResultKind, { wash: string; title: string }> = {
  success: { wash: color.positiveBg, title: color.text },
  failure: { wash: color.dangerBg, title: color.danger },
  pending: { wash: color.attentionBg, title: color.text },
};

// Placed around the mark and clear of the title, aria-hidden. Only drawn for a success (a booking or
// a purchase) and never under reduced motion.
const CONFETTI: { name: SkGlyphName; left: `${number}%`; top: number }[] = [
  { name: 'confetti-arc', left: '8%', top: 18 }, { name: 'confetti-arc-2', left: '20%', top: 64 },
  { name: 'confetti-arc-3', left: '30%', top: 8 }, { name: 'confetti-arc-4', left: '70%', top: 12 },
  { name: 'confetti-arc-5', left: '82%', top: 58 }, { name: 'confetti-arc-6', left: '90%', top: 22 },
  { name: 'confetti-arc-7', left: '12%', top: 96 }, { name: 'confetti-wedge', left: '28%', top: 52 },
  { name: 'confetti-wedge-2', left: '72%', top: 66 }, { name: 'confetti-wedge-3', left: '86%', top: 128 },
  { name: 'confetti-wedge-4', left: '4%', top: 74 }, { name: 'confetti-zigzag', left: '24%', top: 30 },
  { name: 'confetti-zigzag-2', left: '64%', top: 44 }, { name: 'confetti-zigzag-3', left: '88%', top: 96 },
  { name: 'confetti-zigzag-4', left: '62%', top: 0 }, { name: 'confetti-zigzag-5', left: '6%', top: 132 },
];

const useNativeDriver = Platform.OS !== 'web';
const MARK_SIZE = 72;
const WASH_HEIGHT = 260;
const SHAKE_PX = [-10, 9, -6, 4, -2, 0];

type Pressed = { pressed: boolean; focused?: boolean };

export interface ResultAction {
  label: string;
  onPress: () => void;
  /** Drawn but not offered (e.g. a receipt that does not exist yet). Say why in `accessibilityLabel`. */
  disabled?: boolean;
  accessibilityLabel?: string;
  busy?: boolean;
  testID?: string;
}

/** One side of the "To / From" block. Empty lines are left out. */
export interface ResultParty {
  label: string;
  name: string;
  line?: string;
  /** References, codes and amounts (mono). */
  mono?: string;
}

export interface ResultMomentCardProps {
  moment: ResultMoment;
  title: string;
  /** The one line under the title: what happened and what happens next. */
  sub: string;
  /** "Copy & share" (copy icon) and "Receipt" (download icon). */
  share?: ResultAction;
  receipt?: ResultAction;
  /** The "To" and "From" parties, in that order. */
  parties?: ResultParty[];
  /** Folded detail rows behind "Show more details". */
  more?: { rows: { k: string; v: string }[]; showLabel: string; hideLabel: string };
  /** The one next step. A failure draws it as the danger button, as on the canvas. */
  primary: ResultAction;
  /** The text link under it (repeat icon): "Add to calendar", "Try another method", "Check status". */
  secondary?: ResultAction;
  testID?: string;
}

function LinkButton({ icon, action, iconAfter = false, flip = false, expanded }: {
  icon: SkIconName; action: ResultAction; iconAfter?: boolean; flip?: boolean; expanded?: boolean;
}) {
  const disabled = action.disabled === true;
  const glyph = (
    <View style={flip ? styles.flip : null}>
      <Icon name={icon} size={20} color={disabled ? color.text3 : color.action} />
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      accessibilityState={{ disabled, expanded }}
      aria-expanded={expanded}
      disabled={disabled}
      onPress={action.onPress}
      testID={action.testID}
      style={({ focused }: Pressed) => [styles.link, focused ? focusRing : null]}
    >
      {iconAfter ? null : glyph}
      <Text style={[styles.linkText, disabled ? styles.linkTextOff : null]}>{action.label}</Text>
      {iconAfter ? glyph : null}
    </Pressable>
  );
}

function Party({ party }: { party: ResultParty }) {
  return (
    <View style={styles.party}>
      <Text style={styles.partyLabel}>{party.label}</Text>
      <Text style={styles.partyName}>{party.name}</Text>
      {party.line ? <Text style={styles.partyLine}>{party.line}</Text> : null}
      {party.mono ? <Text style={styles.partyMono}>{party.mono}</Text> : null}
    </View>
  );
}

/**
 * The mark: badge-in for every mood, then a shake for a failure (canvas
 * "Failure + shake") or a slow pulse while pending. Reduced motion draws it
 * still, at its end state.
 */
function Mark({ kind }: { kind: ResultKind }) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const pulse = usePulse();

  useEffect(() => {
    if (reduced) {
      scale.setValue(1);
      shake.setValue(0);
      return;
    }
    const badgeIn = Animated.sequence([
      Animated.timing(scale, { toValue: 1.12, duration: motion.duration.base, easing: Easing.out(Easing.cubic), useNativeDriver }),
      Animated.timing(scale, { toValue: 1, duration: motion.duration.fast, easing: Easing.inOut(Easing.ease), useNativeDriver }),
    ]);
    const steps = kind === 'failure'
      ? [badgeIn, Animated.sequence(SHAKE_PX.map(px => Animated.timing(shake, {
        toValue: px, duration: motion.duration.fast / 2, easing: Easing.inOut(Easing.ease), useNativeDriver,
      })))]
      : [badgeIn];
    const anim = Animated.sequence(steps);
    anim.start();
    return () => anim.stop();
  }, [reduced, kind, scale, shake]);

  const opacity = kind === 'pending' ? pulse : 1;
  return (
    <Animated.View
      testID={`result-mark-${kind}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ opacity, transform: [{ scale }, { translateX: shake }] }}
    >
      <Illustration name={MARK[kind]} size={MARK_SIZE} />
    </Animated.View>
  );
}

/**
 * The card contents of a result moment: mark, title and line, the share and
 * receipt links, the To / From block with folded details, then one primary
 * step and an optional text link. Wrap it in `ResultMomentScreen` for the
 * phone layout on the canvas.
 */
export function ResultMomentCard({
  moment, title, sub, share, receipt, parties = [], more, primary, secondary, testID,
}: ResultMomentCardProps) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const kind = moment.kind;
  const tone = TONE[kind];
  const celebrate = kind === 'success' && !reduced;
  const rows = more?.rows.filter(r => r.k) ?? [];

  return (
    <View testID={testID} role={kind === 'failure' ? 'alert' : 'status'} accessibilityLiveRegion="polite" style={styles.body}>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.wash, { backgroundColor: tone.wash }, webOnly({ backgroundImage: `linear-gradient(180deg, ${tone.wash} 0%, ${color.surface} 100%)` })]} />
      {celebrate ? (
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.confetti}
          testID="result-confetti">
          {CONFETTI.map(c => (
            <View key={c.name} style={[styles.confettiPiece, { left: c.left, top: c.top }]}>
              <Glyph name={c.name} size={14} />
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.top}>
        <Mark kind={kind} />
        <Text accessibilityRole="header" style={[styles.title, { color: tone.title }]}>{title}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>

      {share || receipt ? (
        <View style={styles.actions}>
          {share ? <LinkButton icon="copy" action={share} /> : null}
          {receipt ? <LinkButton icon="download" action={receipt} /> : null}
        </View>
      ) : null}

      {parties.length > 0 || rows.length > 0 ? (
        <View style={styles.details}>
          {parties.map(p => <Party key={p.label} party={p} />)}
          {open && rows.length > 0 ? (
            <View style={styles.more} testID="result-more">
              {rows.map(m => (
                <View key={m.k} style={styles.moreRow}>
                  <Text style={styles.moreKey}>{m.k}</Text>
                  <Text style={styles.moreValue}>{m.v}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {more && rows.length > 0 ? (
            <LinkButton icon="chevron-down" iconAfter flip={open} expanded={open}
              action={{ label: open ? more.hideLabel : more.showLabel, onPress: () => setOpen(o => !o), testID: 'result-toggle-more' }} />
          ) : null}
        </View>
      ) : null}

      <View style={styles.ctas}>
        <Button label={primary.label} onPress={primary.onPress} accessibilityLabel={primary.accessibilityLabel}
          disabled={primary.disabled} busy={primary.busy} variant={kind === 'failure' ? 'danger' : 'primary'}
          size="cta" fullWidth testID={primary.testID} />
        {secondary ? <LinkButton icon="repeat" action={secondary} /> : null}
      </View>
    </View>
  );
}

export interface ResultMomentScreenProps {
  /** The hero title, e.g. "Payment" or "Lab tests". */
  title: string;
  backLabel: string;
  onBack: () => void;
  /** "Replay" plays the moment again. Omit to hide it. */
  replayLabel?: string;
  /** The card: a `ResultMomentCard`, or a Skeleton / ErrorState while the result loads. */
  children: React.ReactNode;
  testID?: string;
}

/**
 * The phone layout of a result moment: the navy hero with back and Replay,
 * and the white card rising over it. The same on web, where it is centred
 * and capped at the panel width.
 */
export function ResultMomentScreen({ title, backLabel, onBack, replayLabel, children, testID }: ResultMomentScreenProps) {
  const [replay, setReplay] = useState(0);
  return (
    <View style={styles.screen} testID={testID}>
      <View style={styles.hero}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={onBack}
          testID="result-back"
          style={({ focused }: Pressed) => [styles.heroBack, focused ? focusRing : null]}
        >
          <Icon name="arrow-left" size={18} color={color.onHero} />
        </Pressable>
        <Text style={styles.heroTitle}>{title}</Text>
        {replayLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={replayLabel}
            onPress={() => setReplay(n => n + 1)}
            testID="result-replay"
            style={({ focused }: Pressed) => [styles.replay, focused ? focusRing : null]}
          >
            <Icon name="rotate-ccw" size={16} color={color.action} />
            <Text style={styles.replayText}>{replayLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.cardWrap}>
        <View style={styles.card} key={replay}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: space.s12, backgroundColor: color.heroBg,
    paddingHorizontal: space.s16, paddingTop: space.s16, paddingBottom: space.s40 + space.s32,
  },
  heroBack: {
    width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
    backgroundColor: color.onHeroVeil,
  },
  heroTitle: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  replay: {
    minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s8, paddingHorizontal: space.s10,
    borderRadius: radius.md, backgroundColor: color.surface, borderWidth: 1, borderColor: color.rule,
  },
  replayText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  cardWrap: { marginTop: -(space.s40 + space.s16), paddingHorizontal: space.s12, paddingBottom: space.s24, alignItems: 'center' },
  card: {
    width: '100%', maxWidth: size.panelMax, borderRadius: radius.sheet, backgroundColor: color.surface, padding: space.s20,
    overflow: 'hidden', ...shadowStyle(shadow.float),
  },
  body: { gap: space.s20 },
  wash: { position: 'absolute', left: -space.s20, right: -space.s20, top: -space.s20, height: WASH_HEIGHT, opacity: Platform.OS === 'web' ? 1 : 0.6 },
  confetti: { position: 'absolute', left: 0, right: 0, top: 0, height: 160 },
  confettiPiece: { position: 'absolute' },
  top: { alignItems: 'center', gap: space.s14, paddingTop: space.s8 },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), textAlign: 'center' },
  sub: {
    fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body,
    fontWeight: fontWeight(font.weight.strong), color: color.text2, textAlign: 'center', maxWidth: 560,
  },
  actions: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: space.s20 },
  link: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s8, paddingHorizontal: space.s4 },
  linkText: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  linkTextOff: { color: color.text3 },
  details: { borderWidth: 1, borderColor: color.rule, borderRadius: radius.xl, padding: space.s16, gap: space.s16, backgroundColor: color.surface },
  party: { gap: space.s4 },
  partyLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  partyName: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  partyLine: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  partyMono: { fontFamily: font.family.mono, fontSize: font.size.caption, color: color.text3 },
  more: { gap: space.s10, paddingTop: space.s14, borderTopWidth: 1, borderTopColor: color.rule, borderStyle: 'dashed' },
  moreRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.s16 },
  moreKey: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  moreValue: {
    flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text, textAlign: 'right',
  },
  flip: { transform: [{ rotate: '180deg' }] },
  ctas: { gap: space.s14 },
});
