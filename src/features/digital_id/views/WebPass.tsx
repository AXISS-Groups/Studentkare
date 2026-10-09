import React from 'react';
import type { MemberIdentity } from '@/data/workflowTypes';
import { useApiResource } from '@/hooks/useApiResource';
import { DataState } from '@/components/interface/WorkflowUI';
import { navigate } from '@/lib/workflowRouting';
import './web-pass.css';

const campusLabel: Record<MemberIdentity['campusStatus'], string> = {
  VERIFIED: 'Campus verified',
  PENDING: 'Campus review pending',
  NOT_SUBMITTED: 'Campus not verified',
  REJECTED: 'Campus verification rejected',
};

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
  return (
    <div className="web-pass-container" role="region" aria-label="My check-in pass">
      <DataState {...resource} retry={resource.reload}>
        {resource.data && <PassBody identity={resource.data} />}
      </DataState>
    </div>
  );
}

function PassBody({ identity }: { identity: MemberIdentity }): React.ReactElement {
  const qrUrl = identity.qrSvg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(identity.qrSvg)}` : undefined;
  return (
    <div className="web-pass-layout">
      <section className="web-pass-card" aria-label="Member QR pass">
        <div className="web-pass-user-row">
          <div className="web-pass-user-info">
            <span className="web-pass-user-name">{identity.fullName}</span>
            <span className="web-pass-user-sub">
              {identity.university || 'Campus not provided'}
              {identity.rollNumber ? ` · Roll ${identity.rollNumber}` : ''}
            </span>
            <span className="web-pass-user-sub">{campusLabel[identity.campusStatus]}</span>
          </div>
        </div>

        {qrUrl ? (
          <div className="web-pass-qr-box">
            <img src={qrUrl} width={220} height={220} alt="Your member verification QR code" />
          </div>
        ) : (
          <div className="web-pass-qr-box">
            <p className="web-pass-instructions">You haven’t created a member QR yet.</p>
            <button type="button" className="health-button health-button-primary" onClick={() => navigate('digital-id')}>
              Create my Digital ID
            </button>
          </div>
        )}

        <p className="web-pass-instructions">
          Campus and clinical staff scan this to confirm your membership. It does not prove who is holding the phone, and it is not an ABHA or government ID. You can replace or revoke it from your Digital ID.
        </p>
      </section>

      <div className="web-pass-details-col">
        <div>
          <h1 className="web-pass-title">My check-in pass</h1>
        </div>
        <section aria-labelledby="web-pass-history-heading">
          <h2 id="web-pass-history-heading" className="web-pass-eyebrow">Recent check-ins</h2>
          <p className="web-pass-instructions">
            No check-ins recorded. Check-in scanning at pharmacies, labs and the campus clinic isn’t connected yet, so nothing is logged here.
          </p>
        </section>
      </div>
    </div>
  );
}
