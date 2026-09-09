import React from 'react';
import { Check, FlaskConical, Plus, Star, Truck } from 'lucide-react';
import { CatalogItem, discountPercent } from '../../data/marketplaceCatalog';
import { formatRupees } from '../../data/healthExperience';
import { ProductArtwork } from './ProductArtwork';

interface CardProps {
  item: CatalogItem;
  quantity: number;
  onOpen: (item: CatalogItem) => void;
  onAdd: (item: CatalogItem) => void;
}

export function ProductCard({ item, quantity, onOpen, onAdd }: CardProps) {
  return <article className="shop-product-card">
    <button className="shop-product-visual" onClick={() => onOpen(item)} aria-label={`View ${item.name}`}>
      <span className="shop-discount">{discountPercent(item)}% OFF</span>
      <ProductArtwork item={item} />
    </button>
    <div className="shop-product-content">
      <span className="shop-product-brand">{item.brand}</span>
      <button className="shop-product-title" onClick={() => onOpen(item)}>{item.name}</button>
      <p className="shop-product-pack">{item.pack}</p>
      <div className="shop-rating-row"><span className="shop-rating">{item.rating} <Star size={10} fill="currentColor" /></span><span>{item.reviews} sample ratings</span></div>
      <div className="shop-price-row"><strong>{formatRupees(item.price)}</strong><del>{formatRupees(item.mrp)}</del></div>
      <div className="shop-product-bottom"><span>{item.requiresPrescription ? 'Prescription step' : 'Sample offer'}</span><button className={`shop-add ${quantity ? 'is-added' : ''}`} onClick={() => onAdd(item)} aria-label={`Add ${item.name} to cart`} disabled={quantity >= 10}>{quantity ? <Check size={14} /> : <Plus size={14} />}{quantity ? `Added (${quantity})` : 'Add'}</button></div>
    </div>
  </article>;
}

export function LabCard({ item, quantity, onOpen, onAdd }: CardProps) {
  return <article className="shop-lab-card">
    <div className="shop-lab-top"><span className="shop-lab-icon" style={{ backgroundColor: `${item.color}1a`, color: item.color }}><FlaskConical size={22} /></span><span className="shop-discount">{discountPercent(item)}% OFF</span></div>
    <button className="shop-product-title" onClick={() => onOpen(item)}>{item.name}</button>
    <p className="shop-product-pack">Includes <strong>{item.tests} parameters</strong></p>
    <div className="shop-lab-meta"><span><Truck size={13} />Home collection preview</span><span><Check size={13} />Preparation details included</span></div>
    <div className="shop-lab-footer"><div><del>{formatRupees(item.mrp)}</del><strong>{formatRupees(item.price)}</strong></div><button className={`shop-add ${quantity ? 'is-added' : ''}`} onClick={() => onAdd(item)} disabled={quantity > 0} aria-label={`Book ${item.name}`}>{quantity ? <Check size={14} /> : <Plus size={14} />}{quantity ? 'Selected' : 'Book'}</button></div>
  </article>;
}
