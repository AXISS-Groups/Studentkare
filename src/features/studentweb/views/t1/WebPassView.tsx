import React, { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { useOnline } from '@/design-system';
import { useApiResource } from '@/hooks/api/useApiResource';
import { apiRequest } from '@/data/services/http';
import type { MemberIdentity } from '@/data/types/workflowTypes';
import { navigate } from '@/lib/utils/workflowRouting';
import { initialsOf, shortNameOf } from '@/design-system/student-shell/StudentWebShell';
import { useLivePass } from '@/features/digital_id/viewmodel/livePass';
import { QrCells } from '@/features/digital_id/views/DigitalIdNativeView';
import { EmptyPanel, ErrorPanel, LoadingRows, OfflinePanel, PageHead } from '../parts';
import { IconNote } from './shared';
import '../../studentweb.css';
import './t1web.css';

/** One server-signed step. The ring empties over the step the server issued (startsAt to expiresAt). */
function stepLength(identity: MemberIdentity, expiresAt: number): number {
  const entry = identity.passWindow?.find((candidate) => candidate.expiresAt === expiresAt);
  return entry ? Math.max(1, entry.expiresAt - entry.startsAt) : 0;
}

/** What happens when staff scan the pass: only what /identity/verify really does. */
const STEPS: ReadonlyArray<{ title: MessageKey; body: MessageKey }> = [
  { title: 'swt.pass.step.scan', body: 'swt.pass.step.scanBody' },
  { title: 'swt.pass.step.see', body: 'swt.pass.step.seeBody' },
  { title: 'swt.pass.step.not', body: 'swt.pass.step.notBody' },
];

/**
 * My check-in pass, web (canvas 3b, WebPass, Tier 1 — approved by Krishna
 * Chintakayala, 2026-10-21). The server-signed pass (GET /identity): QR and
 * spoken code for this step, refreshed in place; a stale code is hidden, never
 * left up to fail at the counter.
 *
 * Not drawn, on purpose: the check-in history and "This wasn't me" (no
 * check-in log for students, D6-8), the photo match and "deleted after 24 h"
 * (the counter check returns name, campus and roll number only — no photo is
 * taken), and "Identity verified · 4 of 4" (there is no four-step score).
 */
export function WebPassView() {
  const t = useT();
  const online = useOnline();
  const resource = useApiResource<MemberIdentity>('/identity');
  let body: React.ReactNode;
  if (!online && (resource.error || resource.loading)) body = <OfflinePanel onRetry={resource.reload} />;
  else if (resource.loading) body = <LoadingRows label={t('swt.pass.loading')} rows={3} />;
  else if (resource.error || !resource.data) body = <ErrorPanel title={t('swt.pass.errorTitle')} body={t('swt.pass.errorBody')} onRetry={resource.reload} />;
  else body = <PassBody first={resource.data} />;
  return <div className="sk-sw-page" data-testid="web-pass">{body}</div>;
}

function PassBody({ first }: { first: MemberIdentity }) {
  const t = useT();
  const [identity, setIdentity] = useState(first);
  useEffect(() => setIdentity(first), [first]);
  // The next steps are fetched in place; if that fails the old code is hidden once it expires.
  const refresh = useCallback(() => { apiRequest<MemberIdentity>('/identity').then(setIdentity).catch(() => undefined); }, []);
  const { entry, secondsLeft } = useLivePass(identity, refresh);
  const qrUrl = entry?.qrSvg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(entry.qrSvg)}` : undefined;
  const length = entry ? stepLength(identity, entry.expiresAt) : 0;
  const share = length && secondsLeft !== null ? Math.min(1, secondsLeft / length) : 1;
  const verified = identity.campusStatus === 'VERIFIED';

  return (
    <div className="sk-swt-two sk-swt-two--wide-side">
      <section className="sk-swt-pass" aria-label={t('pass.card')}>
        <div className="sk-swt-pass__who">
          <span className="sk-swt-pass__avatar" aria-hidden="true">{initialsOf(identity.fullName)}</span>
          <span>
            <strong>{shortNameOf(identity.fullName)}</strong>
            <small>{identity.university || t('id.campusNotProvided')}{identity.rollNumber ? ` · ${t('id.roll', { roll: identity.rollNumber })}` : ''}</small>
            <small className={verified ? 'is-positive' : undefined}>
              {verified ? <Icon name="check" size={13} /> : null}{t(`verify.campus.${identity.campusStatus}.title` as MessageKey)}
            </small>
          </span>
        </div>

        {entry ? (
          <>
            <div className="sk-swt-qr">
              {qrUrl ? <img src={qrUrl} alt={t('id.qrLabel')} /> : entry.qrMatrix ? <QrCells rows={entry.qrMatrix} label={t('id.qrLabel')} /> : null}
            </div>
            <div className="sk-swt-pass__timer">
              <span className="sk-swt-fact">
                <span className="sk-swt-ring" style={{ ['--sk-swt-p' as string]: share }} aria-hidden="true" />
                <span><span className="sk-sw-eyebrow">{t('swt.pass.refreshes')}</span><br /><strong className="sk-sw-mono" aria-live="off">{t('swt.pass.seconds', { n: secondsLeft ?? 0 })}</strong></span>
              </span>
              <span>
                <span className="sk-sw-eyebrow">{t('swt.pass.sayCode')}</span><br />
                <strong className="sk-swt-code" aria-label={t('swt.pass.codeSpoken', { code: entry.passCode.split('').join(' '), member: identity.memberId })}>{entry.passCode}</strong>
              </span>
            </div>
            <p className="sk-sw-fine">{t('swt.pass.memberId', { id: identity.memberId })}</p>
          </>
        ) : identity.issued ? (
          <IconNote icon="alert-triangle" tone="attention" role="status">{t('member.pass.stale')}</IconNote>
        ) : (
          <EmptyPanel title={t('pass.noQr')} body={t('swt.pass.createBody')} action={{ label: t('pass.createId'), onPress: () => navigate('digital-id') }} />
        )}
        <p className="sk-sw-muted">{t('swt.pass.laptop')}</p>
      </section>

      <div className="sk-swt-col">
        <PageHead title={t('pass.title')} sub={t('swt.pass.sub')} />
        <section aria-labelledby="sk-swt-pass-history">
          <h2 id="sk-swt-pass-history" className="sk-sw-eyebrow">{t('pass.recent')}</h2>
          <p className="sk-sw-note">{t('pass.noCheckins')}</p>
        </section>
        <div className="sk-swt-steps3">
          {STEPS.map((step) => (
            <div key={step.title} className="sk-sw-card"><strong>{t(step.title)}</strong><p>{t(step.body)}</p></div>
          ))}
        </div>
        <p className="sk-sw-fine">{t('pass.note')}</p>
      </div>
    </div>
  );
}
