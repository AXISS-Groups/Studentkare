import React from 'react';
import { observer } from 'mobx-react-lite';
import { IdCard, QrCode, ShieldCheck, HeartPulse, RefreshCw, AlertCircle, Award } from 'lucide-react';
import type { DigitalIdViewModel, DigitalIdTab } from '../viewmodel/DigitalIdViewModel';
import './digital_id.css';

interface DigitalIdWebViewProps {
  viewModel: DigitalIdViewModel;
}

/**
 * Web View Component for Digital ID & Campus Access Pass.
 *
 * Binds reactively to `DigitalIdViewModel` via MobX `observer`.
 * View layer contains zero inline state mutations.
 */
export const DigitalIdWebView: React.FC<DigitalIdWebViewProps> = observer(({ viewModel }) => {
  if (viewModel.loading) {
    return (
      <div className="digital-id-loading">
        <RefreshCw size={24} className="spin" />
        <span>Verifying Digital Campus Credentials...</span>
      </div>
    );
  }

  const profile = viewModel.profile;
  if (!profile) return null;

  return (
    <div className="digital-id-container">
      <div className="digital-id-header">
        <span className="digital-id-eyebrow">CAMPUS HEALTH & IDENTITY</span>
        <h2>Digital Student ID & Emergency Pass</h2>
        <p>Dynamic anti-spoof access credential for campus health clinics, pharmacy pickup, and lab tests.</p>
      </div>

      {viewModel.error && (
        <div className="digital-id-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{viewModel.error}</span>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="digital-id-tabs">
        {[
          { id: 'card', label: 'ID Card', icon: IdCard },
          { id: 'qr', label: 'QR Access Pass', icon: QrCode },
          { id: 'verification', label: 'Verification Details', icon: ShieldCheck },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`digital-id-tab ${viewModel.activeTab === id ? 'active' : ''}`}
            onClick={() => viewModel.setActiveTab(id as DigitalIdTab)}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Tab 1: Digital ID Card */}
      {viewModel.activeTab === 'card' && (
        <div className="digital-id-card-view">
          <div className="digital-id-badge-header">
            <div className="digital-id-brand">
              <Award size={20} color="#4f46e5" />
              <span>Studentkare Campus Identity</span>
            </div>
            <span className="digital-id-verified-pill">{viewModel.verificationBadgeText}</span>
          </div>

          <div className="digital-id-card-body">
            <div className="digital-id-avatar">
              <span>{profile.fullName.charAt(0)}</span>
            </div>
            <div className="digital-id-card-info">
              <h3>{profile.fullName}</h3>
              <p className="digital-id-univ">{profile.university}</p>

              <div className="digital-id-meta-grid">
                <div>
                  <strong>ROLL / ID NUMBER</strong>
                  <span>{profile.rollNumber}</span>
                </div>
                <div>
                  <strong>BLOOD GROUP</strong>
                  <span className="blood-tag">{profile.bloodGroup || 'O+'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="digital-id-emergency-strip">
            <HeartPulse size={18} color="#dc2626" />
            <div>
              <strong>Emergency Contact: {profile.emergencyContactName} ({profile.emergencyContactRelation})</strong>
              <span>Phone: {profile.emergencyContactPhone}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Dynamic QR Pass */}
      {viewModel.activeTab === 'qr' && (
        <div className="digital-id-qr-view">
          <h3>Dynamic Campus Gate & Clinic Pass</h3>
          <p>Scan at campus clinic check-in desk or automated pharmacy dispatcher.</p>

          <div className="digital-id-qr-box">
            <QrCode size={140} color="#0f172a" />
            <span className="digital-id-qr-code-text">{viewModel.qrToken}</span>
          </div>

          <div className="digital-id-qr-status">
            <span>{viewModel.formattedExpiry}</span>
            <button
              type="button"
              className="digital-id-refresh-btn"
              disabled={viewModel.refreshingQr}
              onClick={() => viewModel.refreshQrPass()}
            >
              <RefreshCw size={14} className={viewModel.refreshingQr ? 'spin' : ''} /> Refresh Token
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Verification Details */}
      {viewModel.activeTab === 'verification' && (
        <div className="digital-id-details-view">
          <h3>Verification Audit Trail</h3>
          <ul className="digital-id-audit-list">
            <li>
              <ShieldCheck size={18} color="#16a34a" />
              <div>
                <strong>University Student Affiliation</strong>
                <p>{profile.isVerifiedStudent ? 'Verified via university domain & SSO gateway' : 'Pending verification'}</p>
              </div>
            </li>
            <li>
              <ShieldCheck size={18} color="#16a34a" />
              <div>
                <strong>Age & Identity Evidence</strong>
                <p>{profile.ageVerified ? 'Verified via official campus enrollment records' : 'Self-reported date of birth'}</p>
              </div>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
});
