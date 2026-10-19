import React, { useEffect, useMemo, useRef, useState } from 'react';
import { pressable } from '@/lib/a11y/pressable';
import { Activity, AlertTriangle, Apple, ArrowLeft, ArrowRight, BadgePercent, Bandage, Bone, Clock3, Droplets, Dumbbell, Eye, FileText, FlaskConical, HeartPulse, Leaf, Minus, Moon, Pause, Pill, Play, Plus, Search, ShieldCheck, ShoppingBag, Soup, Sparkles, Stethoscope, Syringe, Trash2, UserRound, UploadCloud, Calendar, Wind, X } from 'lucide-react';
import { useApiResource } from '../../hooks/api/useApiResource';
import { useAuth } from '../../data/contexts/AuthContext';
import { useLiveCart } from '../../data/contexts/LiveCartContext';
import { HomeArticle, HomeContent, LiveCatalogItem, Delivery, LiveOrder, discountPercent, money } from '../../data/types/workflowTypes';
import { apiRequest } from '../../data/services/http';
import { homeForRole, navigate, RoutePath } from '../../lib/utils/workflowRouting';
import { EmptyState, Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { StudentKareLogo } from '../../components/StudentKareLogo';
import { ShopFront } from './ShopFront';
import { ProductArtwork } from '../../components/marketplace/ProductArtwork';
import { StorefrontCollections, StorefrontHero, StorefrontLabHeading } from '../../components/marketplace/StorefrontDiscovery';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { useScrollReveal } from '../../hooks/ui/useScrollReveal';
import { useInterface } from '../../theme/providers/InterfaceProvider';
import '../../theme/marketplace.css';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

import { EmergencyBar } from '../../components/health/EmergencyBar';
import { LabBookingOverlay } from '../../features/labBooking/views/LabBookingOverlay';
import { ProviderResources } from '../../features/preventive/screens/ProviderResources';
import { PayStepViewModel } from '../../features/payments/viewmodel/PayStepViewModel';
import { PayStepView } from '../../features/payments/views/PayStepView';
import { matchesCatalogQuery } from '../../features/marketplace/data/catalogSearch';
import '../../features/preventive/screens/preventive.css';
import '../../theme/storefront.css';

const categories = ['vitamins', 'skin', 'devices', 'nutrition', 'first-aid', 'ayurveda', 'medicines', 'labs', 'general-care', 'diabetes', 'heart', 'stomach', 'liver', 'bone-joint', 'kidney', 'respiratory', 'eye', 'vaccines'];
const healthConcerns = ['diabetes', 'heart', 'stomach', 'liver', 'bone-joint', 'kidney', 'skin', 'respiratory', 'eye', 'vaccines'] as const;
/** Every id in `categories` has a `shopweb.category.<id>` label; anything else (a server value) shows as-is. */
const categoryLabel = (t: (key: MessageKey) => string, value: string) => categories.includes(value) ? t(`shopweb.category.${value}` as MessageKey) : value.replace(/-/g, ' ');
const kindLabel = (t: (key: MessageKey) => string, kind: string) => ['product', 'lab', 'consultation', 'vaccine'].includes(kind) ? t(`shopweb.kind.${kind}` as MessageKey) : kind;
/** The cart refuses these (LiveCartContext); say so instead of announcing an add that did not happen. */
const cannotAdd = (item: LiveCatalogItem) => item.requiresPrescription || (item.kind === 'product' && item.stock < 1);
const artworkFor = (item: LiveCatalogItem) => ({ name: item.name, brand: item.brand, artLabel: item.name.slice(0, 17), color: item.kind === 'lab' ? '#8d7cbc' : item.kind === 'vaccine' ? '#8fb8a8' : item.category === 'skin' ? '#c49181' : item.category === 'nutrition' ? '#ae976a' : '#679c8a', shape: item.kind !== 'product' ? 'lab' as const : item.category === 'devices' ? 'device' as const : /jar/i.test(item.pack) ? 'jar' as const : /tube/i.test(item.pack) ? 'tube' as const : /bottle|vial/i.test(item.pack) ? 'bottle' as const : 'box' as const });
const contentTarget = (target: string): RoutePath => (['shop', 'care', 'health', 'records', 'insurance', 'orders', 'support', 'movement'].includes(target) ? target as RoutePath : 'health');
const contentIcon = (icon: string, size = 22) => icon === 'flask' ? <FlaskConical size={size} /> : icon === 'heart' ? <HeartPulse size={size} /> : icon === 'shield' ? <ShieldCheck size={size} /> : icon === 'activity' ? <Activity size={size} /> : icon === 'help' ? <Stethoscope size={size} /> : <FileText size={size} />;
const categoryIcons = { labs: FlaskConical, devices: Activity, skin: Sparkles, vitamins: HeartPulse, nutrition: Apple, 'first-aid': Bandage, ayurveda: Leaf, medicines: Pill, 'general-care': Stethoscope, diabetes: Droplets, heart: HeartPulse, stomach: Soup, liver: Droplets, 'bone-joint': Bone, kidney: Droplets, respiratory: Wind, eye: Eye, vaccines: Syringe };
const categoryIcon = (category: string) => {
  const Icon = categoryIcons[category as keyof typeof categoryIcons] || HeartPulse;
  return <Icon size={24} strokeWidth={1.7} aria-hidden="true" />;
};

const promoHeadlines = ['shopweb.promo.headline1', 'shopweb.promo.headline2', 'shopweb.promo.headline3'] as const;

function PromoCarousel({ items, onSelect, onAdd }: { items: LiveCatalogItem[]; onSelect: (item: LiveCatalogItem) => void; onAdd: (item: LiveCatalogItem) => void }) {
  const t = useT();
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
  const percent = discountPercent(item.mrpPaise, item.pricePaise);
  return <section className="shop-container wf-promo-carousel" aria-label={t('shopweb.promo.region')} aria-roledescription="carousel" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setPaused(true)}>
    <div className="wf-promo-slide" key={item.id} style={{ '--promo-tint': `${colour}24`, '--promo-color': colour } as React.CSSProperties}>
      <div className="wf-promo-copy"><span className="shop-eyebrow">{t('shopweb.promo.eyebrow')}</span><h2>{t(promoHeadlines[index % promoHeadlines.length])}</h2><h3>{item.name}</h3><p>{item.pack}{percent > 0 && <> · <strong>{t('shopweb.percentOff', { percent })}</strong></>}</p><div className="wf-promo-price">{percent > 0 && <del>{money(item.mrpPaise)}</del>}<strong>{money(item.pricePaise)}</strong></div><button type="button" className="shop-button shop-primary" disabled={item.stock < 1} onClick={() => onAdd(item)}>{t('shop.add')} <ArrowRight size={15} aria-hidden="true" /></button></div>
      <button type="button" className="wf-promo-art" aria-label={t('shopweb.view', { name: item.name })} onClick={() => onSelect(item)}><ProductArtwork item={artworkFor(item)} /></button>
    </div>
    <div className="wf-promo-controls">{featured.map((entry, i) => <button type="button" key={entry.id} aria-label={t('shopweb.promo.show', { n: i + 1 })} aria-current={activeIndex === i} onClick={() => { setIndex(i); setPaused(true); }} />)}{featured.length > 1 && !reducedMotion && <button type="button" className="wf-promo-play" aria-label={paused ? t('shopweb.promo.play') : t('shopweb.promo.pause')} onClick={() => setPaused(value => !value)}>{paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}</button>}</div>
  </section>;
}

