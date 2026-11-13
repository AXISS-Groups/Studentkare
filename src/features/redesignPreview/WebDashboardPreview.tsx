import React from 'react';
import { useT } from '@/i18n';
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
  const t = useT();
  return (
    <WebShellPreview route="home">
      <View style={styles.body}>
        <Text style={styles.h1}>{t('preview.welcomeBackStudentName')}</Text>
        <View style={styles.grid3}>
          <M2Card style={styles.statCard}>
            <GlossTile icon="pill-2" hue="teal" size={40} />
            <Text style={styles.statTitle}>{t('m2r.meds.title')}</Text>
            <Text style={m2Text.meta}>{t('preview.1Of2Taken')}</Text>
          </M2Card>
          <M2Card style={styles.statCard}>
            <GlossTile icon="flask" hue="violet" size={40} />
            <Text style={styles.statTitle}>{t('preview.latestReport288')}</Text>
            <M2Pill label="Needs a look" tone="attention" />
          </M2Card>
          <M2Card style={styles.statCard}>
            <GlossTile icon="shopping-bag" hue="indigo" size={40} />
            <Text style={styles.statTitle}>{t('preview.activeOrder')}</Text>
            <M2Pill label="Out for delivery" tone="action" />
          </M2Card>
        </View>

        <View style={styles.row2}>
          <M2Card style={styles.wideCard}>
            <Text style={styles.sectionTitle}>{t('landing.consult.footer.vault')}</Text>
            <Text style={m2Text.meta}>{t('preview.3DocumentsLastAdded14Oct2026')}</Text>
            <View style={styles.actionRow}>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('sw.dash.openVault')} onPress={noop} style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}>
                <Icon name="shield" size={14} color={color.action} /><Text style={styles.outlineBtnText}>{t('sw.dash.openVault')}</Text>
              </Pressable>
            </View>
          </M2Card>
          <M2Card style={styles.wideCard}>
            <Text style={styles.sectionTitle}>{t('ice.eyebrow')}</Text>
            <Text style={m2Text.meta}>{t('preview.bloodGroupAndContactsReadyToShowOn')}</Text>
            <View style={styles.actionRow}>
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.viewCard')} onPress={noop} style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}>
                <Icon name="heart-plus" size={14} color={color.action} /><Text style={styles.outlineBtnText}>{t('preview.viewCard')}</Text>
              </Pressable>
            </View>
          </M2Card>
        </View>

        <M2Note tone="info" icon="shield-check-2" title={t('preview.signedInOnThisDevice')}>{t('preview.youCanSignOutOfThisBrowserAny')}</M2Note>
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
