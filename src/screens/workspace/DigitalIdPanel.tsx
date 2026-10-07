import React, { useState } from 'react';
import { CreditCard, Download, IdCard, Printer, QrCode, RefreshCw, ScanLine, ShieldCheck, ShieldOff } from 'lucide-react';
import { useAuth } from '../../data/AuthContext';
import { apiRequest } from '../../data/http';
import type { IdentitySummary, MemberIdentity } from '../../data/workflowTypes';
import { useApiResource } from '../../hooks/useApiResource';
import { DataState, Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { ABHALinkScreen } from '../digital_id/ABHALinkScreen';
import { HealthPassportQRScreen } from '../digital_id/HealthPassportQRScreen';
import './member-profile.css';
import '../../theme/workflows.css';

const campusLabel = (status: IdentitySummary['campusStatus']) => ({ VERIFIED: 'Campus verified', PENDING: 'Campus review pending', NOT_SUBMITTED: 'Campus not verified', REJECTED: 'Campus verification rejected' })[status];

type DigitalIdTab = 'card' | 'abha' | 'passport-qr';

export function DigitalIdPanel() {
  const [tab, setTab] = useState<DigitalIdTab>('card');
  const resource = useApiResource<MemberIdentity>('/identity');
  const { user } = useAuth();
  const canVerify = user && ['SUPER_ADMIN', 'CAMPUS_ADMIN', 'NMC_DOCTOR'].includes(user.role);

  return (
    <div className="wf-digital-id-hub">
      <div className="wf-panel-heading" style={{ marginBottom: 16 }}>
        <div>
          <span className="care-eyebrow">ONE ACCOUNT. A CLEARER CONNECTION.</span>
          <h2>Your Digital Identity & ABHA Health Card.</h2>
          <p>Manage your Studentkare member card, ABHA M1/M2 identity, and emergency health passport QR.</p>
        </div>
      </div>

      <nav
        className="wf-tab-bar"
        aria-label="Digital ID tabs"
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          borderBottom: '1px solid #e7d8ef',
          paddingBottom: 8,
        }}
      >
        <button
          role="tab"
          aria-selected={tab === 'card'}
          aria-label="Member Card & Staff Verification"
          onClick={() => setTab('card')}
          className={`health-button ${tab === 'card' ? 'health-button-primary' : ''}`}
          style={{ minHeight: 44, padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10 }}
        >
          <IdCard size={16} /> Member Card
        </button>
        <button
          role="tab"
          aria-selected={tab === 'abha'}
          aria-label="ABHA Link & Health ID"
          onClick={() => setTab('abha')}
          className={`health-button ${tab === 'abha' ? 'health-button-primary' : ''}`}
          style={{ minHeight: 44, padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10 }}
        >
          <CreditCard size={16} /> ABHA Link
        </button>
        <button
          role="tab"
          aria-selected={tab === 'passport-qr'}
          aria-label="Health Passport QR"
          onClick={() => setTab('passport-qr')}
          className={`health-button ${tab === 'passport-qr' ? 'health-button-primary' : ''}`}
          style={{ minHeight: 44, padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10 }}
        >
          <QrCode size={16} /> Passport QR
        </button>
      </nav>

      {tab === 'card' && (
        <>
          <DataState {...resource} retry={resource.reload}>{resource.data && <IdentityCard initial={resource.data} />}</DataState>
          {canVerify && <VerifyIdentity />}
        </>
      )}

      {tab === 'abha' && <ABHALinkScreen />}

      {tab === 'passport-qr' && <HealthPassportQRScreen />}
    </div>
  );
}

