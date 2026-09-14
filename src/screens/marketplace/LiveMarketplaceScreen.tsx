import React, { useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, Apple, ArrowLeft, ArrowRight, BadgePercent, Bandage, Bone, Clock3, Droplets, Dumbbell, Eye, FileText, FlaskConical, HeartPulse, Leaf, Minus, Moon, Pause, Pill, Play, Plus, Search, ShieldCheck, ShoppingBag, Soup, Sparkles, Stethoscope, Syringe, Trash2, UserRound, UploadCloud, Calendar, Wind, X } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { useAuth } from '../../data/AuthContext';
import { useLiveCart } from '../../data/LiveCartContext';
import { HomeArticle, HomeContent, LiveCatalogItem, Delivery, LiveOrder, discountPercent, money } from '../../data/workflowTypes';
import { apiRequest } from '../../data/http';
import { homeForRole, navigate, RoutePath } from '../../lib/workflowRouting';
import { DataState, EmptyState, Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { StudentKareLogo } from '../../components/StudentKareLogo';
import { ProductArtwork } from '../../components/marketplace/ProductArtwork';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useInterface } from '../../theme/InterfaceProvider';
import '../../theme/marketplace.css';

import { EmergencyBar } from '../../components/health/EmergencyBar';
import { LabSlotPickerModal } from '../../components/health/LabSlotPickerModal';
import { ExtractedRxItem, PrescriptionUploaderModal, RxCartOutcome } from '../../components/health/PrescriptionUploaderModal';
import { ProviderResources } from '../../features/preventive/screens/ProviderResources';
import '../../features/preventive/screens/preventive.css';

const categories = ['vitamins', 'skin', 'devices', 'nutrition', 'first-aid', 'ayurveda', 'medicines', 'labs', 'general-care', 'diabetes', 'heart', 'stomach', 'liver', 'bone-joint', 'kidney', 'respiratory', 'eye', 'vaccines'];
const healthConcerns: { id: string; label: string }[] = [
  { id: 'diabetes', label: 'Diabetes care' },
  { id: 'heart', label: 'Heart care' },
  { id: 'stomach', label: 'Stomach care' },
  { id: 'liver', label: 'Liver care' },
  { id: 'bone-joint', label: 'Bone & joint' },
  { id: 'kidney', label: 'Kidney care' },
  { id: 'skin', label: 'Derma care' },
  { id: 'respiratory', label: 'Respiratory' },
  { id: 'eye', label: 'Eye care' },
  { id: 'vaccines', label: 'Adult vaccines' },
];
const artworkFor = (item: LiveCatalogItem) => ({ name: item.name, brand: item.brand, artLabel: item.name.slice(0, 17), color: item.kind === 'lab' ? '#a38bbb' : item.kind === 'vaccine' ? '#8fb8a8' : item.category === 'skin' ? '#cba18f' : '#8baaa5', shape: item.kind === 'lab' ? 'lab' as const : item.kind === 'vaccine' ? 'lab' as const : item.kind === 'consultation' ? 'lab' as const : item.category === 'devices' ? 'device' as const : item.category === 'skin' ? 'tube' as const : 'box' as const });
const contentTarget = (target: string): RoutePath => (['shop', 'care', 'health', 'records', 'insurance', 'orders', 'support', 'movement'].includes(target) ? target as RoutePath : 'health');
const contentIcon = (icon: string, size = 22) => icon === 'flask' ? <FlaskConical size={size} /> : icon === 'heart' ? <HeartPulse size={size} /> : icon === 'shield' ? <ShieldCheck size={size} /> : icon === 'activity' ? <Activity size={size} /> : icon === 'help' ? <Stethoscope size={size} /> : <FileText size={size} />;
const categoryIcons = { labs: FlaskConical, devices: Activity, skin: Sparkles, vitamins: HeartPulse, nutrition: Apple, 'first-aid': Bandage, ayurveda: Leaf, medicines: Pill, 'general-care': Stethoscope, diabetes: Droplets, heart: HeartPulse, stomach: Soup, liver: Droplets, 'bone-joint': Bone, kidney: Droplets, respiratory: Wind, eye: Eye, vaccines: Syringe };
const categoryIcon = (category: string) => {
  const Icon = categoryIcons[category as keyof typeof categoryIcons] || HeartPulse;
  return <Icon size={24} strokeWidth={1.7} aria-hidden="true" />;
};

const promoHeadlines = ['Featured in your wellness shelf', 'Care essentials, ready to add', 'Pick up your everyday favourites'];

