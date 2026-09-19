import React from 'react';
import { observer } from 'mobx-react-lite';
import { QrCode, CheckCircle2, Clock, Award, FileText, ChevronRight, X } from 'lucide-react';
import type { CampViewModel } from '../viewmodel/CampViewModel';
import './camp.css';

interface CampWebViewProps {
  viewModel: CampViewModel;
}

/**
 * Web View Component for Campus Health Camp & QR Station Check-in.
 * Binds reactively to `CampViewModel` via MobX `observer`.
 */
export const CampWebView: React.FC<CampWebViewProps> = observer(({ viewModel }) => {
  const camp = viewModel.camp;
  const activeStation = viewModel.activeModalStation;

  return (
    <div className="camp-container">
      <div className="camp-header">
        <span className="camp-eyebrow">ANNUAL CAMPUS HEALTH DIAGNOSTIC CAMP</span>
        <h2>{camp.campName}</h2>
        <p>{camp.institution} — {camp.location} ({camp.date})</p>
      </div>

      {/* Progress & Badge Card */}
      <div className="camp-progress-card">
        <div className="progress-info">
          <div>
            <h3>Overall Camp Completion</h3>
            <p>Student: <strong>{viewModel.studentName}</strong></p>
          </div>
          <div className="progress-stat">
            <span className="percent-text">{viewModel.progressPercent}%</span>
            <span className="count-text">{camp.completedCount} of {camp.totalStations} Stations</span>
          </div>
        </div>

        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${viewModel.progressPercent}%` }} />
        </div>

        {camp.digitalBadgeEarned && (
          <div className="badge-banner">
            <Award size={20} color="#f59e0b" />
            <span>Digital Campus Health Passport Certified Badge Unlocked!</span>
          </div>
        )}
      </div>

      {/* QR Ticket Header */}
      <div className="camp-qr-ticket-card">
        <div className="qr-box">
          <QrCode size={64} color="#0f172a" />
          <span className="qr-code-text">{camp.qrCode}</span>
        </div>
        <div className="qr-details">
          <h3>Fast-Track QR Station Pass</h3>
          <p>Scan this QR code at any station desk for instant check-in and queue placement.</p>
          <div className="checkin-status">
            <CheckCircle2 size={16} color="#16a34a" />
            <span>Checked In at {camp.checkInTime || '09:15 AM'}</span>
          </div>
        </div>
      </div>

      {/* Stations List */}
      <div className="camp-stations-section">
        <h3>Diagnostic & Clinical Screening Stations</h3>
        <div className="stations-grid">
          {camp.stations.map((st) => {
            const statusType = viewModel.stationStatus(st);
            return (
              <div key={st.id} className={`station-card status-${statusType}`}>
                <div className="station-header">
                  <div className="station-title-box">
                    <span className="station-icon">{st.iconName || '🏥'}</span>
                    <div>
                      <h4>{st.name}</h4>
                      <p>{st.description}</p>
                    </div>
                  </div>
                  <span className={`status-pill status-${statusType}`}>
                    {statusType === 'done' ? 'COMPLETED' : statusType === 'next' ? 'IN QUEUE' : 'PENDING'}
                  </span>
                </div>

                {st.readings && st.readings.length > 0 && (
                  <div className="station-readings">
                    {st.readings.map((r, i) => (
                      <span key={i} className={`reading-tag ${r.isNormal ? 'normal' : 'abnormal'}`}>
                        {r.label}: {r.value}
                      </span>
                    ))}
                  </div>
                )}

                {st.doctorNote ? (
                  <div className="station-note">
                    <FileText size={14} color="#64748b" />
                    <p>{st.doctorNote}</p>
                  </div>
                ) : null}

                {statusType !== 'done' && (
                  <button
                    type="button"
                    className="btn-complete-station"
                    onClick={() => viewModel.openCompleteModal(st)}
                  >
                    <span>Check In / Record Station Result</span>
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Complete Station Modal */}
      {activeStation && (
        <div className="camp-modal-backdrop" onClick={() => viewModel.closeModal()}>
          <div className="camp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Station Result — {activeStation.name}</h3>
              <button type="button" className="close-btn" onClick={() => viewModel.closeModal()}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <label htmlFor="doctor-note-textarea">Attending Physician Clinical Note:</label>
              <textarea
                id="doctor-note-textarea"
                rows={4}
                value={viewModel.doctorNoteInput}
                onChange={(e) => viewModel.setDoctorNote(e.target.value)}
                placeholder="Enter clinical observations or test findings..."
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => viewModel.closeModal()}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => viewModel.confirmComplete()}
                disabled={!viewModel.canConfirm}
              >
                Mark Station Completed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
