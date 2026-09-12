import { useState, useRef, useEffect } from 'react';
import { Bell, Bot, ChevronDown, PhoneCall, ShieldAlert, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useInterface } from '../../theme/InterfaceProvider';
import { EMERGENCY_CONTACTS } from '../health/EmergencyBar';
import { AIAgentsStatusModal } from '../health/AIAgentsStatusModal';
import { NotificationCenterModal } from '../health/NotificationCenterModal';

export function InterfaceBar({ section }: { section: string }) {
  const { reducedMotion, systemReducedMotion, setReducedMotion } = useInterface();
  const [sosOpen, setSosOpen] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: PointerEvent | KeyboardEvent) => {
      const isEscape = event instanceof KeyboardEvent && event.key === 'Escape';
      if (isEscape || (event instanceof PointerEvent && !root.current?.contains(event.target as Node))) {
        root.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(menu => {
          menu.open = false;
          if (isEscape) menu.querySelector<HTMLElement>('summary')?.focus();
        });
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, []);

  return <div className="care-interface-bar" ref={root}>
    <span className="care-workspace-label"><Sparkles size={12} />Studentkare <span>/</span><strong>{section}</strong></span>
    <div className="care-interface-actions">
      <button
        type="button"
        className="care-bar-action-btn care-bar-action-btn-alerts"
        onClick={() => setNotificationsOpen(true)}
      >
        <Bell size={13} />
        <span>Alerts</span>
        <span className="care-bar-action-badge">3</span>
      </button>

      <button
        type="button"
        className="care-bar-action-btn care-bar-action-btn-agents"
        onClick={() => setAgentsOpen(true)}
      >
        <Bot size={13} />
        <span>AI Agents</span>
        <span className="care-bar-action-badge">4 Active</span>
      </button>

      <button
        type="button"
        className="care-bar-action-btn care-bar-action-btn-sos"
        onClick={() => setSosOpen(true)}
      >
        <ShieldAlert size={13} />
        <span>24x7 SOS Emergency</span>
      </button>

      <details className="care-toolbar-menu"><summary><SlidersHorizontal size={13} /><span>Display settings</span><ChevronDown size={11} /></summary><div className="care-settings-panel"><strong>A calmer interface, your way.</strong><label><input type="checkbox" checked={reducedMotion} disabled={systemReducedMotion} onChange={event => setReducedMotion(event.target.checked)} /><span>Reduce interface motion</span></label><p>{systemReducedMotion ? 'Your device requests reduced motion. That preference is respected across every screen.' : 'Turn off decorative animation and transitions across all pages. Your choice is remembered on this device.'}</p></div></details>
    </div>

    <NotificationCenterModal isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    <AIAgentsStatusModal isOpen={agentsOpen} onClose={() => setAgentsOpen(false)} />

    {sosOpen && (
      <div className="wf-modal-backdrop" onClick={() => setSosOpen(false)}>
        <div className="wf-modal-card" onClick={e => e.stopPropagation()}>
          <button className="wf-modal-close" onClick={() => setSosOpen(false)} aria-label="Close SOS dialog">
            <X size={18} />
          </button>
          <div className="wf-modal-header">
            <ShieldAlert size={32} color="#e53e3e" />
            <div>
              <h3 style={{ margin: 0 }}>24x7 Emergency Helplines</h3>
              <span style={{ fontSize: '11px', color: '#718096' }}>Immediate 24-hour crisis & medical response</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBlock: '16px' }}>
            {EMERGENCY_CONTACTS.map(contact => (
              <div key={contact.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '10px' }}>
                <div>
                  <strong style={{ fontSize: '13px', color: '#2d3748', display: 'block' }}>{contact.name}</strong>
                  <span style={{ fontSize: '11px', color: '#e53e3e', fontWeight: 700 }}>{contact.number}</span> · <small style={{ fontSize: '10px', color: '#718096' }}>{contact.available}</small>
                </div>
                <a href={`tel:${contact.number.replace(/[^\d+]/g, '')}`} className="health-button health-button-primary" style={{ fontSize: '11px !important', padding: '6px 12px', minHeight: '32px' }}>
                  <PhoneCall size={12} /> Call
                </a>
              </div>
            ))}
          </div>

          <button className="health-button" style={{ width: '100%' }} onClick={() => setSosOpen(false)}>
            Close Directory
          </button>
        </div>
      </div>
    )}
  </div>;
}
