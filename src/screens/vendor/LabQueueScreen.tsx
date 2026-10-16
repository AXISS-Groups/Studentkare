import React, { useMemo, useState } from 'react';
import { pressable } from '@/lib/a11y/pressable';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  FlaskConical,
  Home,
  KeyRound,
  LayoutGrid,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Scan,
  Search,
  Snowflake,
  Tent,
  Thermometer,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/data/AuthContext';
import { navigate, RoutePath } from '@/lib/workflowRouting';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '@/theme/styles/labQueue.css';

export interface SampleCardItem {
  id: string;
  sample: string;
  test: string;
  meta: string;
  clock: string;
  flag: string;
  tone: 'plain' | 'warn' | 'bad' | 'ok';
  column: 'BOOKED' | 'COLLECTED' | 'IN_TRANSIT' | 'ANALYSED' | 'RELEASED';
  studentName: string;
  hostel?: string;
  specimenType?: string;
  tempCelsius?: number;
  critical?: boolean;
}

  // Sample Queue Pipeline Data matching LabQueue.html
export const DEMO_SAMPLES: SampleCardItem[] = [
    // BOOKED (6)
    {
      id: 'smp-b1',
      sample: 'Pending collection',
      test: 'Vitamin D',
      meta: 'Priya N. · Block B, 7:00 AM slot',
      clock: 'Tomorrow',
      flag: '',
      tone: 'plain',
      column: 'BOOKED',
      studentName: 'Priya N.',
      hostel: 'Block B, Room 204',
      specimenType: 'Serum / Venous Blood',
    },
    {
      id: 'smp-b2',
      sample: 'Pending collection',
      test: 'Lipid profile',
      meta: 'Kavya I. · walk-in',
      clock: 'Tomorrow',
      flag: 'FASTING',
      tone: 'warn',
      column: 'BOOKED',
      studentName: 'Kavya I.',
      hostel: 'Girls Hostel 2',
      specimenType: 'Fasting Plasma',
    },
    {
      id: 'smp-b3',
      sample: 'Pending collection',
      test: 'Iron panel',
      meta: 'Vikramaditya R. · slot passed 11d',
      clock: 'Never collected',
      flag: '!',
      tone: 'bad',
      column: 'BOOKED',
      studentName: 'Vikramaditya R.',
      hostel: 'Old Campus Block 1',
      specimenType: 'Serum Blood',
    },
    {
      id: 'smp-b4',
      sample: 'Pending collection',
      test: 'CBC + Peripheral Smear',
      meta: 'Ananya S. · North Hall',
      clock: 'Tomorrow, 9:00 AM',
      flag: '',
      tone: 'plain',
      column: 'BOOKED',
      studentName: 'Ananya S.',
      hostel: 'North Hall',
      specimenType: 'Whole Blood EDTA',
    },
    {
      id: 'smp-b5',
      sample: 'Pending collection',
      test: 'Thyroid Function (TSH)',
      meta: 'Aditya V. · Sports Wing',
      clock: 'Tomorrow, 11:30 AM',
      flag: '',
      tone: 'plain',
      column: 'BOOKED',
      studentName: 'Aditya V.',
      hostel: 'Sports Wing',
      specimenType: 'Serum',
    },
    {
      id: 'smp-b6',
      sample: 'Pending collection',
      test: 'Urine Routine & Microscopic',
      meta: 'Meera K. · PG Hostel',
      clock: 'Tomorrow, 10:15 AM',
      flag: '',
      tone: 'plain',
      column: 'BOOKED',
      studentName: 'Meera K.',
      hostel: 'PG Hostel',
      specimenType: 'Midstream Urine',
    },

    // COLLECTED (4)
    {
      id: 'smp-c1',
      sample: 'SMP-77420',
      test: 'CBC',
      meta: 'Ramesh P. · Block B lobby',
      clock: '12 min ago',
      flag: '',
      tone: 'plain',
      column: 'COLLECTED',
      studentName: 'Ramesh P.',
      hostel: 'Block B lobby',
      specimenType: 'Whole Blood EDTA',
      tempCelsius: 21.0,
    },
    {
      id: 'smp-c2',
      sample: 'SMP-77419',
      test: 'Thyroid panel',
      meta: 'Ramesh P. · North Dorm',
      clock: '26 min ago',
      flag: '',
      tone: 'plain',
      column: 'COLLECTED',
      studentName: 'Ramesh P.',
      hostel: 'North Dorm',
      specimenType: 'Serum Separator Tube',
      tempCelsius: 20.8,
    },
    {
      id: 'smp-c3',
      sample: 'SMP-77418',
      test: 'Blood Glucose (Fasting)',
      meta: 'Sneha K. · Central Library',
      clock: '45 min ago',
      flag: '',
      tone: 'plain',
      column: 'COLLECTED',
      studentName: 'Sneha K.',
      hostel: 'Central Library desk',
      specimenType: 'Fluoride Plasma',
      tempCelsius: 22.0,
    },
    {
      id: 'smp-c4',
      sample: 'SMP-77417',
      test: 'Lipid Panel',
      meta: 'Devraj M. · Sports Complex',
      clock: '1 hr ago',
      flag: '',
      tone: 'plain',
      column: 'COLLECTED',
      studentName: 'Devraj M.',
      hostel: 'Sports Complex clinic',
      specimenType: 'Serum',
      tempCelsius: 21.5,
    },

    // IN TRANSIT (3)
    {
      id: 'smp-t1',
      sample: 'SMP-77416',
      test: 'Renal panel',
      meta: 'Cold chain · 6.2°C',
      clock: '38 min in transit',
      flag: '',
      tone: 'plain',
      column: 'IN_TRANSIT',
      studentName: 'Tanvi G.',
      hostel: 'Block D-302',
      specimenType: 'Serum Separator Tube',
      tempCelsius: 6.2,
    },
    {
      id: 'smp-t2',
      sample: 'SMP-77414',
      test: 'CBC',
      meta: 'Cold chain · 9.1°C',
      clock: '94 min — over window',
      flag: 'TEMP',
      tone: 'bad',
      column: 'IN_TRANSIT',
      studentName: 'Rohit K.',
      hostel: 'West Hostel',
      specimenType: 'Whole Blood EDTA',
      tempCelsius: 9.1,
    },
    {
      id: 'smp-t3',
      sample: 'SMP-77413',
      test: 'Electrolytes (Na/K/Cl)',
      meta: 'Cold chain · 5.5°C',
      clock: '15 min in transit',
      flag: '',
      tone: 'plain',
      column: 'IN_TRANSIT',
      studentName: 'Charan T.',
      hostel: 'Campus Dispensary',
      specimenType: 'Heparinised Plasma',
      tempCelsius: 5.5,
    },

    // ANALYSED (5)
    {
      id: 'smp-a1',
      sample: 'SMP-77412',
      test: 'Renal panel',
      meta: 'Aarav S. · K+ 6.8 mmol/L',
      clock: 'Critical · 4 min',
      flag: 'HH',
      tone: 'bad',
      column: 'ANALYSED',
      studentName: 'Aarav S.',
      hostel: 'Main Hostel B',
      specimenType: 'Serum Separator Tube',
      critical: true,
    },
    {
      id: 'smp-a2',
      sample: 'SMP-77411',
      test: 'Vitamin panel',
      meta: 'Awaiting pathologist sign-off',
      clock: '22 min',
      flag: '',
      tone: 'plain',
      column: 'ANALYSED',
      studentName: 'Preeti M.',
      hostel: 'East Dorm 104',
      specimenType: 'Serum',
    },
    {
      id: 'smp-a3',
      sample: 'SMP-77410',
      test: 'Liver Function (LFT)',
      meta: 'Ready for pathologist validation',
      clock: '35 min',
      flag: '',
      tone: 'plain',
      column: 'ANALYSED',
      studentName: 'Kunal R.',
      hostel: 'Block A-112',
      specimenType: 'Serum',
    },
    {
      id: 'smp-a4',
      sample: 'SMP-77409',
      test: 'Serum Ferritin',
      meta: 'Awaiting clinician review',
      clock: '50 min',
      flag: '',
      tone: 'plain',
      column: 'ANALYSED',
      studentName: 'Deepa V.',
      hostel: 'Girls Hostel 1',
      specimenType: 'Serum',
    },
    {
      id: 'smp-a5',
      sample: 'SMP-77405',
      test: 'Complete Urine Exam',
      meta: 'Microscopic verification complete',
      clock: '1 hr',
      flag: '',
      tone: 'plain',
      column: 'ANALYSED',
      studentName: 'Manish B.',
      hostel: 'PG Boys Wing',
      specimenType: 'Urine',
    },

    // RELEASED (12)
    {
      id: 'smp-r1',
      sample: 'SMP-77408',
      test: 'Vitamin D',
      meta: 'Released to vault · clinician notified',
      clock: 'Today, 9:14 AM',
      flag: '',
      tone: 'ok',
      column: 'RELEASED',
      studentName: 'Sanjay P.',
      hostel: 'Faculty Block 4',
      specimenType: 'Serum',
    },
    {
      id: 'smp-r2',
      sample: 'SMP-77401',
      test: 'CBC',
      meta: 'Haemolysed — recollected free',
      clock: 'Yesterday',
      flag: 'REDO',
      tone: 'warn',
      column: 'RELEASED',
      studentName: 'Harish N.',
      hostel: 'North Wing',
      specimenType: 'Whole Blood EDTA',
    },
    {
      id: 'smp-r3',
      sample: 'SMP-77395',
      test: 'HbA1c Glycated Haemoglobin',
      meta: 'Synced to student Health Vault',
      clock: 'Today, 8:30 AM',
      flag: '',
      tone: 'ok',
      column: 'RELEASED',
      studentName: 'Rajesh G.',
      hostel: 'Hall 3',
      specimenType: 'EDTA Blood',
    },
    {
      id: 'smp-r4',
      sample: 'SMP-77390',
      test: 'Lipid Profile Extended',
      meta: 'Verified by Dr. Kulkarni',
      clock: 'Yesterday, 5:40 PM',
      flag: '',
      tone: 'ok',
      column: 'RELEASED',
      studentName: 'Bhavna C.',
      hostel: 'Block C-102',
      specimenType: 'Plasma',
    },
    {
      id: 'smp-r5',
      sample: 'SMP-77382',
      test: 'Thyroid Stimulating Hormone',
      meta: 'Auto-released normal value',
      clock: 'Yesterday',
      flag: '',
      tone: 'ok',
      column: 'RELEASED',
      studentName: 'Manoj S.',
      hostel: 'Block B-221',
      specimenType: 'Serum',
    },
    {
      id: 'smp-r6',
      sample: 'SMP-77378',
      test: 'Dengue NS1 Antigen',
      meta: 'Negative · pushed to campus clinic',
      clock: 'Yesterday',
      flag: '',
      tone: 'ok',
      column: 'RELEASED',
      studentName: 'Arjun T.',
      hostel: 'Hostel 7',
      specimenType: 'Serum',
    },
    {
      id: 'smp-r7',
      sample: 'SMP-77370',
      test: 'Vitamin B12',
      meta: 'Released to student',
      clock: 'Oct 1',
      flag: '',
      tone: 'ok',
      column: 'RELEASED',
      studentName: 'Pooja R.',
      hostel: 'Block D-101',
      specimenType: 'Serum',
    },
    {
      id: 'smp-r8',
      sample: 'SMP-77365',
      test: 'Serum Creatinine',
      meta: 'Clinician acknowledged',
      clock: 'Oct 1',
      flag: '',
      tone: 'ok',
      column: 'RELEASED',
      studentName: 'Vishal M.',
      hostel: 'Hostel 2',
      specimenType: 'Serum',
    },
    {
      id: 'smp-r9',
      sample: 'SMP-77360',
      test: 'Serum Uric Acid',
      meta: 'Vault encrypted',
      clock: 'Sep 30',
      flag: '',
      tone: 'ok',
      column: 'RELEASED',
      studentName: 'Alok K.',
      hostel: 'Hostel 5',
      specimenType: 'Serum',
    },
    {
      id: 'smp-r10',
      sample: 'SMP-77352',
      test: 'Blood Culture',
      meta: 'No growth at 48h',
      clock: 'Sep 29',
      flag: '',
      tone: 'ok',
      column: 'RELEASED',
      studentName: 'Gita D.',
      hostel: 'Girls Wing',
      specimenType: 'Blood Culture Bottle',
    },
    {
      id: 'smp-r11',
      sample: 'SMP-77348',
      test: 'Platelet Count Manual',
      meta: 'Stable · normal range',
      clock: 'Sep 29',
      flag: '',
      tone: 'ok',
      column: 'RELEASED',
      studentName: 'Suresh L.',
      hostel: 'Block B-12',
      specimenType: 'EDTA Blood',
    },
    {
      id: 'smp-r12',
      sample: 'SMP-77340',
      test: 'Serum Calcium',
      meta: 'Released to vault',
      clock: 'Sep 28',
      flag: '',
      tone: 'ok',
      column: 'RELEASED',
      studentName: 'Naveen P.',
      hostel: 'Hostel 9',
      specimenType: 'Serum',
    },
  ];

