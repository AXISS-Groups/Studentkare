import React from 'react';
import { observer } from 'mobx-react-lite';
import { ShieldCheck, QrCode, CreditCard, RefreshCw, AlertCircle, PhoneCall, UserCheck } from 'lucide-react';
import { useDigitalIdViewModel } from '../viewmodel/useDigitalIdViewModel';
import './digital_id.css';

export const DigitalIdWebView: React.FC = observer(() => {
  const { state, actions } = useDigitalIdViewModel();

  if (state.isLoading) {
    return (
      <div className="digital-id-container">
        <div className="digital-id-loading">
          <RefreshCw size={24} className="spin" />
          <span>Synchronizing Digital Campus Credential...</span>
        </div>
      </div>
    );
  }

  const profile = state.profile;

  return (
    <div className="digital-id-container">
      <div className="digital-id-header">
        <span className="digital-id-eyebrow">Studentkare Identity Protocol</span>
        <h2>Digital Campus Pass</h2>
        <p>Verified academic credential, dynamic access pass, and emergency medical badge.</p>
      </div>

      {state.error && (
        <div className="digital-id-error-banner">
          <AlertCircle size={16} />
          <span>{state.error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="digital-id-tabs">
        <button
          type="button"
          className={`digital-id-tab ${state.activeTab === 'card' ? 'active' : ''}`}
          onClick={() => actions.setActiveTab('card')}
        >
          <CreditCard size={14} />
          Digital ID Card
        </button>
        <button
          type="button"
          className={`digital-id-tab ${state.activeTab === 'qr' ? 'active' : ''}`}
          onClick={() => actions.setActiveTab('qr')}
        >
          <QrCode size={14} />
          Access Pass QR
        </button>
        <button
          type="button"
          className={`digital-id-tab ${state.activeTab === 'verification' ? 'active' : ''}`}
          onClick={() => actions.setActiveTab('verification')}
        >
          <ShieldCheck size={14} />
          Trust Status
        </button>
      </div>

      {/* Tab 1: Digital ID Card */}
      {state.activeTab === 'card' && profile && (
        <div className="digital-id-card-view">
          <div className="digital-id-badge-header">
            <div className="digital-id-brand">
              <ShieldCheck size={18} color="#818cf8" />
              <span>STUDENTKARE HEALTH ID</span>
            </div>
            <span className="digital-id-verified-pill">{state.verificationBadgeText}</span>
          </div>

          <div className="digital-id-card-body">
            <div className="digital-id-avatar">
              {profile.fullName.charAt(0)}
            </div>
            <div className="digital-id-card-info">
              <h3>{profile.fullName}</h3>
              <p className="digital-id-univ">{profile.university}</p>

              <div className="digital-id-meta-grid">
                <div>
                  <strong>ROLL NUMBER</strong>
                  <span>{profile.rollNumber}</span>
                </div>
                <div>
                  <strong>BLOOD GROUP</strong>
                  <span className="blood-tag">{profile.bloodGroup}</span>
                </div>
                <div>
                  <strong>MEMBER ID</strong>
                  <span>{profile.id}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="digital-id-emergency-strip">
            <PhoneCall size={16} color="#fca5a5" />
            <div>
              <strong>Emergency Contact: {profile.emergencyContactName} ({profile.emergencyContactRelation})</strong>
              <span>{profile.emergencyContactPhone}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Dynamic Access Pass QR */}
      {state.activeTab === 'qr' && (
        <div className="digital-id-qr-view">
          <h3>Campus Clinic Dynamic Access Pass</h3>
          <p>Scan at campus clinic turnstiles, health camp stations, or emergency triage desks.</p>

          <div className="digital-id-qr-box">
            <QrCode size={160} color="#1e1b4b" />
            <span className="digital-id-qr-code-text">{state.qrToken}</span>
          </div>

          <div className="digital-id-qr-status">
            <span>{state.formattedExpiry}</span>
            <button
              type="button"
              className="digital-id-refresh-btn"
              onClick={() => actions.refreshQrPass()}
              disabled={state.refreshingQr}
            >
              <RefreshCw size={12} className={state.refreshingQr ? 'spin' : ''} />
              Refresh Code
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Trust & Verification Status */}
      {state.activeTab === 'verification' && profile && (
        <div className="digital-id-details-view">
          <h3>Verification Audit Trail</h3>

          <ul className="digital-id-audit-list">
            <li>
              <UserCheck size={18} color="#16a34a" />
              <div>
                <strong>Institution Affiliation Verified</strong>
                <p>Roll number {profile.rollNumber} verified against campus Registrar database.</p>
              </div>
            </li>
            <li>
              <ShieldCheck size={18} color="#16a34a" />
              <div>
                <strong>Age & Adult Status Gated (18+)</strong>
                <p>Consent and age verified according to House Constitution rules.</p>
              </div>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
});
