import React from 'react';
import { observer } from 'mobx-react-lite';
import { FileCheck, CheckCircle2, User, RefreshCw, AlertTriangle } from 'lucide-react';
import type { ClaimsViewModel } from '../viewmodel/ClaimsViewModel';
import './claims.css';

interface ClaimsWebViewProps {
  viewModel: ClaimsViewModel;
}

/**
 * Web View Component for Claims Adjudication & Insurance Review.
 * Binds reactively to `ClaimsViewModel` via MobX `observer`.
 */
export const ClaimsWebView: React.FC<ClaimsWebViewProps> = observer(({ viewModel }) => {
  const claim = viewModel.claim;

  if (!claim) {
    return (
      <div className="claims-container">
        <div className="claims-empty-card">
          <FileCheck size={48} color="#94a3b8" />
          <h3>No Pending Adjudication Claims</h3>
          <p>All active insurance claims have been reviewed and signed off.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="claims-container">
      <div className="claims-header">
        <span className="claims-eyebrow">AUTOMATED AI ADJUDICATION & CLINICAL SIGN-OFF</span>
        <h2>Cashless Insurance Claim Adjudication</h2>
        <p>Claim ID: <strong>{claim.id}</strong> — Policyholder: {claim.patientName} ({claim.policyNumber})</p>
      </div>

      <div className="claims-grid">
        {/* Main Details Panel */}
        <div className="claims-main-card">
          <div className="claims-summary-row">
            <div className="summary-stat">
              <span className="stat-label">Claimed Amount</span>
              <span className="stat-value">₹{claim.totalBilled.toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Approved Base</span>
              <span className="stat-value text-green">₹{claim.totalApproved.toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Deductions</span>
              <span className="stat-value text-amber">₹{claim.totalDeductions.toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Decision Status</span>
              <span className={`status-badge status-${viewModel.signedStatus ? 'approved' : 'pending'}`}>
                {viewModel.signedStatus ? 'APPROVED & SIGNED' : claim.decisionStatus}
              </span>
            </div>
          </div>

          <div className="claims-section">
            <h3>Hospital & Admission Details</h3>
            <p><strong>Hospital:</strong> {claim.hospitalName}</p>
            <p><strong>Admission Dates:</strong> {claim.admissionDate} to {claim.dischargeDate}</p>
            <p><strong>Exchange Protocol:</strong> {claim.exchangeProtocol}</p>
          </div>

          {/* Anomaly Detection Flags */}
          <div className="claims-section">
            <h3>Anomaly Detection & Fraud Risk Flags</h3>
            {viewModel.anomalyFlags.length === 0 ? (
              <div className="no-anomalies">
                <CheckCircle2 size={18} color="#16a34a" />
                <span>Zero billing anomalies detected by AI Claims Reviewer.</span>
              </div>
            ) : (
              <div className="anomaly-list">
                {viewModel.anomalyFlags.map((flag) => (
                  <div key={flag.id} className="anomaly-item">
                    <AlertTriangle size={18} color="#d97706" />
                    <div className="anomaly-details">
                      <strong>{flag.title}</strong>
                      <p>{flag.description}</p>
                    </div>
                    <button
                      type="button"
                      className="dismiss-flag-btn"
                      onClick={() => viewModel.dismissFlag(flag.id)}
                    >
                      Dismiss & Verify
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Decision Package */}
          <div className="claims-section decision-package-section">
            <div className="dp-header">
              <h3>AI Adjudication Rationale</h3>
              <button
                type="button"
                className="btn-refresh-agent"
                onClick={() => viewModel.refreshFromAgent()}
              >
                <RefreshCw size={14} /> Refresh AI Package
              </button>
            </div>
            <p className="dp-summary">{viewModel.decisionPackage.reviewerGuidanceNote}</p>
            {viewModel.decisionPackage.deductionBreakdown && (
              <ul className="dp-reasons">
                {viewModel.decisionPackage.deductionBreakdown.map((d, i) => (
                  <li key={i}>
                    <strong>{d.category}:</strong> ₹{d.amount} ({d.reason})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Adjudicator Sign-off Sidebar */}
        <div className="claims-sidebar-card">
          <h3>Adjudicator Sign-off</h3>
          <p className="sidebar-sub">Enter reviewer credentials to execute binding claim adjudication.</p>

          <div className="form-group">
            <label htmlFor="reviewer-name-input">Senior Adjudicator Name:</label>
            <div className="input-with-icon">
              <User size={16} />
              <input
                id="reviewer-name-input"
                type="text"
                value={viewModel.reviewerName}
                onChange={(e) => viewModel.setReviewerName(e.target.value)}
                disabled={viewModel.signedStatus}
              />
            </div>
          </div>

          {viewModel.signedStatus ? (
            <div className="signed-success-banner">
              <CheckCircle2 size={24} color="#16a34a" />
              <div>
                <strong>Claim Signed & Approved</strong>
                <p>Signed by {viewModel.reviewerName}</p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="claims-btn claims-btn-primary"
              onClick={() => viewModel.signOff()}
            >
              Sign & Authorize Cashless Claim
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
