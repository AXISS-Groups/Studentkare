import React, { useState } from 'react';
import './landing.css';

interface Plan {
  name: string;
  price: string;
  per: string;
  badge: string;
  tone: 'light' | 'plus' | 'dark';
  meta: string;
  cta: string;
  href: string;
  foot: string;
  items: string[];
}

export function LandingPlansView(): React.ReactElement {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [nlTab, setNlTab] = useState<'wa' | 'em'>('wa');
  const [nlInput, setNlInput] = useState('');
  const [nlSubscribed, setNlSubscribed] = useState(false);

  const nav = [
    { label: 'Discover', href: '/landing', on: false },
    { label: 'Wellness', href: '/shop', on: false },
    { label: 'Training', href: '/wellness', on: false },
    { label: 'Lab tests', href: '/lab-tests', on: false },
    { label: 'Find a doctor', href: '/consult', on: false },
    { label: 'Programmes', href: '/programs', on: false },
    { label: 'Plans', href: '/plans', on: true }
  ];

  const plans: Plan[] = [
    {
      name: 'Free',
      price: '₹0',
      per: 'for every student',
      badge: 'STANDARD',
      tone: 'light',
      meta: 'Your Edu ID unlocks the account and the record. Care itself is priced per use.',
      cta: 'Create your account',
      href: '/login',
      foot: 'Your stored records stay readable and exportable even if you never pay.',
      items: [
        'Health records and documents',
        'Browse listed providers',
        'Offline emergency card',
        'Crisis support, always free',
        'Limited saved measurements'
      ]
    },
    {
      name: 'Premium',
      price: '₹199',
      per: 'per month',
      badge: 'MOST STUDENTS',
      tone: 'plus',
      meta: 'For anyone tracking something over time — a condition, a course of medicine, a recovery.',
      cta: 'Choose Premium',
      href: '/login',
      foot: 'Cancel any month. What you already stored stays yours.',
      items: [
        'Everything in Free',
        'Unlimited measurement tracking',
        'Dose and refill reminders',
        'Trend charts across your readings',
        'Discounted lab packages'
      ]
    },
    {
      name: 'Care Circle',
      price: '₹249',
      per: 'per month',
      badge: 'UP TO 5 PEOPLE',
      tone: 'plus',
      meta: 'One plan across a family or a flat. Each person keeps a separate, private record.',
      cta: 'Choose Care Circle',
      href: '/login',
      foot: 'Sharing a plan is not sharing a record. Members cannot read each other.',
      items: [
        'Everything in Premium, for 5',
        'Separate vault per member',
        'Shared billing, separate privacy',
        'One emergency contact tree',
        'Add or remove members monthly'
      ]
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      per: 'per campus, annual',
      badge: 'FOR INSTITUTIONS',
      tone: 'dark',
      meta: 'A campus or employer funds plans for everyone enrolled. Priced per head, per year.',
      cta: 'Talk to us',
      href: '/campuses',
      foot: 'The institution pays. It still never sees an individual record.',
      items: [
        'Premium for every enrolled member',
        'Health camps run end to end',
        'Coverage and attendance reporting',
        'Suppression applied before any result',
        'DPDP evidence pack on request',
        'One-term pilot, no lock-in'
      ]
    }
  ];

  const comparisonRows = [
    { label: 'Health records and documents', note: 'Storage and export', free: 'Included', prem: 'Included', same: true },
    { label: 'Offline emergency card', note: 'Works with no signal', free: 'Included', prem: 'Included', same: true },
    { label: 'Crisis support', note: 'Never plan-gated, never charged', free: 'Always free', prem: 'Always free', same: true },
    { label: 'Critical result handling', note: 'Severity decides the queue, not payment', free: 'Same', prem: 'Same', same: true },
    { label: 'Export everything you stored', note: 'In a format another system can read', free: 'Any time', prem: 'Any time', same: true },
    { label: 'Saved measurements', note: 'Readings you record yourself', free: 'Last 20', prem: 'Unlimited', same: false },
    { label: 'Dose and refill reminders', note: '', free: '—', prem: 'Included', same: false },
    { label: 'Trend charts across readings', note: '', free: '—', prem: 'Included', same: false },
    { label: 'Lab packages', note: '', free: 'List price', prem: 'Discounted', same: false },
    { label: 'Members on one plan', note: 'Care Circle only', free: '1', prem: 'Up to 5', same: false }
  ];

  const payPerUse = [
    { label: 'Lab tests & packages', price: 'From ₹319', note: 'Campus collection included in the price' },
    { label: 'Medicines', price: 'Catalogue price', note: 'Free delivery over ₹299, always free on Care Circle' },
    { label: 'Teleconsult', price: 'From ₹199', note: 'Price shown before you pick a slot' },
    { label: 'Home or hostel visit', price: 'From ₹499', note: 'Where a provider covers your block' }
  ];

  const splits = [
    { label: 'Doctors', ours: '10% to us', keep: 90 },
    { label: 'Clinics', ours: '12–15% to us', keep: 86 },
    { label: 'Hospitals', ours: '15–20% to us', keep: 82 },
    { label: 'Vendors', ours: '15–20% to us', keep: 82 }
  ];

  const neverRules = [
    { label: 'A critical result reaching a clinician sooner', tag: 'NEVER PAID', on: false },
    { label: 'Crisis support, at any tier', tag: 'NEVER PAID', on: false },
    { label: 'Access to records you already stored', tag: 'NEVER PAID', on: false },
    { label: 'Reading or exporting records you already stored', tag: 'NEVER PAID', on: false },
    { label: 'Unlimited tracking, reminders and trend charts', tag: 'WHAT YOU PAY FOR', on: true },
    { label: 'Discounts on lab packages and delivery', tag: 'WHAT YOU PAY FOR', on: true }
  ];

  const faqs = [
    {
      q: 'What happens to my tracking if I stop paying Premium?',
      a: 'Every reading you saved stays in your record, readable and exportable. What ends is adding new ones beyond the free limit, plus reminders and trend charts. Nothing you already stored is deleted or locked — downgrading costs you features, never history.'
    },
    {
      q: 'What does Care Circle share between members?',
      a: 'Sharing a plan is not sharing a record. Members share the monthly billing subscription, but each person has an isolated health vault. No member can view another member\'s medical history, prescriptions, or test results.'
    },
    {
      q: 'Does paying get me seen faster?',
      a: 'Never. Clinical triage is strictly based on medical urgency and acuity. Premium members pay for convenience features and discounts, never priority clinical queues.'
    },
    {
      q: 'Is a plan insurance?',
      a: 'No. Student Kare plans are membership subscriptions providing record management tools, medication reminders, and marketplace discounts. They do not constitute health insurance or replace emergency medical coverage.'
    },
    {
      q: 'Can my campus pay for me?',
      a: 'Yes. Under an Enterprise institutional partnership, colleges fund memberships for students. Even when the institution pays, your records remain completely confidential and strictly inaccessible to the college.'
    }
  ];

  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, background: '#FAF8FF', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
      
      {/* 1. Header */}
      <header style={{ height: '66px', padding: '0 clamp(16px, 3.5vw, 44px)', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '24px', borderBottom: '1px solid #EEF2FF', flexWrap: 'wrap', boxSizing: 'border-box' }}>
        <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/brand/sk-mark.png" alt="" aria-hidden="true" width={25} height={30} style={{ display: 'block' }} />
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
                ...(n.on ? { background: '#EDEEFB', color: '#3525CD', fontWeight: 800 } : { color: '#464555', fontWeight: 600 })
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

      {/* 2. Top Banner with Background Video */}
      <section
        aria-label="Plans"
        style={{
          flexShrink: 0,
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
          src="/assets/fabac8217d14af9d87dd5d5244554ee7.mp4"
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
        <div style={{ position: 'relative', zIndex: 1, width: '480px', padding: '0 0 0 clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#A5B4FC' }}>
            PRICING &amp; MEMBERSHIP
          </span>
          <span style={{ fontSize: '32px', lineHeight: 1.2, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.8px' }}>
            One price. Never surprise fees.
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>
              Cancel anytime
            </span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>
              Per-use care
            </span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#E0E7FF' }}>
              Offline emergency card
            </span>
          </div>
        </div>
      </section>

      {/* 3. Centered Header */}
      <section style={{ padding: '50px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
        <h1 style={{ margin: 0, maxWidth: '820px', fontSize: 'clamp(32px, 4vw, 46px)', lineHeight: 1.1, fontWeight: 800, color: '#131B2E', letterSpacing: '-1.5px' }}>
          A plan changes what you pay. It never changes how you are treated.
        </h1>
        <p style={{ margin: 0, maxWidth: '640px', fontSize: '16px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
          Every student gets a private record, emergency card and crisis support for ₹0. Plans add conveniences — reminders, tracking and discounts.
        </p>
      </section>

      {/* 4. Plan Cards */}
      <section style={{ padding: '34px clamp(16px, 3.5vw, 44px) 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', alignItems: 'stretch' }}>
        {plans.map((p) => {
          const isDark = p.tone === 'dark';
          const isHighlight = p.name === 'Premium';
          return (
            <div
              key={p.name}
              style={{
                padding: '26px',
                borderRadius: '22px',
                background: isDark ? 'linear-gradient(145deg, #312E81, #1E1B4B)' : '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                border: isHighlight ? '2px solid #4F46E5' : isDark ? 'none' : '1px solid #EEF2FF',
                boxShadow: isHighlight ? '0 12px 32px rgba(79, 70, 229, 0.12)' : 'none'
              }}
            >
              <span
                style={{
                  alignSelf: 'flex-start',
                  padding: '5px 11px',
                  borderRadius: '999px',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  letterSpacing: '0.7px',
                  marginBottom: '6px',
                  background: isDark ? 'rgba(255,255,255,0.14)' : isHighlight ? '#EEF2FF' : '#F4F3FA',
                  color: isDark ? '#A9A5E0' : isHighlight ? '#3525CD' : '#6B6980'
                }}
              >
                {p.badge}
              </span>

              <span style={{ fontSize: '16px', fontWeight: 800, color: isDark ? '#FFFFFF' : '#131B2E' }}>
                {p.name}
              </span>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '38px', fontWeight: 800, letterSpacing: '-1.4px', color: isDark ? '#FFFFFF' : '#131B2E' }}>
                  {p.price}
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: isDark ? '#A9A5E0' : '#777587' }}>
                  {p.per}
                </span>
              </div>

              <span style={{ fontSize: '12px', lineHeight: 1.55, fontWeight: 500, color: isDark ? '#A9A5E0' : '#777587' }}>
                {p.meta}
              </span>

              <span style={{ height: '1px', background: isDark ? 'rgba(255,255,255,0.14)' : '#EEF2FF', margin: '10px 0 4px' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {p.items.map((i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '4px 0' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#82F5C1' : '#059669'} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '3px' }} aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                    <span style={{ fontSize: '12.5px', lineHeight: 1.5, fontWeight: 500, color: isDark ? '#EEF0FF' : '#131B2E' }}>
                      {i}
                    </span>
                  </span>
                ))}
              </div>

              <span style={{ flexGrow: 1 }} />

              <a
                href={p.href}
                style={{
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '48px',
                  borderRadius: '12px',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  textDecoration: 'none',
                  background: isHighlight ? '#4F46E5' : isDark ? '#FFFFFF' : '#EDEEFB',
                  color: isHighlight ? '#FFFFFF' : isDark ? '#1E1B4B' : '#3525CD'
                }}
              >
                {p.cta}
              </a>

              <span style={{ paddingTop: '9px', fontSize: '11px', lineHeight: 1.5, fontWeight: 600, color: isDark ? '#82F5C1' : '#777587' }}>
                {p.foot}
              </span>
            </div>
          );
        })}
      </section>

      {/* 5. Line by Line Comparison */}
      <section style={{ margin: '48px clamp(16px, 3.5vw, 44px) 0', padding: '36px', borderRadius: '24px', background: '#FFFFFF', border: '1px solid #EEF2FF', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.9px' }}>
          Line by line.
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 1fr', gap: '20px', paddingBottom: '12px', borderBottom: '2px solid #EEF2FF' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#6B6980', letterSpacing: '1.1px' }}>WHAT YOU GET</span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#6B6980', letterSpacing: '1.1px', textAlign: 'center' }}>BASIC</span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#3525CD', letterSpacing: '1.1px', textAlign: 'center' }}>PREMIUM &amp; ABOVE</span>
          </div>
          {comparisonRows.map((r) => (
            <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr 1fr', gap: '20px', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #EEF2FF' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>{r.label}</span>
                {r.note && <span style={{ fontSize: '11.5px', fontWeight: 500, color: '#6B6980' }}>{r.note}</span>}
              </div>
              <span style={{ textAlign: 'center', fontSize: '13.5px', fontWeight: 700, color: r.same ? '#059669' : '#464555' }}>
                {r.free}
              </span>
              <span style={{ textAlign: 'center', fontSize: '13.5px', fontWeight: 800, color: r.same ? '#059669' : '#3525CD' }}>
                {r.prem}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Pay Per Use Grid */}
      <section style={{ margin: '44px clamp(16px, 3.5vw, 44px) 0', padding: '34px 40px', borderRadius: '24px', background: '#FFFFFF', border: '1px solid #EEF2FF', display: 'flex', gap: '46px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 340px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.3px' }}>PAY PER USE</span>
          <h2 style={{ margin: 0, fontSize: '28px', lineHeight: 1.16, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.9px' }}>
            Care is priced per use, on every plan.
          </h2>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
            A plan changes what you pay, never whether you can book. Every price is shown before you confirm, and a plan discount is applied on the same screen.
          </p>
        </div>
        <div style={{ flex: '1 1 400px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          {payPerUse.map((p) => (
            <span key={p.label} style={{ padding: '18px', borderRadius: '14px', background: '#FAFAFE', border: '1px solid #EEF2FF', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#131B2E' }}>{p.label}</span>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#464555' }}>{p.price}</span>
              <span style={{ fontSize: '11.5px', fontWeight: 500, color: '#6B6980' }}>{p.note}</span>
            </span>
          ))}
        </div>
      </section>

      {/* 7. Where Your Money Goes */}
      <section style={{ margin: '40px clamp(16px, 3.5vw, 44px) 0', padding: '34px 40px', borderRadius: '24px', background: '#ECFDF5', display: 'flex', gap: '46px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 340px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#047857', letterSpacing: '1.3px' }}>WHERE YOUR MONEY GOES</span>
          <h2 style={{ margin: 0, fontSize: '28px', lineHeight: 1.16, fontWeight: 800, color: '#0F3B2C', letterSpacing: '-0.9px' }}>
            The provider keeps most of it. We publish how much.
          </h2>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, fontWeight: 500, color: '#065F46' }}>
            Our commission is the whole business model on the marketplace side, so it is printed rather than buried. Listing is free either way — nobody pays to appear.
          </p>
        </div>
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {splits.map((sp) => (
            <span key={sp.label} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ width: '124px', flexShrink: 0, fontSize: '13px', fontWeight: 800, color: '#0F3B2C' }}>{sp.label}</span>
              <span style={{ flexGrow: 1, height: '30px', borderRadius: '8px', background: '#FFFFFF', overflow: 'hidden', display: 'flex' }}>
                <span style={{ width: `${sp.keep}%`, background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#FFFFFF' }}>
                  Provider keeps {sp.keep}%
                </span>
                <span style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#065F46' }}>
                  {sp.ours}
                </span>
              </span>
            </span>
          ))}
          <span style={{ paddingTop: '4px', fontSize: '11.5px', fontWeight: 500, color: '#065F46' }}>
            Commission never changes what a student is shown. Ranking is stock, distance and turnaround — the doctor on the lowest rate is not ranked lower.
          </span>
        </div>
      </section>

      {/* 8. What a Plan Never Does */}
      <section
        style={{
          margin: '44px clamp(16px, 3.5vw, 44px) 0',
          padding: '44px clamp(20px, 4vw, 50px)',
          borderRadius: '24px',
          background: 'linear-gradient(145deg, #312E81 0%, #1E1B4B 60%, #17144C 100%)',
          display: 'flex',
          gap: '52px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 360px', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#82F5C1', letterSpacing: '1.3px' }}>WHAT A PLAN NEVER DOES</span>
          <h2 style={{ margin: 0, fontSize: '31px', lineHeight: 1.14, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1px' }}>
            Paying changes the price. It never changes the care.
          </h2>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.65, fontWeight: 500, color: '#A9A5E0' }}>
            A critical lab result reaches a clinician at the same speed whether you pay us or not. Queue position for anything clinical is decided by severity, never by plan.
          </p>
        </div>
        <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column' }}>
          {neverRules.map((n) => (
            <span key={n.label} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, background: n.on ? '#82F5C1' : '#F87171' }} />
              <span style={{ flexGrow: 1, fontSize: '14px', fontWeight: 600, color: '#EEF0FF' }}>{n.label}</span>
              <span
                style={{
                  padding: '4px 11px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  background: n.on ? 'rgba(130,245,193,0.16)' : 'rgba(248,113,113,0.16)',
                  color: n.on ? '#82F5C1' : '#FCA5A5'
                }}
              >
                {n.tag}
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* 9. FAQs */}
      <section style={{ padding: '44px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <h2 style={{ margin: 0, fontSize: '30px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1px' }}>
          Questions about paying.
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {faqs.map((f, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={f.q}
                onClick={() => setOpenFaq(isOpen ? null : idx)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '20px',
                  padding: '20px 0',
                  borderBottom: '1px solid #DAE2FD',
                  cursor: 'pointer'
                }}
              >
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#131B2E' }}>{f.q}</span>
                  {isOpen && (
                    <span style={{ maxWidth: '940px', fontSize: '14px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
                      {f.a}
                    </span>
                  )}
                </div>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#777587"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'none', marginTop: '3px', transition: 'transform 0.2s ease' }}
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            );
          })}
        </div>
      </section>

      {/* 10. Trust Pillars */}
      <section
        aria-label="Why students trust Student Kare"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          margin: '64px clamp(16px, 4vw, 72px) 0',
          padding: '40px 24px',
          borderRadius: '28px',
          background: '#FFFFFF',
          border: '1px solid #EEF2FF'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Private by default</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Records open only to you and the clinician you choose. Your campus sees counts, never results.
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Listed providers</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Doctors and labs list themselves. Studentkare does not yet check registrations or accreditations.
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Near your hostel</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Collection at your block, consults between classes, a campus clinic when it is open.
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px', padding: '0 14px' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Price before you book</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Every price is on screen before you confirm. A plan changes the price, never the care.
          </span>
        </div>
      </section>

      {/* 11. Newsletter & Footer */}
      <footer style={{ background: '#131B2E', padding: '0 clamp(16px, 4vw, 72px)', marginTop: '40px' }}>
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
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.4px', color: '#C7D2FE' }}>THE KARE LETTER · TWICE A MONTH</span>
            <span style={{ fontSize: '26px', lineHeight: 1.25, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.6px' }}>Camp dates, seasonal alerts and plain-language health tips.</span>
          </div>
          <div style={{ flex: '1 1 420px', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div role="radiogroup" aria-label="Subscribe by" style={{ alignSelf: 'flex-start', display: 'flex', gap: '4px', padding: '4px', borderRadius: '999px', background: 'rgba(11,10,36,0.28)' }}>
              <button type="button" role="radio" aria-checked={nlTab === 'wa'} aria-label="Subscribe via WhatsApp" onClick={() => setNlTab('wa')} style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '44px', minHeight: '44px', padding: '0 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', border: 'none', background: nlTab === 'wa' ? '#FFFFFF' : 'transparent', color: nlTab === 'wa' ? '#3525CD' : '#E0E7FF' }}>WhatsApp</button>
              <button type="button" role="radio" aria-checked={nlTab === 'em'} aria-label="Subscribe via Email" onClick={() => setNlTab('em')} style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '44px', minHeight: '44px', padding: '0 18px', borderRadius: '999px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', border: 'none', background: nlTab === 'em' ? '#FFFFFF' : 'transparent', color: nlTab === 'em' ? '#3525CD' : '#E0E7FF' }}>Email</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (nlInput.trim()) setNlSubscribed(true); }} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input type="text" aria-label="Contact input" placeholder={nlTab === 'wa' ? '+91 WhatsApp Number' : 'you@college.edu.in'} value={nlInput} onChange={(e) => setNlInput(e.target.value)} style={{ flexGrow: 1, minWidth: '200px', height: '54px', padding: '0 16px', borderRadius: '14px', border: 0, outline: 'none', background: '#FFFFFF', fontSize: '15px', color: '#131B2E' }} />
              <button type="submit" style={{ height: '54px', padding: '0 26px', borderRadius: '14px', border: 0, background: '#131B2E', fontSize: '15px', fontWeight: 800, color: '#FFFFFF', cursor: 'pointer' }}>{nlSubscribed ? 'Subscribed!' : 'Subscribe'}</button>
            </form>
          </div>
        </section>

        {/* Links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '32px', padding: '52px 0 40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontSize: '19px', fontWeight: 800, color: '#FFFFFF' }}>Student Kare</span>
            <span style={{ fontSize: '13px', lineHeight: 1.6, color: '#A5B4FC' }}>A health record you own, from campus to career.</span>
          </div>
          <nav aria-label="Student Kare Links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#A5B4FC' }}>STUDENT KARE</span>
            <a href="/campuses" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>About us</a>
            <a href="/plans" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>How we make money</a>
            <a href="/partnerships" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Careers</a>
          </nav>
          <nav aria-label="For Students Links" style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#A5B4FC' }}>FOR STUDENTS</span>
            <a href="/lab-tests" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Book a lab test</a>
            <a href="/consult" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Consult a doctor</a>
            <a href="/wellness" style={{ fontSize: '14px', color: '#E0E7FF', textDecoration: 'none' }}>Wellness training</a>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', padding: '22px 0 28px', borderTop: '1px solid #2E2A66', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#A5B4FC' }}>© 2026 AVKS AI · studentkare.co</span>
          <span style={{ flexGrow: 1 }} />
          <a href="/crisis" style={{ fontSize: '12.5px', fontWeight: 600, color: '#E0E7FF', textDecoration: 'none' }}>
            Crisis line: <span style={{ fontWeight: 800, color: '#FCA5A5' }}>112</span> · Tele-MANAS <span style={{ fontWeight: 800, color: '#FCA5A5' }}>14416</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
