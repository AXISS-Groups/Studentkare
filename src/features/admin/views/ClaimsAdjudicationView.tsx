import React from 'react';
import { ConsoleTablePage } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import { BoardNote, boardEmpty, boardError } from './AdminBoard';

/**
 * Claims adjudication (design: ClaimsAdjudication, M22–M25), in the super admin console.
 *
 * Nothing behind it yet: no endpoint lists claims for adjudication, runs the checks,
 * reads the documents a student attached or records a decision, and student claim
 * requests are drafts that are never sent to an insurer. So the board's layout is kept
 * (checks, amount, documents, decision package) with each panel saying it is not
 * connected; no claim, amount or document is shown and there is no Approve, Query or
 * Reject. The board's own claims sidebar (Intake · M22 … Student view) is not built:
 * this lives in the super admin shell.
 */
export function ClaimsAdjudicationView() {
  const t = useT();
  const notConnected = t('adminBoard.claims.notConnected');
  const body = <>
    <BoardNote icon="alert-triangle" tone="attention">{t('adminBoard.claims.note')}</BoardNote>
    <div className="sk-board-claims">
      <div className="sk-board-claims__col">
        <section className="sk-board-card" aria-labelledby="sk-claims-checks">
          <h2 id="sk-claims-checks" className="sk-board-card__eyebrow">{t('adminBoard.claims.checks')}</h2>
          <p className="sk-board-card__text">{notConnected}</p>
          <ul className="sk-board-legend" aria-label={t('adminBoard.claims.legend')}>
            <li><span className="sk-board-mark sk-board-mark--positive"><Icon name="check" size={15} strokeWidth={2.4} /></span>{t('adminBoard.claims.pass')}</li>
            <li><span className="sk-board-mark sk-board-mark--attention"><Icon name="exclamation" size={15} strokeWidth={2.4} /></span>{t('adminBoard.claims.reduced')}</li>
          </ul>
        </section>
        <section className="sk-board-card" aria-labelledby="sk-claims-amount">
          <h2 id="sk-claims-amount" className="sk-board-card__eyebrow">{t('adminBoard.claims.amount')}</h2>
          <dl className="sk-board-lines">
            <div><dt>{t('adminBoard.claims.bill')}</dt><dd>{'—'}</dd></div>
            <div><dt>{t('adminBoard.claims.adjustments')}</dt><dd>{'—'}</dd></div>
            <div><dt>{t('adminBoard.claims.payable')}</dt><dd>{'—'}</dd></div>
          </dl>
          <p className="sk-board-card__text">{notConnected}</p>
        </section>
      </div>
      <div className="sk-board-claims__col">
        <section className="sk-board-card" aria-labelledby="sk-claims-docs">
          <h2 id="sk-claims-docs" className="sk-board-card__eyebrow">{t('adminBoard.claims.documents')}</h2>
          <div className="sk-board-doc">
            <span className="sk-board-mark sk-board-mark--action"><Icon name="file-2" size={16} /></span>
            <p>{t('adminBoard.claims.noDocuments')}</p>
          </div>
        </section>
        <section className="sk-board-card sk-board-card--soft" aria-labelledby="sk-claims-decision">
          <h2 id="sk-claims-decision" className="sk-board-card__eyebrow">{t('adminBoard.claims.decision')}</h2>
          <p className="sk-board-card__text">{t('adminBoard.claims.decisionBody')}</p>
        </section>
      </div>
    </div>
  </>;
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status="unconnected"
      header={{ eyebrow: t('adminBoard.claims.eyebrow'), title: t('adminBoard.claims.title'), subtitle: t('adminBoard.claims.subtitle') }}
      table={{ caption: t('adminBoard.claims.title'), columns: [], rows: [] }}
      alternate={body}
      empty={boardEmpty(t, t('adminBoard.claims.empty'))}
      unconnected={{ title: t('adminBoard.claims.title'), body: notConnected }}
      error={boardError(t, t('adminBoard.claims.what'), 'ClaimsAdjudication', () => undefined)}
      loadingLabel={t('adminBoard.claims.loading')}
    />
  </div>;
}
