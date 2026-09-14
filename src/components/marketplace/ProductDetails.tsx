import React from 'react';
import { Check, FileText, ShieldCheck, Star } from 'lucide-react';
import { CatalogItem, discountPercent } from '../../data/marketplaceCatalog';
import { formatRupees } from '../../data/healthExperience';
import { ProductArtwork } from './ProductArtwork';

export function ProductDetails({ item, quantity, onAdd }: {
  item: CatalogItem; quantity: number; onAdd: (item: CatalogItem) => void;
}) {
  const limit = item.kind === 'product' ? 10 : 1;
  return <>
    <div className="shop-detail-grid">
      <div className="shop-detail-art" style={{ backgroundColor: `${item.color}12` }}><ProductArtwork item={item} /><span>Illustrative packaging</span></div>
      <div className="shop-detail-info">
        <span className="shop-eyebrow">{item.brand} · DEMO CATALOG</span>
        <h3>{item.name}</h3>
        <p>{item.pack}</p>
        <div className="shop-rating-row"><span className="shop-rating">{item.rating} <Star size={11} fill="currentColor" /></span><span>{item.reviews} illustrative ratings</span></div>
        <div className="shop-detail-price"><strong>{formatRupees(item.price)}</strong><del>{formatRupees(item.mrp)}</del><span>{discountPercent(item)}% off</span></div>
        <p className="shop-small">Sample price · inclusive of illustrative taxes</p>
        <p className="shop-detail-description">{item.description}</p>
        {item.requiresPrescription && <div className="shop-inline-note"><FileText size={17} />This demo item includes a sample prescription step.</div>}
        <button className="shop-button shop-primary" onClick={() => onAdd(item)} disabled={quantity >= limit}>
          {quantity >= limit ? 'Already selected' : quantity ? `Add another · ${quantity} in cart` : item.kind === 'lab' ? 'Select this lab package' : 'Add to demo cart'}
        </button>
        <div className="shop-detail-assurance"><ShieldCheck size={15} /> Demo only. No payment or fulfilment.</div>
      </div>
    </div>
    <div className="shop-detail-bottom">
      <h4>{item.kind === 'lab' ? 'About this package' : 'Product highlights'}</h4>
      <ul>{item.highlights.map(highlight => <li key={highlight}><Check size={15} />{highlight}</li>)}</ul>
      {item.preparation && <div className="shop-inline-note"><FileText size={17} />{item.preparation}</div>}
      <p className="shop-small">Names, prices, ratings, and images are fictional examples. This catalog is not medical advice or an actual pharmacy service.</p>
    </div>
  </>;
}
