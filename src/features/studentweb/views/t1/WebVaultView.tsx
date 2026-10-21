import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon, Icon3d } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { useOnline } from '@/design-system';
import { Overlay } from '@/design-system/overlays/Overlay';
import { ConfirmDialog } from '@/design-system/overlays/ConfirmDialog';
import { useApiResource } from '@/hooks/api/useApiResource';
import { apiFileUrl, apiRequest } from '@/data/services/http';
import { useAuth } from '@/data/contexts/AuthContext';
import type { LiveDocument } from '@/data/types/workflowTypes';
import { navigate } from '@/lib/utils/workflowRouting';
import { EmptyPanel, ErrorPanel, LoadingRows, OfflinePanel, PageHead, Pill } from '../parts';
import { IconNote, dayDate, shortDate } from './shared';
import '../../studentweb.css';
import './t1web.css';

/** One page of the vault: the server caps a page at 100 documents. */
const PAGE = 100;
/** POST /records/shares accepts 1–90 days (ShareInput); the form says so before the server does. */
const SHARE_DAYS = { min: 1, max: 90, initial: '7' } as const;
/** The categories POST /health/documents accepts, in the canvas's chip order. */
export const VAULT_CATEGORIES = ['LAB', 'PRESCRIPTION', 'VACCINE', 'CAMP_REPORT', 'DISCHARGE_SUMMARY', 'OTHER'] as const;
export type VaultCategory = (typeof VAULT_CATEGORIES)[number];

/** GET /records/shares (documentId since WP-09). */
export interface VaultShare { id: string; clinician: string; document: string; documentId: string; grantedAt: number; expiresAt: number; revoked: boolean; active: boolean }

const KIND: Record<VaultCategory, { label: MessageKey; chip: MessageKey; icon: SkIconName; tone: string }> = {
  LAB: { label: 'swt.vault.type.LAB', chip: 'swt.vault.chip.LAB', icon: 'flask-2', tone: 'is-lab' },
  PRESCRIPTION: { label: 'swt.vault.type.PRESCRIPTION', chip: 'swt.vault.chip.PRESCRIPTION', icon: 'file-3', tone: '' },
  VACCINE: { label: 'swt.vault.type.VACCINE', chip: 'swt.vault.chip.VACCINE', icon: 'shield-2', tone: 'is-vaccine' },
  CAMP_REPORT: { label: 'swt.vault.type.CAMP_REPORT', chip: 'swt.vault.chip.CAMP_REPORT', icon: 'house-outline', tone: 'is-campus' },
  DISCHARGE_SUMMARY: { label: 'swt.vault.type.DISCHARGE_SUMMARY', chip: 'swt.vault.chip.DISCHARGE_SUMMARY', icon: 'heart-plus-2', tone: '' },
  OTHER: { label: 'swt.vault.type.OTHER', chip: 'swt.vault.chip.OTHER', icon: 'file-3', tone: 'is-campus' },
};
const kindOf = (category: string): VaultCategory => ((VAULT_CATEGORIES as readonly string[]).includes(category) ? category as VaultCategory : 'OTHER');

/** The four tiles, from the server's list only (never invented). */
export function vaultStats(documents: LiveDocument[], total: number, shares: VaultShare[]) {
  const sharedNow = new Set(shares.filter((share) => share.active).map((share) => share.documentId));
  const newest = documents.reduce<number | null>((max, doc) => (max === null || doc.createdAt > max ? doc.createdAt : max), null);
  return {
    documents: total,
    labReports: documents.filter((doc) => kindOf(doc.category) === 'LAB').length,
    sharedNow: documents.filter((doc) => sharedNow.has(doc.id)).length,
    lastAdded: newest,
  };
}

/**
 * Health vault (canvas 3b, WebVault, Tier 1 — approved by Krishna
 * Chintakayala, 2026-10-21). The student's own documents (GET /health/documents)
 * and the shares they granted (GET /records/shares).
 *
 * Not drawn, on purpose: "Linked to ABDM" (no ABHA link exists server-side,
 * D9-1) and the Source column (a document records no source). Sharing, revoking,
 * upload and export are the existing endpoints, unchanged.
 */