function FeaturedBrands({ items, onBrand }: { items: LiveCatalogItem[]; onBrand: (brand: string) => void }) {
  const t = useT();
  const catalogSource = items;
  const brands = Array.from(new Set(catalogSource.filter(item => item.kind === 'product').map(item => item.brand))).slice(0, 5);
  if (!brands.length) return null;
  return <section className="shop-section shop-container storefront-brands"><div className="shop-section-heading"><div><span className="shop-eyebrow">{t('shopweb.brands.eyebrow')}</span><h2>{t('shopweb.brands.title')}</h2></div><span className="storefront-section-note">{t('shopweb.brands.note')}</span></div><div className="shop-brands">{brands.map((brand, index) => <button type="button" key={brand} className={`shop-brand shop-brand-${index % 5}`} aria-label={t('shopweb.brands.browse', { brand })} onClick={() => onBrand(brand)}><span className="storefront-brand-art" aria-hidden="true"><ProductArtwork item={artworkFor(catalogSource.find(item => item.kind === 'product' && item.brand === brand)!)} /></span><strong>{brand}</strong><small>{t('shopweb.brands.explore')} <ArrowRight size={12} aria-hidden="true" /></small></button>)}</div></section>;
}

function OffersBanner({ onShop }: { onShop: () => void }) {
  const t = useT();
  return <section className="shop-container shop-offer-banners"><div className="shop-prescription-banner"><span className="shop-large-icon"><FileText size={35} strokeWidth={1.4} aria-hidden="true" /></span><div><h3>{t('shopweb.offers.recordsTitle')}</h3><p>{t('shopweb.offers.recordsBody')}</p></div><button type="button" className="shop-button" onClick={() => navigate('records')}>{t('shopweb.openRecords')} <ArrowRight size={15} aria-hidden="true" /></button></div><div className="shop-saving-banner"><BadgePercent size={35} aria-hidden="true" /><div><span className="shop-eyebrow">{t('shopweb.offers.eyebrow')}</span><h3>{t('shopweb.offers.title')}</h3><p>{t('shopweb.offers.body')}</p></div><button type="button" className="shop-icon-button" aria-label={t('shopweb.offers.browseAll')} onClick={onShop}><ArrowRight size={21} aria-hidden="true" /></button></div></section>;
}

function LabPackageShelf({ onBook, onBrowse }: { onBook: (item: LiveCatalogItem) => void; onBrowse: () => void }) {
  const t = useT();
  const resource = useApiResource<{ items: LiveCatalogItem[] }>('/catalog?kind=lab&limit=4&offset=0');
  const items = resource.data?.items ?? [];
  if (!items.length) return null;

  return <section className="shop-section shop-container storefront-labs" aria-label={t('shopweb.labs.region')}>
    <div className="shop-section-heading"><div><span className="shop-eyebrow">{t('shopweb.labs.eyebrow')}</span><h2>{t('shopweb.labs.title')}</h2></div><button type="button" className="shop-text-button" onClick={onBrowse}>{t('shopweb.labs.seeAll')}<ArrowRight size={16} aria-hidden="true" /></button></div>
    <div className="shop-lab-grid">{items.map(item => <article className="shop-lab-card" key={item.id}>
      <div className="shop-lab-top"><span className="storefront-test-icon"><FlaskConical size={24} aria-hidden="true" /></span>{discountPercent(item.mrpPaise, item.pricePaise) > 0 && <span className="shop-discount">{t('shopweb.percentOffBadge', { percent: discountPercent(item.mrpPaise, item.pricePaise) })}</span>}</div>
      <h3>{item.name}</h3><p>{item.pack}</p><span className="storefront-lab-provider">{item.brand}</span>
      <div className="shop-lab-footer"><div>{item.mrpPaise > item.pricePaise && <del>{money(item.mrpPaise)}</del>}<strong>{money(item.pricePaise)}</strong></div><button type="button" className="shop-add" onClick={() => onBook(item)} aria-label={t('shopweb.labs.viewSlotsFor', { name: item.name })}>{t('shopweb.labs.viewSlots')}<ArrowRight size={14} aria-hidden="true" /></button></div>
    </article>)}</div>
    <StorefrontLabHeading />
  </section>;
}

