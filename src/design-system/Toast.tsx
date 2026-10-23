import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { AnimatedIcon, Icon } from './icons';
import type { SkAnimatedName, SkIconName } from './icons';
import { color, focusRing, font, fontWeight, motion, radius, shadow, shadowStyle, size, space } from './theme';
import { Rise, useReducedMotion } from './motion';

export type ToastTone = 'neutral' | 'success' | 'error' | 'attention' | 'info';

interface ToneStyle { icon: SkIconName | null; anim?: SkAnimatedName; tile: string; ink: string; bar: string; holds: boolean }

/**
 * Board Feedback: success ticks, an error crosses, a warning holds, info
 * informs. Errors and warnings never auto-dismiss: anything a person must act
 * on stays until they act ("a 4-second toast is not consent").
 */
const tones: Record<ToastTone, ToneStyle> = {
  neutral: { icon: null, tile: color.surface3, ink: color.action, bar: color.action, holds: false },
  success: { icon: 'check', anim: 'anim-check', tile: color.positiveBg, ink: color.positive, bar: color.positive, holds: false },
  error: { icon: 'x', tile: color.dangerBg, ink: color.danger, bar: color.dangerFill, holds: true },
  attention: { icon: 'alert-triangle-4', anim: 'anim-alert-triangle', tile: color.attentionBg, ink: color.attention, bar: color.attention, holds: true },
  info: { icon: 'info-4', tile: color.surface3, ink: color.action, bar: color.action, holds: false },
};

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastProps {
  /** The line that says what happened. With `title`, it is the detail under it. */
  message: string;
  /** Short headline, e.g. "Order placed". */
  title?: string;
  tone?: ToastTone;
  /** One verb: Track, Retry, Undo. */
  action?: ToastAction;
  /** Called after `durationMs` for tones that dismiss themselves. Errors and warnings stay. */
  onDone?: () => void;
  /** Shows a close button; the way out of a toast that holds. */
  onDismiss?: () => void;
  durationMs?: number;
  testID?: string;
}

/**
 * Toast (DESIGN.md §4: neutral, success, error, wraps on phone; board
 * Feedback). Announced as a status, an error as an alert. It confirms an
 * action; it never carries the only copy of something the user must act on.
 * A confirming toast shows its 4 s timer as a bar along the bottom edge.
 */
export function Toast({ message, title, tone = 'neutral', action, onDone, onDismiss, durationMs = motion.duration.toast, testID }: ToastProps) {
  const t = useT();
  const c = tones[tone];
  const reduced = useReducedMotion();
  const timer = useRef(new Animated.Value(1)).current;
  const autoDismiss = Boolean(onDone) && !c.holds;

  useEffect(() => {
    if (!onDone || c.holds) return undefined;
    const handle = setTimeout(onDone, durationMs);
    return () => clearTimeout(handle);
  }, [onDone, durationMs, c.holds, message]);

  useEffect(() => {
    timer.setValue(1);
    if (!autoDismiss || reduced) return undefined;
    const run = Animated.timing(timer, { toValue: 0, duration: durationMs, easing: Easing.linear, useNativeDriver: false });
    run.start();
    return () => run.stop();
  }, [autoDismiss, reduced, durationMs, timer, message]);

  const isAlert = tone === 'error';
  const body = (
    <View
      testID={testID}
      role={isAlert ? 'alert' : 'status'}
      accessibilityLiveRegion={isAlert ? 'assertive' : 'polite'}
      style={[styles.toast, shadowStyle(shadow.card)]}
    >
      <View style={styles.row}>
        {c.icon ? (
          <View style={[styles.tile, { backgroundColor: c.tile }]}>
            {c.anim ? (
              <AnimatedIcon name={c.anim} size="inline" color={c.ink} background={c.tile}
                poster={<Icon name={c.icon} size={16} strokeWidth={2.6} color={c.ink} />} />
            ) : <Icon name={c.icon} size={16} strokeWidth={2.6} color={c.ink} />}
          </View>
        ) : null}
        <View style={styles.text}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <Text style={title ? styles.body : styles.title}>{message}</Text>
        </View>
        {action ? (
          <Pressable
            accessibilityRole="button"
            onPress={action.onPress}
            style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.action, focused ? focusRing : null]}
          >
            <Text style={[styles.actionText, { color: c.ink }]}>{action.label}</Text>
          </Pressable>
        ) : null}
        {onDismiss ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ds.toast.dismiss')}
            onPress={onDismiss}
            style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.action, focused ? focusRing : null]}
          >
            <Icon name="x" size={14} strokeWidth={2.4} color={color.text2} />
          </Pressable>
        ) : null}
      </View>
      {autoDismiss && !reduced ? (
        // The bar and the gap after it always sum to 1, so it shrinks from the right on web and native alike.
        <View aria-hidden style={styles.track}>
          <Animated.View style={{ flex: timer, backgroundColor: c.bar }} />
          <Animated.View style={{ flex: timer.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }} />
        </View>
      ) : null}
    </View>
  );
  // Success rises and settles; a failure does not animate like a success.
  return tone === 'success' ? <Rise>{body}</Rise> : body;
}

const styles = StyleSheet.create({
  toast: {
    position: 'relative', overflow: 'hidden', alignSelf: 'center', width: '100%', maxWidth: 560,
    borderRadius: 16, backgroundColor: color.surface,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12, paddingVertical: space.s14, paddingHorizontal: space.s16 },
  tile: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text: { flex: 1, gap: 3 },
  title: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * 1.45, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  action: { minHeight: size.touchTarget, minWidth: size.touchTarget, marginVertical: -space.s12, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, flexShrink: 0 },
  actionText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy) },
  track: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, flexDirection: 'row' },
});
