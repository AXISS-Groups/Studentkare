import React, { useCallback, useEffect, useState } from 'react';
import { AdminEmpty, AdminError, AdminLoading, AdminPage, AdminStatus } from '@/screens/workspace/admin/AdminPage';
import { ConfirmDialog } from '@/design-system/overlays/ConfirmDialog';
import { Drawer } from '@/design-system/overlays/Drawer';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { when } from '@/features/admin/model/format';
import { legalAdminRepository } from '@/features/privacy/privacyRepository';
import type { LegalAdminRepository, LegalDocumentVersion, LegalKind } from '@/features/privacy/privacyRepository';
import './legal-documents.css';

const KINDS: readonly LegalKind[] = ['PRIVACY_NOTICE', 'TERMS', 'GRIEVANCE_OFFICER'];
const TONE = { DRAFT: 'neutral', PUBLISHED: 'positive', RETIRED: 'neutral' } as const;

type Form = { mode: 'new'; kind: LegalKind } | { mode: 'edit'; doc: LegalDocumentVersion };

/**
 * Super admin → Governance → Legal documents (/admin/legal-documents; audit H2,
 * plan tier1-canvas-wp06 D6-10 amended 2026-10-23). Not on the canvas: a console
 * sub-page (DESIGN.md Tier 3) where a super admin pastes the privacy notice,
 * terms and grievance officer details exactly as legal supplies them, as a
 * versioned draft, and publishes it. Publishing is live at once (no deploy),
 * retires the version it replaces and freezes the text. The server audits each.
 */
