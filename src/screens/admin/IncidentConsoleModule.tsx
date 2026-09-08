import React, { useState } from 'react';
import { useTheme } from '../../theme/theme';
import { assertRule } from '../../ai/constitution';

export type IncidentSeverity = 'CRITICAL_CRISIS_GATE_MISS' | 'HIGH_SERVICE_DISRUPTION' | 'MEDIUM_PROVIDER_SLA_BREACH' | 'LOW_TELEMETRY_GAP';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED_CLOSED';

export interface IncidentRecord {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: string;
  onCallEngineer: string;
  description: string;
  affectedTenant: string;
  isCrisisGateMiss: boolean;
  mandatoryReviewerName?: string;
  postIncidentNotes?: string;
}

export const IncidentConsoleModule: React.FC = () => {
  const { tokens, typography } = useTheme();
  assertRule('Rule-B'); // Crisis Gate safety rule

  const [incidents, setIncidents] = useState<IncidentRecord[]>([
    {
      id: 'INC-2026-081',
      title: 'Crisis Gate Pattern Near-Miss: Overdose keyword syntax variant',
      severity: 'CRITICAL_CRISIS_GATE_MISS',
      status: 'INVESTIGATING',
      createdAt: '2026-09-08 22:15 UTC',
      onCallEngineer: 'Dr. A. K. Sharma (Medical Safety Lead)',
      description: 'Automated test suite identified non-standard spelling variant of poison keyword. Gate correctly intercepted but flagged for mandatory review.',
      affectedTenant: 'All Tenants (Global Rule-B)',
      isCrisisGateMiss: true,
    },
    {
      id: 'INC-2026-079',
      title: 'Pincode 500032 Provider Panel SLA Drop',
      severity: 'MEDIUM_PROVIDER_SLA_BREACH',
      status: 'OPEN',
      createdAt: '2026-09-08 19:40 UTC',
      onCallEngineer: 'R. K. Verma (Ops On-Call)',
      description: 'Panels dropped below 2 active providers in 500032 (Gachibowli). Rule-J1 gap raised.',
      affectedTenant: 'BITS Pilani & IIIT Hyderabad',
      isCrisisGateMiss: false,
    },
    {
      id: 'INC-2026-074',
      title: 'ABDM HIU Token Refresh Delay',
      severity: 'HIGH_SERVICE_DISRUPTION',
      status: 'RESOLVED_CLOSED',
      createdAt: '2026-09-07 14:10 UTC',
      onCallEngineer: 'S. Nambiar (Integrations Eng)',
      description: 'Gateway response time exceeded 2.5s threshold during peak camp ingestion.',
      affectedTenant: 'Osmania University',
      isCrisisGateMiss: false,
      mandatoryReviewerName: 'S. Nambiar',
      postIncidentNotes: 'Gateway session cache refreshed; gateway connection pool expanded.',
    },
  ]);

  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [reviewerInput, setReviewerInput] = useState('');
  const [closureNotesInput, setClosureNotesInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCloseIncident = (incidentId: string) => {
    setErrorMessage('');
    const target = incidents.find((i) => i.id === incidentId);
    if (!target) return;

    if (target.isCrisisGateMiss) {
      if (!reviewerInput.trim()) {
        setErrorMessage('CRITICAL MANDATORY REQUIREMENT: Crisis-gate miss incidents CANNOT be closed without a named medical/safety reviewer.');
        return;
      }
      if (!closureNotesInput.trim() || closureNotesInput.trim().length < 15) {
        setErrorMessage('Mandatory post-incident review notes must be at least 15 characters long.');
        return;
      }
    }

    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === incidentId
          ? {
              ...inc,
              status: 'RESOLVED_CLOSED',
              mandatoryReviewerName: target.isCrisisGateMiss ? reviewerInput.trim() : (inc.mandatoryReviewerName || 'Duty Admin'),
              postIncidentNotes: closureNotesInput.trim() || inc.postIncidentNotes,
            }
          : inc
      )
    );

    setSelectedIncident(null);
    setReviewerInput('');
    setClosureNotesInput('');
  };

  return (
    <div style={{ backgroundColor: tokens.surface, borderRadius: 16, border: `1px solid ${tokens.ruleSoft}`, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: tokens.text, fontFamily: typography.fontFamily, margin: 0 }}>
            Incident Console & Crisis-Gate Monitoring (SA-1.5)
          </h2>
          <p style={{ fontSize: 12, color: tokens.text3, margin: '4px 0 0 0' }}>
            Severity-classified incidents with mandatory named-reviewer signoff for Rule-B Crisis Gate events.
          </p>
        </div>
        <span style={{ fontSize: 11, fontFamily: typography.fontMono, backgroundColor: tokens.emergencyBg, color: tokens.emergency, padding: '6px 12px', borderRadius: 8, fontWeight: 800 }}>
          CRISIS-GATE SAFETY ENFORCED
        </span>
      </div>

      {/* Incidents Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${tokens.rule}`, textAlign: 'left', color: tokens.text3, fontFamily: typography.fontMono }}>
              <th style={{ padding: '10px 12px' }}>INCIDENT ID</th>
              <th style={{ padding: '10px 12px' }}>SEVERITY</th>
              <th style={{ padding: '10px 12px' }}>TITLE / DESCRIPTION</th>
              <th style={{ padding: '10px 12px' }}>ON-CALL ROUTER</th>
              <th style={{ padding: '10px 12px' }}>STATUS</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => (
              <tr key={inc.id} style={{ borderBottom: `1px solid ${tokens.ruleSoft}`, backgroundColor: inc.isCrisisGateMiss ? 'rgba(230,57,70,0.03)' : 'transparent' }}>
                <td style={{ padding: '12px', fontFamily: typography.fontMono, fontWeight: 800, color: tokens.text }}>{inc.id}</td>
                <td style={{ padding: '12px' }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontFamily: typography.fontMono,
                      backgroundColor: inc.severity === 'CRITICAL_CRISIS_GATE_MISS' ? tokens.emergencyBg : inc.severity === 'HIGH_SERVICE_DISRUPTION' ? tokens.attentionBg : tokens.surface3,
                      color: inc.severity === 'CRITICAL_CRISIS_GATE_MISS' ? tokens.emergency : inc.severity === 'HIGH_SERVICE_DISRUPTION' ? tokens.attention : tokens.text2,
                    }}
                  >
                    {inc.severity}
                  </span>
                </td>
                <td style={{ padding: '12px', maxWidth: 320 }}>
                  <div style={{ fontWeight: 700, color: tokens.text }}>{inc.title}</div>
                  <div style={{ fontSize: 11, color: tokens.text3, marginTop: 2 }}>{inc.description}</div>
                </td>
                <td style={{ padding: '12px', color: tokens.text2 }}>{inc.onCallEngineer}</td>
                <td style={{ padding: '12px' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: inc.status === 'RESOLVED_CLOSED' ? tokens.positive : inc.status === 'INVESTIGATING' ? tokens.attention : tokens.emergency,
                    }}
                  >
                    {inc.status}
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {inc.status !== 'RESOLVED_CLOSED' ? (
                    <button
                      onClick={() => {
                        setSelectedIncident(inc);
                        setReviewerInput('');
                        setClosureNotesInput('');
                        setErrorMessage('');
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        backgroundColor: tokens.action,
                        color: '#ffffff',
                        border: 'none',
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Review & Resolve
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: tokens.text3, fontFamily: typography.fontMono }}>
                      Reviewed by {inc.mandatoryReviewerName || 'System'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Review & Resolution Modal */}
      {selectedIncident && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ backgroundColor: tokens.surface, borderRadius: 16, width: '100%', maxWidth: 540, border: `1px solid ${tokens.rule}`, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: tokens.text, margin: '0 0 12px 0' }}>
              Incident Review: {selectedIncident.id}
            </h3>

            {selectedIncident.isCrisisGateMiss && (
              <div style={{ backgroundColor: tokens.emergencyBg, border: `1px solid ${tokens.emergency}`, borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: tokens.emergency, fontFamily: typography.fontMono }}>
                  ⚠️ MANDATORY POLICY: CRISIS-GATE POST-INCIDENT REVIEW
                </div>
                <div style={{ fontSize: 11, color: tokens.text2, marginTop: 4 }}>
                  This incident involves a potential Rule-B Crisis Gate event. You MUST specify a named medical/safety reviewer and detailed resolution notes before closing.
                </div>
              </div>
            )}

            {errorMessage && (
              <div style={{ backgroundColor: tokens.emergencyBg, color: tokens.emergency, padding: 10, borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                {errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>
                  NAMED MEDICAL / SAFETY REVIEWER {selectedIncident.isCrisisGateMiss ? '(REQUIRED)' : '(OPTIONAL)'}
                </label>
                <input
                  type="text"
                  value={reviewerInput}
                  onChange={(e) => setReviewerInput(e.target.value)}
                  placeholder="e.g. Dr. A. K. Sharma (Chief Safety Officer)"
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, fontSize: 13, marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>
                  POST-INCIDENT REVIEW & RESOLUTION NOTES
                </label>
                <textarea
                  value={closureNotesInput}
                  onChange={(e) => setClosureNotesInput(e.target.value)}
                  placeholder="Describe root cause, code fix or gate pattern update applied..."
                  rows={4}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, fontSize: 13, marginTop: 4 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setSelectedIncident(null)}
                style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: tokens.surface2, border: `1px solid ${tokens.ruleSoft}`, color: tokens.text, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleCloseIncident(selectedIncident.id)}
                style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: tokens.action, border: 'none', color: '#ffffff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
              >
                Approve & Close Incident
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
