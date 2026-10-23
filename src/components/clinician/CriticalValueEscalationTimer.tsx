import React, { useState, useEffect } from 'react';
import { PhoneCall, Clock, CheckCircle2 } from 'lucide-react';
import '../../theme/workflows.css';

interface TimerProps {
  testName: string;
  value: string;
  studentName: string;
  onAcknowledged?: () => void;
}

export function CriticalValueEscalationTimer({
  testName,
  value,
  studentName,
  onAcknowledged
}: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(900); // 15 minutes = 900 seconds
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [autoCallTriggered, setAutoCallTriggered] = useState(false);

  useEffect(() => {
    if (isAcknowledged || secondsLeft <= 0) {
      if (secondsLeft <= 0 && !isAcknowledged) {
        setAutoCallTriggered(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, isAcknowledged]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const handleDoctorAcknowledge = () => {
    setIsAcknowledged(true);
    onAcknowledged?.();
  };

  return (
    <div className="wf-card" style={{
      padding: 20,
      border: isAcknowledged ? '1px solid var(--sk-color-positive)' : '2px solid var(--sk-color-danger)',
      background: isAcknowledged ? 'color-mix(in srgb, var(--sk-color-positive-fill) 4%, transparent)' : 'color-mix(in srgb, var(--sk-color-danger-fill) 4%, transparent)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span className="care-eyebrow" style={{ color: isAcknowledged ? 'var(--sk-color-positive)' : 'var(--sk-color-danger)' }}>
            15-MINUTE CLINICAL CRITICAL SLA
          </span>
          <h3 style={{ fontSize: 18, marginTop: 4 }}>
            {testName}: <strong style={{ color: 'var(--sk-color-danger)' }}>{value}</strong>
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Patient: <strong>{studentName}</strong> · Panic threshold alert requiring doctor sign-off.
          </p>
        </div>

        <div>
          {isAcknowledged ? (
            <span style={{ fontSize: 12, background: 'var(--sk-color-positive-bg)', color: 'var(--sk-color-positive)', padding: '6px 14px', borderRadius: 999, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} /> Acknowledged by Clinician
            </span>
          ) : autoCallTriggered ? (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 12, background: 'var(--sk-color-danger-bg)', color: 'var(--sk-color-danger)', padding: '6px 14px', borderRadius: 999, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <PhoneCall size={16} className="spin" /> IVR Auto-Call Dispatched to On-Call Doctor
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 16, fontWeight: 800, color: 'var(--sk-color-danger)' }}>
                <Clock size={18} /> Escalation Fallback in: {formatTime(secondsLeft)}
              </div>
              <button 
                className="health-button"
                style={{ background: 'var(--sk-color-danger-fill)', color: 'var(--sk-color-on-danger-fill)', border: 'none', minHeight: 38, fontWeight: 700, fontSize: 13 }}
                onClick={handleDoctorAcknowledge}
              >
                Sign & Acknowledge Critical Value
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
