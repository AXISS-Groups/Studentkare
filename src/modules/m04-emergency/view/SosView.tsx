import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, Eyebrow, Note, Sheet, TextField } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { color, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { getSetting } from '@/data/services/config';
import { useEmergencySosViewModel } from '../viewmodel/useEmergencySosViewModel';
import { anyoneReached } from '../domain/Emergency';
import type { SosAlert, SosDelivery, SosRecipientKind } from '../domain/Emergency';

/**
 * SOS and after-SOS (design page 2: SosBeacon, SosDebrief — Tier 1, approved
 * by Krishna Chintakayala, 2026-10-21). One source for web and native.
 *
 * Shows only what the server recorded. Call 112 is on every state. No
 * animation: the motion board reserves movement for non-serious actions.
 *
 * Drawn from the boards, honestly: the live timer counts from the server's
 * start time; the location line is the place the student typed (there is no
 * GPS fix, so no "accurate to 6 m"); "who has been told" is the server's
 * delivery list. Not drawn: live location updates, the counsellor check-in and
 * the private note (no backend, D6-5), and "everyone was told you ended it" —
 * ending an SOS tells the campus console only, so the screen says exactly that.
 */

export interface SosLinks {
  signIn?: () => void;
  /** Where the student adds or edits their emergency contact. */
  editEmergencyContact?: () => void;
  /** Crisis support ("Still not okay? Talk to someone now"). */
  crisis?: () => void;
  /** Back to the app ("Back to Student Kare"). */
  home?: () => void;
  /** Expo stack back; on the web the header's back is the browser's. */
  back?: () => void;
  /** "Nearest hospitals": Find care on the Hospitals tab (plan tier1-care-directory-2026-10-21 §3). Never on an active alert. */
  nearestHospitals?: () => void;
}

const kindKey = (kind: SosRecipientKind) => `sos.kind.${kind}` as MessageKey;
const statusKey = (status: SosDelivery['status']) => `sos.status.${status}` as MessageKey;

/** Seconds as mm:ss (the board's "LIVE · 00:41"); hours roll into minutes. */
export function elapsedClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** A finished SOS's length in words ("4 min 12 s"), from the server's own times. */
export function durationWords(totalSeconds: number, t: (key: MessageKey, vars?: Record<string, string | number>) => string): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return t('sf.sos.duration', { m: Math.floor(s / 60), s: s % 60 });
}

