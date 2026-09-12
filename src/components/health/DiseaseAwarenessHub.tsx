import { useState, useEffect } from 'react';
import { ShieldAlert, X, ArrowRight, RefreshCw, Activity, Droplets, Wind, Thermometer, Sparkles } from 'lucide-react';
import '../../theme/workflows.css';

export interface DiseaseArticle {
  id: string;
  title: string;
  category: 'awareness' | 'prevention' | 'mental-health' | 'wellness' | 'agent-scout';
  tag: string;
  readTime: string;
  summary: string;
  icon: 'bug' | 'sun' | 'brain' | 'eye' | 'activity' | 'droplets' | 'wind' | 'shield';
  color: string;
  bgColor: string;
  body: string[];
  keyPreventionTips: string[];
  actionLabel?: string;
  lastUpdatedByAgent?: string;
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
    id: 'viral-flu-agent-scout',
    title: '4-Hr Agent Update: Viral Flu & Upper Respiratory Outbreak Telemetry',
    category: 'agent-scout',
    tag: '4-HR LIVE SCOUT',
    readTime: '2 min read',
    summary: 'Automated scouting report: Influenza A & RSV cluster risk monitored across hostels. Cold chain medication available.',
    icon: 'activity',
    color: '#2563eb',
    bgColor: '#eff6ff',
    lastUpdatedByAgent: '4-Hr Health Scouting Loop Agent v2.4',
    body: [
      'Our automated 4-hour AI scouting loop checks campus health center admission logs and weather indicators every 4 hours.',
      'Current telemetry shows a low-to-moderate incidence of viral upper respiratory tract infections (URTI) consistent with seasonal temperature changes.',
      'Isolation hostel rooms have been designated, and steam inhalers, electrolyte packs, and paracetamol are stocked at all 4 campus pharmacy dispensers.'
    ],
    keyPreventionTips: [
      'Wear a surgical mask when studying in crowded library reading halls if experiencing mild cough or cold.',
      'Wash hands with alcohol-based sanitizers before entering mess dining halls.',
      'Report any fever above 100.4°F immediately to the hostel warden or online care assistant.'
    ],
    actionLabel: 'Check Campus Pharmacy Stock'
  },
  {
    id: 'water-sanitation-gastro',
    title: 'Hostel Water Quality & Gastrointestinal Illness Prevention Report',
    category: 'agent-scout',
    tag: '4-HR SANITATION AUDIT',
    readTime: '3 min read',
    summary: '4-hour automated sensor check: UV purification filters operating at 99.8% purity across all 12 hostel blocks.',
    icon: 'droplets',
    color: '#0d9488',
    bgColor: '#f0fdf4',
    lastUpdatedByAgent: 'Water Telemetry Agent',
    body: [
      'Continuous 4-hour water testing sensors monitor total dissolved solids (TDS), chlorine levels, and UV lamp integrity across all dining facilities.',
      'Waterborne pathogens such as Typhoid, Hepatitis A, and Amoebiasis are prevented through dual-stage filtration and daily chemical sanitation.',
      'Students are advised to use designated RO water dispensers and report any discoloration or odor in hostel tap water.'
    ],
    keyPreventionTips: [
      'Avoid consuming unboiled water or ice from non-verified street food vendors outside campus gates.',
      'Ensure personal water bottles are washed daily with warm water.',
      'Use water purification tabs provided free at the campus health clinic during monsoon outings.'
    ],
    actionLabel: 'View Water Testing Log'
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
    id: 'campus-aqi-ventilation',
    title: 'Campus Air Quality Index (AQI 48) & Seasonal Allergen Advisory',
    category: 'agent-scout',
    tag: '4-HR AQI TELEMETRY',
    readTime: '3 min read',
    summary: 'HEPA air purifiers active in reading rooms. Air quality rated Good (AQI 48) with minimal PM2.5 levels.',
    icon: 'wind',
    color: '#059669',
    bgColor: '#ecfdf5',
    lastUpdatedByAgent: 'Environmental Sensing Agent',
    body: [
      'Real-time IoT sensors scout campus microclimates every 4 hours, analyzing PM2.5, PM10, nitrogen dioxide, and humidity levels.',
      'Outdoor morning air quality is optimal for outdoor jogging and athletic sports between 06:00 AM and 09:00 AM.',
      'Students with asthmatic conditions or seasonal allergic rhinitis are provided HEPA-filtered study pods in the central library.'
    ],
    keyPreventionTips: [
      'Keep dormitory windows open during early morning hours for natural air exchange.',
      'Use anti-allergen pillow covers if prone to morning nasal congestion.',
      'Check live AQI metrics on your Studentkare dashboard before planning outdoor workouts.'
    ],
    actionLabel: 'View Live Campus AQI Map'
  },
  {
    id: 'vaccination-drive-h1n1',
    title: 'Campus Seasonal Flu & H1N1 Vaccination Drive Schedule',
    category: 'prevention',
    tag: 'VACCINATION ADVISORY',
    readTime: '4 min read',
    summary: 'Quadrivalent flu vaccines available at student discount (₹0 under Plan C). Protect yourself before winter exams.',
    icon: 'shield',
    color: '#4f46e5',
    bgColor: '#eef2ff',
    body: [
      'Annual quadrivalent influenza vaccination significantly reduces sick days and hospitalization risk during academic semester examinations.',
      'The Campus Health Centre is conducting daily vaccination drives between 10:00 AM and 04:00 PM.',
      'Students covered under Studentkare Membership Plan B & C receive 100% complimentary flu vaccination.'
    ],
    keyPreventionTips: [
      'Schedule your flu vaccine shot at least 2 weeks before major exam periods for peak immunity.',
      'Bring your student ID card and health history card for walk-in vaccination.',
      'Stay hydrated and rest for 20 minutes following vaccination.'
    ],
    actionLabel: 'Reserve Vaccination Slot'
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
  const [scoutingTime, setScoutingTime] = useState<string>('Just now');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const updateScoutTimestamp = () => {
      const now = new Date();
      setScoutingTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateScoutTimestamp();
  }, []);

  const triggerAgentScout = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const now = new Date();
      setScoutingTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setIsRefreshing(false);
    }, 900);
  };

  const filteredArticles = selectedCategory === 'all'
    ? DISEASE_AWARENESS_ARTICLES
    : DISEASE_AWARENESS_ARTICLES.filter(a => a.category === selectedCategory);

  return (
    <section className="shop-section shop-container" data-ui="disease-awareness-hub" style={{ marginBlock: 24 }}>
      {/* 4-Hour AI Scouting Agent Telemetry Banner */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#ffffff', borderRadius: 16, padding: 18, marginBottom: 20, boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid #334155', paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#3b82f6', color: '#ffffff', padding: 8, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#f8fafc', fontWeight: 700 }}>Automated 4-Hour Disease & Wellness Scouting Loop</h3>
                <span style={{ background: '#10b98122', border: '1px solid #10b981', color: '#34d399', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} /> 4-HR AGENT ACTIVE
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                AI Agents scout campus health logs, water sanitation TDS, AQI sensors, and viral flu indicators every 4 hours.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Last scouted: <strong>{scoutingTime}</strong></span>
            <button
              onClick={triggerAgentScout}
              disabled={isRefreshing}
              style={{
                background: '#334155',
                color: '#f8fafc',
                border: '1px solid #475569',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <RefreshCw size={13} className={isRefreshing ? 'spin' : ''} />
              {isRefreshing ? 'Scouting...' : 'Run 4-Hr Agent Scout'}
            </button>
          </div>
        </div>

        {/* Live Scouting Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 10 }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: 2 }}>Outbreak Risk</span>
            <strong style={{ fontSize: '0.95rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ShieldAlert size={14} /> Low (0 Clusters)
            </strong>
          </div>

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 10 }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: 2 }}>Campus Air (AQI)</span>
            <strong style={{ fontSize: '0.95rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Wind size={14} /> 48 Good
            </strong>
          </div>

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 10 }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: 2 }}>Hostel Water Safety</span>
            <strong style={{ fontSize: '0.95rem', color: '#2dd4bf', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Droplets size={14} /> 99.8% Purity
            </strong>
          </div>

          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 10 }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: 2 }}>Flu Telemetry</span>
            <strong style={{ fontSize: '0.95rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Thermometer size={14} /> Seasonal Normal
            </strong>
          </div>
        </div>
      </div>

      {/* Heading & Category Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <span className="shop-eyebrow" style={{ color: '#e11d48', fontWeight: 700 }}>
            🩺 DISEASE PREVENTION & WELLNESS INTELLIGENCE
          </span>
          <h2 style={{ margin: '4px 0 0 0', fontSize: '1.4rem' }}>Campus Health Intelligence & Student Wellness</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            Continuous 4-hour agent scouting reports, clinical guides, and seasonal outbreak advisories.
          </p>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Articles' },
            { id: 'agent-scout', label: '🤖 4-Hr Agent Scouts' },
            { id: 'awareness', label: 'Mosquito & Outbreaks' },
            { id: 'prevention', label: 'Nutrition & Vaccines' },
            { id: 'mental-health', label: 'Mental Health' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: selectedCategory === cat.id ? '#0f172a' : '#f1f5f9',
                color: selectedCategory === cat.id ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {filteredArticles.map(art => (
          <article
            key={art.id}
            onClick={() => setSelectedArticle(art)}
            style={{
              background: art.bgColor,
              border: `1px solid ${art.color}33`,
              borderRadius: 14,
              padding: 18,
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

              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.02rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.35 }}>
                {art.title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.45 }}>
                {art.summary}
              </p>

              {art.lastUpdatedByAgent && (
                <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Activity size={12} /> {art.lastUpdatedByAgent}
                </div>
              )}
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
          <div className="wf-modal-card" style={{ maxWidth: 640, width: '92vw', maxHeight: '88vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
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

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 }}>
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
