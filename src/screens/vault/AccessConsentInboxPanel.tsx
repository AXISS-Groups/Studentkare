import React, { useState } from 'react';
import { useT } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { apiRequest } from '../../data/services/http';
import { FormError, useMutation } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

/**
 * "Access and your data" tab of the records hub.
 *
 * This used to be a consent inbox whose approve, deny and revoke buttons only
 * changed local state. No consent-request API exists — the only access to a
 * student's records is a clinician share they grant themselves (shown and
 * withdrawn on the Health records tab) — so the inbox is gone. What remains is
 * real: downloading your own data from /records/export, and the delete-account
 * flow, which explains what is kept and why.
 */
export function AccessConsentInboxPanel({ onOpenRecords }: { onOpenRecords: () => void }): React.ReactElement {
  const t = useT();
  const exportMutation = useMutation();
  const [exported, setExported] = useState(false);

  // On failure the error is shown and nothing is downloaded — no placeholder file.
  const downloadExport = () => {
    setExported(false);
    exportMutation.run(() => apiRequest<unknown>('/records/export'), (result) => {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studentkare_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExported(true);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
      <section className="wf-card" style={{ padding: 24 }} aria-labelledby="access-heading">
        <h3 id="access-heading">{t('access.title')}</h3>
        <p>{t('access.body')}</p>
        <p>{t('access.noRequests')}</p>
        <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={onOpenRecords}>
          {t('access.openRecords')}
        </button>
      </section>

      <section className="wf-card" style={{ padding: 24 }} aria-labelledby="export-heading">
        <h3 id="export-heading">{t('access.exportTitle')}</h3>
        <p>{t('access.exportBody')}</p>
        <button
          type="button"
          className="health-button health-button-primary"
          style={{ minHeight: 44 }}
          disabled={exportMutation.busy}
          aria-busy={exportMutation.busy}
          onClick={downloadExport}
        >
          {exportMutation.busy ? t('access.exporting') : t('access.export')}
        </button>
        {exported ? <p role="status">{t('access.exported')}</p> : null}
        <FormError message={exportMutation.error} />
      </section>

      <section className="wf-card" style={{ padding: 24 }} aria-labelledby="delete-heading">
        <h3 id="delete-heading">{t('access.deleteTitle')}</h3>
        <p>{t('access.deleteBody')}</p>
        <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={() => navigate('delete-account')}>
          {t('access.delete')}
        </button>
      </section>
    </div>
  );
}
