import React, { useState } from 'react';
import { useApiResource } from '@/hooks/useApiResource';
import { rupees } from './LandingView';
import './landing.css';

interface CatalogItem {
  id: string;
  name: string;
  brand: string;
  kind: string;
  pack: string;
  pricePaise: number;
  mrpPaise: number;
}

interface Catalog {
  items: CatalogItem[];
  total: number;
}

export function LandingLabTestsView(): React.ReactElement {
  const catalog = useApiResource<Catalog>('/catalog?kind=lab&limit=12');
  const apiItems = catalog.data?.items ?? [];

  // Interactive newsletter / subscribe dispatch tab
  const [nlTab, setNlTab] = useState<'wa' | 'em'>('wa');
  const [nlInput, setNlInput] = useState('');
  const [nlSubscribed, setNlSubscribed] = useState(false);

  // Interactive FAQ accordion
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // SVG Paths
  const drop = 'M12 3c3 3.5 5 6.2 5 9a5 5 0 0 1-10 0c0-2.8 2-5.5 5-9z';
  const heart = 'M12 20c4-2.5 6-5.6 6-9a6 6 0 0 0-12 0c0 3.4 2 6.5 6 9z';
  const body = 'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 9h8l-1 5-1 7h-2l-1-5-1 5H8l-1-7z';
  const lungs = 'M12 4v9M8 8c-2 1-3 4-3 7a2 2 0 0 0 4 0c0-3-.5-5-1-7zM16 8c2 1 3 4 3 7a2 2 0 0 1-4 0c0-3 .5-5 1-7z';
  const pill = 'M8.5 15.5l7-7a4 4 0 0 0-5.7-5.7l-7 7a4 4 0 0 0 5.7 5.7z';
  const thyroid = 'M7 5c0 4 1 7 5 7s5-3 5-7M9 12l-1 7h8l-1-7';
  const phone = 'M5 4h3.5l1.6 4-2.2 1.4a11.5 11.5 0 0 0 5.7 5.7L15 12.9l4 1.6V18a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 3 6.2 2 2 0 0 1 5 4z';
  const chat = 'M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3.5 20.5l1.7-5.1A8.5 8.5 0 1 1 21 11.5z';
  const doc = 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5';

  const nav = [
    { label: 'Discover', href: '/landing', on: false },
    { label: 'Wellness', href: '/shop', on: false },
    { label: 'Training', href: '/programs', on: false },
    { label: 'Lab tests', href: '/lab-tests', on: true },
    { label: 'Find a doctor', href: '/consult', on: false },
    { label: 'Programmes', href: '/programs', on: false },
    { label: 'Plans', href: '/plans', on: false }
  ];

  const quick = [
    { label: 'Book by WhatsApp', href: 'https://wa.me/919999999999?text=Hi%20Studentkare%2C%20I%20want%20to%20book%20a%20lab%20test', path: chat, ink: '#059669', bg: '#ECFDF5' },
    { label: 'Upload a prescription', href: '/prescriptions', path: doc, ink: '#B45309', bg: '#FFFBEB' },
    { label: 'Campus health desk', href: '/emergency', path: phone, ink: '#3525CD', bg: '#EEF2FF' }
  ];

  const needs = [
    { label: 'Full body packages', path: body, ink: '#059669', tint: '#ECFDF5', href: '/shop?kind=lab' },
    { label: 'Fever tests', path: drop, ink: '#E11D48', tint: '#FFE4E6', href: '/shop?kind=lab' },
    { label: 'Vitamin tests', path: pill, ink: '#7C6BA8', tint: '#EDEBFA', href: '/shop?kind=lab' },
    { label: 'Thyroid tests', path: thyroid, ink: '#4F46E5', tint: '#EEF2FF', href: '/shop?kind=lab' },
    { label: 'Anemia & iron', path: heart, ink: '#C4756B', tint: '#FBEAE2', href: '/shop?kind=lab' },
    { label: 'X-rays & scans', path: lungs, ink: '#4F46E5', tint: '#EEF2FF', href: '/shop?kind=lab' }
  ];

  const proof = [
    { title: 'NABL labs only', meta: 'No unaccredited diagnostics, ever', bg: 'linear-gradient(145deg,#2F3ED6,#1E1B4B)' },
    { title: 'Collected at your block', meta: 'Not a clinic across the city', bg: 'linear-gradient(145deg,#1F6F53,#134632)' },
    { title: 'Cold chain tracked', meta: 'Temperature and time, both shown', bg: 'linear-gradient(145deg,#3E4C7A,#20263F)' },
    { title: 'Bad sample, free redo', meta: 'Haemolysis is our problem, not yours', bg: 'linear-gradient(145deg,#7A5230,#3E2A18)' }
  ];

  const concerns = [
    { label: 'Fever', path: drop, ink: '#C4756B', tint: '#FBEAE2', href: '/shop?kind=lab' },
    { label: 'Vitamins', path: pill, ink: '#7C6BA8', tint: '#EDEBFA', href: '/shop?kind=lab' },
    { label: 'Thyroid', path: thyroid, ink: '#4F46E5', tint: '#EEF2FF', href: '/shop?kind=lab' },
    { label: 'Anemia', path: heart, ink: '#C4756B', tint: '#FBEAE2', href: '/shop?kind=lab' },
    { label: 'Liver & kidney', path: drop, ink: '#5E8F73', tint: '#E6F0EA', href: '/shop?kind=lab' },
    { label: 'X-rays & scans', path: lungs, ink: '#4F46E5', tint: '#EEF2FF', href: '/shop?kind=lab' }
  ];

  const defaultPackages = [
    { id: 'pkg-1', name: 'Complete Health Checkup', tests: 'Contains 72 tests', report: 'Report within 24 hours', off: '50% OFF', mrp: '₹2,999', price: '₹1,499', fast: 'Needs 10 hrs fasting', fasting: true },
    { id: 'pkg-2', name: 'Student Starter Panel', tests: 'Contains 21 tests', report: 'Report within 24 hours', off: '36% OFF', mrp: '₹499', price: '₹319', fast: 'No fasting needed', fasting: false },
    { id: 'pkg-3', name: 'Anemia & Iron Panel', tests: 'Contains 4 tests', report: 'Report within 24 hours', off: '42% OFF', mrp: '₹1,199', price: '₹699', fast: 'Needs 10 hrs fasting', fasting: true },
    { id: 'pkg-4', name: 'Thyroid Profile', tests: 'Contains 3 tests', report: 'Report within 12 hours', off: '44% OFF', mrp: '₹799', price: '₹449', fast: 'No fasting needed', fasting: false }
  ];

  const packagesToDisplay = apiItems.length >= 4 
    ? apiItems.slice(0, 4).map((item, idx) => ({
        id: item.id,
        name: item.name,
        tests: item.pack || 'Comprehensive screening',
        report: 'Report within 24 hours',
        off: item.mrpPaise > item.pricePaise ? `${Math.round(((item.mrpPaise - item.pricePaise) / item.mrpPaise) * 100)}% OFF` : 'SPECIAL',
        mrp: item.mrpPaise > item.pricePaise ? rupees(item.mrpPaise) : '',
        price: rupees(item.pricePaise),
        fast: idx % 2 === 0 ? 'Needs 10 hrs fasting' : 'No fasting needed',
        fasting: idx % 2 === 0
      }))
    : defaultPackages;

  const steps = [
    { n: '01', title: 'Pick a slot', body: 'Fasting tests show morning slots only, with the reason. You are never offered a slot you cannot use.' },
    { n: '02', title: 'A phlebotomist arrives', body: 'At your block lobby, in the window you chose. You get their name before they arrive.' },
    { n: '03', title: 'Tracked in transit', body: 'Time and temperature are logged. Outside the window, the sample is flagged rather than run.' },
    { n: '04', title: 'Analysed and signed', body: 'A NABL lab runs it and a pathologist signs. A critical value is released immediately, ahead of the rest.' },
    { n: '05', title: 'Lands in your vault', body: 'Not in an email you lose. Share it with a clinician for as long as you choose.' }
  ];

  const rules = [
    { label: 'Your campus told you booked a test', tag: 'NEVER', on: false },
    { label: 'Results used to rank anything you are shown', tag: 'NEVER', on: false },
    { label: 'An unaccredited lab running your sample', tag: 'NEVER', on: false },
    { label: 'A critical value released ahead of the report', tag: 'ALWAYS', on: true },
    { label: 'A free recollection if the sample is unusable', tag: 'ALWAYS', on: true }
  ];

  const faqs = [
    {
      q: 'Do I need to fast?',
      a: 'Only for some tests, and the booking sheet tells you before you pick a slot — fasting tests show morning slots only. Water is fine throughout.'
    },
    {
      q: 'Who comes to collect the sample?',
      a: 'A trained, certified phlebotomist employed by our NABL lab partner comes to your hostel block reception/lobby. You receive their verified profile, name, and live transit status on your phone before they arrive.'
    },
    {
      q: 'What happens if my sample is unusable?',
      a: 'Haemolysis or insufficient sample volume is never your financial or logistical burden. If a sample cannot be accurately processed by the lab, a free priority recollection slot is scheduled immediately at no charge.'
    },
    {
      q: 'Can my college see my results?',
      a: 'Never. In accordance with Rule L and our strict campus firewall, your individual test results remain confidential in your private health vault. Campuses see aggregated epidemiological counts only, never individual identities or clinical reports.'
    },
    {
      q: 'How fast is a critical result handled?',
      a: 'When an emergency critical panic value (e.g., severe hypokalemia or profound anemia) is flagged by the analyser, it triggers an immediate urgent alert to your vault and direct priority routing to campus on-call clinicians rather than waiting for normal batch report release.'
    },
    {
      q: 'Can I book for someone who is not a student?',
      a: 'Campus hostel collection is restricted to active campus residents, faculty, and affiliated staff. Off-campus family members can book home diagnostic visits through partner clinic booking flows in the app.'
    }
  ];

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#F6F7FC', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
      
      {/* 1. Header */}
      <header style={{ height: '66px', padding: '0 clamp(16px, 3.5vw, 44px)', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid #EEF2FF', flexWrap: 'wrap', boxSizing: 'border-box' }}>
        <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="30" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="ltA" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#ltA)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <span style={{ fontSize: '17px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>
            Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
          </span>
        </a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }} aria-label="Main Navigation">
          {nav.map((n) => (
            <a
              key={n.label}
              href={n.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: '38px',
                padding: '0 14px',
                borderRadius: '11px',
                fontSize: '13.5px',
                textDecoration: 'none',
                ...(n.on
                  ? { background: '#EDEEFB', color: '#3525CD', fontWeight: 800 }
                  : { color: '#464555', fontWeight: 600 })
              }}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <span style={{ flexGrow: 1 }} />
        <a href="/login" style={{ fontSize: '13.5px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>
          Sign in
        </a>
      </header>

      {/* 2. Top Video Banner */}
      <section
        aria-label="Lab tests at your hostel"
        style={{
          position: 'relative',
          margin: '22px clamp(16px, 3.5vw, 44px) 0',
          height: '240px',
          borderRadius: '28px',
          background: '#06051A',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden'
        }}
      >
        <video
          src="/assets/09075f98cb4208f2f1d5cf0b8bcbfa04.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          style={{ position: 'absolute', top: 0, right: 0, width: '72%', height: '100%', objectFit: 'cover' }}
        />
        <span
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, #06051A 0%, #06051A 30%, rgba(6,5,26,0.55) 52%, rgba(6,5,26,0) 78%)'
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, width: '440px', padding: '0 0 0 clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#A5B4FC' }}>
            LAB TESTS AT YOUR HOSTEL
          </span>
          <span style={{ fontSize: '28px', lineHeight: 1.2, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.7px' }}>
            Science you can read.
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>
              NABL labs
            </span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>
              Clinician-signed
            </span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>
              Results in 24 h
            </span>
          </div>
        </div>
      </section>

      {/* 3. Hero Section */}
      <section style={{ padding: '44px clamp(16px, 3.5vw, 44px) 0', display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        {/* Left Column */}
        <div style={{ flex: '1 1 540px', maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 46px)', lineHeight: 1.1, fontWeight: 800, color: '#131B2E', letterSpacing: '-1.7px' }}>
            Book a lab test. A phlebotomist comes to your block.
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '60px', padding: '0 10px 0 20px', borderRadius: '16px', background: '#FFFFFF', border: '1px solid #EEF2FF', boxSizing: 'border-box' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#777587" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s7-5.2 7-10.5A7 7 0 0 0 5 10.5C5 15.8 12 21 12 21z" />
              <circle cx="12" cy="10" r="2.4" />
            </svg>
            <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#131B2E', whiteSpace: 'nowrap' }}>VNR VJIET · Block B</span>
            <span style={{ width: '1px', height: '26px', background: '#EEF2FF', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search tests or full-body checkups"
              aria-label="Search tests or full-body checkups"
              style={{ flexGrow: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: '14.5px', fontWeight: 500, color: '#131B2E' }}
            />
            <button
              type="button"
              aria-label="Search"
              style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#3525CD', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4.5 4.5" />
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {quick.map((q) => (
              <a
                key={q.label}
                href={q.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  height: '46px',
                  padding: '0 18px',
                  borderRadius: '13px',
                  background: q.bg,
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: '#131B2E',
                  textDecoration: 'none'
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={q.ink} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={q.path} />
                </svg>
                {q.label}
              </a>
            ))}
          </div>

          <div style={{ padding: '22px', borderRadius: '18px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid #EEF2FF' }}>
            <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#131B2E' }}>
              Find tests &amp; packages for your needs
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {needs.map((n) => (
                <a
                  key={n.label}
                  href={n.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '11px',
                    padding: '14px',
                    borderRadius: '13px',
                    background: '#FAFAFE',
                    border: '1px solid #EEF2FF',
                    textDecoration: 'none'
                  }}
                >
                  <span style={{ flexGrow: 1, fontSize: '13px', lineHeight: 1.3, fontWeight: 700, color: '#131B2E' }}>
                    {n.label}
                  </span>
                  <span style={{ width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: n.tint }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={n.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={n.path} />
                    </svg>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            aria-label="3D lab illustration"
            style={{
              height: '300px',
              borderRadius: '24px',
              background: 'radial-gradient(circle at 60% 40%, #FFFFFF 0%, #EEF2FF 60%, #E0E7FF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            <img
              src="/assets/aa86cceef7f47ddd0066a108e627ed0b.png"
              alt="3D Lab Equipment"
              style={{ height: '280px', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          <div style={{ flexGrow: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {proof.map((p) => (
              <div
                key={p.title}
                style={{
                  minHeight: '172px',
                  padding: '22px',
                  borderRadius: '18px',
                  background: p.bg,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  boxSizing: 'border-box'
                }}
              >
                <span style={{ flexGrow: 1 }} />
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                  {p.title}
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'rgba(255,255,255,0.78)' }}>
                  {p.meta}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Tests by What Is Going On */}
      <section style={{ padding: '46px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>
          Tests by what is going on.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
          {concerns.map((c) => (
            <a
              key={c.label}
              href={c.href}
              style={{ display: 'flex', flexDirection: 'column', gap: '11px', textDecoration: 'none' }}
            >
              <span style={{ height: '104px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.tint }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={c.ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={c.path} />
                </svg>
              </span>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#131B2E', textAlign: 'center' }}>
                {c.label}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* 5. Full-Body Packages */}
      <section style={{ padding: '46px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>
            Full-body packages.
          </h2>
          <a href="/shop?kind=lab" style={{ fontSize: '14px', fontWeight: 800, color: '#3525CD', textDecoration: 'none' }}>
            See all lab tests →
          </a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          {packagesToDisplay.map((p) => (
            <div
              key={p.id}
              style={{
                padding: '22px',
                borderRadius: '18px',
                background: '#FFFFFF',
                border: '1px solid #EEF2FF',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#EEF2FF', fontSize: '10px', fontWeight: 800, color: '#3525CD', letterSpacing: '0.4px' }}>
                  PACKAGE
                </span>
                <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#ECFDF5', fontSize: '10.5px', fontWeight: 800, color: '#047857' }}>
                  {p.off}
                </span>
              </div>
              <span style={{ fontSize: '17px', lineHeight: 1.25, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>
                {p.name}
              </span>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#464555' }}>
                {p.tests}
              </span>
              <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#6B6980' }}>
                {p.report}
              </span>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: p.fasting ? '#D97706' : '#059669' }}>
                {p.fast}
              </span>
              <span style={{ flexGrow: 1 }} />
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #EEF2FF' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {p.mrp ? (
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#6B6980', textDecoration: 'line-through' }}>
                      {p.mrp}
                    </span>
                  ) : null}
                  <span style={{ fontSize: '21px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.6px', fontVariantNumeric: 'tabular-nums' }}>
                    {p.price}
                  </span>
                </div>
                <a
                  href="/shop?kind=lab"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '42px',
                    padding: '0 20px',
                    borderRadius: '11px',
                    background: '#3525CD',
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    textDecoration: 'none'
                  }}
                >
                  Book slot
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. How Campus Collection Works */}
      <section
        style={{
          margin: '50px clamp(16px, 3.5vw, 44px) 0',
          padding: 'clamp(20px, 3vw, 36px)',
          borderRadius: '24px',
          background: '#FFFFFF',
          border: '1px solid #EEF2FF',
          display: 'flex',
          flexDirection: 'column',
          gap: '26px'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>
            How campus collection works.
          </h2>
          <p style={{ margin: 0, maxWidth: '700px', fontSize: '14.5px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
            A sample is not a parcel. Time and temperature between your block and the lab are clinical facts, so both are tracked and shown to you.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
          {steps.map((s) => (
            <div key={s.n} style={{ display: 'flex', flexDirection: 'column', gap: '11px', paddingTop: '18px', borderTop: '3px solid #4F46E5' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1px' }}>
                {s.n}
              </span>
              <span style={{ fontSize: '16px', lineHeight: 1.25, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>
                {s.title}
              </span>
              <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
                {s.body}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 7. About Your Results (Privacy & Compliance) */}
      <section
        style={{
          margin: '40px clamp(16px, 3.5vw, 44px) 0',
          padding: 'clamp(24px, 3.5vw, 44px) clamp(20px, 3.5vw, 50px)',
          borderRadius: '24px',
          background: 'linear-gradient(145deg, #312E81 0%, #1E1B4B 60%, #17144C 100%)',
          display: 'flex',
          gap: '52px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 360px', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#82F5C1', letterSpacing: '1.3px' }}>
            ABOUT YOUR RESULTS
          </span>
          <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 31px)', lineHeight: 1.14, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1px' }}>
            The result is yours before it is anyone else's.
          </h2>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.65, fontWeight: 500, color: '#A9A5E0' }}>
            A report lands in your vault. You choose whether a clinician sees it, and for how long.
          </p>
        </div>
        <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column' }}>
          {rules.map((r, i) => (
            <div
              key={r.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '13px',
                padding: '13px 0',
                borderBottom: i < rules.length - 1 ? '1px solid rgba(255,255,255,0.10)' : 'none'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, background: r.on ? '#82F5C1' : '#F87171' }} />
              <span style={{ flexGrow: 1, fontSize: '14px', fontWeight: 600, color: '#EEF0FF' }}>
                {r.label}
              </span>
              <span
                style={{
                  padding: '4px 11px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  ...(r.on
                    ? { background: 'rgba(130,245,193,0.16)', color: '#82F5C1' }
                    : { background: 'rgba(248,113,113,0.16)', color: '#FCA5A5' })
                }}
              >
                {r.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Questions Students Actually Ask (Accordion) */}
      <section style={{ padding: '46px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>
          Questions students actually ask.
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {faqs.map((f, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={f.q}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '20px 0',
                  borderBottom: '1px solid #DAE2FD',
                  cursor: 'pointer'
                }}
                onClick={() => setOpenFaq(isOpen ? null : idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setOpenFaq(isOpen ? null : idx);
                  }
                }}
                aria-expanded={isOpen}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#131B2E' }}>
                    {f.q}
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#777587"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0,
                      marginTop: '3px'
                    }}
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
                {isOpen ? (
                  <p style={{ margin: '10px 0 0', maxWidth: '900px', fontSize: '14px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
                    {f.a}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* 9. Why Students Trust Student Kare */}
      <section
        aria-label="Why students trust Student Kare"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          margin: '64px clamp(16px, 3.5vw, 44px) 0',
          padding: '40px 24px',
          borderRadius: '28px',
          background: '#FFFFFF',
          border: '1px solid #EEF2FF'
        }}
      >
        {/* Pillar 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
            <defs>
              <radialGradient id="bt0ind" cx="35%" cy="25%" r="85%"><stop offset="0" stopColor="#8B93FF" /><stop offset=".5" stopColor="#4F46E5" /><stop offset="1" stopColor="#2A1F9E" /></radialGradient>
              <linearGradient id="bt0gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" stopOpacity=".75" /><stop offset="1" stopColor="#FFFFFF" stopOpacity="0" /></linearGradient>
              <linearGradient id="bt0gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE39A" /><stop offset=".5" stopColor="#F5B83D" /><stop offset="1" stopColor="#C98512" /></linearGradient>
              <radialGradient id="bt0sh" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#1E1B4B" stopOpacity=".28" /><stop offset="1" stopColor="#1E1B4B" stopOpacity="0" /></radialGradient>
            </defs>
            <ellipse cx="42" cy="78" rx="26" ry="5" fill="url(#bt0sh)" />
            <path d="M42 6 16 16v20c0 18 11 31 26 37 15-6 26-19 26-37V16z" fill="url(#bt0ind)" />
            <path d="M42 6 16 16v20c0 6 1 11 4 16C22 30 30 16 42 10z" fill="url(#bt0gloss)" opacity=".7" />
            <path d="M33 38v-6a9 9 0 0 1 18 0v6" fill="none" stroke="url(#bt0gold)" strokeWidth="5" strokeLinecap="round" />
            <rect x="28" y="36" width="28" height="22" rx="6" fill="url(#bt0gold)" />
            <rect x="31" y="38" width="22" height="6" rx="3" fill="#FFFFFF" opacity=".45" />
            <circle cx="42" cy="47" r="3.2" fill="#7A4A08" />
            <rect x="40.6" y="48" width="2.8" height="6" rx="1.4" fill="#7A4A08" />
          </svg>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Private by default</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Records open only to you and the clinician you choose. Your campus sees counts, never results.
          </span>
        </div>

        {/* Pillar 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
            <defs>
              <radialGradient id="bt1ind" cx="35%" cy="25%" r="85%"><stop offset="0" stopColor="#8B93FF" /><stop offset=".5" stopColor="#4F46E5" /><stop offset="1" stopColor="#2A1F9E" /></radialGradient>
              <linearGradient id="bt1gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE39A" /><stop offset=".5" stopColor="#F5B83D" /><stop offset="1" stopColor="#C98512" /></linearGradient>
              <radialGradient id="bt1mint" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#B8F7DA" /><stop offset=".55" stopColor="#34D399" /><stop offset="1" stopColor="#047857" /></radialGradient>
              <radialGradient id="bt1sh" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#1E1B4B" stopOpacity=".28" /><stop offset="1" stopColor="#1E1B4B" stopOpacity="0" /></radialGradient>
            </defs>
            <ellipse cx="42" cy="78" rx="26" ry="5" fill="url(#bt1sh)" />
            <path d="M28 44 20 72l11-4 6 10 8-27zM56 44l8 28-11-4-6 10-8-27z" fill="url(#bt1ind)" />
            <circle cx="42" cy="34" r="25" fill="url(#bt1gold)" />
            <circle cx="42" cy="34" r="18" fill="url(#bt1mint)" />
            <path d="M33 34l6 6 12-13" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <ellipse cx="33" cy="20" rx="9" ry="5" fill="#FFFFFF" opacity=".5" transform="rotate(-25 33 20)" />
          </svg>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Verified clinicians</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Every doctor is NMC-registered and every lab NABL-accredited before they can list.
          </span>
        </div>

        {/* Pillar 3 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
            <defs>
              <radialGradient id="bt2ind" cx="35%" cy="25%" r="85%"><stop offset="0" stopColor="#8B93FF" /><stop offset=".5" stopColor="#4F46E5" /><stop offset="1" stopColor="#2A1F9E" /></radialGradient>
              <radialGradient id="bt2sh" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#1E1B4B" stopOpacity=".28" /><stop offset="1" stopColor="#1E1B4B" stopOpacity="0" /></radialGradient>
            </defs>
            <ellipse cx="42" cy="78" rx="26" ry="5" fill="url(#bt2sh)" />
            <path d="M10 70V36l22-15 22 15v34z" fill="#C7D2FE" />
            <path d="M32 21l22 15v34H32z" fill="#A5B4FC" />
            <path d="M6 38 32 18l26 20" fill="none" stroke="url(#bt2ind)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="17" y="42" width="9" height="9" rx="2" fill="#FFFFFF" />
            <rect x="38" y="42" width="9" height="9" rx="2" fill="#E0E7FF" />
            <rect x="25" y="56" width="14" height="14" rx="2" fill="url(#bt2ind)" />
            <path d="M64 4c-9 0-15 7-15 14 0 10 15 25 15 25s15-15 15-25c0-7-6-14-15-14z" fill="url(#bt2ind)" />
            <circle cx="64" cy="18" r="5.5" fill="#FFFFFF" />
          </svg>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Near your hostel</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Collection at your block, consults between classes, a campus clinic when it is open.
          </span>
        </div>

        {/* Pillar 4 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
            <defs>
              <linearGradient id="bt3paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#D9DEFA" /></linearGradient>
              <radialGradient id="bt3mint" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#B8F7DA" /><stop offset=".55" stopColor="#34D399" /><stop offset="1" stopColor="#047857" /></radialGradient>
              <radialGradient id="bt3sh" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#1E1B4B" stopOpacity=".28" /><stop offset="1" stopColor="#1E1B4B" stopOpacity="0" /></radialGradient>
            </defs>
            <ellipse cx="42" cy="78" rx="26" ry="5" fill="url(#bt3sh)" />
            <path d="M22 6h40v64l-6-4-7 4-7-4-7 4-7-4-6 4z" fill="url(#bt3paper)" stroke="#C7D2FE" strokeWidth="1.5" />
            <path d="M22 6h40v8H22z" fill="#EEF2FF" />
            <circle cx="42" cy="34" r="15" fill="url(#bt3mint)" />
            <path d="M36 26h12M36 26c5 0 8 2.5 8 6s-3 6-8 6h-1l11 9M36 32h12" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M30 56h24" stroke="#A5B4FC" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Price before you book</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Every price is on screen before you confirm. A plan changes the price, never the care.
          </span>
        </div>
      </section>

      {/* 10. Get the App Banner */}
      <section
        aria-label="Get the Student Kare app"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '40px',
          margin: '40px clamp(16px, 3.5vw, 44px) 64px',
          padding: '0 0 0 clamp(24px, 4vw, 56px)',
          minHeight: '420px',
          borderRadius: '28px',
          background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 60%, #DAE2FD 100%)',
          overflow: 'hidden',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '48px 0' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#3525CD' }}>
            GET THE APP
          </span>
          <span style={{ fontSize: 'clamp(26px, 3vw, 32px)', lineHeight: 1.2, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.9px', maxWidth: '520px' }}>
            Your records, your camp slots and your card — in your pocket.
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>
              <span style={{ width: '34px', height: '34px', borderRadius: '11px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3525CD" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="10" r="3" />
                  <path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" />
                </svg>
              </span>
              Live phlebotomist tracking
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>
              <span style={{ width: '34px', height: '34px', borderRadius: '11px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3525CD" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="5" width="16" height="14" rx="3" />
                  <path d="M12 9v6M9 12h6" />
                </svg>
              </span>
              Offline emergency card
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>
              <span style={{ width: '34px', height: '34px', borderRadius: '11px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3525CD" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" />
                </svg>
              </span>
              Reports the moment a clinician signs
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingTop: '4px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href="/login"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '184px',
                  height: '54px',
                  padding: '0 16px',
                  boxSizing: 'border-box',
                  borderRadius: '14px',
                  background: '#131B2E',
                  color: '#FFFFFF',
                  textDecoration: 'none'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 3c-1 0-2.4.8-3 1.8-.6.9-1 2.2-.8 3.3 1.2 0 2.4-.7 3.1-1.7.6-.9 1-2.1.7-3.4z" />
                  <path d="M19 16.5c-.6 1.4-1 2-1.8 3.2-1.2 1.6-2.8 1.7-3.8 1-1-.5-1.8-.5-2.8 0-1.2.7-2.5.5-3.7-1C4.4 16.9 4 12.4 6 10c1.3-1.6 3-1.7 4.2-1 1 .5 1.7.5 2.6 0 1.3-.7 3-.6 4.2.8-2.8 1.7-2.4 5.8 2 6.7z" />
                </svg>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600 }}>Download on the</span>
                  <span style={{ fontSize: '17px', fontWeight: 800 }}>App Store</span>
                </span>
              </a>
              <a
                href="/login"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '184px',
                  height: '54px',
                  padding: '0 16px',
                  boxSizing: 'border-box',
                  borderRadius: '14px',
                  background: '#131B2E',
                  color: '#FFFFFF',
                  textDecoration: 'none'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 3l12 9-12 9z" />
                  <path d="M5 3l9 9M5 21l9-9" />
                </svg>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600 }}>GET IT ON</span>
                  <span style={{ fontSize: '17px', fontWeight: 800 }}>Google Play</span>
                </span>
              </a>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#6B6980' }}>or scan</span>
            <span style={{ padding: '6px', borderRadius: '12px', background: '#FFFFFF', lineHeight: 0 }}>
              <svg width="84" height="84" viewBox="0 0 29 29" shapeRendering="crispEdges" aria-hidden="true">
                <rect width="29" height="29" fill="#FFFFFF" />
                <g fill="#131B2E">
                  <path d="M2 2h7v7H2zM3 3v5h5V3zM4 4h3v3H4zM20 2h7v7h-7zM21 3v5h5V3zM22 4h3v3h-3zM2 20h7v7H2zM3 21v5h5v-5zM4 22h3v3H4z" fillRule="evenodd" />
                  <rect x="10" y="2" width="1" height="1" /><rect x="10" y="5" width="1" height="1" /><rect x="10" y="7" width="1" height="1" /><rect x="10" y="10" width="1" height="1" />
                  <rect x="11" y="2" width="1" height="1" /><rect x="11" y="6" width="1" height="1" /><rect x="11" y="11" width="1" height="1" /><rect x="11" y="16" width="1" height="1" />
                  <rect x="13" y="4" width="1" height="1" /><rect x="13" y="9" width="1" height="1" /><rect x="13" y="14" width="1" height="1" /><rect x="13" y="19" width="1" height="1" />
                  <rect x="14" y="4" width="1" height="1" /><rect x="14" y="9" width="1" height="1" /><rect x="14" y="14" width="1" height="1" /><rect x="14" y="19" width="1" height="1" />
                  <rect x="15" y="2" width="1" height="1" /><rect x="15" y="5" width="1" height="1" /><rect x="15" y="10" width="1" height="1" /><rect x="15" y="15" width="1" height="1" />
                  <rect x="16" y="2" width="1" height="1" /><rect x="16" y="6" width="1" height="1" /><rect x="16" y="11" width="1" height="1" /><rect x="16" y="16" width="1" height="1" />
                </g>
                <rect x="11.5" y="11.5" width="6" height="6" rx="1" fill="#3525CD" />
              </svg>
            </span>
          </div>
        </div>

        {/* Phone Graphic */}
        <div style={{ alignSelf: 'flex-end', flexShrink: 0, marginRight: '30px' }}>
          <svg width="340" height="310" viewBox="0 0 340 310" aria-hidden="true">
            <defs>
              <radialGradient id="apbmintg" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#B8F7DA" /><stop offset=".55" stopColor="#34D399" /><stop offset="1" stopColor="#047857" /></radialGradient>
              <radialGradient id="apbind" cx="35%" cy="25%" r="85%"><stop offset="0" stopColor="#8B93FF" /><stop offset=".5" stopColor="#4F46E5" /><stop offset="1" stopColor="#2A1F9E" /></radialGradient>
              <radialGradient id="apbsh" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#1E1B4B" stopOpacity=".28" /><stop offset="1" stopColor="#1E1B4B" stopOpacity="0" /></radialGradient>
              <linearGradient id="apbbez" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4B4F73" /><stop offset=".35" stopColor="#1E1B4B" /><stop offset="1" stopColor="#0B0A24" /></linearGradient>
              <linearGradient id="apbbez2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8B93FF" /><stop offset=".45" stopColor="#4F46E5" /><stop offset="1" stopColor="#241A8F" /></linearGradient>
              <linearGradient id="apbscr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#EEF1FF" /></linearGradient>
              <linearGradient id="apbscr2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F4F5FF" /><stop offset="1" stopColor="#DDE3FF" /></linearGradient>
              <linearGradient id="apbline" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8B93FF" /><stop offset="1" stopColor="#3525CD" /></linearGradient>
              <linearGradient id="apbarea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6366F1" stopOpacity=".35" /><stop offset="1" stopColor="#6366F1" stopOpacity="0" /></linearGradient>
            </defs>
            <ellipse cx="170" cy="300" rx="150" ry="12" fill="url(#apbsh)" />
            <g transform="rotate(-6 110 170)">
              <rect x="34" y="28" width="164" height="300" rx="30" fill="url(#apbbez)" />
              <rect x="40" y="33" width="152" height="290" rx="25" fill="none" stroke="#FFFFFF" strokeOpacity=".18" strokeWidth="1.5" />
              <rect x="44" y="40" width="144" height="280" rx="22" fill="url(#apbscr)" />
              <rect x="92" y="47" width="48" height="11" rx="5.5" fill="#0B0A24" />
              <rect x="56" y="70" width="84" height="10" rx="5" fill="#131B2E" />
              <rect x="56" y="86" width="56" height="7" rx="3.5" fill="#C7C4D8" />
              <rect x="56" y="104" width="120" height="34" rx="12" fill="url(#apbind)" />
              <rect x="66" y="116" width="54" height="9" rx="4.5" fill="#FFFFFF" opacity=".9" />
              <rect x="56" y="148" width="56" height="50" rx="12" fill="#EEF2FF" />
              <rect x="120" y="148" width="56" height="50" rx="12" fill="#ECFDF5" />
              <path d="M64 184l10-9 9 6 16-14" stroke="#3525CD" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="148" cy="173" r="13" fill="url(#apbmintg)" />
              <path d="M141 173l5 5 9-10" stroke="#047857" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            <g transform="rotate(5 240 180)">
              <rect x="160" y="62" width="164" height="270" rx="30" fill="url(#apbbez2)" />
              <rect x="166" y="67" width="152" height="260" rx="25" fill="none" stroke="#FFFFFF" strokeOpacity=".3" strokeWidth="1.5" />
              <rect x="170" y="74" width="144" height="252" rx="22" fill="url(#apbscr2)" />
              <text x="184" y="104" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="12" fontWeight="800" fill="#1E1B4B">Vitamin D &amp; B12</text>
              <text x="184" y="120" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="9" fontWeight="600" fill="#464555">Reviewed by a clinician</text>
              <rect x="182" y="132" width="120" height="74" rx="14" fill="#FFFFFF" />
              <path d="M190 190l18-14 16 8 20-20 20 6 22-16V200H190z" fill="url(#apbarea)" />
              <path d="M190 190l18-14 16 8 20-20 20 6 22-16" stroke="url(#apbline)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="286" cy="154" r="4.5" fill="#FFFFFF" stroke="#3525CD" strokeWidth="2.5" />
              <rect x="182" y="216" width="120" height="30" rx="15" fill="url(#apbind)" />
              <text x="242" y="235" textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontSize="10.5" fontWeight="800" fill="#FFFFFF">Open report</text>
            </g>
            <g transform="translate(288 26)">
              <circle r="20" fill="url(#apbmintg)" />
              <path d="M-8 0l5 5 10-11" stroke="#FFFFFF" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        </div>
      </section>

      {/* 11. Footer with Newsletter Subscription */}
      <footer style={{ background: '#131B2E', padding: '0 clamp(16px, 3.5vw, 44px)' }}>
        <section
          aria-label="Subscribe to campus health updates"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '40px',
            padding: '40px clamp(16px, 3.5vw, 44px)',
            transform: 'translateY(-1px)',
            borderRadius: '0 0 28px 28px',
            background: 'linear-gradient(120deg, #3525CD 0%, #4F46E5 55%, #6366F1 100%)',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '460px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.4px', color: '#C7D2FE' }}>
              THE KARE LETTER · TWICE A MONTH
            </span>
            <span style={{ fontSize: '26px', lineHeight: 1.25, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.6px' }}>
              Camp dates, seasonal alerts and plain-language health tips.
            </span>
            <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#E0E7FF' }}>
              Written for students, reviewed by our clinicians. It never uses anything in your health vault.
            </span>
          </div>

          <div style={{ flex: '1 1 420px', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div role="radiogroup" aria-label="Subscribe by" style={{ alignSelf: 'flex-start', display: 'flex', gap: '4px', padding: '4px', borderRadius: '999px', background: 'rgba(11,10,36,0.28)' }}>
              <button
                type="button"
                role="radio"
                aria-checked={nlTab === 'wa'}
                onClick={() => setNlTab('wa')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: 'none',
                  background: nlTab === 'wa' ? '#FFFFFF' : 'transparent',
                  color: nlTab === 'wa' ? '#3525CD' : '#E0E7FF'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 12a8 8 0 0 1-11.7 7.1L4 20l1-4.1A8 8 0 1 1 20 12z" />
                </svg>
                WhatsApp
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={nlTab === 'em'}
                onClick={() => setNlTab('em')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: 'none',
                  background: nlTab === 'em' ? '#FFFFFF' : 'transparent',
                  color: nlTab === 'em' ? '#3525CD' : '#E0E7FF'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
                Email
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (nlInput.trim()) {
                  setNlSubscribed(true);
                }
              }}
              style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}
            >
              {nlTab === 'wa' ? (
                <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '10px', height: '54px', padding: '0 16px', borderRadius: '14px', background: '#FFFFFF' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#131B2E', paddingRight: '10px', borderRight: '1px solid #DAE2FD' }}>+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    aria-label="WhatsApp number"
                    placeholder="WhatsApp number"
                    value={nlInput}
                    onChange={(e) => setNlInput(e.target.value)}
                    style={{ flexGrow: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', fontSize: '15px', color: '#131B2E' }}
                  />
                </div>
              ) : (
                <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '10px', height: '54px', padding: '0 16px', borderRadius: '14px', background: '#FFFFFF' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#777587" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                  <input
                    type="email"
                    aria-label="Email address"
                    placeholder="you@college.edu.in"
                    value={nlInput}
                    onChange={(e) => setNlInput(e.target.value)}
                    style={{ flexGrow: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', fontSize: '15px', color: '#131B2E' }}
                  />
                </div>
              )}
              <button
                type="submit"
                style={{
                  height: '54px',
                  padding: '0 26px',
                  borderRadius: '14px',
                  border: 0,
                  background: '#131B2E',
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                {nlSubscribed ? 'Subscribed!' : 'Subscribe'}
              </button>
            </form>
            <span style={{ fontSize: '11.5px', lineHeight: 1.5, fontWeight: 500, color: '#E0E7FF' }}>
              Opt-in only, never pre-ticked. Reply STOP on WhatsApp or use the link in any email to leave. Separate from order and report alerts.
            </span>
          </div>
        </section>

        {/* 4 Column links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', padding: '52px 0 40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <span style={{ fontSize: '19px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.4px' }}>
                Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
              </span>
            </a>
            <span style={{ fontSize: '13px', lineHeight: 1.6, fontWeight: 500, color: '#A5B4FC', maxWidth: '230px' }}>
              A health record you own, from campus to career. ABHA-linked, portable after you graduate.
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: 600, color: '#C7D2FE' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z" />
                <circle cx="12" cy="10" r="2.2" />
              </svg>
              SNIST · Miyapur, Hyderabad
            </span>
          </div>

          <nav aria-label="Student Kare Links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1.3px', color: '#A5B4FC' }}>STUDENT KARE</span>
            <a href="/campuses" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>About us</a>
            <a href="/plans" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>How we make money</a>
            <a href="/partnerships" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Careers</a>
            <a href="/partnerships" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Press</a>
            <a href="/help" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Contact us</a>
          </nav>

          <nav aria-label="For Students Links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1.3px', color: '#A5B4FC' }}>FOR STUDENTS</span>
            <a href="/lab-tests" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Book a lab test</a>
            <a href="/consult" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Consult a doctor</a>
            <a href="/programs" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Care programmes</a>
            <a href="/plans" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Plans</a>
            <a href="/vault" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Health vault</a>
          </nav>

          <nav aria-label="For Partners Links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1.3px', color: '#A5B4FC' }}>FOR PARTNERS</span>
            <a href="/campuses" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Bring it to your campus</a>
            <a href="/clinicians" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Join as a clinician</a>
            <a href="/partnerships" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>List a lab or pharmacy</a>
            <a href="/partnerships" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Partnerships</a>
          </nav>

          <nav aria-label="Policies Links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1.3px', color: '#A5B4FC' }}>POLICIES</span>
            <a href="/privacy" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Privacy policy</a>
            <a href="/terms" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Terms of use</a>
            <a href="/plans" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Commerce firewall</a>
            <a href="/help" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Grievance officer</a>
            <a href="/vault" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Export your data</a>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', padding: '22px 0 28px', borderTop: '1px solid #2E2A66', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#A5B4FC' }}>© 2026 AVKS AI · studentkare.co</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 11px', borderRadius: '999px', background: '#1E1B4B', fontSize: '11.5px', fontWeight: 700, color: '#C7D2FE' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '999px', background: '#6EE7B7' }} />
            ABDM · ABHA-linked
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 11px', borderRadius: '999px', background: '#1E1B4B', fontSize: '11.5px', fontWeight: 700, color: '#C7D2FE' }}>
            NMC-verified doctors · NABL labs
          </span>
          <span style={{ flexGrow: 1 }} />
          <a href="/crisis" style={{ fontSize: '12.5px', fontWeight: 600, color: '#E0E7FF', textDecoration: 'none' }}>
            Not an emergency service. In a crisis, call <span style={{ fontWeight: 800, color: '#FCA5A5' }}>112</span> · Tele-MANAS <span style={{ fontWeight: 800, color: '#FCA5A5' }}>14416</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
