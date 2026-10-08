import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { usePulse } from './motion';
import { color, font, fontWeight, radius, space } from './theme';

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
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <View style={styles.state}>
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

const styles = StyleSheet.create({
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
