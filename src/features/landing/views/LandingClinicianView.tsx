import React from 'react';
import { AlertTriangle } from 'lucide-react';
import './landing.css';

export function LandingClinicianView(): React.ReactElement {
  const flags: Record<string, { bg: string; color: string }> = {
    HH: { bg: '#FFE4E6', color: '#E11D48' },
    LL: { bg: '#FFE4E6', color: '#E11D48' },
    H: { bg: '#FFFBEB', color: '#B45309' },
    N: { bg: '#ECFDF5', color: '#047857' }
  };

  const queue = [
    { flag: 'HH', name: 'Potassium 6.8 mmol/L', meta: 'Released 11 min ago · not acknowledged', value: 'ref 3.5–5.1', urgent: true },
    { flag: 'LL', name: 'Haemoglobin 7.1 g/dL', meta: 'Released 38 min ago · not acknowledged', value: 'ref 12.0–15.5', urgent: true },
    { flag: 'H', name: 'TSH 9.4 mIU/L', meta: 'Acknowledged 2 hrs ago', value: 'ref 0.4–4.0', urgent: false },
    { flag: 'N', name: 'Complete Blood Count', meta: 'All 21 parameters in range', value: 'in range', urgent: false }
  ];

  const cards = [
    { eyebrow: 'CRITICAL RESULTS', title: 'Acknowledgement is measured, not assumed', body: 'Release starts a clock. Your median turnaround is on your own dashboard, and an unacknowledged critical value sits above every revenue metric on the platform.' },
    { eyebrow: 'ONE TIMELINE', title: 'Readings, prescriptions and notes on one axis', body: 'Not four tabs. Anything outside the consent window is absent rather than greyed out, so you are never guessing whether you are missing something.' },
    { eyebrow: 'PRESCRIBING', title: 'An allergy check that says what it checked', body: 'It blocks on a name match and tells you so — cross-reactivity is not checked, so a related beta-lactam would pass. A green tick that overstates verification is worse than none.' },
    { eyebrow: 'SUBSTITUTION', title: 'Permitting a swap is not performing one', body: 'You mark what you allow. A named pharmacist still signs off every substitution, and the register keeps both entries.' },
    { eyebrow: 'REPORT REVIEWS', title: 'Closed when the student has read it', body: 'A review is not done when you write it. The fourth stage of the tracker is read-by-student, because that is the step that usually goes unmeasured.' },
    { eyebrow: 'THE AGENT', title: 'It refuses rather than guessing', body: 'Ayush answers students from approved sources only. It will not diagnose, prescribe or read a vault, and it routes anything clinical to you.' }
  ];

  const access = [
    { label: 'Records a student has explicitly shared with you', tag: 'YOU SEE', on: true },
    { label: 'Why each record is readable, and until when', tag: 'YOU SEE', on: true },
    { label: 'Your chronic tracker shows only students who agreed to a care programme with you, by room and initials rather than by name', tag: 'YOU SEE', on: true },
    { label: 'Your own access log, the same audit trail the student sees', tag: 'YOU SEE', on: true },
    { label: 'Students with no care relationship to you', tag: 'NEVER', on: false },
    { label: 'Anything outside the student-selected consent window', tag: 'NEVER', on: false },
    { label: 'What a student purchased, ordered or browsed in the shop', tag: 'NEVER', on: false }
  ];

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#FAF8FF', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>

      {/* Header */}
      <header style={{ height: '78px', padding: '0 clamp(16px, 4vw, 64px)', display: 'flex', alignItems: 'center', gap: '30px', background: '#FFFFFF', borderBottom: '1px solid #EEF2FF', boxSizing: 'border-box', flexWrap: 'wrap' }}>
        <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/brand/sk-mark.png" alt="" aria-hidden="true" width={25} height={30} style={{ display: 'block' }} />
          </span>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>
            Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
          </span>
        </a>
        <nav style={{ display: 'flex', gap: '22px', alignItems: 'center' }} aria-label="Clinician Navigation">
          <a href="/landing" style={{ fontSize: '14px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>For students</a>
          <a href="/campuses" style={{ fontSize: '14px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>For campuses</a>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#4F46E5' }}>For clinicians</span>
        </nav>
        <span style={{ flexGrow: 1 }} />
        <a href="/login" style={{ display: 'flex', alignItems: 'center', height: '44px', padding: '0 22px', borderRadius: '999px', background: '#4F46E5', fontSize: '14px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
          Sign in
        </a>
      </header>

      {/* Top Graphic Banner */}
      <section aria-label="For clinicians banner" style={{ flexShrink: 0, position: 'relative', margin: '22px clamp(16px, 4vw, 64px) 0', height: '240px', borderRadius: '28px', background: 'linear-gradient(110deg, #FFF1F2 0%, #FFFFFF 45%, #EEF2FF 100%)', border: '1px solid #EEF2FF', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1, width: '400px', flexShrink: 0, padding: '0 0 0 clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#3525CD' }}>FOR CLINICIANS</span>
          <span style={{ fontSize: '26px', lineHeight: 1.2, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.7px' }}>Your slots, your patients, transparent fees.</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>Free listing</span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>Direct consult fees</span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>Clinical triage</span>
          </div>
        </div>
        <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: '20px' }}>
          <svg width="680" height="240" viewBox="0 0 820 240" aria-hidden="true" style={{ display: 'block', overflow: 'visible', maxWidth: '100%' }}>
            <defs>
              <radialGradient id="bclind" cx="35%" cy="25%" r="85%"><stop offset="0" stopColor="#8B93FF" /><stop offset=".5" stopColor="#4F46E5" /><stop offset="1" stopColor="#2A1F9E" /></radialGradient>
              <radialGradient id="bclmint" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#B8F7DA" /><stop offset=".55" stopColor="#34D399" /><stop offset="1" stopColor="#047857" /></radialGradient>
              <linearGradient id="bclgold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE39A" /><stop offset=".5" stopColor="#F5B83D" /><stop offset="1" stopColor="#C98512" /></linearGradient>
            </defs>
            <path d="M40 130 h120 l14 -30 l16 60 l16 -90 l16 70 l10 -10 h140 l12 -24 l14 44 l12 -20 h110" fill="none" stroke="#FECDD3" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M40 130 h120 l14 -30 l16 60 l16 -90 l16 70 l10 -10 h140 l12 -24 l14 44 l12 -20 h110" fill="none" stroke="#E11D48" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <g>
              <path d="M600 40 v50 a50 50 0 0 0 100 0 v-50" fill="none" stroke="url(#bclind)" strokeWidth="10" strokeLinecap="round" />
              <path d="M650 140 v30 a30 30 0 0 0 60 0 v-8" fill="none" stroke="url(#bclind)" strokeWidth="10" strokeLinecap="round" />
              <circle cx="710" cy="152" r="22" fill="url(#bclgold)" />
              <circle cx="710" cy="152" r="11" fill="#FFF3C4" />
            </g>
            <g>
              <rect x="380" y="168" width="60" height="30" rx="10" fill="url(#bclmint)" stroke="#DAE2FD" />
              <text x="410" y="188" textAnchor="middle" fontFamily="monospace" fontSize="11" fontWeight="600" fill="#131B2E">4:30</text>
            </g>
            <g>
              <rect x="450" y="168" width="60" height="30" rx="10" fill="#FFFFFF" stroke="#DAE2FD" />
              <text x="480" y="188" textAnchor="middle" fontFamily="monospace" fontSize="11" fontWeight="600" fill="#131B2E">5:00</text>
            </g>
            <g>
              <rect x="520" y="168" width="60" height="30" rx="10" fill="url(#bclmint)" stroke="#DAE2FD" />
              <text x="550" y="188" textAnchor="middle" fontFamily="monospace" fontSize="11" fontWeight="600" fill="#131B2E">5:30</text>
            </g>
          </svg>
        </div>
      </section>

      {/* Main Hero & Triage Queue */}
      <section style={{ padding: '62px clamp(16px, 4vw, 64px) 0', display: 'flex', gap: '56px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 520px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.4px' }}>FOR CLINICIANS</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(36px, 4.2vw, 56px)', lineHeight: 1.08, fontWeight: 800, color: '#131B2E', letterSpacing: '-2px' }}>
            A queue sorted by severity, not by arrival.
          </h1>
          <p style={{ margin: 0, maxWidth: '590px', fontSize: '17px', lineHeight: 1.62, fontWeight: 500, color: '#464555' }}>
            A potassium of 6.8 does not sit behind forty routine results. You see what needs you first, with the reference range beside the value and the consent that makes it readable stated on the row.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <a href="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px', padding: '0 30px', borderRadius: '999px', background: '#4F46E5', fontSize: '15.5px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
              See the clinical queue
            </a>
            <a href="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px', padding: '0 26px', borderRadius: '999px', background: '#FFFFFF', border: '1px solid #DAE2FD', fontSize: '15px', fontWeight: 700, color: '#131B2E', textDecoration: 'none' }}>
              See a patient timeline
            </a>
          </div>
        </div>
        <div style={{ flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '10px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#6B6980', letterSpacing: '1.2px' }}>YOUR QUEUE, RIGHT NOW</span>
          {queue.map((q) => (
            <div key={q.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 0', borderBottom: '1px solid #EEF2FF' }}>
              <span style={{ width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, background: flags[q.flag]?.bg, color: flags[q.flag]?.color }}>
                {q.flag}
              </span>
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#131B2E' }}>{q.name}</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: '#6B6980' }}>{q.meta}</span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: q.urgent ? '#E11D48' : '#777587' }}>
                {q.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Built by Reading What Goes Wrong */}
      <section style={{ padding: '76px clamp(16px, 4vw, 64px) 0', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.4px' }}>WHAT IS DIFFERENT</span>
          <h2 style={{ margin: 0, fontSize: '38px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.3px' }}>Built by reading what goes wrong.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {cards.map((c) => (
            <div key={c.title} style={{ minHeight: '190px', padding: '26px', borderRadius: '22px', background: '#FFFFFF', border: '1px solid #EEF2FF', display: 'flex', flexDirection: 'column', gap: '11px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>{c.eyebrow}</span>
              <span style={{ fontSize: '19px', lineHeight: 1.26, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>{c.title}</span>
              <span style={{ fontSize: '13.5px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>{c.body}</span>
            </div>
          ))}
        </div>
      </section>

      {/* The share is the authorisation */}
      <section style={{ margin: '80px clamp(16px, 4vw, 64px) 0', padding: '52px clamp(20px, 4vw, 58px)', borderRadius: '30px', background: 'linear-gradient(145deg, #312E81 0%, #1E1B4B 58%, #17144C 100%)', display: 'flex', gap: '56px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#82F5C1', letterSpacing: '1.4px' }}>YOUR ACCESS, AND ITS LIMITS</span>
          <h2 style={{ margin: 0, fontSize: '34px', lineHeight: 1.14, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1.1px' }}>The share is the authorisation. Not your role.</h2>
          <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.65, fontWeight: 500, color: '#A9A5E0' }}>
            Being a clinician here does not open anyone's record. A student shares specific documents for a number of days they choose. You see exactly those, and every open is written to an audit trail.
          </p>
        </div>
        <div style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {access.map((a) => (
            <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, background: a.on ? '#82F5C1' : '#F87171' }} />
              <span style={{ flexGrow: 1, fontSize: '13.5px', fontWeight: 600, color: '#EEF0FF' }}>{a.label}</span>
              <span style={{ padding: '4px 11px', borderRadius: '999px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', background: a.on ? 'rgba(130,245,193,0.16)' : 'rgba(248,113,113,0.16)', color: a.on ? '#82F5C1' : '#FCA5A5' }}>
                {a.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Honest Disclosure */}
      <div style={{ margin: '0 clamp(16px, 4vw, 64px)', padding: '24px 30px', borderRadius: '20px', background: '#FFFFFF', border: '1px solid #FFE4E6', display: 'flex', gap: '16px', alignItems: 'flex-start' }} role="note">
        <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#E11D48' }}>
          <AlertTriangle size={18} aria-hidden="true" />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#131B2E' }}>Two things we are not claiming yet.</span>
          <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6, color: '#464555' }}>
            <strong>Registration checking.</strong> We do not yet verify a registration number against a registry — the clinician role is granted by an administrator. Until that check is built we will not describe anyone here as verified, including on a prescription.
          </p>
          <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6, color: '#464555' }}>
            <strong>What you are paid.</strong> Earnings currently report gross consult fees only. No commission rate is configured, so no share is published on this page. When one is set it will appear on every line of your statement.
          </p>
          <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6, color: '#6B6980' }}>
            There is no application form here yet. If you already have an account, sign in; otherwise the campus that invited you can arrange access.
          </p>
        </div>
      </div>

      {/* Call to action */}
      <section style={{ margin: '80px clamp(16px, 4vw, 64px) 0', padding: '52px clamp(20px, 4vw, 58px)', borderRadius: '30px', background: '#EEF2FF', display: 'flex', alignItems: 'center', gap: '48px', flexWrap: 'wrap' }}>
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '13px', minWidth: '280px' }}>
          <h2 style={{ margin: 0, fontSize: '34px', lineHeight: 1.12, fontWeight: 800, color: '#131B2E', letterSpacing: '-1.2px' }}>Take one campus clinic session.</h2>
          <p style={{ margin: 0, maxWidth: '580px', fontSize: '15.5px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
            Work a single shift and judge it on the queue, the note and the time it takes to close a critical result. That is the whole pitch.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', alignItems: 'flex-start' }}>
          <a href="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px', padding: '0 34px', borderRadius: '999px', background: '#4F46E5', fontSize: '15.5px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
            Sign in
          </a>
        </div>
      </section>

      {/* Trust Pillars */}
      <section aria-label="Why students trust Student Kare" style={{ display: 'flex', gap: '20px', margin: '64px clamp(16px, 4vw, 64px) 0', padding: '40px 24px', borderRadius: '28px', background: '#FFFFFF', border: '1px solid #EEF2FF', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
          <span style={{ fontSize: '17px', fontWeight: 800, color: '#131B2E' }}>Private by default</span>
          <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>Records open only to the student and the clinician they choose. Campus sees counts, never results.</span>
        </div>
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
          <span style={{ fontSize: '17px', fontWeight: 800, color: '#131B2E' }}>Independent clinicians</span>
          <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>Every doctor practises under professional standards with explicit patient authorisation.</span>
        </div>
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
          <span style={{ fontSize: '17px', fontWeight: 800, color: '#131B2E' }}>Near your hostel</span>
          <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>Collection at block lobbies, teleconsultations between lectures, and campus clinic sessions.</span>
        </div>
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
          <span style={{ fontSize: '17px', fontWeight: 800, color: '#131B2E' }}>Transparent pricing</span>
          <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>Every consult fee is visible upfront before booking. A plan changes the price, never the care.</span>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#131B2E', padding: '52px clamp(16px, 4vw, 64px) 36px', marginTop: '64px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '19px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.4px' }}>
              Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
            </span>
            <span style={{ fontSize: '13px', color: '#A5B4FC', maxWidth: '320px', lineHeight: 1.6 }}>
              A student-owned health records platform for Indian campuses.
            </span>
            <p style={{ margin: 0, fontSize: '12px', color: '#C7D2FE' }}>
              Studentkare is still being built, and this page lists what is missing on purpose.
            </p>
          </div>
          <nav style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }} aria-label="Footer links">
            <a href="/" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>For students</a>
            <a href="/campuses" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>For campuses</a>
            <a href="/privacy" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Privacy</a>
            <a href="/terms" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Terms</a>
            <a href="/login" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>Sign in</a>
          </nav>
        </div>
        <div style={{ borderTop: '1px solid #2E2A66', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <span style={{ fontSize: '12.5px', color: '#A5B4FC' }}>© 2026 AVKS AI · studentkare.co</span>
          <span style={{ fontSize: '12px', color: '#E0E7FF' }}>Not an emergency service. In an emergency dial <strong style={{ color: '#FCA5A5' }}>112</strong></span>
        </div>
      </footer>
    </div>
  );
}