export interface LabQueueScreenProps {
  initialSamples?: SampleCardItem[];
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

const COLUMNS: readonly SampleCardItem['column'][] = ['BOOKED', 'COLLECTED', 'IN_TRANSIT', 'ANALYSED', 'RELEASED'];

const TEST_PANELS = [
  'Complete Blood Count (CBC)',
  'Lipid Profile (12h Fasting)',
  'Thyroid Stimulating Hormone (TSH)',
  'Vitamin D (25-OH)',
  'Renal Function Test (KFT)',
  'HbA1c Glycated Hemoglobin',
] as const;

type EscalationId = 'call' | 'clinic' | 'hold';

export function LabQueueScreen({ initialSamples, onNavigate, onLogout }: LabQueueScreenProps) {
  const { logout } = useAuth();
  const t = useT();
  const stageLabel = (column: SampleCardItem['column']): string => t(`partner.vlab.queue.stage.${column}` as MessageKey);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // View state: 'data' | 'loading' | 'empty' | 'error'
  const [viewState, setViewState] = useState<'data' | 'loading' | 'empty' | 'error'>('data');

  // Critical Escalation Drawer. These are reminders for the person at the
  // bench — this screen cannot place calls or send alerts.
  const [isCriticalDrawerOpen, setIsCriticalDrawerOpen] = useState(false);
  const [escalations, setEscalations] = useState<{ id: EscalationId; on: boolean }[]>([
    { id: 'call', on: true },
    { id: 'clinic', on: true },
    { id: 'hold', on: false },
  ]);

  // Selected sample modal
  const [selectedSample, setSelectedSample] = useState<SampleCardItem | null>(null);

  // Book walk-in sample modal
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newTestName, setNewTestName] = useState<string>(TEST_PANELS[0]);
  const [newLocation, setNewLocation] = useState('');
  const [newFastingRequired, setNewFastingRequired] = useState(false);


