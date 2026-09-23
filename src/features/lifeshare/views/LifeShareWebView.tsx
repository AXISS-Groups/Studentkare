import React from 'react';
import { observer } from 'mobx-react-lite';
import { Droplet, ShieldCheck, MapPin, CheckCircle2, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';
import type { LifeShareViewModel } from '../viewmodel/LifeShareViewModel';
import './lifeshare.css';

interface LifeShareWebViewProps {
  viewModel: LifeShareViewModel;
}

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Web View Component for Campus LifeShare Blood & Plasma Exchange.
 *
 * Binds reactively to `LifeShareViewModel` via MobX `observer`.
 * View layer contains zero inline state mutations.
 */
export const LifeShareWebView: React.FC<LifeShareWebViewProps> = observer(({ viewModel }) => {
  if (viewModel.createdRequest) {
    return (
      <div className="lifeshare-success-card">
        <div className="lifeshare-success-icon">
          <CheckCircle2 size={46} color="#dc2626" />
        </div>
        <h2>Emergency Blood Request Broadcasted!</h2>
        <span className="lifeshare-req-id">Ref: {viewModel.createdRequest.id}</span>

        <div className="lifeshare-summary-box">
          <div>
            <strong>Blood Group Required</strong>
            <span className="blood-highlight">{viewModel.createdRequest.bloodGroup} ({viewModel.createdRequest.unitsNeeded} Units)</span>
          </div>
          <div>
            <strong>Hospital Station</strong>
            <span>{viewModel.createdRequest.hospitalStation}</span>
          </div>
          <div>
            <strong>Status</strong>
            <span className="open-tag">{viewModel.createdRequest.status}</span>
          </div>
        </div>

        <button type="button" className="lifeshare-btn lifeshare-btn-primary" onClick={() => viewModel.reset()}>
          Create Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="lifeshare-container">
      <div className="lifeshare-header">
        <span className="lifeshare-eyebrow">CAMPUS EMERGENCY NETWORK</span>
        <h2>LifeShare Blood & Plasma Exchange</h2>
        <p>Peer-to-peer verified campus blood donor matching and emergency hospital dispatch.</p>
      </div>

      {viewModel.error && (
        <div className="lifeshare-error-banner" role="alert">
          <AlertTriangle size={16} />
          <span>{viewModel.error}</span>
        </div>
      )}

      <div className="lifeshare-grid">
        {/* Request Form */}
        <div className="lifeshare-card">
          <h3>Request Emergency Blood / Plasma</h3>

          <div className="lifeshare-field">
            <label><Droplet size={14} color="#dc2626" /> Select Blood Group</label>
            <div className="lifeshare-bg-pills">
              {bloodGroups.map(bg => (
                <button
                  key={bg}
                  type="button"
                  className={`lifeshare-bg-pill ${viewModel.selectedBloodGroup === bg ? 'active' : ''}`}
                  onClick={() => viewModel.setBloodGroup(bg)}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          <div className="lifeshare-field">
            <label>Units Required</label>
            <div className="lifeshare-units-stepper">
              <button type="button" onClick={() => viewModel.setUnits(viewModel.unitsNeeded - 1)}>-</button>
              <span>{viewModel.unitsNeeded} Units</span>
              <button type="button" onClick={() => viewModel.setUnits(viewModel.unitsNeeded + 1)}>+</button>
            </div>
          </div>

          <div className="lifeshare-field">
            <label><MapPin size={14} /> Hospital / Clinic Station</label>
            <input
              type="text"
              placeholder="e.g. Osmania University Health Center / Apollo Clinic"
              value={viewModel.hospitalStation}
              onChange={e => viewModel.setHospitalStation(e.target.value)}
            />
          </div>

          <div className="lifeshare-field">
            <label>Urgency Notes / Patient Condition</label>
            <textarea
              placeholder="State patient condition, surgical requirement or urgency details..."
              value={viewModel.notes}
              onChange={e => viewModel.setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <button
            type="button"
            className="lifeshare-btn lifeshare-btn-submit"
            disabled={!viewModel.canSubmit}
            onClick={() => viewModel.createEmergencyRequest()}
          >
            {viewModel.submitting ? (
              <RefreshCw size={16} className="spin" />
            ) : (
              <>Broadcast Emergency Blood SOS <ArrowRight size={16} /></>
            )}
          </button>
        </div>

        {/* Active Donors & Feed */}
        <div className="lifeshare-feed-section">
          <div className="lifeshare-card">
            <h3>Verified Campus Donors ({viewModel.compatibleDonorsCount} Compatible)</h3>
            <div className="lifeshare-donor-list">
              {viewModel.donors.map(donor => (
                <div key={donor.id} className="lifeshare-donor-item">
                  <div className="lifeshare-donor-info">
                    <span className="lifeshare-bg-tag">{donor.bloodGroup}</span>
                    <div>
                      <strong>{donor.name}</strong>
                      <small>{donor.totalDonations} Previous Donations · {donor.campusYear}</small>
                    </div>
                  </div>
                  <ShieldCheck size={18} color="#16a34a" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
