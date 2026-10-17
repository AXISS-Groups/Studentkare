import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, FlaskConical, HeartPulse, ShieldCheck, Sparkles } from 'lucide-react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

const photography = {
  consultation: { src: '/marketplace/consultation.webp', alt: 'shopweb.photo.consultation' },
  laboratory: { src: '/marketplace/laboratory.webp', alt: 'shopweb.photo.laboratory' },
  skincare: { src: '/marketplace/skincare.webp', alt: 'shopweb.photo.skincare' },
  nutrition: { src: '/marketplace/nutrition.webp', alt: 'shopweb.photo.nutrition' },
  supplements: { src: '/marketplace/supplements.webp', alt: 'shopweb.photo.supplements' },
} as const satisfies Record<string, { src: string; alt: MessageKey }>;

type PhotoName = keyof typeof photography;

/** Locally hosted editorial photography, not product or provider identity. */
export function StorefrontPhoto({ name, eager = false }: { name: PhotoName; eager?: boolean }) {
  const t = useT();
  const [failedSource, setFailedSource] = useState('');
  const photo = photography[name];
  const alt = t(photo.alt);
  if (failedSource === photo.src) return <span className="storefront-photo-fallback" role="img" aria-label={alt}><HeartPulse size={48} aria-hidden="true" /></span>;
  return <img src={photo.src} alt={alt} width={720} height={480}
    loading={eager ? 'eager' : 'lazy'} decoding="async"
    onError={() => setFailedSource(photo.src)} />;
}

/** Copy lives in the shopweb catalogue under `shopweb.hero.<id>.*`. */
const campaigns = [
  { id: 'wellness', category: '', photo: 'consultation', tone: 'indigo' },
  { id: 'skin', category: 'skin', photo: 'skincare', tone: 'peach' },
  { id: 'nutrition', category: 'nutrition', photo: 'nutrition', tone: 'mint' },
] as const;

type CampaignId = typeof campaigns[number]['id'];
const campaignKey = (id: CampaignId, part: 'eyebrow' | 'title' | 'accent' | 'description' | 'action'): MessageKey => `shopweb.hero.${id}.${part}`;

