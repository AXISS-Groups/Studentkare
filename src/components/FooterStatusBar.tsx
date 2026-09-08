import React, { useState } from 'react';
import { useTheme } from '../theme/theme';
import { StudentKareLogo } from './StudentKareLogo';
import {
  Check,
  X,
} from 'lucide-react';

const LinkedinIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.75a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9Z" />
  </svg>
);

const TwitterIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

export const FooterStatusBar: React.FC = () => {
  const { tokens, typography } = useTheme();
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [analyticsCount] = useState<number>(0);
  const [optOutTelemetry, setOptOutTelemetry] = useState<boolean>(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput) {
      setSubscribed(true);
    }
  };

  return (
    <>
      {/* ─── GLOBAL MULTI-COLUMN RICH FOOTER (STUDENT KARE) ─────────────── */}
      <footer
        style={{
          width: '100%',
          backgroundColor: '#09081a',
          color: '#ffffff',
          padding: '56px 40px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          boxSizing: 'border-box',
          fontFamily: 'Manrope, sans-serif',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          
          {/* TOP SECTION: 5 PROPERLY ALIGNED COLUMNS */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 32,
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 48,
            }}
          >
            {/* Column 1: Brand & Social */}
            <div style={{ flex: '1.4 1 240px', minWidth: 220 }}>
              <div style={{ marginBottom: 14 }}>
                <StudentKareLogo size={30} showStrapline={false} />
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.5, maxWidth: 280, marginBottom: 20 }}>
                Verified student health & digital telemetry network across Indian campuses.
              </div>
              
              {/* Social Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { icon: <LinkedinIcon />, href: 'https://linkedin.com' },
                  { icon: <TwitterIcon />, href: 'https://x.com' },
                  { icon: <InstagramIcon />, href: 'https://instagram.com' },
                ].map((s, i) => (
                  <a
                    key={i}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      display: 'grid',
                      placeItems: 'center',
                      textDecoration: 'none',
                      transition: 'all 140ms ease',
                    }}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Column 2: Platform Services */}
            <div style={{ flex: '1 1 160px', minWidth: 150 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', letterSpacing: 1.2, fontFamily: typography.fontMono, marginBottom: 16 }}>
                PLATFORM SERVICES
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                <a href="#vault" style={{ color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none' }}>Health Vault & OCR</a>
                <a href="#camps" style={{ color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none' }}>5-Station Health Camps</a>
                <a href="#emergency" style={{ color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none' }}>108 Emergency Smart ID</a>
                <a href="#hostel" style={{ color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none' }}>Hostel & OPD Queue Suite</a>
                <a href="#arc" style={{ color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none' }}>ARC-AGI Reasoning Engine</a>
              </div>
            </div>

            {/* Column 3: Solutions */}
            <div style={{ flex: '1 1 160px', minWidth: 150 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', letterSpacing: 1.2, fontFamily: typography.fontMono, marginBottom: 16 }}>
                SOLUTIONS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                <a href="#campuses" style={{ color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none' }}>University Campuses</a>
                <a href="#emr" style={{ color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none' }}>Clinician EMR Fabric</a>
                <a href="#labs" style={{ color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none' }}>NABL Partner Labs</a>
                <a href="#claims" style={{ color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none' }}>Claims Intelligence</a>
              </div>
            </div>

            {/* Column 4: Resources */}
            <div style={{ flex: '1 1 160px', minWidth: 150 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', letterSpacing: 1.2, fontFamily: typography.fontMono, marginBottom: 16 }}>
                RESOURCES
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                <a href="#camps" style={{ color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none' }}>Kare Health Events</a>
                <a href="#verify" style={{ color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none' }}>Verify Health Certificate</a>
                <a href="#blog" style={{ color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none' }}>Telemetry Blog</a>
                <a href="#help" style={{ color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none' }}>Help Center & FAQs</a>
                <a href="#community" style={{ color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none' }}>Student Community</a>
              </div>
            </div>

            {/* Column 5: Governance & Compliance */}
            <div style={{ flex: '1.2 1 180px', minWidth: 170 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255, 255, 255, 0.4)', letterSpacing: 1.2, fontFamily: typography.fontMono, marginBottom: 16 }}>
                GOVERNANCE & COMPLIANCE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 12 }}>
                <div>
                  <div style={{ color: '#00ffaa', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} /> DPDP Act 2023
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.45)', marginLeft: 20 }}>India - data principal rights</div>
                </div>

                <div>
                  <div style={{ color: '#00ffaa', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} /> ABDM M1–M3
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.45)', marginLeft: 20 }}>NHA - certified HIU/HIP</div>
                </div>

                <div>
                  <div style={{ color: '#00ffaa', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} /> SOC 2 Type II
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.45)', marginLeft: 20 }}>Audited controls, annual</div>
                </div>

                <div style={{ color: tokens.action, fontWeight: 700, fontSize: 12, cursor: 'pointer', marginTop: 4 }}>
                  ◯ Responsible disclosure
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE BANNER: SUBSCRIBE CARD ("One email a month. Nothing else.") */}
          <div
            style={{
              backgroundColor: 'rgba(23, 22, 66, 0.65)',
              borderRadius: 20,
              border: '1px solid rgba(83, 80, 204, 0.3)',
              padding: '24px 32px',
              marginBottom: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 20,
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#ffffff', marginBottom: 4 }}>
                One email a month. Nothing else.
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.65)' }}>
                New health camp dates, lab offers and campus wellness drops — no noise.
              </div>
            </div>

            {subscribed ? (
              <div style={{ backgroundColor: 'rgba(0, 255, 170, 0.12)', border: '1px solid #00ffaa', borderRadius: 12, padding: '10px 20px', color: '#00ffaa', fontWeight: 800, fontSize: 13 }}>
                Subscribed! You will receive 1 email/month max. ✓
              </div>
            ) : (
              <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  type="email"
                  required
                  placeholder="you@college.edu"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{
                    backgroundColor: 'rgba(15, 14, 38, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 12,
                    padding: '10px 16px',
                    color: '#ffffff',
                    fontSize: 13,
                    outline: 'none',
                    width: 220,
                    fontFamily: typography.fontMono,
                  }}
                />
                <button
                  type="submit"
                  style={{
                    backgroundColor: tokens.action,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '10px 22px',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(83, 80, 204, 0.4)',
                  }}
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>

          {/* BOTTOM HASHTAG & COPYRIGHT BAR */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              paddingTop: 24,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#ffffff', letterSpacing: -0.8 }}>
                #studentkare
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.55)', marginTop: 2 }}>
                Built with care for students 💜 across all campuses
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.55)' }}>
                All rights reserved @ Student Kare 2026
              </span>

              {/* Analytics Badge Pill */}
              <button
                onClick={() => setModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  backgroundColor: 'rgba(0, 255, 170, 0.08)',
                  color: '#00ffaa',
                  border: '1px solid rgba(0, 255, 170, 0.35)',
                  borderRadius: 9999,
                  padding: '5px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: typography.fontMono,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: '#00ffaa',
                    boxShadow: '0 0 8px #00ffaa',
                  }}
                />
                <span>Analytics ({analyticsCount})</span>
              </button>
            </div>
          </div>

        </div>
      </footer>

      {/* ─── PRIVACY MODAL ─────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(9, 8, 26, 0.8)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 540,
              backgroundColor: tokens.surface,
              borderRadius: 24,
              border: `1px solid ${tokens.rule}`,
              padding: 28,
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ color: tokens.positive, fontSize: 11, fontWeight: 800, fontFamily: typography.fontMono, marginBottom: 4 }}>
                  DPDP ACT 2023 & ABDM PRIVACY GUARANTEE
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: tokens.text, letterSpacing: -0.5 }}>
                  Privacy & Governance Center
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  border: `1px solid ${tokens.rule}`,
                  backgroundColor: tokens.surface2,
                  color: tokens.text,
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div style={{ backgroundColor: tokens.canvas, borderRadius: 16, padding: 16, border: `1px solid ${tokens.ruleSoft}` }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: tokens.text, marginBottom: 4 }}>Zero Third-Party Data Monetization</div>
                <div style={{ fontSize: 12, color: tokens.text2, lineHeight: 1.5 }}>
                  Student Kare does not sell or share student medical records with ad networks or un-verified entities.
                </div>
              </div>

              <div style={{ backgroundColor: tokens.surface2, borderRadius: 16, padding: 16, border: `1px solid ${tokens.ruleSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: tokens.text }}>Anonymous Error Telemetry</div>
                  <div style={{ fontSize: 11, color: tokens.text2 }}>Helps campus IT diagnose offline SQLite sync issues.</div>
                </div>
                <button
                  onClick={() => setOptOutTelemetry(!optOutTelemetry)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 9999,
                    fontSize: 11,
                    fontWeight: 800,
                    border: 'none',
                    backgroundColor: optOutTelemetry ? tokens.surface3 : tokens.positiveBg,
                    color: optOutTelemetry ? tokens.text2 : tokens.positive,
                    cursor: 'pointer',
                  }}
                >
                  {optOutTelemetry ? 'Opted Out' : 'Enabled ✓'}
                </button>
              </div>
            </div>

            <button
              onClick={() => setModalOpen(false)}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: 12,
                backgroundColor: tokens.action,
                color: '#ffffff',
                fontWeight: 800,
                fontSize: 13.5,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Save & Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
