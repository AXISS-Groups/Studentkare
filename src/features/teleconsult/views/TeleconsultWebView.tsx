import React from 'react';
import { observer } from 'mobx-react-lite';
import { Video, Mic, MicOff, Camera, CameraOff, PhoneOff, Send, FileText, CheckCircle2, RefreshCw, AlertCircle, MessageSquare } from 'lucide-react';
import type { TeleconsultViewModel } from '../viewmodel/TeleconsultViewModel';
import './teleconsult.css';

interface TeleconsultWebViewProps {
  viewModel: TeleconsultViewModel;
}

/**
 * Web View Component for Teleconsult Video & Digital E-Prescription Scribe.
 *
 * Binds reactively to `TeleconsultViewModel` via MobX `observer`.
 * View layer contains zero inline state mutations.
 */
export const TeleconsultWebView: React.FC<TeleconsultWebViewProps> = observer(({ viewModel }) => {
  if (viewModel.sessionStatus === 'ENDED' && viewModel.ePrescription) {
    const rx = viewModel.ePrescription;
    return (
      <div className="teleconsult-rx-card">
        <div className="teleconsult-rx-header">
          <CheckCircle2 size={38} color="#16a34a" />
          <div>
            <h2>Digital E-Prescription Issued</h2>
            <span className="teleconsult-rx-id">Prescription ID: {rx.prescriptionId}</span>
          </div>
        </div>

        <div className="teleconsult-rx-body">
          <div className="teleconsult-rx-row">
            <strong>Prescribing Physician:</strong>
            <span>{rx.doctorName}</span>
          </div>
          <div className="teleconsult-rx-row">
            <strong>Diagnosis:</strong>
            <span>{rx.diagnosis}</span>
          </div>

          <div className="teleconsult-rx-meds">
            <strong>Prescribed Medications:</strong>
            <ul>
              {rx.medicines.map((m, i) => (
                <li key={i}>
                  <strong>{m.name}</strong> — {m.dosage} ({m.durationDays} Days)
                </li>
              ))}
            </ul>
          </div>

          <div className="teleconsult-rx-notes">
            <strong>Clinical Advice:</strong>
            <p>{rx.clinicalNotes}</p>
          </div>
        </div>

        <button type="button" className="teleconsult-btn teleconsult-btn-primary" onClick={() => viewModel.reset()}>
          Start New Consultation
        </button>
      </div>
    );
  }

  return (
    <div className="teleconsult-container">
      <div className="teleconsult-header">
        <span className="teleconsult-eyebrow">TELEHEALTH VIDEO OP-ROOM</span>
        <h2>Doctor Video Teleconsultation</h2>
        <p>Live encrypted WebRTC consultation with NMC registered senior general physicians.</p>
      </div>

      {viewModel.error && (
        <div className="teleconsult-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{viewModel.error}</span>
        </div>
      )}

      {viewModel.sessionStatus === 'IDLE' && (
        <div className="teleconsult-idle-card">
          <Video size={48} color="#4f46e5" />
          <h3>Ready to connect with {viewModel.activeDoctorName}</h3>
          <p>Ensure your microphone and camera permissions are enabled.</p>
          <button type="button" className="teleconsult-btn teleconsult-btn-primary" onClick={() => viewModel.startCall()}>
            Start Video Call Now
          </button>
        </div>
      )}

      {(viewModel.sessionStatus === 'CONNECTING' || viewModel.sessionStatus === 'CONNECTED') && (
        <div className="teleconsult-active-grid">
          {/* Video Feed Frame */}
          <div className="teleconsult-video-frame">
            <div className="teleconsult-video-overlay">
              <span className="teleconsult-status-badge">
                ● {viewModel.sessionStatus === 'CONNECTING' ? 'CONNECTING...' : `LIVE (${viewModel.formattedCallDuration})`}
              </span>
              <span className="teleconsult-doctor-tag">{viewModel.activeDoctorName}</span>
            </div>

            <div className={`teleconsult-video-placeholder ${viewModel.isVideoOff ? 'video-off' : ''}`}>
              {viewModel.isVideoOff ? (
                <span>Camera Paused</span>
              ) : (
                <div className="teleconsult-simulated-video">
                  <Video size={56} color="#ffffff" />
                  <span>Encrypted WebRTC Video Stream</span>
                </div>
              )}
            </div>

            {/* In-Call Controls */}
            <div className="teleconsult-controls-bar">
              <button
                type="button"
                className={`teleconsult-control-btn ${viewModel.isMuted ? 'muted' : ''}`}
                onClick={() => viewModel.toggleMute()}
                title={viewModel.isMuted ? 'Unmute' : 'Mute'}
              >
                {viewModel.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <button
                type="button"
                className={`teleconsult-control-btn ${viewModel.isVideoOff ? 'muted' : ''}`}
                onClick={() => viewModel.toggleVideo()}
                title={viewModel.isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {viewModel.isVideoOff ? <CameraOff size={18} /> : <Camera size={18} />}
              </button>

              <button
                type="button"
                className="teleconsult-control-btn end-call"
                onClick={() => viewModel.endCall()}
                title="End Consultation"
              >
                <PhoneOff size={18} /> End Call
              </button>
            </div>
          </div>

          {/* In-Call Chat Sidebar */}
          <div className="teleconsult-chat-sidebar">
            <div className="teleconsult-chat-header">
              <MessageSquare size={16} /> In-Call Clinical Chat
            </div>

            <div className="teleconsult-chat-messages">
              {viewModel.chatMessages.map(msg => (
                <div key={msg.id} className={`chat-bubble sender-${msg.sender.toLowerCase()}`}>
                  <strong className="chat-sender">{msg.sender === 'DOCTOR' ? 'Dr. Radhika' : 'You'}</strong>
                  <p>{msg.text}</p>
                </div>
              ))}
            </div>

            <div className="teleconsult-chat-input-row">
              <input
                type="text"
                placeholder="Type message or ask prescription questions..."
                value={viewModel.chatInput}
                onChange={e => viewModel.setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && viewModel.sendChatMessage()}
              />
              <button type="button" onClick={() => viewModel.sendChatMessage()}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
