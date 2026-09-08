import React, { useState } from 'react';
import { useTheme } from '../../theme/theme';
import {
  Search,
  Download,
  UserCheck,
  Bot,
  Server,
} from 'lucide-react';
import { AuditEntry } from '../../types/admin';
import { assertRule } from '../../ai/constitution';

export const AuditExplorerModule: React.FC = () => {
  const { tokens, typography } = useTheme();

  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([
    {
      id: 'aud_entry_9901',
      timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      actorId: 'ADM-001',
      actorName: 'Dr. Vikram Sarabhai (Super Admin)',
      actorType: 'HUMAN_ADMIN',
      action: 'EMERGENCY_BREAK_GLASS_INITIATED',
      ruleId: 'Rule-K8',
      institutionId: 'inst_osmania_01',
      resourceType: 'STUDENT_CLINICAL_RECORD',
      resourceId: 'STU-2026-9812',
      details: {
        reasonCategory: 'SAFETY_ESCALATION',
        dualApprover: 'Prof. Rajesh Sharma (Co-Signing Admin)',
        scope: ['LAB', 'CAMP_REPORT'],
        timeboxMinutes: 60,
        studentNotified: true,
      },
    },
    {
      id: 'aud_entry_9892',
      timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
      actorId: 'agent_claims_d5',
      actorName: 'Claims Operations AI (D5)',
      actorType: 'AGENT',
      action: 'CLAIMS_PROVENANCE_VERIFIED',
      ruleId: 'Rule-K4',
      institutionId: 'inst_iith_02',
      resourceType: 'BILL_LINE_ITEM',
      resourceId: 'BILL-88102',
      details: {
        provenanceCheckPassed: true,
        bbox: [120, 45, 300, 90],
        page: 1,
        documentId: 'DOC-CLAIM-4412',
      },
    },
    {
      id: 'aud_entry_9880',
      timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
      actorId: 'system_boot',
      actorName: 'System Kernel',
      actorType: 'SYSTEM',
      action: 'K_ANONYMITY_ENFORCED',
      ruleId: 'Rule-K1',
      institutionId: null,
      resourceType: 'SYSTEM_AGGREGATE',
      details: { note: 'Suppressed cohort count < 20 for AIIMS Clinic Pod 3' },
    },
    {
      id: 'aud_entry_9871',
      timestamp: new Date(Date.now() - 240 * 60000).toISOString(),
      actorId: 'ADM-001',
      actorName: 'Dr. Vikram Sarabhai',
      actorType: 'HUMAN_ADMIN',
      action: 'DEPARTMENT_KILL_SWITCH_TOGGLED',
      ruleId: 'Rule-K1',
      institutionId: null,
      resourceType: 'AI_DEPARTMENT',
      resourceId: 'D7',
      details: { note: 'Content & Localization AI Department paused by administrator.' },
    },
  ]);

  const [actorFilter, setActorFilter] = useState<string>('ALL');
  const [ruleFilter, setRuleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const filteredLogs = auditLogs.filter((log) => {
    assertRule('Rule-K8');

    if (actorFilter !== 'ALL' && log.actorType !== actorFilter) return false;
    if (ruleFilter !== 'ALL' && log.ruleId !== ruleFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchActor = log.actorName.toLowerCase().includes(q);
      const matchRule = log.ruleId.toLowerCase().includes(q);
      const matchId = log.id.toLowerCase().includes(q);
      if (!matchAction && !matchActor && !matchRule && !matchId) return false;
    }

    return true;
  });

  const handleExportNDJSON = () => {
    const jsonLines = filteredLogs.map((entry) => JSON.stringify(entry)).join('\n');
    const blob = new Blob([jsonLines], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `studentkare_audit_log_${new Date().toISOString().split('T')[0]}.ndjson`;
    link.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: tokens.text, margin: 0 }}>
            Append-Only Audit Explorer
          </h2>
          <div style={{ fontSize: '13px', color: tokens.text2, marginTop: '4px' }}>
            Immutably records every human admin access, break-glass session, agent action, and constitutional rule assertion.
          </div>
        </div>

        <button
          onClick={handleExportNDJSON}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.rule}`,
            color: tokens.text,
            padding: '10px 18px',
            borderRadius: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          <Download size={18} />
          Export NDJSON Audit Log
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search
            size={18}
            color={tokens.text3}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search action, actor name, entry ID, or rule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px 10px 42px',
              borderRadius: '12px',
              border: `1px solid ${tokens.rule}`,
              backgroundColor: tokens.surface,
              fontSize: '13px',
              color: tokens.text,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <select
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '12px',
            border: `1px solid ${tokens.rule}`,
            backgroundColor: tokens.surface,
            fontSize: '13px',
            color: tokens.text,
          }}
        >
          <option value="ALL">All Actors</option>
          <option value="HUMAN_ADMIN">Human Admin</option>
          <option value="AGENT">AI Agent</option>
          <option value="SYSTEM">System Kernel</option>
        </select>

        <select
          value={ruleFilter}
          onChange={(e) => setRuleFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '12px',
            border: `1px solid ${tokens.rule}`,
            backgroundColor: tokens.surface,
            fontSize: '13px',
            color: tokens.text,
          }}
        >
          <option value="ALL">All Rule IDs</option>
          <option value="Rule-K8">Rule-K8 (Dual-Auth Break-Glass)</option>
          <option value="Rule-K4">Rule-K4 (Pixel Provenance)</option>
          <option value="Rule-K1">Rule-K1 (Clinical Isolation)</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      <div
        style={{
          backgroundColor: tokens.surface,
          borderRadius: '16px',
          border: `1px solid ${tokens.rule}`,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: tokens.canvas, borderBottom: `1px solid ${tokens.ruleSoft}` }}>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>
                Timestamp & ID
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>
                Actor
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>
                Action
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>
                Rule ID
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>
                Target Resource
              </th>
              <th style={{ padding: '16px', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: tokens.text3 }}>
                Inspect
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((entry) => {
              return (
                <tr key={entry.id} style={{ borderBottom: `1px solid ${tokens.ruleSoft}` }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 700, color: tokens.text, fontSize: '13px' }}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                    <code style={{ fontSize: '11px', color: tokens.text3 }}>{entry.id}</code>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {entry.actorType === 'HUMAN_ADMIN' && <UserCheck size={16} color={tokens.action} />}
                      {entry.actorType === 'AGENT' && <Bot size={16} color={tokens.action} />}
                      {entry.actorType === 'SYSTEM' && <Server size={16} color={tokens.text3} />}
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: tokens.text }}>{entry.actorName}</div>
                        <div style={{ fontSize: '11px', color: tokens.text3 }}>{entry.actorType}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: tokens.text }}>{entry.action}</span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <code
                      style={{
                        backgroundColor: tokens.surface3,
                        color: tokens.action,
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: '12px',
                        fontWeight: 800,
                      }}
                    >
                      {entry.ruleId}
                    </code>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontSize: '13px', color: tokens.text }}>{entry.resourceType}</div>
                    {entry.resourceId && <code style={{ fontSize: '11px', color: tokens.text3 }}>{entry.resourceId}</code>}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <button
                      onClick={() => setSelectedEntry(entry)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: `1px solid ${tokens.rule}`,
                        backgroundColor: tokens.surface2,
                        color: tokens.text,
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {selectedEntry && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: tokens.surface,
              borderRadius: '20px',
              padding: '28px',
              maxWidth: 600,
              width: '100%',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: tokens.text, marginTop: 0 }}>
              Audit Record Payload: {selectedEntry.id}
            </h3>

            <pre
              style={{
                backgroundColor: tokens.ink,
                color: '#38BDF8',
                padding: '16px',
                borderRadius: '12px',
                overflowX: 'auto',
                fontSize: '12px',
                maxHeight: 300,
              }}
            >
              {JSON.stringify(selectedEntry, null, 2)}
            </pre>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedEntry(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  backgroundColor: tokens.action,
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
