import React, { useState } from 'react';
import { Video, Mic, MicOff, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Field } from '../interface/WorkflowUI';
import '../../theme/workflows.css';

export function IntegratedTeleconsultSoapScribe() {
  const [isRecording, setIsRecording] = useState(false);
  const [patientName] = useState('Aarav Sharma (Roll: 2024-CS-1092)');
  const [subjective, setSubjective] = useState('Patient reports 2-day history of sore throat, low-grade fever (99.8°F), and mild headache after rain exposure.');
  const [objective, setObjective] = useState('Vitals: Temp 99.4°F, Pulse 76 bpm, SpO2 99%. Pharyngeal erythema present, no tonsillar exudate.');
  const [assessment, setAssessment] = useState('Acute Viral Upper Respiratory Tract Infection (URTI)');
  const [plan, setPlan] = useState('1. Tab Paracetamol 650mg TID x 3d\n2. Tab Cetirizine 10mg HS x 5d\n3. Salt water gargle & warm fluids.');
  const [signedRxId, setSignedRxId] = useState<string | null>(null);

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const handleSignPrescription = () => {
    setSignedRxId(`RX-${Math.floor(100000 + Math.random() * 900000)}`);
  };

  return (
    <div className="wf-card" style={{ padding: 24 }}>
      <div className="wf-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="care-eyebrow">INTEGRATED CLINICAL WORKSPACE</span>
          <h2>Teleconsult Room & AI SOAP Scribe</h2>
          <p>Split-screen video consultation, real-time speech scribe, and NMC-signed prescription writer.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(16, 185, 129, 0.1)', color: '#065f46', padding: '6px 12px', borderRadius: 999, fontWeight: 700, fontSize: 12 }}>
          <ShieldCheck size={16} /> ABDM FHIR Consent Token Verified
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
              <span style={{ fontSize: 12, background: 'rgba(239, 68, 68, 0.8)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                ● LIVE VIDEO CONSULT
              </span>
              <span style={{ fontSize: 12, color: '#cbd5e1' }}>Patient: <strong>{patientName}</strong></span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Video size={48} color="#60a5fa" style={{ margin: '0 auto 8px' }} />
              <strong style={{ fontSize: 14 }}>Encrypted Tele-Consult Call Active</strong>
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
            <strong>AI Voice Scribe Status:</strong> {isRecording ? 'Listening and transcribing consultation dialogue into SOAP fields...' : 'Ready to transcribe.'}
          </div>
        </div>

        {/* SOAP Notes & Prescription Pane */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {signedRxId ? (
            <div style={{ textAlign: 'center', padding: 24, border: '1px solid #10b981', borderRadius: 12, background: 'rgba(16, 185, 129, 0.05)' }}>
              <CheckCircle2 size={40} color="#10b981" style={{ margin: '0 auto 8px' }} />
              <strong style={{ fontSize: 16 }}>Prescription Signed & Issued!</strong>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 16px' }}>
                Rx ID: <code>{signedRxId}</code> · Dispatched to Student Health Vault & Campus Pharmacy.
              </p>
              <button className="health-button health-button-primary" style={{ minHeight: 40 }} onClick={() => setSignedRxId(null)}>
                Edit / Issue Another Note
              </button>
            </div>
          ) : (
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
                onClick={handleSignPrescription}
              >
                <ShieldCheck size={16} /> Digital NMC Sign & Dispatch Rx
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
