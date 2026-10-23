import React, { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { MemberIdentity } from '@/data/types/workflowTypes';
import { useApiResource } from '@/hooks/api/useApiResource';
import { apiRequest } from '@/data/services/http';
import { DataState } from '@/components/interface/WorkflowUI';
import { useLivePass } from '../viewmodel/livePass';
import { QrCells } from './DigitalIdNativeView';
import { navigate } from '@/lib/utils/workflowRouting';
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

function PassBody({ identity: first }: { identity: MemberIdentity }): React.ReactElement {
  const t = useT();
  const [identity, setIdentity] = useState(first);
  useEffect(() => setIdentity(first), [first]);
  // Next step's code, fetched in place so the card doesn't blank every 30 s.
  // If it fails, the old code is hidden once it expires — never left on screen.
  const refresh = useCallback(() => {
    apiRequest<MemberIdentity>('/identity').then(setIdentity).catch(() => undefined);
  }, []);
  const { entry, secondsLeft } = useLivePass(identity, refresh);
  const qrUrl = entry?.qrSvg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(entry.qrSvg)}` : undefined;
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

        {entry ? (
          <div className="web-pass-qr-box">
            {/* Online: the server's SVG. From the in-memory window: drawn from its cells. */}
            {qrUrl ? <img src={qrUrl} width={220} height={220} alt={t('id.qrLabel')} />
              : entry.qrMatrix ? <QrCells rows={entry.qrMatrix} label={t('id.qrLabel')} /> : null}
            <p className="web-pass-instructions">
              {t('member.pass.code')} <strong style={{ fontFamily: 'var(--sk-font-mono)', letterSpacing: '0.2em' }}>{entry.passCode}</strong>
              {' · '}{identity.memberId}
            </p>
            <p className="web-pass-instructions" aria-live="off">{t('member.pass.changesIn', { n: secondsLeft ?? 0 })}</p>
          </div>
        ) : identity.issued ? (
          <div className="web-pass-qr-box" role="status">
            <p className="web-pass-instructions">{t('member.pass.stale')}</p>
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
