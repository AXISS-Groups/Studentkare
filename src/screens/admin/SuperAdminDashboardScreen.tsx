import React, { useState } from 'react';
import { useTheme } from '../../theme/theme';
import { mockStudents } from '../../data/mockData';
import {
  ShieldCheck,
  Building2,
  Users,
  Server,
  FileCheck,
  Search,
  Activity,
  Heart,
  Droplet,
  Thermometer,
  Footprints,
  X,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { StudentKareLogo } from '../../components/StudentKareLogo';
import { ComprehensiveHealthcareDirectory } from '../../components/ComprehensiveHealthcareDirectory';
import { AgenticRAGEngineConsole } from '../../components/AgenticRAGEngineConsole';

interface SuperAdminDashboardProps {
  onLogout: () => void;
  onSwitchRole: (role: 'student' | 'admin' | 'vendor') => void;
}

export const SuperAdminDashboardScreen: React.FC<SuperAdminDashboardProps> = ({
  onLogout,
  onSwitchRole,
}) => {
  const { tokens, typography } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const filteredStudentList = mockStudents.filter(
    (s) =>
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.institutionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.abhaAddress?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: tokens.canvas, padding: '28px 40px' }}>
      
      {/* Top Admin Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <StudentKareLogo size={34} showStrapline={true} straplineText="SUPER ADMIN CONTROL" />
          <span style={{ fontSize: 11, fontFamily: typography.fontMono, backgroundColor: tokens.positiveBg, color: tokens.positive, padding: '4px 12px', borderRadius: 9999, fontWeight: 800 }}>
            ● NATIONAL GATEWAY ONLINE
          </span>
        </div>

        {/* Role Switcher & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => onSwitchRole('student')}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              backgroundColor: tokens.surface3,
              color: tokens.action,
              border: `1px solid ${tokens.veil}`,
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            🎓 Switch to Student Portal
          </button>
          <button
            onClick={() => onSwitchRole('vendor')}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              backgroundColor: tokens.surface3,
              color: tokens.action,
              border: `1px solid ${tokens.veil}`,
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            🏬 Switch to Vendor Console
          </button>
          <button
            onClick={onLogout}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              backgroundColor: tokens.surface2,
              color: tokens.text,
              border: `1px solid ${tokens.ruleSoft}`,
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Hero Control Room Card */}
      <div
        style={{
          backgroundColor: tokens.surface,
          borderRadius: 24,
          border: `1.5px solid ${tokens.rule}`,
          padding: 28,
          marginBottom: 28,
          boxShadow: '0 10px 32px rgba(83, 80, 204, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: tokens.text, letterSpacing: -0.6 }}>
              National Campus Ecosystem & Student Health Telemetry Roster
            </div>
            <div style={{ fontSize: 13, color: tokens.text2, marginTop: 4 }}>
              Real-time telemetry monitoring across 42 Indian Universities, 128,450 Verified Students, and ABDM M1-M3 Vaults.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 12, fontFamily: typography.fontMono, backgroundColor: tokens.surface2, padding: '8px 14px', borderRadius: 10, border: `1px solid ${tokens.ruleSoft}`, color: tokens.text, fontWeight: 800 }}>
              DPDP ACT 2023 COMPLIANT ✓
            </span>
          </div>
        </div>

        {/* Top 4 KPI Bento Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          
          <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 20, border: `1px solid ${tokens.ruleSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>ONBOARDED CAMPUSES</span>
              <Building2 size={20} color={tokens.action} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: tokens.text, fontFamily: typography.fontMono }}>
              42 <span style={{ fontSize: 14, color: tokens.positive, fontWeight: 700 }}>+4 this month</span>
            </div>
            <div style={{ fontSize: 11, color: tokens.text2, marginTop: 6 }}>
              Osmania, IIT Hyderabad, BITS Pilani, AIIMS
            </div>
          </div>

          <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 20, border: `1px solid ${tokens.ruleSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>TOTAL VERIFIED STUDENTS</span>
              <Users size={20} color={tokens.action} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: tokens.text, fontFamily: typography.fontMono }}>
              128,450
            </div>
            <div style={{ fontSize: 11, color: tokens.positive, marginTop: 6, fontWeight: 700 }}>
              100% Aadhaar/Student ID Verified
            </div>
          </div>

          <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 20, border: `1px solid ${tokens.ruleSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>ABDM FHIR TOKENS SYNCED</span>
              <Server size={20} color={tokens.positive} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: tokens.text, fontFamily: typography.fontMono }}>
              412,980
            </div>
            <div style={{ fontSize: 11, color: tokens.text2, marginTop: 6 }}>
              Encrypted AES-256 ABDM M1-M3 Vaults
            </div>
          </div>

          <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 20, border: `1px solid ${tokens.ruleSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>NMC DOCTOR CLINICIANS</span>
              <ShieldCheck size={20} color={tokens.action} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: tokens.text, fontFamily: typography.fontMono }}>
              164
            </div>
            <div style={{ fontSize: 11, color: tokens.positive, marginTop: 6, fontWeight: 700 }}>
              All Council Registration Verified
            </div>
          </div>

        </div>
      </div>

      {/* ─── STUDENT METRICS & TELEMETRY ROSTER ─────────────────────────── */}
      <div style={{ backgroundColor: tokens.surface, borderRadius: 24, border: `1.5px solid ${tokens.rule}`, padding: 28, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: tokens.text }}>
              Verified Student Roster & Live Vitals Matrix
            </div>
            <div style={{ fontSize: 12.5, color: tokens.text2, marginTop: 2 }}>
              Inspect individual student health profiles, ABHA addresses, vitals history, and emergency contacts.
            </div>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: 280 }}>
            <Search size={16} color={tokens.text3} style={{ position: 'absolute', left: 12, top: 12 }} />
            <input
              type="text"
              placeholder="Search student, ABHA, roll..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 12,
                border: `1px solid ${tokens.rule}`,
                backgroundColor: tokens.surface2,
                color: tokens.text,
                fontSize: 12.5,
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Student Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredStudentList.map((stu) => (
            <div
              key={stu.id}
              onClick={() => setSelectedStudent(stu)}
              style={{
                backgroundColor: tokens.canvas,
                borderRadius: 16,
                padding: 18,
                border: `1px solid ${tokens.ruleSoft}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'border-color 140ms ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: tokens.action, color: '#ffffff', fontWeight: 900, fontSize: 16, display: 'grid', placeItems: 'center' }}>
                  {stu.fullName.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: tokens.text }}>{stu.fullName}</div>
                  <div style={{ fontSize: 12, color: tokens.text2, fontFamily: typography.fontMono, marginTop: 2 }}>
                    {stu.university} · Roll: {stu.rollNumber}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono }}>
                    ABHA: {stu.abhaAddress}
                  </div>
                  <div style={{ fontSize: 11, color: tokens.text3, marginTop: 2 }}>
                    Blood Group: <b>{stu.bloodGroup}</b> · Age <b>{stu.age}</b>
                  </div>
                </div>

                <button
                  style={{
                    backgroundColor: tokens.surface3,
                    color: tokens.action,
                    border: `1px solid ${tokens.veil}`,
                    borderRadius: 10,
                    padding: '8px 14px',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  View Full Vitals →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── SUPER ADMIN TELECONSULT & CARE CONTROL PANEL (1,100+ Catalog Items & Loop Agents) ─── */}
      <div style={{ marginBottom: 28 }}>
        <ComprehensiveHealthcareDirectory />
      </div>

      {/* ─── SUPER ADMIN AGENTIC AI & RAG PIPELINE ENGINE CONSOLE ─── */}
      <div style={{ marginBottom: 28 }}>
        <AgenticRAGEngineConsole />
      </div>

      {/* Student Detailed Telemetry Inspector Modal */}
      {selectedStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(6, 8, 36, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 999990,
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 620,
              backgroundColor: tokens.surface,
              borderRadius: 24,
              border: `1.5px solid ${tokens.rule}`,
              padding: 32,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <button
              onClick={() => setSelectedStudent(null)}
              style={{
                position: 'absolute',
                right: 20,
                top: 20,
                background: tokens.surface2,
                border: `1px solid ${tokens.ruleSoft}`,
                borderRadius: '50%',
                width: 32,
                height: 32,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                color: tokens.text,
              }}
            >
              <X size={18} />
            </button>

            {/* Student Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: tokens.action, color: '#ffffff', fontWeight: 900, fontSize: 18, display: 'grid', placeItems: 'center' }}>
                {selectedStudent.fullName.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: tokens.text }}>{selectedStudent.fullName}</div>
                <div style={{ fontSize: 12, color: tokens.text2, fontFamily: typography.fontMono, marginTop: 2 }}>
                  {selectedStudent.university} · {selectedStudent.rollNumber}
                </div>
              </div>
            </div>

            {/* Vitals Matrix Bento Cards */}
            <div style={{ fontSize: 12, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono, marginBottom: 10 }}>
              LIVE BIOMETRIC TELEMETRY MATRIX
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
              <div style={{ backgroundColor: tokens.canvas, borderRadius: 14, padding: 12, border: `1px solid ${tokens.ruleSoft}` }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: tokens.text3 }}>HEART RATE</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: tokens.text, fontFamily: typography.fontMono, marginTop: 2 }}>74 BPM</div>
                <div style={{ fontSize: 10, color: tokens.positive, marginTop: 2 }}>Normal Sinus</div>
              </div>
              <div style={{ backgroundColor: tokens.canvas, borderRadius: 14, padding: 12, border: `1px solid ${tokens.ruleSoft}` }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: tokens.text3 }}>BLOOD PRESSURE</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: tokens.text, fontFamily: typography.fontMono, marginTop: 2 }}>118/76</div>
                <div style={{ fontSize: 10, color: tokens.positive, marginTop: 2 }}>mmHg</div>
              </div>
              <div style={{ backgroundColor: tokens.canvas, borderRadius: 14, padding: 12, border: `1px solid ${tokens.ruleSoft}` }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: tokens.text3 }}>SPO2 OXYGEN</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: tokens.text, fontFamily: typography.fontMono, marginTop: 2 }}>99%</div>
                <div style={{ fontSize: 10, color: tokens.positive, marginTop: 2 }}>Optimal</div>
              </div>
              <div style={{ backgroundColor: tokens.canvas, borderRadius: 14, padding: 12, border: `1px solid ${tokens.ruleSoft}` }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: tokens.text3 }}>STEPS TODAY</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: tokens.text, fontFamily: typography.fontMono, marginTop: 2 }}>6,420</div>
                <div style={{ fontSize: 10, color: tokens.positive, marginTop: 2 }}>4.8 km</div>
              </div>
            </div>

            {/* Medical History & Allergies */}
            <div style={{ backgroundColor: tokens.canvas, borderRadius: 16, padding: 16, border: `1px solid ${tokens.ruleSoft}`, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: tokens.emergency, fontFamily: typography.fontMono, marginBottom: 8 }}>
                EMERGENCY MEDICAL PROFILE
              </div>
              <div style={{ fontSize: 13, color: tokens.text2, lineHeight: 1.6 }}>
                <b>Blood Group:</b> {selectedStudent.bloodGroup}<br />
                <b>Known Allergies:</b> {selectedStudent.allergies.join(', ') || 'None'}<br />
                <b>Chronic Conditions:</b> {selectedStudent.chronicConditions.join(', ') || 'None'}<br />
                <b>Emergency Contact:</b> {selectedStudent.emergencyContactName} ({selectedStudent.emergencyContactPhone})
              </div>
            </div>

            <button
              onClick={() => setSelectedStudent(null)}
              style={{
                width: '100%',
                backgroundColor: tokens.action,
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: 12,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Close Telemetry Inspector
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
