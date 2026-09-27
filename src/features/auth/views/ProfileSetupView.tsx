import React, { useEffect, useState } from 'react';
import { MapPin, Phone } from 'lucide-react';
import { apiRequest } from '@/data/http';
import { useApiResource } from '@/hooks/api/useApiResource';
import { useMutation } from '@/components/interface/WorkflowUI';
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
export function ProfileSetupView({ onDone }: ProfileSetupViewProps): React.ReactElement {
  const stored = useApiResource<Profile>('/profile');
  const mutation = useMutation();
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

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    void mutation.run(
      () => apiRequest('/profile', { method: 'PATCH', body: JSON.stringify(form) }),
      onDone,
    );
  };

  return (
    <form className="sk-profilesetup" onSubmit={submit} noValidate>
      <h1 className="sk-profilesetup__title">Where do we find you?</h1>
      <p className="sk-profilesetup__lede">
        Your block decides sample pickup windows and which clinic you&rsquo;re routed to.
      </p>

      <label className="sk-profilesetup__field" htmlFor="sk-hostel-block">
        <span className="sk-profilesetup__label">Hostel block</span>
        <span className="sk-profilesetup__control">
          <MapPin size={16} aria-hidden="true" />
          <input
            id="sk-hostel-block"
            name="hostelBlock"
            className="sk-profilesetup__input"
            autoComplete="address-line1"
            placeholder="North Dorm, Block B"
            value={form.hostelBlock}
            onChange={set('hostelBlock')}
          />
        </span>
      </label>

      <div className="sk-profilesetup__pair">
        <label className="sk-profilesetup__field" htmlFor="sk-room">
          <span className="sk-profilesetup__label">Room</span>
          <span className="sk-profilesetup__control">
            <input
              id="sk-room"
              name="room"
              className="sk-profilesetup__input"
              placeholder="B-214"
              value={form.room}
              onChange={set('room')}
            />
          </span>
        </label>

        <label className="sk-profilesetup__field" htmlFor="sk-blood-group">
          <span className="sk-profilesetup__label">Blood group</span>
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
                  {group || 'Not recorded'}
                </option>
              ))}
            </select>
          </span>
        </label>
      </div>

      <label className="sk-profilesetup__field" htmlFor="sk-emergency-contact">
        <span className="sk-profilesetup__label">Emergency contact</span>
        <span className="sk-profilesetup__control">
          <Phone size={16} aria-hidden="true" />
          <input
            id="sk-emergency-contact"
            name="emergencyContactPhone"
            className="sk-profilesetup__input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Parent or guardian number"
            aria-describedby="sk-emergency-note"
            value={form.emergencyContactPhone}
            onChange={set('emergencyContactPhone')}
          />
        </span>
        <span className="sk-profilesetup__note" id="sk-emergency-note">
          Only contacted if you trigger an SOS from the crisis bar.
        </span>
      </label>

      {mutation.error ? (
        <p className="sk-profilesetup__error" role="alert">
          {mutation.error}
        </p>
      ) : null}

      <div className="sk-profilesetup__actions">
        <button type="submit" className="sk-profilesetup__primary" disabled={mutation.busy}>
          {mutation.busy ? 'Saving…' : 'Continue'}
        </button>
        {/* Nothing here is required, so skipping costs the student nothing. */}
        <button type="button" className="sk-profilesetup__later" onClick={onDone}>
          I&rsquo;ll add this later
        </button>
      </div>
    </form>
  );
}