function IdentityCard({ initial }: { initial: MemberIdentity }) {
  const [card, setCard] = useState(initial);
  const [confirm, setConfirm] = useState<'revoke' | 'replace' | null>(null);
  const [notice, setNotice] = useState('');
  const mutation = useMutation();
  const qrUrl = card.qrSvg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(card.qrSvg)}` : undefined;
  const change = (method: 'POST' | 'DELETE') => {
    setNotice('');
    mutation.run(() => apiRequest<MemberIdentity>('/identity', { method }), result => {
      setCard(result); setConfirm(null); setNotice(method === 'DELETE' ? 'QR code revoked. Previous copies can no longer be verified.' : 'Your Digital ID is ready.');
    });
  };
  return <div className="member-identity-layout">
    <article className="member-id-card member-print-card" aria-label="Studentkare member card">
      <div className="member-id-top"><span><IdCard size={24} />Studentkare</span><span>MEMBER CARD</span></div>
      <div className="member-id-person"><div className="member-id-avatar" aria-hidden="true">{card.fullName.charAt(0).toUpperCase()}</div><div><span>YOUR CONNECTED CARE ACCOUNT</span><h3>{card.fullName}</h3><p>{card.university || 'Campus details not provided'}</p></div></div>
      <div className="member-id-body"><dl><div><dt>Member number</dt><dd className="member-id-number">{card.memberId}</dd></div><div><dt>Student / roll number</dt><dd>{card.rollNumber || 'Not provided'}</dd></div><div><dt>Affiliation status</dt><dd>{campusLabel(card.campusStatus)}</dd></div></dl>
        <div className="member-id-qr">{qrUrl ? <img src={qrUrl} width={184} height={184} alt="Your scannable member verification QR code" /> : <div className="member-id-qr-empty"><ScanLine size={40} /><span>Create your QR below</span></div>}</div>
      </div>
      <div className="member-id-footer"><span><ShieldCheck size={15} />{card.issued ? 'Revocable QR · online staff verification' : 'QR not issued'}</span><span>{card.issuedAt ? new Date(card.issuedAt * 1000).toLocaleDateString() : 'YOUR CARE, CONNECTED'}</span></div>
      <p className="member-id-disclaimer">Studentkare membership only. Not an ABHA, government identity document, or proof of medical eligibility. Check current status online.</p>
    </article>
    <section className="wf-card member-id-controls"><span className="care-eyebrow">SHARE WITH INTENTION</span><h3>Your code. Your control.</h3><p>Show this code to campus or clinical staff. Their signed-in verification shows your name, campus details and current affiliation status.</p><p>The QR contains an opaque verification code. Your health records, birth date and contact details are not included.</p>
      <FormError message={mutation.error} />{notice && <p role="status" className="wf-notice">{notice}</p>}
      {card.issued ? <>
        <a className="health-button" href={qrUrl} download="studentkare-member-qr.svg"><Download size={17} />Download QR (SVG)</a>
        <button className="health-button" onClick={() => window.print()}><Printer size={17} />Print card / save PDF</button>
        <button className="health-button" disabled={mutation.busy} onClick={() => setConfirm('replace')}><RefreshCw size={17} />Replace QR code</button>
        <button className="health-button" disabled={mutation.busy} onClick={() => setConfirm('revoke')}><ShieldOff size={17} />Revoke QR code</button>
        <details className="wf-details"><summary>Verification code for a staff scanner</summary><Field label="Member verification code" hint="A scanner can read the QR as text. Staff can paste the result into Verify a member card."><textarea readOnly value={card.code || ''} /></Field></details>
      </> : <button className="health-button health-button-primary" disabled={mutation.busy} onClick={() => change('POST')}><IdCard size={18} />{mutation.busy ? 'Creating Digital ID…' : 'Create Digital ID'}</button>}
    </section>
    {confirm && <ShopDialog title={confirm === 'revoke' ? 'Revoke this QR code?' : 'Replace this QR code?'} onClose={() => { if (!mutation.busy) setConfirm(null); }}><p>Any previously downloaded or printed QR will stop working for online verification. Your account and health records remain available.</p><FormError message={mutation.error} /><div className="wf-row-actions"><button className="health-button" disabled={mutation.busy} onClick={() => setConfirm(null)}>Cancel</button><button className="health-button health-button-primary" disabled={mutation.busy} onClick={() => change(confirm === 'revoke' ? 'DELETE' : 'POST')}>{confirm === 'revoke' ? 'Confirm revocation' : 'Confirm replacement'}</button></div></ShopDialog>}
  </div>;
}

function VerifyIdentity() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<IdentitySummary | null>(null);
  const mutation = useMutation();
  return <section className="wf-card member-verifier"><span className="care-eyebrow">CAMPUS & CLINICAL STAFF</span><h3>Verify a member card.</h3><p>Scan the QR with your scanner or camera app, then paste its text below. This verifies a current member code; it does not prove the presenter’s identity.</p><form className="wf-form" onSubmit={event => { event.preventDefault(); setResult(null); mutation.run(() => apiRequest<IdentitySummary>('/identity/verify', { method: 'POST', body: JSON.stringify({ code: code.trim() }) }), setResult); }}><Field label="Scanned verification code"><input required maxLength={180} autoComplete="off" spellCheck={false} value={code} onChange={event => { setCode(event.target.value); setResult(null); mutation.setError(''); }} placeholder="SACARE-ID:…" /></Field><FormError message={mutation.error} /><SubmitButton busy={mutation.busy}>Verify member code</SubmitButton></form>{result && <div className="member-verification-result" role="status"><ShieldCheck size={22} /><div><strong>Active member code · {result.fullName}</strong><p>{result.university || 'Campus not provided'} · {result.rollNumber || 'Roll number not provided'}</p><p>{campusLabel(result.campusStatus)}</p></div></div>}</section>;
}
