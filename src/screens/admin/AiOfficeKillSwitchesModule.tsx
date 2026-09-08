import React, { useState } from 'react';
import { useTheme } from '../../theme/theme';
import {
  Bot,
  Power,
  ShieldAlert,
  AlertOctagon,
  Activity,
} from 'lucide-react';
import { assertRule } from '../../ai/constitution';

export interface DepartmentControl {
  id: string;
  name: string;
  plane: 'OPERATIONAL';
  status: 'ACTIVE' | 'HALTED' | 'DEGRADED';
  killSwitchActive: boolean;
  boundRules: string[];
  pendingApprovalQueueCount: number;
  blastRadius: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const AiOfficeKillSwitchesModule: React.FC = () => {
  const { tokens, typography } = useTheme();

  const [departments, setDepartments] = useState<DepartmentControl[]>([
    {
      id: 'D1',
      name: 'Service Desk Operations',
      plane: 'OPERATIONAL',
      status: 'ACTIVE',
      killSwitchActive: false,
      boundRules: ['Rule-L1', 'Rule-L2'],
      pendingApprovalQueueCount: 4,
      blastRadius: 'LOW',
    },
    {
      id: 'D2',
      name: 'Partner & Supply Ops',
      plane: 'OPERATIONAL',
      status: 'ACTIVE',
      killSwitchActive: false,
      boundRules: ['Rule-J1', 'Rule-L7'],
      pendingApprovalQueueCount: 1,
      blastRadius: 'MEDIUM',
    },
    {
      id: 'D3',
      name: 'Compliance & Audit',
      plane: 'OPERATIONAL',
      status: 'ACTIVE',
      killSwitchActive: false,
      boundRules: ['Rule-K8', 'Rule-L8'],
      pendingApprovalQueueCount: 0,
      blastRadius: 'HIGH',
    },
    {
      id: 'D4',
      name: 'Finance & Revenue Ops',
      plane: 'OPERATIONAL',
      status: 'ACTIVE',
      killSwitchActive: false,
      boundRules: ['Rule-L8', 'Rule-L2'],
      pendingApprovalQueueCount: 2,
      blastRadius: 'MEDIUM',
    },
    {
      id: 'D5',
      name: 'Claims Operations',
      plane: 'OPERATIONAL',
      status: 'ACTIVE',
      killSwitchActive: false,
      boundRules: ['Rule-K4', 'Rule-K5'],
      pendingApprovalQueueCount: 6,
      blastRadius: 'HIGH',
    },
    {
      id: 'D6',
      name: 'Institution Success',
      plane: 'OPERATIONAL',
      status: 'ACTIVE',
      killSwitchActive: false,
      boundRules: ['Rule-K-Anonymity'],
      pendingApprovalQueueCount: 0,
      blastRadius: 'LOW',
    },
    {
      id: 'D7',
      name: 'Content & Localization',
      plane: 'OPERATIONAL',
      status: 'HALTED',
      killSwitchActive: true,
      boundRules: ['Rule-L3'],
      pendingApprovalQueueCount: 3,
      blastRadius: 'LOW',
    },
    {
      id: 'D8',
      name: 'Engineering & Reliability',
      plane: 'OPERATIONAL',
      status: 'ACTIVE',
      killSwitchActive: false,
      boundRules: ['Rule-K1'],
      pendingApprovalQueueCount: 0,
      blastRadius: 'HIGH',
    },
    {
      id: 'D9',
      name: 'Clinical Governance (Advisory Only)',
      plane: 'OPERATIONAL',
      status: 'ACTIVE',
      killSwitchActive: false,
      boundRules: ['Rule-K1', 'Rule-K8'],
      pendingApprovalQueueCount: 5,
      blastRadius: 'HIGH',
    },
  ]);

  const [globalKillSwitchTriggered, setGlobalKillSwitchTriggered] = useState(false);

  const handleToggleDepartmentKillSwitch = (deptId: string) => {
    assertRule('Rule-K1'); // Two-Plane Separation & Operational Agent Scoping

    setDepartments(
      departments.map((d) => {
        if (d.id === deptId) {
          const nextKillSwitch = !d.killSwitchActive;
          return {
            ...d,
            killSwitchActive: nextKillSwitch,
            status: nextKillSwitch ? 'HALTED' : 'ACTIVE',
          };
        }
        return d;
      })
    );
  };

  const handleGlobalKillSwitch = () => {
    assertRule('Rule-K1');
    const nextState = !globalKillSwitchTriggered;
    setGlobalKillSwitchTriggered(nextState);

    setDepartments(
      departments.map((d) => ({
        ...d,
        killSwitchActive: nextState,
        status: nextState ? 'HALTED' : 'ACTIVE',
      }))
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Global Circuit Breaker */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: tokens.text, margin: 0 }}>
            AI Operations Control Plane & Department Kill Switches
          </h2>
          <div style={{ fontSize: '13px', color: tokens.text2, marginTop: '4px' }}>
            Operational Plane AI agents (D1–D9) operate strictly outside the Clinical Plane with 1-click circuit breakers.
          </div>
        </div>

        <button
          onClick={handleGlobalKillSwitch}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: tokens.emergency,
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: 800,
            cursor: 'pointer',
            fontSize: '13px',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
          }}
        >
          <AlertOctagon size={20} />
          {globalKillSwitchTriggered ? 'RESET GLOBAL KILL SWITCH' : 'TRIGGER GLOBAL EMERGENCY KILL SWITCH'}
        </button>
      </div>

      {/* Plane Isolation Warning Card */}
      <div
        style={{
          backgroundColor: tokens.positiveBg,
          border: `1px solid ${tokens.positive}`,
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <ShieldAlert size={24} color={tokens.positive} />
        <div>
          <div style={{ fontWeight: 800, color: tokens.positive, fontSize: '14px' }}>
            Rule-K1 Isolation Enforced: Operational Plane Active
          </div>
          <div style={{ fontSize: '12px', color: tokens.positive }}>
            Zero AI agents have access to identified student health records, consults, vitals, or prescriptions.
          </div>
        </div>
      </div>

      {/* Departments Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {departments.map((dept) => {
          const isHalted = dept.killSwitchActive;

          return (
            <div
              key={dept.id}
              style={{
                backgroundColor: isHalted ? tokens.emergencyBg : tokens.surface,
                borderRadius: '16px',
                border: `1px solid ${isHalted ? tokens.emergency : tokens.ruleSoft}`,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Bot size={20} color={isHalted ? tokens.emergency : tokens.action} />
                    <span style={{ fontWeight: 800, color: tokens.text, fontSize: '14px' }}>
                      {dept.id} · {dept.name}
                    </span>
                  </div>

                  <span
                    style={{
                      backgroundColor: isHalted ? tokens.emergencyBg : tokens.positiveBg,
                      color: isHalted ? tokens.emergency : tokens.positive,
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    {dept.status}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: tokens.text2, marginBottom: 8 }}>
                  Plane: <strong>{dept.plane}</strong> · Blast Radius:{' '}
                  <span style={{ color: dept.blastRadius === 'HIGH' ? tokens.emergency : tokens.text, fontWeight: 700 }}>
                    {dept.blastRadius}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                  {dept.boundRules.map((rule) => (
                    <code
                      key={rule}
                      style={{
                        backgroundColor: isHalted ? tokens.emergencyBg : tokens.surface2,
                        color: isHalted ? tokens.emergency : tokens.action,
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      {rule}
                    </code>
                  ))}
                </div>

                {dept.pendingApprovalQueueCount > 0 && (
                  <div style={{ fontSize: '12px', color: tokens.attention, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Activity size={14} />
                    {dept.pendingApprovalQueueCount} Human Approval Queue Action(s) Pending
                  </div>
                )}
              </div>

              <button
                onClick={() => handleToggleDepartmentKillSwitch(dept.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isHalted ? tokens.positive : tokens.emergency,
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <Power size={16} />
                {isHalted ? 'Resume Department Agent' : 'Halt Department Kill Switch'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
