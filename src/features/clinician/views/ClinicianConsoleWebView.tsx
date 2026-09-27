import React from 'react';
import { observer } from 'mobx-react-lite';
import { Stethoscope, AlertTriangle, FileSpreadsheet, CheckCircle2, RefreshCw, Save } from 'lucide-react';
import type { ClinicianViewModel } from '../viewmodel/ClinicianViewModel';
import './clinician.css';

interface ClinicianConsoleWebViewProps {
  viewModel: ClinicianViewModel;
}

/**
 * Web View Component for M18 Clinician Console & CDSS Differential Diagnosis.
 * Binds reactively to `ClinicianViewModel` via MobX `observer`.
 */
export const ClinicianConsoleWebView: React.FC<ClinicianConsoleWebViewProps> = observer(({ viewModel }) => {
  const patient = viewModel.selectedPatient;
  const cdss = viewModel.cdssData;

  // No records loaded. Showing a console framed around a patient who is not
  // there would invite a clinician to read someone else's numbers into it.
  if (!patient) {
    return (
      <div className="clinician-container">
        <div className="clinician-header">
          <h2>Campus Medical Officer Console</h2>
          <p role="status">This console is not connected to patient records yet. No patients are loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="clinician-container">
      <div className="clinician-header">
        <span className="clinician-eyebrow">M18 CLINICIAN EMR & AI DECISION SUPPORT</span>
        <h2>Campus Medical Officer Console</h2>
        <p>Real-time differential diagnosis recommendations, drug interaction checks, and SOAP note authoring.</p>
      </div>

      <div className="clinician-layout">
        {/* Left Patient Roster */}
        <div className="patient-roster-card">
          <h3>Queue Patients ({viewModel.patients.length})</h3>
          <div className="patient-list">
            {viewModel.patients.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`patient-item ${p.id === patient.id ? 'active' : ''}`}
                onClick={() => viewModel.selectPatient(p.id)}
              >
                <div className="patient-avatar">{p.name.charAt(0)}</div>
                <div className="patient-info">
                  <strong>{p.name}</strong>
                  <span>{p.age} yrs • {p.gender} • {p.bloodGroup}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center Main Workspace */}
        <div className="clinician-main-workspace">
          {/* Patient Overview */}
          <div className="patient-banner">
            <div className="banner-details">
              <h3>{patient.name}</h3>
              <span className="complaint-badge">Chief Complaint: {patient.chiefComplaint}</span>
            </div>

            {/* Vitals Bar */}
            <div className="vitals-bar">
              <div className="vital-item">
                <span className="v-label">BP</span>
                <span className="v-value">{patient.vitals.bp}</span>
              </div>
              <div className="vital-item">
                <span className="v-label">Pulse</span>
                <span className="v-value">{patient.vitals.pulse} bpm</span>
              </div>
              <div className="vital-item">
                <span className="v-label">SpO2</span>
                <span className="v-value">{patient.vitals.spo2}%</span>
              </div>
              <div className="vital-item">
                <span className="v-label">Temp</span>
                <span className="v-value">{patient.vitals.tempF}°F</span>
              </div>
            </div>
          </div>

          {/* AI CDSS Panel */}
          <div className="cdss-panel">
            <div className="cdss-header">
              <div className="cdss-title">
                <Stethoscope size={20} color="#4f46e5" />
                <h4>AI Differential Diagnosis (CDSS)</h4>
              </div>
              <button
                type="button"
                className="btn-refresh-cdss"
                onClick={() => viewModel.refreshCdss()}
              >
                <RefreshCw size={14} /> Refresh AI
              </button>
            </div>

            {cdss && (
              <div className="cdss-content">
                <div className="cdss-section">
                  <strong>Differentials:</strong>
                  <div className="differentials-tags">
                    {cdss.differentialDiagnoses.map((d, i) => (
                      <span key={i} className="diff-chip">
                        {d.condition} ({d.confidence}%)
                      </span>
                    ))}
                  </div>
                </div>

                {cdss.interactionAlerts && cdss.interactionAlerts.length > 0 && (
                  <div className="cdss-section warning">
                    <strong><AlertTriangle size={14} color="#dc2626" /> Drug Interaction Warnings:</strong>
                    <ul>
                      {cdss.interactionAlerts.map((warn, i) => (
                        <li key={i}>
                          <strong>{warn.pair}:</strong> {warn.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SOAP Clinical Note Authoring */}
          <div className="soap-authoring-card">
            <div className="soap-header">
              <FileSpreadsheet size={18} color="#4f46e5" />
              <h4>Author SOAP Clinical Progress Note</h4>
            </div>

            <div className="soap-form">
              <input
                type="text"
                placeholder="Encounter Title (e.g., General Outpatient Consultation)"
                value={viewModel.soapTitle}
                onChange={(e) => viewModel.setSoapTitle(e.target.value)}
              />
              <textarea
                rows={5}
                placeholder="S: Subjective symptoms&#10;O: Objective vitals & lab results&#10;A: Assessment & diagnosis&#10;P: Treatment plan & prescriptions..."
                value={viewModel.soapNote}
                onChange={(e) => viewModel.setSoapNote(e.target.value)}
              />

              <div className="soap-footer">
                {viewModel.noteSaved && (
                  <span className="saved-feedback">
                    <CheckCircle2 size={16} color="#16a34a" /> Clinical Note Saved to EMR Vault!
                  </span>
                )}
                <button
                  type="button"
                  className="btn-save-soap"
                  onClick={() => viewModel.saveNote()}
                  disabled={!viewModel.canSave}
                >
                  <Save size={16} /> Save Clinical Note
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
