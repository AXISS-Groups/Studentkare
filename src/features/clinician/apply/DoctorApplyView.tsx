import React, { useEffect, useId, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { SkButton } from '@/design-system';
import { BrandLogo, Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import type { DoctorApplyViewModel } from './DoctorApplyViewModel';
import type { ApplyField } from './applyModel';
import { APPLY_TRACK } from './applyModel';
import './doctor-apply.css';

/** The brand name is never translated (DESIGN.md §3); "Kare" is set in the serif italic. */
const WORDMARK = { first: 'Student', second: 'Kare' } as const;

export interface DoctorApplyViewProps {
  viewModel: DoctorApplyViewModel;
  onNavigate: (route: RoutePath) => void;
}

/** Public page: a doctor applying to join. Web and phone from one layout. */
export const DoctorApplyView = observer(function DoctorApplyView({ viewModel, onNavigate }: DoctorApplyViewProps): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-ds da-page">
      <header className="da-top">
        <button type="button" className="da-back" aria-label={t('clinApply.back')} onClick={() => onNavigate('clinicians')}>
          <Icon name="chevron-left" size={18} strokeWidth={2.2} />
        </button>
        <button type="button" className="da-brand" onClick={() => onNavigate('clinicians')} aria-label={t('clinApply.brandLabel')}>
          <BrandLogo size={32} label="" />
          <span className="da-brand__name">{WORDMARK.first}<em>&nbsp;{WORDMARK.second}</em></span>
        </button>
        <span className="da-tag">{t('clinApply.tag')}</span>
        <span className="da-phone-title">{t('clinApply.phoneTitle')}</span>
        <span className="da-grow" />
        <button type="button" className="sk-link da-legal" onClick={() => onNavigate('privacy')}>{t('clinApply.legal')}</button>
      </header>

      <main className="da-main">
        <section className="da-card" aria-labelledby="da-title">
          {!viewModel.open ? <ClosedNotice onNavigate={onNavigate} /> : viewModel.phase === 'done' ? <Received reference={viewModel.reference} /> : <StepForm viewModel={viewModel} />}
        </section>

        <aside className="da-aside" aria-label={t('clinApply.asideLabel')}>
          <div className="da-offer">
            <h2 className="da-eyebrow da-eyebrow--hero">{t('clinApply.offerTitle')}</h2>
            <p>{t('clinApply.offerBody')}</p>
          </div>
          <div className="da-ready">
            <h2 className="da-eyebrow">{t('clinApply.readyTitle')}</h2>
            <ul>
              <li>{t('clinApply.ready1')}</li>
              <li>{t('clinApply.ready2')}</li>
              <li>{t('clinApply.ready3')}</li>
              <li>{t('clinApply.ready4')}</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
});

/* ------------------------------------------------------------- the form */

const StepForm = observer(function StepForm({ viewModel }: { viewModel: DoctorApplyViewModel }): React.ReactElement {
  const t = useT();
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { step, stepIndex, steps } = viewModel;
  const busy = viewModel.phase === 'submitting';

  // A new step: move focus to its title so screen readers announce it.
  // Compared with the last step seen, not "first render", so React's
  // development double-run of effects doesn't steal focus on load.
  const shownStep = useRef(stepIndex);
  useEffect(() => {
    if (shownStep.current === stepIndex) return;
    shownStep.current = stepIndex;
    titleRef.current?.focus();
  }, [stepIndex]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const firstBad = await viewModel.next();
    if (firstBad) formRef.current?.querySelector<HTMLElement>(`[data-field="${firstBad}"]`)?.focus();
  };

  return (
    <form ref={formRef} className="da-form" noValidate onSubmit={(event) => { void onSubmit(event); }}>
      <div className="da-progress">
        <div className="da-bars" aria-hidden="true">
          {steps.map((s, i) => <span key={s.id} className={`da-bar${i <= stepIndex ? ' is-done' : ''}`} />)}
        </div>
        <span className="da-stepn">{t('clinApply.stepOf', { n: stepIndex + 1, total: steps.length })}</span>
        <h1 id="da-title" className="da-title" ref={titleRef} tabIndex={-1}>{t(step.title)}</h1>
        {step.note ? <p className="da-note">{t(step.note)}</p> : null}
      </div>

      <div className="da-fields" key={stepIndex}>
        {step.fields.map((field) => <Field key={field.key} field={field} viewModel={viewModel} />)}
      </div>

      {viewModel.submitError ? <p className="da-submit-error" role="alert">{t(viewModel.submitError)}</p> : null}

      <div className="da-actions">
        {stepIndex > 0 ? <SkButton variant="secondary" className="da-btn da-btn--back" onClick={viewModel.back} disabled={busy}>{t('clinApply.backStep')}</SkButton> : null}
        <SkButton type="submit" className={`da-btn da-btn--next${viewModel.canContinue ? '' : ' is-incomplete'}`} busy={busy}>
          {t(viewModel.isLastStep ? 'clinApply.submit' : 'clinApply.continue')}
        </SkButton>
      </div>
      {viewModel.showErrors && !viewModel.canContinue ? (
        <p className="sk-visually-hidden" role="status">{t('clinApply.fixHighlighted')}</p>
      ) : null}
    </form>
  );
});

const Field = observer(function Field({ field, viewModel }: { field: ApplyField; viewModel: DoctorApplyViewModel }): React.ReactElement {
  const t = useT();
  const id = useId();
  const errorKey = viewModel.errorFor(field.key);
  const errorId = `${id}-error`;
  const value = viewModel.values[field.key];
  const describedBy = errorKey ? errorId : undefined;
  const errorLine = errorKey ? <span id={errorId} className="da-error">{t(errorKey)}</span> : null;
  const error = errorKey !== null;

  if (field.kind === 'text') {
    return (
      <div className="da-field">
        <label className="da-label" htmlFor={id}>{t(field.label)}</label>
        <input
          id={id}
          data-field={field.key}
          className={`da-input${field.mono ? ' sk-mono' : ''}${error ? ' is-invalid' : ''}`}
          type="text"
          value={typeof value === 'string' ? value : ''}
          placeholder={t(field.placeholder)}
          autoComplete={field.autoComplete ?? 'off'}
          inputMode={field.inputMode}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => viewModel.set(field.key, event.target.value)}
        />
        {errorLine}
      </div>
    );
  }

  if (field.kind === 'choice' || field.kind === 'multi') {
    const multi = field.kind === 'multi';
    const selected = (option: string) => (multi ? Array.isArray(value) && value.includes(option) : value === option);
    return (
      <fieldset className="da-field da-fieldset" aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
        <legend className="da-label">{t(field.label)}{multi ? <span className="sk-visually-hidden">{t('clinApply.chooseAny')}</span> : null}</legend>
        <div className="da-chips">
          {field.options.map((option, index) => (
            <label key={option.id} className={`da-chip${selected(option.id) ? ' is-on' : ''}`}>
              <input
                className="da-chip__input"
                type={multi ? 'checkbox' : 'radio'}
                name={`${id}-${field.key}`}
                data-field={index === 0 ? field.key : undefined}
                checked={selected(option.id)}
                onChange={() => (multi ? viewModel.toggle(field.key, option.id) : viewModel.set(field.key, option.id))}
              />
              {t(option.label)}
            </label>
          ))}
        </div>
        {errorLine}
      </fieldset>
    );
  }

  if (field.kind === 'upload') {
    const file = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    return (
      <div className="da-field">
        <label className={`da-upload${file ? ' is-added' : ''}${error ? ' is-invalid' : ''}`}>
          <span className="da-upload__label">{t(field.label)}</span>
          <span className="da-upload__state">{file ? t('clinApply.added', { name: file.name }) : t('clinApply.upload')}</span>
          <input
            className="da-upload__input"
            data-field={field.key}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/heic,image/heif,image/webp"
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            onChange={(event) => viewModel.attach(field.key, event.target.files?.[0] ?? null)}
          />
        </label>
        {errorLine}
      </div>
    );
  }

  const checked = value === true;
  return (
    <div className="da-field">
      <label className={`da-agree${checked ? ' is-on' : ''}${error ? ' is-invalid' : ''}`}>
        <input
          className="da-agree__input"
          data-field={field.key}
          type="checkbox"
          checked={checked}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          onChange={() => viewModel.set(field.key, !checked)}
        />
        <span className="da-agree__box" aria-hidden="true">{checked ? <Icon name="check" size={14} strokeWidth={3} /> : null}</span>
        <span className="da-agree__text">{t(field.label)}</span>
      </label>
      {errorLine}
    </div>
  );
});

