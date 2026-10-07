import React, { useState } from 'react';
import './landing.css';
import { ComprehensiveHealthCalculators } from '../../../components/clinical/ComprehensiveHealthCalculators';

interface Session {
  day: number;
  time: string;
  len: string;
  name: string;
  cat: 'gym' | 'strength' | 'yoga' | 'mind' | 'cardio' | 'mobility';
  coach: string;
  cert: string;
  where: string;
  spots: number;
  price: number;
}

export function LandingWellnessView(): React.ReactElement {
  const [day, setDay] = useState(0);
  const [cat, setCat] = useState<string | null>(null);
  const [booked, setBooked] = useState<Record<string, boolean>>({});

  const [nlTab, setNlTab] = useState<'wa' | 'em'>('wa');
  const [nlInput, setNlInput] = useState('');
  const [nlSubscribed, setNlSubscribed] = useState(false);

  const CAT: Record<string, { label: string; bg: string; ink: string }> = {
    gym: { label: 'Gym floor', bg: '#EEF2FF', ink: '#3525CD' },
    strength: { label: 'Strength', bg: '#FFF7ED', ink: '#C2410C' },
    yoga: { label: 'Yoga', bg: '#ECFDF5', ink: '#047857' },
    mind: { label: 'Meditation & breath', bg: '#FDF2F8', ink: '#BE185D' },
    cardio: { label: 'Run & cardio', bg: '#EFF6FF', ink: '#1D4ED8' },
    mobility: { label: 'Mobility & recovery', bg: '#FEFCE8', ink: '#A16207' }
  };

  const days = [
    { dow: 'MON', num: '29', name: 'Monday' },
    { dow: 'TUE', num: '30', name: 'Tuesday' },
    { dow: 'WED', num: '1', name: 'Wednesday' },
    { dow: 'THU', num: '2', name: 'Thursday' },
    { dow: 'FRI', num: '3', name: 'Friday' },
    { dow: 'SAT', num: '4', name: 'Saturday' },
    { dow: 'SUN', num: '5', name: 'Sunday' }
  ];

  const sessions: Session[] = [
    { day: 0, time: '6:30', len: '45 min', name: 'Sunrise run club', cat: 'cardio', coach: 'Arjun M.', cert: 'Run coach', where: 'Main ground', spots: 18, price: 49 },
    { day: 0, time: '7:00', len: '60 min', name: 'Hatha yoga, all levels', cat: 'yoga', coach: 'Meera K.', cert: 'YCB-certified', where: 'Open-air deck', spots: 6, price: 79 },
    { day: 0, time: '17:30', len: '50 min', name: 'Strength basics · week 1', cat: 'strength', coach: 'Rahul D.', cert: 'Certified S&C coach', where: 'Block C gym', spots: 3, price: 99 },
    { day: 0, time: '18:00', len: '—', name: 'Open gym, coach on floor', cat: 'gym', coach: 'Farhan S.', cert: 'Certified trainer', where: 'Block C gym', spots: 22, price: 79 },
    { day: 0, time: '20:30', len: '20 min', name: 'Guided breath before sleep', cat: 'mind', coach: 'Ananya P.', cert: 'Mindfulness teacher', where: 'Library quiet room', spots: 12, price: 0 },
    { day: 1, time: '7:00', len: '45 min', name: 'Vinyasa flow', cat: 'yoga', coach: 'Meera K.', cert: 'YCB-certified', where: 'Open-air deck', spots: 0, price: 79 },
    { day: 1, time: '13:10', len: '25 min', name: 'Desk-posture reset', cat: 'mobility', coach: 'Dr. Kavya R.', cert: 'Physiotherapist', where: 'Sports medicine room', spots: 8, price: 99 },
    { day: 1, time: '18:00', len: '40 min', name: 'HIIT, low-impact options', cat: 'cardio', coach: 'Arjun M.', cert: 'Run coach', where: 'Indoor court', spots: 10, price: 49 },
    { day: 1, time: '21:00', len: '30 min', name: 'Yoga nidra', cat: 'mind', coach: 'Ananya P.', cert: 'Mindfulness teacher', where: 'Library quiet room', spots: 9, price: 0 },
    { day: 2, time: '6:30', len: '45 min', name: 'Sunrise run club', cat: 'cardio', coach: 'Arjun M.', cert: 'Run coach', where: 'Main ground', spots: 20, price: 49 },
    { day: 2, time: '17:30', len: '50 min', name: 'Strength basics · week 1', cat: 'strength', coach: 'Rahul D.', cert: 'Certified S&C coach', where: 'Block C gym', spots: 5, price: 99 },
    { day: 2, time: '18:30', len: '45 min', name: 'Foam roll & stretch', cat: 'mobility', coach: 'Dr. Kavya R.', cert: 'Physiotherapist', where: 'Sports medicine room', spots: 7, price: 99 },
    { day: 2, time: '20:30', len: '20 min', name: 'Guided breath before sleep', cat: 'mind', coach: 'Ananya P.', cert: 'Mindfulness teacher', where: 'Library quiet room', spots: 14, price: 0 },
    { day: 3, time: '7:00', len: '60 min', name: 'Hatha yoga, all levels', cat: 'yoga', coach: 'Meera K.', cert: 'YCB-certified', where: 'Open-air deck', spots: 4, price: 79 },
    { day: 3, time: '18:00', len: '—', name: 'Open gym, coach on floor', cat: 'gym', coach: 'Farhan S.', cert: 'Certified trainer', where: 'Block C gym', spots: 19, price: 79 },
    { day: 4, time: '17:30', len: '50 min', name: 'Strength basics · week 1', cat: 'strength', coach: 'Rahul D.', cert: 'Certified S&C coach', where: 'Block C gym', spots: 2, price: 99 },
    { day: 4, time: '19:00', len: '45 min', name: 'Yoga for exam season', cat: 'yoga', coach: 'Meera K.', cert: 'YCB-certified', where: 'Seminar hall 2', spots: 15, price: 79 },
    { day: 5, time: '7:30', len: '60 min', name: 'Walk to 5K · long walk-run', cat: 'cardio', coach: 'Arjun M.', cert: 'Run coach', where: 'Campus loop', spots: 25, price: 49 },
    { day: 5, time: '10:00', len: '—', name: 'Open gym, coach on floor', cat: 'gym', coach: 'Farhan S.', cert: 'Certified trainer', where: 'Block C gym', spots: 24, price: 79 },
    { day: 6, time: '8:00', len: '30 min', name: 'Sunday sit', cat: 'mind', coach: 'Ananya P.', cert: 'Mindfulness teacher', where: 'Open-air deck', spots: 30, price: 0 },
    { day: 6, time: '9:00', len: '60 min', name: 'Gentle yoga & mobility', cat: 'yoga', coach: 'Meera K.', cert: 'YCB-certified', where: 'Open-air deck', spots: 12, price: 79 }
  ];

  const filteredSessions = sessions.filter(
    (s) => s.day === day && (!cat || s.cat === cat)
  );

  const nav = [
    { label: 'Discover', href: '/landing', on: false },
    { label: 'Wellness', href: '/shop', on: false },
    { label: 'Training', href: '/wellness', on: true },
    { label: 'Lab tests', href: '/lab-tests', on: false },
    { label: 'Find a doctor', href: '/consult', on: false },
    { label: 'Programmes', href: '/programs', on: false },
    { label: 'Plans', href: '/plans', on: false }
  ];

  const categoriesList = [
    { id: 'gym', label: 'Gym floor', desc: 'Guided induction, then open gym with a coach on the floor.', price: 'From ₹79', loc: 'Block C gym' },
    { id: 'strength', label: 'Strength basics', desc: 'Small groups, form first. Squat, hinge, push, pull, carry.', price: 'From ₹99', loc: 'Block C gym' },
    { id: 'yoga', label: 'Yoga', desc: 'Hatha and vinyasa, all levels. Mats provided.', price: 'From ₹79', loc: 'Open-air deck' },
    { id: 'mind', label: 'Meditation & breath', desc: 'Guided sits, breathwork, yoga nidra before exams.', price: 'Free', loc: 'Quiet room, library' },
    { id: 'cardio', label: 'Run & cardio', desc: 'Run club, HIIT and skipping. Walk-run options always.', price: 'From ₹49', loc: 'Main ground' },
    { id: 'mobility', label: 'Mobility & recovery', desc: 'Stretch, foam roll, desk-posture fixes. Physio-led.', price: 'From ₹99', loc: 'Sports medicine room' }
  ];

  const tracks = [
    { name: 'Strength basics', weeks: '4 weeks', body: 'Two sessions a week. Learn the five movements with a coach watching your form.', bg: '#EEF2FF', ink: '#3525CD' },
    { name: 'Yoga for exam season', weeks: '3 weeks', body: 'Short morning flows and evening wind-downs timed around the exam calendar.', bg: '#ECFDF5', ink: '#047857' },
    { name: 'Sleep & breath', weeks: '2 weeks', body: 'Ten-minute guided sessions at night. Builds a routine, not a score.', bg: '#FDF2F8', ink: '#BE185D' },
    { name: 'Walk to 5K', weeks: '6 weeks', body: 'Walk-run intervals with the run club. Every pace welcome, nobody is timed.', bg: '#FFF7ED', ink: '#C2410C' }
  ];

  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, background: '#FAF8FF', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
      
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

      {/* 2. Hero Video Section */}
      <section
        style={{
          margin: '22px clamp(16px, 3.5vw, 44px) 0',
          minHeight: '440px',
          borderRadius: '30px',
          background: '#FFFFFF',
          border: '1px solid #EEF2FF',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          position: 'relative',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ flex: '1 1 500px', maxWidth: '580px', padding: 'clamp(24px, 4vw, 56px)', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 1 }}>
          <span style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', height: '30px', padding: '0 12px', borderRadius: '999px', background: '#ECFDF5', fontSize: '12px', fontWeight: 800, color: '#047857' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '999px', background: '#10B981' }} />
            12 sessions on campus today
          </span>
          <h1 style={{ margin: 0, fontSize: 'clamp(32px, 4vw, 46px)', lineHeight: 1.08, fontWeight: 800, color: '#131B2E', letterSpacing: '-1.6px' }}>
            Move, stretch and breathe — between classes.
          </h1>
          <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.6, fontWeight: 500, color: '#464555' }}>
            Gym, strength, yoga and meditation run by certified coaches on your campus. Book a spot, turn up, go back to class. No leaderboards, no body scores.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '4px' }}>
            <a href="#timetable" style={{ display: 'flex', alignItems: 'center', height: '52px', padding: '0 26px', borderRadius: '999px', background: '#3525CD', fontSize: '15px', fontWeight: 800, color: '#FFFFFF', textDecoration: 'none' }}>
              See this week
            </a>
            <a href="/plans" style={{ display: 'flex', alignItems: 'center', height: '52px', padding: '0 24px', borderRadius: '999px', border: '1.5px solid #DAE2FD', fontSize: '15px', fontWeight: 800, color: '#3525CD', textDecoration: 'none' }}>
              Premium: ₹20 off every session
            </a>
          </div>
        </div>

        <div style={{ flex: '1 1 360px', height: '440px', position: 'relative', overflow: 'hidden' }}>
          <video
            src="/assets/fabac8217d14af9d87dd5d5244554ee7.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </section>

      {/* 3. Pick a Training Filter Cards */}
      <section aria-label="Pick what you want to do" style={{ padding: '56px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#3525CD' }}>PICK A TRAINING</span>
            <span style={{ fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.8px' }}>Six ways to move this week</span>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B6980' }}>Tap one to filter the timetable</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {categoriesList.map((c) => {
            const on = cat === c.id;
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setCat(on ? null : c.id)}
                aria-pressed={on}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '20px',
                  minHeight: '220px',
                  boxSizing: 'border-box',
                  borderRadius: '22px',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: '#FFFFFF',
                  border: on ? '2px solid #3525CD' : '2px solid #EEF2FF',
                  boxShadow: on ? '0 14px 30px rgba(53,37,205,0.16)' : 'none'
                }}
              >
                <span style={{ fontSize: '17px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>{c.label}</span>
                <span style={{ fontSize: '13px', lineHeight: 1.5, fontWeight: 500, color: '#464555' }}>{c.desc}</span>
                <span style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingTop: '10px', borderTop: '1px solid #F3F4FE' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: '#3525CD' }}>{c.price}</span>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#6B6980' }}>{c.loc}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Timetable */}
      <section
        id="timetable"
        aria-label="Timetable"
        style={{
          margin: '48px clamp(16px, 3.5vw, 44px) 0',
          padding: 'clamp(20px, 3vw, 30px)',
          borderRadius: '26px',
          background: '#FFFFFF',
          border: '1px solid #EEF2FF',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '22px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.5px' }}>This week on campus</span>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#464555' }}>
              {days[day].name} {cat ? `· ${CAT[cat]?.label}` : '· every training'} · {filteredSessions.length} sessions
            </span>
          </div>
          <div role="tablist" aria-label="Day" style={{ display: 'flex', gap: '6px', padding: '5px', borderRadius: '16px', background: '#F2F3FF', flexWrap: 'wrap' }}>
            {days.map((d, i) => {
              const on = i === day;
              return (
                <button
                  type="button"
                  key={d.dow}
                  role="tab"
                  aria-selected={on}
                  aria-label={d.name}
                  onClick={() => setDay(i)}
                  style={{
                    width: '58px',
                    height: '54px',
                    minHeight: '44px',
                    borderRadius: '12px',
                    border: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1px',
                    background: on ? '#3525CD' : 'transparent',
                    color: on ? '#FFFFFF' : '#464555'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 700 }}>{d.dow}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 600 }}>{d.num}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sessions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredSessions.map((r) => {
            const key = `${day}-${r.time}-${r.name}`;
            const isBooked = !!booked[key];
            const isFull = r.spots === 0;
            const k = CAT[r.cat];
            return (
              <div
                key={key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '16px',
                  alignItems: 'center',
                  padding: '14px 18px',
                  borderRadius: '16px',
                  background: isBooked ? '#F2F3FF' : '#FAFAFE',
                  border: '1px solid #EEF2FF'
                }}
              >
                <div>
                  <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 600, color: '#131B2E' }}>{r.time}</span>
                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#6B6980', marginLeft: '6px' }}>({r.len})</span>
                </div>
                <div>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#131B2E' }}>{r.name}</span>
                  <span style={{ display: 'inline-block', marginLeft: '8px', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, background: k?.bg, color: k?.ink }}>
                    {k?.label}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#131B2E' }}>{r.coach}</span>
                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#6B6980', marginLeft: '6px' }}>({r.cert})</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#464555' }}>{r.where}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: isFull ? '#B91C1C' : '#047857' }}>
                  {isFull ? 'Full · waitlist' : `${r.spots} spots left`}
                </span>
                <button
                  type="button"
                  aria-label={`${isBooked ? 'Cancel booking for' : 'Book'} ${r.name} with ${r.coach}`}
                  onClick={() => setBooked((prev) => ({ ...prev, [key]: !prev[key] }))}
                  style={{
                    height: '44px',
                    minHeight: '44px',
                    borderRadius: '12px',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    border: isBooked ? '1.5px solid #3525CD' : '0',
                    background: isBooked ? '#FFFFFF' : '#3525CD',
                    color: isBooked ? '#3525CD' : '#FFFFFF'
                  }}
                >
                  {isBooked ? 'Booked ✓' : isFull ? 'Join waitlist' : r.price === 0 ? 'Book · Free' : `Book · ₹${r.price}`}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#6B6980' }}>
            Drop-in price shown. Premium takes ₹20 off. Cancel up to 2 hours before, free.
          </span>
          {cat ? (
            <button
              type="button"
              aria-label="Show all trainings"
              onClick={() => setCat(null)}
              style={{ height: '44px', minHeight: '44px', padding: '0 18px', borderRadius: '999px', border: '1px solid #DAE2FD', background: '#FFFFFF', fontSize: '13px', fontWeight: 800, color: '#3525CD', cursor: 'pointer' }}
            >
              Show all trainings
            </button>
          ) : null}
        </div>
      </section>

      {/* 5. Guided Tracks */}
      <section aria-label="Guided tracks" style={{ padding: '56px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#3525CD' }}>GUIDED TRACKS</span>
          <span style={{ fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.8px' }}>Short programmes with a start and an end</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
          {tracks.map((t) => (
            <a
              key={t.name}
              href="#timetable"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '24px',
                borderRadius: '22px',
                background: t.bg,
                textDecoration: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ height: '28px', padding: '0 12px', borderRadius: '999px', background: '#FFFFFF', display: 'flex', alignItems: 'center', fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: t.ink }}>
                  {t.weeks}
                </span>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>{t.name}</span>
              <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>{t.body}</span>
              <span style={{ marginTop: 'auto', fontSize: '13.5px', fontWeight: 800, color: t.ink }}>Start this track →</span>
            </a>
          ))}
        </div>
      </section>

      {/* 6. Mind Attention Video Banner */}
      <section
        aria-label="Train your attention"
        style={{
          position: 'relative',
          margin: '56px clamp(16px, 3.5vw, 44px) 0',
          minHeight: '380px',
          borderRadius: '30px',
          background: '#06051A',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}
      >
        <video
          src="/assets/2c18e6c6648794dd62440d6720ffc956.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          style={{ position: 'absolute', top: 0, right: 0, width: '70%', height: '100%', objectFit: 'cover' }}
        />
        <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #06051A 0%, #06051A 34%, rgba(6,5,26,0.5) 56%, rgba(6,5,26,0) 80%)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '540px', padding: 'clamp(24px, 4vw, 56px)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: 1.4, color: '#A5B4FC' }}>MIND</span>
          <span style={{ fontSize: 'clamp(26px, 3vw, 34px)', lineHeight: 1.15, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1px' }}>
            Train your attention the way you train a muscle.
          </span>
          <span style={{ fontSize: '14.5px', lineHeight: 1.6, fontWeight: 500, color: '#C7D2FE' }}>
            Guided meditation, breathwork and yoga nidra every evening in the library quiet room, and free to play on the app when the room is full.
          </span>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '6px' }}>
            <a href="#timetable" style={{ display: 'flex', alignItems: 'center', height: '48px', padding: '0 22px', borderRadius: '999px', background: '#FFFFFF', fontSize: '14px', fontWeight: 800, color: '#1E1B4B', textDecoration: 'none' }}>
              Tonight’s sessions
            </a>
            <a href="/crisis" style={{ display: 'flex', alignItems: 'center', height: '48px', padding: '0 20px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.35)', fontSize: '14px', fontWeight: 700, color: '#FFFFFF', textDecoration: 'none' }}>
              Need to talk to someone now?
            </a>
          </div>
        </div>
      </section>

      {/* 6.5 Comprehensive Clinical Calculators */}
      <section aria-label="Campus Clinical & Health Metrics Calculators" style={{ padding: '56px clamp(16px, 3.5vw, 44px) 0' }}>
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          <ComprehensiveHealthCalculators />
        </div>
      </section>

      {/* 7. How We Keep It Safe */}
      <section aria-label="How we keep it safe" style={{ padding: '56px clamp(16px, 3.5vw, 44px) 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: '#3525CD' }}>HOW WE KEEP IT SAFE</span>
          <span style={{ fontSize: 'clamp(24px, 3vw, 30px)', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.8px' }}>Training that is good for you, not just hard</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '22px', borderRadius: '20px', background: '#FFFFFF', border: '1px solid #EEF2FF' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#131B2E' }}>Readiness check first</span>
            <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>A short health questionnaire before your first session. Anything flagged goes to a campus clinician, not the coach.</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '22px', borderRadius: '20px', background: '#FFFFFF', border: '1px solid #EEF2FF' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#131B2E' }}>No weight, no calories</span>
            <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>We don’t track body weight, calories or body shape here. Progress means turning up and feeling better.</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '22px', borderRadius: '20px', background: '#FFFFFF', border: '1px solid #EEF2FF' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#131B2E' }}>No leaderboards</span>
            <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>Attendance is private to you. Nobody sees who came, who didn’t, or how much you lifted.</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '22px', borderRadius: '20px', background: '#FFFFFF', border: '1px solid #EEF2FF' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#131B2E' }}>Hurt? Straight to physio</span>
            <span style={{ fontSize: '13px', lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>Pain during a session ends the session. The sports medicine room sees you the same day.</span>
          </div>
        </div>
      </section>

      {/* 8. Trust Pillars */}
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
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#131B2E', letterSpacing: '-0.3px' }}>Verified clinicians</span>
          <span style={{ fontSize: '13.5px', lineHeight: 1.55, fontWeight: 500, color: '#464555', maxWidth: '260px' }}>
            Every doctor is NMC-registered and every lab NABL-accredited before they can list.
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

      {/* 9. Newsletter Footer */}
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
              <button type="button" role="radio" aria-checked={nlTab === 'wa'} onClick={() => setNlTab('wa')} style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '36px', padding: '0 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', border: 'none', background: nlTab === 'wa' ? '#FFFFFF' : 'transparent', color: nlTab === 'wa' ? '#3525CD' : '#E0E7FF' }}>WhatsApp</button>
              <button type="button" role="radio" aria-checked={nlTab === 'em'} onClick={() => setNlTab('em')} style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '36px', padding: '0 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', border: 'none', background: nlTab === 'em' ? '#FFFFFF' : 'transparent', color: nlTab === 'em' ? '#3525CD' : '#E0E7FF' }}>Email</button>
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
