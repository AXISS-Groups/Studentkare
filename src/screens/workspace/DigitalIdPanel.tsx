import React, { useCallback, useState } from 'react';
import { CreditCard, IdCard, Printer, QrCode, RefreshCw, ScanLine, ShieldCheck, ShieldOff } from 'lucide-react';
import { useAuth } from '../../data/AuthContext';
import { apiRequest } from '../../data/http';
import type { IdentitySummary, MemberIdentity } from '../../data/workflowTypes';
import { useApiResource } from '../../hooks/useApiResource';
import { DataState, Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { ABHALinkScreen } from '../digital_id/ABHALinkScreen';
import { HealthPassportQRScreen } from '../digital_id/HealthPassportQRScreen';
import { useLivePass } from '@/features/digital_id/viewmodel/livePass';
import { QrCells } from '@/features/digital_id/views/DigitalIdNativeView';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import './member-profile.css';
import '../../theme/workflows.css';

const CAMPUS_LABEL: Record<IdentitySummary['campusStatus'], MessageKey> = { VERIFIED: 'member.digitalId.campus.VERIFIED', PENDING: 'member.digitalId.campus.PENDING', NOT_SUBMITTED: 'member.digitalId.campus.NOT_SUBMITTED', REJECTED: 'member.digitalId.campus.REJECTED' };

type DigitalIdTab = 'card' | 'abha' | 'passport-qr';

export function DigitalIdPanel() {
  const t = useT();
  const [tab, setTab] = useState<DigitalIdTab>('card');
  const resource = useApiResource<MemberIdentity>('/identity');
  const { user } = useAuth();
  const canVerify = user && ['SUPER_ADMIN', 'CAMPUS_ADMIN', 'NMC_DOCTOR'].includes(user.role);

  return (
    <div className="wf-digital-id-hub">
      <div className="wf-panel-heading" style={{ marginBottom: 16 }}>
        <div>
          <span className="care-eyebrow">{t('member.digitalId.eyebrow')}</span>
          <h2>{t('member.digitalId.title')}</h2>
          <p>{t('member.digitalId.body')}</p>
        </div>
      </div>

      <nav
        className="wf-tab-bar"
        aria-label={t('member.digitalId.tabsLabel')}
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          borderBottom: '1px solid var(--sk-color-rule)',
          paddingBottom: 8,
        }}
      >
        <button
          role="tab"
          aria-selected={tab === 'card'}
          aria-label={t('member.digitalId.tabCardSpoken')}
          onClick={() => setTab('card')}
          className={`health-button ${tab === 'card' ? 'health-button-primary' : ''}`}
          style={{ minHeight: 44, padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10 }}
        >
          <IdCard size={16} aria-hidden="true" /> {t('member.digitalId.tabCard')}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'abha'}
          aria-label={t('member.digitalId.tabAbhaSpoken')}
          onClick={() => setTab('abha')}
          className={`health-button ${tab === 'abha' ? 'health-button-primary' : ''}`}
          style={{ minHeight: 44, padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10 }}
        >
          <CreditCard size={16} aria-hidden="true" /> {t('member.digitalId.tabAbha')}
        </button>
        <button
          role="tab"
          aria-selected={tab === 'passport-qr'}
          aria-label={t('member.digitalId.tabPassportSpoken')}
          onClick={() => setTab('passport-qr')}
          className={`health-button ${tab === 'passport-qr' ? 'health-button-primary' : ''}`}
          style={{ minHeight: 44, padding: '8px 16px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 10 }}
        >
          <QrCode size={16} aria-hidden="true" /> {t('member.digitalId.tabPassport')}
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
  const t = useT();
  const [card, setCard] = useState(initial);
  const [confirm, setConfirm] = useState<'revoke' | 'replace' | null>(null);
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const mutation = useMutation();
  const refresh = useCallback(() => {
    apiRequest<MemberIdentity>('/identity').then(setCard).catch(() => undefined);
  }, []);
  const { entry, secondsLeft } = useLivePass(card, refresh);
  const qrUrl = entry?.qrSvg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(entry.qrSvg)}` : undefined;
  const change = (method: 'POST' | 'DELETE') => {
    setNotice(null);
    mutation.run(() => apiRequest<MemberIdentity>('/identity', { method }), result => {
      setCard(result); setConfirm(null); setNotice(method === 'DELETE' ? 'member.digitalId.revoked' : 'member.digitalId.ready');
    });
  };
  return <div className="member-identity-layout">
    <article className="member-id-card member-print-card" aria-label={t('member.digitalId.cardLabel')}>
      <div className="member-id-top"><span><IdCard size={24} aria-hidden="true" />Studentkare</span><span>{t('member.digitalId.cardTag')}</span></div>
      <div className="member-id-person"><div className="member-id-avatar" aria-hidden="true">{card.fullName.charAt(0).toUpperCase()}</div><div><span>{t('member.digitalId.cardAccount')}</span><h3>{card.fullName}</h3><p>{card.university || t('member.digitalId.campusNotProvided')}</p></div></div>
      <div className="member-id-body"><dl><div><dt>{t('member.digitalId.memberNumber')}</dt><dd className="member-id-number">{card.memberId}</dd></div><div><dt>{t('member.digitalId.rollNumber')}</dt><dd>{card.rollNumber || t('member.profile.notProvided')}</dd></div><div><dt>{t('member.digitalId.affiliation')}</dt><dd>{t(CAMPUS_LABEL[card.campusStatus])}</dd></div></dl>
        <div className="member-id-qr">{entry ? <>{qrUrl ? <img src={qrUrl} width={184} height={184} alt={t('member.digitalId.qrAlt')} /> : entry.qrMatrix ? <QrCells rows={entry.qrMatrix} label={t('member.digitalId.qrAlt')} /> : null}<p>{t('member.pass.code')} <strong style={{ fontFamily: 'var(--sk-font-mono)', letterSpacing: '0.2em' }}>{entry.passCode}</strong></p><p>{t('member.pass.changesIn', { n: secondsLeft ?? 0 })}</p></> : <div className="member-id-qr-empty" role={card.issued ? 'status' : undefined}><ScanLine size={40} aria-hidden="true" /><span>{card.issued ? t('member.pass.stale') : t('member.digitalId.createBelow')}</span></div>}</div>
      </div>
      <div className="member-id-footer"><span><ShieldCheck size={15} aria-hidden="true" />{card.issued ? t('member.digitalId.qrIssued') : t('member.digitalId.qrNotIssued')}</span><span>{card.issuedAt ? new Date(card.issuedAt * 1000).toLocaleDateString() : t('member.digitalId.cardSlogan')}</span></div>
      <p className="member-id-disclaimer">{t('member.digitalId.disclaimer')}</p>
    </article>
    <section className="wf-card member-id-controls"><span className="care-eyebrow">{t('member.digitalId.shareEyebrow')}</span><h3>{t('member.digitalId.shareTitle')}</h3><p>{t('member.digitalId.shareBody1')}</p><p>{t('member.digitalId.shareBody2')}</p>
      <FormError message={mutation.error} />{notice && <p role="status" className="wf-notice">{t(notice)}</p>}
      {card.issued ? <>
        <button type="button" className="health-button" onClick={() => window.print()}><Printer size={17} aria-hidden="true" />{t('member.digitalId.printCard')}</button>
        <button type="button" className="health-button" disabled={mutation.busy} onClick={() => setConfirm('replace')}><RefreshCw size={17} aria-hidden="true" />{t('member.digitalId.replaceQr')}</button>
        <button type="button" className="health-button" disabled={mutation.busy} onClick={() => setConfirm('revoke')}><ShieldOff size={17} aria-hidden="true" />{t('member.digitalId.revokeQr')}</button>
      </> : <button type="button" className="health-button health-button-primary" disabled={mutation.busy} onClick={() => change('POST')}><IdCard size={18} aria-hidden="true" />{mutation.busy ? t('member.digitalId.creating') : t('member.digitalId.create')}</button>}
    </section>
    {confirm && <ShopDialog title={confirm === 'revoke' ? t('member.digitalId.revokeTitle') : t('member.digitalId.replaceTitle')} onClose={() => { if (!mutation.busy) setConfirm(null); }}><p>{t('member.digitalId.confirmBody')}</p><FormError message={mutation.error} /><div className="wf-row-actions"><button type="button" className="health-button" disabled={mutation.busy} onClick={() => setConfirm(null)}>{t('common.cancel')}</button><button type="button" className="health-button health-button-primary" disabled={mutation.busy} onClick={() => change(confirm === 'revoke' ? 'DELETE' : 'POST')}>{confirm === 'revoke' ? t('member.digitalId.confirmRevoke') : t('member.digitalId.confirmReplace')}</button></div></ShopDialog>}
  </div>;
}

function VerifyIdentity() {
  const t = useT();
  const [code, setCode] = useState('');
  const [memberId, setMemberId] = useState('');
  const [result, setResult] = useState<IdentitySummary | null>(null);
  const mutation = useMutation();
  return <section className="wf-card member-verifier"><span className="care-eyebrow">{t('member.digitalId.verifyEyebrow')}</span><h3>{t('member.digitalId.verifyTitle')}</h3><p>{t('member.digitalId.verifyBody')}</p><form className="wf-form" onSubmit={event => { event.preventDefault(); setResult(null); mutation.run(() => apiRequest<IdentitySummary>('/identity/verify', { method: 'POST', body: JSON.stringify({ code: code.trim(), memberId: memberId.trim() }) }), setResult); }}><Field label={t('member.digitalId.scannedCode')}><input required maxLength={180} autoComplete="off" spellCheck={false} value={code} onChange={event => { setCode(event.target.value); setResult(null); mutation.setError(''); }} placeholder="SKPASS1:… / 123456" /></Field><Field label={t('member.pass.memberIdLabel')} hint={t('member.pass.memberIdHint')}><input maxLength={90} autoComplete="off" spellCheck={false} value={memberId} onChange={event => { setMemberId(event.target.value); setResult(null); mutation.setError(''); }} placeholder="SK-…" /></Field><FormError message={mutation.error} /><SubmitButton busy={mutation.busy}>{t('member.digitalId.verifySubmit')}</SubmitButton></form>{result && <div className="member-verification-result" role="status"><ShieldCheck size={22} aria-hidden="true" /><div><strong>{t('member.digitalId.activeCode', { name: result.fullName })}</strong><p>{result.university || t('member.digitalId.campusMissing')} · {result.rollNumber || t('member.digitalId.rollMissing')}</p><p>{t(CAMPUS_LABEL[result.campusStatus])}</p></div></div>}</section>;
}
