import React from 'react';
import { observer } from 'mobx-react-lite';
import { Calendar, Clock, Stethoscope, MapPin, CheckCircle2, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import type { AppointmentBookingViewModel, ModalityType } from '../viewmodel/AppointmentBookingViewModel';
import './appointments.css';

interface AppointmentBookingWebViewProps {
  viewModel: AppointmentBookingViewModel;
}

const modalityLabels: Record<ModalityType, string> = {
  WALK_IN: '🏥 Walk-In Clinic OPD',
  HOME_COLLECTION: '🏡 Home / Hostel Sample Collection',
  TELECONSULT: '📹 Video Teleconsultation',
};

/**
 * Web View Component for Appointment & Lab Slot Booking.
 *
 * Binds reactively to `AppointmentBookingViewModel` via MobX `observer`.
 * View layer contains zero inline state mutations.
 */
export const AppointmentBookingWebView: React.FC<AppointmentBookingWebViewProps> = observer(({ viewModel }) => {
  if (viewModel.confirmation) {
    return (
      <div className="appt-confirmation-card">
        <div className="appt-confirmation-icon">
          <CheckCircle2 size={42} color="#16a34a" />
        </div>
        <h2>Appointment Confirmed!</h2>
        <span className="appt-booking-id">Reference: {viewModel.confirmation.bookingId}</span>

        <div className="appt-confirmation-details">
          <div>
            <strong>Provider</strong>
            <span>{viewModel.confirmation.providerName}</span>
          </div>
          <div>
            <strong>Date & Time</strong>
            <span>{viewModel.confirmation.date} at {viewModel.confirmation.timeSlot}</span>
          </div>
          <div>
            <strong>Modality</strong>
            <span>{modalityLabels[viewModel.confirmation.modality]}</span>
          </div>
          <div>
            <strong>Status</strong>
            <span className="appt-status-tag">{viewModel.confirmation.status}</span>
          </div>
        </div>

        <button type="button" className="appt-btn appt-btn-primary" onClick={() => viewModel.reset()}>
          Book Another Appointment
        </button>
      </div>
    );
  }

  return (
    <div className="appt-booking-container">
      <div className="appt-booking-header">
        <span className="appt-eyebrow">CAMPUS HEALTH & LAB SERVICES</span>
        <h2>Schedule an Appointment</h2>
        <p>Book General Physician teleconsults, specialist appointments, and NABL lab diagnostic slots.</p>
      </div>

      {viewModel.error && (
        <div className="appt-error-alert" role="alert">
          <AlertCircle size={16} />
          <span>{viewModel.error}</span>
        </div>
      )}

      <div className="appt-booking-grid">
        {/* Step 1: Provider Selection */}
        <div className="appt-section">
          <label className="appt-section-label">
            <Stethoscope size={16} /> 1. Select Care Provider
          </label>
          <div className="appt-provider-list">
            {viewModel.loadingProviders ? (
              <div className="appt-loading-spinner">
                <RefreshCw size={20} className="spin" /> Loading providers...
              </div>
            ) : (
              viewModel.providers.map(p => (
                <div
                  key={p.id}
                  className={`appt-provider-card ${viewModel.selectedProviderId === p.id ? 'selected' : ''}`}
                  onClick={() => viewModel.selectProvider(p.id)}
                >
                  <strong>{p.name}</strong>
                  <small>{p.specialty}</small>
                  <span className="appt-station">
                    <MapPin size={12} /> {p.campusStation}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Step 2: Date & Modality Selection */}
        <div className="appt-section">
          <label className="appt-section-label">
            <Calendar size={16} /> 2. Select Date & Care Modality
          </label>
          <input
            type="date"
            className="appt-date-input"
            value={viewModel.selectedDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => viewModel.setDate(e.target.value)}
          />

          {viewModel.selectedProvider && (
            <div className="appt-modality-selector">
              <span>Care Modality:</span>
              <div className="appt-modality-pills">
                {viewModel.selectedProvider.availableModality.map(m => (
                  <button
                    key={m}
                    type="button"
                    className={`appt-modality-pill ${viewModel.modality === m ? 'active' : ''}`}
                    onClick={() => viewModel.setModality(m)}
                  >
                    {modalityLabels[m]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Time Slot Picker */}
        <div className="appt-section">
          <label className="appt-section-label">
            <Clock size={16} /> 3. Available Time Slots ({viewModel.formattedSelectedDate})
          </label>

          {viewModel.loadingSlots ? (
            <div className="appt-loading-spinner">
              <RefreshCw size={18} className="spin" /> Checking available slots...
            </div>
          ) : (
            <div className="appt-slots-grid">
              {viewModel.availableSlots.map(slot => (
                <button
                  key={slot.id}
                  type="button"
                  disabled={!slot.available}
                  className={`appt-slot-pill ${viewModel.selectedTimeSlot === slot.time ? 'selected' : ''} ${!slot.available ? 'disabled' : ''}`}
                  onClick={() => viewModel.setTimeSlot(slot.time)}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 4: Patient Notes & Submit */}
        <div className="appt-section">
          <label className="appt-section-label">4. Patient Notes / Symptoms (Optional)</label>
          <textarea
            className="appt-notes-textarea"
            placeholder="Describe symptoms, medical history, or specific requirements for the doctor..."
            value={viewModel.patientNotes}
            onChange={e => viewModel.setNotes(e.target.value)}
            rows={3}
          />

          <button
            type="button"
            className="appt-btn appt-btn-submit"
            disabled={!viewModel.canSubmit}
            onClick={() => viewModel.submitBooking()}
          >
            {viewModel.submitting ? (
              <>
                <RefreshCw size={16} className="spin" /> Confirming Booking...
              </>
            ) : (
              <>
                Confirm & Schedule Appointment <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
