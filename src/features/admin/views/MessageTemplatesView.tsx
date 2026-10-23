import React from 'react';
import { ConsolePageHeader, SkButton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import { BoardNote } from './AdminBoard';
import { GovCard, Unavailable, ViewLink } from './GovBoard';
import './gov-board.css';

/**
 * Message templates (design: AdminTemplates, Tier 1). No endpoint lists, edits or checks
 * templates (the notification outbox holds sent messages, not templates), so the list,
 * editor and preview are empty and "New template", "Save draft" and "Submit to Meta" are
 * not offered. The checks every template must pass are named; none of them runs yet,
 * and the leak checker belongs on the server, on save. The preview never renders a
 * medicine name or a value: the board's sample ("Metformin", "HbA1c 7.2%") is exactly
 * what such a checker must reject.
 */
export function MessageTemplatesView() {
  const t = useT();
  return <div className="sk-ds sk-admin-page sk-gov">
    <ConsolePageHeader title={t('admin.templates.title')} subtitle={t('admin.templates.description')}
      actions={<SkButton variant="secondary" disabled aria-describedby="sk-gov-tpl-new"><Icon name="plus" size={16} />{t('gov.templates.new')}</SkButton>} />
    <span id="sk-gov-tpl-new" className="sk-board-visually-hidden">{t('gov.templates.newUnavailable')}</span>
    <BoardNote icon="message-circle">{t('gov.templates.note')}</BoardNote>
    <div className="sk-gov-grid sk-gov-grid--templates">
      <GovCard eyebrow={t('admin.templates.list')}>
        <p className="sk-gov-text">{t('admin.templates.listEmptyBody')}</p>
      </GovCard>
      <GovCard eyebrow={t('admin.templates.editor')}>
        <p className="sk-gov-text">{t('admin.templates.editorEmptyBody')}</p>
        <h3 className="sk-gov-eyebrow">{t('gov.templates.checks')}</h3>
        <ul className="sk-gov-checks" aria-label={t('gov.templates.checks')}>
          <li><Icon name="check" size={16} strokeWidth={2.4} />{t('gov.templates.checkNoHealth')}</li>
          <li><Icon name="check" size={16} strokeWidth={2.4} />{t('gov.templates.checkSamples')}</li>
          <li><Icon name="check" size={16} strokeWidth={2.4} />{t('gov.templates.checkLength')}</li>
        </ul>
        <Unavailable>{t('gov.templates.checksUnavailable')}</Unavailable>
      </GovCard>
      <div className="sk-gov-stack">
        <h2 className="sk-gov-eyebrow">{t('admin.templates.preview')}</h2>
        <div className="sk-gov-phone"><div className="sk-gov-phone__screen"><p className="sk-gov-fine">{t('admin.templates.previewEmptyBody')}</p></div></div>
      </div>
    </div>
    <ViewLink route="admin/outbox" label={t('admin.templates.openOutbox')} />
  </div>;
}
