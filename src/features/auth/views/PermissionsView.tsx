import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { apiRequest } from '@/data/http';
import { useApiResource } from '@/hooks/api/useApiResource';
import { useMutation } from '@/components/interface/WorkflowUI';
import { useT, type MessageKey } from '@/i18n';
import {
  DEFAULT_CHOICES,
  PERMISSION_CHOICES,
  type PermissionChoice,
} from './permissionChoices';
import './permissions.css';

/** Everything GET returns; PUT requires the whole object, so it is kept whole. */
interface Preferences extends Record<PermissionChoice['key'], boolean> {
  emailEnabled: boolean;
  pushEnabled: boolean;
  timezone: string;
  quietStart: string;
  quietEnd: string;
}

/**
 * The preferences the server acts on. Ayush history is enforced server-side:
 * off (the default) means a chat's words are not stored, and turning it off
 * erases those already kept. pickupLocationEnabled is stored but nothing reads
 * it — a hostel pickup carries the block the student types into that request —
 * so a switch for it would silently do nothing; it is stated instead, and its
 * stored value is sent back untouched.
 */
const APPLIED: ReadonlySet<PermissionChoice['key']> = new Set<PermissionChoice['key']>(['remindersEnabled', 'ayushHistoryEnabled']);

const COPY: Record<PermissionChoice['key'], { title: MessageKey; detail: MessageKey }> = {
  remindersEnabled: { title: 'onboard.perm.reminders.title', detail: 'onboard.perm.reminders.detail' },
  pickupLocationEnabled: { title: 'onboard.perm.pickup.title', detail: 'onboard.perm.pickup.detail' },
  ayushHistoryEnabled: { title: 'onboard.perm.ayush.title', detail: 'onboard.perm.ayush.detail' },
};

export interface PermissionsViewProps {
  /** Continue once the choices are saved. */
  onDone: () => void;
}

/**
 * What the student turns on (design page 1, Permissions, Tier 3).
 *
 * One switch, not the design's four. "Crisis alerts and SOS" is drawn as a
 * switch but urgent events bypass preferences entirely, so it is stated rather
 * than offered — see permissionChoices.ts. Pickup location and Ayush history
 * are stated too, because the server does not act on them (see APPLIED).
 *
 * Reminders are also settable from the appointments panel. This screen writes
 * the same field through the same endpoint, so the two cannot diverge.
 */
export function PermissionsView({ onDone }: PermissionsViewProps): React.ReactElement {
  const stored = useApiResource<Preferences>('/notifications/preferences');
  const mutation = useMutation();
  const t = useT();
  const [choices, setChoices] = useState<Record<PermissionChoice['key'], boolean>>(DEFAULT_CHOICES);

  useEffect(() => {
    if (!stored.data) return;
    setChoices({
      remindersEnabled: stored.data.remindersEnabled,
      pickupLocationEnabled: stored.data.pickupLocationEnabled,
      ayushHistoryEnabled: stored.data.ayushHistoryEnabled,
    });
  }, [stored.data]);

  const save = (): void => {
    // PUT replaces the whole object, so the fields this screen does not show
    // are sent back exactly as they were rather than reset to their defaults.
    if (!stored.data) return;
    void mutation.run(
      () =>
        apiRequest('/notifications/preferences', {
          method: 'PUT',
          body: JSON.stringify({ ...stored.data, ...choices }),
        }),
      onDone,
    );
  };

  return (
    <section className="sk-permissions" aria-labelledby="sk-permissions-title">
      <h1 className="sk-permissions__title" id="sk-permissions-title">
        {t('onboard.perm.title')}
      </h1>
      <p className="sk-permissions__lede">
        {t('onboard.perm.lede')}
      </p>

      <div className="sk-permissions__always" role="note">
        <span className="sk-permissions__always-icon">
          <ShieldCheck size={18} aria-hidden="true" />
        </span>
        <div>
          <h2 className="sk-permissions__row-title">{t('always.title')}</h2>
          <p className="sk-permissions__row-detail">{t('onboard.perm.alwaysDetail')}</p>
        </div>
      </div>

      {stored.error ? (
        <p className="sk-permissions__error" role="alert">
          {t('onboard.perm.loadError')}{' '}
          <button type="button" className="sk-permissions__retry" onClick={stored.reload}>
            {t('common.tryAgain')}
          </button>
        </p>
      ) : null}

      <ul className="sk-permissions__list">
        {PERMISSION_CHOICES.map((choice) => (
          <li className="sk-permissions__row" key={choice.key}>
            <div className="sk-permissions__row-words">
              <h2 className="sk-permissions__row-title" id={`${choice.key}-title`}>
                {t(COPY[choice.key].title)}
              </h2>
              <p className="sk-permissions__row-detail" id={`${choice.key}-detail`}>
                {t(COPY[choice.key].detail)}
              </p>
            </div>
            {APPLIED.has(choice.key) ? (
              <button
                type="button"
                role="switch"
                aria-checked={choices[choice.key]}
                aria-labelledby={`${choice.key}-title`}
                aria-describedby={`${choice.key}-detail`}
                className="sk-permissions__switch"
                disabled={stored.loading || Boolean(stored.error)}
                onClick={() => setChoices((at) => ({ ...at, [choice.key]: !at[choice.key] }))}
              >
                <span className="sk-permissions__knob" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {mutation.error ? (
        <p className="sk-permissions__error" role="alert">
          {mutation.error}
        </p>
      ) : null}

      <div className="sk-permissions__actions">
        <button
          type="button"
          className="sk-permissions__primary"
          onClick={save}
          disabled={mutation.busy || stored.loading || Boolean(stored.error)}
        >
          {mutation.busy ? t('onboard.perm.saving') : t('onboard.perm.finish')}
        </button>
        <button type="button" className="sk-permissions__later" onClick={onDone}>
          {t('gate.notNow')}
        </button>
      </div>
    </section>
  );
}
