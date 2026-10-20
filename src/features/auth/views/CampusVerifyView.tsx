import React, { useId, useMemo, useState } from 'react';
import { Icon } from '@/design-system/icons';
import { useApiResource } from '@/hooks/api/useApiResource';
import { apiRequest } from '@/data/services/http';
import { useMutation } from '@/components/interface/WorkflowUI';
import { useT, type MessageKey } from '@/i18n';
import './campus-verify.css';

/** What `GET /campus/verification` answers. */
interface Verification {
  status: string;
  university: string;
  rollNumber: string;
}

/** `GET /campus/partners`: campuses with an active campus administrator, by name only. */
interface Partners {
  items: { name: string }[];
}

const STATUS_LABEL: Record<string, MessageKey> = {
  VERIFIED: 'member.digitalId.campus.VERIFIED',
  PENDING: 'member.digitalId.campus.PENDING',
  NOT_SUBMITTED: 'member.digitalId.campus.NOT_SUBMITTED',
  REJECTED: 'member.digitalId.campus.REJECTED',
};

const fold = (value: string): string => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

export interface CampusVerifyViewProps {
  /** After a verified affiliation: the way to the leaving-campus flow. */
  onLeaving: () => void;
}

/**
 * Find your campus (design page 1, CampusVerify), the student's side of
 * campus verification.
 *
 * The campuses come from the server (`GET /campus/partners`), never from a
 * list in the app. A campus that is not there can still be typed ("My campus
 * isn't here"); POST /campus/verification takes any name. Where the board
 * differs, and why:
 * - The board's "Bachupally, Hyderabad · Clinic live" line under each campus
 *   is not shown: the server knows only the name, and "clinic live" would be
 *   an invented claim.
 * - The board is step 2 of a six-step sign-up. Here it lives in My profile,
 *   where verification is actually submitted, so no step count is drawn.
 * - The roll number is asked for: the API needs it, and the campus checks it.
 */
