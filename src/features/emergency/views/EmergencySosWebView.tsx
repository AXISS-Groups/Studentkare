import React from 'react';
import { observer } from 'mobx-react-lite';
import { ShieldAlert, AlertTriangle, PhoneCall, Navigation, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import type { EmergencySosViewModel } from '../viewmodel/EmergencySosViewModel';
import './emergency.css';

interface EmergencySosWebViewProps {
  viewModel: EmergencySosViewModel;
}

/**
 * Web View Component for Emergency SOS & Campus Dispatch.
 * Binds reactively to `EmergencySosViewModel` via MobX `observer`.
 */
export const EmergencySosWebView: React.FC<EmergencySosWebViewProps> = observer(({ viewModel }) => {
  return (
    <div className="emergency-container">
      <div className="emergency-header">
        <span className="emergency-eyebrow">24/7 CAMPUS EMERGENCY SOS DISPATCH</span>
        <h2>Emergency Medical Response</h2>
        <p>Instantly alert campus medical officers, security desk, and dispatch emergency response.</p>
      </div>

      {viewModel.status === 'IDLE' && (
        <div className="emergency-sos-card">
          <button
            type="button"
            className="sos-trigger-button"
            onClick={() => viewModel.triggerSos()}
          >
            <ShieldAlert size={64} />
            <span>PRESS FOR SOS</span>
            <small>Tap to initiate 3-second countdown alert</small>
          </button>

          <div className="emergency-location-row">
            <Navigation size={18} color="#64748b" />
            <span className="location-text">Current Location: <strong>{viewModel.userLocation}</strong></span>
            <button
              type="button"
              className="location-refresh-btn"
              onClick={() => viewModel.refreshLocation()}
              disabled={viewModel.isLocating}
            >
              <RefreshCw size={14} className={viewModel.isLocating ? 'spin' : ''} />
            </button>
          </div>
        </div>
      )}

      {viewModel.status === 'COUNTDOWN' && (
        <div className="emergency-countdown-card">
          <AlertTriangle size={56} color="#dc2626" />
          <h3>EMERGENCY ALERT DISPATCHING IN</h3>
          <div className="countdown-number">{viewModel.countdownSeconds}</div>
          <p>Campus Security and Medical Officers will be dispatched immediately.</p>

          <div className="countdown-actions">
            <button
              type="button"
              className="emergency-btn cancel-btn"
              onClick={() => viewModel.cancelSos()}
            >
              <XCircle size={18} /> CANCEL ALERT
            </button>
            <button
              type="button"
              className="emergency-btn dispatch-now-btn"
              onClick={() => viewModel.dispatchEmergency()}
            >
              DISPATCH NOW IMMEDIATELY
            </button>
          </div>
        </div>
      )}

      {viewModel.status === 'DISPATCHED' && (
        <div className="emergency-dispatched-card">
          <div className="dispatch-header">
            <CheckCircle2 size={40} color="#16a34a" />
            <div>
              <h3>AMBULANCE DISPATCHED & NOTIFIED</h3>
              <p>Campus Security Control & Medical Officers are responding.</p>
            </div>
          </div>

          {viewModel.activeDispatch && (
            <div className="dispatch-info-grid">
              <div className="dispatch-item">
                <span className="label">Unit Assigned</span>
                <span className="value">{viewModel.activeDispatch.unitId}</span>
              </div>
              <div className="dispatch-item">
                <span className="label">Estimated Arrival</span>
                <span className="value highlight">{viewModel.activeDispatch.etaMinutes} mins</span>
              </div>
              <div className="dispatch-item">
                <span className="label">Paramedic / Driver</span>
                <span className="value">{viewModel.activeDispatch.driverName}</span>
              </div>
              <div className="dispatch-item">
                <span className="label">Driver Hotline</span>
                <span className="value">{viewModel.activeDispatch.driverPhone}</span>
              </div>
            </div>
          )}

          <div className="contacts-notified-section">
            <h4>Contacts Automated Notification Status:</h4>
            <ul className="contacts-list">
              {viewModel.emergencyContacts.map(c => (
                <li key={c.id}>
                  <PhoneCall size={16} color="#16a34a" />
                  <div>
                    <strong>{c.name}</strong> ({c.relation}) — <span className="phone">{c.phone}</span>
                  </div>
                  <span className="notified-badge">SMS & CALL SENT</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className="emergency-btn reset-btn"
            onClick={() => viewModel.reset()}
          >
            Mark Emergency Resolved / Reset
          </button>
        </div>
      )}

      {viewModel.status === 'CANCELLED' && (
        <div className="emergency-cancelled-card">
          <XCircle size={48} color="#64748b" />
          <h3>SOS Alert Cancelled</h3>
          <p>No dispatch was made. Your emergency contacts were not notified.</p>
          <button
            type="button"
            className="emergency-btn reset-btn"
            onClick={() => viewModel.reset()}
          >
            Return to SOS Ready State
          </button>
        </div>
      )}
    </div>
  );
});
