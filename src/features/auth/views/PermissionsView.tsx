import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { apiRequest } from '@/data/http';
import { useApiResource } from '@/hooks/api/useApiResource';
import { useMutation } from '@/components/interface/WorkflowUI';
import {
  ALWAYS_ON,
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

export interface PermissionsViewProps {
  /** Continue once the choices are saved. */
  onDone: () => void;
}

/**
 * What the student turns on (design page 1, Permissions, Tier 3).
 *
 * Three switches, not the design's four. "Crisis alerts and SOS" is drawn as a
 * switch but urgent events bypass preferences entirely, so it is stated rather
 * than offered — see permissionChoices.ts.
 *
 * Reminders are also settable from the appointments panel. This screen writes
 * the same field through the same endpoint, so the two cannot diverge.
 */
export function PermissionsView({ onDone }: PermissionsViewProps): React.ReactElement {
  const stored = useApiResource<Preferences>('/notifications/preferences');
  const mutation = useMutation();
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
        You decide what&rsquo;s on
      </h1>
      <p className="sk-permissions__lede">
        Everything here starts off except safety. Change any of them later in Settings.
      </p>

      <div className="sk-permissions__always" role="note">
        <span className="sk-permissions__always-icon">
          <ShieldCheck size={18} aria-hidden="true" />
        </span>
        <div>
          <h2 className="sk-permissions__row-title">{ALWAYS_ON.title}</h2>
          <p className="sk-permissions__row-detail">{ALWAYS_ON.detail}</p>
        </div>
      </div>

      {stored.error ? (
        <p className="sk-permissions__error" role="alert">
          Your current choices could not be loaded, so nothing is shown as on or off yet.{' '}
          <button type="button" className="sk-permissions__retry" onClick={stored.reload}>
            Try again
          </button>
        </p>
      ) : null}

      <ul className="sk-permissions__list">
        {PERMISSION_CHOICES.map((choice) => (
          <li className="sk-permissions__row" key={choice.key}>
            <div className="sk-permissions__row-words">
              <h2 className="sk-permissions__row-title" id={`${choice.key}-title`}>
                {choice.title}
              </h2>
              <p className="sk-permissions__row-detail" id={`${choice.key}-detail`}>
                {choice.detail}
              </p>
            </div>
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
          {mutation.busy ? 'Saving…' : 'Finish setup'}
        </button>
        <button type="button" className="sk-permissions__later" onClick={onDone}>
          Not now
        </button>
      </div>
    </section>
  );
}
