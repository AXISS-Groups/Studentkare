import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, M2Pill, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { WebShellPreview } from './WebShellPreview';
import { BrandFooter } from './BrandFooter';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of WebDashboard — the web
 * counterpart of M2Insights/M2Home, inside the real `StudentWebShell`
 * (sidebar/top-nav), not a hand-drawn header. Content from
 * design/screens/briefs/WebDashboard.md (Tier 2). Tier-1 personal values
 * bracketed, same caution as the phone previews. Not wired, not replacing
 * anything. See NOTES.md.
 */
export function WebDashboardPreview(): React.ReactElement {
  return (
    <WebShellPreview route="home">
      <View style={styles.body}>
        <Text style={styles.h1}>Welcome back, [Student name]</Text>
        <View style={styles.grid3}>
          <M2Card style={styles.statCard}>
            <GlossTile icon="pill-2" hue="teal" size={40} />
            <Text style={styles.statTitle}>Medicines today</Text>
            <Text style={m2Text.meta}>[1] of [2] taken</Text>
          </M2Card>
          <M2Card style={styles.statCard}>
            <GlossTile icon="flask" hue="violet" size={40} />
            <Text style={styles.statTitle}>Latest report</Text>
            <M2Pill label="Needs a look" tone="attention" />
          </M2Card>
          <M2Card style={styles.statCard}>
            <GlossTile icon="shopping-bag" hue="indigo" size={40} />
            <Text style={styles.statTitle}>Active order</Text>
            <M2Pill label="Out for delivery" tone="action" />
          </M2Card>
        </View>

        <View style={styles.row2}>
          <M2Card style={styles.wideCard}>
            <Text style={styles.sectionTitle}>Health vault</Text>
            <Text style={m2Text.meta}>[3] documents · last added 14 Oct 2026</Text>
            <View style={styles.actionRow}>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel="Open vault" onPress={noop} style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}>
                <Icon name="shield" size={14} color={color.action} /><Text style={styles.outlineBtnText}>Open vault</Text>
              </Pressable>
            </View>
          </M2Card>
          <M2Card style={styles.wideCard}>
            <Text style={styles.sectionTitle}>Emergency card</Text>
            <Text style={m2Text.meta}>Blood group and contacts, ready to show on a locked screen</Text>
            <View style={styles.actionRow}>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel="View card" onPress={noop} style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}>
                <Icon name="heart-plus" size={14} color={color.action} /><Text style={styles.outlineBtnText}>View card</Text>
              </Pressable>
            </View>
          </M2Card>
        </View>

        <M2Note tone="info" icon="shield-check-2" title="Signed in on this device">
          You can sign out of this browser any time from Sign-in & security.
        </M2Note>
        <BrandFooter />
      </View>
    </WebShellPreview>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.s24, gap: space.s20, maxWidth: 920 },
  h1: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  grid3: { flexDirection: 'row', gap: space.s16 },
  statCard: { flex: 1, gap: space.s6, alignItems: 'flex-start' },
  statTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  row2: { flexDirection: 'row', gap: space.s16 },
  wideCard: { flex: 1, gap: space.s6 },
  sectionTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  actionRow: { flexDirection: 'row', marginTop: space.s4 },
  outlineBtn: { flexDirection: 'row', gap: space.s6, height: 36, paddingHorizontal: space.s14, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action },
});
