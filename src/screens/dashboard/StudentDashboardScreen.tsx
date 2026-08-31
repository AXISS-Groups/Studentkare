import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ProvenancePointer } from '../../components/ProvenancePointer';
import {
  Activity,
  HeartPulse,
  FolderLock,
  Stethoscope,
  ShieldAlert,
  BookOpen,
  Award,
  Package,
  Settings,
  LogOut,
  Sun,
  Moon,
  Plus,
  FileText,
  CheckCircle2,
  Lock,
  QrCode,
  Sparkles,
  Droplet,
  Thermometer,
  Scale,
  CreditCard,
  Building2,
  ChevronRight,
  TrendingUp,
  User,
  ShieldCheck,
  Zap,
  Brain,
  Building,
  PanelLeftClose,
  PanelLeftOpen,
  Camera,
  MessageSquare,
  Phone,
  Mail,
  GraduationCap,
} from 'lucide-react';

import { StudentKareLogo } from '../../components/StudentKareLogo';
import { ARCReasoningSuite } from '../../components/ARCReasoningSuite';
import { HostelHealthSuite } from '../../components/HostelHealthSuite';
import { PageLoaderOverlay } from '../../components/PageLoaderOverlay';
import { AICameraHealthScanner } from '../../components/AICameraHealthScanner';
import { UnifiedDeviceTelemetryConsole } from '../../components/UnifiedDeviceTelemetryConsole';
import { ComprehensiveHealthcareDirectory } from '../../components/ComprehensiveHealthcareDirectory';
import { AgenticRAGEngineConsole } from '../../components/AgenticRAGEngineConsole';

export type DashboardNavTab =
  | 'telemetry'
  | 'vault'
  | 'camp'
  | 'emergency'
  | 'care'
  | 'hostel'
  | 'learn'
  | 'rewards'
  | 'devices'
  | 'arc';

interface DashboardProps {
  onLogout: () => void;
  onOpenAI: () => void;
  onSwitchRole?: (role: 'student' | 'admin' | 'vendor') => void;
}

