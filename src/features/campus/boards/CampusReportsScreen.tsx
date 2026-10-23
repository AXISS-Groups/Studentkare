import React, { useState } from 'react';
import { ConsolePageHeader } from '@/design-system/console/ConsoleTablePage';
import { SkButton } from '@/design-system/primitives';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { CAMPUS_MIN_GROUP, NotConnected, Unavailable } from './boardKit';
import './campus-boards.css';

const TYPES: ReadonlyArray<{ id: string; label: MessageKey; meta: MessageKey }> = [
  { id: 'use', label: 'campusBoards.reports.type.use', meta: 'campusBoards.reports.type.useMeta' },
  { id: 'camps', label: 'campusBoards.reports.type.camps', meta: 'campusBoards.reports.type.campsMeta' },
  { id: 'compliance', label: 'campusBoards.reports.type.compliance', meta: 'campusBoards.reports.type.complianceMeta' },
  { id: 'incidents', label: 'campusBoards.reports.type.incidents', meta: 'campusBoards.reports.type.incidentsMeta' },
];
const PERIODS: readonly MessageKey[] = ['campusBoards.reports.period.month', 'campusBoards.reports.period.term', 'campusBoards.reports.period.year', 'campusBoards.reports.period.custom'];
const FORMATS: readonly MessageKey[] = ['campusBoards.reports.format.pdf', 'campusBoards.reports.format.csv', 'campusBoards.reports.format.xlsx'];

/**
 * Reports (design page 4, CampusReports; Tier 3). No report endpoint exists:
 * nothing can build, store or email a campus report yet. The builder keeps its
 * choices on screen so the layout and the rules are visible (aggregates only,
 * cohorts under the minimum group size withheld, no mental or sexual health),
 * Generate is disabled with the reason, and the download and schedule lists
 * are "not connected" rather than sample files.
 */
export function CampusReportsScreen(): React.ReactElement {
  const t = useT();
  const [type, setType] = useState(TYPES[1].id);
  const [period, setPeriod] = useState<MessageKey>(PERIODS[1]);
  const [format, setFormat] = useState<MessageKey>(FORMATS[0]);

  return (
    <div className="sk-ds cb-board">
      <ConsolePageHeader title={t('campusBoards.reports.title')} subtitle={t('campusBoards.reports.subtitle')} />
      <div className="cb-two cb-two--wide-left">
        <section className="sk-card" aria-labelledby="cb-build-title">
          <span className="sk-card__titles">
            <h2 id="cb-build-title" className="sk-card__title">{t('campusBoards.reports.build')}</h2>
            <p className="sk-card__subtitle">{t('campusBoards.reports.buildRules', { floor: CAMPUS_MIN_GROUP })}</p>
          </span>
          <div className="cb-types" role="radiogroup" aria-label={t('campusBoards.reports.typeLabel')}>
            {TYPES.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={option.id === type}
                className={`cb-type${option.id === type ? ' is-on' : ''}`}
                onClick={() => setType(option.id)}
              >
                <strong>{t(option.label)}</strong>
                <span>{t(option.meta)}</span>
              </button>
            ))}
          </div>
          <div className="cb-field-row">
            <ChoiceGroup label="campusBoards.reports.period" options={PERIODS} value={period} onChange={setPeriod} />
            <ChoiceGroup label="campusBoards.reports.format" options={FORMATS} value={format} onChange={setFormat} />
          </div>
          <SkButton className="cb-form__submit" disabled>
            {t('campusBoards.reports.generate')}
            <Unavailable reason="campusBoards.reports.generateUnavailable" />
          </SkButton>
          <p className="cb-field__hint">{t('campusBoards.reports.generateUnavailable')}</p>
        </section>

        <div className="cb-stack">
          <section className="sk-card" aria-labelledby="cb-ready-title">
            <span className="sk-card__titles">
              <h2 id="cb-ready-title" className="sk-card__title">{t('campusBoards.reports.ready')}</h2>
              <p className="sk-card__subtitle">{t('campusBoards.reports.readySubtitle')}</p>
            </span>
            <NotConnected icon="file" titleKey="campusBoards.reports.readyOffTitle" bodyKey="campusBoards.reports.readyOffBody" />
          </section>
          <section className="sk-card" aria-labelledby="cb-sched-title">
            <span className="sk-card__titles">
              <h2 id="cb-sched-title" className="sk-card__title">{t('campusBoards.reports.scheduled')}</h2>
              <p className="sk-card__subtitle">{t('campusBoards.reports.scheduledSubtitle')}</p>
            </span>
            <NotConnected icon="bar-chart-2" tile="chart-alt--p4" titleKey="campusBoards.reports.scheduledOffTitle" bodyKey="campusBoards.reports.scheduledOffBody" />
          </section>
        </div>
      </div>
    </div>
  );
}

function ChoiceGroup({ label, options, value, onChange }: { label: MessageKey; options: readonly MessageKey[]; value: MessageKey; onChange: (next: MessageKey) => void }): React.ReactElement {
  const t = useT();
  return (
    <div className="cb-field">
      <span className="cb-field__label" id={`cb-${label}`}>{t(label)}</span>
      <div className="cb-chips" role="radiogroup" aria-labelledby={`cb-${label}`}>
        {options.map((option) => (
          <button key={option} type="button" role="radio" aria-checked={option === value} className={`cb-chip cb-chip--dark${option === value ? ' is-on' : ''}`} onClick={() => onChange(option)}>
            {t(option)}
          </button>
        ))}
      </div>
    </div>
  );
}
