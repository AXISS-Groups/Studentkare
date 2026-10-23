import React, { useId, useState } from 'react';
import { useT } from '@/i18n';
import { Icon } from '../icons';
import './public-site.css';

export type NewsletterChannel = 'whatsapp' | 'email';

export interface NewsletterRequest {
  channel: NewsletterChannel;
  /** E.164 for WhatsApp (+91…), the trimmed address for email. */
  address: string;
}

export interface NewsletterBandProps {
  /**
   * Sends the opt-in. Leave it out while no service receives sign-ups: the
   * band then says sign-up is not open and collects nothing (DESIGN.md §2,
   * honest states). It must reject when the sign-up was not stored.
   */
  subscribe?: (request: NewsletterRequest) => Promise<void>;
}

type Status = 'idle' | 'invalid' | 'busy' | 'done' | 'error';

const MOBILE_DIGITS = /^[6-9]\d{9}$/;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INDIA_PREFIX = '+91';

/** The opt-in address, or null when what was typed is not one. */
export function newsletterAddress(channel: NewsletterChannel, raw: string): string | null {
  if (channel === 'whatsapp') {
    const digits = raw.replace(/[\s-]/g, '');
    return MOBILE_DIGITS.test(digits) ? `${INDIA_PREFIX}${digits}` : null;
  }
  const email = raw.trim();
  return EMAIL_SHAPE.test(email) ? email : null;
}

/**
 * "The Kare Letter" band at the top of the public footer (design board
 * Landing): WhatsApp / email channel switch, one field, Subscribe, and the
 * opt-in terms. Nothing is ever pre-selected as consent: the student's tap on
 * Subscribe is the opt-in.
 */
export function NewsletterBand({ subscribe }: NewsletterBandProps): React.ReactElement {
  const t = useT();
  const id = useId();
  const [channel, setChannel] = useState<NewsletterChannel>('whatsapp');
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const messageId = `${id}-message`;
  const fineId = `${id}-fine`;

  const pick = (next: NewsletterChannel) => {
    setChannel(next);
    setValue('');
    setStatus('idle');
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subscribe || status === 'busy') return;
    const address = newsletterAddress(channel, value);
    if (!address) {
      setStatus('invalid');
      return;
    }
    setStatus('busy');
    try {
      await subscribe({ channel, address });
      setStatus('done');
    } catch {
      // Not stored: say so, never "subscribed".
      setStatus('error');
    }
  };

  const invalid = status === 'invalid';
  const message =
    status === 'invalid'
      ? t(channel === 'whatsapp' ? 'landing.site.nl.invalidPhone' : 'landing.site.nl.invalidEmail')
      : status === 'error'
        ? t('landing.site.nl.error')
        : null;

  return (
    <section className="sk-psite sk-psite-nl" aria-label={t('landing.site.nl.aria')}>
      <div className="sk-psite-nl__copy">
        <span className="sk-psite-nl__eyebrow">{t('landing.site.nl.eyebrow')}</span>
        <p className="sk-psite-nl__title">{t('landing.site.nl.title')}</p>
        <p className="sk-psite-nl__body">{t('landing.site.nl.body')}</p>
      </div>

      {!subscribe ? (
        <div className="sk-psite-nl__form sk-psite-nl__closed">
          <ul className="sk-psite-nl__closed-channels">
            <li className="sk-psite-nl__closed-channel">
              <Icon name="message-circle-2" size={16} strokeWidth={1.9} />
              {t('landing.site.nl.whatsapp')}
            </li>
            <li className="sk-psite-nl__closed-channel">
              <Icon name="mail" size={16} strokeWidth={1.8} />
              {t('landing.site.nl.email')}
            </li>
          </ul>
          <p className="sk-psite-nl__note">{t('landing.site.nl.closed')}</p>
        </div>
      ) : status === 'done' ? (
        <div className="sk-psite-nl__form">
          <p className="sk-psite-nl__message sk-psite-nl__message--done" role="status">
            <Icon name="check" size={18} />
            {t('landing.site.nl.done')}
          </p>
        </div>
      ) : (
        <form className="sk-psite-nl__form" onSubmit={(e) => void submit(e)} noValidate>
          <div className="sk-psite-nl__channels" role="radiogroup" aria-label={t('landing.site.nl.channelAria')}>
            <input
              className="sk-psite-nl__radio"
              type="radio"
              id={`${id}-wa`}
              name={`${id}-channel`}
              checked={channel === 'whatsapp'}
              onChange={() => pick('whatsapp')}
            />
            <label className="sk-psite-nl__tab" htmlFor={`${id}-wa`}>
              <Icon name="message-circle-2" size={16} strokeWidth={1.9} />
              {t('landing.site.nl.whatsapp')}
            </label>
            <input
              className="sk-psite-nl__radio"
              type="radio"
              id={`${id}-em`}
              name={`${id}-channel`}
              checked={channel === 'email'}
              onChange={() => pick('email')}
            />
            <label className="sk-psite-nl__tab" htmlFor={`${id}-em`}>
              <Icon name="mail" size={16} strokeWidth={1.8} />
              {t('landing.site.nl.email')}
            </label>
          </div>

          <div className="sk-psite-nl__row">
            <label className="sk-psite-nl__field" data-invalid={invalid ? 'true' : undefined}>
              {channel === 'whatsapp' ? (
                <span className="sk-psite-nl__prefix">{t('landing.site.nl.countryCode')}</span>
              ) : (
                <Icon name="mail" size={18} strokeWidth={1.8} />
              )}
              <input
                className="sk-psite-nl__input"
                type={channel === 'whatsapp' ? 'tel' : 'email'}
                inputMode={channel === 'whatsapp' ? 'numeric' : 'email'}
                autoComplete={channel === 'whatsapp' ? 'tel-national' : 'email'}
                aria-label={t(channel === 'whatsapp' ? 'landing.site.nl.phoneLabel' : 'landing.site.nl.emailLabel')}
                placeholder={t(channel === 'whatsapp' ? 'landing.site.nl.phoneLabel' : 'landing.site.nl.emailPlaceholder')}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (status === 'invalid' || status === 'error') setStatus('idle');
                }}
                aria-invalid={invalid || undefined}
                aria-describedby={message ? `${messageId} ${fineId}` : fineId}
                disabled={status === 'busy'}
              />
            </label>
            <button className="sk-psite-nl__submit" type="submit" disabled={status === 'busy'} aria-busy={status === 'busy' || undefined}>
              {t(status === 'busy' ? 'landing.site.nl.busy' : 'landing.site.nl.subscribe')}
            </button>
          </div>

          {message ? (
            <p id={messageId} className="sk-psite-nl__message sk-psite-nl__message--error" role="alert">
              {message}
            </p>
          ) : null}
          <p id={fineId} className="sk-psite-nl__fine">{t('landing.site.nl.fine')}</p>
        </form>
      )}
    </section>
  );
}
