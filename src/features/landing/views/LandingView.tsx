import React, { useState, useEffect } from 'react';
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
  const apiItems = catalog.data?.items ?? [];
  const hasCatalog = apiItems.length > 0;

  // Carousel state
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);

  // Dispatch updates state (named to keep code clean and strictly compliant)
  const [dispatchTab, setDispatchTab] = useState<'wa' | 'em'>('wa');
  const [dispatchInput, setDispatchInput] = useState('');
  const [dispatchConfirmed, setDispatchConfirmed] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      if (!paused) {
        setSlide((s) => (s + 1) % 4);
        setTick((t) => t + 1);
      }
    }, 6000);
    return () => clearInterval(iv);
  }, [paused]);

  const bottleSvg = 'M9 2h6v3l1.5 2.5V21a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V7.5L9 5z';
  const tubeSvg = 'M8 3h8v3l-1 15H9L8 6z';
  const jarSvg = 'M6 8h12v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zM8 8V5h8v3';
  const dropSvg = 'M12 3c3 3.5 5 6.2 5 9a5 5 0 0 1-10 0c0-2.8 2-5.5 5-9z';
  const heartSvg = 'M12 20c4-2.5 6-5.6 6-9a6 6 0 0 0-12 0c0 3.4 2 6.5 6 9z';
  const bowlSvg = 'M4 12h16a8 8 0 0 1-16 0zM8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3';
  const boneSvg = 'M8 8a2.5 2.5 0 1 0-3-3 2.5 2.5 0 0 0-1 4l8 8a2.5 2.5 0 0 0 4 1 2.5 2.5 0 1 0-3-3';
  const sparkSvg = 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z';
  const windSvg = 'M3 9h10a3 3 0 1 0-3-3M3 14h13a3 3 0 1 1-3 3';
  const eyeSvg = 'M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z';
  const syringeSvg = 'M14 4l6 6M17 7l-9 9-3 1 1-3 9-9M11 9l4 4';
  const flaskSvg = 'M9 3h6v5l3.5 8.2A3 3 0 0 1 15.7 21H8.3a3 3 0 0 1-2.8-4.8L9 8z';
  const stethoSvg = 'M6 4v6a6 6 0 0 0 12 0V4';
  const pillSvg = 'M8.5 15.5l7-7a4 4 0 0 0-5.7-5.7l-7 7a4 4 0 0 0 5.7 5.7z';
  const shieldSvg = 'M12 3l7.5 3v5.6c0 4.3-3 8.2-7.5 9.4-4.5-1.2-7.5-5.1-7.5-9.4V6z';
  const docSvg = 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5';

  const defaultProducts = [
    { brand: 'ROOT & RITUAL', name: 'Ashwagandha Stress Balance', size: 'Bottle of 60 capsules', price: hasCatalog ? '₹299' : '299', mrp: hasCatalog ? '₹449' : '', off: '33% OFF', stock: '45 left', path: bottleSvg, ink: '#6E8F78', tint: '#EFF3EF' },
    { brand: 'NOURISH', name: 'Daily Multivitamin Essentials', size: 'Bottle of 30 tablets', price: hasCatalog ? '₹299' : '299', mrp: hasCatalog ? '₹449' : '', off: '33% OFF', stock: '50 left', path: bottleSvg, ink: '#6E8F78', tint: '#EFF3EF' },
    { brand: 'KINDSKIN', name: 'Barrier Care Daily Moisturiser', size: 'Tube of 100 ml lotion', price: hasCatalog ? '₹279' : '279', mrp: hasCatalog ? '₹399' : '', off: '30% OFF', stock: '50 left', path: tubeSvg, ink: '#B08968', tint: '#F8F0E9' },
    { brand: 'KINDSKIN', name: 'Daily Defence Sunscreen SPF 50', size: 'Tube of 50 g cream', price: hasCatalog ? '₹429' : '429', mrp: hasCatalog ? '₹599' : '', off: '28% OFF', stock: '50 left', path: tubeSvg, ink: '#B08968', tint: '#F8F0E9' },
    { brand: 'ROOT & RITUAL', name: 'Ayurvedic Immunity Kadha Mix', size: 'Jar of 200 g mix', price: hasCatalog ? '₹249' : '249', mrp: hasCatalog ? '₹349' : '', off: '29% OFF', stock: '50 left', path: jarSvg, ink: '#7A6A54', tint: '#F3F0EA' },
    { brand: 'NOURISH', name: 'Cardiac Care CoQ10 Softgels', size: 'Bottle of 60 softgels', price: hasCatalog ? '₹649' : '649', mrp: hasCatalog ? '₹899' : '', off: '28% OFF', stock: '40 left', path: bottleSvg, ink: '#6E8F78', tint: '#EFF3EF' }
  ];

  const popularProducts = apiItems.length > 0 ? apiItems.map((item, idx) => ({
    brand: item.brand || 'STUDENTKARE',
    name: item.name,
    size: item.pack || 'Unit pack',
    price: rupees(item.pricePaise),
    mrp: item.mrpPaise > item.pricePaise ? rupees(item.mrpPaise) : '',
    off: item.mrpPaise > item.pricePaise ? `${Math.round(((item.mrpPaise - item.pricePaise) / item.mrpPaise) * 100)}% OFF` : 'Best price',
    stock: 'In stock',
    path: idx % 3 === 0 ? bottleSvg : idx % 3 === 1 ? tubeSvg : jarSvg,
    ink: '#6E8F78',
    tint: '#EFF3EF'
  })) : defaultProducts;

  const concerns = [
    { label: 'Diabetes Care', path: dropSvg, tint: '#EDEBFA', ink: '#7C6BA8' },
    { label: 'Heart Care', path: heartSvg, tint: '#FBEAE2', ink: '#C4756B' },
    { label: 'Stomach Care', path: bowlSvg, tint: '#E6F0EA', ink: '#5E8F73' },
    { label: 'Liver Care', path: dropSvg, tint: '#EDEBFA', ink: '#7C6BA8' },
    { label: 'Bone & Joint', path: boneSvg, tint: '#FBEAE2', ink: '#C4756B' },
    { label: 'Kidney Care', path: dropSvg, tint: '#E6F0EA', ink: '#5E8F73' },
    { label: 'Derma Care', path: sparkSvg, tint: '#EDEBFA', ink: '#7C6BA8' },
    { label: 'Respiratory', path: windSvg, tint: '#FBEAE2', ink: '#C4756B' },
    { label: 'Eye Care', path: eyeSvg, tint: '#E6F0EA', ink: '#5E8F73' },
    { label: 'Adult Vaccines', path: syringeSvg, tint: '#EDEBFA', ink: '#7C6BA8' }
  ];

  const labs = [
    { name: 'Anemia & Iron Deficiency Panel', params: 'Includes 4 parameters', off: '42% OFF', mrp: hasCatalog ? '₹1,199' : '1,199', price: hasCatalog ? '₹699' : '699' },
    { name: 'Complete Blood Count (CBC)', params: 'Includes 21 parameters', off: '36% OFF', mrp: hasCatalog ? '₹499' : '499', price: hasCatalog ? '₹319' : '319' },
    { name: 'Complete Health Checkup', params: 'Includes 72 parameters', off: '50% OFF', mrp: hasCatalog ? '₹2,999' : '2,999', price: hasCatalog ? '₹1,499' : '1,499' },
    { name: 'Diabetes Care Checkup', params: 'Includes 8 parameters', off: '40% OFF', mrp: hasCatalog ? '₹999' : '999', price: hasCatalog ? '₹599' : '599' }
  ];

  const brands = [
    { name: 'Root & Ritual', path: 'M19 5c0 8-5 13-13 13 0-8 5-13 13-13z', ink: '#5E8F73', tint: '#F4F5FB' },
    { name: 'Kindskin', path: dropSvg, ink: '#B08968', tint: '#FBF2EC' },
    { name: 'Nourish', path: pillSvg, ink: '#5E8F73', tint: '#F4F5FB' }
  ];

  const dotLabels = ['Wellness', 'Lab tests', 'Meditation', 'Doctors'];

  return (
    <div style={{ width: '100%', maxWidth: '1440px', margin: '0 auto', background: '#F6F7FC', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>

      {/* 1. Utility Bar */}
      <div style={{ height: '40px', padding: '0 44px', background: 'linear-gradient(90deg, #EFEDFD 0%, #F3F1FE 50%, #EAF4EF 100%)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20c4-2.5 6-5.6 6-9a6 6 0 0 0-12 0c0 3.4 2 6.5 6 9z" />
        </svg>
        <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#464555' }}>A little more care for your everyday.</span>
        <span style={{ flexGrow: 1 }} />
        <a href="/pricing" style={{ fontSize: '12.5px', fontWeight: 700, color: '#3525CD', textDecoration: 'none' }}>Explore Student Kare plans →</a>
      </div>

      {/* 2. Header */}
      <header style={{ padding: '16px 44px 0', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '26px' }}>
          <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <span style={{ width: '32px', height: '32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="27" height="32" viewBox="0 0 512 600" fill="none" aria-hidden="true">
                <defs>
                  <linearGradient id="lgA" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#7C89F5" />
                    <stop offset="0.45" stopColor="#4759E8" />
                    <stop offset="1" stopColor="#2F3ED6" />
                  </linearGradient>
                </defs>
                <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#lgA)" />
                <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
                <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
              </svg>
            </span>
            <span style={{ fontSize: '19px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>
              Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
            </span>
          </a>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }} aria-label="Main Navigation">
            {[
              { label: 'Discover', href: '/landing', on: true },
              { label: 'Wellness', href: '/shop', on: false },
              { label: 'Training', href: '/care', on: false },
              { label: 'Lab tests', href: '/lab-tests', on: false },
              { label: 'Find a doctor', href: '/care', on: false },
              { label: 'Programmes', href: '/care', on: false },
              { label: 'Plans', href: '/pricing', on: false }
            ].map((n) => (
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
                  background: n.on ? '#EDEEFB' : 'transparent',
                  color: n.on ? '#3525CD' : '#464555',
                  fontWeight: n.on ? 800 : 600
                }}
              >
                {n.label}
              </a>
            ))}
          </nav>

          <span style={{ flexGrow: 1 }} />

          <a
            href="/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '42px',
              padding: '0 18px',
              borderRadius: '12px',
              background: '#F2F3FF',
              fontSize: '14px',
              fontWeight: 700,
              color: '#131B2E',
              textDecoration: 'none'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#131B2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="3.6" />
              <path d="M5 20a7 7 0 0 1 14 0" />
            </svg>
            Sign in
          </a>

          <a
            href="/shop"
            aria-label="Cart"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#F2F3FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none'
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#131B2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 7h12l-1 13H7zM9 7V5a3 3 0 0 1 6 0v2" />
            </svg>
          </a>
        </div>

        {/* Search bar & prescription CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '26px' }}>
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '12px', height: '54px', padding: '0 20px', borderRadius: '14px', background: '#F2F3FF' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#777587" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
            <input
              type="text"
              aria-label="Search medicines, lab tests, and care"
              placeholder="Search medicines, lab tests, and care…"
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14.5px', fontWeight: 500, color: '#131B2E' }}
            />
          </div>

          <a href="/care" style={{ display: 'flex', alignItems: 'center', gap: '11px', textDecoration: 'none' }}>
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

        {/* Categories ribbon */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0 14px' }}>
          {['Vitamins & supplements', 'Skin care', 'Nutrition', 'Health devices', 'Ayurveda', 'First aid', 'Medicines', 'Adult vaccines →'].map((cat) => (
            <a key={cat} href="/shop" style={{ fontSize: '13.5px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>
              {cat}
            </a>
          ))}
        </div>
      </header>

      {/* 3. Your Health Record Banner */}
      <section aria-label="Your health record" style={{ flexShrink: 0, position: 'relative', margin: '22px 44px 0', height: '240px', borderRadius: '28px', background: '#06051A', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #06051A 0%, #06051A 30%, rgba(6,5,26,0.55) 52%, rgba(6,5,26,0) 78%)' }} />
        <div style={{ position: 'relative', zIndex: 1, width: '520px', padding: '0 0 0 40px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#A5B4FC' }}>YOUR HEALTH RECORD</span>
          <span style={{ fontSize: '28px', lineHeight: 1.2, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.7px' }}>Owned by you, from campus to career.</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>Digital Health ID</span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>Student Owned</span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>Private by Default</span>
          </div>
        </div>
      </section>

      {/* 4. SOS Emergency Banner */}
      <div style={{ margin: '18px 44px 0', padding: '14px 20px', borderRadius: '14px', background: '#FFFFFF', border: '1px solid #FFE4E6', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6M12 16.5h.01" />
        </svg>
        <span style={{ fontSize: '14px', fontWeight: 800, color: '#E11D48' }}>24x7 Emergency &amp; Crisis Support</span>
        <span style={{ flexGrow: 1 }} />
        <a
          href="tel:112"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '42px',
            padding: '0 20px',
            borderRadius: '999px',
            background: '#E11D48',
            fontSize: '13.5px',
            fontWeight: 800,
            color: '#FFFFFF',
            textDecoration: 'none'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 4h3.5l1.6 4-2.2 1.4a11.5 11.5 0 0 0 5.7 5.7L15 12.9l4 1.6V18a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 3 6.2 2 2 0 0 1 5 4z" />
          </svg>
          Call 112 SOS
        </a>
        <a href="/care" style={{ fontSize: '13.5px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>All emergency helplines ›</a>
      </div>

      {/* 5. HERO SECTION: Carousel + Side Cards */}
      <section style={{ padding: '20px 44px 0', display: 'flex', gap: '18px' }}>
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Highlights"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          style={{
            position: 'relative',
            width: '706px',
            minHeight: '470px',
            borderRadius: '20px',
            overflow: 'hidden',
            padding: '40px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Slide 0 */}
          {slide === 0 && (
            <>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, #EFEDFD 0%, #F4F2FE 58%, #FFFFFF 100%)', animation: 'skFade .6s both' }} />
              <div style={{ position: 'absolute', right: '22px', bottom: '20px', width: '330px', height: '330px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <svg width="300" height="280" viewBox="0 0 300 280" aria-hidden="true">
                  <defs>
                    <radialGradient id="lp0mint" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#B8F7DA" /><stop offset=".55" stopColor="#34D399" /><stop offset="1" stopColor="#047857" /></radialGradient>
                    <radialGradient id="lp0peach" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#FFE0C2" /><stop offset=".6" stopColor="#FDBA74" /><stop offset="1" stopColor="#EA7A2E" /></radialGradient>
                    <linearGradient id="lp0glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFFFFF" stopOpacity=".95" /><stop offset="1" stopColor="#DDE3FF" stopOpacity=".9" /></linearGradient>
                  </defs>
                  <ellipse cx="150" cy="262" rx="120" ry="12" fill="#1E1B4B" opacity="0.28" />
                  <g className="bf2">
                    <rect x="92" y="70" width="116" height="176" rx="26" fill="url(#lp0glass)" stroke="#C7D2FE" strokeWidth="2" />
                    <rect x="84" y="46" width="132" height="40" rx="14" fill="#4F46E5" />
                    <rect x="94" y="52" width="100" height="10" rx="5" fill="#FFFFFF" opacity=".35" />
                    <rect x="108" y="120" width="84" height="70" rx="12" fill="#FFFFFF" />
                    <rect x="120" y="136" width="60" height="9" rx="4.5" fill="#3525CD" />
                    <rect x="120" y="152" width="44" height="7" rx="3.5" fill="#C7D2FE" />
                    <rect x="120" y="166" width="52" height="7" rx="3.5" fill="#C7D2FE" />
                    <rect x="100" y="80" width="10" height="150" rx="5" fill="#FFFFFF" opacity=".7" />
                  </g>
                  <g className="bf">
                    <g transform="rotate(-35 58 190)">
                      <rect x="18" y="172" width="80" height="36" rx="18" fill="url(#lp0peach)" />
                      <rect x="58" y="172" width="40" height="36" rx="18" fill="#FFFFFF" />
                      <rect x="58" y="172" width="20" height="36" fill="#FFFFFF" />
                      <rect x="26" y="178" width="40" height="8" rx="4" fill="#FFFFFF" opacity=".5" />
                    </g>
                  </g>
                  <g className="bf3">
                    <circle cx="246" cy="190" r="26" fill="url(#lp0mint)" />
                    <path d="M232 190h28" stroke="#FFFFFF" strokeWidth="3" opacity=".7" />
                  </g>
                </svg>
              </div>
              <div style={{ position: 'relative', zIndex: 1, maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>EVERYDAY HEALTH, A LITTLE CLOSER</span>
                <h1 style={{ margin: 0, fontSize: '46px', lineHeight: 1.08, fontWeight: 800, letterSpacing: '-1.7px', color: '#131B2E' }}>
                  A little care.<br /><span style={{ color: '#3525CD' }}>A healthier every day.</span>
                </h1>
                <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
                  Wellness essentials, lab tests and care providers. Find your next step, all in one place.
                </p>
                <a href="/shop" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '10px', height: '52px', padding: '0 26px', borderRadius: '12px', background: '#3525CD', fontSize: '15px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
                  Explore wellness →
                </a>
              </div>
            </>
          )}

          {/* Slide 1 */}
          {slide === 1 && (
            <>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, #E6F0EA 0%, #EFF6F2 58%, #FFFFFF 100%)', animation: 'skFade .6s both' }} />
              <div style={{ position: 'absolute', right: '22px', bottom: '20px', width: '330px', height: '330px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <svg width="300" height="280" viewBox="0 0 300 280" aria-hidden="true">
                  <ellipse cx="150" cy="262" rx="120" ry="12" fill="#1E1B4B" opacity="0.28" />
                  <rect x="36" y="196" width="228" height="30" rx="12" fill="#4F46E5" />
                  <g><rect x="52" y="60" width="42" height="180" rx="21" fill="#FFFFFF" opacity=".9" stroke="#C7D2FE" strokeWidth="2" /><rect x="57" y="116" width="32" height="118" rx="16" fill="#4F46E5" /></g>
                  <g><rect x="110" y="60" width="42" height="180" rx="21" fill="#FFFFFF" opacity=".9" stroke="#C7D2FE" strokeWidth="2" /><rect x="115" y="150" width="32" height="84" rx="16" fill="#34D399" /></g>
                  <g><rect x="168" y="60" width="42" height="180" rx="21" fill="#FFFFFF" opacity=".9" stroke="#C7D2FE" strokeWidth="2" /><rect x="173" y="96" width="32" height="138" rx="16" fill="#FDBA74" /></g>
                  <g><rect x="226" y="60" width="42" height="180" rx="21" fill="#FFFFFF" opacity=".9" stroke="#C7D2FE" strokeWidth="2" /><rect x="231" y="136" width="32" height="98" rx="16" fill="#F9A8D4" /></g>
                  <g className="bf"><rect x="196" y="10" width="96" height="40" rx="14" fill="#FFFFFF" stroke="#DAE2FD" /><text x="244" y="35" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="13" fontWeight="600" fill="#047857">6.2°C ✓</text></g>
                </svg>
              </div>
              <div style={{ position: 'relative', zIndex: 1, maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>LAB TESTS AT YOUR HOSTEL</span>
                <h2 style={{ margin: 0, fontSize: '46px', lineHeight: 1.08, fontWeight: 800, letterSpacing: '-1.7px', color: '#131B2E' }}>
                  Know a little more.<br /><span style={{ color: '#3525CD' }}>Tested at your block.</span>
                </h2>
                <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
                  A phlebotomist comes to your hostel. A clinician signs every report before you see it.
                </p>
                <a href="/lab-tests" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '10px', height: '52px', padding: '0 26px', borderRadius: '12px', background: '#3525CD', fontSize: '15px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
                  Book a lab test →
                </a>
              </div>
            </>
          )}

          {/* Slide 2 */}
          {slide === 2 && (
            <>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, #FFF6EC 0%, #FFF9F3 58%, #FFFFFF 100%)', animation: 'skFade .6s both' }} />
              <div style={{ position: 'relative', zIndex: 1, maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>MIND &amp; MEDITATION</span>
                <h2 style={{ margin: 0, fontSize: '46px', lineHeight: 1.08, fontWeight: 800, letterSpacing: '-1.7px', color: '#131B2E' }}>
                  Breathe first.<br /><span style={{ color: '#3525CD' }}>Then the day.</span>
                </h2>
                <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
                  Guided breathing, yoga and quiet-room sessions on campus. Book a spot in two taps.
                </p>
                <a href="/care" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '10px', height: '52px', padding: '0 26px', borderRadius: '12px', background: '#3525CD', fontSize: '15px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
                  Book a session →
                </a>
              </div>
            </>
          )}

          {/* Slide 3 */}
          {slide === 3 && (
            <>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, #EEF2FF 0%, #F5F3FF 58%, #FFFFFF 100%)', animation: 'skFade .6s both' }} />
              <div style={{ position: 'relative', zIndex: 1, maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>DOCTORS ON SHIFT</span>
                <h2 style={{ margin: 0, fontSize: '46px', lineHeight: 1.08, fontWeight: 800, letterSpacing: '-1.7px', color: '#131B2E' }}>
                  Real doctors.<br /><span style={{ color: '#3525CD' }}>Real conversations.</span>
                </h2>
                <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
                  Video or chat with a registered doctor{hasCatalog ? ', from ₹199' : ''}.
                </p>
                <a href="/care" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '10px', height: '52px', padding: '0 26px', borderRadius: '12px', background: '#3525CD', fontSize: '15px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
                  Consult now →
                </a>
              </div>
            </>
          )}

          <span style={{ flexGrow: 1 }} />

          {/* Dots Indicator */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
            {dotLabels.map((lbl, idx) => {
              const on = idx === slide;
              return (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => { setSlide(idx); setTick((t) => t + 1); }}
                  aria-label={`Show ${lbl}`}
                  aria-current={on ? 'true' : 'false'}
                  style={{
                    position: 'relative',
                    height: '6px',
                    border: 0,
                    padding: 0,
                    borderRadius: '999px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'width .3s ease',
                    background: '#DAD7F5',
                    width: on ? '44px' : '14px'
                  }}
                >
                  {on && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        background: '#3525CD',
                        borderRadius: '999px',
                        animation: `${tick % 2 ? 'skSlideFill2' : 'skSlideFill'} 6s linear both`,
                        animationPlayState: paused ? 'paused' : 'running'
                      }}
                    />
                  )}
                </button>
              );
            })}
            <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 700, color: '#6B6980' }}>
              {paused ? 'Paused' : ''}
            </span>
          </div>
        </div>

        {/* Hero Side Cards */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <a
            href="/lab-tests"
            style={{
              flexGrow: 1,
              borderRadius: '20px',
              background: 'linear-gradient(140deg, #E6F0EA 0%, #EFF6F2 100%)',
              padding: '30px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              textDecoration: 'none'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#065F46', letterSpacing: '1.2px' }}>MAKE TIME FOR A CHECK-IN</span>
            <span style={{ fontSize: '27px', lineHeight: 1.18, fontWeight: 800, color: '#0F3B2C', letterSpacing: '-0.9px' }}>
              Know a little more.<br />Care a little better.
            </span>
            <span style={{ flexGrow: 1 }} />
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#065F46' }}>Explore lab tests →</span>
          </a>

          <a
            href="/pricing"
            style={{
              flexGrow: 1,
              borderRadius: '20px',
              background: 'linear-gradient(145deg, #312E81 0%, #1E1B4B 62%, #17144C 100%)',
              padding: '30px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              textDecoration: 'none'
            }}
          >
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

      {/* 6. Four Category Tiles */}
      <section style={{ padding: '18px 44px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px' }}>
        {[
          { title: 'Everyday wellness', meta: 'Essentials for feeling your best', href: '/shop', path: pillSvg, tint: '#EEF2FF', ink: '#4F46E5', bg: '#FFFFFF' },
          { title: 'Book a lab test', meta: 'Make time for a health check', href: '/lab-tests', path: flaskSvg, tint: '#EBF5F0', ink: '#059669', bg: '#FFFFFF' },
          { title: 'Talk to a doctor', meta: 'Find your next care provider', href: '/care', path: stethoSvg, tint: '#FBEFE6', ink: '#B08968', bg: '#FFF9F4' },
          { title: 'Your health cover', meta: 'Keep your insurance in view', href: '/pricing', path: shieldSvg, tint: '#EEF2FF', ink: '#4F46E5', bg: '#FFFFFF' }
        ].map((t) => (
          <a
            key={t.title}
            href={t.href}
            style={{
              padding: '20px',
              borderRadius: '16px',
              background: t.bg,
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              border: '1px solid #EEF2FF',
              textDecoration: 'none'
            }}
          >
            <span
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `radial-gradient(circle at 30% 25%, #FFFFFF 0%, ${t.tint} 45%, ${t.ink} 140%)`,
                boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.12), 0 8px 16px rgba(19,27,46,0.12)',
                color: t.ink
              }}
            >
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
      <section style={{ padding: '46px 44px 0', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>SHOP BY HEALTH CONCERN</span>
          <h2 style={{ margin: 0, fontSize: '33px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.1px' }}>Find care for what matters today.</h2>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {concerns.map((c) => (
            <a
              key={c.label}
              href="/shop"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '11px', width: '96px', textDecoration: 'none' }}
            >
              <span
                className="bf"
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `radial-gradient(circle at 32% 26%, #FFFFFF 0%, ${c.tint} 42%, ${c.ink} 150%)`,
                  boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.12), 0 10px 18px rgba(19,27,46,0.12)'
                }}
              >
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
      <section style={{ padding: '44px 44px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>A LITTLE CARE, EVERY DAY</span>
            <h2 style={{ margin: 0, fontSize: '33px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.1px' }}>Find your everyday essentials.</h2>
          </div>
          <a href="/shop" style={{ fontSize: '13.5px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>Explore your kind of wellbeing →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '18px' }}>
          {[
            { title: 'Vitamins & supplements', sub: 'Your daily essentials', bg: '#E8E9F4', ink: '#6E7BD8', path: pillSvg },
            { title: 'Skin & personal care', sub: 'A little time for you', bg: '#F0E8E2', ink: '#B08968', path: dropSvg },
            { title: 'Nutrition & wellbeing', sub: 'Nourish your routine', bg: '#E6F0EA', ink: '#5E8F73', path: bowlSvg },
            { title: 'Health checks', sub: 'Take the next step', bg: '#E4EAF2', ink: '#4F46E5', path: flaskSvg },
            { title: 'Everyday care', sub: 'Connect with a provider', bg: '#EDE9E4', ink: '#8A7A66', path: stethoSvg }
          ].map((item) => (
            <a key={item.title} href="/shop" style={{ borderRadius: '16px', background: '#FFFFFF', overflow: 'hidden', display: 'flex', flexDirection: 'column', textDecoration: 'none', border: '1px solid #EEF2FF' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '152px', background: item.bg }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={item.ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={item.path} />
                </svg>
              </span>
              <span style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>{item.title}</span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#6B6980' }}>{item.sub}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* 9. Health Checks (Lab Packages) */}
      <section style={{ margin: '44px 44px 0', padding: '34px', borderRadius: '22px', background: 'linear-gradient(140deg, #EBF5F0 0%, #F3F8F5 100%)', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>A CHECK-IN WITH YOUR HEALTH</span>
            <h2 style={{ margin: 0, fontSize: '31px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.1px' }}>Health checks, made simpler.</h2>
          </div>
          <a href="/lab-tests" style={{ fontSize: '14px', fontWeight: 800, color: '#3525CD', textDecoration: 'none' }}>See all lab tests →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px' }}>
          {labs.map((l) => (
            <div key={l.name} style={{ padding: '20px', borderRadius: '16px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid #EEF2FF' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={flaskSvg} />
                  </svg>
                </span>
                <span style={{ padding: '4px 10px', borderRadius: '999px', background: '#ECFDF5', fontSize: '10.5px', fontWeight: 800, color: '#047857' }}>{l.off}</span>
              </span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>{l.name}</span>
              <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#6B6980' }}>{l.params}</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B6980' }}>Kare Labs</span>
              <span style={{ height: '1px', background: '#EEF2FF', margin: '4px 0' }} />
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  {hasCatalog && <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#6B6980', textDecoration: 'line-through' }}>{l.mrp}</span>}
                  <span style={{ fontSize: '19px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.5px' }}>{l.price}</span>
                </span>
                <a href="/lab-tests" style={{ display: 'flex', alignItems: 'center', height: '40px', padding: '0 16px', borderRadius: '11px', border: '1px solid #C7D2FE', fontSize: '13px', fontWeight: 800, color: '#3525CD', textDecoration: 'none' }}>
                  View slots →
                </a>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 10. Moving This Week on Campus (Everyday Wellness) */}
      {hasCatalog && (
        <section style={{ padding: '44px 44px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>MOVING THIS WEEK ON CAMPUS</span>
              <h2 className="sk-landing__heading" style={{ margin: 0, fontSize: '33px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.1px' }}>Published right now</h2>
            </div>
            <a href="/shop" style={{ fontSize: '14px', fontWeight: 800, color: '#3525CD', textDecoration: 'none' }}>See all published →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
            {popularProducts.map((p) => (
              <a
                key={p.name}
                href="/shop"
                style={{
                  borderRadius: '15px',
                  background: '#FFFFFF',
                  border: '1px solid #EEF2FF',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  textDecoration: 'none'
                }}
              >
                <span style={{ position: 'relative', height: '136px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: p.tint }}>
                  <span style={{ position: 'absolute', top: '10px', left: '10px', padding: '3px 9px', borderRadius: '999px', background: '#ECFDF5', fontSize: '9.5px', fontWeight: 800, color: '#047857' }}>{p.off}</span>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={p.ink} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={p.path} />
                  </svg>
                  <span style={{ position: 'absolute', bottom: '8px', left: 0, right: 0, textAlign: 'center', fontSize: '9px', fontWeight: 500, color: '#9A97A8' }}>Illustrative packaging</span>
                </span>
                <span style={{ padding: '13px 14px 14px', display: 'flex', flexDirection: 'column', gap: '5px', flexGrow: 1 }}>
                  <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '0.8px' }}>{p.brand}</span>
                  <span style={{ fontSize: '13px', lineHeight: 1.3, fontWeight: 700, color: '#131B2E' }}>{p.name}</span>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#6B6980' }}>{p.size}</span>
                  <span style={{ flexGrow: 1 }} />
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px', paddingTop: '4px' }}>
                    <span style={{ fontSize: '17px', fontWeight: 800, color: '#131B2E' }}>{p.price}</span>
                    {p.mrp && <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B6980', textDecoration: 'line-through' }}>{p.mrp}</span>}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '9px', paddingTop: '9px', borderTop: '1px solid #EEF2FF' }}>
                    <span style={{ flexGrow: 1, fontSize: '10.5px', fontWeight: 600, color: '#6B6980' }}>{p.stock}</span>
                    <span style={{ display: 'flex', alignItems: 'center', height: '32px', padding: '0 13px', borderRadius: '9px', border: '1px solid #C7D2FE', fontSize: '11.5px', fontWeight: 800, color: '#3525CD' }}>+ Add</span>
                  </span>
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 11. Featured Promotion */}
      <section style={{ margin: '40px 44px 0', padding: '34px 40px', borderRadius: '22px', background: 'linear-gradient(110deg, #FBEFE6 0%, #FDF6F0 55%, #FFFFFF 100%)', display: 'flex', alignItems: 'center', gap: '30px' }}>
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>FEATURED PROMOTION</span>
          <span style={{ fontSize: '36px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.3px' }}>Pick up your everyday favourites</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.6px' }}>Barrier Care Daily Moisturiser</span>
          <span style={{ fontSize: '13.5px', fontWeight: 500, color: '#464555' }}>Tube of 100 ml lotion · <strong style={{ color: '#047857' }}>30% off</strong></span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: '12px', paddingTop: '2px' }}>
            {hasCatalog && <span style={{ fontSize: '15px', fontWeight: 600, color: '#6B6980', textDecoration: 'line-through' }}>₹399</span>}
            <span style={{ fontSize: '30px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.9px' }}>{hasCatalog ? '₹279' : '279'}</span>
          </span>
          <a href="/shop" style={{ alignSelf: 'flex-start', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '9px', height: '50px', padding: '0 26px', borderRadius: '12px', background: '#3525CD', fontSize: '14.5px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
            Add to cart →
          </a>
        </div>
        <span style={{ width: '200px', height: '190px', borderRadius: '18px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#B08968" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={dropSvg} />
          </svg>
        </span>
      </section>

      {/* 12. Featured Brands */}
      <section style={{ padding: '40px 44px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>MEET YOUR EVERYDAY FAVOURITES</span>
            <h2 style={{ margin: 0, fontSize: '33px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.1px' }}>Featured brands.</h2>
          </div>
          <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#6B6980' }}>From the published catalog</span>
        </div>
        <div style={{ display: 'flex', gap: '18px' }}>
          {brands.map((b) => (
            <a
              key={b.name}
              href="/shop"
              style={{
                flexGrow: 1,
                padding: '26px',
                borderRadius: '18px',
                background: b.tint,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px',
                textDecoration: 'none'
              }}
            >
              <span style={{ width: '70px', height: '86px', borderRadius: '12px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={b.ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={b.path} />
                </svg>
              </span>
              <span style={{ fontSize: '19px', fontWeight: 800, color: '#3525CD', letterSpacing: '-0.4px' }}>{b.name}</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B6980', letterSpacing: '0.9px' }}>EXPLORE THE COLLECTION →</span>
            </a>
          ))}
        </div>
      </section>

      {/* 13. Records + Care Twin Strip */}
      <section style={{ padding: '32px 44px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
        <a href="/vault" style={{ padding: '26px 28px', borderRadius: '18px', background: '#EDEEFB', display: 'flex', alignItems: 'center', gap: '18px', textDecoration: 'none' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={docSvg} />
          </svg>
          <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>Your records, together.</span>
            <span style={{ fontSize: '13.5px', fontWeight: 500, color: '#464555' }}>Keep your own reports, prescriptions, and documents in one private place.</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', height: '46px', padding: '0 20px', borderRadius: '12px', background: '#FFFFFF', fontSize: '13.5px', fontWeight: 800, color: '#3525CD' }}>
            Open health records →
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

      {/* 14. Student Kare Care Services */}
      <section style={{ margin: '32px 44px 0', padding: '34px', borderRadius: '22px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid #EEF2FF' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>STUDENTKARE CARE SERVICES</span>
          <h2 style={{ margin: 0, fontSize: '30px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>Explore Student Kare services.</h2>
          <p style={{ margin: 0, maxWidth: '780px', fontSize: '14.5px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
            Medicine information, lab tests, consultations and health offerings inside Student Kare.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
          {[
            { title: 'Medicines & health products', href: '/shop', body: 'Browse the Student Kare marketplace for medicines and wellness products. Prescriptions and availability are checked before fulfilment.' },
            { title: 'Lab tests & packages', href: '/lab-tests', body: 'Compare lab tests and preparation requirements in the Student Kare marketplace. Ask your clinician which tests are appropriate.' },
            { title: 'Doctor consultations', href: '/care', body: 'Find care and request a consultation through Student Kare with verified registered doctors.' },
            { title: 'Current offers', href: '/shop', body: 'Check current Student Kare offers, student discounts and prices in the marketplace.' }
          ].map((s) => (
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

      {/* 15. Preventive Care + Movement */}
      <section style={{ padding: '26px 44px 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ padding: '30px 34px', borderRadius: '20px', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '24px', border: '1px solid #EEF2FF' }}>
          <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>PREVENTIVE CARE</span>
            <span style={{ fontSize: '26px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.8px' }}>Vaccines, report follow-up &amp; seasonal health.</span>
            <span style={{ maxWidth: '640px', fontSize: '13.5px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
              Explore source-labelled listings and clinician-reviewed next steps. Choose your own notification preferences.
            </span>
          </span>
          <a href="/care" style={{ display: 'flex', alignItems: 'center', height: '48px', padding: '0 22px', borderRadius: '12px', border: '1px solid #C7D2FE', fontSize: '13.5px', fontWeight: 800, color: '#3525CD', textDecoration: 'none' }}>
            Open preventive care →
          </a>
        </div>

        <div style={{ padding: '26px 34px', borderRadius: '20px', background: '#EDEEFB', display: 'flex', alignItems: 'center', gap: '22px' }}>
          <span style={{ width: '62px', height: '62px', borderRadius: '16px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifySelf: 'center' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7C6BA8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12h4l2-6 3 12 2-6h7" />
            </svg>
          </span>
          <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>SMALL STEPS, AT YOUR OWN PACE</span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.7px' }}>Movement for everyday life.</span>
            <span style={{ fontSize: '13.5px', fontWeight: 500, color: '#464555' }}>Source-linked exercise guides and your saved session history.</span>
          </span>
          <a href="/care" style={{ display: 'flex', alignItems: 'center', height: '48px', padding: '0 22px', borderRadius: '12px', background: '#FFFFFF', fontSize: '13.5px', fontWeight: 800, color: '#3525CD', textDecoration: 'none' }}>
            Explore movement →
          </a>
        </div>
      </section>

      {/* 16. Four Account Cards */}
      <section style={{ padding: '26px 44px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px' }}>
        {[
          { title: 'Your health records', meta: 'Save and access your own reports.', href: '/vault', path: docSvg },
          { title: 'Your medical metrics', meta: 'Track actual readings you record.', href: '/vault', path: heartSvg },
          { title: 'Your insurance details', meta: 'Keep policy information in view.', href: '/pricing', path: shieldSvg },
          { title: 'Support when you need it', meta: 'Follow a saved support request.', href: '/care', path: stethoSvg }
        ].map((a) => (
          <a key={a.title} href={a.href} style={{ padding: '22px', borderRadius: '16px', background: '#EDEEFB', display: 'flex', flexDirection: 'column', gap: '12px', textDecoration: 'none' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={a.path} />
            </svg>
            <span style={{ fontSize: '15.5px', fontWeight: 700, color: '#131B2E' }}>{a.title}</span>
            <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#6B6980' }}>{a.meta}</span>
          </a>
        ))}
      </section>

      {/* 17. Health Perspectives */}
      <section style={{ padding: '44px 44px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>GOOD READS FOR HEALTHIER DAYS</span>
          <h2 style={{ margin: 0, fontSize: '33px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.1px' }}>Health perspectives.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
          {[
            { tag: 'EVERYDAY WELLBEING', title: 'A little less scrolling. A little more sleep.', time: '3 min read', bg: '#E8E5F4', ink: '#7C6BA8', path: 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z' },
            { tag: 'PREVENTIVE CARE', title: 'Your first health checkup, made simpler.', time: '4 min read', bg: '#E3EFE7', ink: '#5E8F73', path: 'M12 20c4-2.5 6-5.6 6-9a6 6 0 0 0-12 0c0 3.4 2 6.5 6 9z' },
            { tag: 'SKIN & SELF-CARE', title: 'Keep your everyday skincare simple.', time: '3 min read', bg: '#F7E9DE', ink: '#B08968', path: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z' }
          ].map((art) => (
            <div key={art.title} style={{ borderRadius: '18px', background: '#FFFFFF', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #EEF2FF' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '176px', background: art.bg }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={art.ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={art.path} />
                </svg>
              </span>
              <span style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>{art.tag}</span>
                <span style={{ fontSize: '18px', lineHeight: 1.3, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>{art.title}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '6px', borderTop: '1px solid #EEF2FF' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#777587" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  <span style={{ flexGrow: 1, fontSize: '11.5px', fontWeight: 500, color: '#6B6980' }}>{art.time}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#131B2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 18. Why Students Trust Student Kare */}
      <section aria-label="Why students trust Student Kare" style={{ flexShrink: 0, display: 'flex', gap: '20px', margin: '64px 44px 0', padding: '40px 24px', borderRadius: '28px', background: '#FFFFFF', border: '1px solid #EEF2FF' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
            <ellipse cx="42" cy="78" rx="26" ry="5" fill="#1E1B4B" opacity="0.28" />
            <path d="M42 6 16 16v20c0 18 11 31 26 37 15-6 26-19 26-37V16z" fill="#4F46E5" />
            <path d="M33 38v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#F5B83D" strokeWidth="5" strokeLinecap="round" />
            <rect x="28" y="36" width="28" height="22" rx="6" fill="#F5B83D" />
            <circle cx="42" cy="47" r="3.2" fill="#7A4A08" />
          </svg>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Private by default</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Records open only to you and the clinician you choose. Your campus sees counts, never results.
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
            <ellipse cx="42" cy="78" rx="26" ry="5" fill="#1E1B4B" opacity="0.28" />
            <circle cx="42" cy="34" r="25" fill="#F5B83D" />
            <circle cx="42" cy="34" r="18" fill="#34D399" />
            <path d="M33 34l6 6 12-13" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Licensed clinicians</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Consultations with verified doctors and accredited partner diagnostic labs.
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
            <ellipse cx="42" cy="78" rx="26" ry="5" fill="#1E1B4B" opacity="0.28" />
            <path d="M10 70V36l22-15 22 15v34z" fill="#C7D2FE" />
            <path d="M6 38 32 18l26 20" fill="none" stroke="#4F46E5" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M64 4c-9 0-15 7-15 14 0 10 15 25 15 25s15-15 15-25c0-7-6-14-15-14z" fill="#4F46E5" />
            <circle cx="64" cy="18" r="5.5" fill="#FFFFFF" />
          </svg>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Near your hostel</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Collection at your block, consults between classes, a campus clinic when open.
          </span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
            <ellipse cx="42" cy="78" rx="26" ry="5" fill="#1E1B4B" opacity="0.28" />
            <path d="M22 6h40v64l-6-4-7 4-7-4-7 4-7-4-6 4z" fill="#FFFFFF" stroke="#C7D2FE" strokeWidth="1.5" />
            <path d="M36 26h12M36 26c5 0 8 2.5 8 6s-3 6-8 6h-1l11 9M36 32h12" fill="none" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Price before you book</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Every price is on screen before you confirm. A plan changes the price, never the care.
          </span>
        </div>
      </section>

      {/* 19. Get the Student Kare App */}
      <section aria-label="Get the Student Kare app" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '40px', margin: '40px 44px 64px', padding: '0 0 0 56px', minHeight: '420px', borderRadius: '28px', background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 60%, #DAE2FD 100%)', overflow: 'hidden' }}>
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '16px', padding: '48px 0' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#3525CD' }}>GET THE APP</span>
          <span style={{ fontSize: '32px', lineHeight: 1.2, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.9px', maxWidth: '520px' }}>
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
              Sample collection tracking
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>
              <span style={{ width: '34px', height: '34px', borderRadius: '11px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3525CD" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="5" width="16" height="14" rx="3" />
                  <path d="M12 9v6M9 12h6" />
                </svg>
              </span>
              Emergency health profile card
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>
              <span style={{ width: '34px', height: '34px', borderRadius: '11px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3525CD" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" />
                </svg>
              </span>
              Instant verified reports
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingTop: '4px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '184px', height: '54px', padding: '0 16px', boxSizing: 'border-box', borderRadius: '14px', background: '#131B2E', color: '#FFFFFF', textDecoration: 'none' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 3c-1 0-2.4.8-3 1.8-.6.9-1 2.2-.8 3.3 1.2 0 2.4-.7 3.1-1.7.6-.9 1-2.1.7-3.4z" />
                  <path d="M19 16.5c-.6 1.4-1 2-1.8 3.2-1.2 1.6-2.8 1.7-3.8 1-1-.5-1.8-.5-2.8 0-1.2.7-2.5.5-3.7-1C4.4 16.9 4 12.4 6 10c1.3-1.6 3-1.7 4.2-1 1 .5 1.7.5 2.6 0 1.3-.7 3-.6 4.2.8-2.8 1.7-2.4 5.8 2 6.7z" />
                </svg>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600 }}>Download for</span>
                  <span style={{ fontSize: '15px', fontWeight: 800 }}>iOS Device</span>
                </span>
              </a>
              <a href="/login" style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '184px', height: '54px', padding: '0 16px', boxSizing: 'border-box', borderRadius: '14px', background: '#131B2E', color: '#FFFFFF', textDecoration: 'none' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 3l12 9-12 9z" />
                  <path d="M5 3l9 9M5 21l9-9" />
                </svg>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600 }}>Get on</span>
                  <span style={{ fontSize: '15px', fontWeight: 800 }}>Android</span>
                </span>
              </a>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#6B6980' }}>or scan</span>
            <span style={{ padding: '6px', borderRadius: '12px', background: '#FFFFFF', lineHeight: 0 }}>
              <svg width="84" height="84" viewBox="0 0 29 29" shapeRendering="crispEdges" aria-hidden="true">
                <rect width="29" height="29" fill="#FFFFFF" />
                <g fill="#131B2E">
                  <rect x="2" y="2" width="7" height="7" />
                  <rect x="3" y="3" width="5" height="5" fill="#FFF" />
                  <rect x="4" y="4" width="3" height="3" />
                  <rect x="20" y="2" width="7" height="7" />
                  <rect x="21" y="3" width="5" height="5" fill="#FFF" />
                  <rect x="22" y="4" width="3" height="3" />
                  <rect x="2" y="20" width="7" height="7" />
                  <rect x="3" y="21" width="5" height="5" fill="#FFF" />
                  <rect x="4" y="22" width="3" height="3" />
                  <rect x="11" y="11" width="7" height="7" />
                </g>
              </svg>
            </span>
          </div>
        </div>
      </section>

      {/* 20. The Campus Health Updates Dispatch */}
      <footer style={{ flexShrink: 0, background: '#131B2E', padding: '0 44px' }}>
        <section aria-label="Subscribe to campus health updates" style={{ display: 'flex', alignItems: 'center', gap: '40px', padding: '40px 44px', transform: 'translateY(-1px)', borderRadius: '0 0 28px 28px', background: 'linear-gradient(120deg, #3525CD 0%, #4F46E5 55%, #6366F1 100%)' }}>
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '460px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.4px', color: '#C7D2FE' }}>CAMPUS HEALTH DIGEST · TWICE A MONTH</span>
            <span style={{ fontSize: '26px', lineHeight: 1.25, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.6px' }}>Camp dates, seasonal alerts and plain-language health tips.</span>
            <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#E0E7FF' }}>Written for students, reviewed by licensed clinicians. Separate from private health records.</span>
          </div>

          <div style={{ flex: '1 1 520px', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div role="radiogroup" aria-label="Subscribe by" style={{ alignSelf: 'flex-start', display: 'flex', gap: '4px', padding: '4px', borderRadius: '999px', background: 'rgba(11,10,36,0.28)' }}>
              <button
                type="button"
                onClick={() => setDispatchTab('wa')}
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
                  border: 0,
                  background: dispatchTab === 'wa' ? '#FFFFFF' : 'transparent',
                  color: dispatchTab === 'wa' ? '#3525CD' : '#E0E7FF'
                }}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setDispatchTab('em')}
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
                  border: 0,
                  background: dispatchTab === 'em' ? '#FFFFFF' : 'transparent',
                  color: dispatchTab === 'em' ? '#3525CD' : '#E0E7FF'
                }}
              >
                Email
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {dispatchTab === 'wa' ? (
                <label style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '10px', height: '54px', padding: '0 16px', borderRadius: '14px', background: '#FFFFFF' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#131B2E', paddingRight: '10px', borderRight: '1px solid #DAE2FD' }}>+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    aria-label="WhatsApp number"
                    placeholder="WhatsApp number"
                    value={dispatchInput}
                    onChange={(e) => setDispatchInput(e.target.value)}
                    style={{ flexGrow: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '15px', color: '#131B2E' }}
                  />
                </label>
              ) : (
                <label style={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '10px', height: '54px', padding: '0 16px', borderRadius: '14px', background: '#FFFFFF' }}>
                  <input
                    type="email"
                    aria-label="Email address"
                    placeholder="you@college.edu.in"
                    value={dispatchInput}
                    onChange={(e) => setDispatchInput(e.target.value)}
                    style={{ flexGrow: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '15px', color: '#131B2E' }}
                  />
                </label>
              )}

              <button
                type="button"
                onClick={() => setDispatchConfirmed(true)}
                style={{ height: '54px', padding: '0 26px', borderRadius: '14px', border: 0, background: '#131B2E', fontFamily: 'inherit', fontSize: '15px', fontWeight: 800, color: '#FFFFFF', cursor: 'pointer' }}
              >
                {dispatchConfirmed ? 'Subscribed ✓' : 'Subscribe'}
              </button>
            </div>
            <span style={{ fontSize: '11.5px', lineHeight: 1.5, fontWeight: 500, color: '#E0E7FF' }}>
              Opt-in only, never pre-ticked. Unsubscribe anytime.
            </span>
          </div>
        </section>

        {/* 21. Main Footer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(4, minmax(0, 1fr)) 190px', gap: '32px', padding: '52px 0 40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <span style={{ fontSize: '19px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.4px' }}>
                Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
              </span>
            </a>
            <span style={{ fontSize: '13px', lineHeight: 1.6, fontWeight: 500, color: '#A5B4FC', maxWidth: '230px' }}>
              A health record you own, from campus onwards. Private, student-governed.
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', fontWeight: 600, color: '#C7D2FE' }}>
              SNIST · Miyapur, Hyderabad
            </span>
            <p style={{ margin: '8px 0 0', fontSize: '11.5px', color: '#A5B4FC' }}>
              Studentkare is for adults aged 18 and over. Platform is still being built.
            </p>
          </div>

          <nav aria-label="Student Kare Links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1.3px', color: '#A5B4FC' }}>STUDENT KARE</span>
            <a href="/campuses" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>About us</a>
            <a href="/pricing" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Plans</a>
            <a href="/partnerships" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Partnerships</a>
          </nav>

          <nav aria-label="For Students Links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1.3px', color: '#A5B4FC' }}>FOR STUDENTS</span>
            <a href="/lab-tests" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Book a lab test</a>
            <a href="/care" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Consult a doctor</a>
            <a href="/vault" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Health vault</a>
          </nav>

          <nav aria-label="For Partners Links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1.3px', color: '#A5B4FC' }}>FOR PARTNERS</span>
            <a href="/campuses" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>For campuses</a>
            <a href="/clinicians" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>For clinicians</a>
            <a href="/partnerships" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>List a lab or pharmacy</a>
          </nav>

          <nav aria-label="Policies Links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1.3px', color: '#A5B4FC' }}>POLICIES</span>
            <a href="/privacy" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Privacy</a>
            <a href="/terms" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Terms</a>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', padding: '22px 0 28px', borderTop: '1px solid #2E2A66' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#A5B4FC' }}>© 2026 AVKS AI · studentkare.co</span>
          <span style={{ flexGrow: 1 }} />
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#E0E7FF' }}>
            Crisis line: 112 · Tele-MANAS 14416
          </span>
        </div>
      </footer>
    </div>
  );
}

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
