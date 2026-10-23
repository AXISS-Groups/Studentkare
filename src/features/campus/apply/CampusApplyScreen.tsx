import React, { useEffect, useId, useRef, useState } from 'react';
import { BrandLogo, Icon } from '@/design-system/icons';
import { SkButton } from '@/design-system/primitives';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import '@/design-system/design-system.css';
import './campus-apply.css';

type Field =
  | { kind: 'text'; id: string; label: MessageKey; placeholder: MessageKey; pattern?: RegExp; error?: MessageKey; mono?: boolean; inputMode?: 'numeric' | 'email' | 'tel' }
  | { kind: 'chips'; id: string; label: MessageKey; options: readonly MessageKey[]; hint?: MessageKey }
  | { kind: 'file'; id: string; label: MessageKey }
  | { kind: 'check'; id: string; label: MessageKey };

interface Step { title: MessageKey; note?: MessageKey; fields: readonly Field[] }

/** The canvas form (CampusApply), four steps. */
export const APPLY_STEPS: readonly Step[] = [
  {
    title: 'campusApply.step1.title',
    fields: [
      { kind: 'text', id: 'institution', label: 'campusApply.field.institution', placeholder: 'campusApply.field.institutionHint' },
      { kind: 'text', id: 'aishe', label: 'campusApply.field.aishe', placeholder: 'campusApply.field.aisheHint', pattern: /^[CUS]-?\d{3,6}$/i, error: 'campusApply.field.aisheError', mono: true },
      { kind: 'text', id: 'students', label: 'campusApply.field.students', placeholder: 'campusApply.field.studentsHint', pattern: /^\d{2,6}$/, error: 'campusApply.field.studentsError', inputMode: 'numeric' },
      { kind: 'chips', id: 'hostels', label: 'campusApply.field.hostels', options: ['campusApply.hostels.on', 'campusApply.hostels.off', 'campusApply.hostels.none'] },
    ],
  },
  {
    title: 'campusApply.step2.title',
    note: 'campusApply.step2.note',
    fields: [
      { kind: 'text', id: 'admin', label: 'campusApply.field.admin', placeholder: 'campusApply.field.adminHint', pattern: /@/, error: 'campusApply.field.adminError' },
      { kind: 'text', id: 'desk', label: 'campusApply.field.desk', placeholder: 'campusApply.field.deskHint', inputMode: 'tel' },
      { kind: 'text', id: 'counsellor', label: 'campusApply.field.counsellor', placeholder: 'campusApply.field.counsellorHint' },
      { kind: 'text', id: 'hospital', label: 'campusApply.field.hospital', placeholder: 'campusApply.field.hospitalHint' },
    ],
  },
  {
    title: 'campusApply.step3.title',
    fields: [
      { kind: 'file', id: 'roll', label: 'campusApply.field.roll' },
      { kind: 'chips', id: 'verify', label: 'campusApply.field.verify', options: ['campusApply.verify.roll', 'campusApply.verify.desk'] },
      { kind: 'check', id: 'noHealth', label: 'campusApply.field.noHealth' },
    ],
  },
  {
    title: 'campusApply.step4.title',
    fields: [
      { kind: 'chips', id: 'plan', label: 'campusApply.field.plan', options: ['campusApply.plan.pilot', 'campusApply.plan.campus'], hint: 'campusApply.field.planHint' },
      { kind: 'check', id: 'dpa', label: 'campusApply.field.dpa' },
      { kind: 'check', id: 'crisis', label: 'campusApply.field.crisis' },
    ],
  },
];

const MIN_TEXT = 2;
type Values = Record<string, string | boolean>;

export function fieldOk(field: Field, value: string | boolean | undefined): boolean {
  if (field.kind === 'text') {
    const text = typeof value === 'string' ? value.trim() : '';
    return field.pattern ? field.pattern.test(text) : text.length >= MIN_TEXT;
  }
  return Boolean(value);
}

/**
 * `/campuses/apply` — public (design page 4, CampusApply; Tier 3). A campus
 * applying to join. No endpoint receives campus applications yet, so the page
 * says so at the top, the form only checks what is typed (nothing leaves this
 * page, the roll list is never uploaded), and the final "Send for signature"
 * is disabled with the reason.
 */
