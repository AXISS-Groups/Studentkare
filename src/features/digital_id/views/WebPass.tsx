import React from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { MemberIdentity } from '@/data/workflowTypes';
import { useApiResource } from '@/hooks/useApiResource';
import { DataState } from '@/components/interface/WorkflowUI';
import { navigate } from '@/lib/workflowRouting';
import './web-pass.css';


/**
 * Web route /pass (design: MyPass / WebPass).
 *
 * This screen used to draw a random grid as a "rotating QR", invent a spoken
 * backup code, claim "Identity verified · 4 of 4", and list three check-ins that
 * never happened. None of that had a server behind it. It now shows the member
 * QR the server issues (GET /identity) and an honest empty check-in history,
 * because no check-in record exists in the backend yet.
 */
export function WebPass(): React.ReactElement {
  const resource = useApiResource<MemberIdentity>('/identity');
  const t = useT();
  return (
    <div className="web-pass-container" role="region" aria-label={t('pass.region')}>
      <DataState {...resource} retry={resource.reload}>
        {resource.data && <PassBody identity={resource.data} />}
      </DataState>
    </div>
  );
}

function PassBody({ identity }: { identity: MemberIdentity }): React.ReactElement {
  const t = useT();
  const qrUrl = identity.qrSvg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(identity.qrSvg)}` : undefined;
  return (
    <div className="web-pass-layout">
      <section className="web-pass-card" aria-label={t('pass.card')}>
        <div className="web-pass-user-row">
          <div className="web-pass-user-info">
            <span className="web-pass-user-name">{identity.fullName}</span>
            <span className="web-pass-user-sub">
              {identity.university || t('id.campusNotProvided')}
              {identity.rollNumber ? ` · ${t('id.roll', { roll: identity.rollNumber })}` : ''}
            </span>
            <span className="web-pass-user-sub">{t(`verify.campus.${identity.campusStatus}.title` as MessageKey)}</span>
          </div>
        </div>

        {qrUrl ? (
          <div className="web-pass-qr-box">
            <img src={qrUrl} width={220} height={220} alt={t('id.qrLabel')} />
          </div>
        ) : (
          <div className="web-pass-qr-box">
            <p className="web-pass-instructions">{t('pass.noQr')}</p>
            <button type="button" className="health-button health-button-primary" onClick={() => navigate('digital-id')}>
              {t('pass.createId')}
            </button>
          </div>
        )}

        <p className="web-pass-instructions">
          {t('pass.note')}
        </p>
      </section>

      <div className="web-pass-details-col">
        <div>
          <h1 className="web-pass-title">{t('pass.title')}</h1>
        </div>
        <section aria-labelledby="web-pass-history-heading">
          <h2 id="web-pass-history-heading" className="web-pass-eyebrow">{t('pass.recent')}</h2>
          <p className="web-pass-instructions">
            {t('pass.noCheckins')}
          </p>
        </section>
      </div>
    </div>
  );
}
