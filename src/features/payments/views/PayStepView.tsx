import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Button, Card, Eyebrow, ErrorState, Note, Rise, Skeleton, Stepper } from '@/design-system';
import { Icon, Illustration } from '@/design-system/icons';
import type { SkIconName, SkIllustrationName } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { money } from '@/data/types/workflowTypes';
import type { PayMethod, PayStepViewModel, TestCard } from '../viewmodel/PayStepViewModel';

const METHODS: { value: PayMethod; icon: SkIconName; label: MessageKey; meta: MessageKey }[] = [
  { value: 'upi', icon: 'diamond', label: 'pay.method.upi', meta: 'pay.method.upiMeta' },
  { value: 'card', icon: 'credit-card-2', label: 'pay.method.card', meta: 'pay.method.cardMeta' },
  { value: 'netbanking', icon: 'building-columns', label: 'pay.method.netbanking', meta: 'pay.method.netbankingMeta' },
];

// Drawn as on the canvas but not offered: neither exists yet, and an option we
// can't honour is shown as unavailable rather than hidden or faked.
const NOT_YET: { icon: SkIconName; label: MessageKey }[] = [
  { icon: 'sparkle', label: 'pay.method.points' },
  { icon: 'banknote-2', label: 'pay.method.cod' },
];

const TEST_CARDS: { value: TestCard; label: MessageKey; number: string }[] = [
  { value: 'success', label: 'pay.test.success', number: '4111 1111 1111 1111' },
  { value: 'declined', label: 'pay.test.declined', number: '4000 0000 0000 0002' },
];

function OptionRow({ icon, label, meta, selected, disabled = false, onPress, testID }: {
  icon?: SkIconName; label: string; meta: string; selected: boolean; disabled?: boolean; onPress?: () => void; testID?: string;
}) {
  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={`${label}. ${meta}`}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ focused }: { pressed: boolean; focused?: boolean }) => [
        styles.option, selected ? styles.optionOn : null, disabled ? styles.optionOff : null, focused ? focusRing : null,
      ]}
    >
      {icon ? (
        <View style={[styles.optionIcon, selected ? styles.optionIconOn : null]}>
          <Icon name={icon} size={19} color={selected ? color.action : color.text2} />
        </View>
      ) : null}
      <View style={styles.optionText}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionMeta}>{meta}</Text>
      </View>
      <View style={[styles.radio, selected ? styles.radioOn : null]} />
    </Pressable>
  );
}

function Outcome({ illustration, title, body, children, alert = false, testID }: {
  illustration: SkIllustrationName; title: string; body: string; children: React.ReactNode; alert?: boolean; testID: string;
}) {
  return (
    <View testID={testID} role={alert ? 'alert' : 'status'} accessibilityLiveRegion="polite" style={styles.outcome}>
      <Illustration name={illustration} size={112} />
      <Text accessibilityRole="header" style={styles.outcomeTitle}>{title}</Text>
      <Text style={styles.outcomeBody}>{body}</Text>
      <View style={styles.outcomeActions}>{children}</View>
    </View>
  );
}

/**
 * Checkout — payment (canvas page 2 "Payment", SK-063, Tier 2), step 2 of 2.
 *
 * Shows the server's total for one placed order and hands the payment to the
 * provider. On the mock gateway every part of it says "test payment".
 * Kare points and cash on delivery are drawn disabled ("Not available yet").
 * The canvas's discount and delivery lines are not drawn: the server prices
 * neither, and a line we can't fill would be an invented number.
 */
