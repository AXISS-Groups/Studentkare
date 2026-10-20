import React, { useEffect, useRef, useState } from 'react';
import { BrandLogo, Icon } from '@/design-system/icons';
import { FormField } from '@/design-system/feedback/FormField';
import { SkButton } from '@/design-system/primitives';
import { navigate as routerNavigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { sendPartnerEnquiry } from '../partnerApi';
import type { PartnerEnquiryBody } from '../partnerApi';
import { APPLY_RULES, APPLY_STEPS, EMPTY_APPLICATION, enquiryFor, PARTNER_TYPES, problemsOn } from './applyModel';
import type { ApplyField, ApplyValues, PartnerType } from './applyModel';
import './partner-apply.css';

/** The brand name is never translated (DESIGN.md §3); "Kare" is set in the serif italic. */
const WORDMARK = { first: 'Student', second: 'Kare' } as const;

/** The two documents each type would show on the board; here they are asked for by email. */
const DOCS: Record<PartnerType, [MessageKey, MessageKey]> = {
  pharmacy: ['pc.apply.doc.pharmacy1', 'pc.apply.doc.pharmacy2'],
  lab: ['pc.apply.doc.lab1', 'pc.apply.doc.lab2'],
  clinic: ['pc.apply.doc.clinic1', 'pc.apply.doc.clinic2'],
  wellness: ['pc.apply.doc.wellness1', 'pc.apply.doc.wellness2'],
};

export type SendEnquiry = (body: PartnerEnquiryBody) => Promise<{ id: string }>;

export interface PartnerApplyScreenProps {
  send?: SendEnquiry;
  onNavigate?: (route: RoutePath) => void;
}

/**
 * `/partnerships/apply` — public. A pharmacy, lab, clinic or wellness centre
 * applying to join (PartnerApply on a phone, WebPartnerApply on the web; one
 * layout). Sent as a partnership enquiry: see applyModel.ts for what is and
 * isn't collected, and why.
 */
export function PartnerApplyScreen({ send = sendPartnerEnquiry, onNavigate }: PartnerApplyScreenProps): React.ReactElement {
  const t = useT();
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : routerNavigate(route));
  const [values, setValues] = useState<ApplyValues>(EMPTY_APPLICATION);
  const [stepIndex, setStepIndex] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [reference, setReference] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(stepIndex);
  const formRef = useRef<HTMLFormElement>(null);

  // A new step: move focus to its title so screen readers announce it.
  useEffect(() => {
    if (shownStep.current === stepIndex) return;
    shownStep.current = stepIndex;
    titleRef.current?.focus();
  }, [stepIndex]);

  const step = APPLY_STEPS[stepIndex];
  const problems = problemsOn(step, values);
  const bad = (field: ApplyField) => showErrors && problems.includes(field);
  const set = <K extends keyof ApplyValues>(key: K, value: ApplyValues[K]) => setValues((current) => ({ ...current, [key]: value }));
  const last = stepIndex === APPLY_STEPS.length - 1;

  const next = async (event: React.FormEvent) => {
    event.preventDefault();
    if (problems.length) {
      setShowErrors(true);
      formRef.current?.querySelector<HTMLElement>(`[data-field="${problems[0]}"]`)?.focus();
      return;
    }
    setShowErrors(false);
    if (!last) { setStepIndex(stepIndex + 1); return; }
    setBusy(true);
    setSubmitError('');
    try {
      const result = await send(enquiryFor(values));
      setReference(result.id);
    } catch (error) {
      setSubmitError(error instanceof Error && error.message ? error.message : t('pc.apply.sendFailed'));
    } finally {
      setBusy(false);
    }
  };

  const typeName = values.type ? t(`pc.apply.type.${values.type}` as MessageKey) : '';

  return (
    <div className="sk-ds pa-page">
      <header className="pa-top">
        <button type="button" className="pa-back" aria-label={t('pc.apply.back')} onClick={() => go('partnerships')}>
          <Icon name="chevron-left" size={18} strokeWidth={2.2} />
        </button>
        <button type="button" className="pa-brand" aria-label={t('pc.apply.brandLabel')} onClick={() => go('partnerships')}>
          <BrandLogo size={32} label="" />
          <span className="pa-brand__name">{WORDMARK.first}<em>&nbsp;{WORDMARK.second}</em></span>
        </button>
        <span className="pa-tag">{t('pc.apply.tag')}</span>
        <span className="pa-phone-title">{t('pc.apply.phoneTitle')}</span>
        <span className="pa-grow" />
        <button type="button" className="sk-link pa-signin" onClick={() => go('login')}>{t('pc.apply.signIn')}</button>
      </header>

      <main className="pa-main">
        <section className="pa-card" aria-labelledby="pa-title">
          {reference ? (
            <Received reference={reference} name={values.businessName.trim()} typeName={typeName} type={values.type} email={values.email.trim()} />
          ) : (
            <form ref={formRef} className="pa-form" noValidate onSubmit={(event) => { void next(event); }}>
              <div className="pa-progress">
                <div className="pa-bars" aria-hidden="true">
                  {APPLY_STEPS.map((id, i) => <span key={id} className={`pa-bar${i <= stepIndex ? ' is-done' : ''}`} />)}
                </div>
                <span className="pa-stepn">{t('pc.apply.stepOf', { n: stepIndex + 1, total: APPLY_STEPS.length })}</span>
                <h1 id="pa-title" className="pa-title" ref={titleRef} tabIndex={-1}>{t(`pc.apply.step.${step}` as MessageKey)}</h1>
              </div>

              <div className="pa-fields" key={step}>
                {step === 'type' ? <TypeStep value={values.type} invalid={bad('type')} onPick={(type) => set('type', type)} /> : null}
                {step === 'business' ? (
                  <>
                    <TextInput field="businessName" label={t('pc.apply.f.business')} value={values.businessName} invalid={bad('businessName')} message={t('pc.apply.e.business')} onChange={(v) => set('businessName', v)} autoComplete="organization" />
                    <TextInput field="gstin" label={t('pc.apply.f.gstin')} hint={t('pc.apply.h.gstin')} value={values.gstin} invalid={bad('gstin')} message={t('pc.apply.e.gstin')} onChange={(v) => set('gstin', v.toUpperCase().slice(0, 15))} mono />
                    <TextInput field="address" label={t('pc.apply.f.address')} value={values.address} invalid={bad('address')} message={t('pc.apply.e.address')} onChange={(v) => set('address', v)} multiline autoComplete="street-address" />
                    <TextInput field="campuses" label={t('pc.apply.f.campuses')} hint={t('pc.apply.h.campuses')} value={values.campuses} onChange={(v) => set('campuses', v)} />
                    <TextInput field="contactName" label={t('pc.apply.f.contact')} value={values.contactName} invalid={bad('contactName')} message={t('pc.apply.e.contact')} onChange={(v) => set('contactName', v)} autoComplete="name" />
                    <TextInput field="email" label={t('pc.apply.f.email')} hint={t('pc.apply.h.email')} value={values.email} invalid={bad('email')} message={t('pc.apply.e.email')} onChange={(v) => set('email', v)} autoComplete="email" inputMode="email" />
                  </>
                ) : null}
                {step === 'licences' && values.type ? (
                  <>
                    <TextInput field="licenceNumber" label={t(`pc.apply.lic.${values.type}.no` as MessageKey)} placeholder={t(`pc.apply.lic.${values.type}.noEx` as MessageKey)} value={values.licenceNumber} invalid={bad('licenceNumber')} message={t('pc.apply.e.licence')} onChange={(v) => set('licenceNumber', v)} />
                    <TextInput field="professionalName" label={t(`pc.apply.lic.${values.type}.person` as MessageKey)} placeholder={t(`pc.apply.lic.${values.type}.personEx` as MessageKey)} value={values.professionalName} invalid={bad('professionalName')} message={t('pc.apply.e.licence')} onChange={(v) => set('professionalName', v)} />
                    <TextInput field="registration" label={t(`pc.apply.lic.${values.type}.reg` as MessageKey)} placeholder={t(`pc.apply.lic.${values.type}.regEx` as MessageKey)} value={values.registration} invalid={bad('registration')} message={t('pc.apply.e.licence')} onChange={(v) => set('registration', v)} />
                    <ul className="pa-docs" aria-label={t('pc.apply.docsLabel')}>
                      {DOCS[values.type].map((doc) => (
                        <li key={doc} className="pa-doc"><span className="pa-doc__name">{t(doc)}</span><span className="pa-doc__state">{t('pc.apply.docByEmail')}</span></li>
                      ))}
                    </ul>
                    <p className="pa-note">{t('pc.apply.registerNote')}</p>
                  </>
                ) : null}
                {step === 'payouts' ? (
                  <>
                    <p className="pa-panel">{t('pc.apply.payoutNotHere')}</p>
                    <p className="pa-note">{t('pc.apply.fee')}</p>
                  </>
                ) : null}
                {step === 'rules' ? (
                  <>
                    <ul className="pa-rules">
                      {APPLY_RULES.map((rule, i) => (
                        <li key={rule}>
                          <Tick field={i === 0 ? 'agreed' : undefined} checked={values.agreed[rule]} invalid={bad('agreed') && !values.agreed[rule]} label={t(`pc.apply.rule.${rule}` as MessageKey)} onChange={(on) => set('agreed', { ...values.agreed, [rule]: on })} />
                        </li>
                      ))}
                      <li>
                        <Tick field="consent" checked={values.consent} invalid={bad('consent')} label={t('pc.apply.consent')} onChange={(on) => set('consent', on)} />
                      </li>
                    </ul>
                    {bad('agreed') || bad('consent') ? <p className="pa-error" role="alert">{t('pc.apply.e.rules')}</p> : null}
                    <p className="pa-warn">{t('pc.apply.wrongPlatform')}</p>
                  </>
                ) : null}
              </div>

              {submitError ? <p className="pa-error" role="alert">{submitError}</p> : null}
              <div className="pa-actions">
                {stepIndex > 0 ? <SkButton variant="secondary" className="pa-btn" disabled={busy} onClick={() => { setShowErrors(false); setStepIndex(stepIndex - 1); }}>{t('pc.apply.backStep')}</SkButton> : null}
                <SkButton type="submit" className={`pa-btn pa-btn--next${problems.length ? ' is-incomplete' : ''}`} busy={busy}>{t(last ? 'pc.apply.submit' : 'pc.apply.continue')}</SkButton>
              </div>
              {showErrors && problems.length ? <p className="sk-visually-hidden" role="status">{t('pc.apply.fixHighlighted')}</p> : null}
            </form>
          )}
        </section>

        <aside className="pa-aside" aria-label={t('pc.apply.asideLabel')}>
          <div className="pa-offer">
            <h2 className="pa-eyebrow pa-eyebrow--hero">{t('pc.apply.offerTitle')}</h2>
            <p>{t('pc.apply.offerBody')}</p>
          </div>
          <div className="pa-ready">
            <h2 className="pa-eyebrow">{t('pc.apply.readyTitle')}</h2>
            <ul>
              <li>{t('pc.apply.ready1')}</li>
              <li>{t('pc.apply.ready2')}</li>
              <li>{t('pc.apply.ready3')}</li>
              <li>{t('pc.apply.ready4')}</li>
            </ul>
            <p className="pa-ready__time">{t('pc.apply.readyTime')}</p>
          </div>
        </aside>
      </main>
    </div>
  );
}

