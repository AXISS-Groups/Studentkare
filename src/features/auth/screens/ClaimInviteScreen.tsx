import React, { useEffect, useId, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLanguage, useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { usePhoneFrame } from '@/design-system/navigation/usePhoneFrame';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate } from '@/lib/utils/workflowRouting';
import { ClaimInviteViewModel, CLAIM_STEPS, tokenFromHash } from '../viewmodel/ClaimInviteViewModel';
import { SignInFrame } from '../views/SignInFrame';
import { SignupConsent } from '../views/SignupConsent';
import { PasswordInput } from '../views/StudentPasswordViews';
import '../views/sign-in-frame.css';

/**
 * /claim#token=… (B2B; plan tier1-auth-password-2026-10-22, amendment b). A
 * partner college made this student's account; its link opens this page and the
 * college hands over the temporary password separately. Four steps in the
 * sign-in frame: the temporary password, a password of their own, their own date
 * of birth, their own consent. One request at the end; only then a session, and
 * on to Account ready (which offers the optional PIN, the common flow).
 *
 * The token is read from the fragment and then removed from the address bar, so
 * it isn't left in history or shared by copying the URL.
 */
export const ClaimInviteScreen = observer(function ClaimInviteScreen() {
  const t = useT();
  const auth = useAuth();
  const { lang } = useLanguage();
  const phone = usePhoneFrame();
  const [vm] = useState(() => new ClaimInviteViewModel());
  const errorId = useId();
  const hintId = useId();

  useEffect(() => {
    const token = tokenFromHash(window.location.hash);
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
    void vm.load(token);
    return () => vm.dispose();
  }, [vm]);

  const problem = vm.problem ? (
    <p className="sk-signin__error" id={errorId} role="alert">
      <Icon name="alert-circle-4" size={16} />
      {vm.problem.message && (vm.problem.key === 'claim.tempFailed' || vm.problem.key === 'claim.refused')
        ? vm.problem.message : t(vm.problem.key, { min: vm.minLength })}
    </p>
  ) : null;
  const progress = (
    <p className="sk-signin__hint" role="status">{t('claim.stepOf', { position: vm.position, total: CLAIM_STEPS.length })}</p>
  );

  let body: React.ReactNode;
  if (vm.phase === 'loading') {
    body = <p className="sk-signin__lead" role="status">{t('claim.loading')}</p>;
  } else if (vm.phase === 'invalid' || !vm.summary) {
    body = (
      <div className="sk-signin__column">
        <div className="sk-signin__head">
          <h1 className="sk-signin__title">{t('claim.invalid.title')}</h1>
          <p className="sk-signin__lead">{t('claim.invalid.body')}</p>
        </div>
        <button type="button" className="sk-signin__secondary" onClick={() => navigate('login')}>{t('claim.invalid.signIn')}</button>
      </div>
    );
  } else if (vm.step === 'consent') {
    body = (
      <form onSubmit={(event) => {
        event.preventDefault();
        void vm.claim(lang, (response) => { auth.acceptSession(response); navigate('account-ready'); });
      }}>
        {problem}
        <SignupConsent consent={vm.consent} busy={vm.busy} onBack={vm.back} progress={{ position: vm.position, total: CLAIM_STEPS.length }} />
      </form>
    );
  } else {
    const summary = vm.summary;
    body = (
      <form className="sk-signin__column" onSubmit={(event) => { event.preventDefault(); vm.next(); }}>
        <div className="sk-signin__head">
          <h1 className="sk-signin__title">{t('claim.title', { name: summary.firstName })}</h1>
          <p className="sk-signin__lead">{t('claim.lead', { university: summary.university })}</p>
        </div>
        {progress}
        {vm.step === 'temp' ? (
          <>
            <PasswordInput id="sk-claim-temp" label={t('claim.temp.label')} value={vm.tempPassword} onChange={vm.setTemp}
              autoComplete="current-password" invalid={Boolean(vm.problem)} describedBy={vm.problem ? `${errorId} ${hintId}` : hintId} autoFocus />
            <p className="sk-signin__hint" id={hintId}>{t('claim.temp.hint', { sentTo: summary.sentTo })}</p>
          </>
        ) : null}
        {vm.step === 'password' ? (
          <>
            <PasswordInput id="sk-claim-password" label={t('authpw.create.label')} value={vm.password} onChange={vm.setPassword}
              autoComplete="new-password" invalid={Boolean(vm.problem)} describedBy={vm.problem ? `${errorId} ${hintId}` : hintId} autoFocus />
            <PasswordInput id="sk-claim-again" label={t('authpw.create.again')} value={vm.again} onChange={vm.setAgain}
              autoComplete="new-password" invalid={vm.problem?.key === 'authpw.mismatch'} describedBy={hintId} />
            <p className="sk-signin__hint" id={hintId}>{t('claim.password.hint', { min: vm.minLength })}</p>
          </>
        ) : null}
        {vm.step === 'dob' ? (
          <div className="sk-signin__field">
            <label className="sk-signin__label" htmlFor="sk-claim-dob">{t('auth.dob')}</label>
            <div className="sk-signin__input" data-invalid={Boolean(vm.problem)}>
              <input id="sk-claim-dob" type="date" required value={vm.dob} onChange={(event) => vm.setDob(event.target.value)}
                aria-invalid={Boolean(vm.problem)} aria-describedby={vm.problem ? `${errorId} ${hintId}` : hintId} />
            </div>
            <p className="sk-signin__hint" id={hintId}>{t('claim.dob.hint')}</p>
          </div>
        ) : null}
        {problem}
        <button type="submit" className="sk-signin__primary" disabled={vm.busy}>
          {t('claim.continue')}
          <Icon name="arrow-right" size={20} />
        </button>
        {vm.step !== 'temp' ? (
          <button type="button" className="sk-signin__secondary" onClick={vm.back} disabled={vm.busy}>
            <Icon name="arrow-left" size={16} />
            {t('claim.back')}
          </button>
        ) : null}
      </form>
    );
  }

  return (
    <SignInFrame web={!phone} regionLabel="claim.region" onBack={vm.phase === 'ready' && vm.step !== 'temp' ? vm.back : undefined}>
      {body}
    </SignInFrame>
  );
});
