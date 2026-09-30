import React from 'react';
import './landing.css';

export function LandingClinicianView(): React.ReactElement {
  const flags = {
    HH: { bg: '#FFE4E6', color: '#E11D48' },
    LL: { bg: '#FFE4E6', color: '#E11D48' },
    H: { bg: '#FFFBEB', color: '#B45309' },
    N: { bg: '#ECFDF5', color: '#047857' }
  };

  const queue = [
    { flag: 'HH' as const, name: 'Potassium 6.8 mmol/L', meta: 'Released 11 min ago · not acknowledged', value: 'ref 3.5–5.1', urgent: true },
    { flag: 'LL' as const, name: 'Haemoglobin 7.1 g/dL', meta: 'Released 38 min ago · not acknowledged', value: 'ref 12.0–15.5', urgent: true },
    { flag: 'H' as const, name: 'TSH 9.4 mIU/L', meta: 'Acknowledged 2 hrs ago', value: 'ref 0.4–4.0', urgent: false },
    { flag: 'N' as const, name: 'Complete Blood Count', meta: 'All 21 parameters in range', value: 'no action', urgent: false }
  ];

  const cards = [
    { eyebrow: 'CRITICAL RESULTS', title: 'Acknowledgement is measured, not assumed', body: 'Release starts a clock. Your median turnaround is on your own dashboard, and an unacknowledged critical value sits above every revenue metric on the platform.' },
    { eyebrow: 'ONE TIMELINE', title: 'Readings, prescriptions and notes on one axis', body: 'Not four tabs. Anything outside the consent window is absent rather than greyed out, so you are never guessing whether you are missing something.' },
    { eyebrow: 'PRESCRIBING', title: 'An allergy check that says what it checked', body: 'It blocks on a name match and tells you so — cross-reactivity is checked against verified substance classes before you sign.' },
    { eyebrow: 'SUBSTITUTION', title: 'Permitting a swap is not performing one', body: 'You mark what you allow. A named pharmacist still signs off every substitution, and the register keeps both entries.' },
    { eyebrow: 'REPORT REVIEWS', title: 'Closed when the student has read it', body: 'A review is not done when you write it. The fourth stage of the tracker is read-by-student, because that is the step that usually goes unmeasured.' },
    { eyebrow: 'THE AGENT', title: 'It routes rather than guessing', body: 'Ayush answers students from approved sources only. It will not diagnose, prescribe or read a vault, and it routes anything clinical to you.' }
  ];

  const access = [
    { label: 'Records a student has shared with you (room and initials)', tag: 'YOU SEE', on: true },
    { label: 'Why each record is readable, and until when', tag: 'YOU SEE', on: true },
    { label: 'Your own access log, the same one the student sees', tag: 'YOU SEE', on: true },
    { label: 'Students with no care relationship to you', tag: 'NEVER', on: false },
    { label: 'You cannot open anything outside that window', tag: 'NEVER', on: false },
    { label: 'What a student bought or browsed', tag: 'NEVER', on: false }
  ];

  const gates = [
    { n: '01', title: 'Identity', body: 'Government ID matched to your application.', tag: 'SAME DAY' },
    { n: '02', title: 'Credentials check', body: 'We do not yet verify a registration number automatically against a live register; role assignment is manually gated.', tag: 'REVIEW' },
    { n: '03', title: 'Campus attachment', body: 'A campus confirms the clinical affiliation and practice scope.', tag: '1–2 DAYS' },
    { n: '04', title: 'Scope acknowledged', body: 'Consent-scoped access, time-boxed, fully audited. You sign that you understand it.', tag: 'ONE PAGE' }
  ];

  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, background: '#FAF8FF', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
      
      {/* Header */}
      <header style={{ width: '100%', minHeight: '78px', padding: '16px clamp(16px, 3.5vw, 48px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', borderBottom: '1px solid #EEF2FF', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '1600px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>
              Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
            </span>
          </a>
          <nav style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <a href="/landing" style={{ fontSize: '14px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>For students</a>
            <a href="/campuses" style={{ fontSize: '14px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>For campuses</a>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#4F46E5' }}>For clinicians</span>
          </nav>
          <a href="/login" style={{ display: 'flex', alignItems: 'center', height: '44px', padding: '0 22px', borderRadius: '999px', background: '#4F46E5', fontSize: '14px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
            Sign in to practise
          </a>
        </div>
      </header>

      {/* Top Banner with animated pulse */}
      <section aria-label="For clinicians" style={{ position: 'relative', margin: '22px auto 0', maxWidth: '1600px', width: 'calc(100% - clamp(24px, 5vw, 96px))', minHeight: '220px', borderRadius: '28px', background: 'linear-gradient(110deg, #FFF1F2 0%, #FFFFFF 45%, #EEF2FF 100%)', border: '1px solid #EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', overflow: 'hidden', boxSizing: 'border-box', padding: 'clamp(20px, 3vw, 32px)' }}>
        <div style={{ position: 'relative', zIndex: 1, flex: '1 1 340px', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#3525CD' }}>FOR CLINICIANS</span>
          <span style={{ fontSize: 'clamp(22px, 2.5vw, 26px)', lineHeight: 1.2, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.7px' }}>Your slots, your patients, transparent fees.</span>
          <p style={{ margin: 0, fontSize: '12.5px', color: '#464555' }}>Note: no commission rate is configured into marketing ahead of the payment platform.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>Free listing</span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>Direct consultation</span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>Audited records</span>
          </div>
        </div>

        <div style={{ flex: '1 1 320px', display: 'flex', justifyContent: 'flex-end', overflow: 'hidden' }}>
          <svg width="100%" height="160" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={{ display: 'block', maxWidth: '500px' }}>
            <path d="M40 100 h120 l14 -30 l16 60 l16 -90 l16 70 l10 -10 h140 l12 -24 l14 44 l12 -20 h110" fill="none" stroke="#FECDD3" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path className="bdraw" d="M40 100 h120 l14 -30 l16 60 l16 -90 l16 70 l10 -10 h140 l12 -24 l14 44 l12 -20 h110" fill="none" stroke="#E11D48" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* Hero: Queue Sorted by Severity */}
      <section style={{ maxWidth: '1600px', width: '100%', margin: '0 auto', padding: 'clamp(36px, 4vw, 62px) clamp(16px, 3.5vw, 48px) 0', display: 'flex', flexWrap: 'wrap', gap: '48px', alignItems: 'flex-start', boxSizing: 'border-box' }}>
        <div style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.4px' }}>FOR LICENSED CLINICIANS</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(32px, 4.5vw, 56px)', lineHeight: 1.08, fontWeight: 800, color: '#131B2E', letterSpacing: '-2.1px' }}>
            A queue sorted by severity, not by arrival.
          </h1>
          <p style={{ margin: 0, maxWidth: '590px', fontSize: '17px', lineHeight: 1.62, fontWeight: 500, color: '#464555' }}>
            A potassium of 6.8 does not sit behind forty routine results. You see what needs you first, with the reference range beside the value and the consent that makes it readable stated on the row.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
            <a href="/care" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px', padding: '0 28px', borderRadius: '999px', background: '#4F46E5', fontSize: '15.5px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
              See the clinical queue
            </a>
            <a href="/care" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px', padding: '0 26px', borderRadius: '999px', background: '#FFFFFF', border: '1px solid #DAE2FD', fontSize: '15px', fontWeight: 700, color: '#131B2E', textDecoration: 'none' }}>
              See patient records
            </a>
          </div>
        </div>

        {/* Live Queue Box */}
        <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#FFFFFF', padding: 'clamp(20px, 3vw, 28px)', borderRadius: '20px', border: '1px solid #EEF2FF', boxSizing: 'border-box' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#6B6980', letterSpacing: '1.2px' }}>YOUR QUEUE, RIGHT NOW</span>
          {queue.map((q) => (
            <div key={q.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 0', borderBottom: '1px solid #EEF2FF' }}>
              <span style={{ width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, background: flags[q.flag].bg, color: flags[q.flag].color }}>
                {q.flag}
              </span>
              <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#131B2E' }}>{q.name}</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: '#6B6980' }}>{q.meta}</span>
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: q.urgent ? '#E11D48' : '#777587' }}>{q.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 6 Cards: What is Different */}
      <section style={{ maxWidth: '1600px', width: '100%', margin: '0 auto', padding: 'clamp(44px, 5vw, 76px) clamp(16px, 3.5vw, 48px) 0', display: 'flex', flexDirection: 'column', gap: '30px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.4px' }}>WHAT IS DIFFERENT</span>
          <h2 style={{ margin: 0, fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.3px' }}>Built by reading what goes wrong.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
          {cards.map((c) => (
            <div key={c.title} style={{ minHeight: '210px', padding: '26px', borderRadius: '22px', background: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '11px', border: '1px solid #EEF2FF' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>{c.eyebrow}</span>
              <span style={{ fontSize: '19px', lineHeight: 1.26, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>{c.title}</span>
              <span style={{ fontSize: '13.5px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>{c.body}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Dark Section: Access and Limits */}
      <section style={{ margin: 'clamp(44px, 5vw, 80px) auto 0', maxWidth: '1600px', width: 'calc(100% - clamp(24px, 5vw, 96px))', padding: 'clamp(32px, 4vw, 52px) clamp(24px, 4vw, 58px)', borderRadius: '30px', background: 'linear-gradient(145deg, #312E81 0%, #1E1B4B 58%, #17144C 100%)', display: 'flex', flexWrap: 'wrap', gap: '48px', boxSizing: 'border-box' }}>
        <div style={{ flex: '1 1 340px', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#82F5C1', letterSpacing: '1.4px' }}>YOUR ACCESS, AND ITS LIMITS</span>
          <h2 style={{ margin: 0, fontSize: 'clamp(26px, 3vw, 34px)', lineHeight: 1.14, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1.1px' }}>The share is the authorisation. Not your role.</h2>
          <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.65, fontWeight: 500, color: '#A9A5E0' }}>
            Being a clinician here does not open anyone's record. A student shares specific documents for a number of days they choose (room and initials shown). You see exactly those, and you cannot open anything outside that window.
          </p>
        </div>
        <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {access.map((a) => (
            <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, background: a.on ? '#82F5C1' : '#F87171' }} />
              <span style={{ flexGrow: 1, fontSize: '14px', fontWeight: 600, color: '#EEF0FF' }}>{a.label}</span>
              <span style={{ padding: '4px 11px', borderRadius: '999px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', background: a.on ? 'rgba(130,245,193,0.16)' : 'rgba(248,113,113,0.16)', color: a.on ? '#82F5C1' : '#FCA5A5' }}>
                {a.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Joining Verification Steps */}
      <section style={{ maxWidth: '1600px', width: '100%', margin: '0 auto', padding: 'clamp(44px, 5vw, 80px) clamp(16px, 3.5vw, 48px) 0', display: 'flex', flexWrap: 'wrap', gap: '48px', boxSizing: 'border-box' }}>
        <div style={{ flex: '1 1 340px', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.4px' }}>JOINING</span>
          <h2 style={{ margin: 0, fontSize: 'clamp(28px, 3vw, 38px)', lineHeight: 1.12, fontWeight: 800, color: '#131B2E', letterSpacing: '-1.2px' }}>
            Verified clinical credentials, step by step.
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: '14.5px', lineHeight: 1.65, fontWeight: 500, color: '#464555' }}>
            Clinical access is reviewed and verified. Note: we do not yet verify a registration number automatically against a live register.
          </p>
        </div>
        <div style={{ flex: '1 1 360px', display: 'flex', flexDirection: 'column' }}>
          {gates.map((g) => (
            <div key={g.n} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 0', borderBottom: '1px solid #EEF2FF' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#4F46E5', width: '28px', flexShrink: 0 }}>{g.n}</span>
              <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>{g.title}</span>
                <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>{g.body}</span>
              </span>
              <span style={{ padding: '5px 12px', borderRadius: '999px', fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.4px', flexShrink: 0, background: '#ECFDF5', color: '#047857' }}>
                {g.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Clinic Callout */}
      <section style={{ margin: 'clamp(44px, 5vw, 80px) auto 0', maxWidth: '1600px', width: 'calc(100% - clamp(24px, 5vw, 96px))', padding: 'clamp(28px, 4vw, 40px) clamp(24px, 4vw, 58px)', borderRadius: '30px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '36px', boxSizing: 'border-box' }}>
        <div style={{ flex: '1 1 340px', maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(26px, 3vw, 36px)', lineHeight: 1.12, fontWeight: 800, color: '#131B2E', letterSpacing: '-1.2px' }}>
            Take one campus clinic session.
          </h2>
          <p style={{ margin: 0, fontSize: '15.5px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
            Work a single shift and judge it on the queue, the note and the time it takes to close a critical result. Note: there is no application form here yet; sign in directly with an authorized credential.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', flexShrink: 0 }}>
          <a href="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px', padding: '0 32px', borderRadius: '999px', background: '#4F46E5', fontSize: '15.5px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
            Sign in to practise
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: '80px', width: '100%', background: '#131B2E', padding: '40px clamp(16px, 3.5vw, 48px)', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', color: '#A5B4FC', fontSize: '13px' }}>
          <span>© 2026 Studentkare · Clinician Services</span>
          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="/privacy" style={{ color: '#E0E7FF', textDecoration: 'none' }}>Privacy</a>
            <a href="/terms" style={{ color: '#E0E7FF', textDecoration: 'none' }}>Terms</a>
            <a href="/landing" style={{ color: '#E0E7FF', textDecoration: 'none' }}>Student Portal</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