/* ---------------------------------------------------------- after submit */

function Received({ reference }: { reference: string | null }): React.ReactElement {
  const t = useT();
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  return (
    <div className="da-done" role="status">
      <div className="da-done__head">
        <span className="da-done__badge" aria-hidden="true"><Icon name="check" size={30} strokeWidth={2.8} /></span>
        <span className="da-done__titles">
          <h1 id="da-title" className="da-done__title" ref={titleRef} tabIndex={-1}>{t('clinApply.received')}</h1>
          {reference ? <span className="da-done__ref sk-mono">{t('clinApply.reference', { reference })}</span> : null}
        </span>
      </div>
      <ol className="da-track" aria-label={t('clinApply.whatNext')}>
        {APPLY_TRACK.map((item, index) => (
          <li key={item} className={`da-track__item${index === 0 ? ' is-done' : index === 1 ? ' is-next' : ''}`}>
            <span className="da-track__dot" aria-hidden="true" />
            <span className="da-track__label">
              {index === 0 ? <span className="sk-visually-hidden">{t('clinApply.trackDone')}</span> : index === 1 ? <span className="sk-visually-hidden">{t('clinApply.trackNext')}</span> : null}
              {t(item)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ClosedNotice({ onNavigate }: { onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const t = useT();
  return (
    <div className="da-closed">
      <h1 id="da-title" className="da-title">{t('clinApply.closedTitle')}</h1>
      <p className="da-note">{t('clinApply.closedBody')}</p>
      <div className="da-actions">
        <SkButton className="da-btn" onClick={() => onNavigate('clinicians')}>{t('clinApply.closedAction')}</SkButton>
      </div>
    </div>
  );
}
