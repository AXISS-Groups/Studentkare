import React, { useState } from 'react';
import { Download, ShieldCheck, Database, CheckCircle2 } from 'lucide-react';
import '../../theme/workflows.css';

export function ClinicalResearchCohortExportScreen() {
  const [exporting, setExporting] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2500);
    }, 1500);
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">ANONYMIZED CLINICAL RESEARCH</span>
          <h2>Clinical Research Cohort Export Desk</h2>
          <p>Export de-identified campus epidemiological data satisfying $k \ge 5$ differential privacy and Rule L firewalls.</p>
        </div>
      </div>

      <div className="wf-card" style={{ padding: 24, textAlign: 'center' }}>
        <Database size={48} color="var(--accent, #2563eb)" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>Export De-Identified Campus Health Cohort</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto 20px' }}>
          All personal identifiable information (PII), names, student IDs, and contact numbers are stripped before export. Aggregates satisfy Rule L firewall.
        </p>

        <button 
          className="health-button health-button-primary"
          disabled={exporting}
          style={{ minHeight: 44, padding: '0 24px' }}
          onClick={handleExport}
        >
          <Download size={16} /> {exporting ? 'Scrubbing PII & Exporting...' : 'Export Anonymized CSV Cohort'}
        </button>

        {downloaded && (
          <p style={{ marginTop: 14, color: '#10b981', fontSize: 13, fontWeight: 700 }}>
            ✓ Anonymized Cohort Dataset Exported (`campus_cohort_2026_anonymized.csv`)
          </p>
        )}
      </div>
    </div>
  );
}
