import React from 'react';
import { ArrowRight, FlaskConical, Syringe } from 'lucide-react';
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

interface Tile { label: string; icon?: string; Icon?: React.ElementType; onPress: () => void }

export function ShopFront({ onCategory, onConcern, onPrescription, onLabs, onVaccines, onRefill }: ShopFrontProps) {
  const tiles: Tile[] = [
    { label: 'Everyday medicines', icon: 'everyday-medicines', onPress: () => onCategory('medicines') },
    { label: 'Match a prescription', icon: 'upload-prescription', onPress: onPrescription },
    { label: 'Health devices', icon: 'health-devices', onPress: () => onCategory('devices') },
    { label: 'Ayurveda', icon: 'ayurveda', onPress: () => onCategory('ayurveda') },
    { label: 'Cold & allergy', icon: 'cold-allergy', onPress: () => onConcern('respiratory') },
    { label: 'Heart care', icon: 'heart-care', onPress: () => onConcern('heart') },
    { label: 'Lab tests', Icon: FlaskConical, onPress: onLabs },
    { label: 'Adult vaccines', Icon: Syringe, onPress: onVaccines },
  ];
  return (
    <div className="shop-container sk-shopfront">
      <section className="sk-shopfront__banner" aria-labelledby="sk-shopfront-title">
        <span className="sk-shopfront__eyebrow">CAMPUS SHOP</span>
        <h1 id="sk-shopfront-title">Medicines to your hostel gate, priced before you pay.</h1>
        <ul className="sk-shopfront__chips" aria-label="How the shop works">
          <li>Price before you pay</li>
          <li>Provider confirms timing</li>
          <li>No placement is for sale</li>
        </ul>
      </section>
      <nav className="sk-shopfront__tiles" aria-label="Shop by category">
        {tiles.map(({ label, icon, Icon, onPress }) => (
          <button key={label} type="button" className="sk-shopfront__tile" onClick={onPress}>
            <span className="sk-shopfront__art" aria-hidden="true">
              {icon ? <img src={`/brand/shop/${icon}.png`} alt="" width={64} height={64} /> : Icon ? <Icon size={34} strokeWidth={1.6} /> : null}
            </span>
            <span className="sk-shopfront__label">{label}</span>
          </button>
        ))}
      </nav>
      {onRefill ? (
        <section className="sk-shopfront__refill" aria-labelledby="sk-shopfront-refill">
          <span className="sk-shopfront__eyebrow">REFILLS</span>
          <h2 id="sk-shopfront-refill">Running low? Reorder in two taps.</h2>
          <button type="button" className="sk-shopfront__refill-cta" onClick={onRefill}>Refill now <ArrowRight size={16} aria-hidden="true" /></button>
        </section>
      ) : null}
    </div>
  );
}
