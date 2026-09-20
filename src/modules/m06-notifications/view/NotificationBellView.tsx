import React, { useState, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Bell, CheckCheck, AlertTriangle, ShieldCheck, Pill, Calendar, RefreshCw, X } from 'lucide-react';
import type { NotificationCategory } from '../domain/Notification';
import { useNotificationViewModel } from '../viewmodel/useNotificationViewModel';
import './notifications.css';

const CategoryIcon: React.FC<{ category: NotificationCategory }> = ({ category }) => {
  switch (category) {
    case 'EMERGENCY':
      return <AlertTriangle size={16} className="notif-icon emergency" />;
    case 'MEDICATION':
      return <Pill size={16} className="notif-icon medication" />;
    case 'APPOINTMENT':
      return <Calendar size={16} className="notif-icon appointment" />;
    case 'SYSTEM':
    default:
      return <ShieldCheck size={16} className="notif-icon system" />;
  }
};

/**
 * Presentational View Component for Notification Bell Overlay.
 * Consumes ViewModel via `useNotificationViewModel()`.
 */
export const NotificationBellView: React.FC = observer(() => {
  const { state, actions } = useNotificationViewModel();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="notif-bell-container" ref={containerRef}>
      <button
        type="button"
        className="notif-bell-trigger"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={`Campus notifications, ${state.unreadCount} unread`}
      >
        <Bell size={20} />
        {state.unreadCount > 0 && (
          <span className={`notif-badge ${state.emergencyCount > 0 ? 'badge-emergency' : ''}`}>
            {state.unreadCount > 99 ? '99+' : state.unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown-card" role="dialog" aria-label="Campus Notification Center">
          <div className="notif-header">
            <div>
              <h3>Campus Activity</h3>
              <small>{state.unreadCount} unread notifications</small>
            </div>
            <div className="notif-header-actions">
              <button
                type="button"
                className="notif-action-btn"
                onClick={() => actions.fetchNotifications()}
                title="Sync notifications"
                disabled={state.isLoading}
              >
                <RefreshCw size={14} className={state.isLoading ? 'spin' : ''} />
              </button>
              {state.unreadCount > 0 && (
                <button
                  type="button"
                  className="notif-action-btn"
                  onClick={() => actions.markAllAsRead()}
                  title="Mark all as read"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              <button
                type="button"
                className="notif-action-btn"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="notif-filter-strip">
            {(['all', 'unread', 'emergency'] as const).map(f => (
              <button
                key={f}
                type="button"
                className={`notif-filter-tab ${state.filter === f ? 'active' : ''}`}
                onClick={() => actions.setFilter(f)}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          {state.error && (
            <div className="notif-error-banner">
              <AlertTriangle size={14} />
              <span>{state.error}</span>
            </div>
          )}

          <div className="notif-list-scroll">
            {state.filteredItems.length === 0 ? (
              <div className="notif-empty-state">
                <ShieldCheck size={28} color="#94a3b8" />
                <p>No notifications in this view.</p>
              </div>
            ) : (
              state.filteredItems.map(item => (
                <div
                  key={item.id}
                  className={`notif-item-card ${item.read ? 'is-read' : 'is-unread'} category-${item.category.toLowerCase()}`}
                  onClick={() => actions.markAsRead(item.id)}
                >
                  <div className="notif-item-header">
                    <span className="notif-category-icon">
                      <CategoryIcon category={item.category} />
                    </span>
                    <strong className="notif-title">{item.title}</strong>
                    <span className="notif-time">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="notif-body">{item.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});