export function LegalDocumentsView({ repository = legalAdminRepository }: { repository?: LegalAdminRepository }) {
  const t = useT();
  const [items, setItems] = useState<LegalDocumentVersion[] | null>(null);
  const [error, setError] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [fields, setFields] = useState({ version: '', title: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [publishing, setPublishing] = useState<LegalDocumentVersion | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    setError(false);
    repository.list().then((result) => setItems(result.items), () => setError(true));
  }, [repository]);
  useEffect(load, [load]);

  const kindName = (kind: LegalKind) => t(`legaldoc.kind.${kind}` as MessageKey);
  const openNew = (kind: LegalKind) => { setForm({ mode: 'new', kind }); setFields({ version: '', title: kindName(kind), body: '' }); setFailed(false); };
  const openEdit = (doc: LegalDocumentVersion) => { setForm({ mode: 'edit', doc }); setFields({ version: doc.version, title: doc.title, body: doc.body }); setFailed(false); };

  const save = () => {
    if (!form) return;
    setSaving(true);
    setFailed(false);
    const request = form.mode === 'new'
      ? repository.create({ kind: form.kind, version: fields.version.trim(), title: fields.title.trim(), body: fields.body })
      : repository.edit(form.doc.id, { title: fields.title.trim(), body: fields.body });
    request.then(() => { setForm(null); load(); }, () => setFailed(true)).finally(() => setSaving(false));
  };

  const publish = () => {
    if (!publishing) return;
    const doc = publishing;
    setPublishBusy(true);
    repository.publish(doc.id).then(() => {
      setPublishing(null);
      setNotice(t('legaldoc.published', { kind: kindName(doc.kind), version: doc.version }));
      load();
    }, () => setFailed(true)).finally(() => setPublishBusy(false));
  };

  const canSave = fields.title.trim().length >= 2 && fields.body.trim().length > 0 && (form?.mode === 'edit' || fields.version.trim().length > 0);

  return <AdminPage eyebrow={t('admin.eyebrow.governance')} title={t('legaldoc.title')} description={t('legaldoc.description')}>
    {notice ? <p className="sk-admin-note" role="status"><Icon name="check" size={16} />{' '}{notice}</p> : null}
    {error ? <AdminError title={t('legaldoc.error')} message={t('privacy.error.body')} onRetry={load} />
      : items === null ? <AdminLoading label={t('legaldoc.loading')} />
        : KINDS.map((kind) => {
          const versions = items.filter((item) => item.kind === kind);
          const live = versions.find((item) => item.status === 'PUBLISHED');
          const headingId = `sk-legaldoc-${kind}`;
          return <section key={kind} className="sk-admin-card sk-admin-table-card sk-legaldoc" aria-labelledby={headingId}>
            <div className="sk-legaldoc__head">
              <h2 id={headingId} className="sk-legaldoc__title">{kindName(kind)}</h2>
              {live ? <AdminStatus tone="positive">{t('legaldoc.live', { version: live.version })}</AdminStatus>
                : <AdminStatus tone="attention">{t('legaldoc.notLive')}</AdminStatus>}
              <button type="button" className="sk-admin-button" onClick={() => openNew(kind)}>
                <Icon name="plus" size={16} />{t('legaldoc.new')}
              </button>
            </div>
            {versions.length ? <table className="sk-admin-table">
              <caption className="sk-admin-visually-hidden">{t('legaldoc.caption', { kind: kindName(kind) })}</caption>
              <thead><tr>
                <th scope="col">{t('legaldoc.col.version')}</th><th scope="col">{t('legaldoc.col.title')}</th>
                <th scope="col">{t('legaldoc.col.status')}</th><th scope="col">{t('legaldoc.col.updated')}</th><th scope="col">{t('legaldoc.col.actions')}</th>
              </tr></thead>
              <tbody>{versions.map((doc) => <tr key={doc.id}>
                <td className="sk-legaldoc__mono">{doc.version}</td>
                <td>{doc.title}</td>
                <td><span className={`sk-admin-tag is-${TONE[doc.status]}`}>{t(`legaldoc.status.${doc.status}` as MessageKey)}</span></td>
                <td>{when(doc.publishedAt ?? doc.updatedAt)}</td>
                <td>{doc.status === 'DRAFT' ? <div className="sk-legaldoc__actions">
                  <button type="button" className="sk-admin-button" onClick={() => openEdit(doc)}><Icon name="pencil" size={16} />{t('legaldoc.edit')}</button>
                  <button type="button" className="sk-admin-button" onClick={() => { setFailed(false); setPublishing(doc); }}><Icon name="check" size={16} />{t('legaldoc.publish')}</button>
                </div> : null}</td>
              </tr>)}</tbody>
            </table> : <AdminEmpty title={t('legaldoc.empty')} description={t('legaldoc.emptyBody')} />}
          </section>;
        })}

    <Drawer open={form !== null} busy={saving} onClose={() => setForm(null)}
      title={form?.mode === 'edit' ? t('legaldoc.editOf', { version: form.doc.version }) : form ? t('legaldoc.newOf', { kind: kindName(form.kind) }) : ''}>
      <form className="sk-legaldoc-form" onSubmit={(event) => { event.preventDefault(); if (canSave) save(); }}>
        {form?.mode === 'new' ? <div className="sk-legaldoc-form__field">
          <label htmlFor="sk-legaldoc-version">{t('legaldoc.field.version')}</label>
          <input id="sk-legaldoc-version" value={fields.version} maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9._\-]*" required aria-describedby="sk-legaldoc-version-hint"
            onChange={(event) => setFields({ ...fields, version: event.target.value })} />
          <small id="sk-legaldoc-version-hint">{t('legaldoc.field.versionHint')}</small>
        </div> : null}
        <div className="sk-legaldoc-form__field">
          <label htmlFor="sk-legaldoc-title">{t('legaldoc.field.title')}</label>
          <input id="sk-legaldoc-title" value={fields.title} maxLength={200} required onChange={(event) => setFields({ ...fields, title: event.target.value })} />
        </div>
        <div className="sk-legaldoc-form__field">
          <label htmlFor="sk-legaldoc-body">{t('legaldoc.field.body')}</label>
          <textarea id="sk-legaldoc-body" value={fields.body} rows={16} required aria-describedby="sk-legaldoc-body-hint" onChange={(event) => setFields({ ...fields, body: event.target.value })} />
          <small id="sk-legaldoc-body-hint">{t('legaldoc.field.bodyHint')}</small>
        </div>
        {failed ? <p className="sk-legaldoc-form__error" role="alert">{t('legaldoc.failed')}</p> : null}
        <button type="submit" className="sk-legaldoc-form__submit" disabled={!canSave || saving} aria-busy={saving}>
          {saving ? t('legaldoc.saving') : t('legaldoc.save')}
        </button>
      </form>
    </Drawer>

    <ConfirmDialog
      open={publishing !== null}
      title={publishing ? t('legaldoc.publishTitle', { kind: kindName(publishing.kind), version: publishing.version }) : ''}
      body={t('legaldoc.publishBody')}
      confirmLabel={t('legaldoc.publish')}
      busyLabel={t('legaldoc.publishing')}
      busy={publishBusy}
      onConfirm={publish}
      onCancel={() => setPublishing(null)}
    >
      {failed ? <p className="sk-admin-form-error" role="alert">{t('team.action.failed')}</p> : null}
    </ConfirmDialog>
  </AdminPage>;
}
