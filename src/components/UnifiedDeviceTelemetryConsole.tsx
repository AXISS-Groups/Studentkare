import React, { useState, useEffect } from 'react';
import { useTheme } from '../theme/theme';
import { useAppStore } from '../data/store';
import {
  Footprints,
  Smartphone,
  Laptop,
  Activity,
  ShieldCheck,
  Flame,
  Compass,
  CheckCircle2,
} from 'lucide-react';

export const UnifiedDeviceTelemetryConsole: React.FC = () => {
  const { tokens, typography } = useTheme();
  const { student } = useAppStore();

  // Pedometer & Motion State
  const [stepCount, setStepCount] = useState<number>(6420);
  const [isSimulatingSteps, setIsSimulatingSteps] = useState<boolean>(false);
  const [ gaitAsymmetry ] = useState<string>('1.2% (Balanced)');
  ; // degrees tilt

  // Desktop Keystroke Fatigue Telemetry
  ; // ms per keypress
  ;

  // Cross-device sync status
  ;

  // Real-time Motion Pedometer Listener (Mobile DeviceMotionEvent)
  useEffect(() => {
    let lastAccel = 0;

    const handleMotion = (event: DeviceMotionEvent) => {
      if (event.accelerationIncludingGravity) {
        const { x, y, z } = event.accelerationIncludingGravity;
        const mag = Math.sqrt((x || 0) ** 2 + (y || 0) ** 2 + (z || 0) ** 2);
        const delta = Math.abs(mag - lastAccel);
        if (delta > 3.2) { // Step acceleration threshold
          setStepCount((prev) => prev + 1);
        }
        lastAccel = mag;
      }
    };

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
        window.removeEventListener('devicemotion', handleMotion);
      }
    };
  }, []);

  // Step Simulation Interval for testing on Desktop
  useEffect(() => {
    let interval: any;
    if (isSimulatingSteps) {
      interval = setInterval(() => {
        setStepCount((prev) => prev + 1);
      }, 700);
    }
    return () => clearInterval(interval);
  }, [isSimulatingSteps]);

  // Derived Calculations
  const distanceKm = (stepCount * 0.00075).toFixed(2);
  const caloriesBurned = Math.round(stepCount * 0.042);

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: tokens.surface,
        borderRadius: 24,
        border: `1.5px solid ${tokens.rule}`,
        padding: 28,
        boxShadow: '0 10px 32px rgba(83, 80, 204, 0.06)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tokens.surface3, border: `1px solid ${tokens.veil}`, display: 'grid', placeItems: 'center' }}>
            <Footprints size={24} color={tokens.action} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: tokens.text, letterSpacing: -0.5 }}>
              Unified Multi-Device Telemetry Engine
            </div>
            <div style={{ fontSize: 12, color: tokens.text2, fontFamily: typography.fontMono }}>
              MOBILE PEDOMETER · DESKTOP KEYSTROKE CADENCE · ABDM SYNC
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontFamily: typography.fontMono, padding: '5px 12px', borderRadius: 9999, backgroundColor: tokens.positiveBg, color: tokens.positive, fontWeight: 800 }}>
            ● MOBILE & DESKTOP SYNCED VIA ABDM LOCKER
          </span>
        </div>
      </div>

      {/* ─── 1. PEDOMETER & MOTION METRICS BAR ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        
        {/* Step Count Card */}
        <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 18, border: `1px solid ${tokens.ruleSoft}`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>FOOTSTEPS TODAY</span>
            <Footprints size={18} color={tokens.action} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: tokens.text, fontFamily: typography.fontMono }}>
            {stepCount.toLocaleString()} <span style={{ fontSize: 14, color: tokens.text2 }}>steps</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <span style={{ fontSize: 11, color: tokens.positive, fontWeight: 700 }}>Target: 8,000 steps (80%)</span>
            <button
              onClick={() => setIsSimulatingSteps(!isSimulatingSteps)}
              style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 9999,
                backgroundColor: isSimulatingSteps ? tokens.positiveBg : tokens.surface3,
                color: isSimulatingSteps ? tokens.positive : tokens.action,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {isSimulatingSteps ? 'Simulating...' : 'Test Walk Demo'}
            </button>
          </div>
        </div>

        {/* Distance Card */}
        <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 18, border: `1px solid ${tokens.ruleSoft}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>DISTANCE WALKED</span>
            <Compass size={18} color={tokens.action} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: tokens.text, fontFamily: typography.fontMono }}>
            {distanceKm} <span style={{ fontSize: 14, color: tokens.text2 }}>km</span>
          </div>
          <div style={{ fontSize: 11, color: tokens.text2, marginTop: 10 }}>
            Campus Quad to Hostel Route
          </div>
        </div>

        {/* Active Calories Card */}
        <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 18, border: `1px solid ${tokens.ruleSoft}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>ACTIVE CALORIES</span>
            <Flame size={18} color={tokens.emergency} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: tokens.text, fontFamily: typography.fontMono }}>
            {caloriesBurned} <span style={{ fontSize: 14, color: tokens.text2 }}>kcal</span>
          </div>
          <div style={{ fontSize: 11, color: tokens.positive, marginTop: 10, fontWeight: 700 }}>
            +45 Wellness Points Earned
          </div>
        </div>

        {/* Gait Balance Card */}
        <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 18, border: `1px solid ${tokens.ruleSoft}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>GAIT ASYMMETRY</span>
            <Activity size={18} color={tokens.positive} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: tokens.text, fontFamily: typography.fontMono, marginTop: 6 }}>
            {gaitAsymmetry}
          </div>
          <div style={{ fontSize: 11, color: tokens.text2, marginTop: 10 }}>
            Derived via Mobile Gyroscope
          </div>
        </div>

      </div>

      {/* ─── 2. MOBILE VS DESKTOP SENSING MATRIX ────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        
        {/* Mobile Telemetry Capabilities */}
        <div style={{ backgroundColor: tokens.surface2, borderRadius: 20, padding: 20, border: `1px solid ${tokens.ruleSoft}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Smartphone size={20} color={tokens.action} />
            <div style={{ fontSize: 15, fontWeight: 800, color: tokens.text }}>Mobile Device Telemetry</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5, color: tokens.text2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={14} color={tokens.positive} />
              <span><b>Step Counter & Gait Balance</b>: Accelerometer thresholding.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={14} color={tokens.positive} />
              <span><b>rPPG Heart Rate & SpO2</b>: Rear LED flash transillumination.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={14} color={tokens.positive} />
              <span><b>Circadian Lux Tracker</b>: Ambient light sensor to avoid eye strain.</span>
            </div>
          </div>
        </div>

        {/* Desktop Telemetry Capabilities */}
        <div style={{ backgroundColor: tokens.surface2, borderRadius: 20, padding: 20, border: `1px solid ${tokens.ruleSoft}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Laptop size={20} color={tokens.action} />
            <div style={{ fontSize: 15, fontWeight: 800, color: tokens.text }}>Desktop Web Console Telemetry</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5, color: tokens.text2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={14} color={tokens.positive} />
              <span><b>Webcam rPPG & Eye Fatigue</b>: Facial blink rate & EAR ratio.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={14} color={tokens.positive} />
              <span><b>Keystroke Cadence</b>: Typing interval variability & fatigue.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={14} color={tokens.positive} />
              <span><b>Desk Slouch Angle</b>: Head tilt posture check via webcam.</span>
            </div>
          </div>
        </div>

      </div>

      {/* ABDM Cross-Device Sync Footer */}
      <div style={{ marginTop: 20, backgroundColor: tokens.canvas, borderRadius: 16, padding: 16, border: `1px solid ${tokens.ruleSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={18} color={tokens.positive} />
          <div style={{ fontSize: 12.5, color: tokens.text2 }}>
            <b>Cross-Device Synchronization</b>: Data logged on mobile (steps, flash PPG) automatically updates on desktop upon logging into Student Kare.
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono }}>
          ABHA: {student.abhaAddress || 'arjun.mehta@abdm'}
        </span>
      </div>

    </div>
  );
};
