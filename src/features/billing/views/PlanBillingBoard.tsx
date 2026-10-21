import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, ErrorState, Note, Skeleton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardScreen, BoardSection, boardText } from '@/design-system/board/BoardKit';
import { color, radius, size, space } from '@/design-system/theme';
import { cancelSubscription, getBillingMe, openSubscriptionCheckout, syncSubscription } from '@/data/datasets/billing';
import type { BillingMe } from '@/data/datasets/billing';
import { apiRequest } from '@/data/services/http';
import { useAuth } from '@/data/contexts/AuthContext';
import { rupees, shortDate } from '@/features/phoneboards/format';
import { useT } from '@/i18n';

export interface PlanBillingLinks {
  back?: () => void;
  /** Help centre: the way to a person while online payment is not connected. */
  support: () => void;
}

/**
 * Plan & billing (canvas page 2: PlanBilling, Tier 1 — approved by Krishna
 * Chintakayala, 2026-10-21). Everything comes from GET /billing/me: the plan's
 * name, description and benefits, whether checkout is connected, and the
 * receipts. Payment confers no access to anyone's records (Rule L) and nothing
 * clinical is on this screen.
 *
 * Differs from the board on purpose: the "included" list is the plan's own
 * benefit list from the server, not the board's sample; payment history is
 * the plan's receipts (orders have their own history); and while checkout is
 * not connected the card offers support without promising that support can
 * activate the plan (D6-11).
 */
export function PlanBillingBoard({ links }: { links: PlanBillingLinks }): React.ReactElement {
  const t = useT();
  const { user } = useAuth();
  const [me, setMe] = useState<BillingMe | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionFailed, setActionFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    getBillingMe().then(setMe, () => setFailed(true));
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = (work: () => Promise<string>) => {
    setBusy(true);
    setActionFailed(false);
    setNotice('');
    work().then((message) => { setNotice(message); load(); }, () => setActionFailed(true)).finally(() => setBusy(false));
  };
  const activate = () => run(async () => {
    const start = await apiRequest<{ subscriptionId: string; publicKey: string; amountPaise: number }>('/billing/subscription/checkout', { method: 'POST', body: JSON.stringify({ planId: 'STUDENT_PLUS' }) });
    await openSubscriptionCheckout({ key: start.publicKey, subscriptionId: start.subscriptionId, amountPaise: start.amountPaise, name: user?.fullName || '', email: user?.email || '', phone: user?.phone || '' });
    return t('shopweb.billing.paymentRefreshing');
  });
  const resync = () => run(async () => { await syncSubscription(); return t('shopweb.billing.refreshed'); });
  const cancel = () => run(async () => { await cancelSubscription(); return t('shopweb.billing.cancelScheduledNotice'); });

  const free = me?.effectivePlanId === 'FREE';
  const plus = me?.effectivePlanId === 'STUDENT_PLUS';

  return (
    <BoardScreen testID="plan-billing">
      <BoardHeader title={t('sf.plan.title')} backIcon="arrow-left" backLabel={t('common.back')} onBack={links.back} />
      {!me && !failed ? <Skeleton label={t('sf.plan.loading')} lines={['50%', '90%', '70%']} /> : null}
      {failed ? <ErrorState title={t('sf.plan.failedTitle')} body={t('sf.plan.failedBody')} retryLabel={t('common.tryAgain')} onRetry={load} /> : null}

      {me ? (
        <>
          <View style={styles.intro}>
            <Text style={boardText.eyebrow}>{t('sf.plan.yourPlan')}</Text>
            <Text accessibilityRole="header" style={boardText.title} testID="plan-name">{me.plan.name}</Text>
            <Text style={boardText.body}>{me.plan.description}</Text>
            {free ? <Text style={boardText.body}>{t('sf.plan.neverPaywall')}</Text> : null}
            {me.organizationPlan ? <Text style={boardText.meta}>{`${me.organizationPlan.organization} · ${t('shopweb.billing.seatUntil', { date: shortDate(me.organizationPlan.periodEnd) })}`}</Text> : null}
            {plus ? <Text style={boardText.meta}>{t('shopweb.billing.allowance', { used: me.benefits.used, limit: me.benefits.limit, date: shortDate(me.periodEnd) })}</Text> : null}
          </View>

          {me.plan.benefits.length ? (
            <BoardSection label={free ? t('sf.plan.includedFree') : t('sf.plan.included')}>
              <View style={styles.list}>
                {me.plan.benefits.map((benefit, i) => (
                  <View key={benefit} style={[styles.benefit, i < me.plan.benefits.length - 1 ? styles.rule : null]}>
                    <Icon name="check" size={size.navIcon - space.s2} color={color.positive} strokeWidth={2.4} />
                    <Text style={[boardText.strong, styles.flex]}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </BoardSection>
          ) : null}

          {free ? (
            <BoardSection label={t('sf.plan.plus')}>
              {me.checkoutAvailable ? (
                <Button testID="plan-upgrade" label={t('shopweb.billing.upgrade')} size="cta" fullWidth busy={busy} onPress={activate} />
              ) : (
                <>
                  <View style={styles.notConnected} testID="plan-not-connected">
                    <Icon name="alert-circle-2" size={size.navIcon} color={color.attention} />
                    <View style={styles.flex}>
                      <Text style={[boardText.strong, { color: color.attention }]}>{t('sf.plan.notConnectedTitle')}</Text>
                      <Text style={[boardText.body, { color: color.attention }]}>{t('sf.plan.notConnectedBody')}</Text>
                    </View>
                  </View>
                  <Button testID="plan-support" label={t('sf.plan.contactSupport')} variant="secondary" size="cta" fullWidth onPress={links.support} />
                </>
              )}
            </BoardSection>
          ) : null}

          {plus ? (
            <View style={styles.actions}>
              <Button label={t('shopweb.billing.refresh')} variant="secondary" fullWidth busy={busy} onPress={resync} />
              <Button label={me.cancelAtPeriodEnd ? t('shopweb.billing.cancelScheduled') : t('shopweb.billing.cancelAtEnd')} variant="ghost" disabled={busy || me.cancelAtPeriodEnd} onPress={cancel} />
            </View>
          ) : null}
          {notice ? <Note tone="positive">{notice}</Note> : null}
          {actionFailed ? <Note tone="danger">{t('sf.plan.actionFailed')}</Note> : null}
          <Text style={boardText.meta}>{t('shopweb.billing.fine')}</Text>

          <BoardSection label={t('shopweb.billing.history')}>
            {me.receipts.length ? (
              <View>
                {me.receipts.map((receipt, i) => (
                  <View key={receipt.invoiceId} style={[styles.receipt, i < me.receipts.length - 1 ? styles.rule : null]}>
                    <View style={styles.flex}>
                      <Text style={boardText.strong}>{receipt.invoiceId}</Text>
                      <Text style={boardText.meta}>{`${shortDate(receipt.paidAt)} · ${receipt.refundedPaise ? t('shopweb.billing.refunded') : t('shopweb.billing.paid')}`}</Text>
                    </View>
                    <Text style={[boardText.strong, boardText.mono]}>{rupees(receipt.amountPaise)}</Text>
                  </View>
                ))}
              </View>
            ) : <Text style={boardText.body} testID="plan-no-payments">{t('sf.plan.noPayments')}</Text>}
          </BoardSection>
        </>
      ) : null}
    </BoardScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  intro: { gap: space.s8 },
  list: { gap: 0 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: size.touchTarget },
  rule: { borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  notConnected: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s10, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.attentionBg },
  actions: { gap: space.s8 },
  receipt: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: size.touchTarget + space.s12 },
});
