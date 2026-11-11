import React from 'react';
import { useT } from '@/i18n';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Table, m2TableText, m2Text } from '@/design-system/m2';
import type { M2TableColumn } from '@/design-system/m2';

interface Row { type: string; event: string; push: string; smsWa: string; emailSubject: string; channels: string }

const COLUMNS: ReadonlyArray<M2TableColumn<Row>> = [
  { key: 'type', header: 'Type', cell: (r) => <Text style={m2TableText.strong}>{r.type}</Text> },
  { key: 'event', header: 'Event', cell: (r) => <Text style={m2TableText.cell}>{r.event}</Text> },
  { key: 'push', header: 'App push', cell: (r) => <Text style={m2TableText.cell}>{r.push}</Text> },
  { key: 'smsWa', header: 'SMS / WhatsApp', cell: (r) => <Text style={m2TableText.cell}>{r.smsWa}</Text> },
  { key: 'emailSubject', header: 'Email subject', cell: (r) => <Text style={m2TableText.cell}>{r.emailSubject}</Text> },
  { key: 'channels', header: 'Channels', cell: (r) => <Text style={m2TableText.cell}>{r.channels}</Text> },
];

/**
 * Flat, non-functional preview of NotificationTemplates ("Notification
 * templates — copy + rules"), built from the real
 * design/screens/briefs/NotificationTemplates.md, its screenshot and HTML
 * source (canvas page 9, Tier 1, SK-141). The real design's table has 7
 * rows; this preview ships 6. Deliberately dropped: the "Guardian consent
 * request" SMS row ("Krishna (VNR VJIET) asks for your consent to use
 * Student Kare... Reply STOP to decline"). DESIGN.md's D4 (resolved
 * 2026-09-26) drops the entire under-18/guardian-consent flow this row
 * documents — StudentKare is 18+ only (AGENTS.md guardrail 8) — so a
 * template for a notification that flow would send is the same
 * out-of-scope content as the WebGuardianApprove/WebGuardianConsent
 * screens reverted earlier this session, just in table-row form. Per
 * Krishna's explicit call, the rest of this reference table (account
 * deletion, new-device sign-in, report-ready, etc.) is built as-is; it
 * is a copy/rules catalogue, not a live flow. Not wired, not replacing
 * anything. See NOTES.md.
 */
export function NotificationTemplatesPreview(): React.ReactElement {
  const t = useT();
  const ROWS: readonly Row[] = [
    { type: t('preview.safety'), event: t('preview.newDeviceSignIn'), push: t('preview.signedInOnANewPhoneAt912PmNot'), smsWa: t('preview.studentKareNewSignInOnAnotherPhoneAt912'), emailSubject: t('preview.newSignInToYourStudentKareAccount'), channels: t('preview.alwaysAllChannels') },
    { type: t('preview.safety'), event: t('preview.thisWasntMeFollowUp'), push: t('preview.weVePausedYourPassAndIssuedA'), smsWa: t('preview.studentKareYourReportWasReceivedA'), emailSubject: t('preview.weReceivedYourReportHeresWhatHappens'), channels: t('preview.alwaysAllChannels') },
    { type: t('preview.safety'), event: t('preview.accountDeletionScheduled'), push: t('preview.yourAccountWillBeDeletedOn1Oct'), smsWa: t('preview.studentKareYourAccountIsSetTo'), emailSubject: t('preview.yourAccountWillBeDeletedOn1OctoberCancel'), channels: t('preview.alwaysAllChannels') },
    { type: t('preview.verification'), event: t('preview.checkPassed'), push: t('preview.vnrVjietVerifiedYourCollegeId1'), smsWa: '—', emailSubject: t('preview.yourCollegeIdIsVerified'), channels: t('preview.appEmail') },
    { type: t('preview.care'), event: t('preview.reportReady'), push: t('preview.yourReportIsReadyOpenTheApp'), smsWa: t('preview.studentKareANewReportIsReady'), emailSubject: t('preview.aNewReportIsReadyForYou'), channels: t('preview.appWhatsappEmail') },
    { type: t('preview.orders'), event: t('preview.handoverReceipt'), push: t('preview.order48120HandedOverAtMedplus414'), smsWa: t('preview.studentKareOrderSk48120Collected414'), emailSubject: t('preview.yourHandoverReceiptForOrderSk48120'), channels: t('preview.appWhatsapp') },
  ];
  return (
    <View style={styles.screen} testID="preview-notification-templates">
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{t('preview.designSystemMessages')}</Text>
        <Text style={styles.title}>{t('preview.notificationTemplates')}</Text>
        <View style={styles.introRow}>
          <Text style={m2Text.body}>{t('preview.copyForEveryMessageTheNewerFlowsSend')}</Text>
          <Icon name="arrow-right" size={14} color={color.text3} />
          <Text style={m2Text.body}>{t('preview.messageTemplates')}</Text>
        </View>
      </View>
      <View style={styles.scroll}>
        <View style={styles.body}>
          <M2Table caption="Notification templates" columns={COLUMNS} rows={ROWS} rowKey={(r) => r.event} label="Notification templates" />
          <Text style={m2Text.meta}>{t('preview.neverInAMessage')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 1440, height: 1100, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { padding: space.s24, gap: space.s4 },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8, marginTop: space.s4, flexWrap: 'wrap' },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, color: color.text3 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  scroll: { flex: 1 },
  body: { paddingHorizontal: space.s24, paddingBottom: space.s24, gap: space.s12, borderRadius: radius.lg },
});
