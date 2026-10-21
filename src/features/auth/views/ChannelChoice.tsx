import React from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import type { AuthViewModel } from '../viewmodel/AuthViewModel';
import type { AuthChannel } from './channelCopy';
import './sign-in-frame.css';

/** The board's order: Email first, then WhatsApp. Icons from the briefs (mail-2, message-circle-3). */
const CHANNELS: Readonly<Record<AuthChannel, { label: MessageKey; icon: SkIconName }>> = {
  EMAIL: { label: 'auth.channel.EMAIL', icon: 'mail-2' },
  WHATSAPP: { label: 'auth.channel.WHATSAPP', icon: 'message-circle-3' },
};

/**
 * Email / WhatsApp, drawn only from what GET /auth/options returned (WhatsApp
 * only while its session is connected). With one channel there is nothing to
 * choose, so no switcher is drawn: the field's label says which it is.
 */
export const ChannelSwitch = observer(function ChannelSwitch({ vm, onPick }: { vm: AuthViewModel; onPick?: () => void }) {
  const t = useT();
  const offered = vm.offeredChannels;
  if (offered.length < 2) return null;
  return (
    <div className="sk-signin__channels" role="group" aria-label={t('auth.channels')}>
      {offered.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={vm.channel === id}
          disabled={vm.busy}
          onClick={() => { vm.setChannel(id); onPick?.(); }}
        >
          <Icon name={CHANNELS[id].icon} size={16} />
          {t(CHANNELS[id].label)}
        </button>
      ))}
    </div>
  );
});

/**
 * The send failed because its channel could not deliver (503). Plain words,
 * whose side it is on, and the one next step: the other channel in one tap
 * (the typed name is kept; focus moves to the new field), or try again.
 * Drawn next to the field it is about; `role="alert"` announces it.
 */
export const ChannelFailureNote = observer(function ChannelFailureNote({ vm, id }: { vm: AuthViewModel; id?: string }) {
  const t = useT();
  const failure = vm.channelFailure;
  if (!failure) return null;
  const other: AuthChannel | null = failure.remaining.find((c) => c !== failure.channel) ?? null;
  return (
    <div className="sk-auth-note sk-auth-note--attention" role="alert" id={id}>
      <span className="sk-auth-note__icon"><Icon name="alert-circle-4" size={20} /></span>
      <div className="sk-auth-note__words">
        <strong>{t(failure.channel === 'WHATSAPP' ? 'authch.failed.title.WHATSAPP' : 'authch.failed.title.EMAIL')}</strong>
        <span>{t(other ? 'authch.failed.body' : 'authch.failed.bodyNoOther')}</span>
        {other ? (
          <button
            type="button"
            className="sk-auth-note__action"
            onClick={() => (other === 'EMAIL' ? vm.useEmailInstead() : vm.setChannel(other))}
          >
            <Icon name={CHANNELS[other].icon} size={18} />
            {t(other === 'EMAIL' ? 'authch.failed.useEmail' : 'authch.failed.useWhatsapp')}
          </button>
        ) : null}
      </div>
    </div>
  );
});

/**
 * No channel can deliver a code (the server listed none). Honest, not a dead
 * form: says it is on our side, offers to check again, and the emergency strip
 * under the form stays one tap away.
 */
export const NoChannelState = observer(function NoChannelState({ vm }: { vm: AuthViewModel }) {
  const t = useT();
  return (
    <div className="sk-auth-none" role="status" aria-live="polite">
      <span className="sk-auth-none__icon" aria-hidden="true"><Icon name="clock-3" size={28} /></span>
      <h2 className="sk-auth-none__title">{t('authch.none.title')}</h2>
      <p className="sk-auth-none__body">{t('authch.none.body')}</p>
      <button
        type="button"
        className="sk-signin__ghost"
        disabled={vm.optionsLoading}
        aria-busy={vm.optionsLoading}
        onClick={() => void vm.loadOptions()}
      >
        <Icon name="refresh" size={18} />
        {t(vm.optionsLoading ? 'authch.none.checking' : 'authch.none.retry')}
      </button>
    </div>
  );
});

/** Sign in only: no account uses what was typed. Next step: create one (the address is not carried over). */
export function NoAccountNote({ id, onCreate }: { id?: string; onCreate: () => void }): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-auth-note sk-auth-note--info" role="alert" id={id}>
      <span className="sk-auth-note__icon"><Icon name="info-4" size={20} /></span>
      <div className="sk-auth-note__words">
        <strong>{t('authch.noAccount.title')}</strong>
        <span>{t('authch.noAccount.body')}</span>
        <button type="button" className="sk-auth-note__action" onClick={onCreate}>
          <Icon name="user-5" size={18} />
          {t('auth.createAccount')}
        </button>
      </div>
    </div>
  );
}

/** Any other send error, in the same place and the same live region. */
export function SendErrorNote({ id, message }: { id?: string; message: string }): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-auth-note sk-auth-note--danger" role="alert" id={id}>
      <span className="sk-auth-note__icon"><Icon name="alert-circle-4" size={20} /></span>
      <div className="sk-auth-note__words">
        <strong>{t('authch.errorTitle')}</strong>
        <span>{message}</span>
      </div>
    </div>
  );
}
