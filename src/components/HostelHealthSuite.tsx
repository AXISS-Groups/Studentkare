import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTheme } from '../theme/theme';
import { useStudentStore } from '../store/AppStores';
import {
  Clock,
  Utensils,
  Trophy,
  QrCode,
  Download,
  AlertTriangle,
  HeartHandshake,
  CheckCircle2,
  Shield,
  Smile,
  Frown,
  Meh,
} from 'lucide-react';

const HostelHealthSuiteUnwrapped: React.FC = () => {
  const { tokens, typography } = useTheme();
  const { student } = useStudentStore();

  const [activeSubTab, setActiveSubTab] = useState<'opd' | 'mental' | 'passport' | 'nutrition' | 'leaderboard'>('opd');

  // OPD & Queue State
  const [tokenBooked, setTokenBooked] = useState<boolean>(false);
  const [userTokenNumber, setUserTokenNumber] = useState<number>(18);
  const [ currentTokenNumber ] = useState<number>(14);
  const [leaveReason, setLeaveReason] = useState<string>('Viral Fever & Fatigue');
  const [certGenerated, setCertGenerated] = useState<boolean>(false);

  // Mental Health State
  const [selectedMood, setSelectedMood] = useState<'great' | 'okay' | 'stressed' | 'anxious'>('okay');
  const [counselingBooked, setCounselingBooked] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<string>('Today · 4:30 PM');

  // Mess Nutrition State
  const [selectedMeal, setSelectedMeal] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');

  const handleBookOpdToken = () => {
    setUserTokenNumber(currentTokenNumber + 4);
    setTokenBooked(true);
  };

  const handleGenerateCertificate = () => {
    setCertGenerated(true);
  };

  return (
    <div style={{ width: '100%', backgroundColor: tokens.surface, borderRadius: 24, border: `1px solid ${tokens.rule}`, padding: 28, boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)' }}>
      
      {/* Header Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: tokens.text, letterSpacing: -0.5 }}>
            Campus & Hostel Operations Suite
          </div>
          <div style={{ fontSize: 12, color: tokens.text2, fontFamily: typography.fontMono }}>
            OPD QUEUE · MENTAL WELLNESS · MESS NUTRITION · VERIFIABLE PASSPORT · LEADERBOARDS
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontFamily: typography.fontMono, padding: '4px 12px', borderRadius: 9999, backgroundColor: tokens.surface2, color: tokens.action, fontWeight: 800 }}>
            {student.university || 'Osmania University'}
          </span>
        </div>
      </div>

      {/* Sub-module Navigation Pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        {[
          { id: 'opd', label: '1. OPD Queue & Med Cert', icon: <Clock size={16} /> },
          { id: 'mental', label: '2. Counseling & Mood', icon: <HeartHandshake size={16} /> },
          { id: 'passport', label: '3. Digital Health Passport', icon: <QrCode size={16} /> },
          { id: 'nutrition', label: '4. Hostel Mess Nutrition', icon: <Utensils size={16} /> },
          { id: 'leaderboard', label: '5. Inter-Hostel Ranks', icon: <Trophy size={16} /> },
        ].map((item) => {
          const active = activeSubTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSubTab(item.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 16px',
                borderRadius: 9999,
                border: `1.5px solid ${active ? tokens.action : tokens.rule}`,
                backgroundColor: active ? tokens.action : tokens.surface2,
                color: active ? '#ffffff' : tokens.text,
                fontWeight: 700,
                fontSize: 12.5,
                cursor: 'pointer',
                transition: 'all 160ms ease',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── MODULE 1: HOSTEL OPD QUEUE & MEDICAL CERTIFICATE ISSUER ─────────── */}
      {activeSubTab === 'opd' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            
            {/* Live OPD Tracker Card */}
            <div style={{ backgroundColor: tokens.canvas, borderRadius: 20, padding: 22, border: `1px solid ${tokens.rule}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: tokens.text }}>Campus Health Centre OPD</div>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 9999, backgroundColor: tokens.positiveBg, color: tokens.positive, fontFamily: typography.fontMono }}>
                  DOCTOR IN ATTENDANCE
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div style={{ backgroundColor: tokens.surface, borderRadius: 14, padding: 16, textAlign: 'center', border: `1px solid ${tokens.ruleSoft}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: tokens.text2, fontFamily: typography.fontMono }}>CURRENT TOKEN</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono }}>#{currentTokenNumber}</div>
                </div>

                <div style={{ backgroundColor: tokens.surface, borderRadius: 14, padding: 16, textAlign: 'center', border: `1px solid ${tokens.ruleSoft}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: tokens.text2, fontFamily: typography.fontMono }}>ESTIMATED WAIT</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: tokens.text, fontFamily: typography.fontMono }}>12 <span style={{ fontSize: 14 }}>mins</span></div>
                </div>
              </div>

              {tokenBooked ? (
                <div style={{ backgroundColor: tokens.surface3, borderRadius: 14, padding: 16, border: `1px solid ${tokens.action}`, marginBottom: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono }}>YOUR LIVE OPD TOKEN</div>
                  <div style={{ fontSize: 42, fontWeight: 900, color: tokens.action, fontFamily: typography.fontMono }}>#{userTokenNumber}</div>
                  <div style={{ fontSize: 12, color: tokens.text2, marginTop: 4 }}>
                    Please report to Room 102 when Token #{userTokenNumber - 1} is called.
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleBookOpdToken}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: 12,
                    backgroundColor: tokens.action,
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 13.5,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(83, 80, 204, 0.3)',
                  }}
                >
                  Reserve Online OPD Token Slot
                </button>
              )}
            </div>

            {/* Academic Leave Medical Certificate Issuer */}
            <div style={{ backgroundColor: tokens.canvas, borderRadius: 20, padding: 22, border: `1px solid ${tokens.rule}` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: tokens.text, marginBottom: 4 }}>
                Academic & Hostel Leave Certificate
              </div>
              <div style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
                Digital verifiable sick leave certificate signed by NMC-verified campus medical officers.
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: tokens.text2, marginBottom: 6 }}>DIAGNOSTIC / SICKNESS REASON</div>
                <input
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: `1px solid ${tokens.rule}`,
                    backgroundColor: tokens.surface,
                    fontSize: 13,
                    fontWeight: 600,
                    color: tokens.text,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {certGenerated ? (
                <div style={{ backgroundColor: tokens.surface, borderRadius: 14, padding: 16, border: `1.5px solid ${tokens.positive}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: tokens.positive, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
                    <CheckCircle2 size={16} />
                    <span>Official Certificate Issued (Ref: MC-2026-889)</span>
                  </div>
                  <div style={{ fontSize: 12, color: tokens.text2, lineHeight: 1.5, fontFamily: typography.fontMono }}>
                    Valid for 2 Days Leave · Verified Doctor: Dr. Ananya Rao, MD (NMC reg #66912)
                  </div>
                  <button
                    onClick={() => alert('Medical Leave Certificate PDF downloaded!')}
                    style={{
                      marginTop: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 8,
                      backgroundColor: tokens.action,
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 12,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Download size={14} />
                    <span>Download Signed PDF for Warden</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGenerateCertificate}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: 12,
                    backgroundColor: tokens.surface2,
                    color: tokens.action,
                    fontWeight: 800,
                    fontSize: 13.5,
                    border: `1.5px solid ${tokens.action}`,
                    cursor: 'pointer',
                  }}
                >
                  Generate Signed Medical Certificate
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ─── MODULE 2: ANONYMOUS MENTAL HEALTH & COUNSELING SCHEDULER ────────── */}
      {activeSubTab === 'mental' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            
            {/* Mood Check-In */}
            <div style={{ backgroundColor: tokens.canvas, borderRadius: 20, padding: 22, border: `1px solid ${tokens.rule}` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: tokens.text, marginBottom: 4 }}>
                Daily Confidential Mood & Exam Stress Check
              </div>
              <div style={{ fontSize: 12, color: tokens.text2, marginBottom: 18 }}>
                Track your emotional wellbeing. Anonymous data helps campus student care teams optimize exam schedules.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-around', gap: 10, marginBottom: 20 }}>
                {[
                  { id: 'great', label: 'Energetic', icon: <Smile size={24} color="#007a55" /> },
                  { id: 'okay', label: 'Balanced', icon: <Meh size={24} color="#5350cc" /> },
                  { id: 'stressed', label: 'Exam Stress', icon: <Frown size={24} color="#ffb020" /> },
                  { id: 'anxious', label: 'Anxious', icon: <AlertTriangle size={24} color="#ff5647" /> },
                ].map((m) => {
                  const active = selectedMood === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMood(m.id as any)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        padding: '12px 14px',
                        borderRadius: 14,
                        border: `1.5px solid ${active ? tokens.action : tokens.ruleSoft}`,
                        backgroundColor: active ? tokens.surface3 : tokens.surface,
                        cursor: 'pointer',
                        flex: 1,
                      }}
                    >
                      {m.icon}
                      <span style={{ fontSize: 11, fontWeight: 700, color: tokens.text }}>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ backgroundColor: tokens.surface, borderRadius: 14, padding: 14, border: `1px solid ${tokens.ruleSoft}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: tokens.action, marginBottom: 4 }}>
                  💡 Campus Wellness Tip for {selectedMood.toUpperCase()}:
                </div>
                <div style={{ fontSize: 12, color: tokens.text2, lineHeight: 1.5 }}>
                  {selectedMood === 'anxious' || selectedMood === 'stressed'
                    ? 'Exam stress detected. Take a 15-minute hydration break. Campus peer counselors are available offline today.'
                    : 'Great momentum! Remember to maintain 7 hours of sleep during hostel quiet hours.'}
                </div>
              </div>
            </div>

            {/* Counseling Appointment Scheduler */}
            <div style={{ backgroundColor: tokens.canvas, borderRadius: 20, padding: 22, border: `1px solid ${tokens.rule}` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: tokens.text, marginBottom: 4 }}>
                Confidential Student Counseling Slot
              </div>
              <div style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
                1-on-1 private session with certified university psychologists. Completely confidential.
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: tokens.text2, marginBottom: 8 }}>AVAILABLE TIME SLOTS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['Today · 4:30 PM (Dr. Priya Nair)', 'Tomorrow · 11:00 AM (Prof. R. Varma)', 'Friday · 3:00 PM (Dr. Priya Nair)'].map((slot) => {
                    const active = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: 10,
                          backgroundColor: active ? tokens.surface3 : tokens.surface,
                          border: `1.5px solid ${active ? tokens.action : tokens.ruleSoft}`,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: tokens.text }}>{slot}</span>
                        {active && <CheckCircle2 size={16} color={tokens.action} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {counselingBooked ? (
                <div style={{ backgroundColor: tokens.surface3, borderRadius: 12, padding: 14, textAlign: 'center', border: `1px solid ${tokens.positive}` }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: tokens.positive }}>Slot Confirmed & Encrypted ✓</div>
                  <div style={{ fontSize: 11, color: tokens.text2, marginTop: 4 }}>Location: Health Centre Room 204</div>
                </div>
              ) : (
                <button
                  onClick={() => setCounselingBooked(true)}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: 12,
                    backgroundColor: tokens.action,
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 13.5,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Confirm Confidential Booking
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ─── MODULE 3: OFFLINE VERIFIABLE DIGITAL HEALTH PASSPORT ──────────── */}
      {activeSubTab === 'passport' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            
            {/* Smart Health Card Preview */}
            <div style={{ backgroundColor: tokens.ink, color: '#ffffff', borderRadius: 24, padding: 26, position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: '#b1a6f6', fontFamily: typography.fontMono }}>
                    NATIONAL HEALTH AUTHORITY · ABDM HIU
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>STUDENT VERIFIABLE HEALTH PASSPORT</div>
                </div>
                <Shield size={32} color="#00ffaa" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{student.fullName}</div>
                  <div style={{ fontSize: 12, color: '#d8d8e3', fontFamily: typography.fontMono }}>
                    ROLL: {student.rollNumber || 'CS2026-ARJUN-01'}
                  </div>
                </div>
                <div style={{ padding: '6px 14px', borderRadius: 9999, backgroundColor: tokens.action, fontWeight: 800, fontSize: 14 }}>
                  {student.bloodGroup || 'B+ Rh Pos'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '14px 0', borderTop: '1px solid rgba(255, 255, 255, 0.2)', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#9494a9' }}>ABHA ADDRESS</div>
                  <div style={{ fontSize: 12, fontWeight: 700, fontFamily: typography.fontMono }}>{student.abhaAddress || 'arjun.mehta@abdm'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9494a9' }}>EMERGENCY CONTACT</div>
                  <div style={{ fontSize: 12, fontWeight: 700, fontFamily: typography.fontMono }}>+91 98111 22334</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 10, color: '#00ffaa', fontWeight: 800, fontFamily: typography.fontMono }}>
                  VERIFIED BY NMC & UNIVERSITY DEAN ✓
                </div>
                <button
                  onClick={() => alert('Exporting PKI-signed PDF and Apple/Google Wallet Pass...')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 9999,
                    backgroundColor: '#ffffff',
                    color: tokens.ink,
                    fontWeight: 800,
                    fontSize: 12,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Download size={14} />
                  <span>Save to Wallet / PDF</span>
                </button>
              </div>
            </div>

            {/* Offline QR Verification Scanner Info */}
            <div style={{ backgroundColor: tokens.canvas, borderRadius: 20, padding: 22, border: `1px solid ${tokens.rule}`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ padding: 16, backgroundColor: '#ffffff', borderRadius: 20, marginBottom: 16, border: `1px solid ${tokens.rule}` }}>
                <QrCode size={120} color={tokens.action} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: tokens.text, marginBottom: 4 }}>
                Offline Verifiable Cryptographic QR Code
              </div>
              <div style={{ fontSize: 12, color: tokens.text2, maxWidth: 300, lineHeight: 1.5 }}>
                Hostel wardens and hospital ER staff can scan this offline without internet to view emergency blood type and allergy profiles instantly.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODULE 4: HOSTEL MESS NUTRITION & ALLERGEN TRACKER ──────────── */}
      {activeSubTab === 'nutrition' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            
            {/* Today's Mess Menu */}
            <div style={{ backgroundColor: tokens.canvas, borderRadius: 20, padding: 22, border: `1px solid ${tokens.rule}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: tokens.text }}>Hostel Mess Menu & Macro Breakdown</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['breakfast', 'lunch', 'dinner'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedMeal(m as any)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: selectedMeal === m ? tokens.action : tokens.surface2,
                        color: selectedMeal === m ? '#ffffff' : tokens.text2,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ backgroundColor: tokens.surface, borderRadius: 16, padding: 18, border: `1px solid ${tokens.ruleSoft}`, marginBottom: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: tokens.text, marginBottom: 8 }}>
                  {selectedMeal === 'lunch'
                    ? 'Paneer Butter Masala, Yellow Dal Tadka, Brown Rice, Chapati & Cucumber Salad'
                    : selectedMeal === 'breakfast'
                    ? 'Idli, Medu Vada, Sambar & Fresh Coconut Chutney'
                    : 'Chapati, Mix Veg Curry, Moong Dal & Curd'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, textAlign: 'center', padding: '12px 0', borderTop: `1px solid ${tokens.ruleSoft}` }}>
                  <div>
                    <div style={{ fontSize: 10, color: tokens.text2 }}>CALORIES</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: tokens.text }}>640 kcal</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: tokens.text2 }}>PROTEIN</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: tokens.action }}>24g</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: tokens.text2 }}>IRON</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: tokens.positive }}>4.2mg</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: tokens.text2 }}>CARBS</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: tokens.text }}>78g</div>
                  </div>
                </div>
              </div>

              {/* Allergen Warning Banner */}
              <div style={{ backgroundColor: tokens.surface3, borderRadius: 14, padding: 14, border: `1px solid ${tokens.veil}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <AlertTriangle size={20} color={tokens.action} style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: tokens.text, lineHeight: 1.4 }}>
                  <strong>Personal Allergen Match:</strong> Contains Dairy (Curd & Paneer). Safe for your Penicillin/Sulfa allergy.
                </div>
              </div>
            </div>

            {/* Mess Nutritional Goals */}
            <div style={{ backgroundColor: tokens.canvas, borderRadius: 20, padding: 22, border: `1px solid ${tokens.rule}` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: tokens.text, marginBottom: 12 }}>
                Campus Anemia & Micronutrient Tracker
              </div>
              <div style={{ fontSize: 12, color: tokens.text2, lineHeight: 1.5, marginBottom: 16 }}>
                Automated recommendation engine aligning mess menu intake with CBC Hemoglobin test results (`14.2 g/dL`).
              </div>

              <div style={{ backgroundColor: tokens.surface, borderRadius: 14, padding: 16, border: `1px solid ${tokens.ruleSoft}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, fontWeight: 700 }}>
                  <span>Daily Iron Intake Goal</span>
                  <span style={{ color: tokens.positive }}>85% Achieved</span>
                </div>
                <div style={{ width: '100%', height: 8, borderRadius: 4, backgroundColor: tokens.surface2, overflow: 'hidden' }}>
                  <div style={{ width: '85%', height: '100%', backgroundColor: tokens.positive }} />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODULE 5: INTER-HOSTEL HEALTH & FITNESS GAMIFICATION LEADERBOARD ─── */}
      {activeSubTab === 'leaderboard' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
            
            {/* Hostel Standings */}
            <div style={{ backgroundColor: tokens.canvas, borderRadius: 20, padding: 22, border: `1px solid ${tokens.rule}` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: tokens.text, marginBottom: 4 }}>
                Inter-Hostel Campus Health Cup Standings
              </div>
              <div style={{ fontSize: 12, color: tokens.text2, marginBottom: 16 }}>
                Ranked by health camp attendance rates, average daily steps, and vital screenings.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { rank: 1, name: 'Hostel Block A (Men)', points: '14,280 pts', campDone: '94%', icon: '🥇' },
                  { rank: 2, name: 'Girls Hostel 1 (G-1)', points: '13,950 pts', campDone: '91%', icon: '🥈' },
                  { rank: 3, name: 'PG & Research Scholars Block', points: '12,410 pts', campDone: '88%', icon: '🥉' },
                  { rank: 4, name: 'Hostel Block B (Men)', points: '11,200 pts', campDone: '82%', icon: '4️⃣' },
                ].map((h) => (
                  <div
                    key={h.rank}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: 14,
                      backgroundColor: h.rank === 1 ? tokens.surface3 : tokens.surface,
                      border: `1.5px solid ${h.rank === 1 ? tokens.action : tokens.ruleSoft}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 18 }}>{h.icon}</span>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: tokens.text }}>{h.name}</div>
                        <div style={{ fontSize: 11, color: tokens.text2, fontFamily: typography.fontMono }}>
                          Health Camp Completed: {h.campDone}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono }}>
                      {h.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hostel Reward Perk Unlock */}
            <div style={{ backgroundColor: tokens.canvas, borderRadius: 20, padding: 22, border: `1px solid ${tokens.rule}` }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: tokens.text, marginBottom: 12 }}>
                Hostel Wellness Perks Unlocked
              </div>
              
              <div style={{ backgroundColor: tokens.surface, borderRadius: 16, padding: 18, border: `1px solid ${tokens.ruleSoft}`, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: tokens.positive, marginBottom: 4 }}>
                  🎁 Free Fresh Fruit Juice Bar Voucher
                </div>
                <div style={{ fontSize: 12, color: tokens.text2, lineHeight: 1.5 }}>
                  Unlocked for Hostels exceeding 90% Health Camp participation. Show code `CAMPUS-FRUIT-2026` at Campus Canteen.
                </div>
              </div>

              <div style={{ backgroundColor: tokens.surface, borderRadius: 16, padding: 18, border: `1px solid ${tokens.ruleSoft}` }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: tokens.action, marginBottom: 4 }}>
                  🏋️ 24/7 Hostel Gym Extended Access
                </div>
                <div style={{ fontSize: 12, color: tokens.text2, lineHeight: 1.5 }}>
                  Granted to Block A & Girls Hostel 1 for winning top step challenge rankings this month.
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export const HostelHealthSuite: React.FC = observer(HostelHealthSuiteUnwrapped);