export function LiveMarketplaceScreen({ care = false, checkout = false, shop = false }: { care?: boolean; checkout?: boolean; /** /shop: the WebShop layout — banner, category tiles, then the catalog. */ shop?: boolean }) {
  const t = useT();
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

  // Search Inventory Pop-up State
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const root = useRef<HTMLDivElement>(null);
  const catalog = useRef<HTMLElement>(null);
  const { reducedMotion } = useInterface();
  const [notice, setNotice] = useState('');
  useScrollReveal(root);
  useEffect(() => { const timer = window.setTimeout(() => setDebouncedQuery(query), 250); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 2500); return () => window.clearTimeout(timer); }, [notice]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const resource = useApiResource<{ items: LiveCatalogItem[]; total: number }>(`/catalog?limit=12&offset=${page * 12}${kind !== 'all' ? `&kind=${kind}` : ''}${category !== 'all' ? `&category=${encodeURIComponent(category)}` : ''}&query=${encodeURIComponent(debouncedQuery)}`);
  const content = useApiResource<HomeContent>('/home');
  const count = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
  const browse = (nextKind: string) => { setKind(nextKind); setCategory('all'); setQuery(''); setPage(0); };
  const jumpToCatalog = () => window.requestAnimationFrame(() => catalog.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' }));
  /** A lab test is booked (slot, address, pay) as a lab order; signing in comes first. */
  const bookLab = (item: LiveCatalogItem) => { if (user) setLabSlotItem(item); else navigate('login', 'shop'); };
  const add = (item: LiveCatalogItem) => {
    if (item.kind === 'lab') { bookLab(item); return; }
    if (cannotAdd(item)) { setNotice(t('shopweb.notice.cannotAdd', { name: item.name })); return; }
    cart.add(item);
    setNotice(t('shopweb.notice.added', { name: item.name }));
  };
  const movement = content.data?.movement[0];
  const selectCategory = (value: string) => { setCategory(value || 'all'); setKind(value === 'labs' ? 'lab' : value === 'general-care' ? 'consultation' : 'product'); setQuery(''); setPage(0); jumpToCatalog(); };

  const catalogList = resource.data?.items ?? [];
  const inventoryMatches = catalogList.filter(item => matchesCatalogQuery(item, query));

  // One set of catalog type filters: its own row on home, inline with the heading on /shop (WebShop board).
  const catalogTabs = <div className="wf-choice-row wf-catalog-tabs" role="group" aria-label={t('shopweb.tabs.label')}>
    {(['all', 'product', 'lab', 'consultation', 'vaccine'] as const).map(id => (
      <button type="button" key={id} aria-pressed={kind === id} onClick={() => browse(id)}>{t(`shopweb.tabs.${id}`)}</button>
    ))}
  </div>;

  return <div ref={root} className="shop shop-marketplace wf-live-marketplace shop-storefront">
    <div className="storefront-announcement"><div className="shop-container"><span><HeartPulse size={14} aria-hidden="true" />{t('shopweb.announcement')}</span><button type="button" onClick={() => navigate('pricing')}>{t('shopweb.explorePlans')}<ArrowRight size={14} aria-hidden="true" /></button></div></div>
    <header className="shop-header">
      <div className="shop-container shop-header-main">
        <button type="button" className="shop-logo-button" onClick={() => { navigate('shop'); browse('all'); }} aria-label={t('shopweb.homeLabel')}>
          <StudentKareLogo size={33} showStrapline={false} />
        </button>
        <nav className="wf-market-nav" aria-label={t('shopweb.nav.label')}>
          <button type="button" aria-pressed={kind === 'all'} onClick={() => browse('all')}>{t('shopweb.nav.discover')}</button>
          <button type="button" aria-pressed={kind === 'product'} onClick={() => browse('product')}><Pill size={16} aria-hidden="true" />{t('shopweb.nav.wellness')}</button>
          <button type="button" aria-pressed={kind === 'lab'} onClick={() => browse('lab')}><FlaskConical size={16} aria-hidden="true" />{t('shopweb.nav.labs')}</button>
          <button type="button" aria-pressed={kind === 'consultation'} onClick={() => browse('consultation')}><Stethoscope size={16} aria-hidden="true" />{t('shopweb.nav.doctor')}</button>
          <button type="button" onClick={() => navigate('movement')}><Dumbbell size={16} aria-hidden="true" />{t('shopweb.nav.movement')}</button>
          <button type="button" onClick={() => navigate('pricing')}><ShieldCheck size={16} aria-hidden="true" />{t('shopweb.nav.plans')}</button>
        </nav>
        <div className="shop-header-tools">
          <button type="button" className="shop-account" onClick={() => navigate(user ? homeForRole(user.role) : 'login')}>
            <UserRound size={18} aria-hidden="true" />
            <span>{user ? t('shopweb.account.workspace') : t('shopweb.account.signIn')}</span>
          </button>
          <button type="button" className="shop-cart-button" aria-label={t('shopweb.openCart', { count })} onClick={() => setCartOpen(true)}>
            <ShoppingBag size={21} aria-hidden="true" />
            {count > 0 && <span className="shop-cart-count">{count}</span>}
          </button>
        </div>
      </div>
      <div className="shop-container wf-live-search">
        <div className="shop-search-inventory-wrapper" ref={searchWrapperRef}>
          <label className="shop-search">
            <Search size={20} aria-hidden="true" />
            <input
              aria-label={t('shopweb.search.label')}
              type="search"
              value={query}
              onFocus={() => setIsSearchFocused(true)}
              onChange={event => { setQuery(event.target.value); setPage(0); setIsSearchFocused(true); }}
              placeholder={t('shopweb.search.placeholder')}
            />
            {query && (
              <button
                type="button"
                className="shop-icon-button"
                aria-label={t('shopweb.search.clear')}
                onClick={() => { setQuery(''); setPage(0); }}
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </label>

          {isSearchFocused && (
            <div className="shop-search-inventory-popup">
              <div className="shop-search-inventory-header">
                <div>
                  <span className="shop-search-inventory-tag">
                    <Sparkles size={13} aria-hidden="true" /> {t('shopweb.search.tag')}
                  </span>
                  <h4>{t('shopweb.search.title')}</h4>
                </div>
                <button
                  type="button"
                  className="shop-search-inventory-close"
                  onClick={() => setIsSearchFocused(false)}
                  aria-label={t('shopweb.search.close')}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              <div className="shop-search-inventory-quick">
                <span className="shop-search-inventory-label">{t('shopweb.search.suggestions')}</span>
                <div className="shop-search-inventory-pills">
                  {['Paracetamol 650', 'Full Body Checkup', 'Vitamin D3', 'Doctor Consult', 'First Aid', 'Derma Care'].map(term => (
                    <button
                      key={term}
                      type="button"
                      className="shop-search-inventory-pill"
                      onClick={() => { setQuery(term); setPage(0); setKind('all'); }}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              <div className="shop-search-inventory-results">
                <div className="shop-search-inventory-results-header">
                  <span>{t('shopweb.search.count', { count: inventoryMatches.length })}</span>
                  {query && (
                    <button type="button" className="shop-search-inventory-clear-query" onClick={() => setQuery('')}>
                      {t('shopweb.search.showAll')}
                    </button>
                  )}
                </div>

                {inventoryMatches.length === 0 ? (
                  <div className="shop-search-inventory-empty">
                    <Pill size={24} color="var(--sk-color-text-3)" aria-hidden="true" />
                    <p>{t('shopweb.search.empty', { query })}</p>
                  </div>
                ) : (
                  <div className="shop-search-inventory-list">
                    {inventoryMatches.slice(0, 5).map(item => (
                      <div key={item.id} className="shop-search-inventory-item">
                        <div className="shop-search-inventory-item-art">
                          <ProductArtwork item={artworkFor(item)} />
                        </div>
                        <div className="shop-search-inventory-item-info">
                          <div className="shop-search-inventory-item-badges">
                            <span className={`shop-search-category-badge badge-${item.kind}`}>
                              {kindLabel(t, item.kind)}
                            </span>
                            {/* Was a fixed "In Stock · Fast Dispatch" on every row, true or not. */}
                            <span className="shop-search-stock-badge">{item.kind === 'product' ? (item.stock > 0 ? t('shopweb.search.inStock', { count: item.stock }) : t('shop.outOfStock')) : t('shopweb.search.providerBooking')}</span>
                          </div>
                          <strong>{item.name}</strong>
                          <small>{item.brand}</small>
                          <div className="shop-search-inventory-item-price">
                            <strong>{money(item.pricePaise)}</strong>
                            {item.mrpPaise > item.pricePaise && (
                              <>
                                <del>{money(item.mrpPaise)}</del>
                                <span className="shop-search-discount">{t('shopweb.percentOff', { percent: discountPercent(item.mrpPaise, item.pricePaise) })}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="shop-search-inventory-item-action">
                          <button
                            type="button"
                            className="shop-button shop-button-sm"
                            disabled={cannotAdd(item)}
                            aria-label={t('shop.addSpoken', { name: item.name })}
                            onClick={() => { add(item); setIsSearchFocused(false); }}
                          >
                            <Plus size={14} aria-hidden="true" /> {t('shop.add')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="shop-search-inventory-footer">
                <div
                  className="shop-search-inventory-rx-cta"
                  {...pressable(() => { setIsSearchFocused(false); navigate('prescriptions'); })}
                >
                  <UploadCloud size={18} aria-hidden="true" />
                  <span>{t('shopweb.search.rxCta')}</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </div>
              </div>
            </div>
          )}
        </div>
        <button type="button" className="shop-prescription-shortcut" onClick={() => navigate('prescriptions')}>
          <UploadCloud size={21} aria-hidden="true" />
          <span>{t('shopweb.rx.question')}<strong>{t('shopweb.rx.action')} <ArrowRight size={14} aria-hidden="true" /></strong></span>
        </button>
      </div>
      <nav className="shop-category-nav" aria-label={t('shopweb.catnav.label')}><div className="shop-container">{
        ['vitamins', 'skin', 'nutrition', 'devices', 'ayurveda', 'first-aid', 'medicines'].map(value => <button type="button" key={value} aria-pressed={category === value} onClick={() => selectCategory(value)}>{categoryLabel(t, value)}</button>)}<button type="button" onClick={() => { browse('vaccine'); jumpToCatalog(); }}>{t('shopweb.category.vaccines')}<ArrowRight size={13} aria-hidden="true" /></button></div></nav>
    </header>

    <main>
      <div className="shop-container">
        <EmergencyBar compact />
      </div>

      {kind === 'all' && !query && page === 0 && shop && <ShopFront
        onCategory={selectCategory}
        onConcern={concern => { setCategory(concern); setKind('all'); setQuery(''); setPage(0); jumpToCatalog(); }}
        onPrescription={() => navigate('prescriptions')}
        onLabs={() => { browse('lab'); jumpToCatalog(); }}
        onVaccines={() => { browse('vaccine'); jumpToCatalog(); }}
        onRefill={() => navigate('refill-request')}
      />}
      {kind === 'all' && !query && page === 0 && !shop && <><StorefrontHero onCategory={selectCategory} onLabs={() => { browse('lab'); jumpToCatalog(); }} onPlans={() => navigate('pricing')} />
      <div className="shop-container care-service-grid" role="group" aria-label={t('shopweb.shortcuts.label')}>
        {[
          { id: 'wellness', icon: Pill, title: t('shopweb.shortcuts.wellnessTitle'), description: t('shopweb.shortcuts.wellnessBody'), action: () => { browse('product'); jumpToCatalog(); } },
          { id: 'lab', icon: FlaskConical, title: t('shopweb.shortcuts.labTitle'), description: t('shopweb.shortcuts.labBody'), action: () => { browse('lab'); jumpToCatalog(); } },
          { id: 'doctor', icon: Stethoscope, title: t('shopweb.shortcuts.doctorTitle'), description: t('shopweb.shortcuts.doctorBody'), action: () => { browse('consultation'); jumpToCatalog(); } },
          { id: 'cover', icon: ShieldCheck, title: t('shopweb.shortcuts.coverTitle'), description: t('shopweb.shortcuts.coverBody'), action: () => navigate('insurance') },
        ].map(({ id, icon: Icon, title, description, action }) => <button type="button" key={id} onClick={action}><span className="care-service-icon"><Icon size={24} strokeWidth={1.7} aria-hidden="true" /></span><span><strong>{title}</strong><small>{description}</small></span><ArrowRight size={17} aria-hidden="true" /></button>)}
      </div>
      <section className="shop-section shop-container storefront-concern-section" aria-label={t('shopweb.concerns.label')}>
        <div className="shop-section-heading"><div><span className="shop-eyebrow">{t('shopweb.concerns.eyebrow')}</span><h2>{t('shopweb.concerns.title')}</h2></div></div>
        <div className="shop-concerns">{healthConcerns.map(concern => <button type="button" key={concern} aria-pressed={category === concern} onClick={() => { setCategory(concern); setKind('all'); setQuery(''); setPage(0); jumpToCatalog(); }}><span>{categoryIcon(concern)}</span><strong>{t(`shopweb.concern.${concern}`)}</strong></button>)}</div>
      </section>
      <StorefrontCollections active={category} onSelect={selectCategory} />
      <LabPackageShelf onBook={bookLab} onBrowse={() => { browse('lab'); jumpToCatalog(); }} />
      <PromoCarousel items={resource.data?.items || []} onSelect={setSelected} onAdd={add} />
      <FeaturedBrands items={resource.data?.items || []} onBrand={brand => { setQuery(brand); setPage(0); setCategory('all'); jumpToCatalog(); }} />
      <OffersBanner onShop={() => { browse('all'); jumpToCatalog(); }} /></>}

      <section className="shop-section shop-container" ref={catalog} id="care-catalog" tabIndex={-1}>
        {!shop && content.data?.features?.length ? <div className="shop-trust-strip" role="group" aria-label={t('shopweb.catalog.features')}>{content.data.features.map(feature => <div key={feature.key}><span aria-hidden="true">{contentIcon(feature.icon, 23)}</span><span><strong>{feature.title}</strong><small>{feature.body}</small></span></div>)}</div> : null}
        <div className={`shop-section-heading${shop ? ' sk-shop-catalog-head' : ''}`}>
          <div>
            {!shop && <span className="shop-eyebrow">{t('shopweb.catalog.eyebrow')}</span>}
            <h2>{kind === 'lab' || kind === 'consultation' || kind === 'vaccine' || kind === 'product' ? t(`shopweb.catalog.heading.${kind}`) : shop ? t('shopweb.catalog.heading.shopAll') : t('shopweb.catalog.heading.all')}</h2>
            <p>{resource.data ? (shop ? t('shopweb.catalog.countShop', { count: resource.data.total }) : t('shopweb.catalog.count', { count: resource.data.total })) : t('shopweb.catalog.loading')}</p>
          </div>
          {shop && catalogTabs}
          <Field label={t('shopweb.catalog.category')}>
            <select value={category} onChange={event => { setCategory(event.target.value); setPage(0); }}>
              <option value="all">{t('shopweb.catalog.allCategories')}</option>
              {categories.map(value => <option key={value} value={value}>{categoryLabel(t, value)}</option>)}
            </select>
          </Field>
        </div>

        {!shop && catalogTabs}
        {(category !== 'all' || query) && <div className="storefront-active-filter"><span>{t('shopweb.filter.showing', { what: query ? `“${query}”` : categoryLabel(t, category) })}</span><button type="button" className="shop-text-button" onClick={() => browse('all')}>{t('shopweb.filter.clear')}<X size={14} aria-hidden="true" /></button></div>}

        {(() => {
          const displayItems = resource.data?.items ?? [];

          if (resource.error) return (
            <div className="wf-state wf-state-error" role="alert">
              <h3>{t('shopweb.catalog.errorTitle')}</h3>
              <p>{resource.error}</p>
              <button type="button" className="health-button" onClick={resource.reload}>{t('common.tryAgain')}</button>
            </div>
          );

          return displayItems.length ? (
            <div className="shop-product-grid wf-live-product-grid">
              {displayItems.map(item => (
                <article className="shop-product-card" key={item.id}>
                  <button type="button" className="shop-product-visual" aria-label={t('shopweb.view', { name: item.name })} onClick={() => setSelected(item)}>
                    {discountPercent(item.mrpPaise, item.pricePaise) > 0 && <span className="shop-discount">{t('shopweb.percentOffBadge', { percent: discountPercent(item.mrpPaise, item.pricePaise) })}</span>}
                     <ProductArtwork item={artworkFor(item)} imageUrl={item.imageUrl} />
                     <span className="storefront-art-label">{item.imageUrl ? t('shopweb.card.photo') : t('shopweb.card.illustration')}</span>
                  </button>
                  <div className="shop-product-content">
                    <span className="shop-product-brand">{item.brand}</span>
                    <button type="button" className="shop-product-title" onClick={() => setSelected(item)}>{item.name}</button>
                    <p className="shop-product-pack">{item.pack}</p>
                    <div className="shop-price-row">
                      <strong>{money(item.pricePaise)}</strong>
                      {item.mrpPaise > item.pricePaise && <del>{money(item.mrpPaise)}</del>}
                    </div>
                    <span className="wf-fineprint">
                      {item.kind === 'product' ? (item.stock > 0 ? t('shopweb.card.available', { count: item.stock }) : t('shop.outOfStock')) : item.kind === 'vaccine' ? t('shopweb.card.eligibility') : t('shopweb.card.providerBooking')}
                    </span>
                    <div className="shop-product-bottom">
                      <span>{item.requiresPrescription ? t('shopweb.card.rxRequired') : kindLabel(t, item.kind)}</span>
                      {item.kind === 'lab' ? (
                        <button
                          type="button"
                          className="shop-add"
                          onClick={() => bookLab(item)}
                          style={{ background: 'var(--sk-color-positive-bg)', color: 'var(--sk-color-positive)', borderColor: 'var(--sk-color-positive)' }}
                        >
                          <Calendar size={13} aria-hidden="true" /> {t('shopweb.card.bookSlot')}
                        </button>
                      ) : (
                        <button type="button" className="shop-add" disabled={cannotAdd(item)} onClick={() => add(item)} aria-label={t('shop.addSpoken', { name: item.name })}>
                          <Plus size={14} aria-hidden="true" />{cart.lines.some(line => line.item.id === item.id) ? t('shopweb.card.inCart') : t('shopweb.card.add')}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title={query || category !== 'all' ? t('shopweb.empty.filteredTitle') : t('shopweb.empty.title')} description={query || category !== 'all' ? t('shopweb.empty.filteredBody') : t('shopweb.empty.body')} />
          );
        })()}

        {!!resource.data?.total && (
          <div className="wf-pagination">
            <button type="button" className="health-button" disabled={page === 0} onClick={() => setPage(value => value - 1)}><ArrowLeft size={14} aria-hidden="true" />{t('shopweb.page.previous')}</button>
            <span>{t('shopweb.page.of', { page: page + 1, pages: Math.ceil(resource.data.total / 12) })}</span>
            <button type="button" className="health-button" disabled={(page + 1) * 12 >= resource.data.total} onClick={() => setPage(value => value + 1)}>{t('shopweb.page.next')}<ArrowRight size={14} aria-hidden="true" /></button>
          </div>
        )}
        {shop && <p className="sk-shopfront__note">{t('shopweb.shopNote')}</p>}
      </section>

      {!shop && <div className="shop-section shop-container"><ProviderResources /><section className="wf-card preventive-section"><div className="wf-panel-heading"><div><span className="care-eyebrow">{t('shopweb.preventive.eyebrow')}</span><h3>{t('shopweb.preventive.title')}</h3><p>{t('shopweb.preventive.body')}</p></div><button type="button" className="health-button" onClick={() => navigate('preventive-care')}>{t('shopweb.preventive.open')}<ArrowRight size={16} aria-hidden="true" /></button></div></section></div>}

      {!shop && movement && <section className="shop-container shop-movement-invite"><span>{contentIcon(movement.icon || 'activity', 27)}</span><div><span className="shop-eyebrow">{movement.eyebrow}</span><h3>{movement.title}</h3><p>{movement.body}</p></div><button type="button" className="shop-button" onClick={() => navigate(contentTarget(movement.target || 'movement'))}>{movement.action || t('shopweb.movement.explore')} <ArrowRight size={16} aria-hidden="true" /></button></section>}
      {!shop && !!content.data?.links?.length && <section className="shop-container wf-market-links">{content.data.links.map(link => <button type="button" key={link.key} onClick={() => navigate(contentTarget(link.target))}>{contentIcon(link.icon, 25)}<strong>{link.title}</strong><span>{link.body}</span></button>)}</section>}
      {!shop && !!content.data?.articles?.length && <section className="shop-section shop-container"><div className="shop-section-heading"><div><span className="shop-eyebrow">{t('shopweb.articles.eyebrow')}</span><h2>{t('shopweb.articles.title')}</h2></div></div><div className="shop-articles">{content.data.articles.map((item, index) => <button type="button" key={item.id} className="shop-article" onClick={() => setArticle(item)}><div className={`shop-article-art article-${index}`} style={{ backgroundColor: item.color }}><span>{index === 0 ? <Moon size={55} strokeWidth={1} /> : index === 1 ? <HeartPulse size={55} strokeWidth={1} /> : <Sparkles size={55} strokeWidth={1} />}</span><span className="shop-article-shape" /><span className="shop-article-small-shape" /></div><div className="shop-article-body"><span className="shop-eyebrow">{item.tag}</span><h3>{item.title}</h3><span><Clock3 size={12} />{item.readTime}<ArrowRight size={16} /></span></div></button>)}</div></section>}
    </main>

    <footer className="shop-footer">
      <div className="shop-container">
        <div className="shop-footer-grid">
          <div className="shop-footer-brand">
            <StudentKareLogo size={30} showStrapline={false} />
            <p>{t('shopweb.footer.tagline')}</p>
          </div>
          <div>
            <h4>{t('shopweb.footer.explore')}</h4>
            <button type="button" onClick={() => browse('product')}>{t('shopweb.footer.products')}</button>
            <button type="button" onClick={() => browse('lab')}>{t('shopweb.footer.labPackages')}</button>
            <button type="button" onClick={() => browse('consultation')}>{t('shopweb.footer.consultations')}</button>
          </div>
          <div>
            <h4>{t('shopweb.footer.account')}</h4>
            <button type="button" onClick={() => navigate('health')}>{t('shopweb.footer.health')}</button>
            <button type="button" onClick={() => navigate('orders')}>{t('shopweb.footer.orders')}</button>
            <button type="button" onClick={() => navigate('pricing')}>{t('shopweb.footer.plans')}</button>
            <button type="button" onClick={() => navigate('support')}>{t('shopweb.footer.support')}</button>
          </div>
        </div>
        <div className="shop-footer-bottom">
          <span>© {new Date().getFullYear()} Studentkare</span>
          <span>{t('shopweb.footer.note')}</span>
        </div>
      </div>
    </footer>

    {/* A lab test is booked as a lab order (slot, address, pay), never a cart line or an appointment. */}
    {labSlotItem && <LabBookingOverlay itemId={labSlotItem.id} onClose={() => setLabSlotItem(null)} />}

    <div className={`shop-toast ${notice ? 'visible' : ''}`} role="status">
      {notice && <><span>{notice}</span><button type="button" onClick={() => { setNotice(''); setCartOpen(true); }}>{t('shopweb.viewCart')}</button></>}
    </div>
    {selected && <ShopDialog title={selected.name} onClose={() => setSelected(null)} wide><div className="shop-detail-grid"><div className="shop-detail-art"><ProductArtwork item={artworkFor(selected)} /><span>{t('shopweb.detail.artNote')}</span></div><div className="shop-detail-info"><span className="shop-eyebrow">{selected.brand}</span><h3>{selected.name}</h3><p>{selected.pack}</p><div className="shop-detail-price"><strong>{money(selected.pricePaise)}</strong></div><p className="shop-detail-description">{selected.description}</p>{selected.preparation && <div className="shop-inline-note">{selected.preparation}</div>}{selected.requiresPrescription ? <div className="wf-notice">{t('shopweb.detail.rxNote')}<button type="button" className="health-text-button" onClick={() => navigate('records')}>{t('shopweb.openRecords')}</button></div> : <button type="button" className="shop-button shop-primary" disabled={cannotAdd(selected)} onClick={() => add(selected)}>{t('shop.add')}</button>}<p className="wf-fineprint">{t('shopweb.detail.fine')}</p></div></div></ShopDialog>}
    {article && <ShopDialog title={article.title} onClose={() => setArticle(null)}><article className="shop-article-detail"><span className="shop-eyebrow">{article.tag} · {article.readTime}</span><h3>{article.title}</h3>{article.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}<div className="shop-inline-note"><HeartPulse size={19} aria-hidden="true" />{t('shopweb.article.note')}</div></article></ShopDialog>}
    {cartOpen && <ShopDialog title={t('shopweb.cartDialog.title')} onClose={() => setCartOpen(false)} wide><LiveCheckout onClose={() => setCartOpen(false)} onSuccess={result => { cart.clear(); setCartOpen(false); setOrder(result); resource.reload(); }} /></ShopDialog>}
    {order && <ShopDialog title={t('shopweb.order.title')} onClose={() => setOrder(null)}><div className="shop-order-success"><ShieldCheck size={40} aria-hidden="true" /><h3>{t('shopweb.order.saved')}</h3><p>{t('shopweb.order.body', { ref: order.id.slice(0, 8).toUpperCase() })}</p><p><strong>{money(order.totalPaise)}</strong> · {t('shopweb.order.total')}</p><button type="button" className="shop-button shop-primary" onClick={() => navigate('orders')}>{t('shopweb.order.track')} <ArrowRight size={16} aria-hidden="true" /></button></div></ShopDialog>}
  </div>;
}

function LiveCheckout({ onClose, onSuccess }: { onClose: () => void; onSuccess: (order: LiveOrder) => void }) {
  const t = useT();
  const { user } = useAuth();
  const cart = useLiveCart();
  const [delivery, setDelivery] = useState<Delivery>({ mode: 'pickup', address: '', city: '', pincode: '' });
  const [slot, setSlot] = useState('');
  const [cartNotice, setCartNotice] = useState('');
  const key = useRef({ fingerprint: '', id: '' });
  const mutation = useMutation();
  // Step 2: the order exists (stock held, unpaid) and the Pay step takes over.
  const [placed, setPlaced] = useState<LiveOrder | null>(null);
  const payment = useMemo(() => (placed ? new PayStepViewModel(placed.id, placed.totalPaise) : null), [placed]);
  const needsSlot = cart.lines.some(line => line.item.kind !== 'product');
  const total = cart.lines.reduce((sum, line) => sum + line.item.pricePaise * line.quantity, 0);
  const submit = async () => {
    // Validate against live inventory and serviceability before submitting.
    try {
      const validation = await apiRequest<{ serviceable: boolean; serviceabilityNote?: string; items: { id: string; available: boolean; reason: string }[] }>('/cart/validate', { method: 'POST', body: JSON.stringify({ items: cart.lines.map(line => ({ id: line.item.id, quantity: line.quantity })), pincode: delivery.pincode }) });
      const blocked = validation.items.filter(item => !item.available);
      if (blocked.length || !validation.serviceable) {
        setCartNotice(blocked.length ? t('shopweb.checkout.unavailable', { reasons: blocked.map(item => item.reason).join(', ') }) : (validation.serviceabilityNote || t('shopweb.checkout.notServiceable')));
        return;
      }
    } catch (error: unknown) {
      // Fail closed: no validation, no order.
      setCartNotice(error instanceof Error && error.message ? error.message : t('shopweb.checkout.validateFailed'));
      return;
    }
    const payload = { items: cart.lines.map(line => ({ id: line.item.id, quantity: line.quantity })), delivery, requestedSlot: needsSlot ? new Date(slot).toISOString() : '' };
    const fingerprint = JSON.stringify(payload);
    if (key.current.fingerprint !== fingerprint) key.current = { fingerprint, id: crypto.randomUUID() };
    mutation.run(() => apiRequest<LiveOrder>('/orders', { method: 'POST', headers: { 'Idempotency-Key': key.current.id }, body: fingerprint }), setPlaced);
  };
  // Back keeps the cart and the idempotency key: resubmitting unchanged returns the same order.
  if (placed && payment) return <PayStepView viewModel={payment} onBack={() => setPlaced(null)} onTrack={() => { onSuccess(placed); navigate('orders'); }} onOrders={() => { onSuccess(placed); navigate('orders'); }} />;
  if (!cart.lines.length) return <EmptyState title={t('cart.emptyTitle')} description={t('shopweb.checkout.emptyBody')} action={t('shopweb.checkout.keepExploring')} onAction={onClose} />;
  return <div className="shop-cart-grid"><div><div className="shop-cart-items">{cart.lines.map(line => <article className="shop-cart-item" key={line.item.id}><div className="shop-cart-art"><ProductArtwork item={artworkFor(line.item)} /></div><div className="shop-cart-item-info"><strong>{line.item.name}</strong><span>{line.item.pack}</span><b>{money(line.item.pricePaise * line.quantity)}</b>{line.item.kind === 'product' && <div className="shop-quantity"><button type="button" aria-label={t('cart.decrease', { name: line.item.name })} onClick={() => cart.setQuantity(line.item.id, line.quantity - 1)}><Minus size={13} aria-hidden="true" /></button><output>{line.quantity}</output><button type="button" aria-label={t('cart.increase', { name: line.item.name })} disabled={line.quantity >= Math.min(line.item.stock, 10)} onClick={() => cart.add(line.item)}><Plus size={13} aria-hidden="true" /></button></div>}</div><button type="button" className="shop-icon-button shop-remove-item" aria-label={t('cart.remove', { name: line.item.name })} onClick={() => cart.setQuantity(line.item.id, 0)}><Trash2 size={15} aria-hidden="true" /></button></article>)}</div><p className="wf-fineprint">{t('shopweb.checkout.sessionNote')}</p></div><section className="shop-order-summary"><h3>{t('shopweb.checkout.summary')}</h3><div className="shop-total"><span>{t('cart.itemsTotal')}</span><strong>{money(total)}</strong></div>{!user ? <><p>{t('shopweb.checkout.signInNote')}</p><button type="button" className="shop-button shop-primary wf-submit" onClick={() => navigate('login', 'checkout')}>{t('shopweb.checkout.signIn')} <ArrowRight size={15} aria-hidden="true" /></button></> : <form className="wf-form" onSubmit={event => { event.preventDefault(); submit(); }}><FormError message={mutation.error} />{cartNotice && <div className="wf-notice" role="alert"><AlertTriangle size={16} aria-hidden="true" />{cartNotice}</div>}<Field label={t('shopweb.checkout.arrangement')}><select value={delivery.mode} onChange={event => setDelivery(previous => ({ ...previous, mode: event.target.value === 'delivery' ? 'delivery' : 'pickup' }))}><option value="pickup">{t('cart.pickup')}</option><option value="delivery">{t('cart.delivery')}</option></select></Field>{delivery.mode === 'delivery' && <Field label={t('cart.address')}><textarea required minLength={10} maxLength={300} value={delivery.address} onChange={event => setDelivery(previous => ({ ...previous, address: event.target.value }))} /></Field>}<Field label={t('cart.city')}><input required minLength={2} maxLength={100} value={delivery.city} onChange={event => setDelivery(previous => ({ ...previous, city: event.target.value }))} /></Field><Field label={t('cart.pincode')}><input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={delivery.pincode} onChange={event => setDelivery(previous => ({ ...previous, pincode: event.target.value }))} /></Field>{needsSlot && <Field label={t('cart.when')}><input required type="datetime-local" value={slot} onChange={event => setSlot(event.target.value)} /></Field>}<p className="wf-fineprint">{t('pay.formNote')}</p><SubmitButton busy={mutation.busy}>{t('pay.continue')}</SubmitButton></form>}</section></div>;
}
