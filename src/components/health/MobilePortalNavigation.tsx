import React, { useEffect, useRef } from 'react';
import { ArrowRight, LogOut, X } from 'lucide-react';
import type { DashboardNavTab } from '../../screens/dashboard/StudentDashboardScreen';

const destinations: { id: DashboardNavTab; label: string }[] = [
  { id: 'overview', label: 'My Health Overview' },
  { id: 'exercises', label: 'Exercise & Movement' },
  { id: 'insurance', label: 'Insurance & Cover' },
  { id: 'telemetry', label: 'Vitals & Telemetry' },
  { id: 'vault', label: 'Health Records Vault' },
  { id: 'care', label: 'Care & Teleconsult' },
  { id: 'wellbeing', label: 'Wellbeing & Insights' },
  { id: 'camp', label: '5-Station Camp Day' },
  { id: 'devices', label: 'Connected Devices' },
  { id: 'emergency', label: 'Emergency 108 Card' },
  { id: 'hostel', label: 'Hostel & Campus Ops' },
  { id: 'learn', label: 'Learn Library' },
  { id: 'rewards', label: 'Points & Offers' },
  { id: 'arc', label: 'ARC-AGI Reasoning' },
];

export function MobilePortalNavigation({ open, activeTab, onClose, onNavigate, onLogout }: {
  open: boolean;
  activeTab: DashboardNavTab;
  onClose: () => void;
  onNavigate: (tab: DashboardNavTab) => void;
  onLogout: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  return <dialog ref={dialogRef} className="health-experience health-mobile-dialog" aria-labelledby="health-navigation-title" onCancel={onClose}>
    <div className="health-row"><h2 id="health-navigation-title">Your care space</h2><button className="health-text-button" aria-label="Close portal navigation" onClick={onClose}><X size={23} /></button></div>
    <nav aria-label="All portal sections">{destinations.map(item => <button key={item.id} aria-current={activeTab === item.id ? 'page' : undefined} onClick={() => { onClose(); onNavigate(item.id); }}>{item.label}<ArrowRight size={15} /></button>)}</nav>
    <button className="health-text-button" onClick={() => { onClose(); onLogout(); }}><LogOut size={17} />Back to home</button>
  </dialog>;
}
