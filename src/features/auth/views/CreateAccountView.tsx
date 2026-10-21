import React, { useEffect, useId, useRef } from 'react';
import { useT } from '@/i18n';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import type { AuthViewModel } from '../viewmodel/AuthViewModel';
import { channelFieldCopy, channelIsDeliverable, signupProgress } from './channelCopy';
import { ChannelFailureNote, ChannelSwitch, NoChannelState, SendErrorNote } from './ChannelChoice';
import './sign-in-frame.css';
import './create-account.css';

/**
 * Create account — the contact step of signing up (design page 1, CreateAccount),
 * drawn in the same frame and field style as Sign in (Mobile 2.0).
 *
 * Binds to the existing AuthViewModel and adds no state or API calls of its own;
 * the back arrow returns to the intro step the flow already has.
 *
 * Where it differs from the picture, and why:
 *
 *   - The design puts a campus email AND a WhatsApp number on one form. The
 *     API takes one: POST /auth/otp/send accepts a single `identifier` plus a
 *     `channel`. So this offers the choice the server can honour right now
 *     (only the channels GET /auth/options returned; no switcher with one).
 *
 *   - "2 of 6" is the real position in the implemented flow, which also has six
 *     steps but a different set of them.
 *
 *   - Full name is collected here, as designed. The API wants it after
 *     verification, at POST /auth/signup, so it is held on the view model and
 *     the later step opens pre-filled. Nothing is sent early. A failed send
 *     keeps it, and "Send the code by email instead" moves focus to the email
 *     field in one tap.
 */
export const CreateAccountView = observer(function CreateAccountView({ vm }: { vm: AuthViewModel }) {
  const t = useT();
  const hintId = useId();
  const errorId = useId();
  const contact = useRef<HTMLInputElement>(null);
  const copy = channelFieldCopy(vm.channel);
  const deliverable = channelIsDeliverable(vm.channel, vm.offeredChannels);
  const { position, total } = signupProgress(vm.step);
  const whatsapp = vm.channel === 'WHATSAPP';
  // The design carries this promise on the contact field, where a student is
  // handing over a number and reasonably wonders what else it will be used for.
  const hint = t(whatsapp ? 'auth.signup.hint.WHATSAPP' : 'auth.signup.hint.EMAIL');
  useEffect(() => {
    if (vm.focusContactRequest > 0) contact.current?.focus();
  }, [vm.focusContactRequest]);

  const sendError = vm.channelFailure
    ? <ChannelFailureNote vm={vm} id={errorId} />
    : vm.error ? <SendErrorNote id={errorId} message={vm.error} /> : null;
  // Red on the field only when what was typed is the problem; a channel that is
  // down is on our side, so the field stays as it was.
  const fieldInvalid = Boolean(vm.error) && !vm.channelFailure;

  return (
    <div className="sk-create">
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

      <div className="sk-signin__head">
        <h1 className="sk-signin__title">{t('auth.signup.title')}</h1>
        <p className="sk-signin__lead">{t('auth.signup.lead')}</p>
      </div>

      {vm.noChannel ? <NoChannelState vm={vm} /> : (
        <>
          <div className="sk-signin__field">
            <label className="sk-signin__label" htmlFor="sk-create-name">{t('auth.fullName')}</label>
            <div className="sk-signin__input">
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
            </div>
          </div>

          <ChannelSwitch vm={vm} />

          <div className="sk-signin__field">
            <label className="sk-signin__label" htmlFor="sk-create-contact">{t(copy.label)}</label>
            <div className="sk-signin__input" data-invalid={fieldInvalid}>
              {whatsapp ? (
                <span className="sk-signin__prefix">{t('launch.create.countryCode')}</span>
              ) : (
                <Icon name="mail-2" size={18} />
              )}
              <input
                ref={contact}
                id="sk-create-contact"
                required
                type={copy.inputType}
                inputMode={whatsapp ? 'tel' : 'email'}
                autoComplete={copy.autoComplete}
                value={vm.identifier}
                onChange={(event) => vm.setIdentifier(event.target.value)}
                maxLength={254}
                placeholder={whatsapp ? t('launch.create.phonePlaceholder') : copy.placeholder}
                aria-invalid={fieldInvalid}
                aria-describedby={sendError ? `${errorId} ${hintId}` : hintId}
              />
            </div>
            <p className="sk-signin__hint" id={hintId}>{hint}</p>
          </div>

          {sendError}
          {vm.optionsError && !vm.optionsLoaded ? <p className="sk-signin__hint" role="status">{t('authch.optionsError')}</p> : null}
          {!deliverable && !vm.channelFailure ? (
            <p className="sk-signin__hint" role="status">
              {t('auth.notConfigured', { channel: t(whatsapp ? 'auth.channel.WHATSAPP' : 'auth.channel.EMAIL') })}
            </p>
          ) : null}

          <p className="sk-create__assurance">
            <span className="sk-create__assurance-tile"><Icon name="shield-check-4" size={18} /></span>
            {t('auth.signup.assurance')}
          </p>

          <button type="submit" className="sk-signin__primary" disabled={!deliverable || vm.busy} aria-busy={vm.busy}>
            {vm.busy ? t('auth.sending') : t('auth.sendCode')}
            {vm.busy ? null : <Icon name="arrow-right" size={20} />}
          </button>
        </>
      )}
    </div>
  );
});
