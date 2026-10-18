import React, { useState } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { useApiResource } from '../../hooks/api/useApiResource';
import { apiRequest } from '../../data/services/http';
import { DataState, EmptyState, Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { useT } from '@/i18n';

/**
 * DPDP erasure queue and sealed archives (design page 7: DpdpQueue — Tier 1,
 * approved by the repository owner as named reviewer). Super admin only.
 * Opening an archive needs a written reason; it is audited and announced on
 * the ops feed. The archive downloads as a file and is never shown on screen.
 */

interface Queue {
  blocked: string | null;
  retentionDays: number | null;
  pending: { accountId: string; requestedAt: number; scheduledFor: number }[];
  archives: { id: string; formerAccountId: string; rowCount: number; archivedAt: number; destroyAfter: number; destroyed: boolean }[];
}

const day = (s: number) => new Date(s * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const short = (id: string) => id.slice(0, 8).toUpperCase();

export function ErasurePanel() {
  const t = useT();
  const queue = useApiResource<Queue>('/ops/erasure');
  const mutation = useMutation();
  const [opening, setOpening] = useState<Queue['archives'][number] | null>(null);
  const [reason, setReason] = useState('');

  const open = (archive: Queue['archives'][number]) => mutation.run(async () => {
    const res = await apiRequest<{ archive: unknown }>(`/ops/erasure/archives/${archive.id}/open`, { method: 'POST', body: JSON.stringify({ reason }) });
    const url = URL.createObjectURL(new Blob([JSON.stringify(res.archive, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `erasure-archive-${short(archive.id)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, () => { setOpening(null); setReason(''); });

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{t('member.erasure.eyebrow')}</span>
      <h2>{t('member.erasure.title')}</h2>
      <p>{queue.data?.retentionDays ? t('member.erasure.bodyDays', { days: queue.data.retentionDays }) : t('member.erasure.body')}</p>
    </div></div>
    <DataState {...queue} retry={queue.reload}>
      {queue.data?.blocked && <div className="wf-notice" role="alert"><ShieldAlert size={18} aria-hidden="true" />{t('member.erasure.paused', { reason: queue.data.blocked })}</div>}
      <section className="wf-card wf-section-gap" aria-labelledby="erasure-pending">
        <h3 id="erasure-pending">{t('member.erasure.scheduled')}</h3>
        {queue.data?.pending.length ? <div className="wf-order-list">{queue.data.pending.map(p => <div className="wf-order-line" key={p.accountId}><div><strong>{t('member.erasure.account', { id: short(p.accountId) })}</strong><small>{t('member.erasure.requested', { requested: day(p.requestedAt), scheduled: day(p.scheduledFor) })}</small></div></div>)}</div>
          : <EmptyState title={t('member.erasure.noRequestsTitle')} description={t('member.erasure.noRequestsBody')} />}
      </section>
      <section className="wf-card wf-section-gap" aria-labelledby="erasure-archives">
        <h3 id="erasure-archives">{t('member.erasure.archives')}</h3>
        {queue.data?.archives.length ? <div className="wf-order-list">{queue.data.archives.map(a => <div className="wf-order-line" key={a.id}><div><strong>{t('member.erasure.formerAccount', { id: short(a.formerAccountId) })}</strong><small>{t('member.erasure.archiveMeta', { rows: a.rowCount, sealed: day(a.archivedAt) })} · {a.destroyed ? t('member.erasure.destroyed') : t('member.erasure.destroyedOn', { date: day(a.destroyAfter) })}</small></div>
          {!a.destroyed && <button type="button" className="health-button" onClick={() => { setOpening(a); setReason(''); }}><Lock size={14} aria-hidden="true" />{t('member.erasure.openWithReason')}</button>}</div>)}</div>
          : <EmptyState title={t('member.erasure.noArchivesTitle')} description={t('member.erasure.noArchivesBody')} />}
      </section>
    </DataState>
    {opening && <ShopDialog title={t('member.erasure.openTitle', { id: short(opening.id) })} onClose={() => setOpening(null)}>
      <form className="wf-form" onSubmit={e => { e.preventDefault(); open(opening); }}>
        <p>{t('member.erasure.openBody')}</p>
        <FormError message={mutation.error} />
        <Field label={t('member.erasure.reason')} hint={t('member.erasure.reasonHint')}><textarea required minLength={10} maxLength={500} rows={3} value={reason} onChange={e => setReason(e.target.value)} /></Field>
        <SubmitButton busy={mutation.busy}>{t('member.erasure.openSubmit')}</SubmitButton>
      </form>
    </ShopDialog>}
  </>;
}
