import React, { useState } from 'react';
import { useApiResource } from '@/hooks/api/useApiResource';
import { apiRequest } from '@/data/services/http';
import { displayDate } from '@/data/types/workflowTypes';
import type { SupportTicket } from '@/data/types/workflowTypes';
import { DataState, EmptyState, Field, FormError, SubmitButton, useMutation } from '@/components/interface/WorkflowUI';
import { useT } from '@/i18n';

const positiveNotice: React.CSSProperties = { background: 'var(--sk-color-positive-bg)', color: 'var(--sk-color-text)', borderColor: 'var(--sk-color-positive)' };

export function SupportPanel({ staff = false }: { staff?: boolean }) {
  const t = useT();
  const resource = useApiResource<{ items: SupportTicket[] }>('/support');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const mutation = useMutation();
  return <><div className="wf-panel-heading"><div><span className="care-eyebrow">{t('member.support.eyebrow')}</span><h2>{staff ? t('member.support.staffTitle') : t('member.support.title')}</h2><p>{staff ? t('member.support.staffBody') : t('member.support.body')}</p></div></div>
  <FormError message={mutation.error} />
  {sent && <div className="wf-notice" role="status" style={{ ...positiveNotice, marginBottom: '16px' }}>{t('member.support.sent')}</div>}
  {!staff && <form className="wf-card wf-form" onSubmit={event => { event.preventDefault(); setSent(false); mutation.run(() => apiRequest('/support', { method: 'POST', body: JSON.stringify({ subject, message }) }), () => { setSent(true); setSubject(''); setMessage(''); resource.reload(); }); }}><Field label={t('member.support.subject')}><input required minLength={3} maxLength={160} value={subject} onChange={event => setSubject(event.target.value)} /></Field><Field label={t('member.support.message')}><textarea required minLength={10} maxLength={2000} rows={4} value={message} onChange={event => setMessage(event.target.value)} /></Field><SubmitButton busy={mutation.busy}>{t('member.support.send')}</SubmitButton></form>}
  <DataState {...resource} retry={resource.reload}>{resource.data?.items.length ? <div className="wf-order-list wf-section-gap">{resource.data.items.map(ticket => <article className="wf-card" key={ticket.id}><div className="wf-panel-heading"><div><h3>{ticket.subject}</h3></div><span className="wf-status">{ticket.status}</span></div><p>{ticket.message}</p><small>{displayDate(ticket.createdAt)}</small>{staff && ticket.status === 'OPEN' && <button type="button" className="health-button" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/ops/support/${ticket.id}`, { method: 'PATCH' }), resource.reload)}>{t('member.support.markResolved')}</button>}</article>)}</div> : <EmptyState title={t('member.support.emptyTitle')} description={t('member.support.emptyBody')} animation="anim-message" />}</DataState></>;
}