function TypeStep({ value, invalid, onPick }: { value: PartnerType | null; invalid: boolean; onPick: (type: PartnerType) => void }): React.ReactElement {
  const t = useT();
  return (
    <div className="pa-types" role="radiogroup" aria-label={t('pc.apply.step.type')} aria-invalid={invalid || undefined}>
      {PARTNER_TYPES.map((type, i) => (
        <button
          key={type}
          type="button"
          role="radio"
          aria-checked={value === type}
          data-field={i === 0 ? 'type' : undefined}
          className={`pa-type${value === type ? ' is-on' : ''}${invalid ? ' is-invalid' : ''}`}
          onClick={() => onPick(type)}
        >
          <span className="pa-type__name">{t(`pc.apply.type.${type}` as MessageKey)}</span>
          <span className="pa-type__meta">{t(`pc.apply.typeMeta.${type}` as MessageKey)}</span>
          <span className="pa-type__fee">{t('pc.apply.typeFee')}</span>
        </button>
      ))}
      {invalid ? <p className="pa-error" role="alert">{t('pc.apply.e.type')}</p> : null}
    </div>
  );
}

interface TextInputProps {
  field: ApplyField | 'campuses';
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  invalid?: boolean;
  message?: string;
  multiline?: boolean;
  mono?: boolean;
  autoComplete?: string;
  inputMode?: 'email' | 'text';
}

