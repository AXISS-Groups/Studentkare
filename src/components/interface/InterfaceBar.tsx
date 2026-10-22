import { useState, useRef, useEffect } from 'react';
import { Bell, PhoneCall, ShieldAlert, Sparkles } from 'lucide-react';
import { EMERGENCY_CONTACTS, telHref } from '../health/EmergencyBar';
import { useT } from '@/i18n';
import { NotificationCenterModal } from '../health/NotificationCenterModal';
import { ShopDialog } from '../marketplace/ShopDialog';
import { navigate } from '../../lib/utils/workflowRouting';
import { Icon } from '@/design-system/icons';
import { useAuth } from '../../data/contexts/AuthContext';

export function InterfaceBar({ section }: { section: string }) {
  const t = useT();
  const [sosOpen, setSosOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const isAccountPage = !['Marketplace', 'Sign in', 'Create an account'].includes(section);
  const isStudent = useAuth().user?.role === 'STUDENT';

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
    <button type="button" className="care-workspace-label care-workspace-logo-btn" onClick={() => navigate('shop')} aria-label={t('bar.home')}>
      <Sparkles size={14} aria-hidden="true" />Studentkare <span>/</span><strong>{section}</strong>
    </button>
    <div className="care-interface-actions">
      {isAccountPage && <>
        <button type="button" className="care-bar-action-btn" aria-label={t('bar.notifications')} onClick={() => setNotificationsOpen(true)}>
          <Bell size={16} aria-hidden="true" /><span className="care-action-label">{t('bar.alerts')}</span>
        </button>
        {/* SOS is for students. Staff dashboards (partner, clinician, admin) do not show it. */}
        {isStudent && (
          <button type="button" className="care-bar-action-btn care-bar-action-btn-sos" onClick={() => setSosOpen(true)}>
            <ShieldAlert size={16} aria-hidden="true" /><span>{t('bar.sos')}</span>
          </button>
        )}
      </>}
    </div>
    <NotificationCenterModal isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    {sosOpen && <EmergencyHelplinesDialog onClose={() => setSosOpen(false)} onSendSos={isStudent ? () => { setSosOpen(false); navigate('sos'); } : undefined} />}
  </div>;
}

/** The SOS helplines dialog, shared with the Super Admin shell so there is one copy of it. */
export function EmergencyHelplinesDialog({ onClose, onSendSos, onFindCare }: {
  onClose: () => void;
  /** Students only: alert their campus (SOS is a student feature). */
  onSendSos?: () => void;
  /** "Nearest hospitals": opens Find care, after the helplines (plan tier1-care-directory-2026-10-21 §3). */
  onFindCare?: () => void;
}) {
  const t = useT();
  return <ShopDialog title={t('ebar.dialogTitle')} onClose={onClose}>
    <p>{t('ebar.dialogIntro')}</p>
    {onSendSos && <button type="button" className="health-button health-button-primary" onClick={onSendSos}><ShieldAlert size={16} aria-hidden="true" />{t('ebar.sendSos')}</button>}
    <div className="care-emergency-directory">
      {EMERGENCY_CONTACTS.map(contact => <div key={contact.id}>
        <div><strong>{t(contact.name)}</strong><small>{contact.number} · {t(contact.description)}</small></div>
        <a href={telHref(contact.number)} className="health-button" aria-label={t('ebar.callSpoken', { name: t(contact.name), number: contact.number })}><PhoneCall size={16} aria-hidden="true" />{t('ebar.call')}</a>
      </div>)}
    </div>
    {onFindCare && <button type="button" className="health-button" onClick={onFindCare} aria-label={t('fc.nearestHospitalsSpoken')} data-testid="helplines-find-care"><Icon name="hospital" size={16} />{t('fc.nearestHospitals')}</button>}
  </ShopDialog>;
}