export function WebVaultView() {
  const t = useT();
  const online = useOnline();
  const { user } = useAuth();
  const docs = useApiResource<{ items: LiveDocument[]; total?: number }>(`/health/documents?limit=${PAGE}&offset=0`);
  const shares = useApiResource<{ items: VaultShare[] }>('/records/shares');
  const [filter, setFilter] = useState<VaultCategory | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [sharing, setSharing] = useState<LiveDocument | null>(null);
  const [revoking, setRevoking] = useState<{ doc: LiveDocument; shares: VaultShare[] } | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [revokeError, setRevokeError] = useState('');
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);

  const items = useMemo(() => docs.data?.items ?? [], [docs.data]);
  const shareList = useMemo(() => shares.data?.items ?? [], [shares.data]);
  const total = docs.data?.total ?? items.length;
  const stats = vaultStats(items, total, shareList);
  const counts = useMemo(() => {
    const out = new Map<VaultCategory, number>();
    for (const doc of items) out.set(kindOf(doc.category), (out.get(kindOf(doc.category)) ?? 0) + 1);
    return out;
  }, [items]);
  const activeFor = (id: string) => shareList.filter((share) => share.active && share.documentId === id);
  const needle = query.trim().toLowerCase();
  const shown = items.filter((doc) => (filter === 'ALL' || kindOf(doc.category) === filter) && (!needle || doc.title.toLowerCase().includes(needle)));

  const exportAll = async () => {
    setExporting(true);
    setExportError('');
    try {
      const data = await apiRequest<unknown>('/records/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'studentkare-export.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(t('swt.vault.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const revoke = async () => {
    if (!revoking) return;
    setRevokeBusy(true);
    setRevokeError('');
    try {
      for (const share of revoking.shares) await apiRequest(`/records/shares/${encodeURIComponent(share.id)}/revoke`, { method: 'POST' });
      setRevoking(null);
      shares.reload();
    } catch {
      // Fail closed in the UI: the row stays "Shared" until the server confirms; say so.
      setRevokeError(t('swt.vault.revokeFailed'));
      shares.reload();
    } finally {
      setRevokeBusy(false);
    }
  };

  const head = (
    <PageHead
      title={t('swt.vault.title')}
      sub={docs.data ? t('swt.vault.sub', { count: total }) : t('swt.vault.subEmpty')}
      actions={(
        <>
          <button type="button" className="sk-sw-btn sk-sw-btn--outline" disabled={exporting || !online} onClick={() => void exportAll()}>
            <Icon name="share" size={17} />{exporting ? t('swt.vault.exporting') : t('swt.vault.export')}
          </button>
          <button type="button" className="sk-sw-btn sk-sw-btn--primary" disabled={!online} onClick={() => setAdding(true)}>
            <Icon name="plus" size={17} />{t('swt.vault.add')}
          </button>
        </>
      )}
    />
  );

  const loading = docs.loading || shares.loading;
  const failed = docs.error || shares.error;
  let body: React.ReactNode;
  if (!online && (failed || loading)) body = <OfflinePanel onRetry={() => { docs.reload(); shares.reload(); }} />;
  else if (loading) body = <LoadingRows label={t('swt.vault.loading')} rows={5} />;
  else if (failed) body = <ErrorPanel title={t('swt.vault.errorTitle')} body={t('swt.vault.errorBody')} onRetry={() => { docs.reload(); shares.reload(); }} />;
  else if (!items.length) {
    body = (
      <EmptyPanel
        icon3d={<Icon3d name="vault-alt--p4" size={88} />}
        title={t('swt.vault.emptyTitle')}
        body={t('swt.vault.emptyBody')}
        action={{ label: t('swt.vault.upload'), onPress: () => setAdding(true) }}
        secondary={user && !user.isVerifiedStudent ? { label: t('swt.vault.verifyFirst'), onPress: () => navigate('verify') } : undefined}
      />
    );
  } else {
    body = (
      <>
        <dl className="sk-swt-stats" aria-label={t('swt.vault.statsLabel')}>
          <div><dt>{t('swt.vault.stat.documents')}</dt><dd>{stats.documents}</dd></div>
          <div><dt>{t('swt.vault.stat.labs')}</dt><dd>{stats.labReports}</dd></div>
          <div><dt>{t('swt.vault.stat.shared')}</dt><dd className={stats.sharedNow === 0 ? 'is-positive' : undefined}>{stats.sharedNow}</dd></div>
          <div><dt>{t('swt.vault.stat.last')}</dt><dd>{stats.lastAdded ? shortDate(stats.lastAdded) : '—'}</dd></div>
        </dl>

        <div className="sk-swt-toolbar">
          <div className="sk-sw-tabs" role="group" aria-label={t('swt.vault.filterLabel')}>
            <button type="button" className="sk-sw-tab" aria-pressed={filter === 'ALL'} onClick={() => setFilter('ALL')}>{t('swt.vault.chip.all', { count: items.length })}</button>
            {VAULT_CATEGORIES.filter((category) => counts.get(category)).map((category) => (
              <button key={category} type="button" className="sk-sw-tab" aria-pressed={filter === category} onClick={() => setFilter(category)}>
                {t(KIND[category].chip, { count: counts.get(category) ?? 0 })}
              </button>
            ))}
          </div>
          <label className="sk-swt-search">
            <Icon name="search-3" size={17} />
            <span className="sk-visually-hidden">{t('swt.vault.searchLabel')}</span>
            <input type="search" value={query} placeholder={t('swt.vault.searchPlaceholder')} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>

        {revokeError ? <p className="sk-sw-error" role="alert">{revokeError}</p> : null}
        {exportError ? <p className="sk-sw-error" role="alert">{exportError}</p> : null}

        {shown.length ? (
          <div className="sk-sw-card sk-sw-table-wrap">
            <table className="sk-sw-table">
              <caption className="sk-visually-hidden">{t('swt.vault.caption')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('swt.vault.col.document')}</th>
                  <th scope="col">{t('swt.vault.col.type')}</th>
                  <th scope="col">{t('swt.vault.col.date')}</th>
                  <th scope="col">{t('swt.vault.col.shared')}</th>
                  <th scope="col"><span className="sk-visually-hidden">{t('swt.vault.col.actions')}</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((doc) => {
                  const kind = KIND[kindOf(doc.category)];
                  const active = activeFor(doc.id);
                  return (
                    <tr key={doc.id}>
                      <td>
                        <span className="sk-swt-doc">
                          <span className={`sk-swt-doc__icon ${kind.tone}`} aria-hidden="true"><Icon name={kind.icon} size={19} /></span>
                          <span className="sk-swt-doc__text"><strong>{doc.title}</strong><small>{doc.filename}</small></span>
                        </span>
                      </td>
                      <td>{t(kind.label)}</td>
                      <td>{dayDate(doc.createdAt)}</td>
                      <td>
                        {active.length
                          ? <Pill tone="action"><Icon name="user-3" size={13} />{t('swt.vault.shared', { count: active.length })}</Pill>
                          : <Pill tone="muted"><Icon name="lock-3" size={13} />{t('swt.vault.private')}</Pill>}
                      </td>
                      <td className="sk-sw-table__action">
                        <RowMenu
                          open={menuFor === doc.id}
                          label={t('swt.vault.menuFor', { title: doc.title })}
                          onToggle={(next) => setMenuFor(next ? doc.id : null)}
                        >
                          <a href={apiFileUrl(doc.id)} download><Icon name="file-3" size={17} />{t('swt.vault.download')}</a>
                          <button type="button" disabled={!online} onClick={() => { setMenuFor(null); setSharing(doc); }}><Icon name="share" size={17} />{t('swt.vault.shareWith')}</button>
                          {active.length ? (
                            <button type="button" disabled={!online} onClick={() => { setMenuFor(null); setRevokeError(''); setRevoking({ doc, shares: active }); }}>
                              <Icon name="lock-keyhole" size={17} />{t('swt.vault.stopSharing')}
                            </button>
                          ) : null}
                        </RowMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPanel title={t('swt.vault.noMatchTitle')} body={t('swt.vault.noMatchBody')} action={{ label: t('swt.vault.showAll'), onPress: () => { setFilter('ALL'); setQuery(''); } }} />
        )}
        {total > items.length ? <p className="sk-sw-fine">{t('swt.vault.capped', { shown: items.length, total })}</p> : null}
      </>
    );
  }

  return (
    <div className="sk-sw-page" data-testid="web-vault">
      {head}
      {body}
      <IconNote icon="lock-5">{t('swt.vault.shareNote')}</IconNote>

      <UploadDialog open={adding} onClose={() => setAdding(false)} onDone={() => { setAdding(false); docs.reload(); }} />
      <ShareDialog doc={sharing} onClose={() => setSharing(null)} onDone={() => { setSharing(null); shares.reload(); }} />
      <ConfirmDialog
        open={revoking !== null}
        icon="stop-sharing"
        tone="action"
        title={t('swt.vault.revokeTitle', { title: revoking?.doc.title ?? '' })}
        body={revoking ? t('swt.vault.revokeBody', { names: revoking.shares.map((share) => share.clinician).join(', ') }) : ''}
        confirmLabel={t('swt.vault.stopSharing')}
        busyLabel={t('swt.vault.stopping')}
        cancelLabel={t('swt.vault.keepSharing')}
        busy={revokeBusy}
        onConfirm={() => void revoke()}
        onCancel={() => setRevoking(null)}
      />
    </div>
  );
}

/** The row menu: a disclosure button and a list; Esc and outside clicks close it. */
function RowMenu({ open, label, onToggle, children }: { open: boolean; label: string; onToggle: (open: boolean) => void; children: React.ReactNode }) {
  const wrap = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { onToggle(false); button.current?.focus(); } };
    const onClick = (event: MouseEvent) => { if (wrap.current && !wrap.current.contains(event.target as Node)) onToggle(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [open, onToggle]);
  return (
    <span className="sk-swt-menuwrap" ref={wrap}>
      <button ref={button} type="button" className="sk-sw-icon-btn" aria-label={label} aria-expanded={open} onClick={() => onToggle(!open)}>
        <Icon name="chevron-down" size={18} />
      </button>
      {open ? <span className="sk-swt-menu" role="group" aria-label={label}>{children}</span> : null}
    </span>
  );
}

function UploadDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<VaultCategory>('LAB');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setTitle(''); setFile(null); setError(''); } }, [open]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !title.trim()) return;
    const form = new FormData();
    form.append('title', title.trim());
    form.append('category', category);
    form.append('file', file);
    setBusy(true);
    setError('');
    try {
      await apiRequest('/health/documents', { method: 'POST', body: form });
      onDone();
    } catch (reason) {
      setError(reason instanceof Error && reason.message ? reason.message : t('swt.vault.uploadFailed'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Overlay open={open} variant="dialog" showClose title={t('swt.vault.uploadTitle')} subtitle={t('swt.vault.uploadBody')} onClose={onClose} busy={busy}>
      <form className="sk-swt-dialog-form" onSubmit={(event) => void submit(event)}>
        <label className="sk-sw-field">{t('swt.vault.uploadName')}
          <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="sk-sw-field">{t('swt.vault.uploadType')}
          <select value={category} onChange={(event) => setCategory(kindOf(event.target.value))}>
            {VAULT_CATEGORIES.map((value) => <option key={value} value={value}>{t(KIND[value].label)}</option>)}
          </select>
        </label>
        <label className="sk-sw-field">{t('swt.vault.uploadFile')}
          <input type="file" required accept="application/pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <p className="sk-swt-hint">{t('swt.vault.uploadHint')}</p>
        {error ? <p className="sk-swt-error" role="alert">{error}</p> : null}
        <div className="sk-swt-actions">
          <button type="button" className="sk-swt-btn sk-swt-btn--ghost" onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
          <button type="submit" className="sk-swt-btn sk-swt-btn--primary" disabled={busy || !file || !title.trim()}>{busy ? t('swt.vault.uploading') : t('swt.vault.uploadCta')}</button>
        </div>
      </form>
    </Overlay>
  );
}

function ShareDialog({ doc, onClose, onDone }: { doc: LiveDocument | null; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [days, setDays] = useState<string>(SHARE_DAYS.initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (doc) { setEmail(''); setDays(SHARE_DAYS.initial); setError(''); } }, [doc]);
  const valid = /^\S+@\S+\.\S+$/.test(email.trim()) && Number.isInteger(Number(days)) && Number(days) >= SHARE_DAYS.min && Number(days) <= SHARE_DAYS.max;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!doc || !valid) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest('/records/shares', { method: 'POST', body: JSON.stringify({ documentId: doc.id, clinicianEmail: email.trim(), expiresInDays: Number(days) }) });
      onDone();
    } catch (reason) {
      setError(reason instanceof Error && reason.message ? reason.message : t('swt.vault.shareFailed'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Overlay open={doc !== null} variant="dialog" showClose title={t('swt.vault.shareTitle', { title: doc?.title ?? '' })} subtitle={t('swt.vault.shareBody')} onClose={onClose} busy={busy}>
      <form className="sk-swt-dialog-form" onSubmit={(event) => void submit(event)}>
        <label className="sk-sw-field">{t('swt.vault.shareEmail')}
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="sk-sw-field">{t('swt.vault.shareDays', { min: SHARE_DAYS.min, max: SHARE_DAYS.max })}
          <input type="number" required min={SHARE_DAYS.min} max={SHARE_DAYS.max} value={days} onChange={(event) => setDays(event.target.value)} />
        </label>
        <p className="sk-swt-hint">{t('swt.vault.shareHint')}</p>
        {error ? <p className="sk-swt-error" role="alert">{error}</p> : null}
        <div className="sk-swt-actions">
          <button type="button" className="sk-swt-btn sk-swt-btn--ghost" onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
          <button type="submit" className="sk-swt-btn sk-swt-btn--primary" disabled={busy || !valid}>{busy ? t('swt.vault.sharing') : t('swt.vault.shareCta')}</button>
        </div>
      </form>
    </Overlay>
  );
}
