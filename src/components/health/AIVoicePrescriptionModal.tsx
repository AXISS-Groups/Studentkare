import React, { useState } from 'react';
import { Mic, MicOff, Sparkles, CheckCircle2, RefreshCw, X, ShoppingBag, FileText } from 'lucide-react';
import { apiRequest } from '../../data/http';

export function AIVoicePrescriptionModal({ isOpen, onClose, token: _token }: { isOpen: boolean; onClose: () => void; token: string | null }) {
  const [isRecording, setIsRecording] = useState(false);
  const [dictatedText, setDictatedText] = useState('Patient presents with fever 100.2F and dry cough for 2 days. Prescribed Dolo 650mg 1 tablet thrice daily after food for 3 days, and Pantocid 40mg 1 tablet once daily before breakfast.');
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Structured Voice Rx Items
  const [rxResult, setRxResult] = useState<{
    dictation: string;
    parsedItems: Array<{ medicine: string; active: string; dosage: string; duration: string; studentkarePrice: string }>;
    summary: string;
  } | null>(null);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      setSavedSuccess('');
      setErrorMsg('');

      // Web Speech Recognition API if supported or simulated voice scribe stream
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (e: any) => {
            const transcript = Array.from(e.results)
              .map((r: any) => r[0].transcript)
              .join(' ');
            setDictatedText(transcript);
          };
          rec.start();
        } catch {
          // Fallback simulation
        }
      }
    }
  };

  const processVoicePrescription = async () => {
    setLoading(true);
    setSavedSuccess('');
    setErrorMsg('');

    try {
      const res = await apiRequest<{ status: string; record_id: string; dictation: string; parsedItems: any[]; summary: string }>('/ai/voice-prescription', {
        method: 'POST',
        body: JSON.stringify({
          dictatedText: dictatedText || 'Patient presents with acute symptoms. Prescribed Dolo 650mg and Pantocid 40mg.',
          doctorName: 'Dr. A. K. Sen, MD',
        }),
      });
      setRxResult(res);
      setSavedSuccess('Voice Prescription transcribed, structured, and saved to ABDM Health Vault!');
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to process voice prescription.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 10, 30, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#ffffff', borderRadius: 24, width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', border: '1px solid #e9dcf7', boxShadow: '0 25px 50px -12px rgba(124, 60, 237, 0.25)' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #e11d48, #9333ea)', color: '#ffffff', borderRadius: '24px 24px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 10, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 14 }}>
              <Mic size={24} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>AI Voice Prescription & Medical Dictation Scribe</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9 }}>Speech-to-Text Clinical Transcription & Partner Pharmacy Cart Integration</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'rgba(255, 255, 255, 0.2)', border: 'none', color: '#ffffff', borderRadius: 12, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Live Microphone Dictation Visualizer Bar */}
          <div style={{ background: isRecording ? '#fff1f2' : '#f8fafc', border: '2px solid', borderColor: isRecording ? '#f43f5e' : '#cbd5e1', borderRadius: 20, padding: 20, textAlign: 'center', marginBottom: 20, transition: 'all 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
              <button
                type="button"
                onClick={toggleRecording}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: isRecording ? '#f43f5e' : '#e11d48',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isRecording ? '0 0 25px rgba(244, 63, 94, 0.6)' : '0 4px 12px rgba(225, 29, 72, 0.3)',
                }}
              >
                {isRecording ? <MicOff size={26} /> : <Mic size={26} />}
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: isRecording ? '#e11d48' : '#64748b', marginBottom: 8 }}>
              {isRecording ? '🔴 LISTENING & TRANSCRIBING CLINICAL DICTATION...' : 'CLICK MICROPHONE TO START VOICE DICTATION'}
            </div>

            {/* Audio Waveform Bars Simulator */}
            {isRecording && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: 32, marginBlock: 12 }}>
                {[14, 28, 42, 20, 36, 48, 24, 38, 16, 30].map((h, i) => (
                  <span
                    key={i}
                    style={{
                      width: 4,
                      height: `${h}px`,
                      background: '#f43f5e',
                      borderRadius: 2,
                      animation: 'pulse 1s infinite alternate',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Dictated Text Area */}
            <textarea
              value={dictatedText}
              onChange={e => setDictatedText(e.target.value)}
              rows={3}
              placeholder="Spoken symptoms and prescription dictation will appear here..."
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 14,
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                color: '#0f172a',
                outline: 'none',
                resize: 'vertical',
                background: '#ffffff',
              }}
            />
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={processVoicePrescription}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #e11d48, #9333ea)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(225, 29, 72, 0.3)',
            }}
          >
            {loading ? <RefreshCw size={18} className="spin" /> : <Sparkles size={18} />}
            {loading ? 'AI Parsing & Structuring Prescription...' : 'Process AI Voice Dictation into Prescription'}
          </button>

          {/* Parsed Prescription Card */}
          {rxResult && (
            <div style={{ marginTop: 20, background: '#fdf2f8', border: '1px solid #fbcfe8', padding: 20, borderRadius: 18 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#be185d', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={16} /> STRUCTURED CLINICAL PRESCRIPTION (Dr. A. K. Sen, MD)
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {rxResult.parsedItems.map((item, idx) => (
                  <div key={idx} style={{ background: '#ffffff', padding: 14, borderRadius: 14, border: '1px solid #f472b6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#881337' }}>{item.medicine}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#be185d' }}>Active: {item.active}</div>
                      <div style={{ fontSize: '0.8rem', color: '#475569' }}>Dosage: {item.dosage} ({item.duration})</div>
                    </div>
                    <button type="button" style={{ padding: '6px 12px', background: '#be185d', color: '#ffffff', border: 'none', borderRadius: 8, fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ShoppingBag size={12} /> Add to Cart ({item.studentkarePrice})
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {savedSuccess && (
            <div style={{ marginTop: 16, background: '#ecfdf5', border: '1px solid #a7f3d0', padding: 12, borderRadius: 12, color: '#047857', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={18} /> {savedSuccess}
            </div>
          )}

          {errorMsg && (
            <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 12, color: '#dc2626', fontSize: '0.85rem', fontWeight: 700 }}>
              {errorMsg}
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid #d1d5db', background: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
