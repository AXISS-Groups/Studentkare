import React from 'react';
import { observer } from 'mobx-react-lite';
import { AlertTriangle, MapPin, RefreshCw, PhoneCall, ShieldCheck, XCircle } from 'lucide-react';
import { useEmergencySosViewModel } from '../viewmodel/useEmergencySosViewModel';
import './emergency.css';

export const EmergencySosWebView: React.FC = observer(() => {
  const { state, actions } = useEmergencySosViewModel();

  if (state.status === 'COUNTDOWN') {
    return (
      <div className="emergency-container">
        <div className="emergency-countdown-card">
          <AlertTriangle size={48} color="#dc2626" className="spin" />
          <h3>TRIGGERING EMERGENCY SOS</h3>
          <p>Notifying Campus Medical Officer & Emergency Services in</p>

          <div className="countdown-number">{state.countdownSeconds}</div>

          <div className="countdown-actions">
            <button
              type="button"
              className="emergency-btn cancel-btn"
              onClick={() => actions.cancelSos()}
            >
              <XCircle size={16} />
              Cancel SOS
            </button>
            <button
              type="button"
              className="emergency-btn dispatch-now-btn"
              onClick={() => actions.dispatchEmergency()}
            >
              Dispatch Immediately
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'DISPATCHED' && state.activeDispatch) {
    return (
      <div className="emergency-container">
        <div className="emergency-dispatched-card">
          <div className="dispatch-header">
            <ShieldCheck size={40} color="#16a34a" />
            <div>
              <h3>Ambulance Dispatched & Security Alerted</h3>
              <p>Medical responder team has been dispatched to your GPS location.</p>
            </div>
          </div>

          <div className="dispatch-info-grid">
            <div className="dispatch-item">
              <span className="label">Assigned Unit</span>
              <span className="value">{state.activeDispatch.unitId}</span>
            </div>
            <div className="dispatch-item">
              <span className="label">Estimated Arrival</span>
              <span className="value highlight">{state.activeDispatch.etaMinutes} Mins</span>
            </div>
            <div className="dispatch-item">
              <span className="label">Responder Driver</span>
              <span className="value">{state.activeDispatch.driverName} ({state.activeDispatch.driverPhone})</span>
            </div>
            <div className="dispatch-item">
              <span className="label">Current Status</span>
              <span className="value">{state.activeDispatch.currentLocation}</span>
            </div>
          </div>

          <div className="contacts-notified-section">
            <h4>Notified Contacts</h4>
            <ul className="contacts-list">
              {state.emergencyContacts.map(c => (
                <li key={c.id}>
                  <PhoneCall size={14} color="#16a34a" />
                  <strong>{c.name} ({c.relation})</strong>
                  <span>{c.phone}</span>
                  <span className="notified-badge">SMS & PUSH SENT</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className="emergency-btn reset-btn"
            onClick={() => actions.reset()}
          >
            Reset Emergency Card
          </button>
        </div>
      </div>
    );
  }

  if (state.status === 'CANCELLED') {
    return (
      <div className="emergency-container">
        <div className="emergency-cancelled-card">
          <XCircle size={40} color="#64748b" />
          <h3>SOS Request Cancelled</h3>
          <p>No emergency units were dispatched.</p>
          <button
            type="button"
            className="emergency-btn reset-btn"
            onClick={() => actions.reset()}
          >
            Return to Emergency SOS Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="emergency-container">
      <div className="emergency-header">
        <span className="emergency-eyebrow">CRITICAL RESPONSE PROTOCOL (RULE B)</span>
        <h2>Emergency SOS Trigger</h2>
        <p>Pressing the button initiates immediate dispatch of Campus Ambulance & 24/7 Security Hotline.</p>
      </div>

      <div className="emergency-sos-card">
        <button
          type="button"
          className="sos-trigger-button"
          onClick={() => actions.triggerSos()}
          aria-label="Press to trigger Emergency SOS"
        >
          <AlertTriangle size={48} />
          <span>PRESS FOR SOS</span>
          <small>3-Second Safety Countdown</small>
        </button>

        <div className="emergency-location-row">
          <MapPin size={16} color="#dc2626" />
          <span>Location: {state.userLocation}</span>
          <button
            type="button"
            className="location-refresh-btn"
            onClick={() => actions.refreshLocation()}
            title="Refresh GPS Location"
          >
            <RefreshCw size={14} className={state.isLocating ? 'spin' : ''} />
          </button>
        </div>
      </div>
    </div>
  );
});
