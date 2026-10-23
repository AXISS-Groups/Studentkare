import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { AnimatedIcon, AnimatedIllustration, Icon } from './icons';
import type { SkAnimatedName, SkIconName } from './icons';
import { skAnimated } from './icons/generated/skAnimatedData';
import { usePulse, useReducedMotion } from './motion';
import { color, font, fontWeight, motion, radius, space } from './theme';

/**
 * The full-screen and inline states every screen owes (DESIGN.md §6): loading
 * (skeleton), empty (message + one next step), error (calm copy, retry,
 * reference code) and offline. Copy always comes from the caller so it can be
 * localised; nothing here invents text.
 */

export interface SkeletonProps {
  /** Widths of each placeholder line, matching the real layout it stands in for. */
  lines: Array<number | `${number}%`>;
  /** Spoken once, e.g. "Loading your records". */
  label: string;
}

/** Skeleton for content whose shape is already known. Pulses unless motion is reduced. */
export function Skeleton({ lines, label }: SkeletonProps) {
  const opacity = usePulse();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} aria-busy style={styles.skeleton}>
      {lines.map((width, i) => (
        <Animated.View key={i} style={[styles.skeletonLine, { width, opacity }]} />
      ))}
    </View>
  );
}

export interface EmptyStateProps {
  title: string;
  body: string;
  /** The one next step. Omit only when there is genuinely nothing to do. */
  action?: { label: string; onPress: () => void };
  /**
   * Optional animated art above the title (design/icons/animated): an `anim-*` icon draws on a 3D
   * tile; a `scene-*` or `loop-chart-*` draws as a small illustration. Decorative; plays once
   * (scenes loop) and rests under reduced motion.
   */
  animation?: SkAnimatedName;
}

/** The art an empty state can carry: icons on a 3D tile, scenes and chart loops as small illustrations. */
export function EmptyArt({ name }: { name: SkAnimatedName }) {
  return skAnimated[name].kind === 'icon'
    ? <AnimatedIcon name={name} variant="3d" />
    : <AnimatedIllustration name={name} size="sm" />;
}

export function EmptyState({ title, body, action, animation }: EmptyStateProps) {
  return (
    <View style={styles.state}>
      {animation ? <EmptyArt name={animation} /> : null}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.body}>{body}</Text>
      {action ? <Button label={action.label} onPress={action.onPress} variant="secondary" /> : null}
    </View>
  );
}

export interface ErrorStateProps {
  title: string;
  /** What went wrong, whose side it's on, what to do (DESIGN.md §7). */
  body: string;
  retryLabel: string;
  onRetry: () => void;
  /** A support reference. Never a stack trace, token or identifier (AGENTS.md guardrail 9). */
  reference?: { label: string; code: string };
  busy?: boolean;
}

export function ErrorState({ title, body, retryLabel, onRetry, reference, busy = false }: ErrorStateProps) {
  return (
    <View accessibilityRole="alert" style={styles.state}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.body}>{body}</Text>
      <Button label={retryLabel} onPress={onRetry} busy={busy} />
      {reference ? (
        <Text style={styles.reference}>
          {reference.label} <Text style={styles.mono}>{reference.code}</Text>
        </Text>
      ) : null}
    </View>
  );
}

export interface OfflineBannerProps {
  /** e.g. "You're offline. Showing what was saved on this device." */
  message: string;
}

/** Offline banner. Read-only reassurance; it never offers an action that needs the network. */
export function OfflineBanner({ message }: OfflineBannerProps) {
  return (
    <View role="status" accessibilityLiveRegion="polite" style={styles.offline}>
      <Text style={styles.offlineText}>{message}</Text>
    </View>
  );
}

/**
 * Whether the browser says it is online. Web listens to `online` / `offline`;
 * native has no network module bundled, so it reports online and a failed
 * request shows the error state instead. This only chooses which state to
 * show: it never gates an action (an action that needs the network still
 * fails closed on its own).
 */
