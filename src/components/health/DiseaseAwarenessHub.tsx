import React, { useState } from 'react';
import { AlertCircle, BookOpen, Bug, ChevronRight, HeartPulse, ShieldAlert, Sparkles, Sun, Eye, X, ArrowRight, ExternalLink } from 'lucide-react';
import '../../theme/workflows.css';

export interface DiseaseArticle {
  id: string;
  title: string;
  category: 'awareness' | 'prevention' | 'mental-health' | 'wellness';
  tag: string;
  readTime: string;
  summary: string;
  icon: 'bug' | 'sun' | 'brain' | 'eye';
  color: string;
  bgColor: string;
  body: string[];
  keyPreventionTips: string[];
  actionLabel?: string;
}

export const DISEASE_AWARENESS_ARTICLES: DiseaseArticle[] = [
  {
    id: 'dengue-prevention',
    title: 'Monsoon Dengue & Malaria Campus Advisory: Prevention & Early Symptoms',
    category: 'awareness',
    tag: 'CAMPUS ADVISORY',
    readTime: '4 min read',
    summary: 'Essential guidelines on preventing mosquito breeding, identifying high fever & platelet drop early, and hydration tips.',
    icon: 'bug',
    color: '#e11d48',
    bgColor: '#fff1f2',
    body: [
      'Monsoon season brings a heightened risk of Dengue, Chikungunya, and Malaria across university campuses and hostel premises.',
      'Dengue is transmitted by the Aedes mosquito, which bites primarily during early morning and late afternoon hours. Stagnant water in flower pots, cooler trays, and hostel drainage lines are prime breeding grounds.',
      'Common symptoms include sudden high fever (104°F), severe headaches, eye pain, joint/muscle pain, fatigue, and skin rashes. Platelet counts must be monitored closely via a Complete Blood Count (CBC) test.'
    ],
    keyPreventionTips: [
      'Eliminate standing water in hostel room coolers and plant saucers every 3 days.',
      'Use mosquito repellents and wear full-sleeve clothing during morning study hours.',
      'Seek immediate medical care at the Campus Health Centre if high fever persists over 24 hours.'
    ],
    actionLabel: 'Book NABL CBC & Platelet Lab Test'
  },
  {
    id: 'exam-stress-mental-health',
    title: 'Managing Exam Stress, Sleep Hygiene & Tele-MANAS Counseling',
    category: 'mental-health',
    tag: 'STUDENT WELLBEING',
    readTime: '3 min read',
    summary: 'Combat exam anxiety, prevent burnout, establish restorative sleep schedules, and access 24x7 confidential counseling.',
    icon: 'brain',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    body: [
      'Exam stress and continuous night study sessions can trigger sleep deprivation, cognitive fatigue, and acute anxiety among students.',
      'Maintaining a consistent sleep window (7-8 hours) is vital for memory consolidation and emotional regulation. Avoid caffeine and screen lights 1 hour before bedtime.',
      'If you experience panic attacks, persistent sadness, or severe anxiety, confidential mental health support is available 24x7 through Tele-MANAS (1056).'
    ],
    keyPreventionTips: [
      'Practice 4-7-8 deep breathing exercises during 10-minute study breaks.',
      'Maintain adequate hydration and balanced meals instead of relying on energy drinks.',
      'Talk to a campus clinician or call Tele-MANAS 1056 for confidential guidance.'
    ],
    actionLabel: 'Connect with Tele-Mental Specialist'
  },
  {
    id: 'vitamin-d-anemia',
    title: 'Understanding Vitamin D Deficiency & Anemia in University Students',
    category: 'prevention',
    tag: 'NUTRITION & VITAMINS',
    readTime: '5 min read',
    summary: 'Why indoor campus life leads to Vitamin D3 & Iron deficiencies, causing chronic fatigue and poor concentration.',
    icon: 'sun',
    color: '#d97706',
    bgColor: '#fffbeb',
    body: [
      'Over 70% of university students in urban campuses suffer from sub-optimal Vitamin D3 and Serum Ferritin (Iron) levels due to prolonged indoor study hours.',
      'Symptoms include unexplained physical exhaustion, morning sluggishness, muscle aches, hair thinning, and difficulty focusing during lectures.',
      'Routine lab screening allows precise supplementation without unnecessary guesswork.'
    ],
    keyPreventionTips: [
      'Get 15-20 minutes of early morning sunlight exposure daily.',
      'Include iron-rich green leafy vegetables, legumes, and fortified milk in dining hall meals.',
      'Schedule an annual Vitamin D3 & B12 diagnostic panel.'
    ],
    actionLabel: 'Book Vitamin D3 & B12 Screening'
  },
  {
    id: 'eye-strain-ergonomics',
    title: 'Digital Eye Strain & Desk Ergonomics for Long Coding/Study Hours',
    category: 'wellness',
    tag: 'DIGITAL WELLNESS',
    readTime: '3 min read',
    summary: 'Protect your eyesight with the 20-20-20 rule, correct monitor positioning, and posture stretches.',
    icon: 'eye',
    color: '#0284c7',
    bgColor: '#f0f9ff',
    body: [
      'Long hours spent in front of laptops and smartphones lead to Computer Vision Syndrome (CVS), causing dry eyes, blurry vision, and tension headaches.',
      'Follow the 20-20-20 rule: Every 20 minutes, look at an object 20 feet away for at least 20 seconds to relax eye muscles.',
      'Adjust your laptop screen so the top of the monitor is at eye level, reducing neck strain and posture fatigue.'
    ],
    keyPreventionTips: [
      'Use lubricated artificial tear drops if experiencing dry or irritated eyes.',
      'Maintain an arm-length distance (20-26 inches) from your laptop display.',
      'Incorporate 5-minute neck rolls and shoulder shrugs every hour.'
    ],
    actionLabel: 'Explore Desk Movement Routines'
  }
];

