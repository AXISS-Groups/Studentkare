import React from 'react';
import { observer } from 'mobx-react-lite';
import { Pill, FileSearch, Upload, Search, CheckCircle2, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import type { MedicalScannerViewModel, ScannerTab } from '../viewmodel/MedicalScannerViewModel';
import './scanners.css';

interface MedicalScannerWebViewProps {
  viewModel: MedicalScannerViewModel;
}

/**
 * Web View Component for AI Medication & X-Ray Lab Scanner.
 *
 * Binds reactively to `MedicalScannerViewModel` via MobX `observer`.
 * View layer contains zero inline state mutations.
 */
export const MedicalScannerWebView: React.FC<MedicalScannerWebViewProps> = observer(({ viewModel }) => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        viewModel.analyzeImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="scanner-container">
      <div className="scanner-header">
        <span className="scanner-eyebrow">AI CLINICAL ASSISTANT</span>
        <h2>AI Medication & X-Ray Scanner</h2>
        <p>Recognize pill active molecules, parse doctor prescriptions, and analyze diagnostic medical images.</p>
      </div>

      {viewModel.error && (
        <div className="scanner-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{viewModel.error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="scanner-tabs">
        {[
          { id: 'MEDICATION_SEARCH', label: '💊 Medication & Pill Lookup', icon: Pill },
          { id: 'XRAY_DIAGNOSTICS', label: '🩻 X-Ray & Lab Report Scribe', icon: FileSearch },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`scanner-tab ${viewModel.activeTab === id ? 'active' : ''}`}
            onClick={() => viewModel.setActiveTab(id as ScannerTab)}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Tab 1: Medication & Pill Search */}
      {viewModel.activeTab === 'MEDICATION_SEARCH' && (
        <div className="scanner-search-section">
          <div className="scanner-search-bar">
            <Search size={18} color="#64748b" />
            <input
              type="text"
              placeholder="Search by brand name or active molecule (e.g., Dolo, Paracetamol, Augmentin)..."
              value={viewModel.searchQuery}
              onChange={e => viewModel.setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && viewModel.searchMolecule()}
            />
            <button
              type="button"
              className="scanner-btn-search"
              disabled={viewModel.analyzing}
              onClick={() => viewModel.searchMolecule()}
            >
              {viewModel.analyzing ? <RefreshCw size={16} className="spin" /> : 'AI Lookup'}
            </button>
          </div>

          <div className="scanner-upload-box">
            <Upload size={24} color="#4f46e5" />
            <span>Or upload a photo of your prescription or pill packaging</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} />
          </div>

          {/* Results List */}
          {viewModel.scannedMedications.length > 0 && (
            <div className="scanner-results-list">
              <h4>Extracted Medications ({viewModel.scannedMedications.length})</h4>
              {viewModel.scannedMedications.map((item, idx) => (
                <div key={idx} className="scanner-med-card">
                  <div className="scanner-med-header">
                    <strong>{item.brandName}</strong>
                    <span className="scanner-molecule-tag">{item.activeMolecule}</span>
                  </div>
                  <p><strong>Dosage:</strong> {item.dosage}</p>
                  <p><strong>Purpose:</strong> {item.purpose}</p>
                  {item.pricePaise && (
                    <span className="scanner-price">Price: ₹{(item.pricePaise / 100).toFixed(2)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: X-Ray & Diagnostics */}
      {viewModel.activeTab === 'XRAY_DIAGNOSTICS' && (
        <div className="scanner-xray-section">
          <div className="scanner-upload-box large">
            <FileSearch size={32} color="#4f46e5" />
            <span>Upload DICOM image or X-Ray / Lab PDF report for AI Impression Scribe</span>
            <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} />
          </div>

          {viewModel.analyzing && (
            <div className="scanner-analyzing-box">
              <RefreshCw size={24} className="spin" color="#4f46e5" />
              <span>Analyzing medical scan using Computer Vision models...</span>
            </div>
          )}

          {viewModel.scannedDiagnostic && (
            <div className="scanner-diagnostic-card">
              <div className="scanner-diag-header">
                <Sparkles size={20} color="#4f46e5" />
                <h3>{viewModel.scannedDiagnostic.scanType}</h3>
                <span className="scanner-conf-badge">
                  {(viewModel.scannedDiagnostic.confidenceScore * 100).toFixed(0)}% Confidence
                </span>
              </div>

              <div className="scanner-diag-body">
                <strong>Key Diagnostic Findings:</strong>
                <ul>
                  {viewModel.scannedDiagnostic.findings.map((f, i) => (
                    <li key={i}>
                      <CheckCircle2 size={14} color="#16a34a" /> {f}
                    </li>
                  ))}
                </ul>

                <div className="scanner-impression-box">
                  <strong>Clinical Impression:</strong>
                  <p>{viewModel.scannedDiagnostic.impression}</p>
                </div>

                <small className="scanner-ref-note">
                  Recommended Specialist: {viewModel.scannedDiagnostic.recommendedSpecialist}
                </small>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