function TextInput({ field, label, value, onChange, hint, placeholder, invalid = false, message, multiline = false, mono = false, autoComplete, inputMode }: TextInputProps): React.ReactElement {
  const className = `pa-input${mono ? ' pa-input--mono' : ''}`;
  return (
    <FormField label={label} hint={hint} status={invalid ? 'invalid' : 'idle'} message={message}>
      {multiline
        ? <textarea className={`${className} pa-input--area`} data-field={field} rows={3} value={value} placeholder={placeholder} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} />
        : <input className={className} data-field={field} value={value} placeholder={placeholder} autoComplete={autoComplete} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} />}
    </FormField>
  );
}

/** A real checkbox under a drawn box: the tick is the design-system check. Never pre-ticked. */
function Tick({ field, checked, invalid, label, onChange }: { field?: ApplyField; checked: boolean; invalid: boolean; label: string; onChange: (on: boolean) => void }): React.ReactElement {
  return (
    <label className={`pa-tick${checked ? ' is-on' : ''}${invalid ? ' is-invalid' : ''}`}>
      <input type="checkbox" className="pa-tick__input" data-field={field} checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="pa-tick__box" aria-hidden="true">{checked ? <Icon name="check" size={16} strokeWidth={3} /> : null}</span>
      <span className="pa-tick__text">{label}</span>
    </label>
  );
}

