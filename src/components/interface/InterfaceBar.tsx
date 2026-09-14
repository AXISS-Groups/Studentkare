import { useState, useRef, useEffect } from 'react';
import { Activity, Bell, Bot, ChevronDown, Moon, PhoneCall, ShieldAlert, ShieldCheck, SlidersHorizontal, Sparkles, Sun, Ticket, Wrench } from 'lucide-react';
import { useInterface } from '../../theme/InterfaceProvider';
import { useTheme } from '../../theme/theme';
import { EMERGENCY_CONTACTS } from '../health/EmergencyBar';
import { AIAgentsStatusModal } from '../health/AIAgentsStatusModal';
import { NotificationCenterModal } from '../health/NotificationCenterModal';
import { PenTestConsoleModal } from '../security/PenTestConsoleModal';
import { ServiceDeskTicketsModal } from '../health/ServiceDeskTicketsModal';
import { ShopDialog } from '../marketplace/ShopDialog';
import { AgentSystemLogDrawer } from '../AgentSystemLogDrawer';

export function InterfaceBar({ section }: { section: string }) {
  const { reducedMotion, systemReducedMotion, setReducedMotion } = useInterface();
  const { mode, setTheme } = useTheme();
  const [sosOpen, setSosOpen] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [systemLogOpen, setSystemLogOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [penTestOpen, setPenTestOpen] = useState(false);
  const [ticketsOpen, setTicketsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const isAccountPage = !['Marketplace', 'Sign in', 'Create an account'].includes(section);

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

  const openTool = (setter: (open: boolean) => void) => {
    root.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(menu => { menu.open = false; });
    setter(true);
  };

  return <div className="care-interface-bar" ref={root}>
    <span className="care-workspace-label"><Sparkles size={14} aria-hidden="true" />Studentkare <span>/</span><strong>{section}</strong></span>
    <div className="care-interface-actions">
      {isAccountPage && <>
        <button type="button" className="care-bar-action-btn" aria-label="Notifications" onClick={() => setNotificationsOpen(true)}>
          <Bell size={16} /><span className="care-action-label">Alerts</span>
        </button>
        <details className="care-toolbar-menu">
          <summary><Wrench size={15} /><span>Tools</span><ChevronDown size={12} /></summary>
          <div className="care-settings-panel care-tools-panel">
            <strong>Your workspace tools</strong>
            <button onClick={() => openTool(setSystemLogOpen)}><Activity size={18} /><span>VAVE Observable Log<small>Live telemetry & Zero-Trust Gate</small></span></button>
            <button onClick={() => openTool(setAgentsOpen)}><Bot size={18} /><span>AI agents<small>Explore your care assistants</small></span></button>
            <button onClick={() => openTool(setTicketsOpen)}><Ticket size={18} /><span>Service desk<small>Tickets and platform updates</small></span></button>
            <button onClick={() => openTool(setPenTestOpen)}><ShieldCheck size={18} /><span>Pen-Test & QA Console<small>Platform checks and diagnostics</small></span></button>
          </div>
        </details>
        <button type="button" className="care-bar-action-btn care-bar-action-btn-sos" onClick={() => setSosOpen(true)}>
          <ShieldAlert size={16} /><span>SOS</span>
        </button>
      </>}
      <details className="care-toolbar-menu">
        <summary><SlidersHorizontal size={15} /><span>Display settings</span><ChevronDown size={12} /></summary>
        <div className="care-settings-panel">
          <strong>A calmer interface, your way.</strong>
          <fieldset className="care-theme-picker">
            <legend>Appearance</legend>
            <div>
              <button type="button" aria-pressed={mode === 'light'} onClick={() => setTheme('light')}><Sun size={16} />Indigo light</button>
              <button type="button" aria-pressed={mode === 'dark'} onClick={() => setTheme('dark')}><Moon size={16} />Midnight</button>
            </div>
          </fieldset>
          <label><input type="checkbox" checked={reducedMotion} disabled={systemReducedMotion} onChange={event => setReducedMotion(event.target.checked)} /><span>Reduce interface motion</span></label>
          <p>{systemReducedMotion ? 'Your device requests reduced motion. That preference is respected across every screen.' : 'Pause automatic slides and turn off decorative motion. Your choice is remembered on this device.'}</p>
        </div>
      </details>
    </div>
    <NotificationCenterModal isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    <AIAgentsStatusModal isOpen={agentsOpen} onClose={() => setAgentsOpen(false)} />
    <AgentSystemLogDrawer isOpen={systemLogOpen} onClose={() => setSystemLogOpen(false)} />
    <PenTestConsoleModal isOpen={penTestOpen} onClose={() => setPenTestOpen(false)} />
    <ServiceDeskTicketsModal isOpen={ticketsOpen} onClose={() => setTicketsOpen(false)} />
    {sosOpen && <ShopDialog title="24x7 Emergency Helplines" onClose={() => setSosOpen(false)}>
      <p>Immediate 24-hour crisis & medical response</p>
      <div className="care-emergency-directory">
        {EMERGENCY_CONTACTS.map(contact => <div key={contact.id}>
          <div><strong>{contact.name}</strong><small>{contact.number} · {contact.available}</small></div>
          <a href={`tel:${contact.number.replace(/[^\d+]/g, '')}`} className="health-button" aria-label={`Call ${contact.name}`}><PhoneCall size={16} />Call</a>
        </div>)}
      </div>
    </ShopDialog>}
  </div>;
}