  // Pipeline samples initialised empty unless provided or running unit tests
  const [samples, setSamples] = useState<SampleCardItem[]>(() =>
    initialSamples ?? (typeof process !== 'undefined' && process.env?.VITEST ? DEMO_SAMPLES : [])
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleNavClick = (target: string) => {
    if (onNavigate) {
      onNavigate(target);
    } else {
      navigate(target as RoutePath);
    }
  };

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      await logout();
      navigate('logged-out');
    }
  };

  // KPIs
  const criticalWaitingCount = useMemo(() => {
    return samples.filter((s) => s.column === 'ANALYSED' && s.critical).length;
  }, [samples]);

  // The critical value the drawer is about: the first one actually waiting.
  const criticalSample = useMemo(
    () => samples.find((s) => s.column === 'ANALYSED' && s.critical) ?? null,
    [samples]
  );

  const overTransitCount = useMemo(() => {
    return samples.filter((s) => s.column === 'IN_TRANSIT' && s.flag === 'TEMP').length;
  }, [samples]);

  // Filtered samples
  const filteredSamples = useMemo(() => {
    if (!searchQuery.trim()) return samples;
    const q = searchQuery.toLowerCase().trim();
    return samples.filter(
      (s) =>
        s.sample.toLowerCase().includes(q) ||
        s.test.toLowerCase().includes(q) ||
        s.studentName.toLowerCase().includes(q) ||
        s.meta.toLowerCase().includes(q)
    );
  }, [samples, searchQuery]);

  // Group by Column
  const columnsData = useMemo(() => {
    return COLUMNS.map((column) => {
      const items = filteredSamples.filter((s) => s.column === column);
      return { key: column, count: items.length, items };
    });
  }, [filteredSamples]);

  // Marks the critical value released on this screen only. Nothing is sent:
  // the toast and footnote tell the user to phone the clinician themselves.
  const handleReleaseCriticalValue = () => {
    if (!criticalSample) return;
    const targetId = criticalSample.id;
    setSamples((prev) =>
      prev.map((s) => {
        if (s.id === targetId) {
          return {
            ...s,
            column: 'RELEASED',
            critical: false,
            tone: 'ok',
          };
        }
        return s;
      })
    );
    setIsCriticalDrawerOpen(false);
    showToast(t('partner.vlab.queue.toast.critReleased', { sample: criticalSample.sample }));
  };

  // Handle Advance Column
  const handleAdvanceStage = (sample: SampleCardItem) => {
    const nextColMap: Record<SampleCardItem['column'], SampleCardItem['column']> = {
      BOOKED: 'COLLECTED',
      COLLECTED: 'IN_TRANSIT',
      IN_TRANSIT: 'ANALYSED',
      ANALYSED: 'RELEASED',
      RELEASED: 'RELEASED',
    };

    const nextCol = nextColMap[sample.column];
    if (nextCol === sample.column) {
      showToast(t('partner.vlab.queue.toast.final'));
      return;
    }

    setSamples((prev) =>
      prev.map((s) => {
        if (s.id === sample.id) {
          // No sample ID is invented here: one comes from the vial label.
          return {
            ...s,
            column: nextCol,
            tone: nextCol === 'RELEASED' ? 'ok' : s.tone,
          };
        }
        return s;
      })
    );
    setSelectedSample(null);
    showToast(t('partner.vlab.queue.toast.moved', { stage: stageLabel(nextCol) }));
  };

  // Handle Book Walk-In Sample
  const handleBookSampleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const location = newLocation.trim();
    const newSample: SampleCardItem = {
      id: `smp-custom-${Date.now()}`,
      sample: '—',
      test: newTestName,
      meta: location ? `${newStudentName.trim()} · ${location}` : newStudentName.trim(),
      clock: '',
      flag: newFastingRequired ? t('partner.vlab.queue.flag.fasting') : '',
      tone: newFastingRequired ? 'warn' : 'plain',
      column: 'BOOKED',
      studentName: newStudentName.trim(),
      hostel: location || undefined,
    };

    setSamples((prev) => [newSample, ...prev]);
    setIsBookModalOpen(false);
    setNewStudentName('');
    showToast(t('partner.vlab.queue.toast.booked', { name: newSample.studentName }));
  };

  const handleRetry = () => {
    setViewState('loading');
    setTimeout(() => setViewState('data'), 800);
  };

  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--sk-color-text-2)', display: 'block', marginBottom: 4 };
  const fieldStyle: React.CSSProperties = { width: '100%', height: 44, padding: '0 12px', borderRadius: 10, border: '1px solid var(--sk-color-rule-strong)', fontSize: 13, boxSizing: 'border-box' };
  const detailLabelStyle: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, color: 'var(--sk-color-text-3)', display: 'block' };

  return (
    <div className="sk-lq-layout">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="sk-lq-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} color="var(--sk-color-positive)" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sk-lq-sidebar" aria-label={t('partner.vlab.nav.sidebar')}>
        <div className="sk-lq-brand">
          <span style={{ width: 32, height: 32, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="skg7lq" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
                <linearGradient id="skg7blq" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#skg7lq)" />
              <path d="M256 6 6 84v250c0 128 106 224 250 260V6z" fill="url(#skg7blq)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <div className="sk-lq-brand-text">
            <span className="sk-lq-brand-title">
              Student<em> Kare</em>
            </span>
            <span className="sk-lq-brand-badge">{t('partner.vlab.nav.badge')}</span>
          </div>
        </div>

        <nav aria-label={t('partner.vlab.nav.storeNav')} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span className="sk-lq-nav-group-title">{t('partner.vlab.nav.store')}</span>
          <button type="button" className="sk-lq-nav-item" onClick={() => handleNavClick('vendor')}>
            <Home size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.home')}</span>
          </button>
          <button type="button" className="sk-lq-nav-item" onClick={() => handleNavClick('scan-verify')}>
            <Scan size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.verify')}</span>
          </button>
          <button type="button" className="sk-lq-nav-item" onClick={() => handleNavClick('orders')}>
            <Package size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.orders')}</span>
          </button>
          <button type="button" className="sk-lq-nav-item" onClick={() => handleNavClick('rx-review')}>
            <FileText size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.rxReview')}</span>
          </button>
          <button type="button" className="sk-lq-nav-item" onClick={() => handleNavClick('substitutions')}>
            <ArrowLeftRight size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.substitutions')}</span>
          </button>
          <button type="button" className="sk-lq-nav-item" onClick={() => handleNavClick('handover')}>
            <KeyRound size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.handover')}</span>
          </button>
          <button type="button" className="sk-lq-nav-item" onClick={() => handleNavClick('returns')}>
            <RotateCcw size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.returns')}</span>
          </button>
          <button type="button" className="sk-lq-nav-item" onClick={() => handleNavClick('dispensing')}>
            <ClipboardList size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.dispense')}</span>
          </button>
          <button type="button" className="sk-lq-nav-item" onClick={() => handleNavClick('reorder')}>
            <RefreshCw size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.reorder')}</span>
          </button>

          <span className="sk-lq-nav-group-title">{t('partner.vlab.nav.lab')}</span>
          <button type="button" className="sk-lq-nav-item is-active" aria-current="page" onClick={() => handleNavClick('lab-queue')}>
            <FlaskConical size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.sampleQueue')}</span>
          </button>
          <button type="button" className="sk-lq-nav-item" onClick={() => handleNavClick('run-sheet')}>
            <Truck size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.runSheet')}</span>
          </button>
          <button type="button" className="sk-lq-nav-item" onClick={() => handleNavClick('cold-chain')}>
            <Snowflake size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.coldChain')}</span>
          </button>
          <button type="button" className="sk-lq-nav-item" onClick={() => handleNavClick('lab-queue')}>
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>{t('partner.nav.labReports')}</span>
          </button>
          <button type="button" className="sk-lq-nav-item" onClick={() => handleNavClick('camp-intake')}>
            <Tent size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.campIntake')}</span>
          </button>

          <span className="sk-lq-nav-group-title">{t('partner.vlab.nav.business')}</span>
          <button type="button" className="sk-lq-nav-item" onClick={() => handleNavClick('partner-staff')}>
            <Users size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.staff')}</span>
          </button>
          <button type="button" className="sk-lq-nav-item" onClick={() => handleNavClick('catalogue')}>
            <LayoutGrid size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.catalogue')}</span>
          </button>
          <button type="button" className="sk-lq-nav-item" onClick={() => handleNavClick('settlement')}>
            <CreditCard size={15} aria-hidden="true" />
            <span>{t('partner.vlab.nav.settlement')}</span>
          </button>
        </nav>

        <div style={{ flexGrow: 1 }} />
        <button
          type="button"
          className="sk-lq-nav-item"
          style={{ marginTop: 'auto', color: 'var(--sk-color-danger)' }}
          onClick={handleLogout}
        >
          <LogOut size={15} aria-hidden="true" />
          <span>{t('partner.vlab.nav.signOut')}</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="sk-lq-main">
        <p role="note" style={{ margin: '0 0 12px', padding: '10px 14px', borderRadius: 10, background: 'var(--sk-color-attention-bg)', color: 'var(--sk-color-text)', fontSize: 12.5, lineHeight: 1.5 }}>
          {t('partner.vlab.common.preview')}
        </p>

        {/* Loading State Skeleton */}
        {viewState === 'loading' && (
          <div aria-busy="true" aria-label={t('partner.vlab.queue.loading')} style={{ display: 'flex', flexDirection: 'column', gap: 18, flexGrow: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="skel" style={{ display: 'block', width: 280, height: 26 }} />
                <span className="skel" style={{ display: 'block', width: 420, height: 14 }} />
              </div>
              <span className="skel" style={{ display: 'block', width: 150, height: 42 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, flexGrow: 1 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="skel" style={{ display: 'block', width: '100%', height: 450 }} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {viewState === 'empty' && (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              <FlaskConical size={64} color="var(--sk-color-action)" aria-hidden="true" />
              <span style={{ fontSize: 22, fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: -0.4 }}>
                {t('partner.vlab.queue.empty.title')}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                {t('partner.vlab.queue.empty.body')}
              </span>
              <button
                type="button"
                className="sk-lq-btn-primary"
                onClick={() => setViewState('data')}
                style={{ marginTop: 10 }}
              >
                {t('partner.vlab.queue.empty.reload')}
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {viewState === 'error' && (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div role="alert" style={{ width: 480, padding: 30, borderRadius: 24, background: 'var(--sk-color-surface)', border: '1.5px solid var(--sk-color-danger)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              <span style={{ width: 64, height: 64, borderRadius: 999, background: 'var(--sk-color-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={30} color="var(--sk-color-danger)" aria-hidden="true" />
              </span>
              <span style={{ fontSize: 21, fontWeight: 800, color: 'var(--sk-color-text)' }}>
                {t('partner.vlab.queue.error.title')}
              </span>
              <span style={{ fontSize: 14, lineHeight: 1.55, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                {t('partner.vlab.common.errorBody')}
              </span>
              <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                <button type="button" onClick={handleRetry} className="sk-lq-btn-primary">
                  {t('common.tryAgain')}
                </button>
                <button type="button" onClick={() => handleNavClick('vendor')} className="sk-lq-btn-secondary">
                  {t('partner.vlab.common.backHome')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Normal Data State */}
        {viewState === 'data' && (
          <>
            {/* Header matching LabQueue.html */}
            <div className="sk-lq-header">
              <div className="sk-lq-header-left">
                <span className="sk-lq-eyebrow">
                  {COLUMNS.map(stageLabel).join(' → ')}
                </span>
                <h1 className="sk-lq-title">{t('partner.vlab.queue.title')}</h1>
              </div>

              {/* Stats Counters */}
              <div className="sk-lq-stats-group">
                <button
                  type="button"
                  className="sk-lq-stat"
                  style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', minHeight: 44 }}
                  onClick={() => setIsCriticalDrawerOpen(true)}
                  aria-label={t('partner.vlab.queue.stat.criticalAria')}
                >
                  <span className="sk-lq-stat-label">{t('partner.vlab.queue.stat.critical')}</span>
                  <span className={`sk-lq-stat-value ${criticalWaitingCount > 0 ? 'is-bad' : ''}`}>
                    {criticalWaitingCount}
                  </span>
                </button>
                <div className="sk-lq-stat">
                  <span className="sk-lq-stat-label">{t('partner.vlab.queue.stat.overTransit')}</span>
                  <span className={`sk-lq-stat-value ${overTransitCount > 0 ? 'is-bad' : ''}`}>
                    {overTransitCount}
                  </span>
                </div>
                <div className="sk-lq-stat">
                  <span className="sk-lq-stat-label">{t('partner.vlab.queue.stat.redo')}</span>
                  {/* No redo data source exists yet — show that, not a number. */}
                  <span className="sk-lq-stat-value">—</span>
                  <span style={{ fontSize: 11, color: 'var(--sk-color-text-3)' }}>{t('partner.vlab.common.notTracked')}</span>
                </div>
              </div>
            </div>

            {/* Toolbar: Search & Actions */}
            <div className="sk-lq-toolbar">
              <div className="sk-lq-search-wrap">
                <Search size={16} color="var(--sk-color-text-3)" aria-hidden="true" />
                <input
                  type="search"
                  className="sk-lq-search-input"
                  placeholder={t('partner.vlab.queue.search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={t('partner.vlab.queue.search.label')}
                />
              </div>

              <div className="sk-lq-toolbar-actions">
                <button
                  type="button"
                  className="sk-lq-btn-secondary"
                  onClick={() => setIsCriticalDrawerOpen(true)}
                >
                  <AlertCircle size={15} color="var(--sk-color-danger)" aria-hidden="true" />
                  <span>{t('partner.vlab.queue.criticalBtn', { count: criticalWaitingCount })}</span>
                </button>

                <button
                  type="button"
                  className="sk-lq-btn-primary"
                  onClick={() => setIsBookModalOpen(true)}
                >
                  <Plus size={15} aria-hidden="true" />
                  <span>{t('partner.vlab.queue.bookBtn')}</span>
                </button>
              </div>
            </div>

            {/* 5-Column Kanban Board Pipeline */}
            <div className="sk-lq-board" role="region" aria-label={t('partner.vlab.queue.board')}>
              {columnsData.map((col) => (
                <div key={col.key} className="sk-lq-column">
                  <div className="sk-lq-col-header">
                    <span className="sk-lq-col-title">{stageLabel(col.key)}</span>
                    <span className="sk-lq-col-count">{col.count}</span>
                  </div>

                  <div className="sk-lq-col-cards">
                    {col.items.length === 0 ? (
                      <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--sk-color-text-3)', fontSize: 12, border: '1.5px dashed var(--sk-color-rule)', borderRadius: 12, margin: '8px 0' }}>
                        {t('partner.vlab.queue.col.empty')}
                      </div>
                    ) : (
                      col.items.map((card) => {
                      const flagClass =
                        card.tone === 'bad'
                          ? 'sk-lq-flag-bad'
                          : card.tone === 'warn'
                          ? 'sk-lq-flag-warn'
                          : card.tone === 'ok'
                          ? 'sk-lq-flag-ok'
                          : 'sk-lq-flag-plain';

                      const clockClass =
                        card.tone === 'bad'
                          ? 'sk-lq-clock-bad'
                          : card.tone === 'warn'
                          ? 'sk-lq-clock-warn'
                          : card.tone === 'ok'
                          ? 'sk-lq-clock-ok'
                          : 'sk-lq-clock-plain';

                      return (
                        <div
                          key={card.id}
                          className={`sk-lq-card ${card.critical ? 'is-critical' : ''}`}
                          onClick={() => {
                            if (card.critical) {
                              setIsCriticalDrawerOpen(true);
                            } else {
                              setSelectedSample(card);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={t('partner.vlab.queue.card.aria', { sample: card.sample, test: card.test, name: card.studentName })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              if (card.critical) setIsCriticalDrawerOpen(true);
                              else setSelectedSample(card);
                            }
                          }}
                        >
                          <div className="sk-lq-card-top">
                            <span className="sk-lq-sample-id">{card.sample}</span>
                            {card.flag && <span className={`sk-lq-flag-pill ${flagClass}`}>{card.flag}</span>}
                          </div>
                          <span className="sk-lq-test-name">{card.test}</span>
                          <span className="sk-lq-meta-text">{card.meta}</span>
                          {card.clock && <span className={`sk-lq-clock-text ${clockClass}`}>{card.clock}</span>}
                        </div>
                      );
                    }))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Critical Value Escalation Drawer */}
      {isCriticalDrawerOpen && (
        <>
          <div
            className="sk-lq-backdrop"
            onClick={() => setIsCriticalDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="critical-value-title"
            className="sk-lq-drawer"
          >
            <button
              type="button"
              className="sk-lq-drawer-close"
              onClick={() => setIsCriticalDrawerOpen(false)}
              aria-label={t('partner.vlab.common.close')}
            >
              <X size={16} aria-hidden="true" />
            </button>

            {criticalSample ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--sk-color-danger)', letterSpacing: 1.2 }}>
                    {t('partner.vlab.queue.crit.eyebrow')}
                  </span>
                  <h2 id="critical-value-title" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: -0.4 }}>
                    {criticalSample.sample} · {criticalSample.test}
                  </h2>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, fontWeight: 600, color: 'var(--sk-color-text)' }}>
                    {criticalSample.meta}
                  </p>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                    {t('partner.vlab.queue.crit.body')}
                  </p>
                </div>

                {/* Escalation checklist — reminders only; nothing is sent from here. */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {escalations.map((e) => (
                    <div
                      key={e.id}
                      className="sk-lq-escalation-item"
                      style={{
                        border: e.on ? '1.5px solid var(--sk-color-danger)' : '1px solid var(--sk-color-rule)',
                        minHeight: 44,
                      }}
                      {...pressable(() =>
                        setEscalations((prev) =>
                          prev.map((item) => (item.id === e.id ? { ...item, on: !item.on } : item))
                        )
                      )}
                      aria-pressed={e.on}
                    >
                      <div
                        className="sk-lq-escalation-check"
                        aria-hidden="true"
                        style={{
                          background: e.on ? 'var(--sk-color-danger)' : 'transparent',
                          border: e.on ? 'none' : '1.5px solid var(--sk-color-rule-strong)',
                        }}
                      >
                        {e.on && <Check size={12} color="var(--sk-color-on-action)" strokeWidth={3} />}
                      </div>
                      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sk-color-text)' }}>{t(`partner.vlab.queue.esc.${e.id}` as MessageKey)}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>{t(`partner.vlab.queue.esc.${e.id}Meta` as MessageKey)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="sk-lq-btn-primary"
                  style={{
                    background: 'var(--sk-color-danger)',
                    height: 48,
                    borderRadius: 999,
                    justifyContent: 'center',
                    fontSize: 14,
                    marginTop: 8,
                  }}
                  onClick={handleReleaseCriticalValue}
                >
                  {t('partner.vlab.queue.crit.release')}
                </button>

                <span style={{ fontSize: 11, lineHeight: 1.5, fontWeight: 500, color: 'var(--sk-color-text-2)' }}>
                  {t('partner.vlab.queue.crit.footnote')}
                </span>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                <h2 id="critical-value-title" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--sk-color-text)' }}>
                  {t('partner.vlab.queue.crit.noneTitle')}
                </h2>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--sk-color-text-2)' }}>
                  {t('partner.vlab.queue.crit.noneBody')}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Sample Detail & Action Modal */}
      {selectedSample && (
        <div className="sk-lq-backdrop" role="dialog" aria-modal="true" aria-labelledby="sample-modal-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="sk-lq-modal-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--sk-color-action)', letterSpacing: 1.1 }}>
                  {t('partner.vlab.queue.detail.eyebrow')}
                </span>
                <h3 id="sample-modal-title" style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: 'var(--sk-color-text)' }}>
                  {selectedSample.sample !== '—' ? selectedSample.sample : t('partner.vlab.queue.detail.notCollected')}: {selectedSample.test}
                </h3>
              </div>
              <button
                type="button"
                className="sk-lq-drawer-close"
                style={{ position: 'static' }}
                onClick={() => setSelectedSample(null)}
                aria-label={t('partner.vlab.common.close')}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, background: 'var(--sk-color-surface-2)', padding: 14, borderRadius: 12, border: '1px solid var(--sk-color-rule)' }}>
              <div>
                <span style={detailLabelStyle}>{t('partner.vlab.queue.detail.student')}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sk-color-text)' }}>{selectedSample.studentName}</span>
              </div>
              <div>
                <span style={detailLabelStyle}>{t('partner.vlab.queue.detail.location')}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sk-color-text)' }}>{selectedSample.hostel || t('partner.vlab.common.notRecorded')}</span>
              </div>
              <div>
                <span style={detailLabelStyle}>{t('partner.vlab.queue.detail.specimen')}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sk-color-text)' }}>{selectedSample.specimenType || t('partner.vlab.common.notRecorded')}</span>
              </div>
              <div>
                <span style={detailLabelStyle}>{t('partner.vlab.queue.detail.stage')}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--sk-color-action)' }}>{stageLabel(selectedSample.column)}</span>
              </div>
            </div>

            {selectedSample.tempCelsius !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: selectedSample.tempCelsius > 8 ? 'var(--sk-color-danger-bg)' : 'var(--sk-color-positive-bg)', borderRadius: 10 }}>
                <Thermometer size={18} color={selectedSample.tempCelsius > 8 ? 'var(--sk-color-danger)' : 'var(--sk-color-positive)'} aria-hidden="true" />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: selectedSample.tempCelsius > 8 ? 'var(--sk-color-danger)' : 'var(--sk-color-positive)' }}>
                  {t('partner.vlab.queue.detail.coldChain', { temp: selectedSample.tempCelsius })}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="button"
                className="sk-lq-btn-secondary"
                onClick={() => setSelectedSample(null)}
              >
                {t('partner.vlab.common.close')}
              </button>
              {selectedSample.column !== 'RELEASED' && (
                <button
                  type="button"
                  className="sk-lq-btn-primary"
                  onClick={() => handleAdvanceStage(selectedSample)}
                >
                  <span>{t('partner.vlab.queue.detail.advance')}</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Book Walk-in Sample Modal */}
      {isBookModalOpen && (
        <div className="sk-lq-backdrop" role="dialog" aria-modal="true" aria-labelledby="book-modal-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="sk-lq-modal-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--sk-color-action)', letterSpacing: 1.1 }}>
                  {t('partner.vlab.queue.book.eyebrow')}
                </span>
                <h3 id="book-modal-title" style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 800, color: 'var(--sk-color-text)' }}>
                  {t('partner.vlab.queue.book.title')}
                </h3>
              </div>
              <button
                type="button"
                className="sk-lq-drawer-close"
                style={{ position: 'static' }}
                onClick={() => setIsBookModalOpen(false)}
                aria-label={t('partner.vlab.common.close')}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleBookSampleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label htmlFor="lq-book-name" style={labelStyle}>
                  {t('partner.vlab.queue.book.name')}
                </label>
                <input
                  id="lq-book-name"
                  type="text"
                  required
                  placeholder={t('partner.vlab.queue.book.namePlaceholder')}
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  style={fieldStyle}
                />
              </div>

              <div>
                <label htmlFor="lq-book-test" style={labelStyle}>
                  {t('partner.vlab.queue.book.test')}
                </label>
                <select
                  id="lq-book-test"
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  style={fieldStyle}
                >
                  {TEST_PANELS.map((panel) => (
                    <option key={panel} value={panel}>{panel}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="lq-book-location" style={labelStyle}>
                  {t('partner.vlab.queue.book.location')}
                </label>
                <input
                  id="lq-book-location"
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  style={fieldStyle}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, fontSize: 12.5, fontWeight: 600, color: 'var(--sk-color-text-2)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newFastingRequired}
                  onChange={(e) => setNewFastingRequired(e.target.checked)}
                />
                {t('partner.vlab.queue.book.fasting')}
              </label>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  className="sk-lq-btn-secondary"
                  onClick={() => setIsBookModalOpen(false)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="sk-lq-btn-primary"
                >
                  {t('partner.vlab.queue.book.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LabQueueScreen;
