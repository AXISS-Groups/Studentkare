import React from 'react';
import { ArrowRight, FlaskConical, Syringe } from 'lucide-react';
import { useT } from '@/i18n';
import './shop-front.css';

/**
 * The top of /shop (design page 3: WebShop; page 2: ShopHome). Copy is the
 * board's, made true: there is no pharmacist sign-off or delivery promise in
 * the system, so the banner states only what is — prices before you pay and
 * provider-confirmed timing. "Nearby pharmacy" and "Ask a pharmacist" have no
 * backend, so their tiles are lab tests and vaccines, which do.
 */
export interface ShopFrontProps {
  onCategory: (category: string) => void;
  onConcern: (concern: string) => void;
  onPrescription: () => void;
  onLabs: () => void;
  onVaccines: () => void;
  /** Opens a refill request (real: services/student_requests). Phone layout only, as on ShopHome. */
  onRefill?: () => void;
}

interface Tile { id: string; label: string; icon?: string; Icon?: React.ElementType; onPress: () => void }

export function ShopFront({ onCategory, onConcern, onPrescription, onLabs, onVaccines, onRefill }: ShopFrontProps) {
  const t = useT();
  const tiles: Tile[] = [
    { id: 'medicines', label: t('shopweb.front.tile.medicines'), icon: 'everyday-medicines', onPress: () => onCategory('medicines') },
    { id: 'prescription', label: t('shopweb.front.tile.prescription'), icon: 'upload-prescription', onPress: onPrescription },
    { id: 'devices', label: t('shopweb.front.tile.devices'), icon: 'health-devices', onPress: () => onCategory('devices') },
    { id: 'ayurveda', label: t('shopweb.front.tile.ayurveda'), icon: 'ayurveda', onPress: () => onCategory('ayurveda') },
    { id: 'cold', label: t('shopweb.front.tile.cold'), icon: 'cold-allergy', onPress: () => onConcern('respiratory') },
    { id: 'heart', label: t('shopweb.front.tile.heart'), icon: 'heart-care', onPress: () => onConcern('heart') },
    { id: 'labs', label: t('shopweb.front.tile.labs'), Icon: FlaskConical, onPress: onLabs },
    { id: 'vaccines', label: t('shopweb.front.tile.vaccines'), Icon: Syringe, onPress: onVaccines },
  ];
  return (
    <div className="shop-container sk-shopfront">
      <section className="sk-shopfront__banner" aria-labelledby="sk-shopfront-title">
        <span className="sk-shopfront__eyebrow">{t('shopweb.front.eyebrow')}</span>
        <h1 id="sk-shopfront-title">{t('shopweb.front.title')}</h1>
        <ul className="sk-shopfront__chips" aria-label={t('shopweb.front.chipsLabel')}>
          <li>{t('shopweb.front.chipPrice')}</li>
          <li>{t('shopweb.front.chipTiming')}</li>
          <li>{t('shopweb.front.chipPlacement')}</li>
        </ul>
      </section>
      <nav className="sk-shopfront__tiles" aria-label={t('shopweb.front.tilesLabel')}>
        {tiles.map(({ id, label, icon, Icon, onPress }) => (
          <button key={id} type="button" className="sk-shopfront__tile" onClick={onPress}>
            <span className="sk-shopfront__art" aria-hidden="true">
              {icon ? <img src={`/brand/shop/${icon}.png`} alt="" width={64} height={64} /> : Icon ? <Icon size={34} strokeWidth={1.6} /> : null}
            </span>
            <span className="sk-shopfront__label">{label}</span>
          </button>
        ))}
      </nav>
      {onRefill ? (
        <section className="sk-shopfront__refill" aria-labelledby="sk-shopfront-refill">
          <span className="sk-shopfront__eyebrow">{t('shopweb.front.refillEyebrow')}</span>
          <h2 id="sk-shopfront-refill">{t('shopweb.front.refillTitle')}</h2>
          <button type="button" className="sk-shopfront__refill-cta" onClick={onRefill}>{t('shopweb.front.refillCta')} <ArrowRight size={16} aria-hidden="true" /></button>
        </section>
      ) : null}
    </div>
  );
}
