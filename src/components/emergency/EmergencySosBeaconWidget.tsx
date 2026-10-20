import React, { useState, useEffect } from 'react';
import { AlertOctagon, PhoneCall, MapPin, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import '../../theme/workflows.css';

interface SosBeaconProps {
  onCancel?: () => void;
  onAlertSent?: (data: { location: string; timestamp: string }) => void;
}

export function EmergencySosBeaconWidget({ onCancel, onAlertSent }: SosBeaconProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [currentLocation] = useState('Hostel Block B — Room 204 (Lat: 17.5947, Long: 78.1230)');
  const [, setAlertDispatched] = useState(false);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      setIsAlertActive(true);
      setAlertDispatched(true);
      onAlertSent?.({ location: currentLocation, timestamp: new Date().toLocaleTimeString() });
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const handleStartSos = () => {
    setCountdown(3);
  };

  const handleCancelCountdown = () => {
    setCountdown(null);
    onCancel?.();
  };

  const handleResetSos = () => {
    setIsAlertActive(false);
    setAlertDispatched(false);
    setCountdown(null);
  };

  return (
    <div className="wf-card" style={{
      padding: 24,
      borderRadius: 16,
      background: isAlertActive
        ? 'linear-gradient(135deg, color-mix(in srgb, var(--sk-color-danger-fill) 70%, var(--sk-color-illustration-ink)) 0%, color-mix(in srgb, var(--sk-color-danger-fill) 60%, var(--sk-color-illustration-ink)) 100%)'
        : 'linear-gradient(135deg, var(--sk-color-danger-fill) 0%, color-mix(in srgb, var(--sk-color-danger-fill) 85%, var(--sk-color-illustration-ink)) 100%)',
      color: 'var(--sk-color-on-danger-fill)',
      boxShadow: '0 10px 30px color-mix(in srgb, var(--sk-color-danger-fill) 35%, transparent)',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--sk-color-on-danger-fill)', textTransform: 'uppercase', fontWeight: 700 }}>
            EMERGENCY SOS BEACON
          </span>
          <h3 style={{ fontSize: 22, marginTop: 4, color: 'var(--sk-color-on-danger-fill)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertOctagon size={24} /> 1-Tap Campus SOS Dispatch
          </h3>
          <p style={{ fontSize: 13, color: 'var(--sk-color-on-danger-fill)', margin: '2px 0 0' }}>
            Broadcasts your live GPS location & verified medical passport to Warden, Campus Clinic, and Emergency Responders.
          </p>
        </div>
      </div>

      {/* Countdown Window */}
      {countdown !== null ? (
        <div style={{ background: 'color-mix(in srgb, var(--sk-color-scrim-strong) 40%, transparent)', padding: 20, borderRadius: 12, textAlign: 'center', margin: '16px 0' }}>
          <span style={{ fontSize: 13, color: 'var(--sk-color-on-danger-fill)', display: 'block' }}>BROADCASTING EMERGENCY ALERT IN</span>
          <div style={{ fontSize: 56, fontWeight: 900, color: 'var(--sk-color-on-danger-fill)', margin: '4px 0' }}>{countdown}</div>
          <button 
            className="health-button"
            style={{ background: 'var(--sk-color-on-danger-fill)', color: 'var(--sk-color-danger-fill)', border: 'none', fontWeight: 800, minHeight: 44, padding: '0 24px' }}
            onClick={handleCancelCountdown}
          >
            <X size={16} /> Cancel SOS (Accidental Tap)
          </button>
        </div>
      ) : isAlertActive ? (
        <div style={{ background: 'color-mix(in srgb, var(--sk-color-scrim-strong) 40%, transparent)', padding: 20, borderRadius: 12, margin: '16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: 'var(--sk-color-on-hero-positive)' }}>
            <CheckCircle2 size={24} />
            <strong style={{ fontSize: 16 }}>SOS Beacon Active & Dispatched!</strong>
          </div>
          
          <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--sk-color-on-danger-fill)' }}>
            <div><MapPin size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> <strong>Location:</strong> {currentLocation}</div>
            <div><PhoneCall size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> <strong>Notified:</strong> Warden Desk (Prof. S. V. Kumar), Campus Ambulance Dispatcher, Dr. Ramesh Sharma (Parent)</div>
            <div><strong>Status:</strong> Response Vehicle Dispatched (ETA: 3 mins)</div>
          </div>

          <button 
            className="health-button"
            style={{ marginTop: 16, background: 'color-mix(in srgb, var(--sk-color-on-danger-fill) 15%, transparent)', color: 'var(--sk-color-on-danger-fill)', border: '1px solid color-mix(in srgb, var(--sk-color-on-danger-fill) 30%, transparent)', minHeight: 40 }}
            onClick={handleResetSos}
          >
            I Am Safe / Stand Down SOS
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--sk-color-on-danger-fill)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={14} /> GPS Position: Hostel Block B — Room 204
          </div>

          <button 
            className="health-button"
            style={{
              background: 'var(--sk-color-on-danger-fill)',
              color: 'var(--sk-color-danger-fill)',
              border: 'none',
              fontWeight: 800,
              fontSize: 15,
              padding: '12px 24px',
              borderRadius: 10,
              cursor: 'pointer',
              boxShadow: 'var(--sk-shadow-float)'
            }}
            onClick={handleStartSos}
          >
            <ShieldAlert size={18} /> TAP FOR IMMEDIATE SOS
          </button>
        </div>
      )}
    </div>
  );
}
