import React from 'react';
import { Bell, X } from 'lucide-react';
import { navigate } from '../../lib/workflowRouting';
import { useT } from '@/i18n';
import '../../theme/workflows.css';

/**
 * The bell in the top bar. It points to the real inbox rather than listing
 * anything itself.
 *
 * This used to open on four invented alerts (a blood SOS, a dose reminder, a
 * dengue advisory and a named technician sent to the user's hostel), and then
 * on a list that was never loaded but still said "All caught up! No active
 * notifications." — a claim about the inbox it had not read.
 */
export function NotificationCenterModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const t = useT();
  if (!isOpen) return null;

  const openInbox = () => { onClose(); navigate('notifications'); };

  return (
    <div className="wf-modal-backdrop" onClick={onClose}>
      <div className="wf-modal-card" role="dialog" aria-modal="true" aria-labelledby="notification-center-title" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <button type="button" aria-label={t('care.close')} className="wf-modal-close" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div aria-hidden="true" style={{ background: 'var(--sk-color-action-soft)', color: 'var(--sk-color-action)', padding: 8, borderRadius: 8 }}>
            <Bell size={22} />
          </div>
          <h3 id="notification-center-title" style={{ margin: 0, fontSize: '1.15rem', color: 'var(--sk-color-text)' }}>{t('notif.title')}</h3>
        </div>

        <p style={{ margin: 0, color: 'var(--sk-color-text-2)' }}>{t('care.notifCenter.body')}</p>

        <div className="wf-row-actions" style={{ marginTop: 16 }}>
          <button type="button" className="health-button health-button-primary" style={{ minHeight: 44 }} onClick={openInbox}>
            {t('care.notifCenter.open')}
          </button>
          <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={onClose}>
            {t('care.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
