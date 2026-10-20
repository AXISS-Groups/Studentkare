import React from 'react';
import { ConsolePageHeader } from '@/design-system/console/ConsoleTablePage';
import { SkButton, StatusPill } from '@/design-system/primitives';
import { Icon } from '@/design-system/icons';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { NotConnected, Unavailable } from './boardKit';
import './campus-boards.css';

const PROFILE_FIELDS: ReadonlyArray<{ id: string; label: MessageKey }> = [
  { id: 'hours', label: 'campusBoards.settings.profile.hours' },
  { id: 'counsellor', label: 'campusBoards.settings.profile.counsellor' },
  { id: 'hospital', label: 'campusBoards.settings.profile.hospital' },
];

const SERVICES: ReadonlyArray<{ label: MessageKey; meta: MessageKey }> = [
  { label: 'campusBoards.settings.service.lab', meta: 'campusBoards.settings.service.labMeta' },
  { label: 'campusBoards.settings.service.tele', meta: 'campusBoards.settings.service.teleMeta' },
  { label: 'campusBoards.settings.service.pharmacy', meta: 'campusBoards.settings.service.pharmacyMeta' },
  { label: 'campusBoards.settings.service.camps', meta: 'campusBoards.settings.service.campsMeta' },
  { label: 'campusBoards.settings.service.visits', meta: 'campusBoards.settings.service.visitsMeta' },
  { label: 'campusBoards.settings.service.wellness', meta: 'campusBoards.settings.service.wellnessMeta' },
];

/**
 * Settings & requirements (design page 4, CampusSettings; Tier 3). No campus
 * settings endpoint exists: there is nowhere to save clinic hours, a counsellor
 * line, a nearest hospital, health requirements or which services a campus
 * offers. So the board keeps its layout, shows the campus name the account
 * really carries, and marks every other part "not connected" instead of
 * drawing switches whose position would mean nothing. "Save changes" and "Add
 * requirement" are shown disabled, with the reason.
 */
export function CampusSettingsScreen(): React.ReactElement {
  const t = useT();
  const { user } = useAuth();
  const campus = user?.role === 'SUPER_ADMIN' ? t('campusShell.allCampuses') : user?.university.trim() || t('campusShell.noCampus');

  return (
    <div className="sk-ds cb-board">
      <ConsolePageHeader
        title={t('campusBoards.settings.title')}
        subtitle={t('campusBoards.settings.subtitle')}
        actions={(
          <SkButton disabled>
            <Icon name="check-2" size={17} strokeWidth={1.9} />
            {t('campusBoards.settings.save')}
            <Unavailable reason="campusBoards.settings.saveUnavailable" />
          </SkButton>
        )}
      />

      <section className="sk-card" aria-labelledby="cb-profile-title">
        <h2 id="cb-profile-title" className="sk-card__title">{t('campusBoards.settings.profile.title')}</h2>
        <dl className="cb-profile">
          <div className="cb-field">
            <dt className="cb-field__label">{t('campusBoards.settings.profile.name')}</dt>
            <dd className="cb-readonly">{campus}</dd>
          </div>
          {PROFILE_FIELDS.map((field) => (
            <div key={field.id} className="cb-field">
              <dt className="cb-field__label">{t(field.label)}</dt>
              <dd className="cb-readonly is-empty">{t('campusBoards.notConnectedShort')}</dd>
            </div>
          ))}
        </dl>
        <p className="cb-field__hint">{t('campusBoards.settings.profile.note')}</p>
      </section>

      <div className="cb-two cb-two--wide-left">
        <section className="sk-card" aria-labelledby="cb-req-title">
          <div className="sk-card__head">
            <span className="sk-card__titles">
              <h2 id="cb-req-title" className="sk-card__title">{t('campusBoards.settings.req.title')}</h2>
              <p className="sk-card__subtitle">{t('campusBoards.settings.req.subtitle')}</p>
            </span>
            <SkButton disabled>
            <Icon name="plus" size={17} strokeWidth={1.9} />
              {t('campusBoards.settings.req.add')}
              <Unavailable reason="campusBoards.settings.saveUnavailable" />
            </SkButton>
          </div>
          <div className="cb-colheads" aria-hidden="true">
            <span>{t('campusBoards.settings.req.col.requirement')}</span>
            <span>{t('campusBoards.settings.req.col.applies')}</span>
            <span>{t('campusBoards.settings.req.col.due')}</span>
            <span>{t('campusBoards.settings.req.col.complete')}</span>
          </div>
          <NotConnected icon="file-check" tile="chart-alt--p4" titleKey="campusBoards.settings.req.offTitle" bodyKey="campusBoards.settings.req.offBody" />
        </section>

        <section className="sk-card" aria-labelledby="cb-svc-title">
          <div className="sk-card__head">
            <span className="sk-card__titles">
              <h2 id="cb-svc-title" className="sk-card__title">{t('campusBoards.settings.svc.title')}</h2>
              <p className="sk-card__subtitle">{t('campusBoards.settings.svc.subtitle')}</p>
            </span>
          </div>
          <ul className="cb-services">
            {SERVICES.map((service) => (
              <li key={service.label}>
                <span className="cb-services__text"><strong>{t(service.label)}</strong><span>{t(service.meta)}</span></span>
                <StatusPill tone="neutral">{t('campusBoards.notConnectedShort')}</StatusPill>
              </li>
            ))}
          </ul>
          <div className="sk-note sk-note--info">
            <Icon name="info" size={16} strokeWidth={1.9} />
            <span>{t('campusBoards.settings.svc.crisis')}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