function clock(epochSeconds: number | null): string {
  if (!epochSeconds) return '';
  return new Date(epochSeconds * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Ticks once a second while `on`, so the live timer is read from the clock, never counted up. */
function useNow(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [on]);
  return now;
}

function NearestHospitals({ onPress }: { onPress?: () => void }) {
  const t = useT();
  if (!onPress) return null;
  return <Button testID="sos-find-care" label={t('fc.nearestHospitals')} accessibilityLabel={t('fc.nearestHospitalsSpoken')} variant="secondary" fullWidth onPress={onPress} />;
}

function Call112({ testID = 'sos-call-112' }: { testID?: string }) {
  const t = useT();
  return <Button testID={testID} label={t('crisis.call112')} accessibilityLabel={t('crisis.call112Spoken')} variant="danger" size="cta" fullWidth onPress={() => void Linking.openURL('tel:112')} />;
}

const dotColour = (status: SosDelivery['status'], onHero: boolean) =>
  status === 'SENT' ? (onHero ? color.onHeroPositive : color.positive) : status === 'FAILED' ? color.danger : onHero ? color.onHero2 : color.text3;

/** The server's record of who was told, as the board's timeline. */
function DeliveryList({ alert, onHero = false }: { alert: SosAlert; onHero?: boolean }) {
  const t = useT();
  return (
    <View accessibilityRole="list" style={styles.list} testID="sos-deliveries">
      {alert.deliveries.map((d, i) => (
        <View key={`${d.recipientKind}-${i}`} accessible accessibilityLabel={`${t(kindKey(d.recipientKind))}${d.recipient ? `, ${d.recipient}` : ''}: ${t(statusKey(d.status))}`}
          style={[styles.row, i < alert.deliveries.length - 1 ? (onHero ? styles.rowRuleHero : styles.rowRule) : null]}>
          <View style={[styles.dot, { backgroundColor: dotColour(d.status, onHero) }]} />
          <View style={styles.rowWords}>
            <Text style={[styles.rowTitle, onHero ? { color: color.onHero } : null]}>{t(kindKey(d.recipientKind))}{d.recipient ? ` · ${d.recipient}` : ''}</Text>
            {d.detail ? <Text style={[styles.meta, onHero ? { color: color.onHero2 } : null]}>{d.detail}</Text> : null}
          </View>
          <Text style={[styles.badge, { color: dotColour(d.status, onHero) }]}>{t(statusKey(d.status))}</Text>
        </View>
      ))}
    </View>
  );
}

export const SosView = observer(function SosView({ signedIn, links }: { signedIn: boolean; links: SosLinks }) {
  const { state, actions } = useEmergencySosViewModel();
  const t = useT();
  const alert = state.alert;
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const open = state.status === 'OPEN' && alert !== null;
  const now = useNow(open);
  const pollSeconds = getSetting('emergency.sos_poll_seconds');

  useEffect(() => {
    if (signedIn) void actions.loadCurrent();
  }, [signedIn]);

  // While an alert is open, re-read it so "your campus has seen it" appears without a reload.
  useEffect(() => {
    if (state.status !== 'OPEN') return;
    const timer = setInterval(() => void actions.loadCurrent(), pollSeconds * 1000);
    return () => clearInterval(timer);
  }, [state.status, pollSeconds]);

  const contactSkipped = alert?.deliveries.some((d) => d.recipientKind === 'EMERGENCY_CONTACT' && d.status === 'SKIPPED');
  const endSos = async () => {
    setEnding(true);
    await actions.cancelAlert();
    setEnding(false);
    setConfirmEnd(false);
  };

  const header = (
    <BoardHeader
      title={open ? t('sf.sos.activeTitle') : state.status === 'CLOSED' ? t('sf.sos.afterTitle') : t('sf.sos.title')}
      backIcon="arrow-left"
      backLabel={t('common.back')}
      onBack={links.back}
    />
  );

  if (open && alert) {
    const reached = anyoneReached(alert);
    const acknowledged = alert.status === 'ACKNOWLEDGED';
    return (
      <ScrollView style={[styles.screen, styles.heroScreen]} contentContainerStyle={styles.content} testID="sos-beacon">
        {header}
        <View style={styles.liveRow}>
          <View style={styles.livePill} accessible accessibilityLabel={t('sf.sos.liveSpoken', { time: elapsedClock(now / 1000 - alert.createdAt) })}>
            <Text style={styles.liveText}>{t('sf.sos.live', { time: elapsedClock(now / 1000 - alert.createdAt) })}</Text>
          </View>
        </View>
        <View style={styles.beaconWrap}>
          <View style={styles.beaconRing}>
            <View style={styles.beacon}>
              <Text style={styles.beaconWord}>{t('sf.sos.word')}</Text>
              <Text style={styles.beaconSub}>{reached ? t('sf.sos.sent') : t('sf.sos.notDelivered')}</Text>
            </View>
          </View>
        </View>
        <View style={styles.center}>
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.heroTitle}>
            {acknowledged ? t('sos.ackTitle') : reached ? t('sf.sos.onTheWay') : t('sos.nobodyTitle')}
          </Text>
          <Text style={styles.heroBody}>
            {acknowledged ? t('sos.ackBody', { time: clock(alert.acknowledgedAt) }) : reached ? t('sf.sos.stay', { seconds: pollSeconds }) : t('sos.nobodyBody')}
          </Text>
        </View>
        {alert.locationNote ? (
          <View style={styles.location} testID="sos-location">
            <Icon name="map-pin-3" size={size.navIcon} color={color.onHeroPositive} />
            <View style={styles.rowWords}>
              <Text style={[styles.rowTitle, { color: color.onHero }]}>{alert.locationNote}</Text>
              <Text style={[styles.meta, { color: color.onHero2 }]}>{t('sf.sos.locationMeta')}</Text>
            </View>
          </View>
        ) : null}
        <Call112 />
        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.heroEyebrow}>{t('sf.sos.whoTold')}</Text>
          <DeliveryList alert={alert} onHero />
        </View>
        {contactSkipped && links.editEmergencyContact ? (
          <Button label={t('sos.addContact')} variant="secondary" onPress={links.editEmergencyContact} />
        ) : null}
        {state.error ? <Note tone="danger">{t(state.error)}</Note> : null}
        <Button testID="sos-end" label={t('sf.sos.end')} variant="secondary" size="cta" fullWidth onPress={() => setConfirmEnd(true)} />
        <Text style={styles.heroFoot}>{t('sf.sos.endFoot')}</Text>

        <Sheet visible={confirmEnd} title={t('sf.sos.endTitle')} onClose={() => setConfirmEnd(false)} busy={ending} testID="sos-end-sheet">
          <View style={styles.sheet}>
            <Text style={styles.body}>{t('sf.sos.endFoot')}</Text>
            {state.error ? <Note tone="danger">{t(state.error)}</Note> : null}
            <Button testID="sos-end-confirm" label={t('sf.sos.endConfirm')} size="cta" fullWidth busy={ending} onPress={() => void endSos()} />
            <Button label={t('sf.sos.keepOn')} variant="secondary" fullWidth onPress={() => setConfirmEnd(false)} />
          </View>
        </Sheet>
      </ScrollView>
    );
  }

  if (state.status === 'CLOSED' && alert) {
    const endedAt = alert.cancelledAt ?? alert.resolvedAt;
    const byStudent = Boolean(alert.cancelledAt);
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="sos-debrief">
        {header}
        <View style={styles.center}>
          <View style={styles.safeMark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Icon name="check" size={space.s40} color={color.positive} strokeWidth={3} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>{byStudent ? t('sf.sos.markedSafe') : t('sf.sos.closedTitle')}</Text>
          <Text style={[styles.body, styles.centerText]}>
            {endedAt ? t('sf.sos.endedAfter', { time: clock(endedAt), duration: durationWords(endedAt - alert.createdAt, t) }) : t('sos.raisedAt', { time: clock(alert.createdAt) })}
          </Text>
        </View>
        <Card>
          <Text accessibilityRole="header" style={styles.eyebrow}>{t('sos.whoAlerted')}</Text>
          <DeliveryList alert={alert} />
          <Text style={styles.meta}>{byStudent ? t('sf.sos.consoleTold') : t('sos.resolvedAt', { time: clock(alert.resolvedAt) })}</Text>
          {alert.acknowledgedAt ? <Text style={styles.meta}>{t('sos.ackAt', { time: clock(alert.acknowledgedAt) })}</Text> : null}
          {alert.resolutionNote ? <Text style={styles.body}>{t('sos.theirNote', { note: alert.resolutionNote })}</Text> : null}
        </Card>
        {links.crisis ? <Button testID="sos-crisis" label={t('sf.sos.notOkay')} variant="dangerOutline" size="cta" fullWidth onPress={links.crisis} /> : null}
        <Button label={t('crisis.callTeleManas')} accessibilityLabel={t('crisis.callTeleManasSpoken')} variant="secondary" fullWidth onPress={() => void Linking.openURL('tel:14416')} />
        <Call112 />
        <NearestHospitals onPress={links.nearestHospitals} />
        {links.home ? <Button label={t('sf.sos.backHome')} size="cta" fullWidth onPress={links.home} /> : null}
        <Button label={t('sos.newSos')} variant="ghost" onPress={actions.triggerSos} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="sos-start">
      {header}
      <View>
        <Eyebrow>{t('sos.eyebrow')}</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>{t('sos.titleNow')}</Text>
      </View>

      {!signedIn ? (
        <>
          <Call112 />
          <Card>
            <Text style={styles.cardTitle}>{t('sos.signInTitle')}</Text>
            <Text style={styles.body}>{t('sos.signInBody')}</Text>
            {links.signIn ? <Button label={t('sos.signIn')} variant="secondary" fullWidth onPress={links.signIn} /> : null}
          </Card>
          <NearestHospitals onPress={links.nearestHospitals} />
        </>
      ) : null}

      {signedIn && state.status === 'IDLE' ? (
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
            <Button testID="sos-send" label={t('sos.send')} variant="danger" size="cta" fullWidth onPress={actions.triggerSos} />
          </Card>
          <NearestHospitals onPress={links.nearestHospitals} />
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
    </ScrollView>
  );
});

const BEACON = 132;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  heroScreen: { backgroundColor: color.heroBg },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  center: { alignItems: 'center', gap: space.s8 },
  centerText: { textAlign: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginTop: space.s4, textAlign: 'center' },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2, lineHeight: font.size.body * font.lineHeight.body },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.text3 },
  countdown: { fontFamily: font.family.sans, fontSize: font.size.display, fontWeight: fontWeight(font.weight.heavy), color: color.danger, textAlign: 'center' },
  liveRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  livePill: { borderRadius: radius.full, backgroundColor: color.dangerFill, paddingHorizontal: space.s12, paddingVertical: space.s6 },
  liveText: { fontFamily: font.family.mono, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onDangerFill, letterSpacing: 1 },
  beaconWrap: { alignItems: 'center', paddingVertical: space.s8 },
  beaconRing: { width: BEACON + space.s20, height: BEACON + space.s20, borderRadius: radius.full, borderWidth: 2, borderColor: color.dangerRule, alignItems: 'center', justifyContent: 'center' },
  beacon: { width: BEACON, height: BEACON, borderRadius: radius.full, backgroundColor: color.dangerFill, alignItems: 'center', justifyContent: 'center' },
  beaconWord: { fontFamily: font.family.sans, fontSize: font.size.display, fontWeight: fontWeight(font.weight.heavy), color: color.onDangerFill },
  beaconSub: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.onDangerFill },
  heroTitle: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.onHero, textAlign: 'center' },
  heroBody: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.onHero2, textAlign: 'center', lineHeight: font.size.body * font.lineHeight.body },
  heroEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.onHeroLabel },
  heroFoot: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.onHero2, textAlign: 'center', lineHeight: font.size.caption * font.lineHeight.body },
  location: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s14, borderRadius: radius.lg, backgroundColor: color.onHeroVeil },
  section: { gap: space.s8 },
  list: { gap: space.s2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: size.touchTarget, paddingVertical: space.s8 },
  rowRule: { borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  rowRuleHero: { borderBottomWidth: 1, borderBottomColor: color.onHeroRule },
  dot: { width: space.s8, height: space.s8, borderRadius: radius.full },
  rowWords: { flex: 1, gap: space.s2, minWidth: 0 },
  rowTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
  badge: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  safeMark: { width: space.s40 * 2, height: space.s40 * 2, borderRadius: radius.full, backgroundColor: color.positiveBg, alignItems: 'center', justifyContent: 'center' },
  sheet: { gap: space.s12 },
});
