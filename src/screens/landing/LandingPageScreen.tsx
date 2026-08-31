import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { StudentQualificationGraphic, ConnectedHardwareGraphic } from '../../components/svg';
import {
  Shield,
  FileCheck,
  Activity,
  HeartPulse,
  Sparkles,
  ArrowRight,
  Database,
  Lock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Bot,
  Sun,
  Moon,
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe,
  Radio,
  User,
  LogIn,
  UserPlus,
  X,
  Stethoscope,
  Building2,
  Smartphone,
  Check,
  QrCode,
  BookOpen,
  ScanLine,
  Eye,
  FileText,
  Clock,
  AlertTriangle,
  Play,
  Layers,
  ChevronRight,
  TrendingUp,
  Package,
  Droplet,
  Thermometer,
  Scale,
  Heart,
  UserCheck,
  BarChart2,
} from 'lucide-react';

import { StudentKareLogo } from '../../components/StudentKareLogo';
import { ARCReasoningSuite } from '../../components/ARCReasoningSuite';

interface LandingPageProps {
  onOpenAI?: () => void;
  onNavigate?: (routeId: string) => void;
}

export const LandingPageScreen: React.FC<LandingPageProps> = ({ onOpenAI, onNavigate }) => {
  const { tokens, radius, typography, isDark } = useTheme();
  const { student } = useAppStore();

  // Interactive UI states
  const [activeCategory, setActiveCategory] = useState<number>(0);
  const [activeStation, setActiveStation] = useState<number>(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [authStep, setAuthStep] = useState<number>(1);
  const [phoneInput, setPhoneInput] = useState<string>('9811122334');
  const [otpInput, setOtpInput] = useState<string>('142857');
  const [authSuccess, setAuthSuccess] = useState<boolean>(false);

  // Impilo Interactive Telemetry Portal state
  const [telemetrySubTab, setTelemetrySubTab] = useState<'bp' | 'weight' | 'spo2' | 'glucose' | 'temp' | 'ecg'>('bp');
  const [hoveredPatient, setHoveredPatient] = useState<'rayna' | 'zain'>('rayna');

  // OCR Scanner Demo state
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [ocrReportType, setOcrReportType] = useState<'cbc' | 'prescription'>('cbc');
  const [showAiExplainer, setShowAiExplainer] = useState<boolean>(false);

  // Live heart rate counter simulation
  const [liveBpm, setLiveBpm] = useState<number>(72);
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveBpm(70 + Math.floor(Math.random() * 6));
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // 1. Service Categories Matrix
  const serviceCategories = [
    {
      label: 'Preventive & Diagnostics',
      num: '08',
      desc: 'NABL certified home blood collection, automated camp vitals telemetry, and digital radiology.',
      services: [
        { name: 'Complete Blood Count (CBC Panel)', meta: 'Home sample collection · 6h TAT · FHIR R4', code: 'LOINC 58410-2' },
        { name: 'Lipid & Metabolic Profile', meta: 'Cholesterol, HDL, LDL, Triglycerides · 8h TAT', code: 'LOINC 24331-1' },
        { name: 'Thyroid Stimulating Hormone (TSH)', meta: 'Fast 8h reporting via ABDM gateway', code: 'LOINC 3016-3' },
        { name: 'Vitamin D3 & B12 Screening', meta: 'Essential student deficiency check', code: 'LOINC 62292-8' },
        { name: 'Camp Vitals Telemetry', meta: 'BP, SpO2, Dental, Vision acuity synced live', code: 'SNOMED 371911009' },
        { name: 'Digital Chest X-Ray & Screening', meta: 'Partner imaging center priority walk-in', code: 'LOINC 36643-5' },
      ],
    },
    {
      label: 'Everyday Care & Pharmacy',
      num: '06',
      desc: 'Prescription-gated 24x7 doctor consultations and under 2-hour express hostel medicine drop.',
      services: [
        { name: 'General Physician Teleconsult', meta: '15 min HD video call · NMC licensed doctors', code: 'SNOMED 408443003' },
        { name: 'Dermatology & Skin Consult', meta: 'Photo upload review with clinical notes', code: 'SNOMED 394582007' },
        { name: 'Express Pharmacy Delivery', meta: 'Hostel doorstep delivery in under 2 hours', code: 'FABRIC RX-EXP' },
        { name: 'Vaccination Boosters (HPV/HepB)', meta: 'Administered at campus health center', code: 'SNOMED 33879002' },
        { name: 'Physiotherapy Video Session', meta: 'Posture correction and sports injury rehab', code: 'SNOMED 91251008' },
        { name: 'Diet & Mess Nutrition Counselling', meta: 'Customized hostel mess diet optimization', code: 'SNOMED 1156269002' },
      ],
    },
    {
      label: 'Mental Health & Mind',
      num: '05',
      desc: 'Confidential peer support, licensed psychologist therapy, and exam de-stress sessions.',
      services: [
        { name: 'Confidential Student Counsellor', meta: '100% Free under university health plan', code: 'MIND C-01' },
        { name: 'Clinical Psychologist Therapy', meta: 'Evidence-based cognitive behavioral support', code: 'SNOMED 394588006' },
        { name: 'Tele-MANAS 24x7 Direct Gateway', meta: 'Government national mental health helpline', code: 'GOV-MANAS-247' },
        { name: 'Exam Stress & Sleep Audio', meta: 'Guided breathwork & binaural mindfulness', code: 'MIND AUD-SLEEP' },
        { name: 'Anonymous Peer Wellness Group', meta: 'Pseudonymized moderated student circles', code: 'CIRCLES-PEER' },
      ],
    },
    {
      label: 'Campus Clinic Ops',
      num: '06',
      desc: 'Institutional health center digitization, syndromic outbreak tracking, and camp passports.',
      services: [
        { name: 'Station Check-In QR Generator', meta: 'Instant offline roll number & ABHA resolution', code: 'CAMP QR-REG' },
        { name: '5-Station Digital Passport', meta: 'Paperless health camp workflow with auto-sync', code: 'PASSPORT-5ST' },
        { name: 'Syndromic Outbreak Heatmap', meta: 'Real-time hostel fever & viral cluster detection', code: 'SURV-OUTBREAK' },
        { name: 'Campus Ambulatory Network', meta: '108 protocol emergency priority dispatch beacon', code: 'SOS-AMB-108' },
        { name: 'Aggregate Health Index (NIRF)', meta: 'Anonymized statutory compliance reporting', code: 'NIRF-COMP-26' },
        { name: 'Student Insurance Adjudication', meta: 'Vertical D cashless claim processing via HCX', code: 'OPENHCX-ADJ' },
      ],
    },
  ];

  // 2. 5-Station Digital Camp Passport Pipeline Data
  const campStations = [
    {
      id: 1,
      title: 'Station 1: Roll ID QR Check-In',
      subtitle: 'Paperless roll number & ABHA resolution',
      duration: '45 seconds',
      highlight: 'Offline SQLite sync with 0 network latency',
      status: 'Completed ✓',
      details: [
        'Scans physical student ID barcode or university roll number',
        'Resolves ABHA address and previous health history automatically',
        'Generates encrypted physical token card for subsequent stations',
      ],
    },
    {
      id: 2,
      title: 'Station 2: Auto Vitals Telemetry',
      subtitle: 'BP, SpO2, Pulse, BMI & Thermal capture',
      duration: '90 seconds',
      highlight: 'Bluetooth LE auto-capture to cloud vault',
      status: 'Completed ✓',
      details: [
        'Digital oscillometric BP cuff (118/76 mmHg)',
        'Fingertip pulse oximeter (SpO2: 99%, Pulse: 72 bpm)',
        'Ultrasonic height & bioimpedance scale (BMI: 21.8 kg/m²)',
      ],
    },
    {
      id: 3,
      title: 'Station 3: Vision & Dental Acuity',
      subtitle: 'Digital Snellen chart & oral cavity inspection',
      duration: '2 minutes',
      highlight: 'Standardized WHO screening guidelines',
      status: 'In Progress ●',
      details: [
        'Right Eye: 6/6 | Left Eye: 6/9 (Refractive review flagged)',
        'Color vision: Normal Ishihara 14/14 plates',
        'Dental check: Caries screening with photographic record',
      ],
    },
    {
      id: 4,
      title: 'Station 4: Physician EMR & Scribe',
      subtitle: 'NMC registered practitioner consultation',
      duration: '4 minutes',
      highlight: 'AI ambient speech-to-EMR clinical notes',
      status: 'Queued',
      details: [
        'Review of abnormal vitals and student-reported symptoms',
        'Clinical prescription generated with SNOMED-CT coded diagnosis',
        'Direct referral to campus counsellor or partner diagnostic lab',
      ],
    },
    {
      id: 5,
      title: 'Station 5: Smart Passport Issuance',
      subtitle: 'Instant digital passport & summary download',
      duration: '30 seconds',
      highlight: 'FHIR R4 DiagnosticReport synced to phone',
      status: 'Queued',
      details: [
        'Full health scorecard delivered via WhatsApp / SA Care app',
        'Abnormal values highlighted with doctor-reviewed recommendations',
        'Permanent copy filed in student ABDM health locker',
      ],
    },
  ];

  // 3. FAQ Items
  const faqs = [
    {
      q: 'Is SA Care free for enrolled university students?',
      a: 'Yes! Core health vault records, the 24x7 Emergency medical ID, offline cache, and on-campus annual health camps are 100% free for all students at partner universities. Specialized diagnostic blood panels and express medicine delivery are subsidized through pre-negotiated campus rate cards.',
    },
    {
      q: 'How does Rule K1 protect my health privacy from insurers and employers?',
      a: 'Rule K1 is enforced at the strict database role level: the Insurance & Claims plane has absolute ZERO read permissions on the clinical records vault. Medical reports you upload or vitals from campus checkups are never shared with, sold to, or scored by insurers or employers without explicit DPDP OTP authorization.',
    },
    {
      q: 'Can I access my emergency health card offline on a locked phone?',
      a: 'Yes. Your emergency health card is cryptographically cached locally on your device in secure local storage. It opens directly without network connectivity or biometric authentication barriers, allowing first responders or campus security to view blood group, allergies, and emergency contacts instantly.',
    },
    {
      q: 'What is the Health Services Fabric (Vertical C)?',
      a: 'The Services Fabric is an enterprise health API connecting 19,000+ Indian pincodes to certified diagnostic laboratories, pharmacies, and teleconsult supply. Any university portal, health app, or campus clinic can trigger orders through a standardized 8-stage state machine with real-time tracking.',
    },
    {
      q: 'How does SA Care integrate with ABDM (Ayushman Bharat Digital Mission)?',
      a: 'SA Care operates as a certified ABDM HIU (Health Information User) and HIP (Health Information Provider). Students can link or create their 14-digit ABHA address, fetch historical records from hospitals across India, and grant time-bound consent via the NHA gateway.',
    },
  ];

  // Medical Section Header Helper Component
  const renderMedicalTag = (code: string, title: string, variant: 'action' | 'cyan' | 'positive' | 'emergency' | 'green' = 'action') => {
    const isEm = variant === 'emergency';
    const isGr = variant === 'green' || variant === 'positive';
    const isCy = variant === 'cyan';

    const tagBg = isEm
      ? 'rgba(179, 36, 26, 0.12)'
      : isGr
      ? 'rgba(0, 122, 85, 0.1)'
      : isCy
      ? 'rgba(0, 177, 255, 0.1)'
      : 'rgba(82, 79, 217, 0.08)';

    const tagBorder = isEm
      ? tokens.emergency
      : isGr
      ? tokens.positive
      : isCy
      ? tokens.cyan
      : tokens.action;

    const tagTextColor = isEm
      ? tokens.emergency
      : isGr
      ? tokens.positive
      : isCy
      ? tokens.cyan
      : tokens.action;

    return (
      <View style={[styles.medicalHeaderTag, { backgroundColor: tagBg, borderLeftColor: tagBorder }]}>
        <Text style={[styles.medicalHeaderCode, { color: tagTextColor, fontFamily: typography.fontMono }]}>
          {code}
        </Text>
        <Text style={[styles.medicalHeaderDivider, { color: tokens.text3 }]}>|</Text>
        <Text style={[styles.medicalHeaderTitle, { color: tokens.text, fontFamily: typography.fontMono }]}>
          {title}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView style={[styles.pageRoot, { backgroundColor: tokens.canvas }]} showsVerticalScrollIndicator={false}>
      
      {/* ─── 1. FULL-WIDTH STICKY HEADER ───────────────────────────────── */}
      <View style={[styles.headerContainer, { backgroundColor: 'rgba(244, 244, 246, 0.95)', borderBottomColor: tokens.ruleSoft }]}>
        <View style={styles.headerInner}>
          
          {/* Brand Logo: Student Kare */}
          <TouchableOpacity activeOpacity={0.8} onPress={() => onNavigate && onNavigate('landing')}>
            <StudentKareLogo size={32} showStrapline={true} straplineText="STUDENT HEALTH PLATFORM v0.5" />
          </TouchableOpacity>

          {/* Header Controls */}
          <View style={styles.headerRight}>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (onNavigate) {
                  onNavigate('login');
                } else {
                  setAuthTab('login');
                  setAuthStep(1);
                  setAuthSuccess(false);
                  setAuthModalOpen(true);
                }
              }}
              style={[styles.authOutlineBtn, { borderColor: tokens.action }]}
            >
              <LogIn size={15} color={tokens.action} />
              <Text style={[styles.authOutlineText, { color: tokens.action }]}>Log in</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (onNavigate) {
                  onNavigate('signup');
                } else {
                  setAuthTab('signup');
                  setAuthStep(1);
                  setAuthSuccess(false);
                  setAuthModalOpen(true);
                }
              }}
              style={[styles.authPrimaryBtn, { backgroundColor: tokens.action }]}
            >
              <UserPlus size={15} color="#ffffff" />
              <Text style={styles.authPrimaryText}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ─── 2. LIVE CARDIAC TELEMETRY PULSE TICKER ─────────────────────── */}
      <View style={[styles.telemetryBar, { backgroundColor: isDark ? tokens.blue01 : tokens.ink }]}>
        <View style={styles.telemetryInner}>
          <View style={styles.telemetryLeft}>
            <View style={styles.telemetryPill}>
              <View style={[styles.pulseCircle, { backgroundColor: tokens.brightGreen }]} />
              <Text style={[styles.telemetryPillText, { color: tokens.brightGreen, fontFamily: typography.fontMono }]}>
                LIVE CAMPUS TELEMETRY
              </Text>
            </View>
            <View style={styles.ecgBlock}>
              <HeartPulse size={16} color={tokens.brightTurquoise} />
              <Text style={[styles.ecgValue, { fontFamily: typography.fontMono }]}>
                {liveBpm} BPM
              </Text>
            </View>
          </View>

          <View style={styles.telemetryMetricsRow}>
            <Text style={[styles.telemetryMetricText, { color: tokens.lavender04, fontFamily: typography.fontMono }]}>
              <Text style={{ color: '#ffffff', fontWeight: '800' }}>284,520+</Text> STUDENTS SCREENED
            </Text>
            <Text style={[styles.telemetryMetricText, { color: tokens.lavender04, fontFamily: typography.fontMono }]}>
              <Text style={{ color: '#ffffff', fontWeight: '800' }}>48</Text> CAMPUSES ACTIVE
            </Text>
            <Text style={[styles.telemetryMetricText, { color: tokens.lavender04, fontFamily: typography.fontMono }]}>
              <Text style={{ color: tokens.brightGreen, fontWeight: '800' }}>99.4%</Text> OCR PRECISION
            </Text>
            <Text style={[styles.telemetryMetricText, { color: tokens.lavender04, fontFamily: typography.fontMono }]}>
              <Text style={{ color: '#ffffff', fontWeight: '800' }}>&lt;6h</Text> LAB REPORTING TAT
            </Text>
          </View>
        </View>
      </View>

      {/* ─── 3. HERO SECTION WITH ANIMATED SVG LINE WAVES & PHONE ─────── */}
      <View style={[styles.heroSection, { backgroundColor: isDark ? tokens.surface : tokens.surface2, borderBottomColor: tokens.ruleSoft }]}>
        <View style={styles.containerMax}>
          <View style={styles.heroGrid}>
            
            {/* Left Column */}
            <View style={styles.heroLeftCol}>
              <View style={styles.tagGroup}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 9999, backgroundColor: isDark ? 'rgba(0, 255, 170, 0.12)' : tokens.surface, border: `1px solid ${tokens.positive}`, marginBottom: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tokens.positive, boxShadow: `0 0 8px ${tokens.positive}`, animation: 'sk-tick 2.2s ease-in-out infinite' }}></span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: tokens.positive, fontFamily: typography.fontMono }}>✚ PROTOCOL 00 · FOR STUDENTS 18+ IN INDIA</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 9999, backgroundColor: isDark ? 'rgba(0, 177, 255, 0.12)' : tokens.surface, border: `1px solid ${tokens.cyan}`, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: tokens.cyan, fontFamily: typography.fontMono }}>ABDM CERTIFIED · HIU / HIP GATEWAY</span>
                </div>
              </View>

              <div style={{ animation: 'sk-rise 700ms cubic-bezier(.22,.61,.36,1) forwards' }}>
                <Text style={[styles.heroMainTitle, { color: tokens.text }]}>
                  Every report you have ever been handed, filed on one line.
                </Text>
              </div>

              <Text style={[styles.heroSubtitle, { color: tokens.text2 }]}>
                Lab reports, prescriptions, vaccination cards, and camp screenings—kept in date order and readable in plain language. The original document is always one tap away with pixel-level provenance.
              </Text>

              <View style={styles.heroCtaRow}>
                <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 9999 }}>
                  <Button
                    label="Get the student app"
                    onPress={() => {
                      if (onNavigate) {
                        onNavigate('signup');
                      } else {
                        setAuthTab('signup');
                        setAuthStep(1);
                        setAuthSuccess(false);
                        setAuthModalOpen(true);
                      }
                    }}
                    variant="impiloPill"
                    iconRight={<ArrowRight size={17} color={tokens.blue01} />}
                    size="lg"
                  />
                </div>

                <Button
                  label="Bring it to your campus"
                  onPress={() => {
                    if (onNavigate) {
                      onNavigate('signup');
                    } else {
                      setAuthTab('signup');
                      setAuthModalOpen(true);
                    }
                  }}
                  variant="outline"
                  size="lg"
                />
              </View>

              {/* Trust Row */}
              <View style={[styles.heroTrustRow, { borderTopColor: tokens.ruleSoft }]}>
                <View style={styles.trustItem}>
                  <CheckCircle2 size={18} color={tokens.action} />
                  <Text style={[styles.trustText, { color: tokens.text2 }]}>Free for students</Text>
                </View>
                <View style={styles.trustItem}>
                  <CheckCircle2 size={18} color={tokens.action} />
                  <Text style={[styles.trustText, { color: tokens.text2 }]}>Works offline</Text>
                </View>
                <View style={styles.trustItem}>
                  <CheckCircle2 size={18} color={tokens.action} />
                  <Text style={[styles.trustText, { color: tokens.text2 }]}>English · Fast & Private</Text>
                </View>
              </View>
            </View>

            {/* Right Column: Phone Mockup with Animated SVG Wave Background */}
            <View style={styles.heroRightCol}>
              <div style={{ position: 'relative', width: 340, animation: 'sk-float 10s ease-in-out infinite' }}>
                
                {/* SVG Animated Connected Lines, Beziers & Glowing Radar Beacons */}
                <div style={{ position: 'absolute', inset: '-48px -32px', background: isDark ? '#14144e' : tokens.surface2, borderRadius: 38, overflow: 'hidden', pointerEvents: 'none' }}>
                  <svg width="100%" height="100%" viewBox="0 0 460 620" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
                    <defs>
                      <pattern id="hero-dots" width="16" height="16" patternUnits="userSpaceOnUse">
                        <circle cx="1.5" cy="1.5" r="1.5" fill={tokens.artSoft}></circle>
                      </pattern>
                    </defs>
                    <rect width="460" height="620" fill="url(#hero-dots)" opacity="0.65"></rect>
                    {/* Floating Ambient Orbs */}
                    <circle cx="70" cy="96" r="120" fill={tokens.surface3} opacity="0.85" style={{ animation: 'sk-float 11s ease-in-out infinite' }}></circle>
                    <circle cx="404" cy="500" r="150" fill={tokens.surface3} opacity="0.75" style={{ animation: 'sk-float 14s ease-in-out infinite reverse' }}></circle>
                    {/* Static Drawn Curved Paths */}
                    <path d="M-20 470 C 120 400, 200 560, 480 440" stroke={tokens.veil} strokeWidth="1.5" fill="none" strokeDasharray="700" strokeDashoffset="700" style={{ animation: 'sk-draw 1600ms ease-out 300ms forwards' }}></path>
                    <path d="M-20 512 C 140 450, 220 600, 480 486" stroke={tokens.veil} strokeWidth="1.5" fill="none" opacity="0.6" strokeDasharray="700" strokeDashoffset="700" style={{ animation: 'sk-draw 1600ms ease-out 480ms forwards' }}></path>
                    {/* Fast Travelling Dash Pulse Line */}
                    <path d="M-20 470 C 120 400, 200 560, 480 440" stroke={tokens.action} strokeWidth="2.8" fill="none" strokeLinecap="round" strokeDasharray="26 194" strokeDashoffset="0" style={{ animation: 'sk-dash 3.6s linear infinite' }}></path>
                    {/* Radar Pulse Rings */}
                    <circle cx="70" cy="96" r="3" fill={tokens.action} style={{ animation: 'sk-ping 3.4s ease-out infinite' }}></circle>
                    <circle cx="404" cy="500" r="3" fill={tokens.action} style={{ animation: 'sk-ping 3.4s ease-out 1.7s infinite' }}></circle>
                  </svg>
                </div>

                {/* Smartphone Device Frame */}
                <div style={{ position: 'relative', width: 340, backgroundColor: tokens.canvas, border: `1px solid ${tokens.rule}`, borderRadius: 32, boxShadow: '0 24px 50px rgba(0, 0, 0, 0.4)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 18px 4px', fontSize: 11, fontFamily: typography.fontMono, color: tokens.text3 }}>
                    <span>9:41</span>
                    <span>▮▮▮ 5G</span>
                  </div>

                  <div style={{ padding: '8px 18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: tokens.ink }}>Arjun Mehta</span>
                      <span style={{ fontSize: 12, color: tokens.text3 }}>switch ▾</span>
                    </div>

                    {/* Emergency Card Trigger with Pulse */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, backgroundColor: tokens.surface, border: `1px solid ${tokens.rule}`, borderLeft: `3.5px solid ${tokens.emergency}`, marginBottom: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: tokens.ink }}>Emergency card (B+)</span>
                      <ArrowRight size={16} color={tokens.text3} />
                    </div>

                    {/* Camp Registered Status */}
                    <div style={{ padding: '12px 14px', borderRadius: 12, backgroundColor: tokens.surface, border: `1px solid ${tokens.rule}`, marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: tokens.ink }}>Campus Camp · Thu 21 Aug</div>
                      <div style={{ fontSize: 12, color: tokens.positive, marginTop: 3, fontWeight: 600 }}>You're registered ✓</div>
                    </div>

                    {/* Records Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: tokens.ink, letterSpacing: 0.5, fontFamily: typography.fontMono }}>YOUR RECORDS</span>
                      <span style={{ color: tokens.action, fontSize: 16, cursor: 'pointer' }}>⊕</span>
                    </div>

                    {/* Animated Records Timeline */}
                    <div style={{ position: 'relative', paddingLeft: 22 }}>
                      {/* Vertical Growth Tree Line */}
                      <div style={{ position: 'absolute', left: 3, top: 4, bottom: 0, width: 1.5, backgroundColor: tokens.ruleSoft, transformOrigin: 'top', animation: 'sk-grow 1100ms cubic-bezier(.22,.61,.36,1) 700ms both' }}></div>

                      {/* Record 1 */}
                      <div style={{ position: 'relative', marginBottom: 14 }}>
                        <div style={{ position: 'absolute', left: -22, top: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.action, boxShadow: `0 0 8px ${tokens.action}` }}></div>
                        <div style={{ fontSize: 11, fontFamily: typography.fontMono, color: tokens.text3, marginBottom: 4 }}>14 MAR 2026</div>
                        <div style={{ padding: '10px 12px', borderRadius: 10, backgroundColor: tokens.surface, border: `1px solid ${tokens.rule}` }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: tokens.text }}>Blood test · SRL Diagnostics</div>
                          <div style={{ fontSize: 12, color: tokens.text2, marginTop: 2, display: 'flex', gap: 10 }}>
                            <span>8 values</span>
                            <span style={{ color: tokens.attention, fontWeight: 700, animation: 'sk-blink 1.8s infinite' }}>● 1 needs review</span>
                          </div>
                        </div>
                      </div>

                      {/* Record 2 */}
                      <div style={{ position: 'relative', marginBottom: 14 }}>
                        <div style={{ position: 'absolute', left: -22, top: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.action }}></div>
                        <div style={{ fontSize: 11, fontFamily: typography.fontMono, color: tokens.text3, marginBottom: 4 }}>02 JAN 2026</div>
                        <div style={{ padding: '10px 12px', borderRadius: 10, backgroundColor: tokens.surface, border: `1px solid ${tokens.rule}` }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: tokens.text }}>Prescription · Dr K. Rao</div>
                          <div style={{ fontSize: 12, color: tokens.text2, marginTop: 2 }}>3 medicines</div>
                        </div>
                      </div>

                      {/* Record 3 */}
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: -22, top: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.action }}></div>
                        <div style={{ fontSize: 11, fontFamily: typography.fontMono, color: tokens.text3, marginBottom: 4 }}>18 APR 2025</div>
                        <div style={{ padding: '10px 12px', borderRadius: 10, backgroundColor: tokens.surface, border: `1px solid ${tokens.rule}` }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: tokens.text }}>Vaccination · Hepatitis B</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Phone Bottom Nav */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface, fontSize: 11, textAlign: 'center', padding: '10px 0 14px' }}>
                    <span style={{ color: tokens.action, fontWeight: 800 }}>Records</span>
                    <span style={{ color: tokens.text3 }}>Learn</span>
                    <span style={{ color: tokens.text3 }}>Care</span>
                    <span style={{ color: tokens.reward, fontWeight: 800 }}>Points</span>
                  </div>
                </div>
              </div>
            </View>

          </View>
        </View>
      </View>

      {/* ─── 3.5. IMPILO CLINICAL TELEMETRY PORTAL DASHBOARD (RPM ENGINE) ── */}
      <View style={[styles.sectionWrapper, { backgroundColor: isDark ? '#0a0a2c' : tokens.surface2, borderBottomColor: tokens.ruleSoft }]}>
        <View style={styles.containerMax}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            {renderMedicalTag('LIVE RPM TELEMETRY', 'REMOTE PATIENT MONITORING & CLINICAL ENGINE', 'cyan')}
            <Text style={[styles.sectionH2, { color: tokens.text, textAlign: 'center' }]}>
              Continuous physiological telemetry on one screen.
            </Text>
            <Text style={[styles.sectionP, { color: tokens.text2, textAlign: 'center', maxWidth: 640 }]}>
              Connected biometric devices stream blood pressure, pulse, SpO2, glucose, and weight readings with automatic threshold detection and council-verified clinician oversight.
            </Text>
          </View>

          {/* Authentic Impilo Telemetry Card (Screenshot 2) */}
          <View style={[styles.telemetryPortalCard, { backgroundColor: isDark ? '#1d1b76' : '#232269', borderColor: '#4846c6' }]}>
            {/* Left Sidebar inside Card */}
            <View style={styles.telemetryPortalSidebar}>
              {/* Logo */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M2 13h4l3-8 4 16 3-8h6" stroke="#00b1ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800', letterSpacing: -0.5 }}>impilo</Text>
              </View>

              {/* Patient Info */}
              <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '800', marginBottom: 4 }}>Louise Belrosa</Text>
              <Text style={{ color: '#b1a6f6', fontSize: 12, marginBottom: 18, fontFamily: typography.fontMono }}>DOB 7 / 13 / 68</Text>

              <View style={{ gap: 8, marginBottom: 24 }}>
                <Text style={{ color: '#d8d8e3', fontSize: 12 }}>📞 871-555-3926</Text>
                <Text style={{ color: '#d8d8e3', fontSize: 12 }}>✉️ louisebel@gmail.com</Text>
                <Text style={{ color: '#d8d8e3', fontSize: 12, lineHeight: 16 }}>📍 7604 Mesa Vista Circle{'\n'}Salt Lake City, Utah 84034</Text>
              </View>

              <Text style={{ color: '#b1a6f6', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 10 }}>BILLING SUMMARY</Text>
              <View style={{ gap: 8 }}>
                {['Readings 3.31.24', 'Readings 4.12.24', 'General Check 3.31.24', 'Readings 4.12.24'].map((b, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <FileText size={14} color="#00b1ff" />
                    <Text style={{ color: '#ffffff', fontSize: 12 }}>{b}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Right Main Telemetry Area */}
            <View style={styles.telemetryPortalMain}>
              {/* Top Navigation Tabs */}
              <View style={styles.telemetryPortalTopNav}>
                <Text style={styles.telemetryNavTab}>Info</Text>
                <Text style={styles.telemetryNavTab}>Orders</Text>
                <Text style={styles.telemetryNavTab}>Support</Text>
                <View style={[styles.telemetryNavTabActive, { borderBottomColor: '#ffffff' }]}>
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>Data</Text>
                </View>
              </View>

              {/* Sub-tab measurement pills */}
              <View style={styles.telemetryPillsRow}>
                {[
                  { id: 'bp', label: 'Blood Pressure', icon: 'heart', val: '131 / 83' },
                  { id: 'weight', label: 'Weight', icon: 'scale', val: '167.58 LBS' },
                  { id: 'spo2', label: 'Blood Oxygen', icon: 'droplet', val: '99%' },
                  { id: 'glucose', label: 'Blood Glucose', icon: 'droplet', val: '96 mg/dL' },
                  { id: 'temp', label: 'Temperature', icon: 'thermometer', val: '98.6°F' },
                  { id: 'ecg', label: 'ECG', icon: 'ecg', val: 'Normal' },
                ].map((item) => {
                  const isActive = telemetrySubTab === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() => setTelemetrySubTab(item.id as any)}
                      style={[
                        styles.telemetryPillBtn,
                        isActive && { backgroundColor: '#ffffff' },
                      ]}
                    >
                      <HeartPulse size={14} color={isActive ? '#1d1b76' : '#ffffff'} />
                      <Text style={[styles.telemetryPortalPillText, { color: isActive ? '#1d1b76' : '#ffffff' }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Key Metric Average Box */}
              <View style={styles.telemetryAverageBox}>
                <View>
                  <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800', marginBottom: 4 }}>
                    Blood Pressure Average
                  </Text>
                  <Text style={{ color: '#b1a6f6', fontSize: 12 }}>
                    July 3, 2022 – July 27, 2023
                  </Text>
                </View>
                <Text style={{ color: '#00ffaa', fontSize: 32, fontWeight: '800', fontFamily: typography.fontMono }}>
                  131 / 83
                </Text>
              </View>

              {/* Telemetry Range Graph Card */}
              <View style={styles.telemetryGraphCard}>
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800', marginBottom: 20 }}>
                  Blood Pressure Pulse Rate Record
                </Text>

                {/* SVG Area & Pulse Telemetry Chart */}
                <div style={{ position: 'relative', width: '100%', height: 210 }}>
                  <svg width="100%" height="210" viewBox="0 0 720 210" preserveAspectRatio="none" style={{ display: 'block' }}>
                    {/* Horizontal reference grid lines */}
                    {[30, 65, 100, 135, 170].map((y, idx) => (
                      <line key={idx} x1="40" y1={y} x2="710" y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                    ))}

                    {/* Vertical Range Bars */}
                    {[
                      { x: 70, y1: 70, y2: 155 },
                      { x: 140, y1: 76, y2: 150 },
                      { x: 210, y1: 60, y2: 145 },
                      { x: 280, y1: 72, y2: 158 },
                      { x: 350, y1: 68, y2: 160 },
                      { x: 420, y1: 80, y2: 165 },
                      { x: 490, y1: 75, y2: 162 },
                      { x: 560, y1: 65, y2: 152 },
                      { x: 630, y1: 85, y2: 168 },
                      { x: 690, y1: 78, y2: 160 },
                    ].map((bar, i) => (
                      <line key={i} x1={bar.x} y1={bar.y1} x2={bar.x} y2={bar.y2} stroke="rgba(177, 166, 246, 0.45)" strokeWidth="6" strokeLinecap="round" />
                    ))}

                    {/* Smooth Upper Curve */}
                    <path
                      d="M 70 90 Q 140 100, 210 82 T 280 92 T 350 96 T 420 108 T 490 102 T 560 110 T 630 118 T 690 125"
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.4)"
                      strokeWidth="2"
                    />

                    {/* Glowing Pulse Rate Cyan Line */}
                    <path
                      d="M 70 120 Q 140 115, 210 108 T 280 120 T 350 118 T 420 130 T 490 132 T 560 126 T 630 142 T 690 140"
                      fill="none"
                      stroke="#00b1ff"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Pulse Data Dots with Glow */}
                    {[
                      { x: 70, y: 120 }, { x: 140, y: 115 }, { x: 210, y: 108 }, { x: 280, y: 120 },
                      { x: 350, y: 118 }, { x: 420, y: 130 }, { x: 490, y: 132 }, { x: 560, y: 126 },
                      { x: 630, y: 142 }, { x: 690, y: 140 },
                    ].map((pt, i) => (
                      <g key={i}>
                        <circle cx={pt.x} cy={pt.y} r="5" fill="#00b1ff" style={{ filter: 'drop-shadow(0 0 6px #00b1ff)' }} />
                        <circle cx={pt.x} cy={pt.y} r="2.5" fill="#ffffff" />
                      </g>
                    ))}
                  </svg>
                </div>

                {/* X-Axis Date Labels */}
                <View style={styles.telemetryXAxis}>
                  {['7.3.22', '9.2.22', '10.27.22', '12.21.22', '3.22.23', '5.7.23', '5.18.23', '6.4.23', '6.18.23', '7.27.23'].map((d, i) => (
                    <Text key={i} style={{ color: '#b1a6f6', fontSize: 10, fontFamily: typography.fontMono }}>{d}</Text>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ─── 3.75. UNIFIED TWO-PHASE CAMPUS CARE WORKFLOW (COMBINED 01 + 02) ─── */}
      <View style={[styles.sectionWrapper, { backgroundColor: isDark ? '#060720' : tokens.canvas, borderBottomColor: tokens.ruleSoft }]}>
        <View style={styles.containerMax}>
          
          {/* Section Header */}
          <View style={{ alignItems: 'center', marginBottom: 44 }}>
            {renderMedicalTag('CAMPUS WORKFLOW', 'END-TO-END QUALIFICATION & HARDWARE PIPELINE', 'cyan')}
            <Text style={[styles.sectionH2, { color: tokens.text, textAlign: 'center' }]}>
              From Student Roll Qualification to Campus Clinic Hardware
            </Text>
            <Text style={[styles.sectionP, { color: tokens.text2, textAlign: 'center', maxWidth: 680 }]}>
              How SA Care combines automated student directory onboarding with zero-configuration medical hardware deployment.
            </Text>
          </View>

          {/* Unified Two-Phase Card Container */}
          <View style={{ gap: 40 }}>
            
            {/* PHASE 01 ROW */}
            <View style={[styles.impiloStepGrid, { backgroundColor: isDark ? '#0e0f35' : tokens.surface, padding: 32, borderRadius: 28, borderWidth: 1.5, borderColor: isDark ? 'rgba(0, 177, 255, 0.25)' : tokens.ruleSoft }]}>
              {/* Left Info */}
              <View style={styles.impiloStepLeft}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <View style={[styles.impiloStepIconBox, { backgroundColor: 'rgba(0, 177, 255, 0.15)', borderColor: tokens.cyan }]}>
                    <UserCheck size={20} color={tokens.cyan} />
                  </View>
                  <Text style={[styles.impiloStepNum, { color: tokens.cyan, fontFamily: typography.fontMono }]}>01.</Text>
                </View>

                <Text style={[styles.impiloStepHeading, { color: tokens.text }]}>
                  First, SA Care <Text style={{ color: '#00b1ff' }}>identifies</Text> and <Text style={{ color: '#00b1ff' }}>qualifies</Text> students for campus wellness.
                </Text>

                <Text style={[styles.impiloStepSub, { color: tokens.text2 }]}>
                  SA Care synchronizes with university roll directories and the National Health Authority ABHA network to qualify students, establish baseline physiological profiles, and dispatch personalized campus health passes.
                </Text>
              </View>

              {/* Right Interactive Directory with Arjun Mehta & Priya Sharma */}
              <View style={styles.impiloStepRight}>
                <StudentQualificationGraphic isDark={isDark} />
              </View>
            </View>

            {/* PHASE 02 ROW */}
            <View style={[styles.impiloStepGrid, { backgroundColor: isDark ? '#0c0d30' : tokens.surface, padding: 32, borderRadius: 28, borderWidth: 1.5, borderColor: isDark ? 'rgba(0, 255, 170, 0.25)' : tokens.ruleSoft }]}>
              {/* Left Info */}
              <View style={styles.impiloStepLeft}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <View style={[styles.impiloStepIconBox, { backgroundColor: 'rgba(0, 255, 170, 0.15)', borderColor: tokens.positive }]}>
                    <Package size={20} color={tokens.positive} />
                  </View>
                  <Text style={[styles.impiloStepNum, { color: tokens.positive, fontFamily: typography.fontMono }]}>02.</Text>
                </View>

                <Text style={[styles.impiloStepHeading, { color: tokens.text }]}>
                  We <Text style={{ color: '#00ffaa' }}>pack</Text> and <Text style={{ color: '#00ffaa' }}>ship</Text> connected health devices <Text style={{ color: '#00ffaa' }}>directly</Text> to campus clinics.
                </Text>

                <Text style={[styles.impiloStepSub, { color: tokens.text2 }]}>
                  Seamless deployment of ISO/CE-certified diagnostic hardware to university health centers and hostel clinics. Pre-calibrated Bluetooth weight scales, digital BP monitors, and pulse sensors with zero manual configuration.
                </Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onNavigate && onNavigate('dashboard')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20 }}
                >
                  <Text style={{ color: '#00ffaa', fontWeight: '700', fontSize: 15 }}>
                    → Explore Connected Campus Hardware Solutions
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Right Isometric Wireframe Medical Device Canvas */}
              <View style={styles.impiloStepRight}>
                <ConnectedHardwareGraphic isDark={isDark} />
              </View>
            </View>

          </View>
        </View>
      </View>

      {/* ─── ARC-AGI COGNITIVE REASONING SUITE ─────────────────────────── */}
      <View style={[styles.sectionWrapper, { backgroundColor: tokens.canvas, borderBottomColor: tokens.ruleSoft }]}>
        <View style={styles.containerMax}>
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            {renderMedicalTag('COGNITIVE HEALTH · CONCEPT REASONING', 'ARC-AGI OPEN SOURCE BENCHMARK SUITE', 'action')}
            <div style={{ fontSize: 28, fontWeight: 900, color: tokens.text, textAlign: 'center', marginTop: 12, marginBottom: 8, letterSpacing: -0.6 }}>
              Interactive ARC-AGI Cognitive Reasoning Engine
            </div>
            <div style={{ fontSize: 14, color: tokens.text2, textAlign: 'center', maxWidth: 680, margin: '0 auto', lineHeight: 1.5 }}>
              Test fluid intelligence and concept synthesis using open-source ConceptARC and Mini-ARC visual grid puzzles. Click to paint grid cells and solve transformation rules.
            </div>
          </div>
          <ARCReasoningSuite />
        </View>
      </View>

      {/* ─── 4. THE VAULT: INTERACTIVE OCR SCANNER ───────────────────────── */}
      <View style={[styles.sectionWrapper, { backgroundColor: tokens.surface, borderBottomColor: tokens.ruleSoft }]}>
        <View style={styles.containerMax}>
          <View style={styles.vaultGrid}>
            <View style={styles.vaultLeft}>
              {renderMedicalTag('SEC 01.0 // CLINICAL VAULT', 'FHIR R4 DIAGNOSTIC ARCHIVE', 'action')}
              <Text style={[styles.sectionH2, { color: tokens.text }]}>
                Paper is the source of truth.
              </Text>
              <Text style={[styles.sectionP, { color: tokens.text2 }]}>
                Photograph a report and it is filed the moment it lands. Values are read off the page and shown next to the range printed on that same page. Nothing is estimated, nothing is scored, and the scan you uploaded stays one tap away.
              </Text>

              <View style={styles.ocrSelectRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => { setOcrReportType('cbc'); setIsScanning(true); }}
                  style={[
                    styles.ocrSelectBtn,
                    {
                      backgroundColor: ocrReportType === 'cbc' ? tokens.surface3 : tokens.surface,
                      borderColor: ocrReportType === 'cbc' ? tokens.action : tokens.rule,
                    },
                  ]}
                >
                  <ScanLine size={16} color={ocrReportType === 'cbc' ? tokens.action : tokens.text2} />
                  <Text style={[styles.ocrSelectText, { color: ocrReportType === 'cbc' ? tokens.action : tokens.text2 }]}>
                    Sample Blood Panel (CBC)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => { setOcrReportType('prescription'); setIsScanning(true); }}
                  style={[
                    styles.ocrSelectBtn,
                    {
                      backgroundColor: ocrReportType === 'prescription' ? tokens.surface3 : tokens.surface,
                      borderColor: ocrReportType === 'prescription' ? tokens.action : tokens.rule,
                    },
                  ]}
                >
                  <FileText size={16} color={ocrReportType === 'prescription' ? tokens.action : tokens.text2} />
                  <Text style={[styles.ocrSelectText, { color: ocrReportType === 'prescription' ? tokens.action : tokens.text2 }]}>
                    Doctor Prescription
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Gauge Card with live laser indicator */}
            <View style={[styles.vaultDemoCard, { backgroundColor: tokens.canvas, borderColor: tokens.rule, position: 'relative', overflow: 'hidden' }]}>
              
              {/* Laser Scanning Beam Animation */}
              {isScanning && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: 2,
                    backgroundColor: tokens.action,
                    boxShadow: '0 0 14px 3px rgba(82, 79, 217, 0.8)',
                    zIndex: 10,
                    pointerEvents: 'none',
                    animation: 'sk-scan-laser 3.2s ease-in-out infinite',
                  }}
                />
              )}

              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.vaultCardTitle, { color: tokens.ink }]}>
                    {ocrReportType === 'cbc' ? 'Blood test (CBC Panel)' : 'Prescription · Dr K. Rao'}
                  </Text>
                  <Badge label="99.4% OCR PRECISION" variant="positive" size="sm" />
                </View>
                <Text style={[styles.vaultCardDate, { color: tokens.text3, fontFamily: typography.fontMono }]}>
                  14 MAR 2026
                </Text>
              </View>

              <Text style={[styles.vaultCardSub, { color: tokens.text2, borderBottomColor: tokens.rule }]}>
                SRL Diagnostics · view original document →
              </Text>

              {/* Haemoglobin Gauge */}
              <View style={[styles.gaugeBlock, { borderBottomColor: tokens.rule }]}>
                <Text style={[styles.gaugeTitle, { color: tokens.text }]}>Haemoglobin (Photometric)</Text>
                <View style={styles.gaugeValueRow}>
                  <Text style={[styles.gaugeValue, { color: tokens.attention, fontFamily: typography.fontMono }]}>
                    11.2 g/dL
                  </Text>
                  <Text style={[styles.gaugeRef, { color: tokens.text3, fontFamily: typography.fontMono }]}>
                    Ref: 13.0–17.0
                  </Text>
                </View>
                <View style={[styles.gaugeTrack, { backgroundColor: tokens.surface3 }]}>
                  <View style={[styles.gaugeFill, { width: '34%', backgroundColor: tokens.attentionFill }]} />
                  <View style={[styles.gaugeThumb, { left: '34%', backgroundColor: tokens.canvas, borderColor: tokens.attentionFill }]} />
                </View>
                <Text style={[styles.gaugeDesc, { color: tokens.text2 }]}>
                  Below the normal reference range printed on report.
                </Text>
              </View>

              {/* Vitamin B12 Gauge */}
              <View style={[styles.gaugeBlock, { borderBottomColor: tokens.rule }]}>
                <Text style={[styles.gaugeTitle, { color: tokens.text }]}>Vitamin B12 Screening</Text>
                <View style={styles.gaugeValueRow}>
                  <Text style={[styles.gaugeValue, { color: tokens.positive, fontFamily: typography.fontMono }]}>
                    384 pg/mL
                  </Text>
                  <Text style={[styles.gaugeRef, { color: tokens.text3, fontFamily: typography.fontMono }]}>
                    Ref: 200–900
                  </Text>
                </View>
                <View style={[styles.gaugeTrack, { backgroundColor: tokens.surface3 }]}>
                  <View style={[styles.gaugeFill, { left: '26%', right: 0, width: '74%', backgroundColor: tokens.positive }]} />
                  <View style={[styles.gaugeThumb, { left: '26%', backgroundColor: tokens.canvas, borderColor: tokens.positive }]} />
                </View>
                <Text style={[styles.gaugeDesc, { color: tokens.text2 }]}>
                  Within normal clinical range.
                </Text>
              </View>

              {/* AI Explainer Popover */}
              {showAiExplainer && (
                <View style={[styles.aiExplainerBox, { backgroundColor: tokens.surface3, borderColor: tokens.action }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Sparkles size={16} color={tokens.action} />
                    <Text style={[styles.aiExplainerTitle, { color: tokens.action }]}>Care AI Diagnostic Note</Text>
                  </View>
                  <Text style={[styles.aiExplainerBody, { color: tokens.text }]}>
                    Haemoglobin is mild-moderately low (11.2 g/dL vs 13.0 target). Common in college students due to iron-deficient hostel diet. Increase leafy greens, jaggery, or consult campus physician for an elemental iron supplement.
                  </Text>
                </View>
              )}

              <View style={styles.gaugeActionsRow}>
                <Button
                  label={showAiExplainer ? 'Hide Analysis' : 'Explain this report'}
                  onPress={() => setShowAiExplainer(!showAiExplainer)}
                  variant="outline"
                  icon={<Bot size={16} color={tokens.action} />}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Book consultation"
                  onPress={() => { setAuthTab('signup'); setAuthModalOpen(true); }}
                  variant="primary"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ─── 5. FOUR TABS SECTION WITH CLINICAL SVG ICONS ───────────────── */}
      <View style={[styles.sectionWrapper, { backgroundColor: tokens.surface, borderBottomColor: tokens.ruleSoft }]}>
        <View style={styles.containerMax}>
          <View style={{ marginBottom: 32 }}>
            {renderMedicalTag('SEC 02.0 // WORKSPACE', '4-PILLAR CLINICAL SUITE', 'action')}
            <Text style={[styles.sectionH2, { color: tokens.text }]}>
              Four tabs. Nothing to keep up with.
            </Text>
            <Text style={[styles.sectionP, { color: tokens.text2 }]}>
              No score, no streak, no ring to close. An app worth opening four times a year and finding useful each time.
            </Text>
          </View>

          <View style={styles.fourTabsGrid}>
            <View className="data-lift" style={[styles.fourTabCard, { backgroundColor: tokens.canvas, borderColor: tokens.ruleSoft, borderTopColor: tokens.action, borderTopWidth: 3 }]}>
              <div style={{ marginBottom: 12 }}>
                <svg width="32" height="32" viewBox="0 0 26 26" fill="none" stroke={tokens.action} strokeWidth="1.6">
                  <rect x="4" y="3" width="14" height="18" rx="1"></rect>
                  <path d="M8 3v18"></path>
                  <path d="M11 8h5M11 12h5M11 16h3"></path>
                  <path d="M18 6h4v17H8"></path>
                </svg>
              </div>
              <Text style={[styles.fourTabTitle, { color: tokens.text }]}>Records</Text>
              <Text style={[styles.fourTabDesc, { color: tokens.text2 }]}>
                Your whole history in date order, gaps and all. Upload from camera, or pull in what a linked hospital already holds.
              </Text>
            </View>

            <View className="data-lift" style={[styles.fourTabCard, { backgroundColor: tokens.canvas, borderColor: tokens.ruleSoft, borderTopColor: tokens.action, borderTopWidth: 3 }]}>
              <div style={{ marginBottom: 12 }}>
                <svg width="32" height="32" viewBox="0 0 26 26" fill="none" stroke={tokens.action} strokeWidth="1.6">
                  <path d="M13 7c-2-2-5-2.5-8-2.5v14C8 18.5 11 19 13 21c2-2 5-2.5 8-2.5v-14C18 4.5 15 5 13 7z"></path>
                  <path d="M13 7v14"></path>
                </svg>
              </div>
              <Text style={[styles.fourTabTitle, { color: tokens.text }]}>Learn</Text>
              <Text style={[styles.fourTabDesc, { color: tokens.text2 }]}>
                Doctor-reviewed articles on hostel life, exam weeks, vaccines, and what each test measures in plain language.
              </Text>
            </View>

            <View className="data-lift" style={[styles.fourTabCard, { backgroundColor: tokens.canvas, borderColor: tokens.ruleSoft, borderTopColor: tokens.action, borderTopWidth: 3 }]}>
              <div style={{ marginBottom: 12 }}>
                <svg width="32" height="32" viewBox="0 0 26 26" fill="none" stroke={tokens.action} strokeWidth="1.6">
                  <path d="M7 4v5a5 5 0 0 0 10 0V4"></path>
                  <path d="M5 4h4M15 4h4"></path>
                  <path d="M12 14v2a5 5 0 0 0 5 5 4 4 0 0 0 4-4v-2"></path>
                  <circle cx="21" cy="12" r="2.2"></circle>
                </svg>
              </div>
              <Text style={[styles.fourTabTitle, { color: tokens.text }]}>Care</Text>
              <Text style={[styles.fourTabDesc, { color: tokens.text2 }]}>
                Teleconsult, lab tests at your hostel, campus clinic, or counsellor. Every listed doctor is council-verified.
              </Text>
            </View>

            <View className="data-lift" style={[styles.fourTabCard, { backgroundColor: tokens.canvas, borderColor: tokens.ruleSoft, borderTopColor: tokens.reward, borderTopWidth: 3 }]}>
              <div style={{ marginBottom: 12 }}>
                <svg width="32" height="32" viewBox="0 0 26 26" fill="none" stroke={tokens.reward} strokeWidth="1.6">
                  <path d="M13 3l3 6.5 7 1-5 4.9 1.2 7L13 19.1 6.8 22.4 8 15.4l-5-4.9 7-1z"></path>
                </svg>
              </div>
              <Text style={[styles.fourTabTitle, { color: tokens.reward }]}>Points</Text>
              <Text style={[styles.fourTabDesc, { color: tokens.text2 }]}>
                Earned for finishing a checkup, closing a referral, reading an article. Spent on lab discounts. Never on body metrics.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ─── 6. STUDENT HEALTH PROFILE PASSPORT WITH SVG ORB CANVAS ─────── */}
      <View style={[styles.sectionWrapper, { backgroundColor: tokens.surface2, borderBottomColor: tokens.ruleSoft }]}>
        <View style={styles.containerMax}>
          <View style={styles.passportGrid}>
            <View style={styles.passportLeft}>
              {renderMedicalTag('SEC 03.0 // HEALTH IDENTITY', 'ABHA M1–M3 PASSPORT', 'action')}
              <Text style={[styles.sectionH2, { color: tokens.text }]}>
                One profile that a camp desk, a doctor and a stranger can all read.
              </Text>
              <Text style={[styles.sectionP, { color: tokens.text2 }]}>
                Scanned at the camp station, opened by a doctor before a teleconsult, and readable from a locked phone in an emergency. Same profile, three permissions.
              </Text>

              <View style={[styles.passportFeatureBox, { backgroundColor: tokens.ruleSoft, borderColor: tokens.rule }]}>
                <View style={[styles.passportFeatureItem, { backgroundColor: tokens.surface, borderBottomColor: tokens.rule }]}>
                  <View style={[styles.svcIconBox, { backgroundColor: tokens.surface3 }]}>
                    <QrCode size={18} color={tokens.action} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.svcName, { color: tokens.text }]}>Scan at the camp station</Text>
                    <Text style={[styles.svcMeta, { color: tokens.text2 }]}>Roll number resolves to the right student in under a second, offline.</Text>
                  </View>
                </View>

                <View style={[styles.passportFeatureItem, { backgroundColor: tokens.surface, borderBottomColor: tokens.rule }]}>
                  <View style={[styles.svcIconBox, { backgroundColor: tokens.surface3 }]}>
                    <User size={18} color={tokens.action} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.svcName, { color: tokens.text }]}>Family profiles on one login</Text>
                    <Text style={[styles.svcMeta, { color: tokens.text2 }]}>Keep a parent's reports in the same place, with their consent recorded.</Text>
                  </View>
                </View>

                <View style={[styles.passportFeatureItem, { backgroundColor: tokens.surface }]}>
                  <View style={[styles.svcIconBox, { backgroundColor: tokens.surface3 }]}>
                    <Lock size={18} color={tokens.action} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.svcName, { color: tokens.text }]}>Locked-phone emergency access</Text>
                    <Text style={[styles.svcMeta, { color: tokens.text2 }]}>Only the card. The rest of the archive stays behind your login.</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Profile Passport Card with Vector Art Canvas */}
            <View style={{ flex: 1, minWidth: 320, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <svg viewBox="0 0 520 420" width="100%" height="100%">
                  <circle cx="90" cy="70" r="70" fill={tokens.surface3} opacity="0.6" style={{ animation: 'sk-float 12s ease-in-out infinite' }} />
                  <circle cx="440" cy="350" r="90" fill={tokens.surface3} opacity="0.6" style={{ animation: 'sk-float 15s ease-in-out infinite reverse' }} />
                </svg>
              </div>

              <View style={[styles.passportCard, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
                <View style={[styles.passportHeader, { backgroundColor: tokens.ink }]}>
                  <Text style={[styles.passportHeaderText, { fontFamily: typography.fontMono }]}>STUDENT HEALTH PROFILE</Text>
                  <Text style={[styles.passportHeaderStatus, { color: tokens.lavender04, fontFamily: typography.fontMono }]}>VERIFIED 18+</Text>
                </View>

                <View style={styles.passportBody}>
                  <View style={styles.passportAvatarRow}>
                    {/* SVG Avatar Illustration */}
                    <div style={{ width: 96, height: 96, flexShrink: 0 }}>
                      <svg width="96" height="96" viewBox="0 0 96 96" style={{ display: 'block', borderRadius: 18 }}>
                        <rect width="96" height="96" fill={tokens.surface3} />
                        <circle cx="48" cy="38" r="17" fill={tokens.artSoft} />
                        <path d="M48 24a14 14 0 0 1 14 14v3h-3l-3-6c-6 4-16 4-22 0v6h-3v-3a14 14 0 0 1 14-14z" fill={tokens.ink} />
                        <circle cx="41" cy="39" r="2" fill={tokens.ink} /><circle cx="55" cy="39" r="2" fill={tokens.ink} />
                        <path d="M44 47c2.5 2 5.5 2 8 0" stroke={tokens.ink} strokeWidth="1.8" fill="none" strokeLinecap="round" />
                        <path d="M20 96c0-15 12-24 28-24s28 9 28 24z" fill={tokens.action} />
                        <path d="M48 72l-6 10 6 6 6-6z" fill={tokens.surface} />
                      </svg>
                      <Text style={[styles.avatarSub, { color: tokens.text2, fontFamily: typography.fontMono }]}>CSE · 3RD YR</Text>
                    </div>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.passportName, { color: tokens.ink }]}>Arjun Mehta</Text>
                      <Text style={[styles.passportUni, { color: tokens.text2 }]}>Osmania University · Hyderabad</Text>
                      
                      <View style={styles.passportStatsRow}>
                        <View>
                          <Text style={[styles.passportStatLabel, { color: tokens.text3 }]}>AGE</Text>
                          <Text style={[styles.passportStatVal, { color: tokens.ink, fontFamily: typography.fontMono }]}>22</Text>
                        </View>
                        <View>
                          <Text style={[styles.passportStatLabel, { color: tokens.text3 }]}>BLOOD</Text>
                          <Text style={[styles.passportStatVal, { color: tokens.ink, fontFamily: typography.fontMono }]}>B+</Text>
                        </View>
                        <View>
                          <Text style={[styles.passportStatLabel, { color: tokens.text3 }]}>RECORDS</Text>
                          <Text style={[styles.passportStatVal, { color: tokens.ink, fontFamily: typography.fontMono }]}>14</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.passportFooterRow}>
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={16} color={tokens.positive} />
                        <Text style={[styles.passportCheck, { color: tokens.text2 }]}>ABHA linked · records pull enabled</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={16} color={tokens.positive} />
                        <Text style={[styles.passportCheck, { color: tokens.text2 }]}>Emergency card complete</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={16} color={tokens.attention} />
                        <Text style={[styles.passportCheck, { color: tokens.text2 }]}>Campus camp on Thu 21 Aug · registered</Text>
                      </View>
                    </View>

                    <View style={styles.passportQrBox}>
                      <QrCode size={56} color={tokens.ink} />
                      <Text style={[styles.passportQrLabel, { color: tokens.text3, fontFamily: typography.fontMono }]}>SCAN AT CAMP</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ─── 7. 5-STATION DIGITAL CAMP PASSPORT ─────────────────────────── */}
      <View style={[styles.sectionWrapper, { backgroundColor: tokens.surface, borderBottomColor: tokens.ruleSoft }]}>
        <View style={styles.containerMax}>
          <View style={{ marginBottom: 32 }}>
            {renderMedicalTag('SEC 04.0 // CAMP PIPELINE', '5-STATION PAPERLESS PROTOCOL', 'action')}
            <Text style={[styles.sectionH2, { color: tokens.text }]}>
              5-Station Digital Health Camp Pipeline
            </Text>
            <Text style={[styles.sectionP, { color: tokens.text2 }]}>
              From physical student ID barcode scan to biometric vitals telemetry, vision acuity, physician EMR, and digital health card issuance in under 8 minutes.
            </Text>
          </View>

          {/* Station Pipeline Selector */}
          <View style={styles.stationTabsRow}>
            {campStations.map((st, idx) => {
              const isActive = activeStation === idx;
              return (
                <TouchableOpacity
                  key={st.id}
                  activeOpacity={0.84}
                  onPress={() => setActiveStation(idx)}
                  style={[
                    styles.stationTabBtn,
                    {
                      backgroundColor: isActive ? tokens.surface : tokens.canvas,
                      borderColor: isActive ? tokens.action : tokens.rule,
                      boxShadow: isActive ? '0 6px 18px rgba(82, 79, 217, 0.15)' : 'none',
                    },
                  ]}
                >
                  <View style={styles.stationTabTop}>
                    <Text style={[styles.stationTabNumber, { color: isActive ? tokens.action : tokens.text3, fontFamily: typography.fontMono }]}>
                      STATION 0{st.id}
                    </Text>
                    <Text style={[styles.stationTabStatus, { color: st.status.includes('Completed') ? tokens.positive : tokens.attention }]}>
                      {st.status}
                    </Text>
                  </View>
                  <Text style={[styles.stationTabTitle, { color: tokens.text }]}>
                    {st.title.replace(`Station ${st.id}: `, '')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Active Station Card */}
          <View style={[styles.stationDetailCard, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
            <View style={styles.stationDetailLeft}>
              <Text style={[styles.stationDetailEyebrow, { color: tokens.action, fontFamily: typography.fontMono }]}>
                LIVE STATION BREAKDOWN
              </Text>
              <Text style={[styles.stationDetailMainTitle, { color: tokens.text }]}>
                {campStations[activeStation].title}
              </Text>
              <Text style={[styles.stationDetailSub, { color: tokens.text2 }]}>
                {campStations[activeStation].subtitle}. Execution time: <Text style={{ color: tokens.action, fontWeight: '800' }}>{campStations[activeStation].duration}</Text>.
              </Text>

              <View style={styles.stationBulletList}>
                {campStations[activeStation].details.map((dt, dIdx) => (
                  <View key={dIdx} style={styles.stationBulletItem}>
                    <CheckCircle2 size={18} color={tokens.positive} />
                    <Text style={[styles.stationBulletText, { color: tokens.text }]}>{dt}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.stationPayloadBox, { backgroundColor: tokens.surface, borderColor: tokens.rule }]}>
              <View style={styles.stationPayloadHeader}>
                <Text style={[styles.stationPayloadHeaderText, { color: tokens.text2, fontFamily: typography.fontMono }]}>
                  STATION TELEMETRY PAYLOAD
                </Text>
                <Badge label="AES-256 ENCRYPTED" variant="mono" size="sm" />
              </View>
              <View style={[styles.codeBlock, { backgroundColor: isDark ? '#101038' : tokens.canvas, borderColor: tokens.ruleSoft }]}>
                <Text style={[styles.codeText, { color: tokens.action, fontFamily: typography.fontMono }]}>
                  {`// FHIR R4 Station Observation\n"station_id": "ST-0${campStations[activeStation].id}",\n"student_ref": "URN-OSMANIA-2026-ARJUN",\n"sync_mode": "SQLITE_OFFLINE_BUFFER",\n"latency_ms": 42,\n"verification": "NMC_COUNCIL_SIGNED"`}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ─── 8. THE ONE LOUD SCREEN: EMERGENCY 108 SOS ─────────────────── */}
      <View style={[styles.sectionWrapper, { backgroundColor: tokens.emergency }]}>
        <View style={styles.containerMax}>
          <View style={styles.emergencyGrid}>
            <View style={styles.emergencyLeft}>
              <View style={[styles.medicalHeaderTag, { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderLeftColor: '#ffffff' }]}>
                <Text style={[styles.medicalHeaderCode, { color: '#ffffff', fontFamily: typography.fontMono }]}>
                  SEC 05.0 // EMERGENCY TRIAGE
                </Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.5)' }}>|</Text>
                <Text style={[styles.medicalHeaderTitle, { color: '#ffffff', fontFamily: typography.fontMono }]}>
                  108 NATIONAL PROTOCOL
                </Text>
              </View>

              <Text style={styles.emergencyTitle}>
                An emergency card a stranger can read.
              </Text>
              <Text style={styles.emergencyDesc}>
                Blood group, allergies, conditions, medications, and who to call. Opens from the lock screen and from a printed QR without a login.
              </Text>

              <View style={styles.emergencyPoints}>
                <Text style={styles.emergencyPointItem}>✓ No app chrome, no scroll, no animation before it opens</Text>
                <Text style={styles.emergencyPointItem}>✓ Screen brightness forced to maximum</Text>
                <Text style={styles.emergencyPointItem}>✓ Zero login barrier during acute trauma</Text>
              </View>
            </View>

            {/* Emergency Card Display */}
            <View style={styles.emergencyCard}>
              <Text style={[styles.emergencyCardEyebrow, { fontFamily: typography.fontMono }]}>
                EMERGENCY MEDICAL ID
              </Text>
              <View style={styles.emergencyNameRow}>
                <Text style={styles.emergencyName}>ARJUN MEHTA</Text>
                <Text style={[styles.emergencyAge, { fontFamily: typography.fontMono }]}>22</Text>
              </View>

              <View style={styles.emergencyGridInfo}>
                <Text style={styles.infoLabel}>BLOOD</Text>
                <Text style={[styles.infoValue, { fontFamily: typography.fontMono }]}>B+ (Rh Positive)</Text>

                <Text style={styles.infoLabel}>ALLERGIES</Text>
                <Text style={[styles.infoValue, { fontFamily: typography.fontMono }]}>Penicillin, Sulfa drugs</Text>

                <Text style={styles.infoLabel}>CONDITIONS</Text>
                <Text style={[styles.infoValue, { fontFamily: typography.fontMono }]}>Asthma</Text>

                <Text style={styles.infoLabel}>MEDICATIONS</Text>
                <Text style={[styles.infoValue, { fontFamily: typography.fontMono }]}>Salbutamol inhaler</Text>
              </View>

              <View style={styles.emergencyCallRow}>
                <View style={styles.emergencyQrBox}>
                  <QrCode size={54} color={tokens.emergency} />
                </View>
                <View>
                  <Text style={styles.emergencyCallLabel}>IN EMERGENCY CALL</Text>
                  <Text style={[styles.emergencyCallNumber, { fontFamily: typography.fontMono }]}>108</Text>
                  <Text style={[styles.emergencyContacts, { fontFamily: typography.fontMono }]}>
                    Amma: +91 98111 22334{'\n'}Campus: +91 40230 16000
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ─── 9. SERVICES FABRIC ─────────────────────────────────────────── */}
      <View style={[styles.sectionWrapper, { backgroundColor: tokens.surface2, borderBottomColor: tokens.ruleSoft }]}>
        <View style={styles.containerMax}>
          <View style={{ marginBottom: 28 }}>
            {renderMedicalTag('SEC 06.0 // VERTICAL C', 'HEALTH SERVICES FABRIC (LOINC/SNOMED)', 'action')}
            <Text style={[styles.sectionH2, { color: tokens.text }]}>
              Everything your health centre and campus need to run.
            </Text>
          </View>

          {/* Category Tabs */}
          <View style={styles.categoryTabRow}>
            {serviceCategories.map((cat, idx) => {
              const active = activeCategory === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.84}
                  onPress={() => setActiveCategory(idx)}
                  style={[
                    styles.catTabBtn,
                    {
                      backgroundColor: active ? tokens.action : tokens.surface,
                      borderColor: active ? tokens.action : tokens.rule,
                    },
                  ]}
                >
                  <Text style={[styles.catTabLabel, { color: active ? '#ffffff' : tokens.text }]}>
                    {cat.label}
                  </Text>
                  <View style={[styles.catNumPill, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : tokens.surface3 }]}>
                    <Text style={[styles.catNumText, { color: active ? '#ffffff' : tokens.action, fontFamily: typography.fontMono }]}>
                      {cat.num}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.categoryContentCard, { backgroundColor: tokens.surface, borderColor: tokens.ruleSoft }]}>
            <View style={styles.servicesGrid}>
              {serviceCategories[activeCategory].services.map((svc, sIdx) => (
                <View key={sIdx} className="data-lift" style={[styles.svcCardItem, { backgroundColor: tokens.canvas, borderColor: tokens.ruleSoft }]}>
                  <View style={styles.svcCardRow}>
                    <View style={[styles.svcIconBox, { backgroundColor: tokens.surface3 }]}>
                      <CheckCircle2 size={16} color={tokens.action} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.svcName, { color: tokens.text }]}>{svc.name}</Text>
                      <Text style={[styles.svcMeta, { color: tokens.text2 }]}>{svc.meta}</Text>
                      <Text style={[styles.svcCode, { color: tokens.data, fontFamily: typography.fontMono }]}>SPEC: {svc.code}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* ─── 10. LEARN LIBRARY WITH VECTOR SVG MEDICAL ART ──────────────── */}
      <View style={[styles.sectionWrapper, { backgroundColor: tokens.surface, borderBottomColor: tokens.ruleSoft }]}>
        <View style={styles.containerMax}>
          <View style={{ marginBottom: 32 }}>
            {renderMedicalTag('SEC 07.0 // LEARN', 'DOCTOR-REVIEWED STUDENT WELLNESS', 'action')}
            <Text style={[styles.sectionH2, { color: tokens.text }]}>
              From the Learn library
            </Text>
          </View>

          <View style={styles.learnGrid}>
            
            {/* Card 1: Mess Plate Nutrition Vector Illustration */}
            <View className="data-lift" style={[styles.learnCard, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
              <div style={{ height: 168, background: tokens.surface2, overflow: 'hidden' }}>
                <svg viewBox="0 0 320 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
                  <rect width="320" height="168" fill={tokens.surface2} />
                  <circle cx="52" cy="34" r="34" fill={tokens.surface3} />
                  <circle cx="272" cy="140" r="42" fill={tokens.surface3} />
                  <rect x="40" y="118" width="240" height="10" rx="3" fill={tokens.artSoft} />
                  <circle cx="160" cy="82" r="46" fill={tokens.surface} stroke={tokens.action} strokeWidth="2.5" />
                  <circle cx="160" cy="82" r="34" fill="none" stroke={tokens.veil} strokeWidth="1.5" />
                  <path d="M160 48a34 34 0 0 1 0 68z" fill={tokens.surface3} />
                  <circle cx="147" cy="74" r="8" fill={tokens.surface3} stroke={tokens.action} strokeWidth="1.8" />
                  <circle cx="172" cy="70" r="6" fill={tokens.surface3} stroke={tokens.action} strokeWidth="1.8" />
                  <path d="M146 96h28" stroke={tokens.action} strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M74 60v46M74 60c-4 0-6 3-6 8s2 8 6 8" fill="none" stroke={tokens.action} strokeWidth="2.4" strokeLinecap="round" />
                  <path d="M246 62v44M240 62v12a6 6 0 0 0 12 0V62" fill="none" stroke={tokens.action} strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </div>
              <View style={styles.learnCardContent}>
                <Text style={[styles.learnCardTag, { color: tokens.action, fontFamily: typography.fontMono }]}>LIVING IN HOSTEL</Text>
                <Text style={[styles.learnCardTitle, { color: tokens.text }]}>Eating out of a mess for three years</Text>
                <Text style={[styles.learnCardDesc, { color: tokens.text2 }]}>
                  What a typical mess plate is short on (iron, protein, micronutrients), and what to supplement cheaply on campus.
                </Text>
              </View>
            </View>

            {/* Card 2: Before Exams Sleep Vector Illustration */}
            <View className="data-lift" style={[styles.learnCard, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
              <div style={{ height: 168, background: tokens.surface2, overflow: 'hidden' }}>
                <svg viewBox="0 0 320 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
                  <rect width="320" height="168" fill={tokens.surface2} />
                  <circle cx="266" cy="40" r="26" fill={tokens.surface3} />
                  <circle cx="58" cy="132" r="38" fill={tokens.surface3} />
                  <path d="M60 128h200" stroke={tokens.artSoft} strokeWidth="10" strokeLinecap="round" />
                  <path d="M212 116V70" stroke={tokens.action} strokeWidth="2.4" />
                  <path d="M212 70l-22-16" stroke={tokens.action} strokeWidth="2.4" />
                  <path d="M170 40h40l10 22h-60z" fill={tokens.surface3} stroke={tokens.action} strokeWidth="2.2" strokeLinejoin="round" />
                  <path d="M176 68c4 10 24 10 28 0" fill="rgba(255,176,32,0.18)" opacity="0.9" />
                  <rect x="196" y="112" width="32" height="6" rx="3" fill={tokens.action} />
                  <path d="M84 118c0-14 10-22 26-22s26 8 26 22z" fill={tokens.surface} stroke={tokens.action} strokeWidth="2.2" />
                  <path d="M110 96v22" stroke={tokens.veil} strokeWidth="1.6" />
                  <path d="M96 106h10M114 106h10" stroke={tokens.veil} strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <View style={styles.learnCardContent}>
                <Text style={[styles.learnCardTag, { color: tokens.action, fontFamily: typography.fontMono }]}>BEFORE EXAMS</Text>
                <Text style={[styles.learnCardTitle, { color: tokens.text }]}>Sleep, screens and the week before semester</Text>
                <Text style={[styles.learnCardDesc, { color: tokens.text2 }]}>
                  Reviewed by registered medical practitioners, written directly for a 20-year-old balancing exam stress.
                </Text>
              </View>
            </View>

            {/* Card 3: Reading CBC Report Vector Illustration */}
            <View className="data-lift" style={[styles.learnCard, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
              <div style={{ height: 168, background: tokens.surface2, overflow: 'hidden' }}>
                <svg viewBox="0 0 320 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
                  <rect width="320" height="168" fill={tokens.surface2} />
                  <circle cx="44" cy="130" r="34" fill={tokens.surface3} />
                  <circle cx="286" cy="36" r="28" fill={tokens.surface3} />
                  <rect x="72" y="24" width="118" height="126" rx="6" fill={tokens.surface} stroke={tokens.action} strokeWidth="2.4" />
                  <path d="M90 50h58M90 66h82M90 82h44" stroke={tokens.veil} strokeWidth="3" strokeLinecap="round" />
                  <path d="M90 108l18 14 20-30 16 22 18-34" fill="none" stroke={tokens.action} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="108" cy="122" r="3.5" fill={tokens.action} /><circle cx="162" cy="80" r="3.5" fill={tokens.action} />
                  <rect x="212" y="40" width="30" height="92" rx="15" fill={tokens.surface3} stroke={tokens.action} strokeWidth="2.4" />
                  <path d="M212 96h30" stroke={tokens.action} strokeWidth="2" />
                  <path d="M214 96h26v21a15 15 0 0 1-26 0z" fill={tokens.artSoft} />
                  <path d="M206 34h42" stroke={tokens.action} strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              <View style={styles.learnCardContent}>
                <Text style={[styles.learnCardTag, { color: tokens.action, fontFamily: typography.fontMono }]}>WHAT TESTS MEAN</Text>
                <Text style={[styles.learnCardTitle, { color: tokens.text }]}>Reading a CBC report line by line</Text>
                <Text style={[styles.learnCardDesc, { color: tokens.text2 }]}>
                  What each row measures (haemoglobin, platelets, neutrophils). General education, not a diagnosis of your personal record.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ─── 11. TRUSTED CLINICAL PARTNERS INFINITE MARQUEE ─────────────── */}
      <View style={{ paddingVertical: 56, backgroundColor: tokens.surface2, borderBottomColor: tokens.ruleSoft, borderBottomWidth: 1, overflow: 'hidden' }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontFamily: typography.fontMono, fontSize: 12, fontWeight: '800', letterSpacing: 1, color: tokens.text3, textTransform: 'uppercase' }}>
            TRUSTED CLINICAL & DIAGNOSTIC PARTNERS
          </Text>
        </View>

        <div style={{ overflow: 'hidden', position: 'relative' }}>
          <div className="marquee-track">
            {['Suraksha Labs', 'Kaviraa Hospitals', 'Vitalis Pharmacy', 'ClearSight Optics', 'Anvaya Dental', 'SRL Diagnostics', 'Thyrocare', 'Dr Lal PathLabs', 'Apollo Health', 'Suraksha Labs', 'Kaviraa Hospitals', 'Vitalis Pharmacy', 'ClearSight Optics', 'Anvaya Dental', 'SRL Diagnostics'].map((pt, pIdx) => (
              <div
                key={pIdx}
                className="data-lift"
                style={{
                  backgroundColor: tokens.surface,
                  border: `1px solid ${tokens.rule}`,
                  borderRadius: 16,
                  padding: '16px 28px',
                  margin: '0 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: 15,
                  fontWeight: 800,
                  color: tokens.ink,
                }}
              >
                <Building2 size={18} color={tokens.action} />
                <span>{pt}</span>
              </div>
            ))}
          </div>
        </div>
      </View>

      {/* ─── 12. PRICING TIERS ───────────────────────────────────────────── */}
      <View style={[styles.sectionWrapper, { backgroundColor: tokens.canvas, borderBottomColor: tokens.ruleSoft }]}>
        <View style={styles.containerMax}>
          <View style={{ alignItems: 'center', marginBottom: 36 }}>
            {renderMedicalTag('SEC 08.0 // RATE CARDS', 'CAMPUS & STUDENT TIERS', 'action')}
            <Text style={[styles.sectionH2, { color: tokens.text, textAlign: 'center' }]}>
              Plans for students and institutions
            </Text>
          </View>

          <View style={styles.pricingGrid}>
            <View className="data-lift" style={[styles.priceCard, { backgroundColor: tokens.surface, borderColor: tokens.ruleSoft }]}>
              <Text style={[styles.priceCardTag, { color: tokens.action, fontFamily: typography.fontMono }]}>STUDENT BASIC</Text>
              <Text style={[styles.priceCardAmount, { color: tokens.text }]}>
                ₹0 <Text style={[styles.priceCardPer, { color: tokens.text3 }]}>/ forever</Text>
              </Text>
              <Text style={[styles.priceCardDesc, { color: tokens.text2 }]}>Free for every university student in India with active student ID.</Text>
              
              <View style={[styles.priceFeatureList, { borderTopColor: tokens.ruleSoft }]}>
                <View style={styles.priceFeatureItem}>
                  <CheckCircle2 size={16} color={tokens.positive} />
                  <Text style={[styles.priceFeatureText, { color: tokens.text }]}>Unlimited Health Vault & OCR</Text>
                </View>
                <View style={styles.priceFeatureItem}>
                  <CheckCircle2 size={16} color={tokens.positive} />
                  <Text style={[styles.priceFeatureText, { color: tokens.text }]}>24x7 108 Emergency Medical ID</Text>
                </View>
                <View style={styles.priceFeatureItem}>
                  <CheckCircle2 size={16} color={tokens.positive} />
                  <Text style={[styles.priceFeatureText, { color: tokens.text }]}>ABDM ABHA Linking & Gateway</Text>
                </View>
              </View>

              <Button label="Get Student Access" onPress={() => { setAuthTab('signup'); setAuthModalOpen(true); }} variant="outline" fullWidth />
            </View>

            <View className="data-lift" style={[styles.priceCard, { backgroundColor: tokens.surface, borderColor: tokens.action, borderWidth: 2 }]}>
              <View style={[styles.pricePopularBadge, { backgroundColor: tokens.action }]}>
                <Text style={styles.pricePopularText}>POPULAR FOR CAMPUSES</Text>
              </View>
              <Text style={[styles.priceCardTag, { color: tokens.action, fontFamily: typography.fontMono }]}>CAMPUS PRO</Text>
              <Text style={[styles.priceCardAmount, { color: tokens.text }]}>
                ₹49 <Text style={[styles.priceCardPer, { color: tokens.text3 }]}>/ student / year</Text>
              </Text>
              <Text style={[styles.priceCardDesc, { color: tokens.text2 }]}>Institutions deploying full health center digitization and wellness.</Text>
              
              <View style={[styles.priceFeatureList, { borderTopColor: tokens.ruleSoft }]}>
                <View style={styles.priceFeatureItem}>
                  <CheckCircle2 size={16} color={tokens.positive} />
                  <Text style={[styles.priceFeatureText, { color: tokens.text }]}>Everything in Student Basic</Text>
                </View>
                <View style={styles.priceFeatureItem}>
                  <CheckCircle2 size={16} color={tokens.positive} />
                  <Text style={[styles.priceFeatureText, { color: tokens.text }]}>2 Annual 5-Station Health Camps</Text>
                </View>
                <View style={styles.priceFeatureItem}>
                  <CheckCircle2 size={16} color={tokens.positive} />
                  <Text style={[styles.priceFeatureText, { color: tokens.text }]}>24x7 Doctor Teleconsult Access</Text>
                </View>
              </View>

              <Button label="Request Campus Pilot" onPress={() => { setAuthTab('signup'); setAuthModalOpen(true); }} variant="impiloPill" fullWidth />
            </View>

            <View className="data-lift" style={[styles.priceCard, { backgroundColor: tokens.surface, borderColor: tokens.ruleSoft }]}>
              <Text style={[styles.priceCardTag, { color: tokens.action, fontFamily: typography.fontMono }]}>ENTERPRISE NETWORK</Text>
              <Text style={[styles.priceCardAmount, { color: tokens.text }]}>
                Custom <Text style={[styles.priceCardPer, { color: tokens.text3 }]}>/ university</Text>
              </Text>
              <Text style={[styles.priceCardDesc, { color: tokens.text2 }]}>Multi-campus universities, state education boards, and medical institutes.</Text>
              
              <View style={[styles.priceFeatureList, { borderTopColor: tokens.ruleSoft }]}>
                <View style={styles.priceFeatureItem}>
                  <CheckCircle2 size={16} color={tokens.positive} />
                  <Text style={[styles.priceFeatureText, { color: tokens.text }]}>Clinician EMR Console & Scribe</Text>
                </View>
                <View style={styles.priceFeatureItem}>
                  <CheckCircle2 size={16} color={tokens.positive} />
                  <Text style={[styles.priceFeatureText, { color: tokens.text }]}>Syndromic Fever Cluster Heatmap</Text>
                </View>
                <View style={styles.priceFeatureItem}>
                  <CheckCircle2 size={16} color={tokens.positive} />
                  <Text style={[styles.priceFeatureText, { color: tokens.text }]}>OpenHCX Cashless Claims</Text>
                </View>
              </View>

              <Button label="Talk to Enterprise Sales" onPress={() => {}} variant="outline" fullWidth />
            </View>
          </View>
        </View>
      </View>

      {/* ─── 13. FAQ ACCORDION ──────────────────────────────────────────── */}
      <View style={[styles.sectionWrapper, { backgroundColor: tokens.surface2, borderBottomColor: tokens.ruleSoft }]}>
        <View style={styles.containerMax}>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            {renderMedicalTag('SEC 09.0 // GOVERNANCE', 'DPDP ACT 2023 & PRIVACY FAQ', 'action')}
            <Text style={[styles.sectionH2, { color: tokens.text, textAlign: 'center' }]}>
              Frequently asked questions
            </Text>
          </View>

          <View style={styles.faqList}>
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <View key={idx} style={[styles.faqCard, { backgroundColor: tokens.surface, borderColor: isOpen ? tokens.action : tokens.ruleSoft }]}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setExpandedFaq(isOpen ? null : idx)}
                    style={styles.faqQuestionRow}
                  >
                    <Text style={[styles.faqQuestionText, { color: tokens.text }]}>{faq.q}</Text>
                    {isOpen ? <ChevronUp size={20} color={tokens.action} /> : <ChevronDown size={20} color={tokens.text3} />}
                  </TouchableOpacity>
                  {isOpen && (
                    <View style={[styles.faqAnswerBox, { borderTopColor: tokens.ruleSoft }]}>
                      <Text style={[styles.faqAnswerText, { color: tokens.text2 }]}>{faq.a}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* ─── 14. CTA BANNER ─────────────────────────────────────────────── */}
      <View style={[styles.ctaBanner, { backgroundColor: isDark ? tokens.blue01 : tokens.ink }]}>
        <View style={styles.containerMax}>
          <View style={styles.ctaContent}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              {renderMedicalTag('SEC 10.0 // DEPLOYMENT', 'CAMPUS HEALTH INFRASTRUCTURE', 'green')}
            </View>
            <Text style={styles.ctaHeading}>
              Start protecting your students with modern digital care.
            </Text>
            <Text style={[styles.ctaSub, { color: tokens.lavender04 }]}>
              Join premier universities across India. Launch annual health camps, digitize your campus medical room, and empower students with lifetime health records.
            </Text>

            <View style={styles.ctaActionsRow}>
              <Button
                label="Launch Student App"
                onPress={() => { setAuthTab('signup'); setAuthModalOpen(true); }}
                variant="impiloPill"
                size="lg"
                iconRight={<ArrowRight size={17} color={tokens.blue01} />}
              />
              <Button
                label="Student Login"
                onPress={() => { setAuthTab('login'); setAuthModalOpen(true); }}
                variant="outline"
                size="lg"
                textStyle={{ color: '#ffffff' }}
                style={{ borderColor: 'rgba(255,255,255,0.4)' }}
              />
            </View>
          </View>
        </View>
      </View>

      {/* ─── FLOATING CARE AI BUTTON ────────────────────────────────────── */}
      {onOpenAI && (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onOpenAI}
          style={[styles.floatingAiBtn, { backgroundColor: tokens.action, borderColor: tokens.lavender04 }]}
        >
          <Bot size={20} color="#ffffff" />
          <Text style={styles.floatingAiText}>Care AI</Text>
          <Sparkles size={14} color={tokens.brightTurquoise} />
        </TouchableOpacity>
      )}

      {/* ─── REACT NATIVE AUTH MODAL ────────────────────────────────────── */}
      <Modal visible={authModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: tokens.surface, borderColor: tokens.rule }]}>
            
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.capsuleLogo, { backgroundColor: tokens.blue01, borderColor: tokens.lavender03 }]}>
                  <View style={[styles.logoDot, { backgroundColor: tokens.brightGreen }]} />
                  <Text style={[styles.logoText, { color: '#ffffff', fontFamily: typography.fontMono }]}>SA CARE</Text>
                </View>
                <Text style={[styles.modalTitle, { color: tokens.text }]}>
                  {authTab === 'login' ? 'Student & Campus Login' : 'Create Student Account'}
                </Text>
              </View>

              <TouchableOpacity activeOpacity={0.8} onPress={() => setAuthModalOpen(false)}>
                <X size={20} color={tokens.text3} />
              </TouchableOpacity>
            </View>

            {/* Switcher */}
            <View style={[styles.modalTabRow, { backgroundColor: tokens.surface2 }]}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { setAuthTab('login'); setAuthStep(1); setAuthSuccess(false); }}
                style={[
                  styles.modalTabBtn,
                  { backgroundColor: authTab === 'login' ? tokens.surface : 'transparent' },
                ]}
              >
                <Text style={[styles.modalTabText, { color: authTab === 'login' ? tokens.action : tokens.text2 }]}>
                  Log in
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => { setAuthTab('signup'); setAuthStep(1); setAuthSuccess(false); }}
                style={[
                  styles.modalTabBtn,
                  { backgroundColor: authTab === 'signup' ? tokens.surface : 'transparent' },
                ]}
              >
                <Text style={[styles.modalTabText, { color: authTab === 'signup' ? tokens.action : tokens.text2 }]}>
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>

            {authSuccess ? (
              <View style={styles.authSuccessBox}>
                <View style={[styles.authSuccessIcon, { backgroundColor: tokens.positiveBg }]}>
                  <Check size={28} color={tokens.positive} />
                </View>
                <Text style={[styles.authSuccessTitle, { color: tokens.text }]}>
                  {authTab === 'login' ? 'Welcome Back, Arjun!' : 'Account Created Successfully!'}
                </Text>
                <Text style={[styles.authSuccessSub, { color: tokens.text2 }]}>
                  Your secure health vault and ABDM connection are active.
                </Text>
                <Button label="Enter Health Vault" onPress={() => setAuthModalOpen(false)} variant="impiloPill" fullWidth />
              </View>
            ) : authStep === 1 ? (
              <View style={styles.authForm}>
                <Text style={[styles.inputLabel, { color: tokens.text2 }]}>
                  MOBILE NUMBER (LINKED TO ABHA)
                </Text>
                <TextInput
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  placeholder="+91 98111 22334"
                  placeholderTextColor={tokens.text3}
                  keyboardType="phone-pad"
                  style={[styles.modalInput, { borderColor: tokens.rule, backgroundColor: tokens.canvas, color: tokens.text, fontFamily: typography.fontMono }]}
                />
                <Button label="Send ABDM OTP Verification" onPress={() => setAuthStep(2)} variant="primary" fullWidth />
                <Text style={[styles.authConsentText, { color: tokens.text3 }]}>
                  By signing in, you agree to DPDP Act 2023 Student Health Data Consent and HIPAA/ABDM terms.
                </Text>
              </View>
            ) : (
              <View style={styles.authForm}>
                <Text style={[styles.inputLabel, { color: tokens.text2 }]}>
                  ENTER 6-DIGIT OTP SENT TO +91 {phoneInput}
                </Text>
                <TextInput
                  value={otpInput}
                  onChangeText={setOtpInput}
                  placeholder="142857"
                  placeholderTextColor={tokens.text3}
                  keyboardType="number-pad"
                  style={[styles.modalInput, { borderColor: tokens.rule, backgroundColor: tokens.canvas, color: tokens.text, fontFamily: typography.fontMono, fontSize: 18, letterSpacing: 4, textAlign: 'center' }]}
                />
                <Button label="Verify OTP & Continue" onPress={() => setAuthSuccess(true)} variant="impiloPill" fullWidth />
                <TouchableOpacity activeOpacity={0.8} onPress={() => setAuthStep(1)} style={{ alignSelf: 'center', marginTop: 4 }}>
                  <Text style={[styles.editPhoneLink, { color: tokens.action }]}>← Edit Phone Number</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  pageRoot: {
    flex: 1,
    width: '100%',
  },
  headerContainer: {
    width: '100%',
    borderBottomWidth: 1,
  },
  headerInner: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  capsuleLogo: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  logoText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1,
  },
  authOutlineText: {
    fontSize: 13,
    fontWeight: '700',
  },
  authPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 9999,
  },
  authPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  telemetryBar: {
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  telemetryInner: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  telemetryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  telemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(92, 255, 177, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 9999,
  },
  pulseCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  telemetryPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ecgBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ecgValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  telemetryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    flexWrap: 'wrap',
  },
  telemetryMetricText: {
    fontSize: 12,
  },
  containerMax: {
    maxWidth: 1180,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 28,
  },
  heroSection: {
    paddingVertical: 80,
    borderBottomWidth: 1,
  },
  heroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 56,
    alignItems: 'center',
  },
  heroLeftCol: {
    flex: 1,
    minWidth: 320,
    gap: 18,
  },
  tagGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  medicalHeaderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  medicalHeaderCode: {
    fontSize: 11,
    fontWeight: '800',
  },
  medicalHeaderDivider: {
    fontSize: 11,
  },
  medicalHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroMainTitle: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 56,
  },
  heroSubtitle: {
    fontSize: 17,
    lineHeight: 26,
    maxWidth: 560,
  },
  heroCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  heroTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    flexWrap: 'wrap',
    borderTopWidth: 1,
    paddingTop: 20,
    marginTop: 10,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustText: {
    fontSize: 14,
    fontWeight: '700',
  },
  heroRightCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneBezel: {
    width: 340,
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 18px 48px rgba(22, 22, 92, 0.18)',
  },
  phoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  phoneTime: {
    fontSize: 11,
  },
  phoneSignal: {
    fontSize: 11,
  },
  phoneBody: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  phoneUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  phoneUserName: {
    fontSize: 20,
    fontWeight: '800',
  },
  phoneUserSwitch: {
    fontSize: 12,
  },
  phoneEmergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 10,
  },
  phoneEmergencyText: {
    fontSize: 13,
    fontWeight: '700',
  },
  phoneCampCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  phoneCampTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  phoneCampStatus: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  phoneRecordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  phoneRecordsTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  phoneAddIcon: {
    fontSize: 18,
    fontWeight: '800',
  },
  phoneTimeline: {
    paddingLeft: 18,
    position: 'relative',
  },
  timelineVerticalLine: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 0,
    width: 2,
  },
  timelineItem: {
    marginBottom: 14,
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: -18,
    top: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineDate: {
    fontSize: 10,
    marginBottom: 3,
  },
  timelineCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  timelineCardTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  timelineCardMetaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  timelineCardMeta: {
    fontSize: 11,
  },
  timelineCardFlag: {
    fontSize: 11,
    fontWeight: '700',
  },
  phoneNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  phoneNavItem: {
    fontSize: 11,
  },
  sectionWrapper: {
    paddingVertical: 80,
    borderBottomWidth: 1,
  },
  sectionH2: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 44,
    marginVertical: 10,
  },
  sectionP: {
    fontSize: 16,
    lineHeight: 26,
    maxWidth: 680,
  },
  vaultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 56,
    alignItems: 'center',
  },
  vaultLeft: {
    flex: 1,
    minWidth: 320,
  },
  ocrSelectRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 20,
  },
  ocrSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  ocrSelectText: {
    fontSize: 13,
    fontWeight: '700',
  },
  vaultDemoCard: {
    flex: 1,
    minWidth: 320,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  vaultCardTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  vaultCardDate: {
    fontSize: 12,
  },
  vaultCardSub: {
    fontSize: 13,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  gaugeBlock: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  gaugeTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  gaugeValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  gaugeValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  gaugeRef: {
    fontSize: 12,
  },
  gaugeTrack: {
    height: 6,
    borderRadius: 9999,
    marginVertical: 10,
    position: 'relative',
  },
  gaugeFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 9999,
  },
  gaugeThumb: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
  },
  gaugeDesc: {
    fontSize: 12,
    fontWeight: '600',
  },
  aiExplainerBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 12,
  },
  aiExplainerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  aiExplainerBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  gaugeActionsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
  },
  fourTabsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  fourTabCard: {
    flex: 1,
    minWidth: 240,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  fourTabTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  fourTabDesc: {
    fontSize: 14,
    lineHeight: 22,
  },
  passportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passportLeft: {
    flex: 1,
    minWidth: 320,
    maxWidth: 520,
  },
  passportFeatureBox: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 24,
  },
  passportFeatureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  passportCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    maxWidth: 480,
    width: '100%',
    boxShadow: '0 14px 40px rgba(22, 22, 92, 0.12)',
  },
  passportHeader: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passportHeaderText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  passportHeaderStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  passportBody: {
    padding: 24,
  },
  passportAvatarRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 20,
  },
  avatarSub: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  passportName: {
    fontSize: 22,
    fontWeight: '800',
  },
  passportUni: {
    fontSize: 13,
    marginBottom: 12,
  },
  passportStatsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  passportStatLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  passportStatVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  passportFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 18,
  },
  passportCheck: {
    fontSize: 12,
  },
  passportQrBox: {
    alignItems: 'center',
  },
  passportQrLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 4,
  },
  stationTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  stationTabBtn: {
    flex: 1,
    minWidth: 160,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  stationTabTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stationTabNumber: {
    fontSize: 10,
    fontWeight: '800',
  },
  stationTabStatus: {
    fontSize: 10,
    fontWeight: '700',
  },
  stationTabTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  stationDetailCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
    alignItems: 'stretch',
  },
  stationDetailLeft: {
    flex: 1.1,
    minWidth: 300,
    justifyContent: 'center',
  },
  stationDetailEyebrow: {
    fontSize: 12,
    fontWeight: '800',
  },
  stationDetailMainTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginVertical: 8,
  },
  stationDetailSub: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  stationBulletList: {
    gap: 10,
  },
  stationBulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stationBulletText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  stationPayloadBox: {
    flex: 1,
    minWidth: 280,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  stationPayloadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stationPayloadHeaderText: {
    fontSize: 11,
    fontWeight: '800',
  },
  codeBlock: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  codeText: {
    fontSize: 12,
    lineHeight: 18,
  },
  emergencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 48,
    alignItems: 'center',
  },
  emergencyLeft: {
    flex: 1,
    minWidth: 320,
  },
  emergencyTitle: {
    fontSize: 44,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1.5,
    lineHeight: 48,
    marginVertical: 14,
  },
  emergencyDesc: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 24,
    marginBottom: 20,
  },
  emergencyPoints: {
    gap: 8,
  },
  emergencyPointItem: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.88)',
  },
  emergencyCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    padding: 26,
  },
  emergencyCardEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 16,
  },
  emergencyNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    paddingBottom: 14,
  },
  emergencyName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  emergencyAge: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  emergencyGridInfo: {
    paddingVertical: 16,
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 6,
  },
  infoValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  emergencyCallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    paddingTop: 16,
  },
  emergencyQrBox: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyCallLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emergencyCallNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  emergencyContacts: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 16,
  },
  categoryTabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  catTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 9999,
    borderWidth: 1,
  },
  catTabLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  catNumPill: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 9999,
  },
  catNumText: {
    fontSize: 11,
    fontWeight: '800',
  },
  categoryContentCard: {
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  svcCardItem: {
    flex: 1,
    minWidth: 300,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  svcCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  svcIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svcName: {
    fontSize: 15,
    fontWeight: '700',
  },
  svcMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  svcCode: {
    fontSize: 11,
    marginTop: 4,
  },
  learnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  learnCard: {
    flex: 1,
    minWidth: 300,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  learnCardContent: {
    padding: 20,
  },
  learnCardTag: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },
  learnCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  learnCardDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  pricingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  priceCard: {
    flex: 1,
    minWidth: 300,
    padding: 28,
    borderRadius: 20,
    borderWidth: 1,
    position: 'relative',
  },
  pricePopularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 9999,
  },
  pricePopularText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  priceCardTag: {
    fontSize: 12,
    fontWeight: '800',
  },
  priceCardAmount: {
    fontSize: 34,
    fontWeight: '800',
    marginVertical: 8,
  },
  priceCardPer: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceCardDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  priceFeatureList: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginBottom: 24,
    gap: 10,
  },
  priceFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceFeatureText: {
    fontSize: 13,
  },
  faqList: {
    maxWidth: 880,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  faqCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  faqQuestionText: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  faqAnswerBox: {
    borderTopWidth: 1,
    padding: 18,
  },
  faqAnswerText: {
    fontSize: 14,
    lineHeight: 22,
  },
  ctaBanner: {
    paddingVertical: 80,
  },
  ctaContent: {
    maxWidth: 780,
    alignSelf: 'center',
    alignItems: 'center',
  },
  ctaHeading: {
    fontSize: 44,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1.5,
    lineHeight: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  ctaSub: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 28,
  },
  ctaActionsRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: 56,
    borderTopWidth: 1,
  },
  footerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 40,
    justifyContent: 'space-between',
  },
  footerDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginVertical: 14,
  },
  footerLiveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerLiveStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footerCol: {
    gap: 10,
    minWidth: 140,
  },
  footerColTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  footerLink: {
    fontSize: 13,
  },
  footerBottom: {
    borderTopWidth: 1,
    marginTop: 40,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerCopy: {
    fontSize: 12,
  },
  footerCert: {
    fontSize: 11,
  },
  floatingAiBtn: {
    position: 'absolute',
    bottom: 28,
    right: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 9999,
    borderWidth: 2,
    shadowColor: 'rgba(82, 79, 217, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
  },
  floatingAiText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 22, 92, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalTabRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 18,
  },
  modalTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  authForm: {
    gap: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  authConsentText: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  editPhoneLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  authSuccessBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  authSuccessIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  authSuccessTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  authSuccessSub: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },

  // Impilo Telemetry Portal Styles
  telemetryPortalCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
  },
  telemetryPortalSidebar: {
    width: 280,
    padding: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  telemetryPortalMain: {
    flex: 1,
    minWidth: 340,
    padding: 28,
  },
  telemetryPortalTopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    paddingBottom: 14,
    marginBottom: 20,
  },
  telemetryNavTab: {
    color: '#b1a6f6',
    fontSize: 14,
    fontWeight: '600',
  },
  telemetryNavTabActive: {
    paddingBottom: 14,
    marginBottom: -15,
    borderBottomWidth: 2,
  },
  telemetryPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  telemetryPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  telemetryPortalPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  telemetryAverageBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  telemetryGraphCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  telemetryXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 10,
  },

  // Impilo Step 01 & 02 Styles
  impiloStepGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 56,
    alignItems: 'center',
  },
  impiloStepLeft: {
    flex: 1,
    minWidth: 320,
    maxWidth: 480,
  },
  impiloStepRight: {
    flex: 1.1,
    minWidth: 340,
  },
  impiloStepIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  impiloStepNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  impiloStepHeading: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 44,
    marginBottom: 16,
  },
  impiloStepSub: {
    fontSize: 16,
    lineHeight: 24,
  },
  patientMatrixCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 28,
    overflow: 'hidden',
    position: 'relative',
    gap: 12,
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
  },
  subduedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    opacity: 0.35,
  },
  subduedDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
  },
  subduedBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  activePatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1.5,
    position: 'relative',
    boxShadow: '0 0 24px rgba(0, 177, 255, 0.25)',
  },
  deviceCanvasBox: {
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 12,
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
  },
});