export function CampusVerifyView({ onLeaving }: CampusVerifyViewProps): React.ReactElement {
  const t = useT();
  const status = useApiResource<Verification>('/campus/verification');
  const partners = useApiResource<Partners>('/campus/partners');
  const mutation = useMutation();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState('');
  const [manual, setManual] = useState(false);
  const [typed, setTyped] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const listId = useId();

  const all = useMemo(() => partners.data?.items ?? [], [partners.data]);
  const matches = useMemo(() => all.filter((item) => fold(item.name).includes(fold(query))), [all, query]);
  // Without a list from the server (none yet, or it failed), typing the name is the only way.
  const typing = manual || Boolean(partners.error) || (!partners.loading && all.length === 0);
  const university = typing ? typed.trim() : picked;
  const current = status.data?.status;

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!university || !rollNumber.trim()) return;
    void mutation.run(
      () => apiRequest('/campus/verification', { method: 'POST', body: JSON.stringify({ university, rollNumber: rollNumber.trim() }) }),
      () => { setSubmitted(true); status.reload(); },
    );
  };

  if (status.loading) {
    return <p className="sk-campusverify__status" role="status">{t('launch.campus.loading')}</p>;
  }
  if (status.error) {
    return (
      <div className="sk-campusverify__alert" role="alert">
        <span>{t('launch.campus.statusError')}</span>
        <button type="button" className="sk-campusverify__link" onClick={status.reload}>{t('common.tryAgain')}</button>
      </div>
    );
  }

  if (current === 'VERIFIED') {
    return (
      <div className="sk-campusverify">
        <div className="sk-campusverify__done" role="status">
          <Icon name="check" size={18} strokeWidth={2.6} />
          <span>{t('member.campus.verified')}{status.data?.university ? ` · ${status.data.university}` : ''}</span>
        </div>
        <button type="button" className="sk-campusverify__link" onClick={onLeaving}>{t('member.campus.leaving')}</button>
      </div>
    );
  }

  return (
    <form className="sk-campusverify" onSubmit={submit} noValidate>
      <div className="sk-campusverify__head">
        <h2 className="sk-campusverify__title">{t('launch.campus.title')}</h2>
        <p className="sk-campusverify__lede">{t('launch.campus.lede')}</p>
      </div>

      {current && current !== 'NOT_SUBMITTED' ? (
        <p className={`sk-campusverify__current sk-campusverify__current--${current === 'REJECTED' ? 'problem' : 'pending'}`} role="status">
          {t('member.campus.currentStatus')} <strong>{t(STATUS_LABEL[current] ?? 'member.campus.notSubmitted')}</strong>
        </p>
      ) : null}

      {typing ? (
        <label className="sk-campusverify__field" htmlFor="sk-campus-typed">
          <span className="sk-campusverify__label">{t('launch.campus.typedLabel')}</span>
          <span className="sk-campusverify__control">
            <Icon name="house-door" size={18} />
            <input id="sk-campus-typed" value={typed} maxLength={160} autoComplete="organization" onChange={(event) => setTyped(event.target.value)} placeholder={t('launch.campus.typedPlaceholder')} />
          </span>
        </label>
      ) : (
        <>
          <label className="sk-campusverify__control sk-campusverify__search" htmlFor="sk-campus-search">
            <Icon name="search-2" size={18} />
            <span className="sk-campusverify__sr">{t('launch.campus.search')}</span>
            <input id="sk-campus-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('launch.campus.search')} aria-controls={listId} />
          </label>
          <div className="sk-campusverify__listhead">
            <span className="sk-campusverify__eyebrow" id={`${listId}-label`}>{t('launch.campus.partners')}</span>
            {!partners.loading ? <span className="sk-campusverify__count" aria-live="polite">{t('launch.campus.matches', { n: matches.length })}</span> : null}
          </div>
          {partners.loading ? (
            <p className="sk-campusverify__status" role="status">{t('launch.campus.loadingList')}</p>
          ) : (
            <div className="sk-campusverify__list" role="radiogroup" id={listId} aria-labelledby={`${listId}-label`}>
              {matches.length === 0 ? <p className="sk-campusverify__status">{t('launch.campus.noMatch')}</p> : null}
              {matches.map((item) => {
                const on = item.name === picked;
                return (
                  <button key={item.name} type="button" role="radio" aria-checked={on} className={`sk-campusverify__campus${on ? ' is-on' : ''}`} onClick={() => setPicked(item.name)}>
                    <span className="sk-campusverify__tile"><Icon name="house-door" size={18} /></span>
                    <span className="sk-campusverify__name">{item.name}</span>
                    <span className="sk-campusverify__radio" aria-hidden="true">{on ? <Icon name="check" size={14} strokeWidth={3} /> : null}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      <p className="sk-campusverify__info">
        <Icon name="info-2" size={18} />
        <span>{t(partners.error ? 'launch.campus.listError' : typing ? 'launch.campus.typedNote' : 'launch.campus.notListed')}</span>
      </p>

      <label className="sk-campusverify__field" htmlFor="sk-campus-roll">
        <span className="sk-campusverify__label">{t('member.profile.rollNumber')}</span>
        <span className="sk-campusverify__control">
          <input id="sk-campus-roll" value={rollNumber} maxLength={80} required onChange={(event) => setRollNumber(event.target.value)} />
        </span>
      </label>

      {mutation.error ? <p className="sk-campusverify__error" role="alert">{mutation.error}</p> : null}
      {submitted ? (
        <p className="sk-campusverify__done" role="status">
          <Icon name="check" size={18} strokeWidth={2.6} />
          <span>{t('member.campus.submitted')}</span>
        </p>
      ) : null}

      <button type="submit" className="sk-campusverify__primary" disabled={mutation.busy || !university || !rollNumber.trim()}>
        {t('auth.continue')}
      </button>
      {!partners.error && all.length > 0 ? (
        <button type="button" className="sk-campusverify__link" aria-pressed={manual} onClick={() => setManual((value) => !value)}>
          {t(manual ? 'launch.campus.pickFromList' : 'launch.campus.notHere')}
        </button>
      ) : null}
    </form>
  );
}
