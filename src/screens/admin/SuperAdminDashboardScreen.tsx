import { SpecialistAgentsMeshPanel } from '../../components/SpecialistAgentsMeshPanel';
import { RealtimeTelemetryStream } from '../../components/RealtimeTelemetryStream';
import { N8NWorkflowAutomationPanel } from '../../components/N8NWorkflowAutomationPanel';
import React, { useState } from 'react';
import { useTheme } from '../../theme/theme';
import {
  ShieldCheck,
  Building2,
  KeyRound,
  ShieldAlert,
  AlertTriangle,
  X,
  Lock,
  FileText,
  Activity,
  Radio,
} from 'lucide-react';
import { StudentKareLogo } from '../../components/StudentKareLogo';
import { AgenticRAGEngineConsole } from '../../components/AgenticRAGEngineConsole';
import {
  BreakGlassSession,
  BreakGlassReason,
  SensitiveCategory,
  AuditEntry,
  formatKAnonymityCount,
} from '../../types/admin';
import { assertRule } from '../../ai/constitution';
import { TenantManagementModule } from './TenantManagementModule';
import { RulesConsoleModule } from './RulesConsoleModule';
import { AuditExplorerModule } from './AuditExplorerModule';
import { DpdpConsentModule } from './DpdpConsentModule';
import { IncidentConsoleModule } from './IncidentConsoleModule';
import { ProviderRegistryOpsModule } from './ProviderRegistryOpsModule';
import { AiOfficeKillSwitchesModule } from './AiOfficeKillSwitchesModule';
import { IntegrationsSettingsModule } from './IntegrationsSettingsModule';
import { ConsoleIntro } from '../../components/interface/ConsoleIntro';
import { PageTransition } from '../../components/interface/PageTransition';

interface SuperAdminDashboardProps {
  onLogout: () => void;
  onSwitchRole: (role: 'student' | 'admin' | 'vendor') => void;
}

