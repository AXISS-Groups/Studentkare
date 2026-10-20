import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import { Button, Card, CodeInput, ErrorState, Note, Rise, Skeleton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { ConfirmDialog } from '@/components/interface/ConfirmDialog';
import { useAuth } from '@/data/contexts/AuthContext';
import { homeForRole, navigate } from '@/lib/utils/workflowRouting';
import { QrCells } from '@/features/digital_id/views/DigitalIdNativeView';
import { TwoFactorViewModel } from '../viewmodel/TwoFactorViewModel';

/** Groups the key in fours ("JBSW Y3DP EHPK 3PXP"): easier to type into an app. */
const grouped = (secret: string) => secret.replace(/(.{4})(?=.)/g, '$1 ');

/**
 * Sign-in & security (design page 3b, WebSecurity, Tier 2): two-step sign-in.
 *
 * The design's "Where you're signed in" and "Recent sign-ins" cards are drawn
 * as not available yet: the server has no endpoint that lists sessions or
 * sign-in history, and a list we can't fill would be invented data
 * (DESIGN.md §2.7). Signing every other session out is the lost-phone flow
 * (POST /sessions/revoke-others), reached from the banner above.
 */
export const SignInSecurityView = observer(function SignInSecurityView({
  viewModel: vm,
  onContinue,
}: {
  viewModel: TwoFactorViewModel;
  /** Shown once a held session has turned 2FA on: back to the workspace. */
  onContinue?: () => void;
}) {
  const t = useT();
  const status = vm.status;
  const enrolment = vm.enrolment;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Rise>
        <Text accessibilityRole="header" style={styles.title}>{t('sec.title')}</Text>
        <Text style={styles.lead}>{t('sec.lead')}</Text>
      </Rise>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${t('sec.lost.title')} ${t('sec.lost.cta')}`}
        onPress={() => navigate('lost-phone')}
        style={({ focused }) => [styles.lost, focused ? focusRing : null]}
      >
        <Icon name="phone-off" size={22} color={color.danger} />
        <View style={styles.lostText}>
          <Text style={styles.lostTitle}>{t('sec.lost.title')}</Text>
          <Text style={styles.lostBody}>{t('sec.lost.body')}</Text>
        </View>
        <View style={styles.lostCta}>
          <Text style={styles.lostTitle}>{t('sec.lost.cta')}</Text>
          <Icon name="arrow-right" size={16} color={color.danger} />
        </View>
      </Pressable>

      {vm.phase === 'loading' ? <Skeleton label={t('sec.loading')} lines={['50%', '100%', '80%']} /> : null}

      {vm.phase === 'failed' ? (
        <ErrorState title={t('sec.failedTitle')} body={t('sec.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} />
      ) : null}

      {vm.phase === 'ready' && status ? (
        <Rise index={1}>
          <Card testID="two-step-card">
            <View style={styles.cardHead}>
              <Icon name={status.enabled ? 'shield-check-2' : 'lock-keyhole'} size={22} color={color.action} />
              <View style={styles.cardHeadText}>
                <Text accessibilityRole="header" style={styles.cardTitle}>{t('sec.twofa.title')}</Text>
                <Text style={styles.body}>{t('sec.twofa.lead')}</Text>
              </View>
              <View style={[styles.pill, status.enabled ? styles.pillOn : styles.pillOff]}>
                {status.enabled ? <Icon name="check-2" size={14} color={color.positive} /> : null}
                <Text style={[styles.pillText, { color: status.enabled ? color.positive : color.text2 }]}>
                  {status.enabled ? t('sec.twofa.on') : t('sec.twofa.off')}
                </Text>
              </View>
            </View>

            {status.setupRequired && !enrolment ? <Note tone="attention">{t('sec.twofa.required')}</Note> : null}
            {vm.done ? <Note tone="positive">{t(vm.done)}</Note> : null}
            {vm.error && !vm.confirmingOff ? <Note tone="danger">{t(vm.error)}</Note> : null}

            {status.enabled ? (
              <>
                <Text style={styles.body}>{t(status.required ? 'sec.twofa.requiredOn' : 'sec.twofa.statusOn')}</Text>
                {vm.done === 'sec.twofa.enabled' && onContinue ? (
                  <Button label={t('sec.twofa.continue')} onPress={onContinue} icon={<Icon name="arrow-right" size={16} color={color.onAction} />} />
                ) : null}
                {!status.required ? (
                  <Button label={t('sec.twofa.turnOff')} variant="secondary" onPress={vm.askToDisable} disabled={vm.busy} />
                ) : null}
              </>
            ) : enrolment ? (
              <View style={styles.enrol}>
                {enrolment.qrMatrix.length ? (
                  <View style={styles.qrFrame}><QrCells rows={enrolment.qrMatrix} label={t('sec.twofa.qrLabel')} /></View>
                ) : null}
                <View style={styles.enrolSteps}>
                  <View style={styles.stepRow}>
                    <Icon name="qr-code" size={18} color={color.text2} />
                    <Text style={styles.body}>{t('sec.twofa.step1')}</Text>
                  </View>
                  <Text style={styles.body}>{t('sec.twofa.step2')}</Text>
                  <Text style={styles.meta}>{t('sec.twofa.cantScan')}</Text>
                  <Text selectable style={styles.secret} accessibilityLabel={`${t('sec.twofa.cantScan')} ${enrolment.secret.split('').join(' ')}`}>
                    {grouped(enrolment.secret)}
                  </Text>
                  <Button label={t('sec.twofa.openApp')} variant="ghost" onPress={() => void Linking.openURL(enrolment.otpauthUrl)} />
                  <CodeInput
                    label={t('sec.twofa.codeLabel')}
                    value={vm.code}
                    onChangeText={vm.setCode}
                    disabled={vm.busy}
                    testID="two-step-code"
                  />
                  <View style={styles.actions}>
                    <Button label={t('sec.twofa.turnOn')} onPress={() => void vm.enable()} busy={vm.busy} disabled={!vm.canEnable && !vm.busy} />
                    <Button label={t('common.cancel')} variant="ghost" onPress={vm.cancelSetup} disabled={vm.busy} />
                  </View>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.body}>{t('sec.twofa.statusOff')}</Text>
                <Button label={t('sec.twofa.setUp')} onPress={() => void vm.startSetup()} busy={vm.busy}
                  icon={<Icon name="shield" size={16} color={color.onAction} />} />
              </>
            )}
          </Card>
        </Rise>
      ) : null}

      <View style={styles.later}>
        <View style={styles.half}><Card testID="sessions-card">
          <View style={styles.cardHead}>
            <Icon name="devices" size={22} color={color.text2} />
            <View style={styles.cardHeadText}>
              <Text accessibilityRole="header" style={styles.cardTitle}>{t('sec.sessions.title')}</Text>
              <Text style={styles.body}>{t('sec.sessions.lead')}</Text>
            </View>
          </View>
          <Note tone="info">{t('sec.sessions.unavailable')}</Note>
        </Card></View>
        <View style={styles.half}><Card testID="history-card">
          <View style={styles.cardHead}>
            <Icon name="lock-keyhole" size={22} color={color.text2} />
            <View style={styles.cardHeadText}>
              <Text accessibilityRole="header" style={styles.cardTitle}>{t('sec.history.title')}</Text>
              <Text style={styles.body}>{t('sec.history.lead')}</Text>
            </View>
          </View>
          <Note tone="info">{t('sec.history.unavailable')}</Note>
        </Card></View>
      </View>

      <ConfirmDialog
        open={vm.confirmingOff}
        tone="destructive"
        title={t('sec.twofa.offTitle')}
        body={(
          <View style={styles.dialogBody}>
            <Text style={styles.body}>{t('sec.twofa.offBody')}</Text>
            <CodeInput
              label={t('sec.twofa.codeLabel')}
              value={vm.offCode}
              onChangeText={vm.setOffCode}
              error={vm.error ? t(vm.error) : undefined}
              disabled={vm.busy}
              testID="two-step-off-code"
            />
          </View>
        )}
        confirmLabel={t('sec.twofa.turnOff')}
        cancelLabel={t('common.cancel')}
        busy={vm.busy}
        onConfirm={() => void vm.disable()}
        onCancel={vm.cancelDisable}
      />
    </ScrollView>
  );
});

/** Owns the view model's lifetime: the secret is dropped when the screen is left. */
export function SignInSecurityRoute(): React.ReactElement {
  const auth = useAuth();
  const latest = useRef(auth);
  latest.current = auth;
  const [vm] = useState(() => new TwoFactorViewModel(undefined, () => {
    const { user, updateUser } = latest.current;
    // The server has released the session; let the route guard know too.
    if (user?.twoFactorSetupRequired) updateUser({ ...user, twoFactorSetupRequired: false });
  }));
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  const role = auth.user?.role;
  return <SignInSecurityView viewModel={vm} onContinue={role ? () => navigate(homeForRole(role)) : undefined} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 1120 },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  lead: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2, marginTop: space.s4 },
  lost: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.s12, minHeight: size.touchTarget,
    padding: space.s16, borderRadius: radius.xl, backgroundColor: color.dangerBg, borderWidth: 1, borderColor: color.danger,
  },
  lostText: { flex: 1, minWidth: 180, gap: space.s2 },
  lostTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.danger },
  lostBody: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.danger },
  lostCta: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12, flexWrap: 'wrap' },
  cardHeadText: { flex: 1, minWidth: 200, gap: space.s4 },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, lineHeight: font.size.bodySm * font.lineHeight.body },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: space.s4, paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full },
  pillOn: { backgroundColor: color.positiveBg },
  pillOff: { backgroundColor: color.surface2 },
  pillText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  enrol: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s20, alignItems: 'flex-start' },
  qrFrame: { padding: space.s8, borderRadius: radius.lg, borderWidth: 1, borderColor: color.rule, overflow: 'hidden' },
  enrolSteps: { flex: 1, minWidth: 240, gap: space.s10 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s8 },
  secret: { fontFamily: font.family.mono, fontSize: font.size.body, color: color.clinicalValue, letterSpacing: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  dialogBody: { gap: space.s12 },
  // Two cards side by side on the web board, stacked when narrow.
  later: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s16, alignItems: 'stretch' },
  half: { flexGrow: 1, flexBasis: 320, minWidth: 0 },
});