function Received({ reference, name, typeName, type, email }: { reference: string; name: string; typeName: string; type: PartnerType | null; email: string }): React.ReactElement {
  const t = useT();
  const visit = type === 'pharmacy' || type === 'lab';
  const track: { key: MessageKey; state: 'ok' | 'now' | 'todo'; when?: MessageKey }[] = [
    { key: 'pc.apply.track.submitted', state: 'ok', when: 'pc.apply.track.today' },
    { key: 'pc.apply.track.checked', state: 'now' },
    { key: visit ? 'pc.apply.track.visit' : 'pc.apply.track.call', state: 'todo' },
    { key: 'pc.apply.track.trained', state: 'todo' },
    { key: 'pc.apply.track.live', state: 'todo' },
  ];
  return (
    <div className="pa-done" role="status">
      <div className="pa-done__head">
        <span className="pa-done__tick" aria-hidden="true"><Icon name="check" size={32} strokeWidth={3} /></span>
        <span className="pa-done__words">
          <h1 id="pa-title" className="pa-done__title">{t('pc.apply.received')}</h1>
          <span className="pa-done__meta">{t('pc.apply.receivedMeta', { name, type: typeName.toLowerCase(), ref: reference })}</span>
        </span>
      </div>
      <ol className="pa-track">
        {track.map((item) => (
          <li key={item.key} className={`pa-track__item is-${item.state}`}>
            <span className="pa-track__dot" aria-hidden="true" />
            <span className="pa-track__text">{t(item.key)}</span>
            {item.when ? <span className="pa-track__when">{t(item.when)}</span> : null}
          </li>
        ))}
      </ol>
      <p className="pa-note">{t('pc.apply.reply', { email })}</p>
    </div>
  );
}
