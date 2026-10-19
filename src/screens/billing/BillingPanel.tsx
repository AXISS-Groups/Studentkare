import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, ShieldCheck, X } from 'lucide-react';
import { cancelSubscription, getBillingMe, openSubscriptionCheckout, syncSubscription, BillingMe } from '../../data/datasets/billing';
import { useAuth } from '../../data/contexts/AuthContext';
import { apiRequest } from '../../data/services/http';
import { navigate } from '../../lib/utils/workflowRouting';
import { DataState, FormError, useMutation } from '../../components/interface/WorkflowUI';
import { displayDate } from '../../data/types/workflowTypes';
import { useT } from '@/i18n';

export function BillingPanel() {
  const t = useT();
  const { user } = useAuth();
  const [me, setMe] = useState<BillingMe | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const action = useMutation();
  const load = () => getBillingMe().then(setMe).catch((reason: Error) => setError(reason.message));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 4000); return () => window.clearTimeout(timer); }, [notice]);

  const activate = () => {
    action.run(async () => {
      const start = await apiRequest<{ subscriptionId: string; publicKey: string; amountPaise: number }>('/billing/subscription/checkout', { method: 'POST', body: JSON.stringify({ planId: 'STUDENT_PLUS' }) });
      await openSubscriptionCheckout({ key: start.publicKey, subscriptionId: start.subscriptionId, amountPaise: start.amountPaise, name: user?.fullName || '', email: user?.email || '', phone: user?.phone || '' });
      setNotice(t('shopweb.billing.paymentRefreshing'));
      await load();
    });
  };

  const resync = () => action.run(async () => { await syncSubscription(); setNotice(t('shopweb.billing.refreshed')); await load(); });
  const cancel = () => action.run(async () => { await cancelSubscription(); setNotice(t('shopweb.billing.cancelScheduledNotice')); await load(); });

  const free = !me || me.effectivePlanId === 'FREE';
  const plus = me?.effectivePlanId === 'STUDENT_PLUS';

  return <div className="wf-panel" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div className="wf-panel-heading">
      <div><span className="care-eyebrow">{t('shopweb.billing.eyebrow')}</span><h2>{t('shopweb.billing.title')}</h2>
        <p>{t('shopweb.billing.body')}</p></div>
      <button type="button" className="health-text-button" onClick={() => navigate('pricing')}>{t('shopweb.billing.compare')} <ArrowRight size={15} aria-hidden="true" /></button>
    </div>
    <FormError message={action.error} />
    {notice && <div className="wf-notice" role="status">{notice}</div>}
    <DataState loading={!me && !error} error={error} retry={load}>
      {me && <div className="wf-card wf-billing-current" style={{ padding: '28px 30px' }}>
        <div>
          <span className={`wf-status ${plus ? 'status-completed' : ''}`} style={{ marginBottom: 12 }}>{me.status}</span>
          <h3 style={{ fontSize: 22, color: 'var(--ink)', marginBottom: 8 }}>{me.plan.name}</h3>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12 }}>{me.plan.description}</p>
          {me.organizationPlan && <p style={{ fontSize: 13, color: 'var(--text-2)' }}><strong style={{ color: 'var(--ink)' }}>{me.organizationPlan.organization}</strong> · {t('shopweb.billing.seatUntil', { date: displayDate(me.organizationPlan.periodEnd) })}</p>}
          {plus && <p style={{ fontSize: 13, color: 'var(--text-2)' }}><strong style={{ color: 'var(--ink)' }}>{t('shopweb.billing.allowanceLabel')}</strong> {t('shopweb.billing.allowance', { used: me.benefits.used, limit: me.benefits.limit, date: displayDate(me.periodEnd) })}</p>}
        </div>
        <div className="wf-billing-actions">
          {free && <button type="button" className="health-button health-button-primary" disabled={action.busy || !me.checkoutAvailable} onClick={activate}>{me.checkoutAvailable ? t('shopweb.billing.upgrade') : t('shopweb.billing.notConfigured')} <ArrowRight size={15} aria-hidden="true" /></button>}
          {plus && <><button type="button" className="health-button" disabled={action.busy} onClick={resync}>{t('shopweb.billing.refresh')} <ArrowRight size={15} aria-hidden="true" /></button><button type="button" className="health-text-button" disabled={action.busy || me.cancelAtPeriodEnd} onClick={cancel}><X size={15} aria-hidden="true" />{me.cancelAtPeriodEnd ? t('shopweb.billing.cancelScheduled') : t('shopweb.billing.cancelAtEnd')}</button></>}
          {free && !me.checkoutAvailable && <p className="wf-fineprint" style={{ color: 'var(--text-3)', fontSize: 12, lineHeight: 1.5, margin: 0 }}>{t('shopweb.billing.notConnected')}</p>}
        </div>
      </div>}

      {me && me.receipts.length > 0 && <div className="wf-card" style={{ padding: '28px 30px' }}>
        <h3 style={{ color: 'var(--ink)', marginBottom: 16 }}>{t('shopweb.billing.history')}</h3>
        <ul className="wf-billing-receipts">{me.receipts.map(receipt => <li key={receipt.invoiceId}>
          <span><ShieldCheck size={16} aria-hidden="true" /><strong>{receipt.invoiceId}</strong><small>{displayDate(receipt.paidAt)} · {displayDate(receipt.periodStart)} → {displayDate(receipt.periodEnd)}</small></span>
          <span className="wf-status status-completed">{receipt.refundedPaise ? t('shopweb.billing.refunded') : t('shopweb.billing.paid')}</span>
        </li>)}</ul>
      </div>}
    </DataState>
    {me?.effectivePlanId === 'FREE' && <div className="wf-card" style={{ padding: '28px 30px' }}>
      {/* me.plan is the current plan (FREE here); its benefits were once headed "What Student Plus includes". */}
      <h3 style={{ color: 'var(--ink)', marginBottom: 16 }}>{t('shopweb.billing.includes')}</h3>
      <ul className="wf-plan-benefits">{me.plan.benefits.map(benefit => <li key={benefit}><Check size={16} aria-hidden="true" />{benefit}</li>)}</ul>
      <p className="wf-fineprint" style={{ color: 'var(--text-3)', marginTop: 20 }}>{t('shopweb.billing.fine')}</p>
    </div>}
  </div>;
}
