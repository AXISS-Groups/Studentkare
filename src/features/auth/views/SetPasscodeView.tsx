import React, { useId, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT, type MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { PasscodeViewModel } from '../viewmodel/PasscodeViewModel';
import type { PasscodeStrength } from '../viewmodel/passcodeRules';
import { PASSCODE_MAX_LENGTH } from '../viewmodel/passcodeRules';
import './sign-in-frame.css';

const STRENGTH_COPY: Record<PasscodeStrength, MessageKey> = {
  empty: 'authpc.strength.empty',
  weak: 'authpc.strength.weak',
  fair: 'authpc.strength.fair',
  strong: 'authpc.strength.strong',
};
const STRENGTH_BARS: Record<PasscodeStrength, number> = { empty: 0, weak: 1, fair: 2, strong: 3 };
const BARS = [1, 2, 3] as const;

/** The plain strength hint: a three-step bar and words (never colour alone). */
export function StrengthHint({ strength }: { strength: PasscodeStrength }): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-strength" data-strength={strength}>
      <div className="sk-strength__bars" aria-hidden="true">
        {BARS.map((bar) => <span key={bar} data-on={bar <= STRENGTH_BARS[strength] ? 'true' : 'false'} />)}
      </div>
      <p className="sk-strength__words" aria-live="polite">
        <span className="sk-sr-only">{t('authpc.strength.label')}: </span>
        {t(STRENGTH_COPY[strength])}
      </p>
    </div>
  );
}

function PasscodeField({ id, label, value, onChange, describedBy, invalid, autoComplete }: {
  id: string;
  label: MessageKey;
  value: string;
  onChange: (value: string) => void;
  describedBy?: string;
  invalid?: boolean;
  autoComplete: 'new-password' | 'current-password';
}): React.ReactElement {
  const t = useT();
  const [shown, setShown] = useState(false);
  return (
    <div className="sk-signin__field">
      <label className="sk-signin__label" htmlFor={id}>{t(label)}</label>
      <div className="sk-signin__input" data-invalid={invalid === true}>
        <Icon name="lock-keyhole" size={18} />
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={PASSCODE_MAX_LENGTH}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid === true}
          aria-describedby={describedBy}
        />
        <button type="button" className="sk-passcode__show" aria-pressed={shown} aria-label={t('authpc.enter.show')} onClick={() => setShown((s) => !s)}>
          <Icon name={shown ? 'eye-off' : 'eye'} size={20} />
        </button>
      </div>
    </div>
  );
}

const LENGTH_ROWS: readonly { length: number; copy: MessageKey; tone: 'weak' | 'fair' | 'strong' }[] = [
  { length: 4, copy: 'authpc.set.len4', tone: 'weak' },
  { length: 6, copy: 'authpc.set.len6', tone: 'fair' },
  { length: 8, copy: 'authpc.set.len8', tone: 'strong' },
];

/**
 * Add, change or reset the student's optional passcode, or turn it off (plan
 * tier1-canvas-wp03, amendment 2026-10-22 b). Says plainly that 4 characters is
 * the weakest and 8 is recommended. The server judges weakness and whether the
 * current passcode is needed; after a fresh code sign-in ("forgot passcode") it
 * isn't.
 */
