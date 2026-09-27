import React, { useState } from 'react';
import { QrCode, CheckCircle2 } from 'lucide-react';
import { LabQueuePanel } from '../workspace/FulfilmentQueuePanel';
import { Field } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function LabSampleToReportScreen() {
  const [barcodeModal, setBarcodeModal] = useState(false);
  const [sampleBarcode, setSampleBarcode] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sampleBarcode.trim()) {
      setScanSuccess(true);
      setTimeout(() => {
        setScanSuccess(false);
        setBarcodeModal(false);
        setSampleBarcode('');
      }, 1500);
    }
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 1040, margin: '0 auto' }}>
      <div className="wf-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="care-eyebrow">DIAGNOSTICS & LAB WORKSPACE</span>
          <h2>Sample-to-Report Diagnostic Desk</h2>
          <p>Track sample chain of custody, log test values, flag critical findings, and publish reports to ABDM.</p>
        </div>

        <button 
          className="health-button health-button-primary"
          style={{ minHeight: 44 }}
          onClick={() => setBarcodeModal(true)}
        >
          <QrCode size={16} /> Scan Sample Barcode / VIAL-ID
        </button>
      </div>

      {/* Barcode / Vial Scan Modal */}
      {barcodeModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div className="wf-card" style={{ width: '100%', maxWidth: 420, padding: 24, background: 'var(--surface-card, #fff)' }}>
            <h3 style={{ fontSize: 18, marginBottom: 4 }}>Sample Barcode Scanner</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Scan or enter the sample container Barcode / VIAL ID to register chain-of-custody intake.
            </p>

            {scanSuccess ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#10b981' }}>
                <CheckCircle2 size={40} style={{ margin: '0 auto 8px' }} />
                <strong>Sample Logged & Linked!</strong>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Status updated to SAMPLE_COLLECTED.</p>
              </div>
            ) : (
              <form onSubmit={handleBarcodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Sample VIAL Barcode ID">
                  <input 
                    type="text" 
                    value={sampleBarcode} 
                    onChange={e => setSampleBarcode(e.target.value.toUpperCase())}
                    placeholder="e.g. VIAL-2026-99120"
                    autoFocus
                    required
                  />
                </Field>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="health-button" 
                    style={{ minHeight: 44 }}
                    onClick={() => setBarcodeModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="health-button health-button-primary" 
                    style={{ minHeight: 44 }}
                    disabled={!sampleBarcode.trim()}
                  >
                    Register Sample Intake
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Main Lab Queue Panel */}
      <LabQueuePanel />
    </div>
  );
}
