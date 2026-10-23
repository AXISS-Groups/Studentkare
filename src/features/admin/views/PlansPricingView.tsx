import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsolePageHeader, Drawer, SkButton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { planPackageLabels, planPriceLabel, rupeeAmount } from '@/data/datasets/billingPrices';
import type { BillingPlan } from '@/data/datasets/billing';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { contractsRepository } from '../model/contractsRepository';
import { governanceRepository } from '../model/governanceRepository';
import type { SettingChange, SettingView } from '../model/governanceTypes';
import { count, when } from '../model/format';
import { BoardNote, BoardToast } from './AdminBoard';
import { BoardFailure, BoardLoading, GovCard, GovPill, Unavailable, useResource } from './GovBoard';
import './gov-board.css';

type Translate = ReturnType<typeof useT>;

/** The settings registry area that holds every plan price. */
export const BILLING_AREA = 'billing';

/** How each billing setting reads on this board. A key not listed here shows the server's description. */
const BILLING_LABEL: Record<string, MessageKey> = {
  'billing.student_plus.monthly_inr': 'gov.plans.keyPlusMonthly',
  'billing.student_plus.quarter_package_inr': 'gov.plans.keyPlusQuarter',
  'billing.premium.from_monthly_inr': 'gov.plans.keyPremiumFrom',
  'billing.campus.per_student_yearly_inr': 'gov.plans.keyCampus',
  'billing.student_plus.benefit_requests_per_month': 'gov.plans.keyBenefits',
  'billing.student_plus.min_entitling_receipt_inr': 'gov.plans.keyLegacyFloor',
};
/** Settings that are a rupee amount (everything else is a count). */
const RUPEE_SETTINGS = new Set(['billing.student_plus.monthly_inr', 'billing.student_plus.quarter_package_inr', 'billing.premium.from_monthly_inr', 'billing.campus.per_student_yearly_inr', 'billing.student_plus.min_entitling_receipt_inr']);
/** Which price setting a plan card's "Edit price" opens. Plans with a word price (Free, Custom) have none. */
const PLAN_PRICE_KEY: Record<string, string> = {
  STUDENT_PLUS: 'billing.student_plus.monthly_inr',
  PREMIUM: 'billing.premium.from_monthly_inr',
  CAMPUS: 'billing.campus.per_student_yearly_inr',
};

export const settingLabel = (t: Translate, item: Pick<SettingView, 'key' | 'description'>) => BILLING_LABEL[item.key] ? t(BILLING_LABEL[item.key]) : item.description;

const formatValue = (key: string, value: unknown) => typeof value === 'number' ? (RUPEE_SETTINGS.has(key) ? rupeeAmount(value) : count(value)) : String(value ?? '—');

/** A setting's value as the server enforces it now ("₹149"). */
export const settingValue = (_t: Translate, item: SettingView) => formatValue(item.key, item.effective);

interface Change extends SettingChange { key: string }

/** Every billing setting's history, newest first. */
async function billingHistory(signal: AbortSignal): Promise<Change[]> {
  const list = await governanceRepository.settings(signal);
  const keys = list.items.filter(item => item.area === BILLING_AREA).map(item => item.key);
  const histories = await Promise.all(keys.map(key => governanceRepository.settingHistory(key, signal).then(history => history.items.map(change => ({ ...change, key })))));
  return histories.flat().sort((a, b) => b.changedAt - a.changedAt);
}

function PlanCard({ t, plan, onEdit }: { t: Translate; plan: BillingPlan; onEdit?: () => void }) {
  return <GovCard className="sk-gov-plan" title={plan.name} aside={<GovPill tone="positive">{t('admin.catalogue.published')}</GovPill>}>
    <p className="sk-gov-plan__price"><strong>{planPriceLabel(plan, t)}</strong><span>{plan.period}</span></p>
    {planPackageLabels(plan, t).map(label => <p key={label} className="sk-gov-fine">{label}</p>)}
    <p className="sk-gov-text">{plan.description}</p>
    {onEdit ? <button type="button" className="sk-gov-link" onClick={onEdit} aria-label={t('gov.plans.editPlan', { plan: plan.name })}>{t('gov.plans.edit')}<Icon name="arrow-right" size={14} strokeWidth={2.4} /></button> : null}
  </GovCard>;
}