export function useOnline(): boolean {
  const read = () => (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : true);
  const [online, setOnline] = useState<boolean>(read);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/**
 * Full-screen states (canvas board StateScreens, SK-015): "a state screen
 * earns the whole viewport only when the person has to decide something.
 * Every one gives a way forward — none is a dead end." Each names what
 * happened, what it cost, and what to do next.
 *
 * - success: what was granted and for how long (calm: no confetti — that is
 *   only for commerce, see ResultMoment).
 * - failure: says nothing was charged; carries a support reference.
 * - empty: two routes out, so it reads as new rather than broken.
 * - offline: names what still works.
 * - loading: the skeleton, in the same frame, while the shape is known.
 */
export type StateKind = 'success' | 'failure' | 'empty' | 'offline';

export interface StateAction {
  label: string;
  onPress: () => void;
  busy?: boolean;
  testID?: string;
}

export type StateScreenProps =
  | { kind: 'loading'; label: string; lines?: SkeletonProps['lines']; testID?: string }
  | {
      kind: StateKind;
      /** The small status chip above the mark, e.g. "Offline". */
      chip?: string;
      title: string;
      body: string;
      primary: StateAction;
      /** The second way forward (a text button). */
      secondary?: StateAction;
      /** A support reference. Never a stack trace, token or identifier (AGENTS.md guardrail 9). */
      reference?: { label: string; code: string };
      /** Overrides the board's icon for the kind (check, x, file, wifi-off). */
      icon?: SkIconName;
      testID?: string;
    };

/**
 * Each kind's board icon, and the animation that draws the same thing (played once, on arrival).
 * A failure has none: it never animates like a success (board Feedback).
 */
const STATE_LOOK: Record<StateKind, { icon: SkIconName; anim?: SkAnimatedName; bg: string; ink: string }> = {
  success: { icon: 'check', anim: 'anim-check', bg: color.positiveBg, ink: color.positive },
  failure: { icon: 'x', bg: color.dangerBg, ink: color.danger },
  empty: { icon: 'file', anim: 'anim-file', bg: color.surface3, ink: color.action },
  offline: { icon: 'wifi-off', anim: 'anim-wifi-off', bg: color.attentionBg, ink: color.attention },
};

const STATE_MARK = 84;
const STATE_HALO = 104;
const STATE_ICON = 40;
const FLOAT_PX = -7;

/** The mark's motion: the success halo breathes, the empty mark floats. Still under reduced motion. */
function StateMark({ kind, icon }: { kind: StateKind; icon: SkIconName }) {
  const reduced = useReducedMotion();
  const halo = usePulse();
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced || kind !== 'empty') {
      float.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: FLOAT_PX, duration: motion.duration.sheet * 4, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(float, { toValue: 0, duration: motion.duration.sheet * 4, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduced, kind, float]);
  const look = STATE_LOOK[kind];
  return (
    <View style={styles.markWrap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID={`state-mark-${kind}`}>
      {kind === 'success' ? <Animated.View style={[styles.halo, { backgroundColor: look.ink, opacity: Animated.multiply(halo, 0.16) }]} /> : null}
      <Animated.View style={[styles.mark, { backgroundColor: look.bg, transform: [{ translateY: float }] }]}>
        {look.anim && icon === look.icon ? (
          <AnimatedIcon name={look.anim} size="mark" color={look.ink} background={look.bg}
            poster={<Icon name={icon} size={STATE_ICON} color={look.ink} strokeWidth={2.4} />} />
        ) : <Icon name={icon} size={STATE_ICON} color={look.ink} strokeWidth={2.4} />}
      </Animated.View>
    </View>
  );
}

/** One full-screen state, drawn to the StateScreens board. Web and native share it. */
export function StateScreen(props: StateScreenProps) {
  if (props.kind === 'loading') {
    return (
      <View style={styles.frame} testID={props.testID}>
        <Skeleton label={props.label} lines={props.lines ?? ['40%', '100%', '90%', '100%', '70%']} />
      </View>
    );
  }
  const { kind, chip, title, body, primary, secondary, reference, icon, testID } = props;
  const look = STATE_LOOK[kind];
  return (
    <View
      testID={testID}
      role={kind === 'failure' ? 'alert' : 'status'}
      accessibilityLiveRegion="polite"
      style={styles.frame}
    >
      {chip ? (
        <View style={[styles.chip, { backgroundColor: look.bg }]}>
          <Text style={[styles.chipText, { color: kind === 'empty' ? color.action : look.ink }]}>{chip}</Text>
        </View>
      ) : null}
      <StateMark kind={kind} icon={icon ?? look.icon} />
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={styles.frameTitle}>{title}</Text>
        <Text style={styles.frameBody}>{body}</Text>
      </View>
      <View style={styles.frameActions}>
        <Button label={primary.label} onPress={primary.onPress} busy={primary.busy} testID={primary.testID}
          variant={kind === 'failure' ? 'danger' : 'primary'} fullWidth />
        {secondary ? (
          <Button label={secondary.label} onPress={secondary.onPress} busy={secondary.busy} testID={secondary.testID} variant="ghost" fullWidth />
        ) : null}
        {reference ? (
          <Text style={[styles.reference, styles.frameReference]}>
            {reference.label} <Text style={styles.mono}>{reference.code}</Text>
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'stretch', alignItems: 'center', gap: space.s20, backgroundColor: color.surface,
    borderWidth: 1, borderColor: color.ruleSoft, borderRadius: radius.sheet,
    paddingTop: space.s32, paddingHorizontal: space.s24, paddingBottom: space.s24,
  },
  chip: { alignSelf: 'flex-start', borderRadius: radius.full, paddingVertical: space.s4, paddingHorizontal: space.s10 },
  chipText: {
    fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy),
    letterSpacing: 1, textTransform: 'uppercase',
  },
  markWrap: { width: STATE_HALO, height: STATE_HALO, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: STATE_HALO, height: STATE_HALO, borderRadius: radius.full },
  mark: { width: STATE_MARK, height: STATE_MARK, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  copy: { alignItems: 'center', gap: space.s8, maxWidth: 420 },
  frameTitle: {
    fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center',
  },
  frameBody: {
    fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body,
    fontWeight: fontWeight(font.weight.regular), color: color.text2, textAlign: 'center',
  },
  frameActions: { alignSelf: 'stretch', gap: space.s10 },
  frameReference: { textAlign: 'center' },
  skeleton: { gap: space.s10 },
  skeletonLine: { height: 10, borderRadius: radius.sm, backgroundColor: color.surface3 },
  state: {
    alignItems: 'center',
    gap: space.s12,
    paddingVertical: space.s32,
    paddingHorizontal: space.gutterPhone,
  },
  title: {
    fontFamily: font.family.sans,
    fontSize: font.size.title,
    fontWeight: fontWeight(font.weight.heavy),
    color: color.text,
    textAlign: 'center',
  },
  body: {
    fontFamily: font.family.sans,
    fontSize: font.size.body,
    lineHeight: font.size.body * font.lineHeight.body,
    color: color.text2,
    textAlign: 'center',
    maxWidth: 420,
  },
  reference: {
    fontFamily: font.family.sans,
    fontSize: font.size.caption,
    color: color.text3,
  },
  mono: { fontFamily: font.family.mono, color: color.clinicalValue },
  offline: {
    backgroundColor: color.attentionBg,
    paddingVertical: space.s10,
    paddingHorizontal: space.gutterPhone,
  },
  offlineText: {
    fontFamily: font.family.sans,
    fontSize: font.size.bodySm,
    fontWeight: fontWeight(font.weight.strong),
    color: color.attention,
  },
});
