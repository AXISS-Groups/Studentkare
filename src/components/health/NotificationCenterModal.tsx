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

export const DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: '🚨 Urgent Campus Blood SOS Alert',
    message: 'Emergency O- Blood needed at Campus Health Centre. 5 matched student donors notified.',
    timestamp: '10 mins ago',
    type: 'sos',
    read: false,
  },
  {
    id: 'n2',
    title: '⏰ Medication Tracker Reminder',
    message: 'Vitamin D3 60K dose scheduled for 01:30 PM. Log dose to claim +10 Care Points!',
    timestamp: '35 mins ago',
    type: 'medication',
    read: false,
  },
  {
    id: 'n3',
    title: '🦟 Monsoon Dengue Campus Health Advisory',
    message: 'Prevent stagnant water in coolers. Book NABL Platelet & CBC test with 20% off.',
    timestamp: '2 hours ago',
    type: 'disease',
    read: false,
  },
  {
    id: 'n4',
    title: '🔬 Lab Phlebotomist Dispatched',
    message: 'Technician Rajesh Kumar assigned for 06:30 AM Fasting sample pickup at Hostel Block B.',
    timestamp: '3 hours ago',
    type: 'lab',
    read: true,
  },
];

export function NotificationCenterModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(DEMO_NOTIFICATIONS);

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