export const PayStepView = observer(function PayStepView({ viewModel: vm, onBack, onTrack, onOrders, backLabel }: {
  viewModel: PayStepViewModel;
  /** Back to the delivery step. The order stays unpaid and releases its stock if never paid. */
  onBack: () => void;
  /** Spoken label for the back control when it does not lead to delivery (e.g. a lab booking). */
  backLabel?: string;
  onTrack: () => void;
  onOrders: () => void;
}) {
  const t = useT();
  const amount = money(vm.payment?.amountPaise ?? vm.amountPaise);
  const ref = vm.reference;

  useEffect(() => {
    void vm.start();
    return () => vm.dispose();
  }, [vm]);

  const showForm = vm.phase === 'ready' || vm.phase === 'paying' || vm.phase === 'verifying';

  return (
    <View style={styles.screen} testID="pay-step">
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel ?? t('pay.back')}
          disabled={vm.busy}
          onPress={onBack}
          style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.back, focused ? focusRing : null]}
        >
          <Icon name="arrow-left" size={18} color={color.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.title}>{t('pay.title')}</Text>
          <Stepper current={2} total={2} label={t('pay.step', { amount })} />
        </View>
        {vm.testMode ? (
          <View style={styles.testBadge} testID="pay-test-badge">
            <Icon name="flask" size={14} color={color.attention} />
            <Text style={styles.testBadgeText}>{t('pay.test.badge')}</Text>
          </View>
        ) : null}
      </View>

      {vm.phase === 'starting' ? <Skeleton label={t('pay.starting')} lines={['40%', '100%', '100%', '100%', '60%']} /> : null}

      {vm.phase === 'unavailable' ? (
        <Outcome testID="pay-unavailable" illustration="illustration-result-pending" title={t('pay.unavailable.title')}
          body={t('pay.unavailable.body', { ref })}>
          <Button label={t('pay.orders')} onPress={onOrders} fullWidth />
        </Outcome>
      ) : null}

      {showForm ? (
        <Rise>
          <View style={styles.section}>
            {vm.testMode ? (
              <>
                <Note tone="attention" title={t('pay.test.title')} testID="pay-test-note">{t('pay.test.body')}</Note>
                <Eyebrow>{t('pay.test.cards')}</Eyebrow>
                <View role="radiogroup" accessibilityLabel={t('pay.test.cards')} style={styles.group}>
                  {TEST_CARDS.map(card => (
                    <OptionRow key={card.value} label={t(card.label)} meta={t('pay.test.cardMeta', { number: card.number })}
                      selected={vm.testCard === card.value} disabled={vm.busy} onPress={() => vm.setTestCard(card.value)}
                      testID={`pay-test-${card.value}`} />
                  ))}
                </View>
              </>
            ) : (
              <>
                <Eyebrow>{t('pay.payWith')}</Eyebrow>
                <View role="radiogroup" accessibilityLabel={t('pay.payWith')} style={styles.group}>
                  {METHODS.map(m => (
                    <OptionRow key={m.value} icon={m.icon} label={t(m.label)} meta={t(m.meta)} selected={vm.method === m.value}
                      disabled={vm.busy} onPress={() => vm.setMethod(m.value)} testID={`pay-method-${m.value}`} />
                  ))}
                  {NOT_YET.map(m => (
                    <OptionRow key={m.label} icon={m.icon} label={t(m.label)} meta={t('pay.method.notYet')} selected={false} disabled />
                  ))}
                </View>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Eyebrow>{t('pay.bill')}</Eyebrow>
            <Card>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>{t('pay.itemTotal')}</Text>
                <Text style={styles.billValue}>{amount}</Text>
              </View>
              <View style={styles.rule} />
              <View style={styles.billRow}>
                <Text style={styles.toPayLabel}>{t('pay.toPay')}</Text>
                <Text style={styles.toPayValue} testID="pay-total">{amount}</Text>
              </View>
            </Card>
          </View>

          <View style={styles.secure}>
            <Icon name="lock-5" size={18} color={color.action} />
            <Text style={styles.secureText}>{t('pay.secure')}</Text>
          </View>

          {vm.notice ? <Note tone="info" testID="pay-notice">{t(vm.notice)}</Note> : null}

          <View style={styles.cta}>
            <Button
              label={vm.testMode ? t('pay.ctaTest', { amount }) : t('pay.cta', { amount })}
              accessibilityLabel={vm.phase === 'verifying' ? t('pay.verifying') : vm.phase === 'paying' ? t('pay.paying') : undefined}
              onPress={() => void vm.pay()}
              busy={vm.phase === 'paying' || vm.phase === 'verifying'}
              size="cta"
              fullWidth
              testID="pay-cta"
            />
          </View>
        </Rise>
      ) : null}

      {vm.phase === 'paid' ? (
        <Outcome testID="pay-paid" illustration="illustration-result-success"
          title={vm.testMode ? t('pay.paid.titleTest', { amount }) : t('pay.paid.title', { amount })}
          body={vm.testMode ? t('pay.paid.bodyTest', { ref }) : t('pay.paid.body', { ref })}>
          <Button label={t('pay.track')} onPress={onTrack} size="cta" fullWidth />
        </Outcome>
      ) : null}

      {vm.phase === 'failed' ? (
        <Outcome testID="pay-failed" alert illustration="illustration-result-failure" title={t('pay.failed.title')}
          body={vm.error ? t(vm.error) : t('pay.failed.declined')}>
          <Button label={t('pay.retry')} onPress={vm.tryAgain} size="cta" fullWidth />
          <Button label={t('pay.orders')} onPress={onOrders} variant="ghost" fullWidth />
        </Outcome>
      ) : null}

      {vm.phase === 'pending' ? (
        <Outcome testID="pay-pending" illustration="illustration-result-pending" title={t('pay.pending.title')} body={t('pay.pending.body')}>
          {vm.notice ? <Note tone="info">{t(vm.notice)}</Note> : null}
          <Button label={t('pay.pending.check')} onPress={() => void vm.checkStatus()} fullWidth />
          <Button label={t('pay.orders')} onPress={onOrders} variant="ghost" fullWidth />
        </Outcome>
      ) : null}

      {vm.phase === 'late' ? (
        <Outcome testID="pay-late" illustration="illustration-result-pending" title={t('pay.late.title')} body={t('pay.late.body', { ref })}>
          <Button label={t('pay.orders')} onPress={onOrders} fullWidth />
        </Outcome>
      ) : null}

      {vm.phase === 'closed' ? (
        <Outcome testID="pay-closed" illustration="illustration-result-failure" title={t('pay.closed.title')} body={t('pay.closed.body')}>
          <Button label={t('pay.orders')} onPress={onOrders} fullWidth />
        </Outcome>
      ) : null}

      {vm.phase === 'error' ? (
        <ErrorState
          title={t('pay.error.title')}
          body={vm.error ? t(vm.error) : t('pay.error.start')}
          retryLabel={t('pay.retry')}
          onRetry={vm.payment ? vm.tryAgain : () => void vm.start()}
          reference={{ label: t('pay.reference'), code: ref }}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { gap: space.s20, backgroundColor: color.canvas, paddingBottom: space.s16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  back: {
    width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, backgroundColor: color.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1, gap: space.s4 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  testBadge: {
    flexDirection: 'row', alignItems: 'center', gap: space.s4, paddingHorizontal: space.s10, paddingVertical: space.s4,
    borderRadius: radius.full, backgroundColor: color.attentionBg,
  },
  testBadgeText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.attention },
  section: { gap: space.s10, marginBottom: space.s20 },
  group: { gap: space.s10 },
  option: {
    minHeight: size.controlLg, flexDirection: 'row', alignItems: 'center', gap: space.s12,
    paddingHorizontal: space.s14, paddingVertical: space.s14, borderRadius: radius.lg,
    borderWidth: 1, borderColor: color.rule, backgroundColor: color.surface,
  },
  optionOn: { borderWidth: 2, borderColor: color.action },
  optionOff: { backgroundColor: color.surface2 },
  optionIcon: {
    width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface2,
  },
  optionIconOn: { backgroundColor: color.surface3 },
  optionText: { flex: 1, gap: space.s2 },
  optionLabel: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
  optionMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  radio: { width: 20, height: 20, borderRadius: radius.full, borderWidth: 2, borderColor: color.ruleStrong },
  radioOn: { borderWidth: 6, borderColor: color.action },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.s4 },
  billLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  billValue: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  rule: { height: 1, backgroundColor: color.ruleSoft, marginVertical: space.s8 },
  toPayLabel: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  toPayValue: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  secure: { flexDirection: 'row', gap: space.s10, alignItems: 'flex-start', marginBottom: space.s16 },
  secureText: {
    flex: 1, fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * font.lineHeight.body,
    fontWeight: fontWeight(font.weight.regular), color: color.text2,
  },
  cta: { marginTop: space.s8 },
  outcome: { alignItems: 'center', gap: space.s12, paddingVertical: space.s24 },
  outcomeTitle: {
    fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center',
  },
  outcomeBody: {
    fontFamily: font.family.sans, fontSize: font.size.body, lineHeight: font.size.body * font.lineHeight.body,
    fontWeight: fontWeight(font.weight.regular), color: color.text2, textAlign: 'center', maxWidth: 520,
  },
  outcomeActions: { alignSelf: 'stretch', gap: space.s10, marginTop: space.s8 },
});