export function CampusApplyScreen(): React.ReactElement {
  const t = useT();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>({});
  const [tried, setTried] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shown = useRef(step);
  const current = APPLY_STEPS[step];
  const last = step === APPLY_STEPS.length - 1;
  const ok = current.fields.every((field) => fieldOk(field, values[field.id]));

  // A new step: move focus to its title so screen readers announce it.
  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    titleRef.current?.focus();
  }, [step]);

  const set = (id: string, value: string | boolean) => setValues((previous) => ({ ...previous, [id]: value }));
  const next = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ok) { setTried(true); return; }
    if (!last) { setTried(false); setStep(step + 1); }
  };

  return (
    <div className="sk-ds ca-page">
      <header className="ca-top">
        <a className="ca-brand" href="/campuses" onClick={(event) => { event.preventDefault(); navigate('campuses'); }}>
          <BrandLogo size={30} />
          <span className="ca-brand__name">{t('campusShell.brandFirst')}<em>{' '}{t('campusShell.brandSecond')}</em></span>
          <span className="sk-visually-hidden">{t('campusApply.homeHint')}</span>
        </a>
        <span className="ca-tag">{t('campusApply.tag')}</span>
        <span className="ca-grow" />
        <a className="sk-link" href="/privacy" onClick={(event) => { event.preventDefault(); navigate('privacy'); }}>{t('campusApply.legal')}</a>
      </header>

      <main className="ca-main">
        <form className="ca-card" aria-labelledby="ca-title" onSubmit={next} noValidate>
          <div className="sk-note sk-note--attention" role="note">
            <Icon name="info" size={16} strokeWidth={1.9} />
            <span>{t('campusApply.closed')}</span>
          </div>
          <div className="ca-bars" aria-hidden="true">
            {APPLY_STEPS.map((item, index) => <span key={item.title} className={index <= step ? 'is-on' : ''} />)}
          </div>
          <p className="ca-step">{t('campusApply.stepOf', { step: step + 1, count: APPLY_STEPS.length })}</p>
          <h1 id="ca-title" className="ca-title" ref={titleRef} tabIndex={-1}>{t(current.title)}</h1>
          {current.note ? <p className="ca-note">{t(current.note)}</p> : null}
          {current.fields.map((field) => (
            <FieldView key={field.id} field={field} value={values[field.id]} showError={tried} onChange={(value) => set(field.id, value)} />
          ))}
          {tried && !ok ? <p className="ca-error" role="alert">{t('campusApply.fixHighlighted')}</p> : null}
          <div className="ca-nav">
            {step > 0 ? <SkButton variant="secondary" onClick={() => { setTried(false); setStep(step - 1); }}>{t('campusBoards.back')}</SkButton> : null}
            {last ? (
              <SkButton disabled>
                {t('campusApply.submit')}
                <span className="sk-visually-hidden">{t('campusApply.closed')}</span>
              </SkButton>
            ) : (
              <SkButton type="submit" aria-disabled={!ok || undefined}>{t('campusBoards.continue')}</SkButton>
            )}
          </div>
        </form>

        <aside className="ca-aside" aria-label={t('campusApply.asideLabel')}>
          <div className="ca-offer">
            <h2 className="ca-eyebrow ca-eyebrow--hero">{t('campusApply.gets.title')}</h2>
            <p>{t('campusApply.gets.body')}</p>
          </div>
          <div className="ca-ready">
            <h2 className="ca-eyebrow">{t('campusApply.ready.title')}</h2>
            <ul>
              <li>{t('campusApply.ready.aishe')}</li>
              <li>{t('campusApply.ready.team')}</li>
              <li>{t('campusApply.ready.contacts')}</li>
              <li>{t('campusApply.ready.roll')}</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}

function FieldView({ field, value, showError, onChange }: { field: Field; value: string | boolean | undefined; showError: boolean; onChange: (value: string | boolean) => void }): React.ReactElement {
  const t = useT();
  const id = useId();
  const errorId = useId();
  const bad = showError && !fieldOk(field, value);

  if (field.kind === 'text') {
    const text = typeof value === 'string' ? value : '';
    const wrong = bad || (Boolean(text) && Boolean(field.pattern) && !fieldOk(field, text));
    return (
      <div className="ca-field">
        <label className="ca-label" htmlFor={id}>{t(field.label)}</label>
        <input
          id={id}
          className={`ca-input${field.mono ? ' sk-mono' : ''}${wrong ? ' is-bad' : ''}`}
          value={text}
          placeholder={t(field.placeholder)}
          inputMode={field.inputMode}
          aria-invalid={wrong || undefined}
          aria-describedby={wrong ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {wrong ? <span id={errorId} className="ca-field-error">{t(field.error ?? 'campusApply.checkThis')}</span> : null}
      </div>
    );
  }

  if (field.kind === 'chips') {
    return (
      <div className="ca-field">
        <span className="ca-label" id={id}>{t(field.label)}</span>
        <div className="ca-chips" role="radiogroup" aria-labelledby={id} aria-invalid={bad || undefined}>
          {field.options.map((option) => (
            <button key={option} type="button" role="radio" aria-checked={value === option} className={`ca-chip${value === option ? ' is-on' : ''}`} onClick={() => onChange(option)}>
              {t(option)}
            </button>
          ))}
        </div>
        {field.hint ? <span className="ca-hint">{t(field.hint)}</span> : null}
      </div>
    );
  }

  if (field.kind === 'file') {
    const name = typeof value === 'string' ? value : '';
    return (
      <div className="ca-field">
        <label className={`ca-upload${name ? ' is-done' : ''}${bad ? ' is-bad' : ''}`} htmlFor={id}>
          <span className="ca-upload__text">
            <strong>{t(field.label)}</strong>
            <span>{name ? t('campusApply.upload.chosen', { name }) : t('campusApply.upload.pick')}</span>
          </span>
          {name ? <Icon name="check" size={18} strokeWidth={2.4} /> : null}
        </label>
        <input id={id} className="sk-visually-hidden" type="file" accept=".csv,text/csv" onChange={(event) => onChange(event.target.files?.[0]?.name ?? '')} />
      </div>
    );
  }

  const on = value === true;
  return (
    <label className={`ca-check${bad ? ' is-bad' : ''}`}>
      <input type="checkbox" className="sk-visually-hidden" checked={on} onChange={(event) => onChange(event.target.checked)} />
      <span className={`ca-check__box${on ? ' is-on' : ''}`} aria-hidden="true">{on ? <Icon name="check" size={15} strokeWidth={2.6} /> : null}</span>
      <span>{t(field.label)}</span>
    </label>
  );
}
