import React, { useCallback, useEffect, useState } from 'react';
import { useLanguage, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { navigate } from '@/lib/utils/workflowRouting';
import { ErrorPanel, LinkRow, LoadingRows, PageHead, Pill } from '@/features/studentweb/views/parts';
import { privacyRepository, UNPUBLISHED } from './privacyRepository';
import type { ConsentOverview, OptionalPurpose } from './privacyRepository';
import { dateOf } from './dates';
import './privacy.css';

type Repository = Pick<typeof privacyRepository, 'consents' | 'change'>;

const REQUIRED_TITLES: Record<string, MessageKey> = {
  RECORDS_STORAGE: 'member.consent.store.title',
  CAMPUS_ENROLMENT: 'member.consent.campus.title',
  ADULT_18_PLUS: 'member.consent.adult.title',
};

const purposeTitle = (purpose: string): MessageKey =>
  REQUIRED_TITLES[purpose] ?? (`privacy.purpose.${purpose}.title` as MessageKey);

/**
 * Profile → Privacy & consent (audit H2; plans tier1-canvas-wp03 D3-4 and wp06,
 * amended 2026-10-23). Every consent the student gave, from the server's ledger
 * (GET /privacy/consents): the sign-up ones with their wording and notice
 * versions, and each optional one with a switch that withdraws it as easily as
 * it was given (POST /privacy/consents/{purpose}). The required ones say what
 * withdrawing means (stop using the service = delete the account) and link
 * there. Clinician shares stay on their own page (ConsentInbox, revocable).
 */
export function PrivacyConsentView({ repository = privacyRepository }: { repository?: Repository }): React.ReactElement {
  const t = useT();
  const { lang } = useLanguage();
  const [data, setData] = useState<ConsentOverview | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<OptionalPurpose | null>(null);
  const [failed, setFailed] = useState<OptionalPurpose | null>(null);

  const load = useCallback(() => {
    setError(false);
    setData(null);
    repository.consents().then(setData, () => setError(true));
  }, [repository]);
  useEffect(load, [load]);

  const flip = (purpose: OptionalPurpose, granted: boolean) => {
    setBusy(purpose);
    setFailed(null);
    repository.change(purpose, granted, lang)
      .then(setData, () => setFailed(purpose))
      .finally(() => setBusy(null));
  };

  return (
    <div className="sk-sw-page sk-privacy">
      <PageHead id="sk-privacy-title" title={t('privacy.title')} sub={t('privacy.sub')} />
      {error ? <ErrorPanel title={t('privacy.error.title')} body={t('privacy.error.body')} onRetry={load} />
        : !data ? <LoadingRows label={t('privacy.loading')} rows={4} />
          : (
            <>
              <section className="sk-sw-card sk-privacy__card" aria-labelledby="sk-privacy-required">
                <h2 id="sk-privacy-required" className="sk-sw-card__title">{t('privacy.required.title')}</h2>
                <p className="sk-sw-muted">{t('privacy.required.body')}</p>
                {data.required ? (
                  <>
                    <ul className="sk-privacy__list">
                      {data.required.purposes.map((purpose) => (
                        <li key={purpose} className="sk-privacy__row">
                          <span className="sk-privacy__icon" aria-hidden="true"><Icon name="check" size={16} /></span>
                          <span className="sk-privacy__words"><strong>{t(purposeTitle(purpose))}</strong>
                            <small>{t('privacy.required.given', { date: dateOf(data.required?.givenAt ?? 0, lang), version: data.required?.version ?? '' })}</small>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="sk-sw-fine">{noticeLine(t, data.required.noticeVersion)}</p>
                    {data.required.termsVersion ? (
                      <p className="sk-sw-fine">{data.required.termsVersion === UNPUBLISHED
                        ? t('privacy.required.termsUnpublished') : t('privacy.required.terms', { version: data.required.termsVersion })}</p>
                    ) : null}
                  </>
                ) : <p className="sk-sw-note">{t('privacy.required.missing')}</p>}
                <div className="sk-privacy__withdraw">
                  <h3 className="sk-privacy__h3">{t('privacy.required.withdrawTitle')}</h3>
                  <p className="sk-sw-muted">{t('privacy.required.withdrawBody')}</p>
                  <div className="sk-privacy__actions">
                    <button type="button" className="sk-sw-btn sk-sw-btn--outline" onClick={() => navigate('data-export')}>
                      <Icon name="download" size={16} />{t('privacy.required.export')}
                    </button>
                    <button type="button" className="sk-sw-btn sk-sw-btn--danger-outline" onClick={() => navigate('delete-account')}>
                      <Icon name="trash" size={16} />{t('privacy.required.delete')}
                    </button>
                  </div>
                </div>
              </section>

              <section className="sk-sw-card sk-privacy__card" aria-labelledby="sk-privacy-optional">
                <h2 id="sk-privacy-optional" className="sk-sw-card__title">{t('privacy.optional.title')}</h2>
                <p className="sk-sw-muted">{t('privacy.optional.body')}</p>
                <ul className="sk-privacy__list">
                  {data.optional.map((item) => {
                    const titleId = `sk-privacy-${item.purpose}`;
                    const stateId = `${titleId}-state`;
                    const working = busy === item.purpose;
                    return (
                      <li key={item.purpose} className={`sk-privacy__row sk-privacy__row--switch${item.canGiveHere ? '' : ' is-stacked'}`}>
                        <span className="sk-privacy__words">
                          <strong id={titleId}>{t(`privacy.purpose.${item.purpose}.title` as MessageKey)}</strong>
                          <small>{t(`privacy.purpose.${item.purpose}.body` as MessageKey)}</small>
                          <small className="sk-privacy__when">{item.on
                            ? (item.givenAt ? t('privacy.optional.given', { date: dateOf(item.givenAt, lang), version: item.version ?? '' }) : t('privacy.optional.givenEarlier'))
                            : item.withdrawnAt ? t('privacy.optional.withdrawn', { date: dateOf(item.withdrawnAt, lang) }) : t('privacy.optional.never')}</small>
                          {failed === item.purpose ? <span className="sk-sw-error" role="alert">{t('privacy.optional.failed')}</span> : null}
                        </span>
                        {item.canGiveHere ? (
                          <button type="button" role="switch" aria-checked={item.on} aria-labelledby={`${titleId} ${stateId}`}
                            className="sk-privacy__switch" data-on={item.on} disabled={working} aria-busy={working}
                            onClick={() => flip(item.purpose, !item.on)}>
                            <span className="sk-privacy__track" aria-hidden="true"><span className="sk-privacy__thumb" /></span>
                            <span id={stateId} className="sk-privacy__state">{working ? t('privacy.optional.saving') : item.on ? t('privacy.optional.on') : t('privacy.optional.off')}</span>
                          </button>
                        ) : (
                          <button type="button" className="sk-sw-btn sk-sw-btn--ghost" onClick={() => navigate('lifeshare')}>
                            {t('privacy.optional.donorFirst')}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>

              <div className="sk-sw-card sk-privacy__links">
                <LinkRow icon="share" title={t('privacy.shares.title')} meta={t('privacy.shares.body')} onPress={() => navigate('consent')} />
                <LinkRow icon="shield-2" title={t('privacy.rightsLink.title')} meta={t('privacy.rightsLink.meta')} onPress={() => navigate('data-rights')} />
              </div>

              {data.history.length ? (
                <section className="sk-sw-card sk-privacy__card" aria-labelledby="sk-privacy-history">
                  <h2 id="sk-privacy-history" className="sk-sw-card__title">{t('privacy.history.title')}</h2>
                  <div className="sk-privacy__table-wrap">
                    <table className="sk-privacy__table">
                      <caption className="sk-sr-only">{t('privacy.history.caption')}</caption>
                      <thead><tr>
                        <th scope="col">{t('privacy.history.what')}</th><th scope="col">{t('privacy.history.wording')}</th>
                        <th scope="col">{t('privacy.history.given')}</th><th scope="col">{t('privacy.history.withdrawn')}</th>
                      </tr></thead>
                      <tbody>{data.history.map((row) => (
                        <tr key={`${row.version}-${row.givenAt}-${row.purposes.join()}`}>
                          <td>{row.purposes.map((purpose) => t(purposeTitle(purpose))).join(' · ')}</td>
                          <td className="sk-sw-mono">{row.version}</td>
                          <td>{dateOf(row.givenAt, lang)}</td>
                          <td>{row.withdrawnAt ? dateOf(row.withdrawnAt, lang) : <Pill tone="positive">{t('privacy.history.stillOn')}</Pill>}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </section>
              ) : null}
            </>
          )}
    </div>
  );
}

function noticeLine(t: ReturnType<typeof useT>, version: string | null): string {
  if (!version) return t('privacy.required.noticeUnknown');
  if (version === UNPUBLISHED) return t('privacy.required.noticeUnpublished');
  return t('privacy.required.notice', { version });
}