export function DiseaseAwarenessHub() {
  const [selectedArticle, setSelectedArticle] = useState<DiseaseArticle | null>(null);

  return (
    <section className="shop-section shop-container" data-ui="disease-awareness-hub" style={{ marginBlock: 24 }}>
      <div className="shop-section-heading" style={{ marginBottom: 16 }}>
        <div>
          <span className="shop-eyebrow" style={{ color: '#e11d48', fontWeight: 700 }}>
            🩺 DISEASE AWARENESS & HEALTH PERSPECTIVES
          </span>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '1.4rem' }}>Campus Disease Prevention & Student Wellness</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            Verified health guides, monsoon advisories, and wellness perspectives from clinical experts.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {DISEASE_AWARENESS_ARTICLES.map(art => (
          <article
            key={art.id}
            onClick={() => setSelectedArticle(art)}
            style={{
              background: art.bgColor,
              border: `1px solid ${art.color}33`,
              borderRadius: 12,
              padding: 16,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span
                  style={{
                    background: art.color,
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 10,
                  }}
                >
                  {art.tag}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{art.readTime}</span>
              </div>

              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.35 }}>
                {art.title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.4 }}>
                {art.summary}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, color: art.color, fontWeight: 700, fontSize: '0.82rem' }}>
              <span>Read Full Guide & Recommendations</span>
              <ArrowRight size={14} />
            </div>
          </article>
        ))}
      </div>

      {/* Reader Modal */}
      {selectedArticle && (
        <div className="wf-modal-backdrop" onClick={() => setSelectedArticle(null)}>
          <div className="wf-modal-card" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <button className="wf-modal-close" onClick={() => setSelectedArticle(null)}>
              <X size={18} />
            </button>

            <div style={{ marginBottom: 16 }}>
              <span
                style={{
                  background: selectedArticle.color,
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 12,
                }}
              >
                {selectedArticle.tag}
              </span>
              <h2 style={{ margin: '8px 0 4px 0', fontSize: '1.35rem', color: '#0f172a' }}>{selectedArticle.title}</h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedArticle.readTime} • Verified Clinical Perspective</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {selectedArticle.body.map((p, idx) => (
                <p key={idx} style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: 1.55 }}>
                  {p}
                </p>
              ))}
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.92rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={16} color={selectedArticle.color} /> Key Prevention & Care Action Steps:
              </h4>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedArticle.keyPreventionTips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="health-button health-button-primary"
                onClick={() => setSelectedArticle(null)}
                style={{ flex: 1, padding: '10px 16px' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
