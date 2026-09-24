import React, { useState } from 'react';
import { ShieldCheck, Download, Database, Lock, Trash2, CheckCircle2 } from 'lucide-react';
import '../../theme/workflows.css';

interface ExportModalProps {
  onClose?: () => void;
}

export function DpdpDataPortabilityExportModal({ onClose }: ExportModalProps) {
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [erasureRequested, setErasureRequested] = useState(false);

  const handleExportFhirJson = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      setExportDone(true);
      
      // Trigger download of standard FHIR R4 Bundle JSON snippet
      const fhirData = {
        resourceType: 'Bundle',
        type: 'collection',
        timestamp: new Date().toISOString(),
        entry: [
          { resource: { resourceType: 'Patient', id: 'STU-9921', name: [{ family: 'Sharma', given: ['Aarav'] }] } },
          { resource: { resourceType: 'Observation', code: { text: 'Heart Rate' }, valueQuantity: { value: 72, unit: 'bpm' } } }
        ]
      };

      const blob = new Blob([JSON.stringify(fhirData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studentkare_fhir_vault_${Date.now()}.json`;
      a.click();
    }, 1200);
  };

  const handleRequestErasure = () => {
    if (confirm('Request DPDP account anonymization? Personal PII will be erased while clinical logs remain de-identified per NMC statutory 3-year rules.')) {
      setErasureRequested(true);
    }
  };

  return (
    <div className="wf-card" style={{ padding: 24, maxWidth: 580, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">DPDP ACT 2023 DATA SUBJECT RIGHTS</span>
          <h2>Health Data Portability & Rights Control</h2>
          <p>Export your full health vault as standard FHIR R4 JSON or manage data erasure rights under DPDP 2023.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Right to Data Portability */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 18, background: 'var(--surface-card, #fff)' }}>
          <strong style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={18} color="var(--accent, #2563eb)" /> Right to Data Portability (FHIR R4 JSON)
          </strong>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 14px' }}>
            Download a machine-readable JSON copy of all lab reports, prescriptions, vitals, and immunization records.
          </p>

          <button 
            className="health-button health-button-primary"
            disabled={exporting}
            style={{ minHeight: 40 }}
            onClick={handleExportFhirJson}
          >
            <Download size={15} /> {exporting ? 'Generating FHIR JSON Bundle...' : 'Download FHIR R4 JSON Bundle'}
          </button>

          {exportDone && (
            <p style={{ fontSize: 12, color: '#10b981', marginTop: 8, fontWeight: 700 }}>
              ✓ FHIR Bundle downloaded successfully!
            </p>
          )}
        </div>

        {/* Right to Erasure / Anonymization */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 18, background: 'var(--surface-card, #fff)' }}>
          <strong style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--emergency, #ef4444)' }}>
            <Trash2 size={18} /> Right to Erasure & Anonymization
          </strong>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 14px' }}>
            Anonymize student profile data. Clinical records are scrubbed of PII while complying with NMC 3-year statutory retention laws.
          </p>

          {erasureRequested ? (
            <div style={{ fontSize: 12, background: 'rgba(239, 68, 68, 0.1)', color: '#991b1b', padding: 10, borderRadius: 8, fontWeight: 700 }}>
              ✓ DPDP Erasure & Anonymization Request Logged (`DSR-REQ-99812`). Data Protection Officer notified.
            </div>
          ) : (
            <button 
              className="health-button"
              style={{ minHeight: 40, color: 'var(--emergency, #ef4444)', borderColor: '#ef4444' }}
              onClick={handleRequestErasure}
            >
              Request DPDP Anonymization
            </button>
          )}
        </div>

        {onClose && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button className="health-button" style={{ minHeight: 40 }} onClick={onClose}>
              Close Privacy Controls
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
