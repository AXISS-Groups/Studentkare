import React from 'react';
import { observer } from 'mobx-react-lite';
import { Heart, Activity, Droplet, MapPin, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { useLifeShareViewModel } from '../viewmodel/useLifeshareViewModel';
import type { DonorProfile } from '../domain/LifeShare';
import './lifeshare.css';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const LifeShareWebView: React.FC = observer(() => {
  const { state, actions } = useLifeShareViewModel();

  if (state.createdRequest) {
    return (
      <div className="lifeshare-success-card">
        <CheckCircle size={48} color="#16a34a" />
        <h2>Emergency Blood Request Dispatched</h2>
        <p className="lifeshare-req-id">Request Reference: {state.createdRequest.id}</p>

        <div className="lifeshare-summary-box">
          <div>
            <strong>Target Blood Group</strong>
            <span className="blood-highlight">{state.createdRequest.bloodGroup}</span>
          </div>
          <div>
            <strong>Units Required</strong>
            <span>{state.createdRequest.unitsNeeded} Units</span>
          </div>
          <div>
            <strong>Hospital / Station</strong>
            <span>{state.createdRequest.hospitalStation}</span>
          </div>
          <div>
            <strong>Matching Status</strong>
            <span className="open-tag">{state.createdRequest.status}</span>
          </div>
        </div>

        <button
          type="button"
          className="lifeshare-btn lifeshare-btn-primary"
          onClick={() => actions.reset()}
        >
          Create Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="lifeshare-container">
      <div className="lifeshare-header">
        <span className="lifeshare-eyebrow">Campus Emergency Network</span>
        <h2>LifeShare Blood & Plasma Exchange</h2>
        <p>Peer-to-peer campus donor matching and emergency blood request dispatch.</p>
      </div>

      {state.error && (
        <div className="lifeshare-error-banner">
          <AlertCircle size={16} />
          <span>{state.error}</span>
        </div>
      )}

      <div className="lifeshare-grid">
        {/* Dispatch Request Form */}
        <div className="lifeshare-card">
          <h3>Request Emergency Blood / Plasma</h3>

          <div className="lifeshare-field">
            <label>
              <Droplet size={14} color="#dc2626" />
              Required Blood Group
            </label>
            <div className="lifeshare-bg-pills">
              {BLOOD_GROUPS.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  className={`lifeshare-bg-pill ${state.selectedBloodGroup === bg ? 'active' : ''}`}
                  onClick={() => actions.setBloodGroup(bg)}
                >
                  {bg}
                </button>
              ))}
            </div>
          </div>

          <div className="lifeshare-field">
            <label>
              <Activity size={14} color="#dc2626" />
              Units Required
            </label>
            <div className="lifeshare-units-stepper">
              <button type="button" onClick={() => actions.setUnits(state.unitsNeeded - 1)}>-</button>
              <span>{state.unitsNeeded} Units</span>
              <button type="button" onClick={() => actions.setUnits(state.unitsNeeded + 1)}>+</button>
            </div>
          </div>

          <div className="lifeshare-field">
            <label>
              <MapPin size={14} color="#dc2626" />
              Hospital / Campus Station
            </label>
            <input
              type="text"
              placeholder="e.g. Apollo Jubilee Hills / Campus Health Centre"
              value={state.hospitalStation}
              onChange={(e) => actions.setHospitalStation(e.target.value)}
            />
          </div>

          <div className="lifeshare-field">
            <label>Additional Clinical Notes (Optional)</label>
            <textarea
              rows={3}
              placeholder="Case details, patient name, contact desk..."
              value={state.notes}
              onChange={(e) => actions.setNotes(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="lifeshare-btn lifeshare-btn-submit"
            disabled={!state.canSubmit}
            onClick={() => void actions.createEmergencyRequest()}
          >
            <Heart size={16} />
            {state.submitting ? 'Dispatching...' : 'Dispatch Emergency Request'}
          </button>
        </div>

        {/* Compatible Donors List */}
        <div className="lifeshare-card">
          <h3>
            <Users size={16} color="#2563eb" style={{ display: 'inline', marginRight: 6 }} />
            Compatible Campus Donors ({state.compatibleDonorsCount})
          </h3>

          <div className="lifeshare-donor-list">
            {state.donors
              .filter((d: DonorProfile) => d.bloodGroup === state.selectedBloodGroup)
              .map((donor: DonorProfile) => (
                <div key={donor.id} className="lifeshare-donor-item">
                  <div className="lifeshare-donor-info">
                    <span className="lifeshare-bg-tag">{donor.bloodGroup}</span>
                    <div>
                      <strong>{donor.name}</strong>
                      <small>Last donated {donor.lastDonatedDaysAgo} days ago • {donor.totalDonations} total</small>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
});
