import React from 'react';
import { AlertTriangle } from 'lucide-react';
import './landing.css';

export function LandingCampusView(): React.ReactElement {
  const stats = [
    { value: '24', label: 'Campuses live across Telangana and Delhi' },
    { value: '95.6%', label: 'Attendance at the last annual health check' },
    { value: '0', label: 'Student names ever exposed to a campus dashboard' },
    { value: '11 mins', label: 'Median time from critical result to clinician acknowledgement' }
  ];

  const boundary = [
    { label: 'How many students attended the camp', tag: 'YOU SEE', on: true },
    { label: 'Coverage by block, year and department', tag: 'YOU SEE', on: true },
    { label: 'Any individual student’s private medical records', tag: 'NEVER', on: false },
    { label: 'A student name against a diagnosis or clinical finding', tag: 'NEVER', on: false },
    { label: 'Any lab result, prescription or clinical document — no endpoint returns them to a campus role', tag: 'NEVER', on: false },
    { label: 'Whether a student left a programme — leaving is never reported to a campus', tag: 'NEVER', on: false },
    { label: 'Crisis line volume or student mental health calls, even in aggregate', tag: 'NEVER', on: false }
  ];

  const jobs = [
    { eyebrow: 'CAMPS', title: 'Run a health camp end to end', body: 'Create it, staff it, invite the cohort, watch the queue on the day, file the report. Attendance is opt-in and a no-show is not reported to you.', foot: 'Replaces the spreadsheet' },
    { eyebrow: 'VERIFICATION', title: 'Confirm enrolment, nothing more', body: 'Most students clear automatically against your directory. Your team only sees the ones that do not, and answers one question: is this person enrolled here.', foot: '86% auto-verified' },
    { eyebrow: 'COVERAGE', title: 'See where clinical cover is thin', body: 'Clinician availability per block against the redundancy minimum, so a gap is visible before a student finds it at 2 AM.', foot: 'Minimum 2 per cluster' },
    { eyebrow: 'GOVERNANCE', title: 'Evidence when someone asks', body: 'Consent records and an append-only audit trail you can hand to a regulator without preparing anything.', foot: 'DPDP-aligned' }
  ];

  const compare = [
    { label: 'TODAY', before: 'Medical forms in a filing cabinet in the admin block', after: 'Records held by the student in their private health vault' },
    { label: 'TODAY', before: 'The campus is the data fiduciary for every student record', after: 'The student holds; we process on their instruction' },
    { label: 'TODAY', before: 'A camp report is a spreadsheet someone types up', after: 'Attendance and coverage, generated, with student consent applied' },
    { label: 'TODAY', before: 'An erasure request has nowhere to go', after: 'A statutory queue with the clock on every row' }
  ];

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#FAF8FF', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>

      {/* Top Header */}
      <header style={{ height: '78px', padding: '0 clamp(16px, 4vw, 64px)', display: 'flex', alignItems: 'center', gap: '30px', background: '#FFFFFF', borderBottom: '1px solid #EEF2FF', boxSizing: 'border-box', flexWrap: 'wrap' }}>
        <a href="/landing" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <span style={{ width: '30px', height: '30px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/brand/sk-mark.png" alt="" aria-hidden="true" width={25} height={30} style={{ display: 'block' }} />
          </span>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.4px' }}>
            Student<em style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700 }}>&nbsp;Kare</em>
          </span>
        </a>
        <nav style={{ display: 'flex', gap: '22px', alignItems: 'center' }} aria-label="Campus Navigation">
          <a href="/landing" style={{ fontSize: '14px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>For students</a>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#4F46E5' }}>For campuses</span>
          <a href="/clinicians" style={{ fontSize: '14px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>For clinicians</a>
          <a href="/partnerships" style={{ fontSize: '14px', fontWeight: 600, color: '#464555', textDecoration: 'none' }}>Partnerships</a>
        </nav>
        <span style={{ flexGrow: 1 }} />
        <a href="/campuses#walkthrough" style={{ display: 'flex', alignItems: 'center', height: '44px', padding: '0 22px', borderRadius: '999px', background: '#4F46E5', fontSize: '14px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
          Book a walkthrough
        </a>
      </header>

      {/* Top Graphic Banner */}
      <section aria-label="For campuses banner" style={{ flexShrink: 0, position: 'relative', margin: '22px clamp(16px, 4vw, 64px) 0', height: '240px', borderRadius: '28px', background: 'linear-gradient(110deg, #EEF2FF 0%, #FFFFFF 45%, #DCFCE7 100%)', border: '1px solid #EEF2FF', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1, width: '400px', flexShrink: 0, padding: '0 0 0 clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#3525CD' }}>FOR CAMPUSES</span>
          <span style={{ fontSize: '26px', lineHeight: 1.2, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.7px' }}>Care that reaches every block and hostel.</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>Health camps</span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>Coverage reports</span>
            <span style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.8)', border: '1px solid #DAE2FD', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: '#312E81' }}>One-term pilot</span>
          </div>
        </div>
        <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end', paddingRight: '20px' }}>
          <svg width="680" height="240" viewBox="0 0 820 240" aria-hidden="true" style={{ display: 'block', overflow: 'visible', maxWidth: '100%' }}>
            <defs>
              <radialGradient id="bcpind" cx="35%" cy="25%" r="85%"><stop offset="0" stopColor="#8B93FF" /><stop offset=".5" stopColor="#4F46E5" /><stop offset="1" stopColor="#2A1F9E" /></radialGradient>
              <radialGradient id="bcpmint" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#B8F7DA" /><stop offset=".55" stopColor="#34D399" /><stop offset="1" stopColor="#047857" /></radialGradient>
              <linearGradient id="bcpgold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE39A" /><stop offset=".5" stopColor="#F5B83D" /><stop offset="1" stopColor="#C98512" /></linearGradient>
              <radialGradient id="bcppeach" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#FFE0C2" /><stop offset=".6" stopColor="#FDBA74" /><stop offset="1" stopColor="#EA7A2E" /></radialGradient>
            </defs>
            <g>
              <rect x="60" y="60" width="110" height="150" rx="8" fill="url(#bcpind)" />
              <rect x="60" y="60" width="10" height="150" rx="5" fill="#FFFFFF" opacity=".15" />
              <rect x="72" y="78" width="21" height="14" rx="3" fill="#FDE68A" />
              <rect x="101" y="78" width="21" height="14" rx="3" fill="#FDE68A" />
              <rect x="129" y="78" width="21" height="14" rx="3" fill="#FDE68A" />
              <rect x="72" y="104" width="21" height="14" rx="3" fill="#FDE68A" />
              <rect x="101" y="104" width="21" height="14" rx="3" fill="#FDE68A" />
              <rect x="129" y="104" width="21" height="14" rx="3" fill="#FDE68A" />
            </g>
            <g>
              <rect x="180" y="100" width="90" height="110" rx="8" fill="url(#bcpind)" />
              <rect x="192" y="118" width="14" height="14" rx="3" fill="#FDE68A" />
              <rect x="214" y="118" width="14" height="14" rx="3" fill="#FDE68A" />
              <rect x="236" y="118" width="14" height="14" rx="3" fill="#FDE68A" />
            </g>
            <g>
              <rect x="280" y="40" width="130" height="170" rx="8" fill="url(#bcpind)" />
              <rect x="292" y="58" width="27" height="14" rx="3" fill="#FDE68A" />
              <rect x="327" y="58" width="27" height="14" rx="3" fill="#FDE68A" />
              <rect x="362" y="58" width="27" height="14" rx="3" fill="#FDE68A" />
            </g>
            <rect x="40" y="208" width="400" height="10" rx="5" fill="#C7D2FE" />
            <path d="M470 190 C540 120 600 210 680 140 S780 80 800 70" fill="none" stroke="#C7D2FE" strokeWidth="6" strokeLinecap="round" />
            <g>
              <path d="M470 164c-14-16-22-26-22-36a22 22 0 0 1 44 0c0 10-8 20-22 36z" fill="url(#bcpmint)" />
              <circle cx="470" cy="128" r="8" fill="#FFFFFF" />
            </g>
            <g>
              <path d="M680 114c-14-16-22-26-22-36a22 22 0 0 1 44 0c0 10-8 20-22 36z" fill="url(#bcppeach)" />
              <circle cx="680" cy="78" r="8" fill="#FFFFFF" />
            </g>
            <g>
              <path d="M790 64c-14-16-22-26-22-36a22 22 0 0 1 44 0c0 10-8 20-22 36z" fill="url(#bcpind)" />
              <circle cx="790" cy="28" r="8" fill="#FFFFFF" />
            </g>
          </svg>
        </div>
      </section>

      {/* Hero Section */}
      <section style={{ padding: '62px clamp(16px, 4vw, 64px) 0', display: 'flex', gap: '60px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 540px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.4px' }}>FOR CAMPUS ADMINISTRATORS</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(36px, 4.2vw, 56px)', lineHeight: 1.08, fontWeight: 800, color: '#131B2E', letterSpacing: '-2px' }}>
            Know your cohort is healthy without knowing who is ill.
          </h1>
          <p style={{ margin: 0, maxWidth: '580px', fontSize: '17px', lineHeight: 1.62, fontWeight: 500, color: '#464555' }}>
            You get attendance, coverage and camp outcomes. Students hold their own records. Your administrators confirm who is enrolled and nothing more — not because a screen hides the rest, but because no endpoint returns them to a campus role.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <a href="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px', padding: '0 30px', borderRadius: '999px', background: '#4F46E5', fontSize: '15px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
              See the admin console
            </a>
            <a href="/campuses#camps" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px', padding: '0 26px', borderRadius: '999px', background: '#FFFFFF', border: '1px solid #DAE2FD', fontSize: '15px', fontWeight: 700, color: '#131B2E', textDecoration: 'none' }}>
              Run a health camp
            </a>
          </div>
        </div>
        <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '22px', paddingTop: '10px' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '18px', borderBottom: '1px solid #EEF2FF' }}>
              <span style={{ fontSize: '34px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.1px' }}>{s.value}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#464555' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Honest Boundary Box */}
      <section style={{ margin: '76px clamp(16px, 4vw, 64px) 0', padding: '52px clamp(20px, 4vw, 58px)', borderRadius: '30px', background: 'linear-gradient(145deg, #312E81 0%, #1E1B4B 58%, #17144C 100%)', display: 'flex', gap: '56px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#82F5C1', letterSpacing: '1.4px' }}>THE BOUNDARY, IN WRITING</span>
          <h2 style={{ margin: 0, fontSize: '34px', lineHeight: 1.14, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1.1px' }}>What your dashboard can and cannot show.</h2>
          <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.65, fontWeight: 500, color: '#A9A5E0' }}>
            Students hold their own records. We are not going to quote you a number that no code enforces. Until then a campus gets enrolment confirmation and camp administration, and that is all.
          </p>
        </div>
        <div style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {boundary.map((b) => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '999px', flexShrink: 0, background: b.on ? '#82F5C1' : '#F87171' }} />
              <span style={{ flexGrow: 1, fontSize: '13.5px', fontWeight: 600, color: '#EEF0FF' }}>{b.label}</span>
              <span style={{ padding: '4px 11px', borderRadius: '999px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', background: b.on ? 'rgba(130,245,193,0.16)' : 'rgba(248,113,113,0.16)', color: b.on ? '#82F5C1' : '#FCA5A5' }}>
                {b.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Honest Gap Disclosure Notice */}
      <div style={{ margin: '0 clamp(16px, 4vw, 64px)', padding: '24px 30px', borderRadius: '20px', background: '#FFFFFF', border: '1px solid #FFE4E6', display: 'flex', gap: '16px', alignItems: 'flex-start' }} role="note">
        <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#E11D48' }}>
          <AlertTriangle size={18} aria-hidden="true" />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#131B2E' }}>Cohort reporting does not exist yet.</span>
          <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6, color: '#464555' }}>
            Our designs describe attendance, coverage and camp-outcome reports with small cohorts. None of it is built. When it is, the suppression threshold will be published here and testable — we are not going to quote you a number that no code enforces. Until then a campus gets enrolment confirmation and camp administration, and that is all.
          </p>
        </div>
      </div>

      {/* Four Jobs */}
      <section style={{ padding: '80px clamp(16px, 4vw, 64px) 0', display: 'flex', flexDirection: 'column', gap: '30px' }} id="camps">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.4px' }}>WHAT YOU ACTUALLY RUN</span>
          <h2 style={{ margin: 0, fontSize: '38px', fontWeight: 800, color: '#131B2E', letterSpacing: '-1.3px' }}>Four jobs, off your desk.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {jobs.map((j) => (
            <div key={j.title} style={{ minHeight: '230px', padding: '26px', borderRadius: '22px', background: '#FFFFFF', border: '1px solid #EEF2FF', display: 'flex', flexDirection: 'column', gap: '11px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.2px' }}>{j.eyebrow}</span>
              <span style={{ fontSize: '19px', lineHeight: 1.24, fontWeight: 800, color: '#131B2E', letterSpacing: '-0.5px' }}>{j.title}</span>
              <span style={{ fontSize: '13.5px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>{j.body}</span>
              <span style={{ flexGrow: 1 }} />
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#047857' }}>{j.foot}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Liability Comparison */}
      <section style={{ padding: '80px clamp(16px, 4vw, 64px) 0', display: 'flex', gap: '56px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#4F46E5', letterSpacing: '1.4px' }}>WHY IT MATTERS TO YOU</span>
          <h2 style={{ margin: 0, fontSize: '36px', lineHeight: 1.12, fontWeight: 800, color: '#131B2E', letterSpacing: '-1.2px' }}>The liability sits with whoever holds the data.</h2>
          <p style={{ margin: '8px 0 0', fontSize: '14.5px', lineHeight: 1.65, fontWeight: 500, color: '#464555' }}>
            Under the DPDP Act, a campus that stores student medical records is a data fiduciary with everything that follows. Here, the student is the record holder and we are the processor. You get the operational picture without the duty.
          </p>
        </div>
        <div style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column' }}>
          {compare.map((c) => (
            <div key={c.before} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '26px', padding: '18px 0', borderBottom: '1px solid #EEF2FF' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#6B6980', letterSpacing: '1px' }}>{c.label}</span>
                <span style={{ fontSize: '14px', lineHeight: 1.5, fontWeight: 600, color: '#9F1239' }}>{c.before}</span>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#047857', letterSpacing: '1px' }}>WITH STUDENT KARE</span>
                <span style={{ fontSize: '14px', lineHeight: 1.5, fontWeight: 600, color: '#131B2E' }}>{c.after}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Start with one camp */}
      <section style={{ margin: '80px clamp(16px, 4vw, 64px) 0', padding: '52px clamp(20px, 4vw, 58px)', borderRadius: '30px', background: '#EEF2FF', display: 'flex', alignItems: 'center', gap: '48px', flexWrap: 'wrap' }} id="walkthrough">
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '13px', minWidth: '280px' }}>
          <h2 style={{ margin: 0, fontSize: '34px', lineHeight: 1.12, fontWeight: 800, color: '#131B2E', letterSpacing: '-1.2px' }}>Start with one camp.</h2>
          <p style={{ margin: 0, maxWidth: '580px', fontSize: '15.5px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
            Run your next health check through the platform and compare the attendance report against what you get today. No integration needed for the first one.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', alignItems: 'flex-start' }}>
          <a href="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px', padding: '0 34px', borderRadius: '999px', background: '#4F46E5', fontSize: '15.5px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
            Book a walkthrough
          </a>
          <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#6B6980' }}>30 minutes · with your registrar if you like</span>
        </div>
      </section>

      {/* Trust Pillars */}
      <section aria-label="Why campuses trust Student Kare" style={{ display: 'flex', gap: '20px', margin: '64px clamp(16px, 4vw, 64px) 0', padding: '40px 24px', borderRadius: '28px', background: '#FFFFFF', border: '1px solid #EEF2FF', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
          <span style={{ fontSize: '17px', fontWeight: 800, color: '#131B2E' }}>Private by default</span>
          <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>Records open only to the student and the clinician they choose. Your campus sees aggregate counts, never individual findings.</span>
        </div>
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
          <span style={{ fontSize: '17px', fontWeight: 800, color: '#131B2E' }}>Independent clinicians</span>
          <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>Doctors and partner diagnostic labs operate on strict professional standards with explicit patient consent.</span>
        </div>
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
          <span style={{ fontSize: '17px', fontWeight: 800, color: '#131B2E' }}>Near your hostel</span>
          <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>Sample collection at block lobbies, teleconsultations between lectures, and campus health camps.</span>
        </div>
        <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
          <span style={{ fontSize: '17px', fontWeight: 800, color: '#131B2E' }}>Upfront pricing</span>
          <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>Every cost is transparently displayed before confirmation. Student membership alters rates, never care quality.</span>
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
            <a href="/clinicians" style={{ fontSize: '14px', fontWeight: 500, color: '#E0E7FF', textDecoration: 'none' }}>For clinicians</a>
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
