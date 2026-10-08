import React, { useState } from 'react';
import { Bell, Check, X, AlertTriangle, Pill, Bug, CheckCircle2 } from 'lucide-react';
import '../../theme/workflows.css';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'sos' | 'medication' | 'disease' | 'lab';
  read: boolean;
}

export function NotificationCenterModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  // Starts empty. This used to open on four invented alerts — a blood SOS, a
  // dose reminder, a dengue advisory and a named technician dispatched to the
  // user's hostel. Real notifications live in the /notifications inbox.

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <div className="wf-modal-backdrop" onClick={onClose}>
      <div className="wf-modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <button className="wf-modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#f0f9ff', color: '#0284c7', padding: 8, borderRadius: 8 }}>
              <Bell size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>Health & SOS Notifications</h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {unreadCount > 0 && (
            <button className="health-text-button" onClick={markAllRead} style={{ fontSize: '0.8rem' }}>
              <Check size={14} /> Mark all read
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
          {notifications.length === 0 && (
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>No notifications yet.</p>
          )}
          {notifications.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${item.read ? '#e2e8f0' : '#bae6fd'}`,
                background: item.read ? '#ffffff' : '#f0f9ff',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    background: item.type === 'sos' ? '#ffe4e6' : item.type === 'medication' ? '#ecfdf5' : '#fffbebfb',
                    color: item.type === 'sos' ? '#e11d48' : item.type === 'medication' ? '#059669' : '#b45309',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.type === 'sos' ? (
                    <AlertTriangle size={16} />
                  ) : item.type === 'medication' ? (
                    <Pill size={16} />
                  ) : (
                    <Bug size={16} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>{item.title}</div>
                  <div style={{ fontSize: '0.81rem', color: '#334155', marginTop: 2, lineHeight: 1.35 }}>
                    {item.message}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 4 }}>{item.timestamp}</div>
                </div>
              </div>

              <button
                onClick={() => removeNotification(item.id)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {notifications.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
              <CheckCircle2 size={32} color="#059669" style={{ margin: '0 auto 8px auto' }} />
              <p style={{ margin: 0 }}>All caught up! No active notifications.</p>
            </div>
          )}
        </div>

        <button className="health-button health-button-primary" onClick={onClose} style={{ marginTop: 16 }}>
          Close Notifications
        </button>
      </div>
    </div>
  );
}
