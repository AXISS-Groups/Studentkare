import React, { useEffect, useState } from 'react';
import { Icon } from '@/design-system/icons';
import { apiRequest } from '@/data/services/http';
import { useApiResource } from '@/hooks/api/useApiResource';
import { useMutation } from '@/components/interface/WorkflowUI';
import { useT } from '@/i18n';
import { SetupTop } from './SetupTop';
import './profile-setup.css';

const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

interface Profile {
  hostelBlock: string;
  room: string;
  bloodGroup: string;
  emergencyContactPhone: string;
}

export interface ProfileSetupViewProps {
  /** Continue, whether or not anything was filled in. */
  onDone: () => void;
  /** The board's back arrow. */
  onBack: () => void;
}

/**
 * Where to find a student (design page 1, ProfileSetup, Tier 3).
 *
 * Every field is optional — the screen itself offers "I'll add this later", so
 * the form must not enforce what the design says can be skipped.
 *
 * The design's emergency-contact field is placeholder-labelled "Parent or
 * guardian number". That is a hint, not a guardian-consent flow; this screen
 * has nothing to do with the under-18 question (see DESIGN.md D4).
 */
export function ProfileSetupView({ onDone, onBack }: ProfileSetupViewProps): React.ReactElement {
  const stored = useApiResource<Profile>('/profile');
  const mutation = useMutation();
  const t = useT();
  const [form, setForm] = useState<Profile>({
    hostelBlock: '',
    room: '',
    bloodGroup: '',
    emergencyContactPhone: '',
  });

  useEffect(() => {
    if (!stored.data) return;
    setForm({
      hostelBlock: stored.data.hostelBlock ?? '',
      room: stored.data.room ?? '',
      bloodGroup: stored.data.bloodGroup ?? '',
      emergencyContactPhone: stored.data.emergencyContactPhone ?? '',
    });
  }, [stored.data]);

  const set = (key: keyof Profile) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((at) => ({ ...at, [key]: event.target.value }));

  // PATCH merges what is sent into the stored profile, so saving a form that
  // never loaded would blank fields the student already filled in. Until the
  // stored profile is here, the form can be skipped but not saved (fail closed).
  const loaded = Boolean(stored.data) && !stored.loading;

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!loaded) return;
    void mutation.run(
      () => apiRequest('/profile', { method: 'PATCH', body: JSON.stringify(form) }),
      onDone,
    );
  };

  return (
    <form className="sk-profilesetup" onSubmit={submit} noValidate aria-busy={stored.loading || undefined}>
      <SetupTop step="profile-setup" onBack={onBack} />
      <h1 className="sk-profilesetup__title">{t('onboard.profile.title')}</h1>
      <p className="sk-profilesetup__lede">
        {t('onboard.profile.lede')}
      </p>

      {stored.loading ? (
        <p className="sk-profilesetup__status" role="status">{t('launch.profile.loading')}</p>
      ) : null}
      {stored.error ? (
        <div className="sk-profilesetup__alert" role="alert">
          <span>{t('launch.profile.loadError')}</span>
          <button type="button" className="sk-profilesetup__retry" onClick={stored.reload}>
            {t('common.tryAgain')}
          </button>
        </div>
      ) : null}

      <fieldset className="sk-profilesetup__fields" disabled={!loaded}>
      <label className="sk-profilesetup__field" htmlFor="sk-hostel-block">
        <span className="sk-profilesetup__label">{t('onboard.profile.block')}</span>
        <span className="sk-profilesetup__control">
          <Icon name="map-pin-4" size={18} />
          <input
            id="sk-hostel-block"
            name="hostelBlock"
            className="sk-profilesetup__input"
            autoComplete="address-line1"
            placeholder={t('onboard.profile.blockPlaceholder')}
            value={form.hostelBlock}
            onChange={set('hostelBlock')}
          />
        </span>
      </label>

      <div className="sk-profilesetup__pair">
        <label className="sk-profilesetup__field" htmlFor="sk-room">
          <span className="sk-profilesetup__label">{t('onboard.profile.room')}</span>
          <span className="sk-profilesetup__control">
            <input
              id="sk-room"
              name="room"
              className="sk-profilesetup__input"
              placeholder={t('launch.profile.roomPlaceholder')}
              value={form.room}
              onChange={set('room')}
            />
          </span>
        </label>

        <label className="sk-profilesetup__field" htmlFor="sk-blood-group">
          <span className="sk-profilesetup__label">{t('onboard.profile.bloodGroup')}</span>
          <span className="sk-profilesetup__control">
            <select
              id="sk-blood-group"
              name="bloodGroup"
              className="sk-profilesetup__input"
              value={form.bloodGroup}
              onChange={set('bloodGroup')}
            >
              {BLOOD_GROUPS.map((group) => (
                <option key={group || 'none'} value={group}>
                  {group || t('auth.notRecorded')}
                </option>
              ))}
            </select>
          </span>
        </label>
      </div>

      <label className="sk-profilesetup__field" htmlFor="sk-emergency-contact">
        <span className="sk-profilesetup__label">{t('onboard.profile.contact')}</span>
        <span className="sk-profilesetup__control">
          <Icon name="phone-2" size={18} />
          <input
            id="sk-emergency-contact"
            name="emergencyContactPhone"
            className="sk-profilesetup__input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t('onboard.profile.contactPlaceholder')}
            aria-describedby="sk-emergency-note"
            value={form.emergencyContactPhone}
            onChange={set('emergencyContactPhone')}
          />
        </span>
        <span className="sk-profilesetup__note" id="sk-emergency-note">
          {t('onboard.profile.contactNote')}
        </span>
      </label>
      </fieldset>

      {mutation.error ? (
        <p className="sk-profilesetup__error" role="alert">
          {mutation.error}
        </p>
      ) : null}

      <div className="sk-profilesetup__spacer" />

      <div className="sk-profilesetup__actions">
        <button type="submit" className="sk-profilesetup__primary" disabled={mutation.busy || !loaded}>
          {mutation.busy ? t('onboard.perm.saving') : t('auth.continue')}
        </button>
        {/* Nothing here is required, so skipping costs the student nothing. */}
        <button type="button" className="sk-profilesetup__later" onClick={onDone}>
          {t('onboard.profile.later')}
        </button>
      </div>
    </form>
  );
}
