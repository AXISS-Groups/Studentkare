import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from './icons';
import { color, font, fontWeight, radius, space } from './theme';

/**
 * Source and verified badges (DESIGN.md §4). The result moment itself lives in
 * ./ResultMoment (canvas StatusMoments).
 */

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
    <View style={[styles.badge, styles.badgeRow, { backgroundColor: color.positiveBg }]}>
      <Icon name="check" size={12} color={color.positive} />
      <Text style={[styles.badgeText, { color: color.positive }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: radius.full, paddingVertical: space.s4, paddingHorizontal: space.s10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  badgeText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
});
