import { useState, useRef, useEffect } from 'react';
import { Bell, PhoneCall, ShieldAlert, Sparkles } from 'lucide-react';
import { EMERGENCY_CONTACTS } from '../health/EmergencyBar';
import { AIAgentsStatusModal } from '../health/AIAgentsStatusModal';
import { NotificationCenterModal } from '../health/NotificationCenterModal';
import { PenTestConsoleModal } from '../security/PenTestConsoleModal';
import { ServiceDeskTicketsModal } from '../health/ServiceDeskTicketsModal';
import { ShopDialog } from '../marketplace/ShopDialog';
import { AgentSystemLogDrawer } from '../AgentSystemLogDrawer';
import { PharmacyRxReviewModal } from '../health/PharmacyRxReviewModal';
import { navigate } from '../../lib/workflowRouting';

export function InterfaceBar({ section }: { section: string }) {
  const [sosOpen, setSosOpen] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [systemLogOpen, setSystemLogOpen] = useState(false);
  const [pharmacyOpen, setPharmacyOpen] = useState(false);
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
    <button type="button" className="care-workspace-label care-workspace-logo-btn" onClick={() => navigate('shop')} aria-label="Studentkare home">
      <Sparkles size={14} aria-hidden="true" />Studentkare <span>/</span><strong>{section}</strong>
    </button>
    <div className="care-interface-actions">
      {isAccountPage && <>
        <button type="button" className="care-bar-action-btn" aria-label="Notifications" onClick={() => setNotificationsOpen(true)}>
          <Bell size={16} /><span className="care-action-label">Alerts</span>
        </button>
        <button type="button" className="care-bar-action-btn care-bar-action-btn-sos" onClick={() => setSosOpen(true)}>
          <ShieldAlert size={16} /><span>SOS</span>
        </button>
      </>}
    </div>
    <NotificationCenterModal isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    <AIAgentsStatusModal isOpen={agentsOpen} onClose={() => setAgentsOpen(false)} />
    <AgentSystemLogDrawer isOpen={systemLogOpen} onClose={() => setSystemLogOpen(false)} />
    <PharmacyRxReviewModal isOpen={pharmacyOpen} onClose={() => setPharmacyOpen(false)} />
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
