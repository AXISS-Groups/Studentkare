import React, { useState } from 'react';
import { Activity, ArrowRight, ArrowUpRight, Check, ChevronDown, CreditCard, HeartPulse, LockKeyhole, Menu, ShieldCheck, Sparkles, Stethoscope, X } from 'lucide-react';
import { StudentKareLogo } from '../../components/StudentKareLogo';
import { DemoNote, TrendChart } from '../../components/health/HealthPrimitives';

interface Props { onNavigate?: (route: string) => void; onOpenAI?: () => void; onOpenMarketplace?: () => void }

const pillars = [
  { icon: Activity, title: 'Know your numbers.', label: 'HEALTH METRICS', text: 'Bring your vitals, daily movement, and health records into one clear picture.', destination: 'metrics', color: 'lavender' },
  { icon: Stethoscope, title: 'Find your kind of care.', label: 'CONNECTED CARE', text: 'From a routine check-in to specialist support, take the next step with confidence.', destination: 'care', color: 'mint' },
  { icon: ShieldCheck, title: 'Understand your cover.', label: 'HEALTH INSURANCE', text: 'Explore benefits, estimate out-of-pocket costs, and make sense of claim progress.', destination: 'insurance', color: 'peach' },
];

export function HealthcareLandingScreen({ onNavigate, onOpenAI, onOpenMarketplace }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [preview, setPreview] = useState<'health' | 'cover'>('health');
  const navigate = (route: string) => { setMenuOpen(false); onNavigate?.(route); };
  return (
    <div className="health-experience health-landing">
      <a className="health-skip" href="#health-main">Skip to content</a>
      <header className="health-site-header">
        <a href="#" aria-label="Studentkare home"><StudentKareLogo size={32} showWordmark showStrapline={false} /></a>
        <nav className="health-desktop-links" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#our-care">Your health, connected</a><button onClick={() => navigate('pricing')}>Plans <ArrowUpRight size={13} /></button><button onClick={() => navigate('insurance')}>Insurance <ArrowUpRight size={13} /></button></nav>
        <div className="health-header-actions"><button className="health-text-button health-login" onClick={() => navigate('login')}>Log in</button><button className="health-button health-button-primary" onClick={() => navigate('signup')}>Get started <ArrowRight size={15} /></button><button className="health-menu-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="health-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div>
        {menuOpen && <nav id="health-mobile-menu" className="health-mobile-menu" aria-label="Mobile navigation"><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#our-care" onClick={() => setMenuOpen(false)}>Your health, connected</a><button onClick={() => navigate('pricing')}>Plans</button><button onClick={() => navigate('insurance')}>Insurance</button><button onClick={() => navigate('login')}>Log in</button></nav>}
      </header>
      {onOpenMarketplace && <div className="health-section"><button className="health-text-button" onClick={onOpenMarketplace}>Shop wellness & lab tests <ArrowRight size={15} /></button></div>}

      <main id="health-main">
        <section className="health-hero health-section">
          <div className="health-hero-copy health-enter">
            <span className="health-eyebrow"><span className="health-dot" /> A LITTLE MORE CARE. EVERY DAY.</span>
            <h1>Your health.<br />Your cover.<br /><span>All together.</span></h1>
            <p>A healthier campus life starts with a little clarity. Your medical metrics, everyday care, and insurance — finally in one place.</p>
            <div className="health-hero-actions"><button className="health-button health-button-primary" onClick={() => navigate('dashboard')}>Explore your health hub <ArrowRight size={18} /></button><a href="#how-it-works" className="health-button health-button-quiet">See how it works <ChevronDown size={16} /></a></div>
            <div className="health-hero-proof"><span><LockKeyhole size={14} /> Your health, your control</span><span><HeartPulse size={14} /> Built around student life</span></div>
          </div>

          <div className="health-hero-visual health-enter" style={{ '--enter-delay': '120ms' } as React.CSSProperties}>
            <div className="health-orbit health-orbit-one" aria-hidden="true" /><div className="health-orbit health-orbit-two" aria-hidden="true" />
            <div className="health-preview-card">
              <div className="health-row"><div className="health-preview-brand"><span className="health-icon health-icon-brand"><HeartPulse size={22} /></span><div><strong>Your everyday wellbeing</strong><span className="health-small health-muted">A little perspective. A lot of possibility.</span></div></div><span className="health-live-dot" aria-hidden="true" /></div>
              <div className="health-segment" aria-label="Dashboard preview"><button aria-pressed={preview === 'health'} onClick={() => setPreview('health')}>Health overview</button><button aria-pressed={preview === 'cover'} onClick={() => setPreview('cover')}>My insurance</button></div>
              <div key={preview} className="health-preview-content health-enter">
                {preview === 'health' ? <>
                  <div className="health-row health-preview-value"><div><span className="health-small health-muted">Resting heart rate</span><div>72 <span>bpm</span></div></div><span className="health-soft-badge"><Activity size={12} /> Sample reading</span></div>
                  <TrendChart values={[68, 72, 69, 75, 71, 73, 70, 74, 72]} color="#8270d8" label="Illustrative heart rate history" />
                  <div className="health-preview-mini-grid"><div><span className="health-mini-dot mint" />Blood oxygen<strong>98<span>%</span></strong></div><div><span className="health-mini-dot lavender" />Last night's sleep<strong>7.5<span>hrs</span></strong></div><div><span className="health-mini-dot peach" />Daily steps<strong>7,240</strong></div></div>
                </> : <div className="health-preview-policy"><ShieldCheck size={40} /><span className="health-small">CAMPUS CARE PLUS · SAMPLE PLAN</span><h2>₹2,00,000</h2><p>Annual health cover</p><div><Check size={16} /> Hospitalisation benefits</div><div><Check size={16} /> Understand your out-of-pocket costs</div><button className="health-text-button" onClick={() => navigate('insurance')}>Explore this sample plan <ArrowRight size={15} /></button></div>}
              </div>
              <div className="health-preview-footer"><DemoNote>Illustrative preview · not live readings</DemoNote><span>studentkare</span></div>
            </div>
            <div className="health-floating-card health-float-top"><span className="health-icon health-icon-mint"><ShieldCheck size={22} /></span><div><strong>Peace of mind, built in.</strong><span>Care and cover, connected.</span></div></div>
            <div className="health-floating-card health-float-bottom"><span className="health-icon health-icon-brand"><Sparkles size={20} /></span><div><strong>Small steps. Healthier days.</strong><span>Your next chapter starts with you.</span></div></div>
          </div>
        </section>

        <div className="health-feature-strip health-section"><span>ONE CONNECTED HEALTH EXPERIENCE</span><div><Activity size={17} /> Medical metrics</div><div><Stethoscope size={17} /> Everyday care</div><div><ShieldCheck size={17} /> Insurance clarity</div><div><LockKeyhole size={17} /> Health records</div></div>

        <section id="our-care" className="health-section health-pillars-section">
          <div className="health-section-heading"><div><span className="health-eyebrow">LESS FRICTION. MORE LIVING.</span><h2>Care for every part<br />of your student life.</h2></div><p>Because looking after yourself should feel simple, connected, and a little more human.</p></div>
          <div className="health-pillars">{pillars.map(({ icon: Icon, ...pillar }) => <button className={`health-pillar ${pillar.color}`} key={pillar.title} onClick={() => navigate(pillar.destination)}><span className="health-pillar-top"><Icon size={26} /><ArrowUpRight size={20} /></span><span className="health-eyebrow">{pillar.label}</span><h3>{pillar.title}</h3><p>{pillar.text}</p><span className="health-pillar-link">Explore {pillar.destination === 'metrics' ? 'your metrics' : pillar.destination} <ArrowRight size={16} /></span></button>)}</div>
        </section>

        <section id="how-it-works" className="health-section health-journey-section"><div><span className="health-eyebrow">A CLEARER PATH TO FEELING BETTER</span><h2>From knowing<br />to taking care.</h2><button className="health-button health-button-primary" onClick={() => navigate('dashboard')}>Try the interactive demo <ArrowRight size={16} /></button></div><ol className="health-journey">{[{ title: 'Make sense of your health', text: 'Explore your trends and keep important reports in your health vault.' }, { title: 'Take your next small step', text: 'Follow your care checklist and find support through the care directory.' }, { title: 'Know where you stand', text: 'Review a sample policy, understand claims, and estimate care costs.' }].map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol></section>

        <section className="health-section health-plans-banner">
          <div><span className="health-eyebrow">PLANS THAT GROW WITH YOU</span><h2>Free for students.<br />More only when you want it.</h2><p>Start free. Upgrade to Student Plus for optional benefits, or talk to us about campus and enterprise plans for your institution.</p></div>
          <div className="health-plans-actions"><button className="health-button health-button-primary" onClick={() => navigate('pricing')}>Compare plans <ArrowRight size={16} /></button><button className="health-button health-plans-outline" onClick={() => navigate('pricing')}><CreditCard size={16} />Institutional pricing</button></div>
        </section>

        <section className="health-section health-help-banner"><div><span className="health-eyebrow">YOUR NEXT STEP, MADE SIMPLE</span><h2>A little help goes a long way.</h2><p>Find your way around records, care, and your health hub.</p></div><button className="health-button" onClick={onOpenAI ?? (() => navigate('dashboard'))}>Meet your care assistant <Sparkles size={17} /></button></section>
      </main>
      <footer className="health-site-footer health-section"><StudentKareLogo size={26} showWordmark showStrapline={false} /><span>Better health. More possibility.</span><span>Designed for student life in India.</span></footer>
    </div>
  );
}
