import React, { useState } from 'react';
import { useTheme } from '../../theme/theme';
import {
  ShieldCheck,
  Building2,
  Users,
  Server,
  KeyRound,
  ShieldAlert,
  Clock,
  UserCheck,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  X,
  Lock,
  Eye,
  FileText,
  Activity,
} from 'lucide-react';
import { StudentKareLogo } from '../../components/StudentKareLogo';
import { ComprehensiveHealthcareDirectory } from '../../components/ComprehensiveHealthcareDirectory';
import { AgenticRAGEngineConsole } from '../../components/AgenticRAGEngineConsole';
import {
  BreakGlassSession,
  BreakGlassReason,
  SensitiveCategory,
  AuditEntry,
  formatKAnonymityCount,
} from '../../types/admin';
import { assertRule } from '../../ai/constitution';

interface SuperAdminDashboardProps {
  onLogout: () => void;
  onSwitchRole: (role: 'student' | 'admin' | 'vendor') => void;
}

export const SuperAdminDashboardScreen: React.FC<SuperAdminDashboardProps> = ({
  onLogout,
  onSwitchRole,
}) => {
  const { tokens, typography } = useTheme();

  // Break-Glass Access State
  const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);
  const [targetStudentId, setTargetStudentId] = useState('STU-2026-4410');
  const [reasonCategory, setReasonCategory] = useState<BreakGlassReason>('SAFETY_ESCALATION');
  const [reasonText, setReasonText] = useState('');
  const [dualApproverName, setDualApproverName] = useState('Dr. Vikram Sen (Co-Admin)');
  const [sensitiveCategory, setSensitiveCategory] = useState<SensitiveCategory>('NONE');
  const [restrictedPoolApprover, setRestrictedPoolApprover] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<('LAB' | 'PRESCRIPTION' | 'VACCINE' | 'CAMP_REPORT' | 'DISCHARGE_SUMMARY')[]>([
    'LAB',
    'CAMP_REPORT',
  ]);
  const [validationError, setValidationError] = useState('');

  // Active Break-Glass Sessions & Append-Only Audit Log
  const [activeSessions, setActiveSessions] = useState<BreakGlassSession[]>([
    {
      id: 'bg-sess-9901',
      studentId: 'STU-2026-9812',
      requestedByAdminId: 'ADM-001',
      requestedByAdminName: 'Super Admin (You)',
      reasonCategory: 'SAFETY_ESCALATION',
      reasonText: 'Campus Health Warden flagged acute high-risk pyrexia cluster escalation.',
      scope: ['LAB', 'CAMP_REPORT'],
      dualApproverAdminId: 'ADM-004',
      dualApproverAdminName: 'Dr. Radhika Rao (Chief Medical Officer)',
      sensitiveCategory: 'NONE',
      createdAt: new Date(Date.now() - 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      expiresAt: new Date(Date.now() + 45 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      active: true,
      auditEntryId: 'audit-entry-8812',
    },
  ]);

  const [auditLog, setAuditLog] = useState<AuditEntry[]>([
    {
      id: 'audit-entry-8812',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      actorId: 'ADM-001',
      actorName: 'Super Admin (You)',
      actorType: 'HUMAN_ADMIN',
      action: 'BREAK_GLASS_SESSION_INITIATED',
      ruleId: 'Rule-K8',
      institutionId: 'inst_iith_01',
      resourceType: 'STUDENT_HEALTH_RECORD',
      resourceId: 'STU-2026-9812',
      details: {
        reasonCategory: 'SAFETY_ESCALATION',
        dualApprover: 'Dr. Radhika Rao (Chief Medical Officer)',
        scope: ['LAB', 'CAMP_REPORT'],
        timeboxMinutes: 60,
        studentNotified: true,
      },
    },
  ]);

  // Aggregate Campus Cohorts (Subject to K-Anonymity Floor = 20)
  const campusCohorts = [
    { name: 'Osmania University · Main Campus', count: 38400, healthClearanceRate: '98.4%', status: 'HEALTHY' },
    { name: 'IIT Hyderabad · Kandi Campus', count: 12200, healthClearanceRate: '99.1%', status: 'HEALTHY' },
    { name: 'BITS Pilani · Hyderabad Campus', count: 14800, healthClearanceRate: '97.8%', status: 'HEALTHY' },
    { name: 'AIIMS Campus Clinic Pod 3', count: 14, healthClearanceRate: '100%', status: 'MONITORED' },
    { name: 'University of Hyderabad Pod 4', count: 8, healthClearanceRate: '87.5%', status: 'MONITORED' },
  ];

  const handleToggleScope = (scope: 'LAB' | 'PRESCRIPTION' | 'VACCINE' | 'CAMP_REPORT' | 'DISCHARGE_SUMMARY') => {
    if (selectedScopes.includes(scope)) {
      setSelectedScopes(selectedScopes.filter((s) => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
  };

  const handleInitiateBreakGlass = () => {
    assertRule('Rule-K8');
    setValidationError('');

    if (!targetStudentId.trim()) {
      setValidationError('Please specify a target Student ID.');
      return;
    }

    if (!reasonText.trim() || reasonText.trim().length < 15) {
      setValidationError('Stated reason must be at least 15 characters long detailing official justification.');
      return;
    }

    if (!dualApproverName.trim()) {
      setValidationError('Dual authorization required: Second named admin approver must sign off.');
      return;
    }

    if (sensitiveCategory !== 'NONE' && !restrictedPoolApprover.trim()) {
      setValidationError('Rule-K8 Compliance: Sensitive category access requires a named approver from the restricted specialist pool.');
      return;
    }

    if (selectedScopes.length === 0) {
      setValidationError('Must select at least one limited record scope.');
      return;
    }

    const auditId = `audit-entry-${Date.now()}`;
    const newAuditEntry: AuditEntry = {
      id: auditId,
      timestamp: new Date().toISOString(),
      actorId: 'ADM-001',
      actorName: 'Super Admin (You)',
      actorType: 'HUMAN_ADMIN',
      action: 'BREAK_GLASS_SESSION_INITIATED',
      ruleId: 'Rule-K8',
      institutionId: 'inst_osmania_01',
      resourceType: 'STUDENT_HEALTH_RECORD',
      resourceId: targetStudentId,
      details: {
        reasonCategory,
        reasonText,
        dualApprover: dualApproverName,
        sensitiveCategory,
        sensitiveCategoryApprover: sensitiveCategory !== 'NONE' ? restrictedPoolApprover : undefined,
        scope: selectedScopes,
        timeboxMinutes: 60,
        studentNotified: true,
      },
    };

    const newSession: BreakGlassSession = {
      id: `bg-sess-${Date.now().toString().slice(-4)}`,
      studentId: targetStudentId,
      requestedByAdminId: 'ADM-001',
      requestedByAdminName: 'Super Admin (You)',
      reasonCategory,
      reasonText,
      scope: selectedScopes,
      dualApproverAdminId: 'ADM-004',
      dualApproverAdminName: dualApproverName,
      sensitiveCategory,
      sensitiveCategoryApproverId: sensitiveCategory !== 'NONE' ? restrictedPoolApprover : undefined,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      expiresAt: new Date(Date.now() + 60 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      active: true,
      auditEntryId: auditId,
    };

    // Pre-rendering Audit Entry logging
    setAuditLog((prev) => [newAuditEntry, ...prev]);
    setActiveSessions((prev) => [newSession, ...prev]);
    setShowBreakGlassModal(false);
    setReasonText('');
    setValidationError('');
  };

  const handleRevokeSession = (sessionId: string) => {
    setActiveSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, active: false } : s))
    );
    const auditId = `audit-entry-${Date.now()}`;
    setAuditLog((prev) => [
      {
        id: auditId,
        timestamp: new Date().toISOString(),
        actorId: 'ADM-001',
        actorName: 'Super Admin (You)',
        actorType: 'HUMAN_ADMIN',
        action: 'BREAK_GLASS_SESSION_REVOKED',
        ruleId: 'Rule-K8',
        resourceType: 'STUDENT_HEALTH_RECORD',
        resourceId: sessionId,
        details: { sessionId, status: 'REVOKED' },
      },
      ...prev,
    ]);
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: tokens.canvas, padding: '28px 40px' }}>
      
      {/* Top Admin Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <StudentKareLogo size={34} showStrapline={true} straplineText="SUPER ADMIN CONTROL PLANE" />
          <span style={{ fontSize: 11, fontFamily: typography.fontMono, backgroundColor: tokens.positiveBg, color: tokens.positive, padding: '4px 12px', borderRadius: 9999, fontWeight: 800 }}>
            ● AGGREGATE TELEMETRY & BREAK-GLASS CONTROL
          </span>
        </div>

        {/* Role Switcher & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => onSwitchRole('student')}
            aria-label="Switch to Student Portal"
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
            aria-label="Switch to Vendor Console"
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
            aria-label="Sign Out of Super Admin Console"
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
              National Campus Aggregate Telemetry & Compliance Control
            </div>
            <div style={{ fontSize: 13, color: tokens.text2, marginTop: 4 }}>
              Aggregate health telemetry monitoring across 42 Indian Universities, 128,450 Verified Students, and ABDM M1-M3 Vaults.
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
              100% Aadhaar/Roster Evidenced
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

      {/* ─── SA-0.2 DUAL-AUTHORIZED BREAK-GLASS EMERGENCY ACCESS CONTROL ─── */}
      <div style={{ backgroundColor: tokens.surface, borderRadius: 24, border: `1.5px solid ${tokens.emergency}`, padding: 28, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <KeyRound size={22} color={tokens.emergency} />
              <div style={{ fontSize: 18, fontWeight: 900, color: tokens.text }}>
                Emergency Break-Glass Access Protocol (Rule K8 / DPDP Act)
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: tokens.text2, marginTop: 4 }}>
              Break-glass provides strictly time-boxed (60m max), dual-authorized access to single identified student records for safety emergencies. All requests append an immutable pre-rendering audit entry and notify the student consent ledger.
            </div>
          </div>

          <button
            onClick={() => setShowBreakGlassModal(true)}
            aria-label="Initiate Emergency Break-Glass Access"
            style={{
              backgroundColor: tokens.emergency,
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              padding: '10px 20px',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(230, 57, 70, 0.3)',
            }}
          >
            <ShieldAlert size={16} /> Request Break-Glass Access
          </button>
        </div>

        {/* Active Break-Glass Sessions Table */}
        <div style={{ fontSize: 12, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono, marginBottom: 10 }}>
          ACTIVE & AUDITED BREAK-GLASS SESSIONS
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activeSessions.map((sess) => (
            <div
              key={sess.id}
              style={{
                backgroundColor: sess.active ? tokens.emergencyBg : tokens.surface2,
                borderColor: sess.active ? tokens.emergency : tokens.ruleSoft,
                borderWidth: 1,
                borderRadius: 14,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Lock size={20} color={sess.active ? tokens.emergency : tokens.text3} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: tokens.text }}>
                      Student ID: {sess.studentId}
                    </span>
                    <span style={{ fontSize: 10, fontFamily: typography.fontMono, backgroundColor: sess.active ? tokens.emergency : tokens.veil, color: '#ffffff', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                      {sess.active ? 'SESSION ACTIVE (60m MAX)' : 'REVOKED / EXPIRED'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: tokens.text2, marginTop: 4 }}>
                    <b>Reason:</b> {sess.reasonCategory} — "{sess.reasonText}"<br />
                    <b>Authorised by:</b> {sess.requestedByAdminName} + <b>Dual Approver:</b> {sess.dualApproverAdminName}
                    {sess.sensitiveCategory !== 'NONE' && (
                      <span style={{ color: tokens.emergency, fontWeight: 700 }}>
                        {' '}· Sensitive Category ({sess.sensitiveCategory}) Approved by {sess.sensitiveCategoryApproverId}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: tokens.text3, fontFamily: typography.fontMono, marginTop: 4 }}>
                    Scope: [{sess.scope.join(', ')}] · Initiated: {sess.createdAt} · Auto-expires: {sess.expiresAt} · Audit ID: {sess.auditEntryId}
                  </div>
                </div>
              </div>

              {sess.active && (
                <button
                  onClick={() => handleRevokeSession(sess.id)}
                  aria-label={`Revoke break glass session ${sess.id}`}
                  style={{
                    backgroundColor: tokens.surface,
                    color: tokens.emergency,
                    border: `1px solid ${tokens.emergency}`,
                    borderRadius: 10,
                    padding: '8px 14px',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Revoke Access Now
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── SA-0.3 AGGREGATE-FIRST CAMPUS COHORT TELEMETRY (K-ANONYMITY >= 20) ─── */}
      <div style={{ backgroundColor: tokens.surface, borderRadius: 24, border: `1.5px solid ${tokens.rule}`, padding: 28, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: tokens.text }}>
              Campus Health Telemetry & Cohort Aggregates (Rule K-Anonymity Floor = 20)
            </div>
            <div style={{ fontSize: 12.5, color: tokens.text2, marginTop: 2 }}>
              Aggregated cohort counts across partner university health pods. Any cohort segment smaller than 20 students is automatically suppressed to prevent identity leakage.
            </div>
          </div>
          <span style={{ fontSize: 11, fontFamily: typography.fontMono, backgroundColor: tokens.surface3, color: tokens.action, padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>
            K-ANONYMITY FLOOR = 20 ENFORCED
          </span>
        </div>

        {/* Campus Cohort Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campusCohorts.map((cohort, idx) => {
            const formattedCount = formatKAnonymityCount(cohort.count);
            const isSuppressed = cohort.count < 20;

            return (
              <div
                key={idx}
                style={{
                  backgroundColor: tokens.canvas,
                  borderRadius: 16,
                  padding: 18,
                  border: `1px solid ${tokens.ruleSoft}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isSuppressed ? tokens.attentionBg : tokens.surface3, color: isSuppressed ? tokens.attention : tokens.action, fontWeight: 900, fontSize: 14, display: 'grid', placeItems: 'center' }}>
                    <Building2 size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: tokens.text }}>{cohort.name}</div>
                    <div style={{ fontSize: 12, color: tokens.text2, marginTop: 2 }}>
                      Annual Clearance Completion: <b>{cohort.healthClearanceRate}</b>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: isSuppressed ? tokens.attention : tokens.text, fontFamily: typography.fontMono }}>
                    {formattedCount}
                  </div>
                  <div style={{ fontSize: 11, color: tokens.text3, marginTop: 2 }}>
                    {isSuppressed ? '⚠️ Sub-20 Cohort Suppressed' : 'Enrolled Student Cohort'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── SUPER ADMIN TELECONSULT & CARE CONTROL PANEL ─── */}
      <div style={{ marginBottom: 28 }}>
        <ComprehensiveHealthcareDirectory />
      </div>

      {/* ─── SUPER ADMIN AGENTIC AI & RAG PIPELINE ENGINE CONSOLE ─── */}
      <div style={{ marginBottom: 28 }}>
        <AgenticRAGEngineConsole />
      </div>

      {/* ─── BREAK-GLASS REQUEST MODAL ─── */}
      {showBreakGlassModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(6, 8, 36, 0.75)',
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
              maxWidth: 580,
              backgroundColor: tokens.surface,
              borderRadius: 24,
              border: `2px solid ${tokens.emergency}`,
              padding: 32,
              boxShadow: '0 20px 60px rgba(230, 57, 70, 0.25)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <button
              onClick={() => setShowBreakGlassModal(false)}
              aria-label="Close Break-Glass Modal"
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <ShieldAlert size={26} color={tokens.emergency} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: tokens.emergency }}>
                  Emergency Break-Glass Record Access
                </div>
                <div style={{ fontSize: 12, color: tokens.text2 }}>
                  DPDP Data Principal & Rule-K8 Governed Emergency Procedure
                </div>
              </div>
            </div>

            {validationError && (
              <div style={{ backgroundColor: tokens.emergencyBg, borderColor: tokens.emergency, borderWidth: 1, borderStyle: 'solid', borderRadius: 10, padding: 12, marginBottom: 16, color: tokens.emergency, fontSize: 12.5, fontWeight: 700 }}>
                ⚠️ {validationError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>
                  TARGET STUDENT IDENTIFIER / UUID
                </label>
                <input
                  type="text"
                  value={targetStudentId}
                  onChange={(e) => setTargetStudentId(e.target.value)}
                  placeholder="e.g. STU-2026-4410"
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 10,
                    border: `1px solid ${tokens.rule}`,
                    backgroundColor: tokens.surface2,
                    color: tokens.text,
                    fontSize: 13,
                    fontFamily: typography.fontMono,
                    marginTop: 4,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>
                  STATED REASON CATEGORY
                </label>
                <select
                  value={reasonCategory}
                  onChange={(e) => setReasonCategory(e.target.value as BreakGlassReason)}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 10,
                    border: `1px solid ${tokens.rule}`,
                    backgroundColor: tokens.surface2,
                    color: tokens.text,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  <option value="SAFETY_ESCALATION">SAFETY_ESCALATION (Campus Emergency / Triage)</option>
                  <option value="DPDP_DATA_PRINCIPAL_REQUEST">DPDP_DATA_PRINCIPAL_REQUEST (Data Access Right)</option>
                  <option value="LEGAL_ORDER">LEGAL_ORDER (Magistrate / Statutory Notice)</option>
                  <option value="INCIDENT_INVESTIGATION">INCIDENT_INVESTIGATION (Adverse Reaction Review)</option>
                  <option value="STUDENT_SUPPORT_TICKET">STUDENT_SUPPORT_TICKET (Student Initiated Escalation)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>
                  REASON JUSTIFICATION (MIN 15 CHARACTERS)
                </label>
                <textarea
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="State exact official reason for breaking glass..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 10,
                    border: `1px solid ${tokens.rule}`,
                    backgroundColor: tokens.surface2,
                    color: tokens.text,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>
                  DUAL AUTHORISATION (SECOND NAMED ADMIN APPROVER)
                </label>
                <input
                  type="text"
                  value={dualApproverName}
                  onChange={(e) => setDualApproverName(e.target.value)}
                  placeholder="e.g. Dr. Radhika Rao (Chief Medical Officer)"
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 10,
                    border: `1px solid ${tokens.rule}`,
                    backgroundColor: tokens.surface2,
                    color: tokens.text,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>
                  RULE-K8 SENSITIVE CATEGORY SELECTOR
                </label>
                <select
                  value={sensitiveCategory}
                  onChange={(e) => setSensitiveCategory(e.target.value as SensitiveCategory)}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 10,
                    border: `1px solid ${tokens.rule}`,
                    backgroundColor: tokens.surface2,
                    color: tokens.text,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  <option value="NONE">NONE (General Health / Camp Vitals)</option>
                  <option value="MENTAL_HEALTH">MENTAL_HEALTH (Requires Restricted Specialist Pool Approver)</option>
                  <option value="REPRODUCTIVE">REPRODUCTIVE (Requires Restricted Specialist Pool Approver)</option>
                  <option value="HIV">HIV (Requires Restricted Specialist Pool Approver)</option>
                </select>
              </div>

              {sensitiveCategory !== 'NONE' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: tokens.emergency, fontFamily: typography.fontMono }}>
                    RESTRICTED POOL SPECIALIST APPROVER (RULE K8 REQUIREMENT)
                  </label>
                  <input
                    type="text"
                    value={restrictedPoolApprover}
                    onChange={(e) => setRestrictedPoolApprover(e.target.value)}
                    placeholder="e.g. Dr. K. S. Iyengar (Restricted Pool Approver #8802)"
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 10,
                      border: `1px solid ${tokens.emergency}`,
                      backgroundColor: tokens.emergencyBg,
                      color: tokens.text,
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono, marginBottom: 6, display: 'block' }}>
                  RECORD TYPE SCOPE LIMITING (NO BULK EXPORTS)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(['LAB', 'PRESCRIPTION', 'VACCINE', 'CAMP_REPORT', 'DISCHARGE_SUMMARY'] as const).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => handleToggleScope(sc)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 800,
                        backgroundColor: selectedScopes.includes(sc) ? tokens.action : tokens.surface2,
                        color: selectedScopes.includes(sc) ? '#ffffff' : tokens.text2,
                        border: `1px solid ${selectedScopes.includes(sc) ? tokens.action : tokens.rule}`,
                        cursor: 'pointer',
                      }}
                    >
                      {selectedScopes.includes(sc) ? '✓ ' : '+ '} {sc}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowBreakGlassModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: tokens.surface2,
                  color: tokens.text,
                  border: `1px solid ${tokens.ruleSoft}`,
                  borderRadius: 12,
                  padding: 12,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleInitiateBreakGlass}
                style={{
                  flex: 1,
                  backgroundColor: tokens.emergency,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 12,
                  padding: 12,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(230, 57, 70, 0.3)',
                }}
              >
                Authorise & Log Break-Glass
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
