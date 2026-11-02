import React from 'react';
import { SkButton } from '@/design-system';
import { Icon, Icon3d } from '@/design-system/icons';
import { useT } from '@/i18n';

/**
 * The doctor boards' full-area empty and error states, as on the canvas: the
 * `stetho-alt--p4` tile with one next step, and the calm error card with retry,
 * help and the board's reference. Same markup and classes as ConsoleTablePage,
 * for the boards that are not a table (Today, queue, inbox).
 */
export function ClinicianEmptyState({ title, body, action }: {
  title: string;
  body: string;
  action?: { label: string; onSelect: () => void };
}): React.ReactElement {
  return (
    <div className="sk-state">
      <div className="sk-state__body" role="status">
        <Icon3d name="stetho-alt--p4" size={96} />
        <h1 className="sk-state__title">{title}</h1>
        <p className="sk-state__text">{body}</p>
        {action ? (
          <div className="sk-state__actions">
            <SkButton onClick={action.onSelect}>{action.label}</SkButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ClinicianErrorState({ title, reference, onRetry, onHelp }: {
  title: string;
  /** "Ref TODAY · ClinicianToday" */
  reference: string;
  onRetry: () => void;
  onHelp: () => void;
}): React.ReactElement {
  const t = useT();
  return (
    <div className="sk-state">
      <div className="sk-state__body sk-state__body--card" role="alert">
        <span className="sk-state__badge"><Icon name="alert-triangle" size={30} strokeWidth={2.2} /></span>
        <h1 className="sk-state__title">{title}</h1>
        <p className="sk-state__text">{t('console.error.body')}</p>
        <div className="sk-state__actions">
          <SkButton onClick={onRetry}>{t('common.tryAgain')}</SkButton>
          <SkButton variant="secondary" onClick={onHelp}>{t('console.error.help')}</SkButton>
        </div>
        <span className="sk-state__ref">{reference}</span>
      </div>
    </div>
  );
}
