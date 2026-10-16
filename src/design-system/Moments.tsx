import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, fontWeight, radius, space } from './theme';

/**
 * Result moment (DESIGN.md §4: success, failure, pending).
 *
 * "Never celebrate the body" (DESIGN.md §2.2): success styling is only allowed
 * for commerce and bookings, and the type makes that the caller's explicit
 * claim. A health result, vital or diagnosis must use `pending` or a Note —
 * there is deliberately no `context` that would allow it.
 */
export type ResultMoment =
  | { kind: 'success'; context: 'order' | 'booking' | 'payment' }
  | { kind: 'failure' }
  | { kind: 'pending' };

const look = {
  success: { bg: color.positiveBg, fg: color.positive, mark: '✓' },
  failure: { bg: color.dangerBg, fg: color.danger, mark: '!' },
  pending: { bg: color.surface3, fg: color.info, mark: '…' },
} as const;

export interface ResultMomentProps {
  moment: ResultMoment;
  title: string;
  body: string;
  children?: React.ReactNode;
  testID?: string;
}

export function ResultMomentView({ moment, title, body, children, testID }: ResultMomentProps) {
  const l = look[moment.kind];
  return (
    <View testID={testID} role={moment.kind === 'failure' ? 'alert' : 'status'} style={styles.box}>
      <View style={[styles.mark, { backgroundColor: l.bg }]} accessibilityElementsHidden importantForAccessibility="no">
        <Text style={[styles.markText, { color: l.fg }]}>{l.mark}</Text>
      </View>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {children}
    </View>
  );
}

export type BadgeSource = 'typed-by-you' | 'device' | 'provider' | 'clinician';

const sourceLabel: Record<BadgeSource, string> = {
  'typed-by-you': 'Typed by you',
  device: 'From your device',
  provider: 'From the provider',
  clinician: 'From your clinician',
};

/** Source badge (DESIGN.md §4): where a value came from, so typed-in numbers aren't mistaken for lab results. */
export function SourceBadge({ source }: { source: BadgeSource }) {
  return (
    <View style={[styles.badge, { backgroundColor: color.surface3 }]}>
      <Text style={[styles.badgeText, { color: color.info }]}>{sourceLabel[source]}</Text>
    </View>
  );
}

/**
 * Verified badge (DESIGN.md §4). Renders only for a server-reported
 * verification — pass the status string the API returned, never a boolean the
 * client computed. Anything other than 'VERIFIED' renders nothing.
 */
export function VerifiedBadge({ serverStatus, label = 'Verified' }: { serverStatus: string | null | undefined; label?: string }) {
  if (serverStatus !== 'VERIFIED') return null;
  return (
    <View style={[styles.badge, { backgroundColor: color.positiveBg }]}>
      <Text style={[styles.badgeText, { color: color.positive }]}>{`✓ ${label}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: space.s12, paddingVertical: space.s32 },
  mark: { width: 64, height: 64, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  markText: { fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy) },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center' },
  body: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2, textAlign: 'center', maxWidth: 420 },
  badge: { alignSelf: 'flex-start', borderRadius: radius.full, paddingVertical: space.s4, paddingHorizontal: space.s10 },
  badgeText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
});
