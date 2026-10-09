import React, { useEffect } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, Eyebrow, Note, TextField } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { useEmergencySosViewModel } from '../viewmodel/useEmergencySosViewModel';
import { anyoneReached } from '../domain/Emergency';
import type { SosAlert, SosDelivery, SosRecipientKind } from '../domain/Emergency';

/**
 * SOS and after-SOS (design page 2: SosBeacon, SosDebrief — Tier 1, approved by
 * the repository owner as named reviewer). One source for web and native.
 *
 * Shows only what the server recorded. Call 112 is on every state. No
 * animation: the motion board reserves movement for non-serious actions.
 */

export interface SosLinks {
  signIn?: () => void;
  /** Where the student adds or edits their emergency contact. */
  editEmergencyContact?: () => void;
}

const kindKey = (kind: SosRecipientKind) => `sos.kind.${kind}` as MessageKey;
const statusKey = (status: SosDelivery['status']) => `sos.status.${status}` as MessageKey;

const POLL_MS = 15000;

function clock(epochSeconds: number | null): string {
  if (!epochSeconds) return '';
  return new Date(epochSeconds * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function Call112() {
  const t = useT();
  return <Button label={t('crisis.call112')} variant="danger" size="cta" fullWidth onPress={() => void Linking.openURL('tel:112')} />;
}

function DeliveryList({ alert }: { alert: SosAlert }) {
  const t = useT();
  return (
    <View accessibilityRole="list" style={styles.list}>
      {alert.deliveries.map((d, i) => (
        <View key={`${d.recipientKind}-${i}`} accessibilityRole="text" style={styles.row}>
          <View style={styles.rowWords}>
            <Text style={styles.rowTitle}>{t(kindKey(d.recipientKind))}{d.recipient ? ` · ${d.recipient}` : ''}</Text>
            {d.detail ? <Text style={styles.meta}>{d.detail}</Text> : null}
          </View>
          <Text style={[styles.badge, { color: d.status === 'SENT' ? color.positive : d.status === 'FAILED' ? color.danger : color.text3 }]}>
            {t(statusKey(d.status))}
          </Text>
        </View>
      ))}
    </View>
  );
}

export const SosView = observer(function SosView({ signedIn, links }: { signedIn: boolean; links: SosLinks }) {
  const { state, actions } = useEmergencySosViewModel();
  const t = useT();
  const alert = state.alert;

  useEffect(() => {
    if (signedIn) void actions.loadCurrent();
  }, [signedIn]);

  // While an alert is open, re-read it so "your campus has seen it" appears without a reload.
  useEffect(() => {
    if (state.status !== 'OPEN') return;
    const timer = setInterval(() => void actions.loadCurrent(), POLL_MS);
    return () => clearInterval(timer);
  }, [state.status]);

  const contactSkipped = alert?.deliveries.some((d) => d.recipientKind === 'EMERGENCY_CONTACT' && d.status === 'SKIPPED');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Eyebrow>{t('sos.eyebrow')}</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>
          {state.status === 'CLOSED' ? t('sos.titleAfter') : t('sos.titleNow')}
        </Text>
      </View>

      {!signedIn ? (
        <>
          <Call112 />
          <Card>
            <Text style={styles.cardTitle}>{t('sos.signInTitle')}</Text>
            <Text style={styles.body}>{t('sos.signInBody')}</Text>
            {links.signIn ? <Button label={t('sos.signIn')} variant="secondary" fullWidth onPress={links.signIn} /> : null}
          </Card>
        </>
      ) : null}

      {signedIn && (state.status === 'IDLE') ? (
        <>
          <Call112 />
          <Card>
            <Text style={styles.cardTitle}>{t('sos.alertTitle')}</Text>
            <Text style={styles.body}>{t('sos.alertBody')}</Text>
            <TextField
              label={t('sos.where')}
              placeholder={t('sos.wherePlaceholder')}
              value={state.locationNote}
              onChangeText={actions.setLocationNote}
              maxLength={300}
            />
            <Button label={t('sos.send')} variant="danger" size="cta" fullWidth onPress={actions.triggerSos} />
          </Card>
        </>
      ) : null}

      {state.status === 'COUNTDOWN' ? (
        <Card>
          <Text accessibilityLiveRegion="assertive" style={styles.countdown}>
            {t('sos.countdown', { seconds: state.countdownSeconds })}
          </Text>
          <Button label={t('sos.cancelCountdown')} variant="secondary" size="cta" fullWidth onPress={actions.cancelCountdown} />
        </Card>
      ) : null}

      {state.status === 'SENDING' ? (
        <>
          <Note tone="attention" title={t('sos.sendingTitle')}>{t('sos.sendingBody')}</Note>
          <Call112 />
        </>
      ) : null}

      {state.status === 'FAILED' ? (
        <>
          <Note tone="danger" title={t('sos.notSentTitle')}>{state.error ? t(state.error) : ''}</Note>
          <Call112 />
          <Button label={t('common.tryAgain')} variant="secondary" fullWidth onPress={actions.triggerSos} />
        </>
      ) : null}

      {state.status === 'OPEN' && alert ? (
        <>
          {anyoneReached(alert) ? (
            <Note tone={alert.status === 'ACKNOWLEDGED' ? 'positive' : 'attention'} title={alert.status === 'ACKNOWLEDGED' ? t('sos.ackTitle') : t('sos.sentTitle')}>
              {alert.status === 'ACKNOWLEDGED'
                ? t('sos.ackBody', { time: clock(alert.acknowledgedAt) })
                : t('sos.sentBody', { time: clock(alert.createdAt) })}
            </Note>
          ) : (
            <Note tone="danger" title={t('sos.nobodyTitle')}>{t('sos.nobodyBody')}</Note>
          )}
          <Call112 />
          <Card>
            <Text style={styles.cardTitle}>{t('sos.whoAlerted')}</Text>
            <DeliveryList alert={alert} />
          </Card>
          {contactSkipped && links.editEmergencyContact ? (
            <Button label={t('sos.addContact')} variant="ghost" onPress={links.editEmergencyContact} />
          ) : null}
          {state.error ? <Note tone="danger">{t(state.error)}</Note> : null}
          <Button label={t('sos.imSafe')} variant="secondary" fullWidth onPress={() => void actions.cancelAlert()} />
        </>
      ) : null}

      {state.status === 'CLOSED' && alert ? (
        <>
          <Card>
            <Text style={styles.cardTitle}>{t('sos.whatHappened')}</Text>
            <Text style={styles.body}>{t('sos.raisedAt', { time: clock(alert.createdAt) })}{alert.campus ? ` · ${alert.campus}` : ''}</Text>
            {alert.acknowledgedAt ? <Text style={styles.body}>{t('sos.ackAt', { time: clock(alert.acknowledgedAt) })}</Text> : null}
            {alert.resolvedAt ? <Text style={styles.body}>{t('sos.resolvedAt', { time: clock(alert.resolvedAt) })}</Text> : null}
            {alert.cancelledAt ? <Text style={styles.body}>{t('sos.cancelledAt', { time: clock(alert.cancelledAt) })}</Text> : null}
            {alert.resolutionNote ? <Text style={styles.body}>{t('sos.theirNote', { note: alert.resolutionNote })}</Text> : null}
            <DeliveryList alert={alert} />
          </Card>
          <Card>
            <Text style={styles.cardTitle}>{t('sos.talkTitle')}</Text>
            <Text style={styles.body}>{t('sos.talkBody')}</Text>
            <Button label={t('crisis.callTeleManas')} variant="secondary" fullWidth onPress={() => void Linking.openURL('tel:14416')} />
          </Card>
          <Call112 />
          <Button label={t('sos.newSos')} variant="ghost" onPress={actions.triggerSos} />
        </>
      ) : null}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 560 },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginTop: space.s4 },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2, lineHeight: font.size.body * font.lineHeight.body },
  countdown: { fontFamily: font.family.sans, fontSize: font.size.display, fontWeight: fontWeight(font.weight.heavy), color: color.danger, textAlign: 'center' },
  list: { gap: space.s10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  rowWords: { flex: 1, gap: space.s2 },
  rowTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
  badge: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
});
