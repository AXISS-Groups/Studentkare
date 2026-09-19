import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, ShieldCheck, X } from 'lucide-react';
import { cancelSubscription, getBillingMe, openSubscriptionCheckout, syncSubscription, BillingMe } from '../../data/billing';
import { useAuth } from '../../data/AuthContext';
import { apiRequest } from '../../data/http';
import { navigate } from '../../lib/workflowRouting';
import { DataState, FormError, useMutation } from '../../components/interface/WorkflowUI';
import { displayDate } from '../../data/workflowTypes';

export function BillingPanel() {
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
      setNotice('Payment received. Refreshing your membership.');
      await load();
    });
  };

  const resync = () => action.run(async () => { await syncSubscription(); setNotice('Membership refreshed from the payment provider.'); await load(); });
  const cancel = () => action.run(async () => { await cancelSubscription(); setNotice('Cancellation scheduled for the end of your current period.'); await load(); });

  const free = !me || me.effectivePlanId === 'FREE';
  const plus = me?.effectivePlanId === 'STUDENT_PLUS';

  return <div className="wf-panel" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div className="wf-panel-heading">
      <div><span className="care-eyebrow">MY PLAN</span><h2>Your Studentkare plan.</h2>
        <p>Choose a plan or manage your current membership. Benefits are applied from verified payments only.</p></div>
      <button className="health-text-button" onClick={() => navigate('pricing')}>Compare plans <ArrowRight size={15} /></button>
    </div>
    <FormError message={action.error} />
    {notice && <div className="wf-notice" role="status">{notice}</div>}
    <DataState loading={!me && !error} error={error} retry={load}>
      {me && <div className="wf-card wf-billing-current" style={{ padding: '28px 30px' }}>
        <div>
          <span className={`wf-status ${plus ? 'status-completed' : ''}`} style={{ marginBottom: 12 }}>{me.status}</span>
          <h3 style={{ fontSize: 22, color: 'var(--ink)', marginBottom: 8 }}>{me.plan.name}</h3>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12 }}>{me.plan.description}</p>
          {me.organizationPlan && <p style={{ fontSize: 13, color: 'var(--text-2)' }}><strong style={{ color: 'var(--ink)' }}>{me.organizationPlan.organization}</strong> · institutional seat access until {displayDate(me.organizationPlan.periodEnd)}</p>}
          {plus && <p style={{ fontSize: 13, color: 'var(--text-2)' }}><strong style={{ color: 'var(--ink)' }}>Benefit allowance:</strong> {me.benefits.used} of {me.benefits.limit} used this period · ends {displayDate(me.periodEnd)}</p>}
        </div>
        <div className="wf-billing-actions">
          {free && <button className="health-button health-button-primary" disabled={action.busy || !me.checkoutAvailable} onClick={activate}>{me.checkoutAvailable ? 'Upgrade to Student Plus · ₹99/mo' : 'Payments not configured yet'} <ArrowRight size={15} /></button>}
          {plus && <><button className="health-button" disabled={action.busy} onClick={resync}>Refresh membership <ArrowRight size={15} /></button><button className="health-text-button" disabled={action.busy} onClick={cancel}><X size={15} />{me.cancelAtPeriodEnd ? 'Cancellation scheduled' : 'Cancel at period end'}</button></>}
          {free && !me.checkoutAvailable && <p className="wf-fineprint" style={{ color: 'var(--text-3)', fontSize: 12, lineHeight: 1.5, margin: 0 }}>Online payment is not connected. Contact support to activate Student Plus.</p>}
        </div>
      </div>}

      {me && me.receipts.length > 0 && <div className="wf-card" style={{ padding: '28px 30px' }}>
        <h3 style={{ color: 'var(--ink)', marginBottom: 16 }}>Payment history</h3>
        <ul className="wf-billing-receipts">{me.receipts.map(receipt => <li key={receipt.invoiceId}>
          <span><ShieldCheck size={16} /><strong>{receipt.invoiceId}</strong><small>{displayDate(receipt.paidAt)} · {displayDate(receipt.periodStart)} → {displayDate(receipt.periodEnd)}</small></span>
          <span className="wf-status status-completed">{receipt.refundedPaise ? 'REFUNDED' : 'PAID'}</span>
        </li>)}</ul>
      </div>}
    </DataState>
    {me?.effectivePlanId === 'FREE' && <div className="wf-card" style={{ padding: '28px 30px' }}>
      <h3 style={{ color: 'var(--ink)', marginBottom: 16 }}>What Student Plus includes</h3>
      <ul className="wf-plan-benefits">{me.plan.benefits.map(benefit => <li key={benefit}><Check size={16} />{benefit}</li>)}</ul>
      <p className="wf-fineprint" style={{ color: 'var(--text-3)', marginTop: 20 }}>Benefits are limited and partner-funded. They do not replace insurance or clinical care.</p>
    </div>}
  </div>;
}
