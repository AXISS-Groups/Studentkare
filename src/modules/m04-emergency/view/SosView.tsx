import React, { useEffect } from 'react';
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

const KIND_LABEL: Record<SosRecipientKind, string> = {
  CAMPUS_CONSOLE: 'Campus console',
  CAMPUS_SECURITY: 'Campus security',
  EMERGENCY_CONTACT: 'Emergency contact',
};

const STATUS_LABEL: Record<SosDelivery['status'], string> = { SENT: 'Sent', FAILED: 'Not delivered', SKIPPED: 'Not set up' };

const POLL_MS = 15000;

function clock(epochSeconds: number | null): string {
  if (!epochSeconds) return '';
  return new Date(epochSeconds * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function Call112() {
  return <Button label="Call 112" variant="danger" size="cta" fullWidth onPress={() => void Linking.openURL('tel:112')} />;
}

function DeliveryList({ alert }: { alert: SosAlert }) {
  return (
    <View accessibilityRole="list" style={styles.list}>
      {alert.deliveries.map((d, i) => (
        <View key={`${d.recipientKind}-${i}`} accessibilityRole="text" style={styles.row}>
          <View style={styles.rowWords}>
            <Text style={styles.rowTitle}>{KIND_LABEL[d.recipientKind]}{d.recipient ? ` · ${d.recipient}` : ''}</Text>
            {d.detail ? <Text style={styles.meta}>{d.detail}</Text> : null}
          </View>
          <Text style={[styles.badge, { color: d.status === 'SENT' ? color.positive : d.status === 'FAILED' ? color.danger : color.text3 }]}>
            {STATUS_LABEL[d.status]}
          </Text>
        </View>
      ))}
    </View>
  );
}

export const SosView = observer(function SosView({ signedIn, links }: { signedIn: boolean; links: SosLinks }) {
  const { state, actions } = useEmergencySosViewModel();
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
        <Eyebrow>Emergency</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>
          {state.status === 'CLOSED' ? 'After your SOS' : 'Get help now'}
        </Text>
      </View>

      {!signedIn ? (
        <>
          <Call112 />
          <Card>
            <Text style={styles.cardTitle}>To alert your campus, sign in</Text>
            <Text style={styles.body}>Signed in, an SOS reaches your campus console, campus security and your emergency contact. Calling 112 needs no account.</Text>
            {links.signIn ? <Button label="Sign in" variant="secondary" fullWidth onPress={links.signIn} /> : null}
          </Card>
        </>
      ) : null}

      {signedIn && (state.status === 'IDLE') ? (
        <>
          <Call112 />
          <Card>
            <Text style={styles.cardTitle}>Alert your campus</Text>
            <Text style={styles.body}>
              Sends an alert to your campus console, a WhatsApp message to campus security and to your emergency contact. You’ll see exactly who was reached.
            </Text>
            <TextField
              label="Where are you? (optional)"
              placeholder="e.g. Library, 2nd floor"
              value={state.locationNote}
              onChangeText={actions.setLocationNote}
              maxLength={300}
            />
            <Button label="Send SOS" variant="danger" size="cta" fullWidth onPress={actions.triggerSos} />
          </Card>
        </>
      ) : null}

      {state.status === 'COUNTDOWN' ? (
        <Card>
          <Text accessibilityLiveRegion="assertive" style={styles.countdown}>
            Sending in {state.countdownSeconds}…
          </Text>
          <Button label="Cancel — don’t send" variant="secondary" size="cta" fullWidth onPress={actions.cancelCountdown} />
        </Card>
      ) : null}

      {state.status === 'SENDING' ? (
        <>
          <Note tone="attention" title="Sending your SOS…">If this takes long, don’t wait — call 112.</Note>
          <Call112 />
        </>
      ) : null}

      {state.status === 'FAILED' ? (
        <>
          <Note tone="danger" title="SOS not sent">{state.error}</Note>
          <Call112 />
          <Button label="Try again" variant="secondary" fullWidth onPress={actions.triggerSos} />
        </>
      ) : null}

      {state.status === 'OPEN' && alert ? (
        <>
          {anyoneReached(alert) ? (
            <Note tone={alert.status === 'ACKNOWLEDGED' ? 'positive' : 'attention'} title={alert.status === 'ACKNOWLEDGED' ? 'Your campus has seen your SOS' : 'SOS sent'}>
              {alert.status === 'ACKNOWLEDGED'
                ? `Acknowledged at ${clock(alert.acknowledgedAt)}. Stay where you are if it’s safe.`
                : `Raised at ${clock(alert.createdAt)}. Waiting for your campus to acknowledge.`}
            </Note>
          ) : (
            <Note tone="danger" title="Nobody could be reached">Your SOS is recorded, but no message got through. Call 112 now.</Note>
          )}
          <Call112 />
          <Card>
            <Text style={styles.cardTitle}>Who was alerted</Text>
            <DeliveryList alert={alert} />
          </Card>
          {contactSkipped && links.editEmergencyContact ? (
            <Button label="Add an emergency contact" variant="ghost" onPress={links.editEmergencyContact} />
          ) : null}
          {state.error ? <Note tone="danger">{state.error}</Note> : null}
          <Button label="I’m safe now — close my SOS" variant="secondary" fullWidth onPress={() => void actions.cancelAlert()} />
        </>
      ) : null}

      {state.status === 'CLOSED' && alert ? (
        <>
          <Card>
            <Text style={styles.cardTitle}>What happened</Text>
            <Text style={styles.body}>SOS raised at {clock(alert.createdAt)}{alert.campus ? ` · ${alert.campus}` : ''}</Text>
            {alert.acknowledgedAt ? <Text style={styles.body}>Campus acknowledged at {clock(alert.acknowledgedAt)}</Text> : null}
            {alert.resolvedAt ? <Text style={styles.body}>Closed by your campus at {clock(alert.resolvedAt)}</Text> : null}
            {alert.cancelledAt ? <Text style={styles.body}>You closed it at {clock(alert.cancelledAt)}</Text> : null}
            {alert.resolutionNote ? <Text style={styles.body}>Their note: {alert.resolutionNote}</Text> : null}
            <DeliveryList alert={alert} />
          </Card>
          <Card>
            <Text style={styles.cardTitle}>Talk to someone</Text>
            <Text style={styles.body}>Tele-MANAS is free and open 24×7 for anyone who’s shaken after an emergency.</Text>
            <Button label="Call Tele-MANAS 14416" variant="secondary" fullWidth onPress={() => void Linking.openURL('tel:14416')} />
          </Card>
          <Call112 />
          <Button label="Send a new SOS" variant="ghost" onPress={actions.triggerSos} />
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
