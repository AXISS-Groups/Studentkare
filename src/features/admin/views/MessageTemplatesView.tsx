import React from 'react';
import { AdminEmptySection, AdminPage } from '@/screens/workspace/admin/AdminPage';
import { navigate } from '@/lib/workflowRouting';
import { useT } from '@/i18n';

// Message templates (design: AdminTemplates). No endpoint lists or edits templates (the
// notification outbox holds sent messages, not templates), so the list, editor and
// preview are empty and there is no "New template", "Save draft" or "Submit to Meta" action.
export function MessageTemplatesView() {
  const t = useT();
  return <AdminPage eyebrow={t('admin.eyebrow.contentAi')} title={t('admin.templates.title')} description={t('admin.templates.description')}>
    <div className="sk-admin-templates">
      <AdminEmptySection title={t('admin.templates.list')} description={t('admin.templates.listBody')} emptyTitle={t('admin.templates.listEmpty')} emptyDescription={t('admin.templates.listEmptyBody')} />
      <AdminEmptySection title={t('admin.templates.editor')} description={t('admin.templates.editorBody')} emptyTitle={t('admin.templates.editorEmpty')} emptyDescription={t('admin.templates.editorEmptyBody')} />
      <AdminEmptySection title={t('admin.templates.preview')} description={t('admin.templates.previewBody')} emptyTitle={t('admin.templates.previewEmpty')} emptyDescription={t('admin.templates.previewEmptyBody')} />
    </div>
    <p className="sk-admin-note">{t('admin.templates.outboxLink')}{' '}<button type="button" className="sk-admin-button" onClick={() => navigate('admin/outbox')}>{t('admin.templates.openOutbox')}</button></p>
  </AdminPage>;
}
