import React, { useEffect, useState } from 'react';
import { ArrowRight, FileLock2, FlaskConical, IndianRupee, Stethoscope } from 'lucide-react';
import { useApiResource } from '@/hooks/useApiResource';
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

export function LandingView(): React.ReactElement {
  const catalog = useApiResource<Catalog>('/catalog?limit=6');
  const items = catalog.data?.items ?? [];

  // Hero carousel state
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [subChannel, setSubChannel] = useState<'wa' | 'em'>('wa');
  const [subInput, setSubInput] = useState('');
  const [subDone, setSubDone] = useState(false);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setSlide((s) => (s + 1) % 4);
    }, 6000);
    return () => clearInterval(interval);
  }, [paused]);

  // Vector SVG Paths
  const dropPath = 'M12 3c3 3.5 5 6.2 5 9a5 5 0 0 1-10 0c0-2.8 2-5.5 5-9z';
  const heartPath = 'M12 20c4-2.5 6-5.6 6-9a6 6 0 0 0-12 0c0 3.4 2 6.5 6 9z';
  const bowlPath = 'M4 12h16a8 8 0 0 1-16 0zM8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3';
  const bonePath = 'M8 8a2.5 2.5 0 1 0-3-3 2.5 2.5 0 0 0-1 4l8 8a2.5 2.5 0 0 0 4 1 2.5 2.5 0 1 0-3-3';
  const sparkPath = 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z';
  const windPath = 'M3 9h10a3 3 0 1 0-3-3M3 14h13a3 3 0 1 1-3 3';
  const eyePath = 'M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z';
  const syringePath = 'M14 4l6 6M17 7l-9 9-3 1 1-3 9-9M11 9l4 4';
  const flaskPath = 'M9 3h6v5l3.5 8.2A3 3 0 0 1 15.7 21H8.3a3 3 0 0 1-2.8-4.8L9 8z';
  const stethoPath = 'M6 4v6a6 6 0 0 0 12 0V4';
  const pillPath = 'M8.5 15.5l7-7a4 4 0 0 0-5.7-5.7l-7 7a4 4 0 0 0 5.7 5.7z';
  const shieldPath = 'M12 3l7.5 3v5.6c0 4.3-3 8.2-7.5 9.4-4.5-1.2-7.5-5.1-7.5-9.4V6z';
  const docPath = 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5';

  const navLinks = [
    { label: 'Discover', href: '/landing', active: true },
    { label: 'Wellness', href: '/shop', active: false },
    { label: 'Training', href: '/wellness', active: false },
    { label: 'Health Calculators', href: '/calculators', active: false },
    { label: 'Lab tests', href: '/lab-tests', active: false },
    { label: 'Find a doctor', href: '/consult', active: false },
    { label: 'Programmes', href: '/programs', active: false },
    { label: 'Plans', href: '/plans', active: false },
  ];

  const categories = [
    'Vitamins & supplements',
    'Skin care',
    'Nutrition',
    'Health devices',
    'Ayurveda',
    'First aid',
    'Medicines',
    'Adult vaccines →',
  ];

  const fourTiles = [
    { title: 'Everyday wellness', meta: 'Essentials for feeling your best', href: '/shop', path: pillPath, tint: '#EEF2FF', ink: '#4F46E5', bg: '#FFFFFF' },
    { title: 'Book a lab test', meta: 'Make time for a health check', href: '/lab-tests', path: flaskPath, tint: '#EBF5F0', ink: '#059669', bg: '#FFFFFF' },
    { title: 'Talk to a doctor', meta: 'Find your next care provider', href: '/consult', path: stethoPath, tint: '#FBEFE6', ink: '#B08968', bg: '#FFF9F4' },
    { title: 'Your health cover', meta: 'Keep your benefits in view', href: '/plans', path: shieldPath, tint: '#EEF2FF', ink: '#4F46E5', bg: '#FFFFFF' },
  ];

  const healthConcerns = [
    { label: 'Diabetes Care', path: dropPath, tint: '#EDEBFA', ink: '#7C6BA8' },
    { label: 'Heart Care', path: heartPath, tint: '#FBEAE2', ink: '#C4756B' },
    { label: 'Stomach Care', path: bowlPath, tint: '#E6F0EA', ink: '#5E8F73' },
    { label: 'Liver Care', path: dropPath, tint: '#EDEBFA', ink: '#7C6BA8' },
    { label: 'Bone & Joint', path: bonePath, tint: '#FBEAE2', ink: '#C4756B' },
    { label: 'Kidney Care', path: dropPath, tint: '#E6F0EA', ink: '#5E8F73' },
    { label: 'Derma Care', path: sparkPath, tint: '#EDEBFA', ink: '#7C6BA8' },
    { label: 'Respiratory', path: windPath, tint: '#FBEAE2', ink: '#C4756B' },
    { label: 'Eye Care', path: eyePath, tint: '#E6F0EA', ink: '#5E8F73' },
    { label: 'Adult Vaccines', path: syringePath, tint: '#EDEBFA', ink: '#7C6BA8' },
  ];

  const featuredBrands = [
    { name: 'Root & Ritual', ink: '#5E8F73', tint: '#F4F5FB' },
    { name: 'Kindskin', ink: '#B08968', tint: '#FBF2EC' },
    { name: 'Nourish', ink: '#5E8F73', tint: '#F4F5FB' },
  ];

  const careServices = [
    { title: 'Medicines & health products', href: '/shop', body: 'Browse the Student Kare marketplace for medicines and wellness products. Verified availability before fulfilment.' },
    { title: 'Lab tests & packages', href: '/lab-tests', body: 'Compare lab tests and preparation requirements in the Student Kare marketplace with doorstep hostel collection.' },
    { title: 'Doctor consultations', href: '/consult', body: 'Connect with a campus clinician for quick video and chat consultations without long clinic queues.' },
    { title: 'Current plans & offers', href: '/plans', body: 'Explore transparent savings and healthcare access for campus students across India.' },
  ];

  const accountTiles = [
    { title: 'Your health records', meta: 'Save and access your own clinical files.', href: '/records', path: docPath },
    { title: 'Your body metrics', meta: 'Track real biometric readings you record.', href: '/devices', path: heartPath },
    { title: 'Your health cover', meta: 'Keep campus health coverage in view.', href: '/plans', path: shieldPath },
    { title: 'Support when you need it', meta: 'Follow a saved medical support request.', href: '/support', path: stethoPath },
  ];

  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, background: '#F6F7FC', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Utility Bar */}
      <div style={{ height: '40px', padding: '0 clamp(16px, 3.5vw, 44px)', background: 'linear-gradient(90deg, #EFEDFD 0%, #F3F1FE 50%, #EAF4EF 100%)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20c4-2.5 6-5.6 6-9a6 6 0 0 0-12 0c0 3.4 2 6.5 6 9z" />
        </svg>
        <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#464555' }}>A little more care for your everyday. Studentkare is for adults aged 18 and over.</span>
        <span style={{ flexGrow: 1 }} />
        <a href="/plans" style={{ fontSize: '12.5px', fontWeight: 700, color: '#3525CD', textDecoration: 'none' }}>
          Explore Student Kare plans →
        </a>
      </div>

      {/* 2. Header */}
      <header style={{ padding: '16px clamp(16px, 3.5vw, 44px) 14px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: '1px solid #EEF2FF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '26px', flexWrap: 'wrap' }}>
          <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <span style={{ width: '32px', height: '32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/brand/sk-mark.png" alt="" aria-hidden="true" width={27} height={32} style={{ display: 'block' }} />
            </span>
            <span style={{ fontSize: '19px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>
              Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
            </span>
          </a>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }} aria-label="Main Navigation">
            {navLinks.map((n) => (
              <a
                key={n.label}
                href={n.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '40px',
                  padding: '0 15px',
                  borderRadius: '11px',
                  fontSize: '14px',
                  textDecoration: 'none',
                  background: n.active ? '#EDEEFB' : 'transparent',
                  color: n.active ? '#3525CD' : '#464555',
                  fontWeight: n.active ? 800 : 600,
                }}
              >
                {n.label}
              </a>
            ))}
          </nav>

          <span style={{ flexGrow: 1 }} />

          <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 18px', borderRadius: '12px', background: '#F2F3FF', fontSize: '14px', fontWeight: 700, color: '#131B2E', textDecoration: 'none' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#131B2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="3.6" />
              <path d="M5 20a7 7 0 0 1 14 0" />
            </svg>
            Sign in
          </a>
          <a href="/checkout" aria-label="Cart" style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#F2F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#131B2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 7h12l-1 13H7zM9 7V5a3 3 0 0 1 6 0v2" />
            </svg>
          </a>
        </div>

        {/* Search & Upload Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '26px', flexWrap: 'wrap' }}>
          <div style={{ flexGrow: 1, minWidth: '280px', display: 'flex', alignItems: 'center', gap: '12px', height: '52px', padding: '0 20px', borderRadius: '14px', background: '#F2F3FF' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#777587" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
            <input
              type="text"
              placeholder="Search medicines, lab tests, and campus care…"
              style={{ flexGrow: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '14.5px', fontWeight: 500, color: '#131B2E' }}
              aria-label="Search medicines and care"
            />
          </div>
          <a href="/prescriptions" style={{ display: 'flex', alignItems: 'center', gap: '11px', textDecoration: 'none' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 17a4 4 0 0 1 .6-8A5.5 5.5 0 0 1 17 9.6 3.7 3.7 0 0 1 18 17" />
              <path d="M12 12v6M9.5 14.5 12 12l2.5 2.5" />
            </svg>
            <span style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 500, color: '#6B6980' }}>Have a prescription?</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#3525CD' }}>Upload &amp; find medicines →</span>
            </span>
          </a>
        </div>

        {/* Categories Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0 6px', overflowX: 'auto', gap: '14px' }}>
          {categories.map((c) => (
            <a key={c} href="/shop" style={{ fontSize: '13.5px', fontWeight: 600, color: '#464555', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {c}
            </a>
          ))}
        </div>
      </header>

      {/* 3. Your Health Record Video Banner */}
      <section aria-label="Your health record" style={{ position: 'relative', margin: '22px clamp(16px, 3.5vw, 44px) 0', height: '240px', borderRadius: '28px', background: '#06051A', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <video
          src="/assets/4486f2e01e220059b969dd4bce96a694.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          style={{ position: 'absolute', top: 0, right: 0, width: '72%', height: '100%', objectFit: 'cover' }}
        />
        <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #06051A 0%, #06051A 32%, rgba(6,5,26,0.6) 55%, rgba(6,5,26,0) 80%)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', padding: '0 0 0 clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#A5B4FC' }}>YOUR HEALTH RECORD</span>
          <span style={{ fontSize: 'clamp(24px, 3vw, 28px)', lineHeight: 1.2, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.7px' }}>
            Owned by you, from campus to career.
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>Student-owned</span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>Campus-ready</span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>Private</span>
          </div>
        </div>
      </section>

      {/* 4. SOS Emergency Banner */}
      <aside aria-label="Emergency assistance" style={{ margin: '18px clamp(16px, 3.5vw, 44px) 0', padding: '14px 20px', borderRadius: '14px', background: '#FFFFFF', border: '1px solid #FFE4E6', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6M12 16.5h.01" />
        </svg>
        <span style={{ fontSize: '14px', fontWeight: 800, color: '#E11D48' }}>In an emergency, call 112.</span>
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#464555' }}>
          No account, no waiting for this page. Free ambulance 108, Tele-MANAS on 14416.
        </span>
        <span style={{ flexGrow: 1 }} />
        <a href="tel:112" style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '40px', padding: '0 20px', borderRadius: '999px', background: '#E11D48', fontSize: '13.5px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
          Call 112
        </a>
        <a href="/crisis" style={{ fontSize: '13.5px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>
          All emergency helplines ›
        </a>
      </aside>

      {/* 5. Main Hero Section: Interactive Carousel + Right Feature Cards */}
      <section style={{ padding: '20px clamp(16px, 3.5vw, 44px) 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
        {/* Carousel Box */}
        <div
          role="region"
          aria-label="Student highlights"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          style={{ position: 'relative', minHeight: '470px', borderRadius: '20px', overflow: 'hidden', padding: '40px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: slide === 1 ? 'linear-gradient(120deg, #E6F0EA 0%, #EFF6F2 58%, #FFFFFF 100%)' : slide === 2 ? 'linear-gradient(120deg, #FFF6EC 0%, #FFF9F3 58%, #FFFFFF 100%)' : slide === 3 ? 'linear-gradient(120deg, #EEF2FF 0%, #F5F3FF 58%, #FFFFFF 100%)' : 'linear-gradient(120deg, #EFEDFD 0%, #F4F2FE 58%, #FFFFFF 100%)' }}
        >
          {slide === 0 && (
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>EVERYDAY HEALTH, A LITTLE CLOSER</span>
              <h1 style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 46px)', lineHeight: 1.08, fontWeight: 800, letterSpacing: '-1.7px', color: '#131B2E' }}>
                A little care.<br /><span style={{ color: '#3525CD' }}>A healthier every day.</span>
              </h1>
              <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
                Wellness essentials, lab tests and campus care providers. Find your next step, all in one place.
              </p>
              <a href="/shop" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '10px', height: '52px', padding: '0 26px', borderRadius: '12px', background: '#3525CD', fontSize: '15px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
                Explore wellness →
              </a>
            </div>
          )}

          {slide === 1 && (
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#059669', letterSpacing: '1.2px' }}>LAB TESTS AT YOUR HOSTEL</span>
              <h2 style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 46px)', lineHeight: 1.08, fontWeight: 800, letterSpacing: '-1.7px', color: '#131B2E' }}>
                Know a little more.<br /><span style={{ color: '#059669' }}>Tested at your block.</span>
              </h2>
              <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
                Scheduled sample collection at your hostel block. Clinician review for every report before you view it.
              </p>
              <a href="/lab-tests" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '10px', height: '52px', padding: '0 26px', borderRadius: '12px', background: '#059669', fontSize: '15px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
                Book a lab test →
              </a>
            </div>
          )}

          {slide === 2 && (
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#C2410C', letterSpacing: '1.2px' }}>MIND &amp; MEDITATION</span>
              <h2 style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 46px)', lineHeight: 1.08, fontWeight: 800, letterSpacing: '-1.7px', color: '#131B2E' }}>
                Breathe first.<br /><span style={{ color: '#C2410C' }}>Then the day.</span>
              </h2>
              <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
                Guided breathing, yoga and quiet-room sessions on campus. Plus full clinical body calculators.
              </p>
              <a href="/wellness" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '10px', height: '52px', padding: '0 26px', borderRadius: '12px', background: '#C2410C', fontSize: '15px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
                Explore training &amp; yoga →
              </a>
            </div>
          )}

          {slide === 3 && (
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>CAMPUS CLINICAL TEAM</span>
              <h2 style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 46px)', lineHeight: 1.08, fontWeight: 800, letterSpacing: '-1.7px', color: '#131B2E' }}>
                Real doctors.<br /><span style={{ color: '#3525CD' }}>Real conversations.</span>
              </h2>
              <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
                Connect with a campus clinician for telemedicine consultations between classes or from your hostel block.
              </p>
              <a href="/consult" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '10px', height: '52px', padding: '0 26px', borderRadius: '12px', background: '#3525CD', fontSize: '15px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
                Consult now →
              </a>
            </div>
          )}

          {/* Right graphic inside carousel */}
          <div style={{ position: 'absolute', right: '20px', bottom: '20px', width: '320px', height: '320px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', pointerEvents: 'none' }}>
            {slide === 0 && (
              <svg width="280" height="260" viewBox="0 0 300 280" aria-hidden="true">
                <rect x="92" y="70" width="116" height="176" rx="26" fill="#FFFFFF" stroke="#C7D2FE" strokeWidth="2" />
                <rect x="84" y="46" width="132" height="40" rx="14" fill="#4F46E5" />
                <rect x="108" y="120" width="84" height="70" rx="12" fill="#F4F5FF" />
                <rect x="120" y="136" width="60" height="9" rx="4.5" fill="#3525CD" />
                <circle cx="246" cy="190" r="26" fill="#34D399" />
              </svg>
            )}
            {slide === 1 && (
              <svg width="280" height="260" viewBox="0 0 300 280" aria-hidden="true">
                <rect x="36" y="196" width="228" height="30" rx="12" fill="#4F46E5" />
                <rect x="52" y="60" width="42" height="180" rx="21" fill="#FFFFFF" stroke="#C7D2FE" strokeWidth="2" />
                <rect x="110" y="60" width="42" height="180" rx="21" fill="#FFFFFF" stroke="#C7D2FE" strokeWidth="2" />
                <rect x="168" y="60" width="42" height="180" rx="21" fill="#FFFFFF" stroke="#C7D2FE" strokeWidth="2" />
              </svg>
            )}
            {slide === 2 && (
              <video src="/assets/fabac8217d14af9d87dd5d5244554ee7.mp4" autoPlay muted loop playsInline aria-hidden="true" style={{ width: '280px', height: '260px', objectFit: 'cover', borderRadius: '24px' }} />
            )}
            {slide === 3 && (
              <img src="/assets/b859fcf30b096631cfd1de1b6c0b839f.png" alt="" aria-hidden="true" style={{ height: '280px', width: 'auto' }} />
            )}
          </div>

          <span style={{ flexGrow: 1 }} />

          {/* Dots Indicator */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
            {['Wellness', 'Lab tests', 'Training', 'Doctors'].map((label, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => setSlide(idx)}
                aria-label={`Slide ${label}`}
                style={{
                  height: '6px',
                  border: 'none',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  transition: 'all .3s ease',
                  background: idx === slide ? '#3525CD' : '#DAD7F5',
                  width: idx === slide ? '44px' : '14px',
                }}
              />
            ))}
          </div>
        </div>

        {/* Right Feature Side Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <a href="/lab-tests" style={{ flexGrow: 1, borderRadius: '20px', background: 'linear-gradient(140deg, #E6F0EA 0%, #EFF6F2 100%)', padding: '30px', display: 'flex', flexDirection: 'column', gap: '12px', textDecoration: 'none' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#065F46', letterSpacing: '1.2px' }}>MAKE TIME FOR A CHECK-IN</span>
            <span style={{ fontSize: '27px', lineHeight: 1.18, fontWeight: 800, color: '#0F3B2C', letterSpacing: '-0.9px' }}>
              Know a little more.<br />Care a little better.
            </span>
            <span style={{ flexGrow: 1 }} />
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#065F46' }}>Explore lab tests →</span>
          </a>

          <a href="/plans" style={{ flexGrow: 1, borderRadius: '20px', background: 'linear-gradient(145deg, #312E81 0%, #1E1B4B 62%, #17144C 100%)', padding: '30px', display: 'flex', flexDirection: 'column', gap: '12px', textDecoration: 'none' }}>
            <span style={{ width: '40px', height: '40px', borderRadius: '13px', background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l7.5 3v5.6c0 4.3-3 8.2-7.5 9.4-4.5-1.2-7.5-5.1-7.5-9.4V6z" />
              </svg>
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#A9A5E0', letterSpacing: '1.2px' }}>STUDENTKARE PLANS</span>
            <span style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.8px' }}>More care. Your choice.</span>
            <span style={{ fontSize: '13.5px', fontWeight: 500, color: '#A9A5E0' }}>Start free. Explore optional benefits.</span>
            <span style={{ flexGrow: 1 }} />
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>Find your plan →</span>
          </a>
        </div>
      </section>

      {/* 6. Four Tiles */}
      <section style={{ padding: '18px clamp(16px, 3.5vw, 44px) 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
        {fourTiles.map((t) => (
          <a key={t.title} href={t.href} style={{ padding: '20px', borderRadius: '16px', background: t.bg, display: 'flex', alignItems: 'center', gap: '14px', border: '1px solid #EEF2FF', textDecoration: 'none' }}>
            <span style={{ width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.tint, color: t.ink }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={t.path} />
              </svg>
            </span>
            <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#131B2E' }}>{t.title}</span>
              <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#6B6980' }}>{t.meta}</span>
            </span>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C7C4D8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        ))}
      </section>

      {/* 7. Shop by Health Concern */}
      <section style={{ padding: '46px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>SHOP BY HEALTH CONCERN</span>
          <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 33px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.1px' }}>Find care for what matters today.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '16px' }}>
          {healthConcerns.map((c) => (
            <a key={c.label} href="/shop" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '11px', textDecoration: 'none' }}>
              <span style={{ width: '72px', height: '72px', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.tint }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={c.path} />
                </svg>
              </span>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#131B2E', textAlign: 'center' }}>{c.label}</span>
            </a>
          ))}
        </div>
      </section>

      {/* 8. Everyday Essentials */}
      <section style={{ padding: '44px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>A LITTLE CARE, EVERY DAY</span>
            <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 33px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.1px' }}>Find your everyday essentials.</h2>
          </div>
          <a href="/shop" style={{ fontSize: '13.5px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>
            Explore your kind of wellbeing →
          </a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
          <a href="/shop" style={{ borderRadius: '16px', background: '#FFFFFF', overflow: 'hidden', display: 'flex', flexDirection: 'column', textDecoration: 'none', border: '1px solid #EEF2FF' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '152px', background: '#E8E9F4' }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#6E7BD8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8.5 15.5l7-7a4 4 0 0 0-5.7-5.7l-7 7a4 4 0 0 0 5.7 5.7zM6 6l6 6" />
              </svg>
            </span>
            <span style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>Vitamins &amp; supplements</span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#6B6980' }}>Your daily essentials</span>
            </span>
          </a>
          <a href="/shop" style={{ borderRadius: '16px', background: '#FFFFFF', overflow: 'hidden', display: 'flex', flexDirection: 'column', textDecoration: 'none', border: '1px solid #EEF2FF' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '152px', background: '#F0E8E2' }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#B08968" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3c3 3.5 5 6.2 5 9a5 5 0 0 1-10 0c0-2.8 2-5.5 5-9z" />
              </svg>
            </span>
            <span style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>Skin &amp; personal care</span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#6B6980' }}>A little time for you</span>
            </span>
          </a>
          <a href="/shop" style={{ borderRadius: '16px', background: '#FFFFFF', overflow: 'hidden', display: 'flex', flexDirection: 'column', textDecoration: 'none', border: '1px solid #EEF2FF' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '152px', background: '#E6F0EA' }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#5E8F73" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12h16a8 8 0 0 1-16 0zM8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3" />
              </svg>
            </span>
            <span style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>Nutrition &amp; wellbeing</span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#6B6980' }}>Nourish your routine</span>
            </span>
          </a>
          <a href="/lab-tests" style={{ borderRadius: '16px', background: '#FFFFFF', overflow: 'hidden', display: 'flex', flexDirection: 'column', textDecoration: 'none', border: '1px solid #EEF2FF' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '152px', background: '#E4EAF2' }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 3h6v5l3.5 8.2A3 3 0 0 1 15.7 21H8.3a3 3 0 0 1-2.8-4.8L9 8z" />
              </svg>
            </span>
            <span style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>Health checks</span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#6B6980' }}>Take the next step</span>
            </span>
          </a>
          <a href="/consult" style={{ borderRadius: '16px', background: '#FFFFFF', overflow: 'hidden', display: 'flex', flexDirection: 'column', textDecoration: 'none', border: '1px solid #EEF2FF' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '152px', background: '#EDE9E4' }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#8A7A66" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 4v6a6 6 0 0 0 12 0V4M18 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
              </svg>
            </span>
            <span style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>Everyday care</span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#6B6980' }}>Connect with a clinician</span>
            </span>
          </a>
        </div>
      </section>

      {/* 9. Published right now (Real live catalog endpoint) */}
      {items.length > 0 && (
        <section className="sk-landing__catalog" aria-labelledby="sk-landing-catalog" style={{ padding: '44px clamp(16px, 3.5vw, 44px) 0' }}>
          <div className="sk-landing__catalog-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>MOVING THIS WEEK ON CAMPUS</span>
              <h2 className="sk-landing__heading" id="sk-landing-catalog" style={{ margin: '4px 0 0', fontSize: 'clamp(24px, 3vw, 33px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.1px' }}>
                Published right now
              </h2>
            </div>
            <a className="sk-landing__more" href="/shop" style={{ fontSize: '14px', fontWeight: 800, color: '#3525CD', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              See everything
              <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
          <ul className="sk-landing__grid" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
            {items.map((item) => (
              <li className="sk-landing__item" key={item.id} style={{ borderRadius: '15px', background: '#FFFFFF', border: '1px solid #EEF2FF', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className="sk-landing__item-kind" style={{ fontSize: '10px', fontWeight: 800, color: '#4F46E5', textTransform: 'uppercase' }}>
                  {kindLabel(item.kind)}
                </span>
                <p className="sk-landing__item-name" style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#131B2E', lineHeight: 1.3 }}>
                  {item.name}
                </p>
                {item.brand || item.pack ? (
                  <p className="sk-landing__item-meta" style={{ margin: 0, fontSize: '11px', color: '#6B6980' }}>
                    {[item.brand, item.pack].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
                <p className="sk-landing__item-price" style={{ margin: 'auto 0 0', fontSize: '17px', fontWeight: 800, color: '#131B2E', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {rupees(item.pricePaise)}
                  {item.mrpPaise > item.pricePaise ? (
                    <del style={{ fontSize: '12px', fontWeight: 500, color: '#6B6980' }}>{rupees(item.mrpPaise)}</del>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 10. Featured Promotion */}
      <section style={{ margin: '40px clamp(16px, 3.5vw, 44px) 0', padding: '34px 40px', borderRadius: '22px', background: 'linear-gradient(110deg, #FBEFE6 0%, #FDF6F0 55%, #FFFFFF 100%)', display: 'flex', alignItems: 'center', gap: '30px', flexWrap: 'wrap' }}>
        <div style={{ flexGrow: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>FEATURED PROMOTION</span>
          <span style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.3px' }}>Pick up your everyday favourites</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.6px' }}>Barrier Care Daily Moisturiser</span>
          <span style={{ fontSize: '13.5px', fontWeight: 500, color: '#464555' }}>
            Tube of 100 ml lotion · <strong style={{ color: '#047857' }}>Campus special</strong>
          </span>
          <a href="/shop" style={{ alignSelf: 'flex-start', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '9px', height: '50px', padding: '0 26px', borderRadius: '12px', background: '#3525CD', fontSize: '14.5px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
            View catalog offer →
          </a>
          <span style={{ paddingTop: '6px', fontSize: '11.5px', fontWeight: 600, color: '#6B6980' }}>
            Rotated from the published catalog. Never selected using your clinical records.
          </span>
        </div>
        <span style={{ width: '180px', height: '170px', borderRadius: '18px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#B08968" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3c3 3.5 5 6.2 5 9a5 5 0 0 1-10 0c0-2.8 2-5.5 5-9z" />
          </svg>
        </span>
      </section>

      {/* 11. Featured Brands */}
      <section style={{ padding: '40px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>MEET YOUR EVERYDAY FAVOURITES</span>
            <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 33px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.1px' }}>Featured brands.</h2>
          </div>
          <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#6B6980' }}>From the published catalog</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
          {featuredBrands.map((b) => (
            <a key={b.name} href="/shop" style={{ padding: '26px', borderRadius: '18px', background: b.tint, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textDecoration: 'none' }}>
              <span style={{ width: '70px', height: '86px', borderRadius: '12px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={b.ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 5c0 8-5 13-13 13 0-8 5-13 13-13z" />
                </svg>
              </span>
              <span style={{ fontSize: '19px', fontWeight: 800, color: '#3525CD', letterSpacing: '-0.4px' }}>{b.name}</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B6980', letterSpacing: '0.9px' }}>EXPLORE THE COLLECTION →</span>
            </a>
          ))}
        </div>
      </section>

      {/* 12. Records + Care Strip */}
      <section style={{ padding: '32px clamp(16px, 3.5vw, 44px) 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
        <a href="/records" style={{ padding: '26px 28px', borderRadius: '18px', background: '#EDEEFB', display: 'flex', alignItems: 'center', gap: '18px', textDecoration: 'none' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5" />
          </svg>
          <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>Your records, together.</span>
            <span style={{ fontSize: '13.5px', fontWeight: 500, color: '#464555' }}>Keep your own reports, prescriptions, and documents in one private place.</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', height: '46px', padding: '0 20px', borderRadius: '12px', background: '#FFFFFF', fontSize: '13.5px', fontWeight: 800, color: '#3525CD' }}>
            Open records →
          </span>
        </a>
        <a href="/shop" style={{ padding: '26px 28px', borderRadius: '18px', background: '#EDEEFB', display: 'flex', alignItems: 'center', gap: '18px', textDecoration: 'none' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 15l6-6M9.5 9.5h.01M14.5 14.5h.01" />
          </svg>
          <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>YOUR NEXT STEP, MADE SIMPLE</span>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>Care for every day.</span>
            <span style={{ fontSize: '13.5px', fontWeight: 500, color: '#464555' }}>Browse the published products and care services.</span>
          </span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3525CD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </section>

      {/* 13. Services Grid */}
      <section style={{ margin: '32px clamp(16px, 3.5vw, 44px) 0', padding: '34px', borderRadius: '22px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid #EEF2FF' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>STUDENTKARE CARE SERVICES</span>
          <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>Explore Student Kare services.</h2>
          <p style={{ margin: 0, maxWidth: '780px', fontSize: '14.5px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
            Medicine information, lab tests, consultations and care programs inside Student Kare.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          {careServices.map((s) => (
            <a key={s.title} href={s.href} style={{ padding: '22px', borderRadius: '16px', border: '1px solid #EEF2FF', display: 'flex', flexDirection: 'column', gap: '9px', textDecoration: 'none' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ flexGrow: 1, fontSize: '17px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>{s.title}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#131B2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
              <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>{s.body}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#3525CD' }}>Open in Student Kare →</span>
            </a>
          ))}
        </div>
      </section>

      {/* 14. Preventive Care & Movement */}
      <section style={{ padding: '26px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ padding: '30px 34px', borderRadius: '20px', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', border: '1px solid #EEF2FF' }}>
          <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>PREVENTIVE CARE</span>
            <span style={{ fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.8px' }}>
              Vaccines, report follow-up &amp; seasonal health.
            </span>
            <span style={{ maxWidth: '640px', fontSize: '13.5px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
              Explore source-labelled listings and clinician-reviewed next steps.
            </span>
          </span>
          <a href="/preventive-care" style={{ display: 'flex', alignItems: 'center', height: '48px', padding: '0 22px', borderRadius: '12px', border: '1px solid #C7D2FE', fontSize: '13.5px', fontWeight: 800, color: '#3525CD', textDecoration: 'none' }}>
            Open preventive care →
          </a>
        </div>
        <div style={{ padding: '26px 34px', borderRadius: '20px', background: '#EDEEFB', display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
          <span style={{ width: '62px', height: '62px', borderRadius: '16px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7C6BA8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12h4l2-6 3 12 2-6h7" />
            </svg>
          </span>
          <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>SMALL STEPS, AT YOUR OWN PACE</span>
            <span style={{ fontSize: 'clamp(20px, 2.5vw, 24px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.7px' }}>
              Movement for everyday life.
            </span>
            <span style={{ fontSize: '13.5px', fontWeight: 500, color: '#464555' }}>
              Source-linked exercise guides and your saved session history.
            </span>
          </span>
          <a href="/movement" style={{ display: 'flex', alignItems: 'center', height: '48px', padding: '0 22px', borderRadius: '12px', background: '#FFFFFF', fontSize: '13.5px', fontWeight: 800, color: '#3525CD', textDecoration: 'none' }}>
            Explore movement →
          </a>
        </div>
      </section>

      {/* 15. Account Cards */}
      <section style={{ padding: '26px clamp(16px, 3.5vw, 44px) 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        {accountTiles.map((a) => (
          <a key={a.title} href={a.href} style={{ padding: '22px', borderRadius: '16px', background: '#EDEEFB', display: 'flex', flexDirection: 'column', gap: '12px', textDecoration: 'none' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={a.path} />
            </svg>
            <span style={{ fontSize: '15.5px', fontWeight: 700, color: '#131B2E' }}>{a.title}</span>
            <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#6B6980' }}>{a.meta}</span>
          </a>
        ))}
      </section>

      {/* 16. Health Perspectives */}
      <section style={{ padding: '44px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>GOOD READS FOR HEALTHIER DAYS</span>
          <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 33px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.1px' }}>Health perspectives.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
          <div style={{ borderRadius: '18px', background: '#FFFFFF', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #EEF2FF' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '176px', background: '#E8E5F4' }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#7C6BA8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />
              </svg>
            </span>
            <span style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>EVERYDAY WELLBEING</span>
              <span style={{ fontSize: '18px', lineHeight: 1.3, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>
                A little less scrolling. A little more sleep.
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '6px', borderTop: '1px solid #EEF2FF' }}>
                <span style={{ flexGrow: 1, fontSize: '11.5px', fontWeight: 500, color: '#6B6980' }}>3 min read</span>
                <ArrowRight size={16} aria-hidden="true" />
              </span>
            </span>
          </div>

          <div style={{ borderRadius: '18px', background: '#FFFFFF', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #EEF2FF' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '176px', background: '#E3EFE7' }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#5E8F73" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20c4-2.5 6-5.6 6-9a6 6 0 0 0-12 0c0 3.4 2 6.5 6 9z" />
              </svg>
            </span>
            <span style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>PREVENTIVE CARE</span>
              <span style={{ fontSize: '18px', lineHeight: 1.3, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>
                Your first health checkup, made simpler.
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '6px', borderTop: '1px solid #EEF2FF' }}>
                <span style={{ flexGrow: 1, fontSize: '11.5px', fontWeight: 500, color: '#6B6980' }}>4 min read</span>
                <ArrowRight size={16} aria-hidden="true" />
              </span>
            </span>
          </div>

          <div style={{ borderRadius: '18px', background: '#FFFFFF', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #EEF2FF' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '176px', background: '#F7E9DE' }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#B08968" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
              </svg>
            </span>
            <span style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>SKIN &amp; SELF-CARE</span>
              <span style={{ fontSize: '18px', lineHeight: 1.3, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>
                Keep your everyday skincare simple.
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '6px', borderTop: '1px solid #EEF2FF' }}>
                <span style={{ flexGrow: 1, fontSize: '11.5px', fontWeight: 500, color: '#6B6980' }}>3 min read</span>
                <ArrowRight size={16} aria-hidden="true" />
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* 17. Why Students Trust StudentKare (Trust Cards) */}
      <section aria-label="Why students trust Student Kare" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', margin: '64px clamp(16px, 3.5vw, 44px) 0', padding: '40px 24px', borderRadius: '28px', background: '#FFFFFF', border: '1px solid #EEF2FF' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <FileLock2 size={44} color="#3525CD" aria-hidden="true" />
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Private by default</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
            Records open only to you and the clinician you choose. Your campus sees aggregate counts, never individual results.
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <Stethoscope size={44} color="#059669" aria-hidden="true" />
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Reviewed clinicians</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
            Practitioners and diagnostic partners undergo credential validation before they can consult on Student Kare.
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <FlaskConical size={44} color="#4F46E5" aria-hidden="true" />
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Near your hostel</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
            Sample collection at your hostel block, consults between classes, and campus care sessions.
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <IndianRupee size={44} color="#B08968" aria-hidden="true" />
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Price before you book</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
            Every price is on screen before you confirm. A plan changes the price, never the care.
          </span>
        </div>
      </section>

      {/* 18. Get The App / Mobile Section */}
      <section aria-label="Get the Student Kare platform" style={{ display: 'flex', alignItems: 'center', gap: '40px', margin: '40px clamp(16px, 3.5vw, 44px) 64px', padding: '0 clamp(16px, 3vw, 40px) 0 clamp(20px, 4vw, 56px)', minHeight: '400px', borderRadius: '28px', background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 60%, #DAE2FD 100%)', overflow: 'hidden', flexWrap: 'wrap' }}>
        <div style={{ flexGrow: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '40px 0' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#3525CD' }}>CAMPUS HEALTH IN YOUR POCKET</span>
          <span style={{ fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.2, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.9px', maxWidth: '520px' }}>
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
              Scheduled block collection bookings
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>
              <span style={{ width: '34px', height: '34px', borderRadius: '11px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3525CD" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="5" width="16" height="14" rx="3" />
                  <path d="M12 9v6M9 12h6" />
                </svg>
              </span>
              Digital emergency access card
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>
              <span style={{ width: '34px', height: '34px', borderRadius: '11px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3525CD" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" />
                </svg>
              </span>
              Reports reviewed by verified clinicians
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '8px', flexWrap: 'wrap' }}>
            <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '52px', padding: '0 24px', borderRadius: '14px', background: '#131B2E', color: '#FFFFFF', textDecoration: 'none', fontWeight: 700, fontSize: '14px' }}>
              Launch Student Kare Web Portal
            </a>
            <a href="/calculators" style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '52px', padding: '0 24px', borderRadius: '14px', background: '#FFFFFF', color: '#3525CD', textDecoration: 'none', fontWeight: 800, fontSize: '14px', border: '1.5px solid #DAE2FD' }}>
              Clinical Calculators Suite →
            </a>
          </div>
        </div>

        <div style={{ alignSelf: 'flex-end', flexShrink: 0, paddingBottom: '10px' }}>
          <svg width="280" height="260" viewBox="0 0 340 310" aria-hidden="true">
            <rect x="40" y="33" width="152" height="270" rx="25" fill="#131B2E" />
            <rect x="44" y="40" width="144" height="256" rx="22" fill="#EEF1FF" />
            <rect x="92" y="47" width="48" height="11" rx="5.5" fill="#0B0A24" />
            <rect x="56" y="70" width="84" height="10" rx="5" fill="#131B2E" />
            <rect x="56" y="104" width="120" height="34" rx="12" fill="#4F46E5" />
            <circle cx="148" cy="173" r="13" fill="#34D399" />
          </svg>
        </div>
      </section>

      {/* 19. Footer */}
      <footer className="sk-landing__footer" style={{ background: '#131B2E', padding: '0 clamp(16px, 3.5vw, 44px)', display: 'flex', flexDirection: 'column' }}>
        {/* Banner with form */}
        <section aria-label="Campus health updates" style={{ display: 'flex', alignItems: 'center', gap: '40px', padding: '40px 44px', borderRadius: '0 0 28px 28px', background: 'linear-gradient(120deg, #3525CD 0%, #4F46E5 55%, #6366F1 100%)', flexWrap: 'wrap' }}>
          <div style={{ flexGrow: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '460px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.4px', color: '#C7D2FE' }}>CAMPUS HEALTH UPDATES · TWICE A MONTH</span>
            <span style={{ fontSize: '24px', lineHeight: 1.25, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.6px' }}>
              Camp dates, seasonal health alerts and plain-language tips.
            </span>
            <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#E0E7FF' }}>
              Written for students, reviewed by our clinicians.
            </span>
          </div>

          <div style={{ flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div role="radiogroup" aria-label="Channel" style={{ alignSelf: 'flex-start', display: 'flex', gap: '4px', padding: '4px', borderRadius: '999px', background: 'rgba(11,10,36,0.28)' }}>
              <button
                type="button"
                onClick={() => setSubChannel('wa')}
                style={{ padding: '0 16px', height: '36px', borderRadius: '999px', border: 'none', background: subChannel === 'wa' ? '#FFFFFF' : 'transparent', color: subChannel === 'wa' ? '#3525CD' : '#E0E7FF', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setSubChannel('em')}
                style={{ padding: '0 16px', height: '36px', borderRadius: '999px', border: 'none', background: subChannel === 'em' ? '#FFFFFF' : 'transparent', color: subChannel === 'em' ? '#3525CD' : '#E0E7FF', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
              >
                Email
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (subInput.trim()) setSubDone(true);
              }}
              style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}
            >
              <input
                type={subChannel === 'wa' ? 'tel' : 'email'}
                value={subInput}
                onChange={(e) => setSubInput(e.target.value)}
                placeholder={subChannel === 'wa' ? 'WhatsApp phone number' : 'you@college.edu.in'}
                aria-label={subChannel === 'wa' ? 'WhatsApp number' : 'Email address'}
                style={{ flexGrow: 1, minWidth: '200px', height: '54px', padding: '0 16px', borderRadius: '14px', border: 'none', outline: 'none', background: '#FFFFFF', fontSize: '15px', color: '#131B2E' }}
              />
              <button
                type="submit"
                style={{ height: '54px', padding: '0 26px', borderRadius: '14px', border: 'none', background: '#131B2E', fontSize: '15px', fontWeight: 800, color: '#FFFFFF', cursor: 'pointer' }}
              >
                {subDone ? 'Subscribed ✓' : 'Subscribe'}
              </button>
            </form>
          </div>
        </section>

        {/* Footer Navigation Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '32px', padding: '52px 0 40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', gridColumn: 'span 2' }}>
            <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <span style={{ fontSize: '19px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.4px' }}>
                Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
              </span>
            </a>
            <span style={{ fontSize: '13px', lineHeight: 1.6, fontWeight: 500, color: '#A5B4FC', maxWidth: '300px' }}>
              A health record you own, from campus to career.
            </span>
            <p className="sk-landing__footer-note" style={{ margin: '8px 0 0', fontSize: '12px', lineHeight: 1.5, color: '#8884B8', maxWidth: '320px' }}>
              Studentkare is still being built. Some things described in our designs do not exist yet, and we would rather leave them off this page than imply otherwise.
            </p>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '13px' }} aria-label="Student Kare">
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: 1.3, color: '#A5B4FC' }}>STUDENT KARE</span>
            <a href="/campuses" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>For campuses</a>
            <a href="/clinicians" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>For clinicians</a>
            <a href="/plans" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Plans</a>
            <a href="/support" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Help centre</a>
          </nav>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '13px' }} aria-label="For students">
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: 1.3, color: '#A5B4FC' }}>FOR STUDENTS</span>
            <a href="/lab-tests" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Book a lab test</a>
            <a href="/consult" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Consult a doctor</a>
            <a href="/calculators" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Health calculators</a>
            <a href="/records" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Health records</a>
          </nav>

          <nav className="sk-landing__footer-links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }} aria-label="Policies">
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: 1.3, color: '#A5B4FC' }}>POLICIES</span>
            <a href="/privacy" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Privacy</a>
            <a href="/terms" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Terms</a>
            <a href="/login" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Sign in</a>
          </nav>
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', padding: '22px 0 28px', borderTop: '1px solid #2E2A66', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#A5B4FC' }}>© 2026 Studentkare</span>
          <span style={{ flexGrow: 1 }} />
          <a href="/crisis" style={{ fontSize: '12.5px', fontWeight: 600, color: '#E0E7FF', textDecoration: 'none' }}>
            Not an emergency service. In a crisis, dial 112 · Tele-MANAS 14416
          </a>
        </div>
      </footer>
    </div>
  );
}

/** Paise to rupees. Integer paise in, no floating-point money arithmetic. */
export function rupees(paise: number): string {
  const whole = Math.trunc(paise / 100);
  const remainder = Math.abs(paise % 100);
  const grouped = whole.toLocaleString('en-IN');
  return remainder === 0 ? `₹${grouped}` : `₹${grouped}.${String(remainder).padStart(2, '0')}`;
}

export function kindLabel(kind: string): string {
  const labels: Record<string, string> = {
    product: 'Medicine',
    lab: 'Lab test',
    consultation: 'Consultation',
    vaccine: 'Vaccine',
  };
  return labels[kind] ?? kind;
}
