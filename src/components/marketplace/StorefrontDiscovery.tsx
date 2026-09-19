import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, FlaskConical, HeartPulse, ShieldCheck, Sparkles } from 'lucide-react';

const photography = {
  consultation: { src: '/marketplace/consultation.webp', alt: 'Stethoscope beside a laptop in a care setting' },
  laboratory: { src: '/marketplace/laboratory.webp', alt: 'Laboratory researcher preparing samples' },
  skincare: { src: '/marketplace/skincare.webp', alt: 'A collection of skincare essentials' },
  nutrition: { src: '/marketplace/nutrition.webp', alt: 'A colourful bowl of vegetables and grains' },
  supplements: { src: '/marketplace/supplements.webp', alt: 'White tablets photographed in close-up' },
} as const;

type PhotoName = keyof typeof photography;

/** Locally hosted editorial photography, not product or provider identity. */
export function StorefrontPhoto({ name, eager = false }: { name: PhotoName; eager?: boolean }) {
  const [failedSource, setFailedSource] = useState('');
  const photo = photography[name];
  if (failedSource === photo.src) return <span className="storefront-photo-fallback" role="img" aria-label={photo.alt}><HeartPulse size={48} /></span>;
  return <img src={photo.src} alt={photo.alt} width={720} height={480}
    loading={eager ? 'eager' : 'lazy'} decoding="async"
    onError={() => setFailedSource(photo.src)} />;
}

const campaigns = [
  { eyebrow: 'EVERYDAY HEALTH, A LITTLE CLOSER', title: 'A little care.', accent: 'A healthier every day.', description: 'Wellness essentials, lab tests, and care providers. Find your next step, all in one place.', action: 'Explore wellness', category: '', photo: 'consultation', tone: 'indigo' },
  { eyebrow: 'MAKE SPACE FOR YOURSELF', title: 'Good skin days', accent: 'start with a little care.', description: 'Explore daily skincare essentials, from gentle cleansers to your next favourite moisturiser.', action: 'Explore skin care', category: 'skin', photo: 'skincare', tone: 'peach' },
  { eyebrow: 'SMALL HABITS. EVERYDAY WELLBEING.', title: 'Nourish your day.', accent: 'Find your balance.', description: 'Discover nutrition essentials and everyday additions that fit your routine.', action: 'Explore nutrition', category: 'nutrition', photo: 'nutrition', tone: 'mint' },
] as const;

export function StorefrontHero({ onCategory, onLabs, onPlans }: {
  onCategory: (category: string) => void; onLabs: () => void; onPlans: () => void;
}) {
  const [index, setIndex] = useState(0);
  const campaign = campaigns[index];
  return <section className="shop-container storefront-promotions" aria-label="Discover Studentkare">
    <div className={`storefront-hero storefront-tone-${campaign.tone}`} aria-roledescription="carousel" aria-label="Wellness highlights">
      <div className="storefront-hero-glow" aria-hidden="true" />
      <div className="storefront-hero-copy" aria-live="polite" aria-atomic="true">
        <span className="shop-eyebrow"><Sparkles size={14} />{campaign.eyebrow}</span>
        <h1>{campaign.title}<br /><em>{campaign.accent}</em></h1>
        <p>{campaign.description}</p>
        <button className="shop-button shop-primary" onClick={() => onCategory(campaign.category)}>{campaign.action}<ArrowRight size={17} /></button>
        <span className="storefront-hero-note"><ShieldCheck size={15} />Care for your campus life, and beyond.</span>
      </div>
      <div className="storefront-hero-photo"><StorefrontPhoto name={campaign.photo} eager />
        <span className="storefront-photo-tag"><HeartPulse size={20} /><span>YOUR EVERYDAY WELLBEING<strong>One connected place.</strong></span></span>
      </div>
      <div className="storefront-hero-controls">
        <div className="storefront-hero-dots">{campaigns.map((entry, i) => <button key={entry.tone} aria-label={`Show highlight ${i + 1}: ${entry.action}`} aria-current={index === i ? 'true' : undefined} onClick={() => setIndex(i)}><span /></button>)}</div>
        <span>{String(index + 1).padStart(2, '0')} / 03</span>
        <button className="shop-icon-button" aria-label="Previous highlight" onClick={() => setIndex(value => (value + campaigns.length - 1) % campaigns.length)}><ArrowLeft size={17} /></button>
        <button className="shop-icon-button" aria-label="Next highlight" onClick={() => setIndex(value => (value + 1) % campaigns.length)}><ArrowRight size={17} /></button>
      </div>
    </div>
    <div className="storefront-side-promos">
      <article className="storefront-lab-promo">
        <div className="storefront-lab-photo"><StorefrontPhoto name="laboratory" eager /></div>
        <div className="storefront-side-copy"><span className="shop-eyebrow">MAKE TIME FOR A CHECK-IN</span><h2>Know a little more.<br />Care a little better.</h2><button className="shop-text-button" onClick={onLabs}>Explore lab tests<ArrowRight size={16} /></button></div>
      </article>
      <article className="storefront-plan-promo"><span className="storefront-plan-icon"><ShieldCheck size={25} /></span><div><span className="shop-eyebrow">STUDENTKARE PLANS</span><h2>More care. Your choice.</h2><p>Start free. Explore optional benefits.</p><button className="shop-text-button" onClick={onPlans}>Find your plan<ArrowRight size={16} /></button></div></article>
    </div>
  </section>;
}

const collections: { category: string; title: string; caption: string; photo: PhotoName }[] = [
  { category: 'vitamins', title: 'Vitamins & supplements', caption: 'Your daily essentials', photo: 'supplements' },
  { category: 'skin', title: 'Skin & personal care', caption: 'A little time for you', photo: 'skincare' },
  { category: 'nutrition', title: 'Nutrition & wellbeing', caption: 'Nourish your routine', photo: 'nutrition' },
  { category: 'labs', title: 'Health checks', caption: 'Take the next step', photo: 'laboratory' },
  { category: 'general-care', title: 'Everyday care', caption: 'Connect with a provider', photo: 'consultation' },
];

export function StorefrontCollections({ active, onSelect }: { active: string; onSelect: (category: string) => void }) {
  return <section className="shop-section shop-container storefront-collections" aria-label="Popular categories">
    <div className="shop-section-heading"><div><span className="shop-eyebrow">A LITTLE CARE, EVERY DAY</span><h2>Find your everyday essentials.</h2></div><span className="storefront-section-note">Explore your kind of wellbeing<ArrowRight size={16} /></span></div>
    <div className="storefront-collection-grid">{collections.map(item => <button key={item.category} aria-pressed={active === item.category} onClick={() => onSelect(item.category)}>
      <span className="storefront-collection-photo"><StorefrontPhoto name={item.photo} /><span className="storefront-collection-arrow"><ArrowRight size={17} /></span></span>
      <strong>{item.title}</strong><small>{item.caption}</small>
    </button>)}</div>
  </section>;
}

export function StorefrontLabHeading() {
  return <span className="storefront-lab-label"><FlaskConical size={16} />Compare listed health packages</span>;
}
