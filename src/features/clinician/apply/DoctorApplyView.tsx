import React, { useEffect, useId, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { SkButton, SkIcon } from '@/design-system';
import type { RoutePath } from '@/lib/workflowRouting';
import type { DoctorApplyViewModel } from './DoctorApplyViewModel';
import type { ApplyField } from './applyModel';
import { APPLY_TRACK } from './applyModel';
import './doctor-apply.css';

export interface DoctorApplyViewProps {
  viewModel: DoctorApplyViewModel;
  onNavigate: (route: RoutePath) => void;
}

/** Public page: a doctor applying to join. Web and phone from one layout. */
export const DoctorApplyView = observer(function DoctorApplyView({ viewModel, onNavigate }: DoctorApplyViewProps): React.ReactElement {
  return (
    <div className="sk-ds da-page">
      <header className="da-top">
        <button type="button" className="da-back" aria-label="Back to the page for clinicians" onClick={() => onNavigate('clinicians')}>
          <SkIcon name="back" size={18} strokeWidth={2.2} />
        </button>
        <button type="button" className="da-brand" onClick={() => onNavigate('clinicians')} aria-label="Student Kare for doctors">
          <img src="/brand/sk-shield.svg" width={32} height={36} alt="" />
          <span className="da-brand__name">Student<em>&nbsp;Kare</em></span>
        </button>
        <span className="da-tag">DOCTORS</span>
        <span className="da-phone-title">Join as a doctor</span>
        <span className="da-grow" />
        <button type="button" className="sk-link da-legal" onClick={() => onNavigate('privacy')}>Privacy &amp; terms</button>
      </header>

      <main className="da-main">
        <section className="da-card" aria-labelledby="da-title">
          {!viewModel.open ? <ClosedNotice onNavigate={onNavigate} /> : viewModel.phase === 'done' ? <Received reference={viewModel.reference} /> : <StepForm viewModel={viewModel} />}
        </section>

        <aside className="da-aside" aria-label="About joining">
          <div className="da-offer">
            <h2 className="da-eyebrow da-eyebrow--hero">WHAT YOU GET</h2>
            <p>Students on 3 campuses · records they choose to share · e-prescriptions signed in the app · weekly payouts, 10% commission printed on every statement.</p>
          </div>
          <div className="da-ready">
            <h2 className="da-eyebrow">HAVE READY</h2>
            <ul>
              <li>Your NMC / state registration number and certificate</li>
              <li>Degree certificate</li>
              <li>Your preferred fee and languages</li>
              <li>About 10 minutes</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
});

/* ------------------------------------------------------------- the form */

const StepForm = observer(function StepForm({ viewModel }: { viewModel: DoctorApplyViewModel }): React.ReactElement {
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
          {steps.map((s, i) => <span key={s.title} className={`da-bar${i <= stepIndex ? ' is-done' : ''}`} />)}
        </div>
        <span className="da-stepn">Step {stepIndex + 1} of {steps.length}</span>
        <h1 id="da-title" className="da-title" ref={titleRef} tabIndex={-1}>{step.title}</h1>
        {step.note ? <p className="da-note">{step.note}</p> : null}
      </div>

      <div className="da-fields" key={stepIndex}>
        {step.fields.map((field) => <Field key={field.key} field={field} viewModel={viewModel} />)}
      </div>

      {viewModel.submitError ? <p className="da-submit-error" role="alert">{viewModel.submitError}</p> : null}

      <div className="da-actions">
        {stepIndex > 0 ? <SkButton variant="secondary" className="da-btn da-btn--back" onClick={viewModel.back} disabled={busy}>Back</SkButton> : null}
        <SkButton type="submit" className={`da-btn da-btn--next${viewModel.canContinue ? '' : ' is-incomplete'}`} busy={busy}>
          {viewModel.isLastStep ? 'Submit application' : 'Continue'}
        </SkButton>
      </div>
      {viewModel.showErrors && !viewModel.canContinue ? (
        <p className="sk-visually-hidden" role="status">Fill in the highlighted items to continue.</p>
      ) : null}
    </form>
  );
});

const Field = observer(function Field({ field, viewModel }: { field: ApplyField; viewModel: DoctorApplyViewModel }): React.ReactElement {
  const id = useId();
  const error = viewModel.errorFor(field.key);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const value = viewModel.values[field.key];
  const describedBy = [error ? errorId : '', 'hint' in field && field.hint ? hintId : ''].filter(Boolean).join(' ') || undefined;
  const errorLine = error ? <span id={errorId} className="da-error">{error}</span> : null;

  if (field.kind === 'text') {
    return (
      <div className="da-field">
        <label className="da-label" htmlFor={id}>{field.label.toUpperCase()}</label>
        <input
          id={id}
          data-field={field.key}
          className={`da-input${field.mono ? ' sk-mono' : ''}${error ? ' is-invalid' : ''}`}
          type="text"
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
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
        <legend className="da-label">{field.label.toUpperCase()}{multi ? <span className="sk-visually-hidden"> (choose any)</span> : null}</legend>
        <div className="da-chips">
          {field.options.map((option, index) => (
            <label key={option} className={`da-chip${selected(option) ? ' is-on' : ''}`}>
              <input
                className="da-chip__input"
                type={multi ? 'checkbox' : 'radio'}
                name={`${id}-${field.key}`}
                data-field={index === 0 ? field.key : undefined}
                checked={selected(option)}
                onChange={() => (multi ? viewModel.toggle(field.key, option) : viewModel.set(field.key, option))}
              />
              {option}
            </label>
          ))}
        </div>
        {errorLine}
        {field.kind === 'choice' && field.hint ? <span id={hintId} className="da-hint">{field.hint}</span> : null}
      </fieldset>
    );
  }

  if (field.kind === 'upload') {
    const file = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    return (
      <div className="da-field">
        <label className={`da-upload${file ? ' is-added' : ''}${error ? ' is-invalid' : ''}`}>
          <span className="da-upload__label">{field.label}</span>
          <span className="da-upload__state">{file ? `Added · ${file.name}` : 'Upload PDF or photo'}</span>
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
        <span className="da-agree__box" aria-hidden="true">{checked ? <SkIcon name="check" size={14} strokeWidth={3} /> : null}</span>
        <span className="da-agree__text">{field.label}</span>
      </label>
      {errorLine}
    </div>
  );
});

/* ---------------------------------------------------------- after submit */

function Received({ reference }: { reference: string | null }): React.ReactElement {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  return (
    <div className="da-done" role="status">
      <div className="da-done__head">
        <span className="da-done__badge" aria-hidden="true"><SkIcon name="check" size={30} strokeWidth={2.8} /></span>
        <span className="da-done__titles">
          <h1 id="da-title" className="da-done__title" ref={titleRef} tabIndex={-1}>Application received</h1>
          {reference ? <span className="da-done__ref sk-mono">ref {reference}</span> : null}
        </span>
      </div>
      <ol className="da-track" aria-label="What happens next">
        {APPLY_TRACK.map((item, index) => (
          <li key={item.label} className={`da-track__item${index === 0 ? ' is-done' : index === 1 ? ' is-next' : ''}`}>
            <span className="da-track__dot" aria-hidden="true" />
            <span className="da-track__label">
              {index === 0 ? <span className="sk-visually-hidden">Done: </span> : index === 1 ? <span className="sk-visually-hidden">Next: </span> : null}
              {item.label}
            </span>
            {item.when ? <span className="da-track__when">{item.when}</span> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ClosedNotice({ onNavigate }: { onNavigate: (route: RoutePath) => void }): React.ReactElement {
  return (
    <div className="da-closed">
      <h1 id="da-title" className="da-title">Online applications aren’t open yet.</h1>
      <p className="da-note">
        We’re not taking doctor applications through this page yet, so we won’t ask you to fill in a form that goes nowhere. The page for clinicians explains how Student Kare works with doctors today.
      </p>
      <div className="da-actions">
        <SkButton className="da-btn" onClick={() => onNavigate('clinicians')}>Read about working with us</SkButton>
      </div>
    </div>
  );
}