/** The price edit drawer: one setting, a new whole-rupee value and a reason, written through the settings API. */
function EditPrice({ t, setting, onClose, onSaved }: { t: Translate; setting: SettingView; onClose: () => void; onSaved: (message: string) => void }) {
  const [value, setValue] = useState(String(setting.effective ?? ''));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const amount = Number(value);
  const valid = value.trim() !== '' && Number.isInteger(amount) && (setting.min === null || amount >= setting.min) && (setting.max === null || amount <= setting.max);
  const changed = valid && amount !== setting.effective;
  const save = async () => {
    if (!changed || !reason.trim()) return;
    setBusy(true);
    setFailure('');
    try {
      await governanceRepository.changeSetting(setting.key, amount, reason.trim());
      onSaved(t('gov.plans.saved', { label: settingLabel(t, setting), value: formatValue(setting.key, amount) }));
    } catch (error) {
      setFailure(error instanceof Error && error.message ? error.message : t('gov.plans.saveFailed'));
    } finally {
      setBusy(false);
    }
  };
  return <Drawer open title={settingLabel(t, setting)} eyebrow={t('admin.plans.title')} subtitle={t('gov.plans.current', { value: formatValue(setting.key, setting.effective) })} busy={busy} onClose={onClose}>
    <form className="sk-gov-form" onSubmit={event => { event.preventDefault(); void save(); }}>
      <label>{t('gov.plans.newValue')}
        <input type="number" inputMode="numeric" min={setting.min ?? undefined} max={setting.max ?? undefined} step={1} value={value} onChange={event => setValue(event.target.value)} aria-invalid={!valid} aria-describedby="sk-gov-price-range" />
        <span id="sk-gov-price-range" className="sk-gov-form__hint">{setting.min !== null && setting.max !== null ? t('gov.plans.range', { min: formatValue(setting.key, setting.min), max: formatValue(setting.key, setting.max) }) : setting.unit}</span>
      </label>
      {valid ? <div><p className="sk-gov-eyebrow">{t('gov.plans.studentsSee')}</p><p className="sk-gov-preview sk-mono">{formatValue(setting.key, amount)}</p></div> : null}
      <label>{t('gov.plans.reason')}
        <textarea required rows={3} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} />
      </label>
      <p className="sk-gov-unavailable"><Icon name="info" size={15} strokeWidth={2.2} />{t('gov.plans.immediate')}</p>
      {failure ? <p className="sk-gov-error" role="alert"><Icon name="alert-circle" size={16} strokeWidth={2.2} />{failure}</p> : null}
      <SkButton type="submit" busy={busy} disabled={!changed || !reason.trim()}>{t('gov.plans.save')}</SkButton>
    </form>
  </Drawer>;
}

/**
 * Plans & pricing (design: AdminPlansPricing, Tier 1). Plan cards are the server's
 * catalogue (GET /billing/plans), whose prices are settings-registry values: Student
 * Plus ₹149 a month and ₹2,199 for 3 months, Premium from ₹499 — never typed here.
 * "Edit price" writes one setting through PATCH /ops/settings/{key}: validated against
 * the setting's bounds, a reason required, audited, history kept, in force at once (a
 * second admin's approval isn't built; the drawer says so). Change history is the
 * settings history. The doctors' commission share is not decided, so it reads "Not
 * set". Not shown: the board's mismatch banner (nothing computes one; checkout itself
 * refuses when Razorpay's amount differs), "Where prices appear" (nothing checks the
 * surfaces) and "New plan" (no endpoint; drawn disabled).
 */
