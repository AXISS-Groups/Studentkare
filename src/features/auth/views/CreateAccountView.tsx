import React from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { SubmitButton } from '@/components/interface/WorkflowUI';
import type { AuthViewModel } from '../viewmodel/AuthViewModel';
import { channelFieldCopy, channelIsDeliverable, signupProgress, type AuthChannel } from './channelCopy';
import './auth-form.css';
import './create-account.css';

const CHANNELS: ReadonlyArray<{ id: AuthChannel; label: MessageKey }> = [
  { id: 'EMAIL', label: 'auth.channel.EMAIL' },
  { id: 'WHATSAPP', label: 'auth.channel.WHATSAPP' },
];

/**
 * Create account — the contact step of signing up (design page 1, CreateAccount).
 *
 * Binds to the existing AuthViewModel and adds no state or API calls of its own;
 * the back arrow returns to the intro step the flow already has.
 *
 * Where it differs from the picture, and why:
 *
 *   - The design puts a campus email AND a WhatsApp number on one form. The
 *     API takes one: POST /auth/otp/send accepts a single `identifier` plus a
 *     `channel`. So this offers the same choice the server can honour rather
 *     than a second field that would be dropped on the floor. The chosen field
 *     is drawn as the board draws it (mail icon, or the +91 prefix).
 *
 *   - The design numbers this "1 of 6". It is shown at its real position in
 *     the implemented flow, which also has six steps but a different set of
 *     them. A progress bar that lies about where you are is worse than one
 *     that disagrees with a mock-up.
 *
 *   - Full name is collected here, as designed. The API wants it after
 *     verification, at POST /auth/signup, so it is held on the view model and
 *     the later step opens pre-filled. Nothing is sent early.
 */
export const CreateAccountView = observer(function CreateAccountView({ vm }: { vm: AuthViewModel }) {
  const t = useT();
  const copy = channelFieldCopy(vm.channel);
  const deliverable = channelIsDeliverable(vm.channel, vm.channels);
  const { position, total } = signupProgress(vm.step);
  const whatsapp = vm.channel === 'WHATSAPP';
  // The design carries this promise on the WhatsApp field, where a student is
  // handing over a number and reasonably wonders what else it will be used for.
  const hint = t(whatsapp ? 'auth.signup.hint.WHATSAPP' : 'auth.signup.hint.EMAIL');

  return (
    <div className="sk-authform sk-authform--create">
      <div className="sk-create__top">
        <button type="button" className="sk-create__back" onClick={() => vm.advance(1)} aria-label={t('common.back')}>
          <Icon name="arrow-left" size={20} />
        </button>
        <div
          className="sk-create__track"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={position}
          aria-label={t('auth.signup.stepOf', { position, total })}
        >
          {Array.from({ length: total }, (_, index) => (
            <span key={index} data-done={index < position ? 'true' : 'false'} />
          ))}
        </div>
        <span className="sk-create__step" aria-hidden="true">
          {t('auth.signup.position', { position, total })}
        </span>
      </div>

      <div className="sk-authform__head">
        <h1 className="sk-authform__title">{t('auth.signup.title')}</h1>
        <p className="sk-authform__lead">{t('auth.signup.lead')}</p>
      </div>

      <label className="sk-create__field" htmlFor="sk-create-name">
        <span className="sk-create__label">{t('auth.fullName')}</span>
        <span className="sk-create__control">
          <Icon name="user-5" size={18} />
          <input
            id="sk-create-name"
            required
            type="text"
            autoComplete="name"
            value={vm.fullName}
            onChange={(event) => vm.setField('fullName', event.target.value)}
            maxLength={120}
            placeholder={t('auth.fullNameHint')}
          />
        </span>
      </label>

      <div className="sk-authform__channels" role="group" aria-label={t('auth.channels')}>
        {CHANNELS.map(({ id, label }) => (
          <button key={id} type="button" aria-pressed={vm.channel === id} onClick={() => vm.setChannel(id)}>
            {t(label)}
          </button>
        ))}
      </div>

      <label className="sk-create__field" htmlFor="sk-create-contact">
        <span className="sk-create__label">{t(copy.label)}</span>
        <span className="sk-create__control">
          {whatsapp ? (
            <span className="sk-create__prefix">{t('launch.create.countryCode')}</span>
          ) : (
            <Icon name="mail-2" size={18} />
          )}
          <input
            id="sk-create-contact"
            required
            type={copy.inputType}
            inputMode={whatsapp ? 'tel' : 'email'}
            autoComplete={copy.autoComplete}
            value={vm.identifier}
            onChange={(event) => vm.setIdentifier(event.target.value)}
            maxLength={254}
            placeholder={whatsapp ? t('launch.create.phonePlaceholder') : copy.placeholder}
            aria-describedby="sk-create-contact-hint"
          />
        </span>
        <span className="sk-create__hint" id="sk-create-contact-hint">{hint}</span>
      </label>

      {vm.optionsError && (
        <div className="wf-notice" role="status">
          {vm.optionsError}
        </div>
      )}

      {!deliverable && (
        <div className="wf-notice" role="status">
          {t('auth.notConfigured', { channel: t(whatsapp ? 'auth.channel.WHATSAPP' : 'auth.channel.EMAIL') })}
        </div>
      )}

      <p className="sk-create__assurance">
        <Icon name="shield-check-4" size={18} />
        {t('auth.signup.assurance')}
      </p>

      <SubmitButton busy={vm.busy} disabled={!deliverable}>
        {vm.busy ? t('auth.sending') : t('auth.sendCode')}
      </SubmitButton>
    </div>
  );
});