export const SetPasscodeView = observer(function SetPasscodeView({ vm, onDone }: { vm: PasscodeViewModel; onDone: () => void }) {
  const t = useT();
  const ids = { hint: useId(), problem: useId(), mismatch: useId(), current: useId() };

  if (vm.phase === 'loading') {
    return <p className="sk-signin__lead" role="status">{t('authpc.set.loading')}</p>;
  }
  if (vm.phase === 'failed') {
    return (
      <div className="sk-signin__column">
        <div className="sk-auth-note sk-auth-note--attention" role="alert">
          <span className="sk-auth-note__icon"><Icon name="alert-circle-4" size={20} /></span>
          <span className="sk-auth-note__words">{t('authpc.set.loadFailed')}</span>
        </div>
        <button type="button" className="sk-signin__primary" onClick={() => void vm.load()}>{t('common.tryAgain')}</button>
        <button type="button" className="sk-signin__secondary" onClick={onDone}>{t('authpc.set.skip')}</button>
      </div>
    );
  }
  if (!vm.usable) {
    return (
      <div className="sk-signin__column">
        <div className="sk-auth-note sk-auth-note--info" role="status">
          <span className="sk-auth-note__icon"><Icon name="info" size={20} /></span>
          <span className="sk-auth-note__words">{t(vm.status?.available === false ? 'authpc.set.studentsOnly' : 'authpc.set.off')}</span>
        </div>
        <button type="button" className="sk-signin__primary" onClick={onDone}>{t('authpc.set.continue')}<Icon name="arrow-right" size={20} /></button>
      </div>
    );
  }

  const shapeProblem = vm.shapeProblem;
  const problem = vm.problem;
  const describedBy = [ids.hint, shapeProblem || problem ? ids.problem : ''].filter(Boolean).join(' ');

  return (
    <form className="sk-signin__column" onSubmit={(event) => { event.preventDefault(); void vm.save(); }}>
      <div className="sk-signin__head">
        <span className="sk-setpc__eyebrow">
          <Icon name="key" size={14} />
          {t('authpc.set.eyebrow')}
        </span>
        <h1 className="sk-signin__title">{t(`authpc.set.title.${vm.mode}`)}</h1>
        <p className="sk-signin__lead">{t('authpc.set.lead')}</p>
      </div>

      {vm.done ? (
        <div className="sk-auth-note sk-auth-note--positive" role="status">
          <span className="sk-auth-note__icon"><Icon name="check-2" size={20} /></span>
          <span className="sk-auth-note__words">{t(vm.done === 'saved' ? 'authpc.set.saved' : 'authpc.set.removed')}</span>
        </div>
      ) : null}

      <div className="sk-setpc__lengths">
        <h2 className="sk-setpc__lengths-title">{t('authpc.set.lengthsTitle')}</h2>
        <ul>
          {LENGTH_ROWS.map((row) => (
            <li key={row.length} data-tone={row.tone}>
              <span className="sk-setpc__len" aria-hidden="true">{row.length}</span>
              <span>{t(row.copy)}</span>
            </li>
          ))}
        </ul>
        <p className="sk-signin__hint">{t('authpc.set.mix')}</p>
      </div>

      {vm.needsCurrent ? (
        <>
          <PasscodeField id="sk-setpc-current" label="authpc.set.current" value={vm.current} onChange={vm.setCurrent} autoComplete="current-password" describedBy={ids.current} />
          <p className="sk-signin__hint sk-setpc__current-hint" id={ids.current}>{t('authpc.set.currentHint')}</p>
        </>
      ) : null}

      <PasscodeField id="sk-setpc-new" label="authpc.set.new" value={vm.passcode} onChange={vm.setPasscode} autoComplete="new-password" describedBy={describedBy} invalid={Boolean(problem && !problem.startsWith('authpc.set.proof'))} />
      <StrengthHint strength={vm.strength} />
      <p className="sk-sr-only" id={ids.hint}>{t('authpc.enter.hint')}</p>
      <PasscodeField id="sk-setpc-confirm" label="authpc.set.confirm" value={vm.confirm} onChange={vm.setConfirm} autoComplete="new-password" describedBy={vm.mismatch ? ids.mismatch : undefined} invalid={vm.mismatch} />
      {vm.mismatch ? <p className="sk-signin__error" id={ids.mismatch} role="alert"><Icon name="alert-circle-4" size={16} />{t('authpc.set.mismatch')}</p> : null}

      {problem || shapeProblem ? (
        <div className="sk-auth-note sk-auth-note--attention" role={problem ? 'alert' : undefined} id={ids.problem}>
          <span className="sk-auth-note__icon"><Icon name="alert-circle-4" size={20} /></span>
          <span className="sk-auth-note__words">{t(problem ?? shapeProblem ?? 'authpc.set.failed')}</span>
        </div>
      ) : null}

      <button type="submit" className="sk-signin__primary" disabled={!vm.canSave} aria-busy={vm.busy}>
        {vm.busy ? t('authpc.set.saving') : t('authpc.set.save')}
        {vm.busy ? null : <Icon name="check" size={20} />}
      </button>
      <div className="sk-remembered__links">
        <button type="button" className="sk-signin__secondary" onClick={onDone}>
          {t(vm.done ? 'authpc.set.continue' : 'authpc.set.skip')}
        </button>
        {vm.hasPasscode ? (
          <button type="button" className="sk-signin__secondary" disabled={!vm.canRemove} onClick={() => void vm.remove()}>
            {t('authpc.set.remove')}
          </button>
        ) : null}
      </div>
      <p className="sk-otp__never">{t('authpc.set.never')}</p>
    </form>
  );
});