export const PlansPricingView = observer(function PlansPricingView() {
  const t = useT();
  const plans = useResource(contractsRepository.plans);
  const settings = useResource(governanceRepository.settings);
  const history = useResource(billingHistory);
  const [editing, setEditing] = useState<SettingView | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (plans.status === 'loading' || settings.status === 'loading') return <BoardLoading label={t('admin.plans.loading')} />;
  if (plans.status === 'error') return <BoardFailure t={t} what={t('gov.plans.what')} screen="AdminPlansPricing" onRetry={plans.reload} detail={plans.error} />;

  const billing = (settings.data?.items ?? []).filter(item => item.area === BILLING_AREA);
  const byKey = new Map(billing.map(item => [item.key, item]));
  const catalog = plans.data;
  const saved = (message: string) => {
    setEditing(null);
    setToast(message);
    plans.reload();
    settings.reload();
    history.reload();
  };

  return <div className="sk-ds sk-admin-page sk-gov">
    <ConsolePageHeader title={t('admin.plans.title')} subtitle={t('admin.plans.description')}
      actions={<SkButton variant="secondary" disabled aria-describedby="sk-gov-plan-new"><Icon name="plus" size={16} />{t('gov.plans.new')}</SkButton>} />
    <span id="sk-gov-plan-new" className="sk-board-visually-hidden">{t('gov.plans.newUnavailable')}</span>
    <BoardNote icon="banknote" tone={catalog?.checkoutAvailable ? 'info' : 'attention'}>{catalog?.checkoutAvailable ? t('admin.plans.checkoutOn') : t('admin.plans.checkoutOff')}</BoardNote>
    <div className="sk-gov-plans">
      {(catalog?.plans ?? []).map(plan => {
        const key = PLAN_PRICE_KEY[plan.id];
        const setting = key ? byKey.get(key) : undefined;
        return <PlanCard key={plan.id} t={t} plan={plan} onEdit={setting ? () => setEditing(setting) : undefined} />;
      })}
    </div>
    <div className="sk-gov-grid sk-gov-grid--split">
      <GovCard title={t('gov.plans.settings')}>
        <p className="sk-gov-text">{t('gov.plans.settingsBody')}</p>
        {settings.status === 'error' ? <p className="sk-gov-error" role="alert"><Icon name="alert-circle" size={16} />{t('gov.plans.settingsError')}</p> : <dl className="sk-gov-lines">
          {billing.map(item => <div key={item.key}>
            <dt>{settingLabel(t, item)}{item.override ? <span className="sk-gov-fine"> · {t('gov.plans.changed')}</span> : null}</dt>
            <dd className="sk-gov-setting">
              <span className="sk-mono">{settingValue(t, item)}</span>
              {RUPEE_SETTINGS.has(item.key) ? <button type="button" className="sk-gov-link" onClick={() => setEditing(item)} aria-label={t('gov.plans.editSetting', { label: settingLabel(t, item) })}>{t('gov.plans.editShort')}</button> : null}
            </dd>
          </div>)}
          <div>
            <dt>{t('gov.plans.commission')}</dt>
            <dd className="is-unknown">{t('gov.plans.notSet')}</dd>
          </div>
        </dl>}
        <Unavailable>{t('gov.plans.commissionNote')}</Unavailable>
      </GovCard>
      <GovCard title={t('admin.plans.history')}>
        <p className="sk-gov-text">{t('gov.plans.historyBody')}</p>
        {history.status === 'loading' ? <p className="sk-gov-fine" role="status">{t('gov.plans.historyLoading')}</p>
          : history.status === 'error' ? <p className="sk-gov-error" role="alert"><Icon name="alert-circle" size={16} />{t('gov.plans.historyError')}</p>
            : !(history.data ?? []).length ? <p className="sk-gov-fine">{t('admin.plans.historyEmpty')}</p>
              : <ul className="sk-gov-history">{(history.data ?? []).map(change => <li key={`${change.key}-${change.changedAt}`}>
                <span className="sk-gov-dot sk-gov-dot--positive" aria-hidden="true" />
                <strong>{t('gov.plans.historyLine', { label: BILLING_LABEL[change.key] ? t(BILLING_LABEL[change.key]) : change.key, from: change.oldValue === null ? t('gov.plans.default') : formatValue(change.key, change.oldValue), to: change.newValue === null ? t('gov.plans.default') : formatValue(change.key, change.newValue) })}</strong>
                <span>{t('gov.plans.historyMeta', { reason: change.reason, by: change.changedBy, when: when(change.changedAt) })}</span>
              </li>)}</ul>}
      </GovCard>
    </div>
    {editing ? <EditPrice t={t} setting={editing} onClose={() => setEditing(null)} onSaved={saved} /> : null}
    <BoardToast message={toast} onDone={() => setToast(null)} />
  </div>;
});