export function StorefrontHero({ onCategory, onLabs, onPlans }: {
  onCategory: (category: string) => void; onLabs: () => void; onPlans: () => void;
}) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const campaign = campaigns[index];
  return <section className="shop-container storefront-promotions" aria-label={t('shopweb.hero.region')}>
    <div className={`storefront-hero storefront-tone-${campaign.tone}`} aria-roledescription="carousel" aria-label={t('shopweb.hero.carousel')}>
      <div className="storefront-hero-glow" aria-hidden="true" />
      <div className="storefront-hero-copy" aria-live="polite" aria-atomic="true">
        <span className="shop-eyebrow"><Sparkles size={14} aria-hidden="true" />{t(campaignKey(campaign.id, 'eyebrow'))}</span>
        <h1>{t(campaignKey(campaign.id, 'title'))}<br /><em>{t(campaignKey(campaign.id, 'accent'))}</em></h1>
        <p>{t(campaignKey(campaign.id, 'description'))}</p>
        <button type="button" className="shop-button shop-primary" onClick={() => onCategory(campaign.category)}>{t(campaignKey(campaign.id, 'action'))}<ArrowRight size={17} aria-hidden="true" /></button>
        <span className="storefront-hero-note"><ShieldCheck size={15} aria-hidden="true" />{t('shopweb.hero.note')}</span>
      </div>
      <div className="storefront-hero-photo"><StorefrontPhoto name={campaign.photo} eager />
        <span className="storefront-photo-tag"><HeartPulse size={20} aria-hidden="true" /><span>{t('shopweb.hero.photoTag')}<strong>{t('shopweb.hero.photoTagStrong')}</strong></span></span>
      </div>
      <div className="storefront-hero-controls">
        <div className="storefront-hero-dots">{campaigns.map((entry, i) => <button type="button" key={entry.tone} aria-label={t('shopweb.hero.show', { n: i + 1, action: t(campaignKey(entry.id, 'action')) })} aria-current={index === i ? 'true' : undefined} onClick={() => setIndex(i)}><span /></button>)}</div>
        <span>{t('shopweb.hero.counter', { n: String(index + 1).padStart(2, '0'), total: String(campaigns.length).padStart(2, '0') })}</span>
        <button type="button" className="shop-icon-button" aria-label={t('shopweb.hero.previous')} onClick={() => setIndex(value => (value + campaigns.length - 1) % campaigns.length)}><ArrowLeft size={17} aria-hidden="true" /></button>
        <button type="button" className="shop-icon-button" aria-label={t('shopweb.hero.next')} onClick={() => setIndex(value => (value + 1) % campaigns.length)}><ArrowRight size={17} aria-hidden="true" /></button>
      </div>
    </div>
    <div className="storefront-side-promos">
      <article className="storefront-lab-promo">
        <div className="storefront-lab-photo"><StorefrontPhoto name="laboratory" eager /></div>
        <div className="storefront-side-copy"><span className="shop-eyebrow">{t('shopweb.hero.labEyebrow')}</span><h2>{t('shopweb.hero.labTitle1')}<br />{t('shopweb.hero.labTitle2')}</h2><button type="button" className="shop-text-button" onClick={onLabs}>{t('shopweb.hero.labAction')}<ArrowRight size={16} aria-hidden="true" /></button></div>
      </article>
      <article className="storefront-plan-promo"><span className="storefront-plan-icon"><ShieldCheck size={25} aria-hidden="true" /></span><div><span className="shop-eyebrow">{t('shopweb.hero.planEyebrow')}</span><h2>{t('shopweb.hero.planTitle')}</h2><p>{t('shopweb.hero.planBody')}</p><button type="button" className="shop-text-button" onClick={onPlans}>{t('shopweb.hero.planAction')}<ArrowRight size={16} aria-hidden="true" /></button></div></article>
    </div>
  </section>;
}

const collections = [
  { category: 'vitamins', photo: 'supplements' },
  { category: 'skin', photo: 'skincare' },
  { category: 'nutrition', photo: 'nutrition' },
  { category: 'labs', photo: 'laboratory' },
  { category: 'general-care', photo: 'consultation' },
] as const satisfies readonly { category: string; photo: PhotoName }[];

type CollectionId = typeof collections[number]['category'];
const collectionKey = (id: CollectionId, part: 'title' | 'caption'): MessageKey => `shopweb.collections.${id}.${part}`;

export function StorefrontCollections({ active, onSelect }: { active: string; onSelect: (category: string) => void }) {
  const t = useT();
  return <section className="shop-section shop-container storefront-collections" aria-label={t('shopweb.collections.region')}>
    <div className="shop-section-heading"><div><span className="shop-eyebrow">{t('shopweb.collections.eyebrow')}</span><h2>{t('shopweb.collections.title')}</h2></div><span className="storefront-section-note">{t('shopweb.collections.note')}<ArrowRight size={16} aria-hidden="true" /></span></div>
    <div className="storefront-collection-grid">{collections.map(item => <button type="button" key={item.category} aria-pressed={active === item.category} onClick={() => onSelect(item.category)}>
      <span className="storefront-collection-photo"><StorefrontPhoto name={item.photo} /><span className="storefront-collection-arrow"><ArrowRight size={17} aria-hidden="true" /></span></span>
      <strong>{t(collectionKey(item.category, 'title'))}</strong><small>{t(collectionKey(item.category, 'caption'))}</small>
    </button>)}</div>
  </section>;
}

export function StorefrontLabHeading() {
  const t = useT();
  return <span className="storefront-lab-label"><FlaskConical size={16} aria-hidden="true" />{t('shopweb.labHeading')}</span>;
}