function PromoCarousel({ items, onSelect, onAdd }: { items: LiveCatalogItem[]; onSelect: (item: LiveCatalogItem) => void; onAdd: (item: LiveCatalogItem) => void }) {
  const featured = items.filter(item => item.kind === 'product' && !item.requiresPrescription).slice(0, 5);
  const { reducedMotion } = useInterface();
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [index, setIndex] = useState(0);
  const activeIndex = index % Math.max(featured.length, 1);
  useEffect(() => {
    if (reducedMotion || paused || interacting || featured.length < 2) return;
    const timer = window.setInterval(() => setIndex(prev => (prev + 1) % featured.length), 6500);
    return () => window.clearInterval(timer);
  }, [reducedMotion, paused, interacting, featured.length]);
  if (!featured.length) return null;
  const item = featured[activeIndex];
  const colour = artworkFor(item).color;
  return <section className="shop-container wf-promo-carousel" aria-label="Featured promotion" aria-roledescription="carousel" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setPaused(true)}>
    <div className="wf-promo-slide" key={item.id} style={{ '--promo-tint': `${colour}24`, '--promo-color': colour } as React.CSSProperties}>
      <div className="wf-promo-copy"><span className="shop-eyebrow">FEATURED PROMOTION</span><h2>{promoHeadlines[index % promoHeadlines.length]}</h2><h3>{item.name}</h3><p>{item.pack} · <strong>{discountPercent(item.mrpPaise, item.pricePaise)}% off</strong></p><div className="wf-promo-price"><del>{money(item.mrpPaise)}</del><strong>{money(item.pricePaise)}</strong></div><button className="shop-button shop-primary" disabled={item.stock < 1} onClick={() => onAdd(item)}>Add to cart <ArrowRight size={15} /></button></div>
      <button className="wf-promo-art" aria-label={`View ${item.name}`} onClick={() => onSelect(item)}><ProductArtwork item={artworkFor(item)} /></button>
    </div>
    <div className="wf-promo-controls">{featured.map((entry, i) => <button key={entry.id} aria-label={`Show promotion ${i + 1}`} aria-current={activeIndex === i} onClick={() => { setIndex(i); setPaused(true); }} />)}{featured.length > 1 && !reducedMotion && <button className="wf-promo-play" aria-label={paused ? 'Play promotions' : 'Pause promotions'} onClick={() => setPaused(value => !value)}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>}</div>
  </section>;
}

function FeaturedBrands({ items, onBrand }: { items: LiveCatalogItem[]; onBrand: (brand: string) => void }) {
  const brands = Array.from(new Set(items.filter(item => item.kind === 'product').map(item => item.brand))).slice(0, 5);
  if (!brands.length) return null;
  return <section className="shop-section shop-container"><div className="shop-section-heading"><div><span className="shop-eyebrow">MEET YOUR EVERYDAY FAVOURITES</span><h2>Featured brands.</h2></div></div><div className="shop-brands">{brands.map((brand, index) => <button key={brand} className={`shop-brand shop-brand-${index % 5}`} onClick={() => onBrand(brand)}><span>{index % 3 === 0 ? <Sparkles size={21} /> : index % 3 === 1 ? <Activity size={21} /> : <HeartPulse size={21} />}</span><strong>{brand}</strong><small>EVERYDAY CARE</small></button>)}</div></section>;
}

function OffersBanner({ onShop }: { onShop: () => void }) {
  return <section className="shop-container shop-offer-banners"><div className="shop-prescription-banner"><span className="shop-large-icon"><FileText size={35} strokeWidth={1.4} /></span><div><h3>Your records, together.</h3><p>Keep your own reports, prescriptions, and documents in one private place.</p></div><button className="shop-button" onClick={() => navigate('records')}>Open health records <ArrowRight size={15} /></button></div><div className="shop-saving-banner"><BadgePercent size={35} /><div><span className="shop-eyebrow">A LITTLE EXTRA, ON US</span><h3>Shop sample care services</h3><p>Browse published entries from your platform team.</p></div><button className="shop-icon-button" aria-label="Browse all services" onClick={onShop}><ArrowRight size={21} /></button></div></section>;
}

function CatalogChips({ categories, active, onSelect }: { categories: string[]; active: string; onSelect: (value: string) => void }) {
  return <section className="shop-section shop-container"><div className="shop-section-heading"><div><span className="shop-eyebrow">A LITTLE CARE, EVERY DAY</span><h2>Find your everyday essentials.</h2></div></div><div className="shop-concerns" aria-label="Product categories">{categories.map(value => <button key={value} aria-pressed={active === value} onClick={() => onSelect(value)}><span>{categoryIcon(value)}</span><strong>{value.replace(/-/g, ' ')}</strong></button>)}</div></section>;
}

