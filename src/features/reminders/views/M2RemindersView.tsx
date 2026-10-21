import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { ErrorState, OfflineBanner, Rise, Skeleton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { Gradient, M2Card, M2Heading, M2_NAV_CLEARANCE, RoundButton, SoftIcon, SosButton, heroStops, m2Text, useOwnPhoneChrome, webAttrs } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { say, useT } from '@/i18n';
import type { MedsTodayViewModel } from '../viewmodel/MedsTodayViewModel';
import type { MedicineRemindersViewModel } from '../viewmodel/MedicineRemindersViewModel';
import { DoseRow, MedicineReminderChips, PillButton } from './ReminderParts';

/**
 * Mobile 2.0 My health · Medicines today and reminders (M2Reminders, Tier 1;
 * the M2 form of the Medications board under WP-07, approved 2026-10-21;
 * brief design/screens/briefs/M2Reminders.md).
 *
 * Names and doses come only from GET /meds/today (the student's entries and
 * prescriptions). Taken / skipped / undo as the server allows. No score, no
 * streak; nobody is told about a missed dose. Reminders live on the phone
 * (Expo); on the web the screen says so instead of offering them.
 */
export interface M2RemindersLinks {
  back: () => void;
  sos: () => void;
  water: () => void;
  uploadPrescription: () => void;
  /** The existing add-a-medicine form (web only; the app has none). */
  addMedicine?: () => void;
  openSettings?: () => void;
}

export const M2RemindersView = observer(function M2RemindersView({ vm, reminders, online, links }: {
  vm: MedsTodayViewModel; reminders?: MedicineRemindersViewModel; online: boolean; links: M2RemindersLinks;
}) {
  const t = useT();
  useOwnPhoneChrome();
  const left = vm.left;
  // Empty: the card below says so; the hero keeps only its note.
  const headline = !vm.today.data || vm.plans.length === 0 ? ''
    : left === null ? t('m2r.meds.noCount') : left === 0 ? t('m2r.meds.allLogged') : left === 1 ? t('m2r.meds.leftOne') : t('m2r.meds.left', { count: left });

  const header = (
    <View style={styles.header} testID="m2-rem-header">
      <RoundButton icon="arrow-left" label={t('m2r.meds.back')} onPress={links.back} testID="m2-rem-back" />
      <View style={styles.grow}>
        <Text numberOfLines={1} style={styles.eyebrow}>{t('m2r.meds.eyebrow')}</Text>
        <M2Heading level={1} style={styles.title}>{t('m2r.meds.title')}</M2Heading>
      </View>
      <SosButton label={t('m2.sos')} spoken={t('m2.sosSpoken')} onPress={links.sos} testID="m2-rem-sos" />
    </View>
  );

  let body: React.ReactNode;
  if (vm.today.phase === 'error') {
    body = (
      <View style={styles.gutter}>
        <ErrorState title={t('m2r.meds.failedTitle')} body={t('m2h.cardFailed')} retryLabel={t('common.tryAgain')} onRetry={vm.load} />
      </View>
    );
  } else if (!vm.today.data) {
    body = <View style={styles.gutter}><Skeleton label={t('m2r.meds.loading')} lines={['60%', '100%', '100%']} /></View>;
  } else if (vm.plans.length === 0) {
    body = (
      <Rise index={1} style={styles.gutter}>
        <M2Card style={styles.empty} testID="m2-rem-empty">
          <SoftIcon icon="pill-3" hue="teal" tile={52} iconSize={24} />
          <M2Heading style={m2Text.section}>{t('m2r.meds.emptyTitle')}</M2Heading>
          <Text style={m2Text.body}>{t('m2r.meds.emptyBody')}</Text>
          <View style={styles.row}>
            <PillButton icons={['doc-upload']} label={t('m2r.meds.uploadRx')} spoken={t('m2r.meds.uploadRx')} onPress={links.uploadPrescription} testID="m2-rem-upload" />
            {links.addMedicine ? (
              <PillButton icons={['plus']} label={t('m2r.meds.addMedicine')} spoken={t('m2r.meds.addMedicine')} tone="soft" onPress={links.addMedicine} testID="m2-rem-add" />
            ) : null}
          </View>
        </M2Card>
      </Rise>
    );
  } else {
    body = (
      <Rise index={1} style={styles.gutter}>
        <M2Card style={styles.list} testID="m2-rem-list">
          {vm.plans.map((plan) => (
            <DoseRow key={plan.planId} vm={vm} plan={plan} testID={`m2-rem-dose-${plan.planId}`}>
              {reminders ? <MedicineReminderChips vm={reminders} plan={plan} testID={`m2-rem-remind-${plan.planId}`} /> : null}
            </DoseRow>
          ))}
          {vm.status ? <Text aria-live="polite" accessibilityLiveRegion="polite" style={styles.status}>{say(t, vm.status)}</Text> : null}
        </M2Card>
        {reminders?.permissionDenied ? (
          <View style={styles.denied} accessibilityRole="alert" testID="m2-rem-denied">
            <Text style={styles.deniedText}>{t('reminders.denied')}</Text>
            {links.openSettings ? <PillButton icons={['bell']} label={t('reminders.openSettings')} spoken={t('reminders.openSettings')} tone="soft" onPress={links.openSettings} testID="m2-rem-settings" /> : null}
          </View>
        ) : null}
        {reminders?.failed ? <Text role="alert" style={styles.error} testID="m2-rem-remind-failed">{t('reminders.failed')}</Text> : null}
        {reminders?.loadFailed ? <Text role="alert" style={styles.error}>{t('m2r.meds.remindLoadFailed')}</Text> : null}
        <View style={styles.remindNote} testID={reminders ? 'm2-rem-lock-note' : 'm2-rem-web-note'}>
          <Icon name={reminders ? 'bell' : 'bell-off'} size={16} color={color.text2} />
          <Text style={[m2Text.meta, styles.grow]}>{reminders ? t('reminders.lockScreen') : t('m2r.meds.remindWeb')}</Text>
        </View>
      </Rise>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-reminders">
      {header}
      <Rise style={styles.gutter}>
        <Gradient colors={heroStops('teal')} angle={150} style={styles.hero} testID="m2-rem-hero">
          <Text style={styles.heroEyebrow}>{t('m2r.meds.heroEyebrow')}</Text>
          {headline ? <Text style={styles.heroLine} aria-live="polite" testID="m2-rem-headline">{headline}</Text> : null}
          {!vm.today.data && vm.today.phase === 'loading' ? <Skeleton label={t('m2r.meds.loading')} lines={['70%']} /> : null}
          <Text style={styles.heroNote}>{t('m2r.meds.noScore')}</Text>
        </Gradient>
      </Rise>
      {!online ? <View style={styles.gutter}><OfflineBanner message={t('m2r.meds.offlineAction')} /></View> : null}
      {body}
      <Rise index={2} style={styles.gutter}>
        <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2r.meds.waterLink')} aria-label={t('m2r.meds.waterLink')} onPress={links.water}
          testID="m2-rem-water" style={({ focused }: PressState) => [styles.link, focused ? focusRing : null]}>
          <View style={styles.linkTile}><Icon name="glass" size={18} color={color.serviceSkyInk} strokeWidth={2.1} /></View>
          <View style={styles.grow}>
            <Text style={m2Text.cardTitle}>{t('m2r.meds.waterLink')}</Text>
            <Text style={m2Text.meta}>{t('m2r.meds.waterLinkNote')}</Text>
          </View>
          <Icon name="chevron-right" size={16} color={color.text3} strokeWidth={2.4} />
        </Pressable>
      </Rise>
      <View {...webAttrs({ 'aria-hidden': 'true' })} style={styles.spacer} />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center' },
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  gutter: { paddingHorizontal: space.gutterPhone },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.gutterPhone, paddingTop: space.s16 },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.5, color: color.text },
  hero: { borderRadius: 28, padding: space.s20, gap: space.s8 },
  heroEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.onHero },
  heroLine: { fontFamily: font.family.sans, fontSize: font.size.title, lineHeight: 26, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  heroNote: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: 17, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
  empty: { padding: space.s20, borderRadius: radius.xl, gap: space.s10, alignItems: 'flex-start' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  list: { paddingHorizontal: space.s16, paddingBottom: space.s4, borderRadius: radius.xl },
  status: { paddingBottom: space.s12, fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  denied: { marginTop: space.s12, gap: space.s8, padding: space.s12, borderRadius: radius.md, backgroundColor: color.attentionBg },
  deniedText: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: 17, fontWeight: fontWeight(font.weight.strong), color: color.attention },
  error: { marginTop: space.s8, fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.danger },
  remindNote: { marginTop: space.s12, flexDirection: 'row', alignItems: 'flex-start', gap: space.s8 },
  link: {
    minHeight: size.touchTarget + space.s12, padding: space.s14, borderRadius: radius.xl, flexDirection: 'row', alignItems: 'center', gap: space.s12,
    backgroundColor: color.surface,
  },
  linkTile: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: color.serviceSkySoft },
  spacer: { height: space.s8 },
});
