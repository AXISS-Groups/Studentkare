import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, RefreshCw, X, Play, Shield, AlertTriangle, CheckCircle2, Lock, Unlock } from 'lucide-react';

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: string;
  agent_name: string;
  message: string;
  details?: Record<string, any>;
}

export interface AgentSystemLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgentSystemLogDrawer({ isOpen, onClose }: AgentSystemLogDrawerProps) {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [systemFrozen, setSystemFrozen] = useState<boolean>(false);
  const [triageStatus, setTriageStatus] = useState<string>('');

  const fetchSystemLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/agents/system-log?limit=60');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to fetch system logs:', e);
    } finally {
      setLoading(false);
    }
  };

  const triggerKillSwitch = async () => {
    try {
      const res = await fetch('/api/v1/ops/kill-switch', { method: 'POST' });
      if (res.ok) {
        setSystemFrozen(true);
        fetchSystemLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetKillSwitch = async () => {
    try {
      const res = await fetch('/api/v1/ops/kill-switch/reset', { method: 'POST' });
      if (res.ok) {
        setSystemFrozen(false);
        fetchSystemLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const runMeshTriageDemo = async () => {
    setTriageStatus('Running Clinical AI Helper Mesh Triage...');
    try {
      const res = await fetch('/api/v1/agents/mesh-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'demo_student',
          symptomInput: 'Severe headache, acute eye strain, and 100.4F fever',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTriageStatus(`Mesh Triage Complete: ${data.assigned_helpers?.length || 0} helpers dispatched.`);
        fetchSystemLogs();
      } else {
        setTriageStatus('Mesh Triage blocked by Zero-Trust Safety Gate (System Frozen).');
      }
    } catch (e) {
      setTriageStatus('Mesh Triage Execution Error.');
    }
  };

  // Keyboard shortcut Ctrl+Alt+Shift+K for VAVE Emergency Kill-Switch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
        e.preventDefault();
        triggerKillSwitch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSystemLogs();
      const interval = setInterval(fetchSystemLogs, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(l => (filterLevel === 'ALL' ? true : l.level === filterLevel));

  const getLevelBadgeStyle = (level: string) => {
    switch (level) {
      case 'SAFETY':
        return { background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' };
      case 'WARN':
        return { background: '#fffbe6', color: '#d97706', border: '1px solid #fde68a' };
      case 'CONSENSUS':
        return { background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac' };
      case 'RAG':
        return { background: '#f0f9ff', color: '#0284c7', border: '1px solid #7dd3fc' };
      case 'TOOL':
        return { background: '#faf5ff', color: '#9333ea', border: '1px solid #d8b4fe' };
      default:
        return { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 480,
        maxWidth: '100vw',
        background: '#0f172a',
        color: '#f8fafc',
        boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.4)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Drawer Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#1e293b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={22} style={{ color: '#38bdf8' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.02em', color: '#f8fafc' }}>
              VAVE Observable System Log
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Real-time Clinical AI Mesh Telemetry & Audit Stream
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Emergency Zero-Trust Kill Switch Header */}
      <div
        style={{
          padding: '12px 20px',
          background: systemFrozen ? '#450a0a' : '#1e1b4b',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldAlert size={18} style={{ color: systemFrozen ? '#ef4444' : '#818cf8' }} />
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: systemFrozen ? '#fca5a5' : '#e0e7ff' }}>
              {systemFrozen ? 'EMERGENCY KILL-SWITCH ACTIVE' : 'Zero-Trust Safety Gate Active'}
            </div>
            <div style={{ fontSize: '0.7rem', color: systemFrozen ? '#fecaca' : '#a5b4fc' }}>
              {systemFrozen ? 'All high-risk dispatches frozen' : 'Press Ctrl+Alt+Shift+K to freeze operations'}
            </div>
          </div>
        </div>
        {systemFrozen ? (
          <button
            onClick={resetKillSwitch}
            style={{
              padding: '5px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Unlock size={14} /> Reset Gate
          </button>
        ) : (
          <button
            onClick={triggerKillSwitch}
            style={{
              padding: '5px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Lock size={14} /> Freeze System
          </button>
        )}
      </div>

      {/* Control Bar: Filters & Trigger Demo */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e293b', background: '#0f172a' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {['ALL', 'SAFETY', 'RAG', 'CONSENSUS', 'TOOL', 'WARN'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              style={{
                padding: '4px 10px',
                fontSize: '0.72rem',
                borderRadius: 12,
                fontWeight: 600,
                border: filterLevel === lvl ? '1px solid #38bdf8' : '1px solid #334155',
                background: filterLevel === lvl ? '#0284c7' : '#1e293b',
                color: filterLevel === lvl ? '#ffffff' : '#94a3b8',
                cursor: 'pointer',
              }}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={runMeshTriageDemo}
            style={{
              flex: 1,
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Play size={14} /> Run Clinical Mesh Swarm
          </button>

          <button
            onClick={fetchSystemLogs}
            style={{
              padding: '6px 10px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#cbd5e1',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {triageStatus && (
          <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#38bdf8', fontStyle: 'italic' }}>
            {triageStatus}
          </div>
        )}
      </div>

      {/* Log Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filteredLogs.length === 0 ? (
          <div style={{ textTransform: 'uppercase', color: '#64748b', fontSize: '0.8rem', textAlign: 'center', marginTop: 40 }}>
            No logs matched filter '{filterLevel}'
          </div>
        ) : (
          filteredLogs.map(item => {
            const badgeStyle = getLevelBadgeStyle(item.level);
            return (
              <div
                key={item.id}
                style={{
                  background: '#1e293b',
                  borderRadius: 8,
                  padding: 12,
                  border: '1px solid #334155',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        ...badgeStyle,
                      }}
                    >
                      {item.level}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9' }}>
                      {item.agent_name}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                    {item.timestamp}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                  {item.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Drawer Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid #1e293b', background: '#1e293b', fontSize: '0.72rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
        <span>Studentkare AI Engine • VAVE Telemetry</span>
        <span>{filteredLogs.length} events logged</span>
      </div>
    </div>
  );
}
