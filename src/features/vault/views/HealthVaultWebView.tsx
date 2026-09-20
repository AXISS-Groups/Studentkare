import React from 'react';
import { observer } from 'mobx-react-lite';
import { ShieldCheck, RefreshCw, Key } from 'lucide-react';
import type { HealthVaultViewModel } from '../viewmodel/HealthVaultViewModel';
import './vault.css';

interface HealthVaultWebViewProps {
  viewModel: HealthVaultViewModel;
}

/**
 * Web View Component for ABDM / ABHA Digital Health Vault & Consent Manager.
 * Binds reactively to `HealthVaultViewModel` via MobX `observer`.
 */
export const HealthVaultWebView: React.FC<HealthVaultWebViewProps> = observer(({ viewModel }) => {
  return (
    <div className="vault-container">
      <div className="vault-header">
        <span className="vault-eyebrow">NATIONAL HEALTH AUTHORITY • ABDM / ABHA VAULT</span>
        <h2>Digital Health Vault & Consent Manager</h2>
        <p>Encrypted FHIR record repository synced with National Health Stack (ABDM).</p>
      </div>

      {/* ABHA Card Banner */}
      <div className="abha-card">
        <div className="abha-left">
          <div className="abha-logo">ABHA</div>
          <div>
            <h3>{viewModel.abhaAddress}</h3>
            <span className="abha-num">ABHA Number: {viewModel.abhaNumber}</span>
          </div>
        </div>

        <button
          type="button"
          className="btn-sync-abdm"
          onClick={() => viewModel.syncAbdmRecords()}
          disabled={viewModel.isSyncing}
        >
          <RefreshCw size={16} className={viewModel.isSyncing ? 'spin' : ''} />
          {viewModel.isSyncing ? 'Syncing ABDM...' : 'Sync ABDM Vault'}
        </button>
      </div>

      {viewModel.syncMessage && (
        <div className="sync-banner">
          <ShieldCheck size={18} color="#16a34a" />
          <span>{viewModel.syncMessage}</span>
        </div>
      )}

      <div className="vault-grid">
        {/* Left FHIR Records Vault */}
        <div className="vault-records-card">
          <h3>Encrypted Health Records ({viewModel.storedRecords.length})</h3>
          <div className="records-list">
            {viewModel.storedRecords.map((rec) => (
              <div key={rec.id} className="record-item">
                <div className="rec-header">
                  <span className="category-pill">{rec.category}</span>
                  <span className="rec-date">{rec.date}</span>
                </div>

                <h4>{rec.title}</h4>
                <span className="facility">{rec.facilityName} • Doctor: {rec.doctorName}</span>

                {rec.observations && rec.observations.length > 0 && (
                  <div className="observations-box">
                    <strong>FHIR Key Observations:</strong>
                    <ul>
                      {rec.observations.map((obs) => (
                        <li key={obs.id}>
                          {obs.display}: <strong>{obs.value} {obs.unit}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right ABDM Consent Manager */}
        <div className="vault-consent-card">
          <div className="consent-header">
            <Key size={20} color="#0284c7" />
            <h3>ABDM Consent Artifacts</h3>
          </div>
          <p className="consent-sub">Manage active data sharing authorizations with healthcare providers.</p>

          <div className="consents-list">
            {viewModel.consentRequests.map((req) => (
              <div key={req.id} className="consent-item">
                <div className="req-top">
                  <strong>{req.requesterName}</strong>
                  <span className={`status-tag status-${req.status.toLowerCase()}`}>{req.status}</span>
                </div>

                <p className="purpose">Purpose: {req.purpose}</p>

                {req.status === 'PENDING' ? (
                  <div className="consent-actions">
                    <button
                      type="button"
                      className="btn-deny"
                      onClick={() => viewModel.denyConsent(req.id)}
                    >
                      Deny Access
                    </button>
                    <button
                      type="button"
                      className="btn-grant"
                      onClick={() => viewModel.grantConsent(req.id)}
                    >
                      Authorize Access
                    </button>
                  </div>
                ) : (
                  <span className="validity">Authorized until {req.expiryDate}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
