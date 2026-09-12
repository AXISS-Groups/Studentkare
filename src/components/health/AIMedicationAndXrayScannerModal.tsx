import React, { useState } from 'react';
import { Pill, FileSearch, Upload, Search, CheckCircle2, RefreshCw, X, ShieldCheck, Sparkles, ShoppingBag, Image as ImageIcon } from 'lucide-react';
import { apiRequest } from '../../data/http';

export type MedScannerTab = 'MEDICATION_SEARCH' | 'XRAY_DIAGNOSTICS';

export function AIMedicationAndXrayScannerModal({ isOpen, onClose, token: _token }: { isOpen: boolean; onClose: () => void; token: string | null }) {
  const [activeTab, setActiveTab] = useState<MedScannerTab>('MEDICATION_SEARCH');
  const [medQuery, setMedQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Medication Lookup Results
  const [medResult, setMedResult] = useState<{
    medicine: string;
    activeMolecule: string;
    category: string;
    indications: string[];
    recommendedDosage: string;
    precautions: string[];
    janAushadhiAlternative: string;
    tata1mgPrice: string;
  } | null>(null);

  // X-Ray Analysis Results
  const [xrayResult, setXrayResult] = useState<{
    impression: string;
    recordId?: string;
  } | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setSavedSuccess('');
      setErrorMsg('');
    }
  };

  const runMedicationLookup = async () => {
    setLoading(true);
    setMedResult(null);
    setSavedSuccess('');
    setErrorMsg('');

    try {
      const res = await apiRequest<any>('/ai/medication-lookup', {
        method: 'POST',
        body: JSON.stringify({
          query: medQuery || 'Paracetamol 650mg',
          imageFileName: selectedFile ? selectedFile.name : '',
        }),
      });
      setMedResult(res);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to lookup medication details.');
    } finally {
      setLoading(false);
    }
  };

  const runXrayAnalysis = async () => {
    setLoading(true);
    setXrayResult(null);
    setSavedSuccess('');
    setErrorMsg('');

    try {
      const res = await apiRequest<{ status: string; record_id: string; impression: string }>('/ai/xray-diagnostic-scan', {
        method: 'POST',
        body: JSON.stringify({
          scanType: 'Chest Radiograph / Medical Record AI Scribe',
          imageFileName: selectedFile ? selectedFile.name : 'xray_scan.png',
          clinicalNotesText: 'Patient submitted record for AI second opinion screening.',
        }),
      });
      setXrayResult({ impression: res.impression, recordId: res.record_id });
      setSavedSuccess('X-Ray & Medical Record Analysis saved to ABDM Health Vault!');
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to analyze X-ray / medical record.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 10, 30, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #e9dcf7', boxShadow: '0 25px 50px -12px rgba(124, 60, 237, 0.25)' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #0d9488, #0284c7)', color: '#ffffff', borderRadius: '24px 24px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 14 }}>
              <Pill size={24} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>AI Medication & X-Ray Radiology Scribe</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9 }}>Molecule Search, Pill Image Recognition & Diagnostic Imaging Scanner</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: '#ffffff', borderRadius: 12, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Mode Selector Tabs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[
              { id: 'MEDICATION_SEARCH', label: '💊 Medication & Pill Scanner', icon: <Pill size={16} /> },
              { id: 'XRAY_DIAGNOSTICS', label: '🩻 X-Ray & Medical Scribe', icon: <FileSearch size={16} /> },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id as MedScannerTab); setSavedSuccess(''); setErrorMsg(''); }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 14,
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid',
                  borderColor: activeTab === tab.id ? '#0d9488' : '#ccfbf1',
                  background: activeTab === tab.id ? '#0d9488' : '#f0fdf4',
                  color: activeTab === tab.id ? '#ffffff' : '#0f766e',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: AI Medication & Pill Search */}
          {activeTab === 'MEDICATION_SEARCH' && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    value={medQuery}
                    onChange={e => setMedQuery(e.target.value)}
                    placeholder="Type medicine name (e.g. Paracetamol, Dolo 650, Azithromycin)..."
                    style={{ width: '100%', padding: '12px 14px 12px 40px', borderRadius: 14, border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                  />
                  <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, top: 14 }} />
                </div>
                <button
                  type="button"
                  onClick={runMedicationLookup}
                  disabled={loading}
                  style={{ padding: '12px 20px', borderRadius: 14, background: '#0d9488', color: '#ffffff', border: 'none', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {loading ? <RefreshCw size={16} className="spin" /> : <Sparkles size={16} />}
                  {loading ? 'Searching...' : 'AI Lookup'}
                </button>
              </div>

              {/* Upload Image Option */}
              <div style={{ border: '2px dashed #cbd5e1', borderRadius: 16, padding: 16, textAlign: 'center', background: '#f8fafc', marginBottom: 20 }}>
                <input type="file" id="pill-file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
                <label htmlFor="pill-file" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <Upload size={24} color="#0d9488" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f766e' }}>
                    {selectedFile ? `Uploaded: ${selectedFile.name}` : 'Or click to upload pill photo / prescription strip image'}
                  </span>
                </label>
              </div>

              {medResult && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 18, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#14532d' }}>{medResult.medicine}</h4>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a' }}>Active: {medResult.activeMolecule}</span>
                    </div>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800 }}>
                      {medResult.category}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#166534', marginBottom: 12 }}>
                    <strong>Indications:</strong> {medResult.indications.join(', ')}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#166534', marginBottom: 12 }}>
                    <strong>Recommended Dosage:</strong> {medResult.recommendedDosage}
                  </div>

                  {/* Jan Aushadhi & 1mg Price Comparison */}
                  <div style={{ background: '#ffffff', padding: 14, borderRadius: 14, border: '1px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d' }}>GENERIC JAN AUSHADHI ALTERNATIVE</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{medResult.janAushadhiAlternative}</div>
                    </div>
                    <button type="button" style={{ padding: '8px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShoppingBag size={14} /> Buy on Tata 1mg ({medResult.tata1mgPrice})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI X-Ray & Medical Record Scribe */}
          {activeTab === 'XRAY_DIAGNOSTICS' && (
            <div>
              <div style={{ border: '2px dashed #38bdf8', borderRadius: 18, padding: 24, textAlign: 'center', background: '#f0f9ff', marginBottom: 20 }}>
                <input type="file" id="xray-file" accept="image/*,.pdf" onChange={handleFileSelect} style={{ display: 'none' }} />
                <label htmlFor="xray-file" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <ImageIcon size={32} color="#0284c7" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0369a1' }}>
                    {selectedFile ? `Selected Scan: ${selectedFile.name}` : 'Click to Upload Chest X-Ray / DICOM / MRI / Lab PDF Report'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Supports DICOM, PNG, JPEG, and PDF documents</span>
                </label>
              </div>

              {filePreview && (
                <div style={{ marginBottom: 16, textAlign: 'center' }}>
                  <img src={filePreview} alt="Preview" style={{ maxHeight: 180, borderRadius: 14, border: '1px solid #cbd5e1', objectFit: 'contain' }} />
                </div>
              )}

              <button
                type="button"
                onClick={runXrayAnalysis}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {loading ? <RefreshCw size={18} className="spin" /> : <Sparkles size={18} />}
                {loading ? 'Analyzing X-Ray Radiograph...' : 'Run AI Radiological Diagnostic Scribe'}
              </button>

              {xrayResult && (
                <div style={{ marginTop: 20, background: '#f0f9ff', border: '1px solid #bae6fd', padding: 18, borderRadius: 16 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0369a1', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={16} /> AI RADIOLOGY DIAGNOSTIC IMPRESSION
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#0f172a', lineHeight: 1.6, fontWeight: 600 }}>
                    {xrayResult.impression}
                  </p>
                </div>
              )}
            </div>
          )}

          {savedSuccess && (
            <div style={{ marginTop: 16, background: '#ecfdf5', border: '1px solid #a7f3d0', padding: 12, borderRadius: 12, color: '#047857', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} /> {savedSuccess}
            </div>
          )}

          {errorMsg && (
            <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 12, color: '#dc2626', fontSize: '0.85rem', fontWeight: 700 }}>
              {errorMsg}
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid #d1d5db', background: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
