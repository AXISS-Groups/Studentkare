import React from 'react';
import { observer } from 'mobx-react-lite';
import { AlertTriangle, ShieldAlert, Activity, MapPin, CheckCircle2, RefreshCw, ArrowRight, PhoneCall } from 'lucide-react';
import type { IncidentTriageViewModel, IncidentSeverity, IncidentCategory } from '../viewmodel/IncidentTriageViewModel';
import './incidents.css';

interface IncidentTriageWebViewProps {
  viewModel: IncidentTriageViewModel;
}

const severityBadges: Record<IncidentSeverity, { label: string; className: string }> = {
  LOW: { label: 'Low / Minor', className: 'sev-low' },
  MEDIUM: { label: 'Moderate', className: 'sev-medium' },
  HIGH: { label: 'High Priority', className: 'sev-high' },
  CRITICAL: { label: 'CRITICAL / SOS', className: 'sev-critical' },
};

const categoryLabels: Record<IncidentCategory, string> = {
  FEVER_FLU: '🌡️ Fever / Flu / Cold',
  SURGICAL_TRAUMA: '🩹 Injury / Surgical Trauma',
  MENTAL_WELLBEING: '🧠 Stress / Mental Support',
  GASTRO: '🍲 Food Poisoning / Stomach',
  OTHER: '📋 General Health Concern',
};

/**
 * Web View Component for Health Incident Triage & Emergency SOS Console.
 *
 * Binds reactively to `IncidentTriageViewModel` via MobX `observer`.
 * View layer contains zero inline state mutations.
 */
export const IncidentTriageWebView: React.FC<IncidentTriageWebViewProps> = observer(({ viewModel }) => {
  if (viewModel.triageOutcome) {
    return (
      <div className={`incident-outcome-card ${viewModel.triageOutcome.sosTriggered ? 'is-sos' : ''}`}>
        <div className="incident-outcome-header">
          {viewModel.triageOutcome.sosTriggered ? (
            <ShieldAlert size={36} color="#dc2626" />
          ) : (
            <CheckCircle2 size={36} color="#16a34a" />
          )}
          <div>
            <h3>Triage Report Registered</h3>
            <span className="incident-id">Ref: {viewModel.triageOutcome.incidentId}</span>
          </div>
        </div>

        <div className="incident-guidance-box">
          <strong>Recommended Care Action:</strong>
          <p>{viewModel.triageOutcome.recommendedAction}</p>

          {viewModel.triageOutcome.dispatchAssigned && (
            <div className="incident-dispatch-tag">
              <Activity size={16} /> Dispatched: {viewModel.triageOutcome.dispatchAssigned} (ETA ~{viewModel.triageOutcome.etaMinutes} mins)
            </div>
          )}
        </div>

        {viewModel.triageOutcome.sosTriggered && (
          <div className="incident-sos-bar">
            <PhoneCall size={18} />
            <span>Need immediate verbal response? Call Campus 112 SOS Dispatch Hotline</span>
          </div>
        )}

        <button type="button" className="incident-btn incident-btn-primary" onClick={() => viewModel.reset()}>
          Report Another Incident
        </button>
      </div>
    );
  }

  return (
    <div className="incident-console-container">
      {/* Emergency Immediate SOS Strip */}
      <div className="incident-sos-hero">
        <div className="incident-sos-info">
          <AlertTriangle size={24} color="#ef4444" />
          <div>
            <h3>Campus Emergency Assistance</h3>
            <p>Press for immediate medical emergency dispatch to your current location.</p>
          </div>
        </div>
        <button
          type="button"
          className="incident-sos-trigger-btn"
          onClick={() => viewModel.triggerImmediateSOS()}
        >
          <ShieldAlert size={18} /> TRIGGER 112 SOS
        </button>
      </div>

      <div className="incident-form-card">
        <div className="incident-header">
          <span className="incident-eyebrow">STUDENT HEALTH & SAFETY</span>
          <h2>Health Incident & Symptom Triage</h2>
          <p>Describe your symptoms or health incident to receive automated triage guidance and nurse dispatch.</p>
        </div>

        {viewModel.error && (
          <div className="incident-error-banner" role="alert">
            <AlertTriangle size={16} />
            <span>{viewModel.error}</span>
          </div>
        )}

        <div className="incident-form-grid">
          {/* Category */}
          <div className="incident-field">
            <label>1. Category of Incident</label>
            <div className="incident-pills">
              {(Object.keys(categoryLabels) as IncidentCategory[]).map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`incident-pill ${viewModel.category === cat ? 'active' : ''}`}
                  onClick={() => viewModel.setCategory(cat)}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div className="incident-field">
            <label>2. Perceived Severity</label>
            <div className="incident-pills">
              {(Object.keys(severityBadges) as IncidentSeverity[]).map(sev => (
                <button
                  key={sev}
                  type="button"
                  className={`incident-pill ${severityBadges[sev].className} ${viewModel.severity === sev ? 'selected' : ''}`}
                  onClick={() => viewModel.setSeverity(sev)}
                >
                  {severityBadges[sev].label}
                </button>
              ))}
            </div>
          </div>

          {/* Symptoms Description */}
          <div className="incident-field">
            <label>3. Symptoms & Onset Time</label>
            <textarea
              className="incident-textarea"
              placeholder="Describe symptoms (e.g. high fever since morning, severe stomach cramps, dizziness)..."
              value={viewModel.symptoms}
              onChange={e => viewModel.setSymptoms(e.target.value)}
              rows={4}
            />
          </div>

          {/* Location & Optional Vitals */}
          <div className="incident-row">
            <div className="incident-field flex-1">
              <label><MapPin size={14} /> Campus Location / Room</label>
              <input
                type="text"
                className="incident-input"
                placeholder="e.g. Hostel Block C, Room 304"
                value={viewModel.location}
                onChange={e => viewModel.setLocation(e.target.value)}
              />
            </div>
            <div className="incident-field flex-1">
              <label><Activity size={14} /> Body Temp (°C, Optional)</label>
              <input
                type="number"
                step="0.1"
                className="incident-input"
                placeholder="e.g. 38.5"
                value={viewModel.vitals.feverCelsius || ''}
                onChange={e => viewModel.setVitals({ feverCelsius: parseFloat(e.target.value) || undefined })}
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="button"
            className={`incident-btn incident-btn-submit ${viewModel.isEmergencySOS ? 'is-critical' : ''}`}
            disabled={!viewModel.canSubmit}
            onClick={() => viewModel.submitIncident()}
          >
            {viewModel.submitting ? (
              <>
                <RefreshCw size={16} className="spin" /> Submitting Incident...
              </>
            ) : (
              <>
                Submit Triage Report <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