export const StudentDashboardScreen: React.FC<DashboardProps> = ({
  onLogout,
  onOpenAI,
  onSwitchRole,
}) => {
  const { tokens, isDark, typography } = useTheme();
  const { student, records } = useAppStore();

  const [activeTab, setActiveTab] = useState<DashboardNavTab>('telemetry');
  const [isTabLoading, setIsTabLoading] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [tabLoadingLabel, setTabLoadingLabel] = useState<string>('Loading Module...');
  const [telemetrySubTab, setTelemetrySubTab] = useState<'bp' | 'weight' | 'spo2' | 'glucose' | 'temp' | 'ecg'>('bp');
  const [selectedVaultCat, setSelectedVaultCat] = useState<string>('ALL');
  const [activeCampStation, setActiveCampStation] = useState<number>(0);

  const handleTabChange = (nextTab: DashboardNavTab, labelText: string) => {
    if (nextTab === activeTab) return;
    setTabLoadingLabel(`Loading ${labelText}...`);
    setIsTabLoading(true);
    setTimeout(() => {
      setActiveTab(nextTab);
      setTimeout(() => {
        setIsTabLoading(false);
      }, 200);
    }, 5000);
  };

  // Camp stations definition
  const campStations = [
    { id: 1, title: 'Station 1: Roll ID QR Check-In', status: 'Completed ✓', duration: '45 seconds', details: ['Scans student ID barcode', 'Resolves ABHA address offline', 'Generates encrypted token card'] },
    { id: 2, title: 'Station 2: Auto Vitals Telemetry', status: 'Completed ✓', duration: '90 seconds', details: ['Bluetooth digital BP cuff stream', 'Infrared thermometer temperature', 'Pulse oximeter SpO2 capture'] },
    { id: 3, title: 'Station 3: Vision & Dental Acuity', status: 'In Progress ⏳', duration: '2 minutes', details: ['Digital Snellen eye chart exam', 'High-res intraoral dental imaging', 'Color blindness Ishihara check'] },
    { id: 4, title: 'Station 4: Physician EMR & Scribe', status: 'Queued', duration: '3 minutes', details: ['AI ambient speech-to-FHIR clinical scribe', 'NMC-council verified doctor review', 'Prescription gating for hostel delivery'] },
    { id: 5, title: 'Station 5: Smart Passport Issuance', status: 'Queued', duration: '1 minute', details: ['Generates verifiable health passport', 'Updates ABHA National Locker M1–M3', 'Issues emergency contact NFC badge'] },
  ];

  const filteredRecords =
    selectedVaultCat === 'ALL' ? records : records.filter((r) => r.category === selectedVaultCat);

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexWrap: 'wrap', width: '100%', minHeight: '100vh', backgroundColor: tokens.canvas }}>
      <PageLoaderOverlay isLoading={isTabLoading} label={tabLoadingLabel} />
      
      {/* ─── 1. LEFT SIDEBAR NAVIGATION (COLLAPSIBLE SIDEBAR) ───────────── */}
      <aside
        className="dashboard-sidebar"
        style={{
          width: isSidebarCollapsed ? 76 : 280,
          transition: 'width 220ms ease, padding 220ms ease',
          flexShrink: 0,
          backgroundColor: tokens.surface,
          borderRight: `1px solid ${tokens.ruleSoft}`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: isSidebarCollapsed ? '20px 8px' : '24px 16px',
          position: 'sticky',
          top: 0,
          maxHeight: '100vh',
          boxSizing: 'border-box',
          zIndex: 50,
          overflow: 'visible',
        }}
      >
        {/* Floating Sidebar Edge Toggle Handle */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          style={{
            position: 'absolute',
            right: -14,
            top: 24,
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: tokens.surface,
            border: `1.5px solid ${tokens.action}`,
            color: tokens.action,
            boxShadow: '0 4px 12px rgba(83, 80, 204, 0.2)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            zIndex: 60,
          }}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>

        <div>
          {/* Brand Header */}
          <div style={{ padding: '0 4px 18px', borderBottom: `1px solid ${tokens.ruleSoft}`, display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
            {!isSidebarCollapsed ? (
              <StudentKareLogo size={30} showWordmark={true} showStrapline={true} straplineText="STUDENT PORTAL" />
            ) : (
              <StudentKareLogo size={28} showWordmark={false} showStrapline={false} />
            )}
          </div>

          {/* Student Profile Identity Card */}
          <div style={{ margin: '16px 0', padding: isSidebarCollapsed ? '10px 6px' : 14, borderRadius: 14, backgroundColor: tokens.surface2, border: `1px solid ${tokens.ruleSoft}`, textAlign: isSidebarCollapsed ? 'center' : 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', gap: 10, marginBottom: isSidebarCollapsed ? 0 : 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: tokens.action, color: '#ffffff', fontWeight: 800, display: 'grid', placeItems: 'center', fontSize: 14, flexShrink: 0 }}>
                {student.fullName ? student.fullName.charAt(0) : 'A'}
              </div>
              {!isSidebarCollapsed && (
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: tokens.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {student.fullName || 'Arjun Mehta'}
                  </div>
                  <div style={{ fontSize: 10, color: tokens.text2, fontFamily: typography.fontMono, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {student.university || 'Osmania University'}
                  </div>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${tokens.ruleSoft}` }}>
                <span style={{ fontSize: 10, fontFamily: typography.fontMono, color: tokens.positive, fontWeight: 700 }}>● VERIFIED 18+</span>
                <span style={{ fontSize: 10, fontFamily: typography.fontMono, color: tokens.text3 }}>{student.bloodGroup || 'B+'}</span>
              </div>
            )}
          </div>

          {/* Sidebar Nav Items */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { id: 'telemetry', label: 'Vitals & Telemetry', icon: <HeartPulse size={18} /> },
              { id: 'vault', label: 'Health Records Vault', icon: <FolderLock size={18} />, count: records.length },
              { id: 'camp', label: '5-Station Camp Day', icon: <QrCode size={18} />, badge: 'LIVE' },
              { id: 'emergency', label: 'Emergency 108 Card', icon: <ShieldAlert size={18} />, emergency: true },
              { id: 'care', label: 'Care & Teleconsult', icon: <Stethoscope size={18} /> },
              { id: 'hostel', label: 'Hostel & Campus Ops', icon: <Building size={18} />, badge: 'NEW' },
              { id: 'arc', label: 'ARC-AGI Reasoning', icon: <Brain size={18} />, badge: 'AGI' },
              { id: 'devices', label: 'Connected Devices', icon: <Package size={18} /> },
              { id: 'learn', label: 'Learn Library', icon: <BookOpen size={18} /> },
              { id: 'rewards', label: 'Points & Offers', icon: <Award size={18} />, count: '240 pts' },
            ].map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id as DashboardNavTab, item.label)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: 'none',
                    backgroundColor: isActive
                      ? item.emergency ? tokens.emergency : tokens.action
                      : 'transparent',
                    color: isActive
                      ? '#ffffff'
                      : item.emergency ? tokens.emergency : tokens.text2,
                    fontWeight: isActive ? 700 : 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 140ms ease',
                  }}
                >
                  <span style={{ display: 'grid', placeItems: 'center' }}>{item.icon}</span>
                  {!isSidebarCollapsed && (
                    <>
                      <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                      {item.badge && (
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 9999, backgroundColor: tokens.positive, color: '#060824', fontFamily: typography.fontMono }}>
                          {item.badge}
                        </span>
                      )}
                      {item.count && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? '#ffffff' : tokens.text3, fontFamily: typography.fontMono }}>
                          {item.count}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Controls */}
        <div style={{ paddingTop: 16, borderTop: `1px solid ${tokens.ruleSoft}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onLogout}
            title={isSidebarCollapsed ? 'Sign Out' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 10,
              backgroundColor: tokens.surface2,
              border: `1px solid ${tokens.ruleSoft}`,
              color: tokens.text,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <LogOut size={16} color={tokens.action} />
            {!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ─── 2. MAIN DASHBOARD CONTENT VIEWPORT ───────────────────────── */}
      <main className="dashboard-main" style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 36px' }}>
        
        {/* Top Floating Command Header Bar (Apple / Linear Aesthetics) */}
        <div
          style={{
            backgroundColor: tokens.surface,
            borderRadius: 20,
            border: `1.5px solid ${tokens.rule}`,
            padding: '20px 24px',
            marginBottom: 28,
            boxShadow: '0 8px 30px rgba(83, 80, 204, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontFamily: typography.fontMono, color: tokens.action, fontWeight: 800, backgroundColor: tokens.surface3, padding: '3px 10px', borderRadius: 9999 }}>
                PORTAL // {activeTab.toUpperCase()}
              </span>
              <span style={{ fontSize: 11, fontFamily: typography.fontMono, color: tokens.positive, backgroundColor: tokens.positiveBg, padding: '3px 10px', borderRadius: 9999, fontWeight: 800 }}>
                ABDM GATEWAY ACTIVE ✓
              </span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: tokens.text, margin: 0, letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Good morning, {student.fullName ? student.fullName.split(' ')[0] : 'Arjun'}</span>
              <Sparkles size={20} color={tokens.action} />
            </h1>
            <div style={{ fontSize: 12.5, color: tokens.text2, marginTop: 2 }}>
              {student.university || 'Osmania University'} · Roll Ref: {student.rollNumber || 'CS2026-ARJUN'}
            </div>
          </div>

          {/* Global Quick Action Command Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => handleTabChange('devices', 'Mobile Camera Scan')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: tokens.surface3,
                color: tokens.action,
                border: `1px solid ${tokens.veil}`,
                borderRadius: 12,
                padding: '8px 14px',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <Camera size={14} color={tokens.action} />
              <span>Camera Scan</span>
            </button>

            <button
              onClick={() => handleTabChange('emergency', '108 Emergency ID')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: tokens.emergencyBg,
                color: tokens.emergency,
                border: `1px solid rgba(255, 86, 71, 0.3)`,
                borderRadius: 12,
                padding: '8px 14px',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <ShieldAlert size={14} color={tokens.emergency} />
              <span>108 Emergency ID</span>
            </button>

            <button
              onClick={onOpenAI}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: tokens.action,
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '8px 16px',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(83, 80, 204, 0.35)',
              }}
            >
              <MessageSquare size={14} color="#ffffff" />
              <span>Ask Care AI</span>
            </button>

            {onSwitchRole && (
              <>
                <button
                  onClick={() => onSwitchRole('admin')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: tokens.surface3,
                    color: tokens.action,
                    border: `1px solid ${tokens.veil}`,
                    borderRadius: 12,
                    padding: '8px 14px',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  <span>⚡ Super Admin</span>
                </button>

                <button
                  onClick={() => onSwitchRole('vendor')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: tokens.surface3,
                    color: tokens.action,
                    border: `1px solid ${tokens.veil}`,
                    borderRadius: 12,
                    padding: '8px 14px',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  <span>🏬 Vendor Console</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ─── TAB 1: TELEMETRY & RPM LANDSCAPE (AUTHENTIC IMPILO VIEW) ─── */}
        {activeTab === 'telemetry' && (
          <div>
            {/* The Landscape Telemetry Dashboard Card */}
            <div
              style={{
                backgroundColor: isDark ? tokens.surface : tokens.blue02,
                borderRadius: 24,
                border: `1.5px solid ${tokens.rule}`,
                overflow: 'hidden',
                display: 'flex',
                flexWrap: 'wrap',
                boxShadow: isDark ? '0 20px 50px rgba(0, 0, 0, 0.45)' : '0 12px 36px rgba(35, 34, 105, 0.25)',
                marginBottom: 32,
              }}
            >
              {/* Left Profile Panel */}
              <div
                style={{
                  width: 270,
                  padding: 28,
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M2 13h4l3-8 4 16 3-8h6" stroke="#00b1ff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ color: '#ffffff', fontSize: 18, fontWeight: 800 }}>SA Care RPM</span>
                </div>

                <div style={{ color: '#ffffff', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
                  {student.fullName || 'Arjun Mehta'}
                </div>
                <div style={{ color: '#b1a6f6', fontSize: 12, marginBottom: 18, fontFamily: typography.fontMono }}>
                  DOB {student.dob || '2004-03-14'} (Age 22)
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, fontSize: 12, color: '#d8d8e3' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Phone size={13} color="#b1a6f6" />
                    <span>+91 {student.phone || '98765 43210'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Mail size={13} color="#b1a6f6" />
                    <span>{student.email || 'arjun.m@osmania.ac.in'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GraduationCap size={13} color="#b1a6f6" />
                    <span>{student.university || 'Osmania University'} · CSE 3rd Yr</span>
                  </div>
                </div>

                <div style={{ fontSize: 11, fontWeight: 800, color: '#b1a6f6', letterSpacing: 0.5, marginBottom: 10 }}>
                  CONNECTED TELEMETRY FEEDS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={14} color="#00ffaa" />
                    <span>Omron Digital BP Cuff (ST-02)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={14} color="#00ffaa" />
                    <span>Nonin Bluetooth SpO2 Sensor</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={14} color="#00ffaa" />
                    <span>Camp Station 2 Live Vitals Sync</span>
                  </div>
                </div>
              </div>

              {/* Right Measurement Tabs & Graphs */}
              <div style={{ flex: 1, minWidth: 320, padding: 28, boxSizing: 'border-box' }}>
                {/* Metric Selector Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                  {[
                    { id: 'bp', label: 'Blood Pressure', icon: <HeartPulse size={14} />, val: '118 / 76' },
                    { id: 'weight', label: 'Weight & BMI', icon: <Scale size={14} />, val: '64.2 KG' },
                    { id: 'spo2', label: 'Blood Oxygen', icon: <Droplet size={14} />, val: '99% SpO2' },
                    { id: 'glucose', label: 'Blood Glucose', icon: <Droplet size={14} />, val: '92 mg/dL' },
                    { id: 'temp', label: 'Temperature', icon: <Thermometer size={14} />, val: '98.4°F' },
                    { id: 'ecg', label: 'Cardiac ECG', icon: <Activity size={14} />, val: '72 BPM Sinus' },
                  ].map((m) => {
                    const active = telemetrySubTab === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setTelemetrySubTab(m.id as any)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          borderRadius: 9999,
                          border: `1px solid ${active ? '#ffffff' : 'rgba(255,255,255,0.2)'}`,
                          backgroundColor: active ? '#ffffff' : 'rgba(255,255,255,0.06)',
                          color: active ? '#1a196e' : '#ffffff',
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        {m.icon}
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Metric Average Display Card */}
                <div
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: 16,
                    padding: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <div style={{ color: '#ffffff', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                      {telemetrySubTab === 'bp' && 'Blood Pressure Average'}
                      {telemetrySubTab === 'weight' && 'Weight & Body Composition'}
                      {telemetrySubTab === 'spo2' && 'SpO2 Oxygen Saturation'}
                      {telemetrySubTab === 'glucose' && 'Fasting Blood Glucose'}
                      {telemetrySubTab === 'temp' && 'Core Body Temperature'}
                      {telemetrySubTab === 'ecg' && 'Resting Heart Rate & ECG'}
                    </div>
                    <div style={{ color: '#b1a6f6', fontSize: 12 }}>
                      Campus Health Camp Observation · Verified by Dr. K. Rao
                    </div>
                  </div>
                  <div style={{ color: '#00ffaa', fontSize: 32, fontWeight: 800, fontFamily: typography.fontMono }}>
                    {telemetrySubTab === 'bp' && '118 / 76'}
                    {telemetrySubTab === 'weight' && '64.2 KG'}
                    {telemetrySubTab === 'spo2' && '99%'}
                    {telemetrySubTab === 'glucose' && '92 mg/dL'}
                    {telemetrySubTab === 'temp' && '98.4°F'}
                    {telemetrySubTab === 'ecg' && '72 BPM'}
                  </div>
                </div>

                {/* Graph Area */}
                <div
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.22)',
                    borderRadius: 16,
                    padding: 20,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ color: '#ffffff', fontSize: 15, fontWeight: 800, marginBottom: 16 }}>
                    Continuous Physiological Timeline Record
                  </div>

                  <div style={{ width: '100%', height: 180 }}>
                    <svg width="100%" height="180" viewBox="0 0 700 180" preserveAspectRatio="none" style={{ display: 'block' }}>
                      {[25, 60, 95, 130, 165].map((y, idx) => (
                        <line key={idx} x1="30" y1={y} x2="690" y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                      ))}

                      {/* Vertical range columns */}
                      {[
                        { x: 60, y1: 55, y2: 130 },
                        { x: 130, y1: 60, y2: 125 },
                        { x: 200, y1: 50, y2: 120 },
                        { x: 270, y1: 58, y2: 132 },
                        { x: 340, y1: 54, y2: 128 },
                        { x: 410, y1: 65, y2: 135 },
                        { x: 480, y1: 60, y2: 130 },
                        { x: 550, y1: 52, y2: 122 },
                        { x: 620, y1: 68, y2: 138 },
                        { x: 670, y1: 62, y2: 130 },
                      ].map((bar, i) => (
                        <line key={i} x1={bar.x} y1={bar.y1} x2={bar.x} y2={bar.y2} stroke="rgba(177, 166, 246, 0.4)" strokeWidth="6" strokeLinecap="round" />
                      ))}

                      {/* Glowing Cyan Line */}
                      <path
                        d="M 60 95 Q 130 90, 200 84 T 270 94 T 340 92 T 410 102 T 480 105 T 550 98 T 620 112 T 670 110"
                        fill="none"
                        stroke="#00b1ff"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />

                      {/* Dots */}
                      {[
                        { x: 60, y: 95 }, { x: 130, y: 90 }, { x: 200, y: 84 }, { x: 270, y: 94 },
                        { x: 340, y: 92 }, { x: 410, y: 102 }, { x: 480, y: 105 }, { x: 550, y: 98 },
                        { x: 620, y: 112 }, { x: 670, y: 110 },
                      ].map((pt, i) => (
                        <g key={i}>
                          <circle cx={pt.x} cy={pt.y} r="5" fill="#00b1ff" style={{ filter: 'drop-shadow(0 0 6px #00b1ff)' }} />
                          <circle cx={pt.x} cy={pt.y} r="2.5" fill="#ffffff" />
                        </g>
                      ))}
                    </svg>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, padding: '0 10px' }}>
                    {['Sep 25', 'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Aug 26'].map((d, i) => (
                      <span key={i} style={{ color: '#b1a6f6', fontSize: 10, fontFamily: typography.fontMono }}>{d}</span>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Actions & Telemetry Summary Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
              
              {/* Card 1: Recent CBC Panel */}
              <div style={{ backgroundColor: tokens.surface, borderRadius: 20, border: `1.5px solid ${tokens.rule}`, padding: 24, boxShadow: '0 6px 24px rgba(83, 80, 204, 0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tokens.surface3, border: `1px solid ${tokens.veil}`, display: 'grid', placeItems: 'center' }}>
                        <FileText size={20} color={tokens.action} />
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: tokens.text, letterSpacing: -0.3 }}>Recent CBC Blood Panel</div>
                        <div style={{ fontSize: 12, color: tokens.text2, fontFamily: typography.fontMono }}>14 Mar 2026 · SRL Diagnostics</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: tokens.positive, backgroundColor: tokens.positiveBg, padding: '3px 8px', borderRadius: 9999, fontFamily: typography.fontMono }}>
                      NABL VERIFIED
                    </span>
                  </div>

                  <div style={{ fontSize: 13, color: tokens.text2, lineHeight: 1.5, marginBottom: 18 }}>
                    Photometric Haemoglobin recorded at <b style={{ color: tokens.text }}>11.2 g/dL</b> with physician consultation flag attached.
                  </div>
                </div>

                <button
                  onClick={() => handleTabChange('vault', 'Health Records Vault')}
                  style={{
                    backgroundColor: tokens.surface2,
                    border: `1px solid ${tokens.ruleSoft}`,
                    borderRadius: 12,
                    padding: '10px 16px',
                    color: tokens.action,
                    fontWeight: 800,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Open Diagnostic Vault Record</span>
                  <span>→</span>
                </button>
              </div>

              {/* Card 2: Health Camp Station Token */}
              <div style={{ backgroundColor: tokens.surface, borderRadius: 20, border: `1.5px solid ${tokens.rule}`, padding: 24, boxShadow: '0 6px 24px rgba(83, 80, 204, 0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: tokens.positiveBg, display: 'grid', placeItems: 'center' }}>
                        <QrCode size={20} color={tokens.positive} />
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: tokens.text, letterSpacing: -0.3 }}>5-Station Camp Token</div>
                        <div style={{ fontSize: 12, color: tokens.text2, fontFamily: typography.fontMono }}>Thu 21 Aug · Osmania University</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: tokens.action, backgroundColor: tokens.surface3, padding: '3px 8px', borderRadius: 9999, fontFamily: typography.fontMono }}>
                      OFFLINE READY
                    </span>
                  </div>

                  <div style={{ fontSize: 13, color: tokens.text2, lineHeight: 1.5, marginBottom: 18 }}>
                    Paperless check-in pass for 5-station medical camp with <b style={{ color: tokens.text }}>ABHA QR token</b> ready for offline scanning.
                  </div>
                </div>

                <button
                  onClick={() => handleTabChange('camp', '5-Station Health Camp')}
                  style={{
                    backgroundColor: tokens.positiveBg,
                    border: `1px solid rgba(0, 255, 170, 0.3)`,
                    borderRadius: 12,
                    padding: '10px 16px',
                    color: tokens.positive,
                    fontWeight: 800,
                    fontSize: 12.5,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Launch Live Camp Passport</span>
                  <span>→</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ─── TAB 2: HEALTH RECORD VAULT ───────────────────────────────── */}
        {activeTab === 'vault' && (
          <div>
            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
              {[
                { id: 'ALL', label: 'All Records' },
                { id: 'LAB', label: 'Lab Reports' },
                { id: 'CAMP_REPORT', label: 'Camp Summaries' },
                { id: 'VACCINE', label: 'Vaccines' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedVaultCat(c.id)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 9999,
                    border: `1px solid ${selectedVaultCat === c.id ? tokens.action : tokens.rule}`,
                    backgroundColor: selectedVaultCat === c.id ? tokens.action : tokens.surface,
                    color: selectedVaultCat === c.id ? '#ffffff' : tokens.text2,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Records List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filteredRecords.map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    backgroundColor: tokens.surface,
                    borderRadius: 20,
                    border: `1px solid ${tokens.ruleSoft}`,
                    padding: 24,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontFamily: typography.fontMono, padding: '4px 10px', borderRadius: 9999, backgroundColor: tokens.surface3, color: tokens.action, fontWeight: 800 }}>
                        {rec.category}
                      </span>
                      <span style={{ fontSize: 12, fontFamily: typography.fontMono, color: tokens.text3 }}>
                        {rec.date}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: tokens.positive, fontWeight: 700, fontFamily: typography.fontMono }}>
                      ✓ FHIR R4 ENCRYPTED
                    </span>
                  </div>

                  <div style={{ fontSize: 18, fontWeight: 800, color: tokens.text, marginBottom: 4 }}>
                    {rec.title}
                  </div>
                  <div style={{ fontSize: 13, color: tokens.text2, marginBottom: 16 }}>
                    {rec.facilityName} {rec.doctorName ? `· ${rec.doctorName}` : ''}
                  </div>

                  {/* Observations */}
                  {rec.observations.length > 0 && (
                    <div style={{ backgroundColor: tokens.surface2, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {rec.observations.map((obs) => (
                        <div key={obs.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: tokens.text }}>{obs.display}</div>
                            {obs.referenceRange && (
                              <div style={{ fontSize: 12, color: tokens.text3, fontFamily: typography.fontMono }}>Ref: {obs.referenceRange} {obs.unit}</div>
                            )}
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: obs.isAbnormal ? tokens.attention : tokens.positive, fontFamily: typography.fontMono }}>
                            {obs.value} {obs.unit}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 3: 5-STATION HEALTH CAMP PIPELINE ────────────────────── */}
        {activeTab === 'camp' && (
          <div>
            {/* Station Pipeline Selector */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
              {campStations.map((st, idx) => {
                const isActive = activeCampStation === idx;
                return (
                  <button
                    key={st.id}
                    onClick={() => setActiveCampStation(idx)}
                    style={{
                      flex: '1 1 160px',
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: `1px solid ${isActive ? tokens.action : tokens.rule}`,
                      backgroundColor: isActive ? tokens.surface : tokens.canvas,
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: isActive ? '0 6px 20px rgba(82, 79, 217, 0.18)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: isActive ? tokens.action : tokens.text3, fontFamily: typography.fontMono }}>STATION 0{st.id}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: st.status.includes('Completed') ? tokens.positive : tokens.attention }}>{st.status}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: tokens.text }}>{st.title.replace(`Station ${st.id}: `, '')}</div>
                  </button>
                );
              })}
            </div>

            {/* Active Station Bento Grid Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              
              {/* Bento Card 1: Main Station Hero Card (Spans Wide) */}
              <div
                style={{
                  gridColumn: '1 / -1',
                  backgroundColor: tokens.surface,
                  borderRadius: 24,
                  border: `1.5px solid ${tokens.rule}`,
                  padding: 28,
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 8px 30px rgba(83, 80, 204, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 20,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono, backgroundColor: tokens.surface3, padding: '4px 10px', borderRadius: 9999 }}>
                      LIVE BENTO STATION 0{campStations[activeCampStation].id}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: campStations[activeCampStation].status.includes('Completed') ? tokens.positive : tokens.attention, backgroundColor: campStations[activeCampStation].status.includes('Completed') ? tokens.positiveBg : tokens.attentionBg, padding: '4px 10px', borderRadius: 9999 }}>
                      {campStations[activeCampStation].status}
                    </span>
                  </div>

                  <div style={{ fontSize: 24, fontWeight: 900, color: tokens.text, letterSpacing: -0.5, marginBottom: 6 }}>
                    {campStations[activeCampStation].title}
                  </div>
                  <div style={{ fontSize: 13, color: tokens.text2 }}>
                    High-speed execution pipeline · Est. {campStations[activeCampStation].duration} per student check-in
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ backgroundColor: tokens.canvas, borderRadius: 16, padding: '12px 20px', border: `1px solid ${tokens.ruleSoft}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>LATENCY</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono }}>42 ms</div>
                  </div>
                  <div style={{ backgroundColor: tokens.canvas, borderRadius: 16, padding: '12px 20px', border: `1px solid ${tokens.ruleSoft}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>BUFFER</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: tokens.positive, fontFamily: typography.fontMono }}>SQLITE</div>
                  </div>
                </div>
              </div>

              {/* Bento Cards 2, 3, 4: Feature Execution Steps Grid */}
              {campStations[activeCampStation].details.map((dt, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: tokens.canvas,
                    borderRadius: 20,
                    padding: 22,
                    border: `1px solid ${tokens.ruleSoft}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 16,
                    transition: 'transform 180ms ease, boxShadow 180ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: tokens.surface3, border: `1px solid ${tokens.veil}`, display: 'grid', placeItems: 'center' }}>
                      <CheckCircle2 size={18} color={tokens.positive} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono, backgroundColor: tokens.surface, padding: '4px 10px', borderRadius: 9999, border: `1px solid ${tokens.ruleSoft}` }}>
                      STEP 0{i + 1}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: tokens.text, marginBottom: 4 }}>
                      {dt}
                    </div>
                    <div style={{ fontSize: 12, color: tokens.text2, lineHeight: 1.4 }}>
                      Automated execution gate connected to campus telemetry.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: tokens.positive, fontFamily: typography.fontMono }}>
                    <span>VERIFIED PASSED</span>
                    <CheckCircle2 size={13} />
                  </div>
                </div>
              ))}

              {/* Bento Card 5: Security & NMC Verification Status (Spans 2 columns on wide screens) */}
              <div
                style={{
                  gridColumn: '1 / -1',
                  backgroundColor: tokens.surface2,
                  borderRadius: 20,
                  padding: 24,
                  border: `1.5px solid ${tokens.ruleSoft}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tokens.positiveBg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <ShieldCheck size={24} color={tokens.positive} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: tokens.text }}>NMC Medical Council Verification & Encryption</div>
                    <div style={{ fontSize: 12, color: tokens.text2, marginTop: 2 }}>
                      Verified by Dr. Ananya Rao, MD · Encrypted via AES-256 for ABDM National Locker M1–M3
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: tokens.text, fontFamily: typography.fontMono, backgroundColor: tokens.surface, padding: '8px 14px', borderRadius: 10, border: `1px solid ${tokens.ruleSoft}` }}>
                    ABHA: {student.abhaAddress || 'arjun.mehta@abdm'}
                  </span>
                  <span style={{ fontSize: 11, padding: '8px 14px', borderRadius: 10, backgroundColor: tokens.positiveBg, color: tokens.positive, fontWeight: 800, fontFamily: typography.fontMono }}>
                    AES-256 SECURED ✓
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ─── TAB 4: EMERGENCY 108 CARD ────────────────────────────────── */}
        {activeTab === 'emergency' && (
          <div style={{ backgroundColor: tokens.emergency, borderRadius: 24, padding: 36, color: '#ffffff' }}>
            <div style={{ fontSize: 12, fontFamily: typography.fontMono, letterSpacing: 1, marginBottom: 8, color: 'rgba(255,255,255,0.8)' }}>
              108 NATIONAL EMERGENCY MEDICAL ID
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
              <div style={{ fontSize: 32, fontWeight: 800 }}>{student.fullName || 'ARJUN MEHTA'}</div>
              <div style={{ fontSize: 22, fontFamily: typography.fontMono, fontWeight: 800 }}>AGE 22</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.3)', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>BLOOD GROUP</div>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: typography.fontMono }}>{student.bloodGroup || 'B+ (Rh Positive)'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>KNOWN ALLERGIES</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Penicillin, Sulfa drugs</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>CHRONIC CONDITIONS</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Asthma</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>CURRENT MEDICATIONS</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Salbutamol inhaler</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>IN ACUTE EMERGENCY CALL</div>
                <div style={{ fontSize: 36, fontWeight: 800, fontFamily: typography.fontMono }}>108</div>
                <div style={{ fontSize: 13, fontFamily: typography.fontMono, color: 'rgba(255,255,255,0.9)' }}>
                  Amma: +91 98111 22334 · Campus Warden: +91 40230 16000
                </div>
              </div>

              <div style={{ padding: 12, backgroundColor: '#ffffff', borderRadius: 16, display: 'grid', placeItems: 'center' }}>
                <QrCode size={72} color={tokens.emergency} />
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: CONNECTED DEVICES KITS ────────────────────────────── */}
        {activeTab === 'devices' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
              <div style={{ backgroundColor: tokens.surface, borderRadius: 24, border: `1px solid ${tokens.rule}`, padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ padding: 12, borderRadius: 14, backgroundColor: 'rgba(0, 255, 170, 0.15)' }}>
                    <Scale size={24} color={tokens.positive} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: tokens.text }}>Smart Weight Scale</div>
                    <div style={{ fontSize: 12, color: tokens.positive, fontWeight: 700 }}>● Bluetooth Sync Online</div>
                  </div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: tokens.text, fontFamily: typography.fontMono, marginBottom: 8 }}>
                  167.58 <span style={{ fontSize: 16, color: tokens.text3 }}>LBS</span>
                </div>
                <div style={{ fontSize: 13, color: tokens.text2, lineHeight: 1.5 }}>
                  Last measured 3.31.24. Automatic telemetry dispatch to student FHIR archive.
                </div>
              </div>

              <div style={{ backgroundColor: tokens.surface, borderRadius: 24, border: `1px solid ${tokens.rule}`, padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ padding: 12, borderRadius: 14, backgroundColor: 'rgba(0, 177, 255, 0.15)' }}>
                    <HeartPulse size={24} color={tokens.cyan} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: tokens.text }}>Digital BP Monitor Console</div>
                    <div style={{ fontSize: 12, color: tokens.positive, fontWeight: 700 }}>● Connected via Station 2</div>
                  </div>
                </div>
                <div style={{ fontSize: 32, fontWeight: 800, color: tokens.text, fontFamily: typography.fontMono, marginBottom: 8 }}>
                  117 / 73 <span style={{ fontSize: 16, color: tokens.text3 }}>mmHg</span>
                </div>
                <div style={{ fontSize: 13, color: tokens.text2, lineHeight: 1.5 }}>
                  Pulse 72 BPM. Normal clinical reference range under university protocol.
                </div>
              </div>
            </div>

            {/* Unified Multi-Device Telemetry Engine & Mobile Pedometer */}
            <div style={{ marginBottom: 24 }}>
              <UnifiedDeviceTelemetryConsole />
            </div>

            {/* AI Mobile Camera Health Telemetry Scanner */}
            <div>
              <AICameraHealthScanner />
            </div>
          </div>
        )}

        {/* ─── TAB 6: CARE & COMPREHENSIVE HEALTHCARE DIRECTORY ─────────── */}
        {activeTab === 'care' && <ComprehensiveHealthcareDirectory />}

        {activeTab === 'learn' && <AgenticRAGEngineConsole />}

        {activeTab === 'hostel' && <HostelHealthSuite />}

        {activeTab === 'arc' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <ARCReasoningSuite />
            <AgenticRAGEngineConsole />
          </div>
        )}

        {activeTab === 'rewards' && (
          <div style={{ backgroundColor: tokens.surface, borderRadius: 24, border: `1px solid ${tokens.rule}`, padding: 32 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: tokens.reward, marginBottom: 12 }}>Wellness Points: 240 Available</div>
            <div style={{ fontSize: 14, color: tokens.text2, lineHeight: 1.6 }}>
              Earned for completing annual health camp stations and reading health guides. Redeemable for discounts at NABL partner labs.
            </div>
          </div>
        )}

      </main>

      {/* ─── 3. MOBILE BOTTOM NAVIGATION BAR (Auto-visible on Mobile Screens < 768px) ─── */}
      <nav
        className="mobile-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          backgroundColor: tokens.surface,
          borderTop: `1px solid ${tokens.ruleSoft}`,
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 9999,
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.2)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {[
          { id: 'telemetry', label: 'Vitals', icon: <HeartPulse size={20} /> },
          { id: 'vault', label: 'Vault', icon: <FolderLock size={20} /> },
          { id: 'camp', label: 'Camp', icon: <QrCode size={20} /> },
          { id: 'emergency', label: '108 SOS', icon: <ShieldAlert size={20} />, emergency: true },
          { id: 'care', label: 'Care', icon: <Stethoscope size={20} /> },
          { id: 'rewards', label: 'Rewards', icon: <Award size={20} /> },
        ].map((item) => {
          const isActive = activeTab === item.id;
          const color = item.emergency
            ? tokens.emergency
            : isActive
            ? tokens.action
            : tokens.text3;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as DashboardNavTab)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                background: 'transparent',
                border: 'none',
                color,
                cursor: 'pointer',
                flex: 1,
                padding: '6px 0',
              }}
            >
              {item.icon}
              <span style={{ fontSize: 10, fontWeight: isActive ? 800 : 600 }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

    </div>
  );
};
