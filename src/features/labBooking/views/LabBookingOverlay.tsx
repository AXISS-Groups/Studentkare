import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate } from '@/lib/utils/workflowRouting';
import { useT } from '@/i18n';
import { LabBookingRoute } from './LabBookingFlow';
import './lab-booking-overlay.css';

/**
 * The lab booking flow over the web shop, opened by a lab card's "Book".
 * A full-screen page (role="dialog", aria-modal) portalled to the body.
 *
 * Not react-native's Modal (live-run audit #2): on the web its portal node is
 * detached by React's StrictMode double effect run, so the Pay step rendered
 * off the page; and its z-index (9999) sat above the design-system Sheet the
 * slot picker opens (90), hiding the picker in a production build. This page
 * sits just below the sheets, and the sheet keeps its own focus trap, Esc and
 * scroll lock (design-system/overlays/useOverlay).
 */
export function LabBookingOverlay({ itemId, onClose }: { itemId: string; onClose: () => void }): React.ReactElement | null {
  const t = useT();
  const { user } = useAuth();
  const page = useRef<HTMLDivElement>(null);
  const leave = (route: 'prescriptions' | 'records') => { onClose(); navigate(route); };

  useEffect(() => {
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    page.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      returnTo?.focus();
    };
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      ref={page}
      className="sk-lab-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('labbook.title')}
      tabIndex={-1}
      data-testid="lab-booking-overlay"
      onKeyDown={(event) => {
        // The slot sheet is portalled outside this page and handles its own Esc;
        // React still bubbles its keys here, so only keys on this page close it.
        if (event.key !== 'Escape' || !page.current?.contains(event.target as Node)) return;
        event.preventDefault();
        onClose();
      }}
    >
      <LabBookingRoute
        openItemId={itemId}
        studentName={user?.fullName ?? ''}
        links={{ onExit: onClose, onReports: () => leave('records'), onViewBooking: () => leave('prescriptions') }}
      />
    </div>,
    document.body,
  );
}
