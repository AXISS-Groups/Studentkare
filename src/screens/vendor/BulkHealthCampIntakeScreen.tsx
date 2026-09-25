import React, { useState } from 'react';
import { QrCode, CheckCircle2, Upload } from 'lucide-react';
import '../../theme/workflows.css';

export function BulkHealthCampIntakeScreen() {
  const [scannedCount, setScannedCount] = useState(42);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">MASS SCREENING INTAKE</span>
          <h2>Bulk Health Camp Sample Intake</h2>
          <p>High-throughput barcode scanning and batch accessioning for campus health camp drives.</p>
        </div>
      </div>

      <div className="wf-card" style={{ padding: 24, textAlign: 'center' }}>
        <QrCode size={48} color="var(--accent, #2563eb)" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: 20 }}>Rapid Health Camp Barcode Scanner Active</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '4px 0 16px' }}>
          Batch Session: <strong>Annual Cardiac & ECG Health Camp 2026</strong>
        </p>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(16, 185, 129, 0.1)', color: '#065f46', padding: '10px 20px', borderRadius: 999, fontWeight: 700, fontSize: 16 }}>
          ✓ {scannedCount} Samples Accessioned Today
        </div>
      </div>
    </div>
  );
}
