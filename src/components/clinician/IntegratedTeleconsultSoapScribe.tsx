import React, { useState } from 'react';
import { Video, Mic, MicOff, ShieldCheck } from 'lucide-react';
import { Field } from '../interface/WorkflowUI';
import '../../theme/workflows.css';

export function IntegratedTeleconsultSoapScribe() {
  const [isRecording, setIsRecording] = useState(false);
  // No consultation is wired to this scribe yet, so it opens empty: no patient,
  // no pre-written findings, and no signing (a random "Rx ID" is not a signed
  // prescription). Notes are signed from Encounter Notes.
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className="wf-card" style={{ padding: 24 }}>
      <div className="wf-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="care-eyebrow">INTEGRATED CLINICAL WORKSPACE</span>
          <h2>Teleconsult Room & AI SOAP Scribe</h2>
          <p>Split-screen video consultation, real-time speech scribe, and NMC-signed prescription writer.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Video Call & AI Voice Assistant Pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            height: 240,
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 16,
            color: '#fff',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#cbd5e1' }}>No patient selected</span>
            </div>

            <div style={{ textAlign: 'center' }} role="status">
              <Video size={48} color="#60a5fa" style={{ margin: '0 auto 8px' }} />
              <strong style={{ fontSize: 14 }}>No consultation in progress yet</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button 
                className="health-button"
                style={{
                  background: isRecording ? '#ef4444' : 'rgba(255,255,255,0.2)',
                  color: '#fff', border: 'none', minHeight: 38, fontSize: 12, fontWeight: 700
                }}
                onClick={toggleRecording}
              >
                {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                {isRecording ? 'Pause AI Voice Scribe' : 'Start AI Voice Scribe'}
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--surface-subtle, #f8fafc)', padding: 14, borderRadius: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
            <strong>AI Voice Scribe Status:</strong> {isRecording ? 'Voice scribe isn’t connected yet. Nothing is being recorded or transcribed.' : 'Not connected yet.'}
          </div>
        </div>

        {/* SOAP Notes & Prescription Pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <>
              <Field label="S — Subjective (Patient Complaints)">
                <textarea rows={2} value={subjective} onChange={e => setSubjective(e.target.value)} style={{ fontSize: 12 }} />
              </Field>

              <Field label="O — Objective (Exam & Vitals)">
                <textarea rows={2} value={objective} onChange={e => setObjective(e.target.value)} style={{ fontSize: 12 }} />
              </Field>

              <Field label="A — Assessment & Diagnosis">
                <input type="text" value={assessment} onChange={e => setAssessment(e.target.value)} style={{ fontSize: 12 }} />
              </Field>

              <Field label="P — Plan & Prescribed Rx">
                <textarea rows={3} value={plan} onChange={e => setPlan(e.target.value)} style={{ fontSize: 12 }} />
              </Field>

              <button 
                className="health-button health-button-primary"
                style={{ minHeight: 44, marginTop: 4 }}
                disabled
                aria-describedby="soap-scribe-sign-note"
              >
                <ShieldCheck size={16} /> Sign & issue prescription
              </button>
              <p id="soap-scribe-sign-note" style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                Signing isn’t connected to this scribe yet. Nothing has been issued.
              </p>
          </>
        </div>
      </div>
    </div>
  );
}