export function LiveMarketplaceScreen({ care = false, checkout = false }: { care?: boolean; checkout?: boolean }) {
  const { user } = useAuth();
  const cart = useLiveCart();
  const [kind, setKind] = useState(care ? 'consultation' : 'all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<LiveCatalogItem | null>(null);
  const [article, setArticle] = useState<HomeArticle | null>(null);
  const [cartOpen, setCartOpen] = useState(checkout);
  const [order, setOrder] = useState<LiveOrder | null>(null);

  // New Studentkare care services & AI Agents state
  const [labSlotItem, setLabSlotItem] = useState<LiveCatalogItem | null>(null);
  const [rxUploadOpen, setRxUploadOpen] = useState(false);

  const root = useRef<HTMLDivElement>(null);
  const catalog = useRef<HTMLElement>(null);
  const { reducedMotion } = useInterface();
  const [notice, setNotice] = useState('');
  useScrollReveal(root);
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedQuery(query), 250); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 2500); return () => window.clearTimeout(timer); }, [notice]);
  const resource = useApiResource<{ items: LiveCatalogItem[]; total: number }>(`/catalog?limit=12&offset=${page * 12}${kind !== 'all' ? `&kind=${kind}` : ''}${category !== 'all' ? `&category=${encodeURIComponent(category)}` : ''}&query=${encodeURIComponent(debouncedQuery)}`);
  const content = useApiResource<HomeContent>('/home');
  const count = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
  const browse = (nextKind: string) => { setKind(nextKind); setCategory('all'); setQuery(''); setPage(0); };
  const jumpToCatalog = () => window.requestAnimationFrame(() => catalog.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' }));
  const add = (item: LiveCatalogItem) => { cart.add(item); setNotice(`${item.name} added to your cart.`); };
  const hero = content.data?.hero[0];
  const aside = content.data?.aside[0];
  const movement = content.data?.movement[0];

  const rxCart = useRef(cart);
  rxCart.current = cart;
  const handleRxAddToCart = async (rxItems: ExtractedRxItem[], signal: AbortSignal): Promise<RxCartOutcome> => {
    // Extraction is only a list of candidate IDs, never a prescription or a price source.
    const candidates = new Set(rxItems.map(item => item.matched_catalog_id).filter(Boolean));
    const catalogItems = new Map<string, LiveCatalogItem>();
    if (candidates.size) {
      let offset = 0;
      let total = 0;
      do {
        const page = await apiRequest<{ items: LiveCatalogItem[]; total: number }>(`/catalog?kind=product&limit=100&offset=${offset}`, { signal });
        if (!Array.isArray(page?.items) || !Number.isInteger(page.total) || page.total < 0 ||
          (!page.items.length && offset < page.total)) throw new Error('Could not verify the live catalog. No items were added.');
        page.items.forEach(item => { if (item && typeof item.id === 'string' && candidates.has(item.id)) catalogItems.set(item.id, item); });
        offset += page.items.length;
        total = page.total;
      } while (offset < total);
    }
    if (signal.aborted) throw new Error('Catalog check cancelled.');
    const outcome: RxCartOutcome = { acceptedIndexes: [], blocked: [] };
    const quantities = new Map(rxCart.current.lines.map(line => [line.item.id, line.quantity]));
    rxItems.forEach((rxItem, index) => {
      const item = catalogItems.get(rxItem.matched_catalog_id || '');
      let reason = '';
      if (!item) reason = 'No current catalog product match. Keep for pharmacist review.';
      else if (item.requiresPrescription !== false) reason = 'Prescription eligibility is restricted or unknown. Pharmacist review required.';
      else if (item.active !== true || item.kind !== 'product' || !Number.isInteger(item.stock) || item.stock < 1) reason = 'This product is not currently available.';
      else if (!item.providerId || !item.name || !Number.isInteger(item.pricePaise) || item.pricePaise < 0 ||
        !Number.isInteger(item.mrpPaise) || item.mrpPaise < 0) reason = 'Catalog details could not be verified. Keep for pharmacist review.';
      else if ((quantities.get(item.id) || 0) >= Math.min(10, item.stock)) reason = 'Cart quantity or available stock limit reached.';
      if (reason || !item) outcome.blocked.push({ index, reason });
      else {
        rxCart.current.add(item);
        quantities.set(item.id, (quantities.get(item.id) || 0) + 1);
        outcome.acceptedIndexes.push(index);
      }
    });
    setNotice(`${outcome.acceptedIndexes.length} added to cart; ${outcome.blocked.length} blocked. Review details in the prescription dialog.`);
    return outcome;
  };

  return <div ref={root} className="shop shop-marketplace wf-live-marketplace">
    <header className="shop-header">
      <div className="shop-container shop-header-main">
        <button className="shop-logo-button" onClick={() => { navigate('shop'); browse('all'); }} aria-label="Studentkare home">
          <StudentKareLogo size={33} showStrapline={false} />
        </button>
        <nav className="wf-market-nav" aria-label="Healthcare services">
          <button aria-pressed={kind === 'all'} onClick={() => browse('all')}>Discover</button>
          <button aria-pressed={kind === 'product'} onClick={() => browse('product')}><Pill size={16} />Wellness</button>
          <button aria-pressed={kind === 'lab'} onClick={() => browse('lab')}><FlaskConical size={16} />Lab tests</button>
          <button aria-pressed={kind === 'consultation'} onClick={() => browse('consultation')}><Stethoscope size={16} />Find a doctor</button>
          <button onClick={() => navigate('movement')}><Dumbbell size={16} />Movement</button>
        </nav>
        <div className="shop-header-tools">
          <button className="shop-account" aria-label={user ? 'My workspace' : 'Sign in'} onClick={() => navigate(user ? homeForRole(user.role) : 'login')}>
            <UserRound size={18} />
            <span>{user ? 'My workspace' : 'Sign in'}</span>
          </button>
          <button className="shop-cart-button" aria-label={`Open cart, ${count} items`} onClick={() => setCartOpen(true)}>
            <ShoppingBag size={21} />
            {count > 0 && <span className="shop-cart-count">{count}</span>}
          </button>
        </div>
      </div>
      <div className="shop-container wf-live-search">
        <label className="shop-search">
          <Search size={20} />
          <input aria-label="Search products and services" type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="Search medicines, lab tests, and care…" />
          {query && <button className="shop-icon-button" aria-label="Clear search" onClick={() => { setQuery(''); setPage(0); }}><X size={18} /></button>}
        </label>
        <button className="shop-prescription-shortcut" onClick={() => setRxUploadOpen(true)}>
          <UploadCloud size={21} />
          <span>Have a prescription?<strong>Upload & find medicines <ArrowRight size={14} /></strong></span>
        </button>
      </div>
    </header>

    <main>
      <div className="shop-container">
        <EmergencyBar compact />
      </div>

      {kind === 'all' && !query && page === 0 && <><section className="shop-container shop-hero-grid">
        <div className="shop-hero wf-live-hero">
          <div className="shop-hero-copy">
            <span className="shop-eyebrow"><span className="care-hero-dot" />{hero?.eyebrow || 'YOUR HEALTH, CONNECTED'}</span>
            <h1>{hero?.title.split('\n')[0] || 'Care that connects.'}<br /><em>{hero?.title.split('\n')[1] || 'Health that’s yours.'}</em></h1>
            <p>{hero?.body || 'Keep your records together, explore listed care services, and follow every request from your own account.'}</p>
            <button className="shop-button shop-primary" onClick={() => navigate(contentTarget(hero?.target || 'health'))}>{hero?.action || 'Open my health workspace'} <ArrowRight size={17} /></button>
            <div className="care-hero-note"><ShieldCheck size={16} /><span>Your records. Your care. Your space.</span></div>
          </div>
          <div className="care-hero-art" aria-hidden="true"><span className="care-hero-orbit" /><img className="wf-live-hero-image" src="/marketplace/care-team.svg" alt="" /><span className="care-hero-float"><HeartPulse size={20} /><span>A little care,<strong>every single day.</strong></span></span></div>
        </div>
        <div className="wf-market-aside">
          <span className="care-aside-icon">{contentIcon(aside?.icon || 'flask', 28)}</span>
          <span className="shop-eyebrow">{aside?.eyebrow || 'TAKE YOUR NEXT STEP'}</span>
          <h2>{aside?.title.split('\n')[0] || 'Find care from'}<br />{' '}{aside?.title.split('\n')[1] || 'listed providers.'}</h2>
          <p>{aside?.body || 'Choose a listed service and send a request. Your provider confirms the time and arrangements.'}</p>
          <button className="shop-text-button" onClick={() => navigate(contentTarget(aside?.target || 'care'))}>{aside?.action || 'Explore care'} <ArrowRight size={17} /></button>
        </div>
      </section>
      <div className="shop-container care-service-grid" aria-label="Care shortcuts">
        {[
          { icon: Pill, title: 'Everyday wellness', description: 'Essentials for feeling your best', action: () => { browse('product'); jumpToCatalog(); } },
          { icon: FlaskConical, title: 'Book a lab test', description: 'Make time for a health check', action: () => { browse('lab'); jumpToCatalog(); } },
          { icon: Stethoscope, title: 'Talk to a doctor', description: 'Find your next care provider', action: () => { browse('consultation'); jumpToCatalog(); } },
          { icon: ShieldCheck, title: 'Your health cover', description: 'Keep your insurance in view', action: () => navigate('insurance') },
        ].map(({ icon: Icon, title, description, action }) => <button key={title} onClick={action}><span className="care-service-icon"><Icon size={24} strokeWidth={1.7} /></span><span><strong>{title}</strong><small>{description}</small></span><ArrowRight size={17} /></button>)}
      </div>
      <section className="shop-section shop-container" aria-label="Shop by health concern">
        <div className="shop-section-heading"><div><span className="shop-eyebrow">SHOP BY HEALTH CONCERN</span><h2>Find care for what matters today.</h2></div></div>
        <div className="shop-concerns">{healthConcerns.map(concern => <button key={concern.id} aria-pressed={category === concern.id} onClick={() => { setCategory(concern.id); setKind('all'); setQuery(''); setPage(0); jumpToCatalog(); }}><span>{categoryIcon(concern.id)}</span><strong>{concern.label}</strong></button>)}</div>
      </section>
      <CatalogChips categories={categories} active={category} onSelect={value => { setCategory(value); setPage(0); jumpToCatalog(); }} />
      <PromoCarousel items={resource.data?.items || []} onSelect={setSelected} onAdd={add} />
      <FeaturedBrands items={resource.data?.items || []} onBrand={brand => { setQuery(brand); setPage(0); setCategory('all'); }} />
      <OffersBanner onShop={() => { setCategory('all'); setQuery(''); setPage(0); }} /></>}

      <section className="shop-section shop-container" ref={catalog} id="care-catalog" tabIndex={-1}>
        {content.data?.features?.length ? <div className="shop-trust-strip" aria-label="Marketplace features">{content.data.features.map(feature => <div key={feature.key}>{contentIcon(feature.icon, 23)}<span><strong>{feature.title}</strong><small>{feature.body}</small></span></div>)}</div> : null}
        <div className="shop-section-heading">
          <div>
            <span className="shop-eyebrow">PUBLISHED BY YOUR PLATFORM TEAM</span>
            <h2>{kind === 'lab' ? 'Health Checks & Lab Packages' : kind === 'consultation' ? 'Doctor Consultations' : kind === 'vaccine' ? 'Adult Vaccination Services' : kind === 'product' ? 'Everyday Health & Wellness Essentials' : 'Products & Services'}</h2>
            <p>{resource.data ? `${resource.data.total} entries available` : 'Loading configured catalog'}</p>
          </div>
          <Field label="Category">
            <select value={category} onChange={event => { setCategory(event.target.value); setPage(0); }}>
              <option value="all">All categories</option>
              {categories.map(value => <option key={value} value={value}>{value.replace(/-/g, ' ')}</option>)}
            </select>
          </Field>
        </div>

        <div className="wf-choice-row wf-catalog-tabs" aria-label="Catalog type">
          {[{ id: 'all', label: 'All' }, { id: 'product', label: 'Products' }, { id: 'lab', label: 'NABL Lab Tests' }, { id: 'consultation', label: 'Doctor Consults' }, { id: 'vaccine', label: 'Adult Vaccines' }].map(tab => (
            <button key={tab.id} aria-pressed={kind === tab.id} onClick={() => browse(tab.id)}>{tab.label}</button>
          ))}
        </div>

        <DataState {...resource} retry={resource.reload}>
          {resource.data?.items.length ? (
            <div className="shop-product-grid wf-live-product-grid">
              {resource.data.items.map(item => (
                <article className="shop-product-card" key={item.id}>
                  <button className="shop-product-visual" aria-label={`View ${item.name}`} onClick={() => setSelected(item)}>
                    {discountPercent(item.mrpPaise, item.pricePaise) > 0 && <span className="shop-discount">{discountPercent(item.mrpPaise, item.pricePaise)}% OFF</span>}
                    <ProductArtwork item={artworkFor(item)} />
                  </button>
                  <div className="shop-product-content">
                    <span className="shop-product-brand">{item.brand}</span>
                    <button className="shop-product-title" onClick={() => setSelected(item)}>{item.name}</button>
                    <p className="shop-product-pack">{item.pack}</p>
                    <div className="shop-price-row">
                      <strong>{money(item.pricePaise)}</strong>
                      {item.mrpPaise > item.pricePaise && <del>{money(item.mrpPaise)}</del>}
                    </div>
                    <span className="wf-fineprint">
                      {item.kind === 'product' ? (item.stock > 0 ? `${item.stock} available` : 'Out of stock') : item.kind === 'lab' ? 'NABL Certified / Provider Booking' : item.kind === 'vaccine' ? 'Clinician eligibility check' : 'Provider Booking'}
                    </span>
                    <div className="shop-product-bottom">
                      <span>{item.requiresPrescription ? 'Rx Required' : item.kind}</span>
                      {item.kind === 'lab' ? (
                        <button
                          className="shop-add"
                          onClick={() => setLabSlotItem(item)}
                          style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
                        >
                          <Calendar size={13} /> Book Slot
                        </button>
                      ) : (
                        <button className="shop-add" disabled={item.requiresPrescription || (item.kind === 'product' && item.stock < 1)} onClick={() => add(item)} aria-label={`Add ${item.name}`}>
                          <Plus size={14} />{cart.lines.some(line => line.item.id === item.id) ? 'In cart' : 'Add'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title={query || category !== 'all' ? 'No matching entries.' : 'The catalog is not available yet.'} description={query || category !== 'all' ? 'Try another search or category.' : 'Products and services will appear when the platform team publishes real provider entries.'} />
          )}
        </DataState>

        {!!resource.data?.total && (
          <div className="wf-pagination">
            <button className="health-button" disabled={page === 0} onClick={() => setPage(value => value - 1)}><ArrowLeft size={14} />Previous</button>
            <span>Page {page + 1} of {Math.ceil(resource.data.total / 12)}</span>
            <button className="health-button" disabled={(page + 1) * 12 >= resource.data.total} onClick={() => setPage(value => value + 1)}>Next<ArrowRight size={14} /></button>
          </div>
        )}
      </section>

      <div className="shop-section shop-container"><ProviderResources /><section className="wf-card preventive-section"><div className="wf-panel-heading"><div><span className="care-eyebrow">PREVENTIVE CARE</span><h3>Vaccines, report follow-up & seasonal health.</h3><p>Explore source-labelled listings and clinician-reviewed next steps. Choose your own notification preferences.</p></div><button className="health-button" onClick={() => navigate('preventive-care')}>Open preventive care<ArrowRight size={16} /></button></div></section></div>

      {movement && <section className="shop-container shop-movement-invite"><span>{contentIcon(movement.icon || 'activity', 27)}</span><div><span className="shop-eyebrow">{movement.eyebrow}</span><h3>{movement.title}</h3><p>{movement.body}</p></div><button className="shop-button" onClick={() => navigate(contentTarget(movement.target || 'movement'))}>{movement.action || 'Explore movement'} <ArrowRight size={16} /></button></section>}
      {!!content.data?.links?.length && <section className="shop-container wf-market-links">{content.data.links.map(link => <button key={link.key} onClick={() => navigate(contentTarget(link.target))}>{contentIcon(link.icon, 25)}<strong>{link.title}</strong><span>{link.body}</span></button>)}</section>}
      {!!content.data?.articles?.length && <section className="shop-section shop-container"><div className="shop-section-heading"><div><span className="shop-eyebrow">GOOD READS FOR HEALTHIER DAYS</span><h2>Health perspectives.</h2></div></div><div className="shop-articles">{content.data.articles.map((item, index) => <button key={item.id} className="shop-article" onClick={() => setArticle(item)}><div className={`shop-article-art article-${index}`} style={{ backgroundColor: item.color }}><span>{index === 0 ? <Moon size={55} strokeWidth={1} /> : index === 1 ? <HeartPulse size={55} strokeWidth={1} /> : <Sparkles size={55} strokeWidth={1} />}</span><span className="shop-article-shape" /><span className="shop-article-small-shape" /></div><div className="shop-article-body"><span className="shop-eyebrow">{item.tag}</span><h3>{item.title}</h3><span><Clock3 size={12} />{item.readTime}<ArrowRight size={16} /></span></div></button>)}</div></section>}
    </main>

    <footer className="shop-footer">
      <div className="shop-container">
        <div className="shop-footer-grid">
          <div className="shop-footer-brand">
            <StudentKareLogo size={30} showStrapline={false} />
            <p>Your records. Your care. One connected place.</p>
          </div>
          <div>
            <h4>Explore</h4>
            <button onClick={() => browse('product')}>Products</button>
            <button onClick={() => browse('lab')}>Lab packages</button>
            <button onClick={() => browse('consultation')}>Consultations</button>
          </div>
          <div>
            <h4>Your account</h4>
            <button onClick={() => navigate('health')}>Health workspace</button>
            <button onClick={() => navigate('orders')}>Orders & requests</button>
            <button onClick={() => navigate('support')}>Support</button>
          </div>
        </div>
        <div className="shop-footer-bottom">
          <span>© {new Date().getFullYear()} Studentkare</span>
          <span>Service requests require provider confirmation.</span>
        </div>
      </div>
    </footer>

    {/* Lab Slot Picker Modal */}
    {labSlotItem && (
      <LabSlotPickerModal
        testName={labSlotItem.name}
        catalogItemId={labSlotItem.id}
        isOpen={!!labSlotItem}
        onClose={() => setLabSlotItem(null)}
        onRequestCare={() => {
          if (labSlotItem.active && labSlotItem.kind === 'lab' && !labSlotItem.requiresPrescription) {
            cart.add(labSlotItem);
            setCartOpen(true);
            setNotice('Lab added to your care request. No appointment is confirmed.');
          } else setNotice('This lab requires provider review before a care request can be prepared.');
        }}
      />
    )}

    {/* Prescription AI Uploader Modal */}
    <PrescriptionUploaderModal
      isOpen={rxUploadOpen}
      onClose={() => setRxUploadOpen(false)}
      onAddToCart={handleRxAddToCart}
    />

    <div className={`shop-toast ${notice ? 'visible' : ''}`} role="status">
      {notice && <><span>{notice}</span><button onClick={() => { setNotice(''); setCartOpen(true); }}>View cart</button></>}
    </div>
    {selected && <ShopDialog title={selected.name} onClose={() => setSelected(null)} wide><div className="shop-detail-grid"><div className="shop-detail-art"><ProductArtwork item={artworkFor(selected)} /><span>Illustrative artwork, not a product photograph</span></div><div className="shop-detail-info"><span className="shop-eyebrow">{selected.brand}</span><h3>{selected.name}</h3><p>{selected.pack}</p><div className="shop-detail-price"><strong>{money(selected.pricePaise)}</strong></div><p className="shop-detail-description">{selected.description}</p>{selected.preparation && <div className="shop-inline-note">{selected.preparation}</div>}{selected.requiresPrescription ? <div className="wf-notice">Prescription review is not connected. You can store your prescription in your records and contact a care provider.<button className="health-text-button" onClick={() => navigate('records')}>Open health records</button></div> : <button className="shop-button shop-primary" disabled={selected.kind === 'product' && selected.stock === 0} onClick={() => add(selected)}>Add to cart</button>}<p className="wf-fineprint">Requests are saved to your account. A provider must confirm availability and arrangements.</p></div></div></ShopDialog>}
    {article && <ShopDialog title={article.title} onClose={() => setArticle(null)}><article className="shop-article-detail"><span className="shop-eyebrow">{article.tag} · {article.readTime}</span><h3>{article.title}</h3>{article.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}<div className="shop-inline-note"><HeartPulse size={19} />General wellbeing information, not a personalised medical assessment.</div></article></ShopDialog>}
    {cartOpen && <ShopDialog title="Your care cart" onClose={() => setCartOpen(false)} wide><LiveCheckout onClose={() => setCartOpen(false)} onSuccess={result => { cart.clear(); setCartOpen(false); setOrder(result); resource.reload(); }} /></ShopDialog>}
    {order && <ShopDialog title="Request received" onClose={() => setOrder(null)}><div className="shop-order-success"><ShieldCheck size={40} /><h3>Your request has been saved.</h3><p>Reference {order.id.slice(0, 8).toUpperCase()}. Your provider will review the request. No payment has been collected and a requested appointment time is not yet confirmed.</p><p><strong>{money(order.totalPaise)}</strong> · Requested items total</p><button className="shop-button shop-primary" onClick={() => navigate('orders')}>Track my request <ArrowRight size={16} /></button></div></ShopDialog>}
  </div>;
}

function LiveCheckout({ onClose, onSuccess }: { onClose: () => void; onSuccess: (order: LiveOrder) => void }) {
  const { user } = useAuth();
  const cart = useLiveCart();
  const [delivery, setDelivery] = useState<Delivery>({ mode: 'pickup', address: '', city: '', pincode: '' });
  const [slot, setSlot] = useState('');
  const [cartNotice, setCartNotice] = useState('');
  const key = useRef({ fingerprint: '', id: '' });
  const mutation = useMutation();
  const needsSlot = cart.lines.some(line => line.item.kind !== 'product');
  const total = cart.lines.reduce((sum, line) => sum + line.item.pricePaise * line.quantity, 0);
  const submit = async () => {
    // Validate against live inventory and serviceability before submitting.
    try {
      const validation = await apiRequest<{ serviceable: boolean; serviceabilityNote?: string; items: { id: string; available: boolean; reason: string }[] }>('/cart/validate', { method: 'POST', body: JSON.stringify({ items: cart.lines.map(line => ({ id: line.item.id, quantity: line.quantity })), pincode: delivery.pincode }) });
      const blocked = validation.items.filter(item => !item.available);
      if (blocked.length || !validation.serviceable) {
        setCartNotice(blocked.length ? `Some items are unavailable: ${blocked.map(item => item.reason).join(', ')}. Refresh the catalog.` : (validation.serviceabilityNote || 'This pincode is not serviceable.'));
        return;
      }
    } catch (e: any) {
      setCartNotice(e?.message || 'Could not validate your cart.');
      return;
    }
    const payload = { items: cart.lines.map(line => ({ id: line.item.id, quantity: line.quantity })), delivery, requestedSlot: needsSlot ? new Date(slot).toISOString() : '' };
    const fingerprint = JSON.stringify(payload);
    if (key.current.fingerprint !== fingerprint) key.current = { fingerprint, id: crypto.randomUUID() };
    mutation.run(() => apiRequest<LiveOrder>('/orders', { method: 'POST', headers: { 'Idempotency-Key': key.current.id }, body: fingerprint }), onSuccess);
  };
  if (!cart.lines.length) return <EmptyState title="Your cart is empty." description="Explore the available catalog and add a product or care service." action="Keep exploring" onAction={onClose} />;
  return <div className="shop-cart-grid"><div><div className="shop-cart-items">{cart.lines.map(line => <article className="shop-cart-item" key={line.item.id}><div className="shop-cart-art"><ProductArtwork item={artworkFor(line.item)} /></div><div className="shop-cart-item-info"><strong>{line.item.name}</strong><span>{line.item.pack}</span><b>{money(line.item.pricePaise * line.quantity)}</b>{line.item.kind === 'product' && <div className="shop-quantity"><button aria-label={`Decrease ${line.item.name}`} onClick={() => cart.setQuantity(line.item.id, line.quantity - 1)}><Minus size={13} /></button><output>{line.quantity}</output><button aria-label={`Increase ${line.item.name}`} disabled={line.quantity >= Math.min(line.item.stock, 10)} onClick={() => cart.add(line.item)}><Plus size={13} /></button></div>}</div><button className="shop-icon-button shop-remove-item" aria-label={`Remove ${line.item.name}`} onClick={() => cart.setQuantity(line.item.id, 0)}><Trash2 size={15} /></button></article>)}</div><p className="wf-fineprint">Your cart stays in this browser session. Submitted requests are saved to your account.</p></div><section className="shop-order-summary"><h3>Request arrangements</h3><div className="shop-total"><span>Items total</span><strong>{money(total)}</strong></div>{!user ? <><p>Sign in to send a request and track provider updates.</p><button className="shop-button shop-primary wf-submit" onClick={() => navigate('login', 'checkout')}>Sign in to continue <ArrowRight size={15} /></button></> : <form className="wf-form" onSubmit={event => { event.preventDefault(); submit(); }}><FormError message={mutation.error} />{cartNotice && <div className="wf-notice" role="alert"><AlertTriangle size={16} />{cartNotice}</div>}<Field label="Arrangement"><select value={delivery.mode} onChange={event => setDelivery(previous => ({ ...previous, mode: event.target.value as Delivery['mode'] }))}><option value="pickup">At provider / pickup</option><option value="delivery">Home delivery / collection</option></select></Field>{delivery.mode === 'delivery' && <Field label="Full address"><textarea required minLength={10} maxLength={300} value={delivery.address} onChange={event => setDelivery(previous => ({ ...previous, address: event.target.value }))} /></Field>}<Field label="City"><input required minLength={2} maxLength={100} value={delivery.city} onChange={event => setDelivery(previous => ({ ...previous, city: event.target.value }))} /></Field><Field label="Pincode"><input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={delivery.pincode} onChange={event => setDelivery(previous => ({ ...previous, pincode: event.target.value }))} /></Field>{needsSlot && <Field label="Requested date and time"><input required type="datetime-local" value={slot} onChange={event => setSlot(event.target.value)} /></Field>}<p className="wf-fineprint">The provider must confirm the requested time and any delivery charges. Payment is arranged with the provider; no online payment is collected here.</p><SubmitButton busy={mutation.busy}>Send order request</SubmitButton></form>}</section></div>;
}