export const SuperAdminDashboardScreen: React.FC<SuperAdminDashboardProps> = ({
  onLogout,
  onSwitchRole,
}) => {
  const { tokens, typography } = useTheme();
  assertRule('Rule-K8');

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'TENANTS' | 'CONSTITUTION' | 'AUDIT' | 'DPDP_CONSENT' | 'INCIDENTS' | 'PROVIDER_REGISTRY' | 'AI_OFFICE' | 'INTEGRATIONS'
  >('OVERVIEW');

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

  const [, setAuditLog] = useState<AuditEntry[]>([
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

  // Aggregate Campus Cohorts (Strictly Enforced K-Anonymity Floor = 20)
  const campusCohorts = [
    { name: 'Osmania University · Main Campus', count: 38400, healthClearanceRate: '98.4%', status: 'HEALTHY' },
    { name: 'IIT Hyderabad · Kandi Campus', count: 12200, healthClearanceRate: '99.1%', status: 'HEALTHY' },
    { name: 'BITS Pilani · Hyderabad Campus', count: 14800, healthClearanceRate: '97.8%', status: 'HEALTHY' },
    { name: 'AIIMS Campus Clinic Pod 3', count: 24, healthClearanceRate: '100%', status: 'MONITORED' },
    { name: 'University of Hyderabad Pod 4', count: 28, healthClearanceRate: '87.5%', status: 'MONITORED' },
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
    <div className="care-console care-admin-console" style={{ width: '100%', minHeight: '100vh', backgroundColor: tokens.canvas, padding: '28px 40px' }}>
      
      {/* Top Admin Header */}
      <div className="care-console-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div className="care-console-brand" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <StudentKareLogo size={34} showStrapline={true} straplineText="SUPER ADMIN CONTROL PLANE" />
          <span style={{ fontSize: 11, fontFamily: typography.fontMono, backgroundColor: tokens.positiveBg, color: tokens.positive, padding: '4px 12px', borderRadius: 9999, fontWeight: 800 }}>
            ● AGGREGATE TELEMETRY & BREAK-GLASS CONTROL
          </span>
        </div>

        {/* Role Switcher & Controls */}
        <div className="care-console-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            Student Portal
          </button>
          <button
            onClick={() => onSwitchRole('vendor')}
            aria-label="Switch to Vendor Console"
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              backgroundColor: tokens.surface3,
              color: tokens.text2,
              border: `1px solid ${tokens.veil}`,
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Vendor Portal
          </button>
          <button
            onClick={onLogout}
            aria-label="Exit Console"
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              backgroundColor: tokens.emergencyBg,
              color: tokens.emergency,
              border: `1px solid ${tokens.emergency}`,
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Exit Console
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <ConsoleIntro title="A clearer view of campus care." description="Bring your institutions, service operations, and governance into one connected workspace." eyebrow="SUPER ADMIN · OPERATIONS & OVERSIGHT" />
      <nav className="care-console-tabs" aria-label="Super-admin sections" style={{ display: 'flex', borderBottom: `2px solid ${tokens.rule}`, marginBottom: 28, gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { id: 'OVERVIEW', label: 'Telemetry Overview', icon: Activity },
          { id: 'TENANTS', label: 'Tenants & Licensing (SA-1.1)', icon: Building2 },
          { id: 'CONSTITUTION', label: 'Rules & Drift Console (SA-1.2)', icon: ShieldCheck },
          { id: 'AUDIT', label: 'Audit Log Explorer (SA-1.3)', icon: FileText },
          { id: 'DPDP_CONSENT', label: 'DPDP & Rights Queue (SA-1.4)', icon: KeyRound },
          { id: 'INCIDENTS', label: 'Incident Console (SA-1.5)', icon: AlertTriangle },
          { id: 'PROVIDER_REGISTRY', label: 'Provider Registry (SA-1.6)', icon: Radio },
          { id: 'AI_OFFICE', label: 'AI Office & Kill Switches (SA-1.7)', icon: ShieldAlert },
          { id: 'INTEGRATIONS', label: 'Integrations & Secrets (SA-1.8)', icon: KeyRound },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                border: 'none',
                borderBottom: isActive ? `3px solid ${tokens.action}` : '3px solid transparent',
                backgroundColor: 'transparent',
                color: isActive ? tokens.action : tokens.text2,
                fontWeight: isActive ? 800 : 600,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} color={isActive ? tokens.action : tokens.text3} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <PageTransition key={activeTab} className="care-console-content">
      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div>
          <RealtimeTelemetryStream />
          {/* High-level Aggregate Metrics */}
          <div className="care-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 20, marginBottom: 28 }}>
            <div style={{ backgroundColor: tokens.surface, padding: 20, borderRadius: 16, border: `1px solid ${tokens.ruleSoft}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>
                TOTAL ENROLLED STUDENTS
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: tokens.text, marginTop: 4 }}>
                {formatKAnonymityCount(65440)}
              </div>
              <div style={{ fontSize: 11, color: tokens.positive, marginTop: 4, fontWeight: 700 }}>
                ✓ Across 5 Partner Institutions
              </div>
            </div>

            <div style={{ backgroundColor: tokens.surface, padding: 20, borderRadius: 16, border: `1px solid ${tokens.ruleSoft}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>
                SYSTEM HEALTH & UPTIME
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: tokens.positive, marginTop: 4 }}>
                99.98%
              </div>
              <div style={{ fontSize: 11, color: tokens.text2, marginTop: 4 }}>
                ABDM Gateway latency 180ms avg
              </div>
            </div>

            <div style={{ backgroundColor: tokens.surface, padding: 20, borderRadius: 16, border: `1px solid ${tokens.ruleSoft}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>
                ACTIVE BREAK-GLASS SESSIONS
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: activeSessions.filter((s) => s.active).length > 0 ? tokens.attention : tokens.text, marginTop: 4 }}>
                {activeSessions.filter((s) => s.active).length}
              </div>
              <div style={{ fontSize: 11, color: tokens.text2, marginTop: 4 }}>
                Requires Dual Auth & Pre-Audit
              </div>
            </div>

            <div style={{ backgroundColor: tokens.surface, padding: 20, borderRadius: 16, border: `1px solid ${tokens.ruleSoft}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>
                DPDP DATA REQUEST SLA
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: tokens.action, marginTop: 4 }}>
                100% On-Track
              </div>
              <div style={{ fontSize: 11, color: tokens.text2, marginTop: 4 }}>
                0 Breached Statutory Deadlines
              </div>
            </div>
          </div>

          {/* Break-Glass Action Banner & Active Sessions Table */}
          <div style={{ backgroundColor: tokens.surface, borderRadius: 16, border: `1px solid ${tokens.ruleSoft}`, padding: 24, marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: tokens.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Lock size={18} color={tokens.emergency} />
                  Break-Glass Audit Control & Active Sessions (SA-0.2)
                </h3>
                <p style={{ fontSize: 12, color: tokens.text3, margin: '4px 0 0 0' }}>
                  Identified health record access is locked behind dual-authorization, stated justification, pre-rendering audit logging, and student consent ledger notification.
                </p>
              </div>

              <button
                onClick={() => setShowBreakGlassModal(true)}
                style={{
                  padding: '10px 18px',
                  borderRadius: 12,
                  backgroundColor: tokens.emergency,
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(230, 57, 70, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Lock size={14} />
                Initiate Break-Glass Session
              </button>
            </div>

            {/* Active Sessions List */}
            {activeSessions.length > 0 ? (
              <div style={{ overflowX: 'auto', marginTop: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${tokens.rule}`, textAlign: 'left', color: tokens.text3, fontFamily: typography.fontMono }}>
                      <th style={{ padding: '8px 12px' }}>SESSION ID</th>
                      <th style={{ padding: '8px 12px' }}>TARGET STUDENT</th>
                      <th style={{ padding: '8px 12px' }}>REASON & JUSTIFICATION</th>
                      <th style={{ padding: '8px 12px' }}>DUAL APPROVER</th>
                      <th style={{ padding: '8px 12px' }}>EXPIRES AT</th>
                      <th style={{ padding: '8px 12px' }}>STATUS</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSessions.map((sess) => (
                      <tr key={sess.id} style={{ borderBottom: `1px solid ${tokens.ruleSoft}` }}>
                        <td style={{ padding: '10px 12px', fontFamily: typography.fontMono, fontWeight: 700 }}>{sess.id}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 800, color: tokens.emergency }}>{sess.studentId}</td>
                        <td style={{ padding: '10px 12px', maxWidth: 280 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, backgroundColor: tokens.surface3, color: tokens.text2, fontFamily: typography.fontMono }}>
                            {sess.reasonCategory}
                          </span>
                          <div style={{ fontSize: 11, color: tokens.text2, marginTop: 4 }}>{sess.reasonText}</div>
                        </td>
                        <td style={{ padding: '10px 12px', color: tokens.text2 }}>{sess.dualApproverAdminName}</td>
                        <td style={{ padding: '10px 12px', fontFamily: typography.fontMono }}>{sess.expiresAt}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {sess.active ? (
                            <span style={{ fontSize: 11, fontWeight: 800, color: tokens.positive, backgroundColor: tokens.positiveBg, padding: '2px 8px', borderRadius: 9999 }}>
                              ACTIVE
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 700, color: tokens.text3 }}>REVOKED</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          {sess.active && (
                            <button
                              onClick={() => handleRevokeSession(sess.id)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                backgroundColor: tokens.surface3,
                                color: tokens.emergency,
                                border: `1px solid ${tokens.emergency}`,
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              Revoke Now
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 16, textAlign: 'center', color: tokens.text3, fontSize: 13 }}>
                No active break-glass sessions currently open.
              </div>
            )}
          </div>

          {/* Aggregate Cohort View (K-Anonymity Floor = 20 Enforced) */}
          <div style={{ backgroundColor: tokens.surface, borderRadius: 16, border: `1px solid ${tokens.ruleSoft}`, padding: 24, marginBottom: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: tokens.text, margin: '0 0 16px 0' }}>
              Institution & Campus Cohort Telemetry (K=20 Anonymity Enforced)
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${tokens.rule}`, textAlign: 'left', color: tokens.text3, fontFamily: typography.fontMono }}>
                    <th style={{ padding: '10px 12px' }}>INSTITUTION CAMPUS COHORT</th>
                    <th style={{ padding: '10px 12px' }}>AGGREGATE COUNT (K≥20)</th>
                    <th style={{ padding: '10px 12px' }}>CLEARANCE RATE</th>
                    <th style={{ padding: '10px 12px' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {campusCohorts.map((cohort, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${tokens.ruleSoft}` }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: tokens.text }}>{cohort.name}</td>
                      <td style={{ padding: '12px', fontFamily: typography.fontMono, fontWeight: 800 }}>
                        {formatKAnonymityCount(cohort.count)}
                      </td>
                      <td style={{ padding: '12px', color: tokens.positive, fontWeight: 800 }}>{cohort.healthClearanceRate}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8, backgroundColor: cohort.status === 'HEALTHY' ? tokens.positiveBg : tokens.attentionBg, color: cohort.status === 'HEALTHY' ? tokens.positive : tokens.attention }}>
                          {cohort.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <SpecialistAgentsMeshPanel />
          <N8NWorkflowAutomationPanel />
          {/* Integrated Operational AI RAG Engine */}
          <AgenticRAGEngineConsole />
        </div>
      )}

      {/* SUBMODULE TABS */}
      {activeTab === 'TENANTS' && <TenantManagementModule />}
      {activeTab === 'CONSTITUTION' && <RulesConsoleModule />}
      {activeTab === 'AUDIT' && <AuditExplorerModule />}
      {activeTab === 'DPDP_CONSENT' && <DpdpConsentModule />}
      {activeTab === 'INCIDENTS' && <IncidentConsoleModule />}
      {activeTab === 'PROVIDER_REGISTRY' && <ProviderRegistryOpsModule />}
      {activeTab === 'AI_OFFICE' && <AiOfficeKillSwitchesModule />}
      {activeTab === 'INTEGRATIONS' && <IntegrationsSettingsModule />}
      </PageTransition>

      {/* BREAK-GLASS AUTHORIZATION MODAL (SA-0.2) */}
      {showBreakGlassModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: tokens.surface,
              borderRadius: 20,
              width: '100%',
              maxWidth: 580,
              border: `2px solid ${tokens.emergency}`,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              padding: 28,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Lock size={22} color={tokens.emergency} />
                <h2 style={{ fontSize: 18, fontWeight: 800, color: tokens.text, margin: 0, fontFamily: typography.fontFamily }}>
                  Initiate Break-Glass Record Access (SA-0.2)
                </h2>
              </div>
              <button
                onClick={() => setShowBreakGlassModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.text3 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: tokens.emergencyBg, border: `1px solid ${tokens.emergency}`, borderRadius: 12, padding: 14, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: tokens.emergency, fontFamily: typography.fontMono }}>
                ⚠️ STEEP LEGAL & COMPLIANCE WARNING (DPDP ACT 2023 / RULE-K8)
              </div>
              <div style={{ fontSize: 11, color: tokens.text2, marginTop: 4 }}>
                Accessing an identified student record requires dual authorisation, a time box (60 min), explicit justification, and immediate consent-ledger notification to the student. Pre-access audit logs will be saved permanently.
              </div>
            </div>

            {validationError && (
              <div style={{ backgroundColor: tokens.emergencyBg, color: tokens.emergency, padding: 10, borderRadius: 10, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
                {validationError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>
                  TARGET STUDENT IDENTIFIER
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
