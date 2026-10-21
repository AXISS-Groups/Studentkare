import React from 'react';
import { ConsolePageHeader, SkButton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import { BoardNote } from './AdminBoard';
import { BackLink, GovCard, Unavailable } from './GovBoard';
import './gov-board.css';

/**
 * Check-in audit, then Case: “This wasn’t me” (design: AdminCase, Tier 1). There is no case
 * record, so no case can be opened: the board keeps its sections (timeline, evidence,
 * call the student, outcome) and says what each will hold. Calling the student needs
 * their masked number and the counter photo opens only with an open case, audited; the
 * refund path would cross into commerce. None of that exists, so the outcome choices and
 * "Close case" are drawn disabled, never as working controls.
 */
export function CaseView() {
  const t = useT();
  return <div className="sk-ds sk-admin-page sk-gov">
    <BackLink route="admin/checkins" label={t('admin.checkins.title')} />
    <ConsolePageHeader title={t('gov.case.title')} subtitle={t('admin.case.description')} />
    <BoardNote icon="heart-plus">{t('admin.case.noneBody')}</BoardNote>
    <div className="sk-gov-grid sk-gov-grid--case">
      <div className="sk-gov-stack">
        <GovCard eyebrow={t('admin.case.timeline')}><p className="sk-gov-text">{t('admin.case.timelineBody')}</p></GovCard>
        <GovCard eyebrow={t('admin.case.evidence')}>
          <p className="sk-gov-text">{t('admin.case.evidenceBody')}</p>
          <p className="sk-gov-fine">{t('gov.case.evidenceRule')}</p>
        </GovCard>
      </div>
      <div className="sk-gov-stack">
        <GovCard eyebrow={t('gov.case.call')}>
          <p className="sk-gov-text">{t('gov.case.callBody')}</p>
        </GovCard>
        <GovCard eyebrow={t('gov.case.outcome')}>
          <div className="sk-gov-options" role="radiogroup" aria-label={t('gov.case.outcome')} aria-disabled="true">
            <span className="sk-gov-option" role="radio" aria-checked="false" aria-disabled="true">{t('gov.case.outcomeFraud')}</span>
            <span className="sk-gov-option" role="radio" aria-checked="false" aria-disabled="true">{t('gov.case.outcomeForgot')}</span>
            <span className="sk-gov-option" role="radio" aria-checked="false" aria-disabled="true">{t('gov.case.outcomeUnclear')}</span>
          </div>
        </GovCard>
        <SkButton className="sk-gov-full" disabled aria-describedby="sk-gov-case-close"><Icon name="check" size={17} strokeWidth={2.4} />{t('gov.case.close')}</SkButton>
        <Unavailable><span id="sk-gov-case-close">{t('gov.case.closeUnavailable')}</span></Unavailable>
      </div>
    </div>
  </div>;
}
