import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowLeft, ArrowRight, BadgePercent, Check, ChevronDown, ChevronLeft,
  ChevronRight, Clock3, FileText, FlaskConical, Heart, HeartPulse, Leaf, MapPin,
  Menu, MessageCircle, Moon, PackageCheck, Pill, Search, ShieldCheck, ShoppingBag,
  Sparkles, Stethoscope, UserRound, X,
} from 'lucide-react';
import { StudentKareLogo } from '../../components/StudentKareLogo';
import { ProductArtwork } from '../../components/marketplace/ProductArtwork';
import { ProductCard, LabCard } from '../../components/marketplace/CatalogCards';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { ProductDetails } from '../../components/marketplace/ProductDetails';
import { CartPanel, DemoOrder } from '../../components/marketplace/CartPanel';
import { useMarketplace } from '../../data/MarketplaceStore';
import { calculateCart, DemoCity } from '../../data/marketplaceCart';
import {
  catalog, CatalogItem, CatalogSort, categories, catalogBrands, filterCatalog,
  itemById, ProductCategory, wellnessArticles,
} from '../../data/marketplaceCatalog';
import { formatRupees } from '../../data/healthExperience';
import '../../theme/marketplace.css';
import { useScrollReveal } from '../../hooks/useScrollReveal';

type ShopView = 'home' | 'products' | 'labs';
type ShopModal =
  | { type: 'product'; item: CatalogItem }
  | { type: 'cart' }
  | { type: 'prescription'; pendingItem?: CatalogItem }
  | { type: 'article'; id: string }
  | { type: 'order'; order: DemoOrder }
  | { type: 'help' }
  | null;

interface Props { onNavigate: (route: string) => void; onOpenAI: () => void }

const promos = [
  { eyebrow: 'YOUR EVERYDAY HEALTH COMPANION', title: <>All your healthcare.<br /><em>A little closer.</em></>, description: 'Everyday essentials, thoughtful care, and a healthier you. Everything you need, in one place.', action: 'Explore health essentials', category: 'all' as const, products: ['vitamin-c', 'sunscreen', 'multivitamin'], badge: 'Care for your everyday', icon: Heart },
  { eyebrow: 'SMALL HABITS. HEALTHIER DAYS.', title: <>Feel-good essentials.<br /><em>Made for your routine.</em></>, description: 'Discover vitamins, nutrition, and everyday wellness favourites. A little care goes a long way.', action: 'Shop vitamins & nutrition', category: 'vitamins' as const, products: ['omega', 'protein', 'vitamin-c'], badge: 'A little daily nourishment', icon: Leaf },
];

export function HealthcareMarketplace({ onNavigate, onOpenAI }: Props) {
  const { cart, dispatch } = useMarketplace();
  const [view, setView] = useState<ShopView>('home');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [brand, setBrand] = useState('all');
  const [sort, setSort] = useState<CatalogSort>('featured');
  const [slide, setSlide] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ShopModal>(null);
  const [notice, setNotice] = useState('');
  const totals = calculateCart(cart);
  const promo = promos[slide];
  const PromoIcon = promo.icon;
  const searching = query.trim().length > 0;
  const showingCatalog = view !== 'home' || searching;
  const revealRoot = useRef<HTMLDivElement>(null);
  useScrollReveal(revealRoot, String(showingCatalog));
  const items = useMemo(() => filterCatalog({
    query, category, brand, sort, kind: view === 'labs' ? 'lab' : view === 'products' ? 'product' : 'all',
  }), [query, category, brand, sort, view]);
  const quantity = (id: string) => cart.items.find(line => line.id === id)?.quantity || 0;

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const browse = (nextView: ShopView, nextCategory: ProductCategory | 'all' = 'all', nextBrand = 'all', nextSort: CatalogSort = 'featured') => {
    setView(nextView); setCategory(nextCategory); setBrand(nextBrand); setSort(nextSort); setQuery(''); setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const addToCart = (item: CatalogItem) => {
    if (item.requiresPrescription && !cart.samplePrescription) {
      setModal({ type: 'prescription', pendingItem: item });
      return;
    }
    dispatch({ type: 'add', id: item.id });
    setNotice(item.kind === 'lab' ? `${item.name} selected for your demo cart.` : `${item.name} added to your demo cart.`);
  };

  const openProduct = (item: CatalogItem) => setModal({ type: 'product', item });
  const searchEverywhere = (value: string) => {
    setQuery(value);
    setView('home');
    setCategory('all');
    setBrand('all');
  };
  const renderCard = (item: CatalogItem) => item.kind === 'lab'
    ? <LabCard key={item.id} item={item} quantity={quantity(item.id)} onAdd={addToCart} onOpen={openProduct} />
    : <ProductCard key={item.id} item={item} quantity={quantity(item.id)} onAdd={addToCart} onOpen={openProduct} />;

  const modalTitle = modal?.type === 'product' ? (modal.item.kind === 'lab' ? 'Your next health check' : 'A closer look')
    : modal?.type === 'cart' ? 'Your care cart'
    : modal?.type === 'prescription' ? 'Order with a prescription'
    : modal?.type === 'order' ? 'Your demo order is ready'
    : modal?.type === 'article' ? 'A little health perspective'
    : 'How can we help?';

  return <div ref={revealRoot} className="shop shop-marketplace">
    <a className="shop-skip-link" href="#shop-main">Skip to marketplace content</a>
    <div className="shop-announcement"><span><Sparkles size={12} />A little care. A little saving. Use <strong>CARE10</strong> in your demo cart.</span><span className="shop-announcement-demo">DEMO STORE · NO REAL ORDERS</span></div>
    <header className="shop-header">
      <div className="shop-header-main shop-container">
        <button className="shop-logo-button" onClick={() => browse('home')} aria-label="Studentkare marketplace home"><StudentKareLogo size={34} showWordmark showStrapline={false} /></button>
        <nav className="shop-primary-nav" aria-label="Healthcare services">
          <button className={view === 'products' || view === 'home' ? 'active' : ''} onClick={() => browse('products')}>Medicines & wellness</button>
          <button className={view === 'labs' ? 'active' : ''} onClick={() => browse('labs')}>Lab tests <span>SAVE MORE</span></button>
          <button onClick={() => onNavigate('care')}>Consult doctors</button>
          <button onClick={() => onNavigate('insurance')}>Insurance</button>
          <button onClick={() => onNavigate('exercises')}>Movement</button>
        </nav>
        <div className="shop-header-tools">
          <button className="shop-account" onClick={() => onNavigate('login')}><UserRound size={18} /><span>Log in</span></button>
          <button className="shop-cart-button" onClick={() => setModal({ type: 'cart' })} aria-label={`Open cart, ${totals.count} items`}><ShoppingBag size={20} /><span className="shop-cart-label">Cart</span>{totals.count > 0 && <span className="shop-cart-count">{totals.count}</span>}</button>
          <button className="shop-mobile-menu-button shop-icon-button" aria-label={menuOpen ? 'Close shop menu' : 'Open shop menu'} aria-expanded={menuOpen} aria-controls="shop-mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
      </div>
      <div className="shop-search-row shop-container">
        <label className="shop-city"><MapPin size={19} /><span><span>Explore in</span><select aria-label="Demo delivery city" value={cart.city} onChange={event => dispatch({ type: 'city', city: event.target.value as DemoCity })}><option>Hyderabad</option><option>Bengaluru</option><option>New Delhi</option></select></span><ChevronDown size={14} /></label>
        <form className="shop-search" role="search" onSubmit={event => { event.preventDefault(); }}><Search size={20} /><input type="search" aria-label="Search medicines, wellness products and lab tests" placeholder="Search medicines, wellness products, lab tests & more" value={query} onChange={event => searchEverywhere(event.target.value)} />{query && <button type="button" className="shop-icon-button" aria-label="Clear search" onClick={() => searchEverywhere('')}><X size={17} /></button>}<span className="shop-search-hint">Find your kind of care</span></form>
        <button className="shop-prescription-shortcut" onClick={() => setModal({ type: 'prescription' })}><FileText size={19} /><span>Have a prescription?<strong>Quick order <ArrowRight size={12} /></strong></span></button>
      </div>
      <nav className="shop-category-nav" aria-label="Product departments"><div className="shop-container"><button onClick={() => browse('products')}>All categories <ChevronDown size={12} /></button>{categories.slice(0, 6).map(item => <button key={item.id} onClick={() => browse('products', item.id)}>{item.label}</button>)}<button className="shop-offers-link" onClick={() => browse('products', 'all', 'all', 'discount')}><BadgePercent size={15} />Offers</button></div></nav>
      {menuOpen && <nav className="shop-mobile-menu shop-container" id="shop-mobile-menu" aria-label="Mobile healthcare services">
        <button onClick={() => onNavigate('exercises')}><Activity size={18} />Exercise & movement</button>
        <button onClick={() => browse('products')}><Pill size={18} />Medicines & wellness</button><button onClick={() => browse('labs')}><FlaskConical size={18} />Lab tests</button><button onClick={() => onNavigate('care')}><Stethoscope size={18} />Consult doctors</button><button onClick={() => onNavigate('insurance')}><ShieldCheck size={18} />Insurance</button><button onClick={() => onNavigate('dashboard')}><HeartPulse size={18} />My health hub</button><button onClick={() => onNavigate('login')}><UserRound size={18} />Log in / Sign up</button>
      </nav>}
    </header>

    <main id="shop-main">
      {!showingCatalog ? <>
        <section className="shop-hero-grid shop-container" aria-label="Featured healthcare offers">
          <div className={`shop-hero shop-hero-${slide}`}>
            <div className="shop-hero-copy shop-reveal" key={`copy-${slide}`}><span className="shop-eyebrow">{promo.eyebrow}</span><h1>{promo.title}</h1><p>{promo.description}</p><button className="shop-button shop-primary" onClick={() => browse('products', promo.category)}>{promo.action}<ArrowRight size={16} /></button><span className="shop-hero-footnote">Thoughtfully selected. Illustratively priced.</span></div>
            <div className="shop-hero-products" aria-hidden="true"><div className="shop-hero-arch" /><div className="shop-hero-leaf leaf-one"><Leaf size={58} strokeWidth={1} /></div><div className="shop-hero-leaf leaf-two"><Leaf size={47} strokeWidth={1} /></div>{promo.products.map((id, index) => <div key={id} className={`shop-hero-pack pack-${index}`}><ProductArtwork item={itemById(id)!} /></div>)}<div className="shop-hero-product-badge"><PromoIcon size={17} /><span>{promo.badge}</span></div><div className="shop-hero-platform" /></div>
            <div className="shop-carousel-controls"><div>{promos.map((_, index) => <button key={index} className={slide === index ? 'active' : ''} onClick={() => setSlide(index)} aria-label={`Show promotion ${index + 1}`} aria-pressed={slide === index} />)}</div><div><button onClick={() => setSlide((slide + promos.length - 1) % promos.length)} aria-label="Previous promotion"><ChevronLeft size={15} /></button><button onClick={() => setSlide((slide + 1) % promos.length)} aria-label="Next promotion"><ChevronRight size={15} /></button></div></div>
          </div>
          <aside className="shop-hero-side"><div className="shop-lab-promo"><span className="shop-eyebrow">A LITTLE PREVENTION GOES A LONG WAY</span><h2>Know your health.<br />Own your tomorrow.</h2><p>Full-body checkup packages</p><div className="shop-lab-promo-price">From ₹1,499 <span>DEMO PRICE</span></div><button onClick={() => browse('labs')} className="shop-text-button">Explore lab tests <ArrowRight size={15} /></button><img src="/marketplace/care-team.svg" alt="Illustration of a friendly healthcare professional" width="400" height="400" /></div><button className="shop-insurance-promo" onClick={() => onNavigate('insurance')}><span className="shop-insurance-icon"><ShieldCheck size={26} /></span><span><strong>A little more peace of mind.</strong><small>Explore your health insurance</small></span><ArrowRight size={19} /></button></aside>
        </section>

        <section className="shop-trust-strip shop-container" aria-label="Marketplace features"><div><PackageCheck size={23} /><span><strong>Everyday health essentials</strong><small>A thoughtfully curated demo range</small></span></div><div><FlaskConical size={23} /><span><strong>Health checks, made simple</strong><small>Explore packages & preparation</small></span></div><div><Stethoscope size={23} /><span><strong>Care, beyond the cart</strong><small>Find doctors and care services</small></span></div><div><HeartPulse size={23} /><span><strong>Your health, connected</strong><small>Metrics, records, and cover</small></span></div></section>

        <section className="shop-section shop-container"><div className="shop-section-heading"><div><span className="shop-eyebrow">CARE FOR EVERY PART OF YOU</span><h2>What brings you here today?</h2></div><button className="shop-text-button" onClick={() => browse('products')}>Explore all <ArrowRight size={15} /></button></div><div className="shop-concerns">{categories.map(item => <button key={item.id} onClick={() => browse('products', item.id)}><span style={{ backgroundColor: item.color }}><ProductArtwork item={itemById(item.productId)!} /></span><strong>{item.label}</strong></button>)}</div></section>

        <section className="shop-section shop-container"><div className="shop-section-heading"><div><span className="shop-eyebrow">SMALL ESSENTIALS. EVERYDAY DIFFERENCE.</span><h2>Your wellness shelf, sorted.</h2></div><button className="shop-text-button" onClick={() => browse('products')}>View all products <ArrowRight size={15} /></button></div><div className="shop-product-grid">{catalog.filter(item => item.kind === 'product').slice(0, 5).map(renderCard)}</div><p className="shop-catalog-note">Demo catalog · fictional brands, product images, prices, and ratings.</p></section>

        <section className="shop-carepass shop-container"><span className="shop-carepass-icon"><HeartPulse size={29} /></span><div><span className="shop-eyebrow">MORE THAN A MARKETPLACE</span><h2>Your health story. All together.</h2><p>Keep track of your metrics, care plan, and medical records in your personal health hub.</p></div><button className="shop-button" onClick={() => onNavigate('dashboard')}>Explore my health hub <ArrowRight size={16} /></button><div className="shop-carepass-pattern" aria-hidden="true"><Activity size={100} strokeWidth={.6} /></div></section>

        <section className="shop-container shop-movement-invite"><span><Activity size={27} /></span><div><span className="shop-eyebrow">A LITTLE MOVEMENT GOES A LONG WAY</span><h3>Stretch. Find your balance. Take a breath.</h3><p>Explore 12 illustrated movement guides and gentle session previews.</p></div><button className="shop-button" onClick={() => onNavigate('exercises')}>Explore movement <ArrowRight size={16} /></button></section>
        <section className="shop-section shop-labs-section"><div className="shop-container"><div className="shop-section-heading"><div><span className="shop-eyebrow">A HEALTHIER TOMORROW STARTS WITH TODAY</span><h2>Check in on your health.</h2><p>Popular lab packages, with a little more clarity.</p></div><button className="shop-text-button" onClick={() => browse('labs')}>View all lab tests <ArrowRight size={15} /></button></div><div className="shop-lab-grid">{catalog.filter(item => item.kind === 'lab').map(renderCard)}</div></div></section>

        <section className="shop-section shop-container"><div className="shop-section-heading"><div><span className="shop-eyebrow">MEET YOUR NEW EVERYDAY FAVOURITES</span><h2>Brands for your kind of care.</h2></div><span className="shop-small shop-muted">Fictional brands, made for this demo</span></div><div className="shop-brands">{catalogBrands.map((name, index) => <button key={name} className={`shop-brand shop-brand-${index}`} onClick={() => browse('products', 'all', name)}><span>{index === 0 ? <Leaf size={21} /> : index === 1 ? <Sparkles size={21} /> : index === 2 ? <Activity size={21} /> : index === 3 ? <Leaf size={21} /> : <Heart size={21} />}</span><strong>{name}</strong><small>{['NOURISH YOUR EVERYDAY', 'A KINDER SKIN ROUTINE', 'CARE YOU CAN KEEP CLOSE', 'ROOTED IN EVERYDAY RITUALS', 'LITTLE THINGS. REAL CARE.'][index]}</small></button>)}</div></section>

        <section className="shop-offer-banners shop-container"><div className="shop-prescription-banner"><span className="shop-large-icon"><FileText size={35} strokeWidth={1.4} /></span><div><h3>Your prescription. A simpler start.</h3><p>Try the quick-order journey with a sample prescription.</p></div><button className="shop-button" onClick={() => setModal({ type: 'prescription' })}>Try quick order <ArrowRight size={15} /></button></div><div className="shop-saving-banner"><BadgePercent size={35} /><div><span className="shop-eyebrow">A LITTLE EXTRA, ON US</span><h3>10% off your demo cart</h3><p>Use CARE10 · Save up to ₹150</p></div><button className="shop-icon-button" aria-label="Browse saving offers" onClick={() => browse('products', 'all', 'all', 'discount')}><ArrowRight size={21} /></button></div></section>

        <section className="shop-section shop-container"><div className="shop-section-heading"><div><span className="shop-eyebrow">A LITTLE KNOWLEDGE. A LOT OF GOOD.</span><h2>Good reads for healthier days.</h2></div><button className="shop-text-button" onClick={() => onNavigate('wellbeing')}>Explore wellbeing <ArrowRight size={15} /></button></div><div className="shop-articles">{wellnessArticles.map((article, index) => <button key={article.id} className="shop-article" onClick={() => setModal({ type: 'article', id: article.id })}><div className={`shop-article-art article-${index}`} style={{ backgroundColor: article.color }}><span>{index === 0 ? <Moon size={55} strokeWidth={1} /> : index === 1 ? <HeartPulse size={55} strokeWidth={1} /> : <Sparkles size={55} strokeWidth={1} />}</span><span className="shop-article-shape" /><span className="shop-article-small-shape" /></div><div className="shop-article-body"><span className="shop-eyebrow">{article.tag}</span><h3>{article.title}</h3><span><Clock3 size={12} />{article.readTime}<ArrowRight size={16} /></span></div></button>)}</div></section>
      </> : <section className="shop-catalog-page shop-container">
        <div className="shop-breadcrumb"><button onClick={() => browse('home')}>Home</button><ChevronRight size={12} /><span>{view === 'labs' ? 'Lab tests' : 'Health & wellness'}</span></div>
        <div className="shop-section-heading"><div><span className="shop-eyebrow">YOUR NEXT LITTLE STEP TO FEELING BETTER</span><h1>{searching ? `Results for “${query.trim()}”` : brand !== 'all' ? brand : category !== 'all' ? categories.find(item => item.id === category)?.label : view === 'labs' ? 'Health checks, made simple.' : 'Your everyday care essentials.'}</h1><p aria-live="polite">{items.length} {items.length === 1 ? 'result' : 'results'} · illustrative catalog</p></div><button className="shop-text-button" onClick={() => browse('home')}><ArrowLeft size={15} />Back to home</button></div>
        <div className="shop-catalog-filters">
          {view !== 'labs' && <label>Category<select aria-label="Category" value={category} onChange={event => setCategory(event.target.value as ProductCategory | 'all')}><option value="all">All categories</option>{categories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}{view === 'home' && <option value="labs">Lab tests</option>}</select></label>}
          {view !== 'labs' && <label>Brand<select aria-label="Brand" value={brand} onChange={event => setBrand(event.target.value)}><option value="all">All brands</option>{catalogBrands.map(name => <option key={name}>{name}</option>)}{view === 'home' && <option>Kare Labs</option>}</select></label>}
          <label>Sort by<select aria-label="Sort by" value={sort} onChange={event => setSort(event.target.value as CatalogSort)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="rating">Top rated</option><option value="discount">Biggest savings</option></select></label>
          {(query || category !== 'all' || brand !== 'all' || sort !== 'featured') && <button className="shop-text-button" onClick={() => { setQuery(''); setCategory('all'); setBrand('all'); setSort('featured'); }}>Reset filters <X size={13} /></button>}
        </div>
        {items.length ? <div className={view === 'labs' ? 'shop-lab-grid' : 'shop-product-grid shop-results-grid'}>{items.map(renderCard)}</div> : <div className="shop-empty-results"><Search size={38} strokeWidth={1.3} /><h2>No matches this time.</h2><p>Try a simpler search, such as “vitamin”, or reset your filters.</p><button className="shop-button shop-primary" onClick={() => browse(view === 'labs' ? 'labs' : 'products')}>Show the full catalog <ArrowRight size={16} /></button></div>}
        <p className="shop-catalog-note">All products, prices, ratings, and lab packages are sample data. Prescription items use an illustrative prescription flow.</p>
      </section>}

      <section className="shop-help-strip shop-container"><span className="shop-help-icon"><MessageCircle size={27} /></span><div><h3>A little help, whenever you need it.</h3><p>Questions about the demo, health hub, or finding care?</p></div><button className="shop-button" onClick={() => setModal({ type: 'help' })}>We're here to help <ArrowRight size={16} /></button></section>
    </main>

    <footer className="shop-footer"><div className="shop-container"><div className="shop-footer-grid"><div className="shop-footer-brand"><StudentKareLogo size={32} showWordmark showStrapline={false} /><p>Everyday essentials. Connected care.<br />A little more wellbeing, for everyone.</p><span className="shop-demo-label">BUILT FOR EXPLORING · DEMO EXPERIENCE</span></div><div><h4>Your healthcare</h4><button onClick={() => browse('products')}>Medicines & wellness</button><button onClick={() => browse('labs')}>Lab tests & packages</button><button onClick={() => onNavigate('care')}>Consult a doctor</button><button onClick={() => onNavigate('insurance')}>Insurance & cover</button></div><div><h4>A little more care</h4><button onClick={() => onNavigate('dashboard')}>My health dashboard</button><button onClick={() => onNavigate('vault')}>Health records</button><button onClick={() => onNavigate('wellbeing')}>Wellbeing & insights</button><button onClick={() => onNavigate('about')}>About Studentkare</button></div><div><h4>Here to help</h4><button onClick={() => setModal({ type: 'help' })}>Help & demo information</button><button onClick={() => setModal({ type: 'cart' })}>View your cart</button><button onClick={() => setModal({ type: 'prescription' })}>Prescription quick order</button><button onClick={onOpenAI}>Care assistant</button></div></div><div className="shop-footer-bottom"><span>© {new Date().getFullYear()} Studentkare. A little care goes a long way.</span><span>Illustrative products & imagery · No real orders or payments</span></div></div></footer>
    <div className={`shop-toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">{notice && <><Check size={16} /><span>{notice}</span><button onClick={() => { setNotice(''); setModal({ type: 'cart' }); }}>View cart</button><button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={14} /></button></>}</div>

    {modal && <ShopDialog title={modalTitle} onClose={() => setModal(null)} wide={modal.type === 'product' || modal.type === 'cart'}>
      {modal.type === 'product' && <ProductDetails item={modal.item} quantity={quantity(modal.item.id)} onAdd={addToCart} />}
      {modal.type === 'cart' && <CartPanel onContinueShopping={() => setModal(null)} onOrder={order => setModal({ type: 'order', order })} />}
      {modal.type === 'prescription' && <div className="shop-prescription-flow"><span className="shop-flow-icon"><FileText size={37} strokeWidth={1.3} /></span><span className="shop-eyebrow">A QUICKER WAY TO GET STARTED</span><h3>Let's try a sample prescription.</h3><p>Explore how a prescription order would work with a built-in dummy document.</p><ol><li><span>1</span>Select a sample prescription</li><li><span>2</span>Review the illustrative prescription item</li><li><span>3</span>Continue to your demo cart</li></ol><div className="shop-sample-document"><FileText size={25} /><div><strong>Sample prescription.pdf</strong><span>Fictional document · no patient data</span></div><span className="shop-demo-label">DEMO</span></div><button className="shop-button shop-primary" onClick={() => { dispatch({ type: 'sample-prescription' }); const item = modal.pendingItem ?? itemById('prescription-pack')!; dispatch({ type: 'add', id: item.id }); setModal({ type: 'cart' }); }}>Use sample prescription <ArrowRight size={16} /></button><p className="shop-small">No document is uploaded. Real prescriptions and pharmacy review are not processed in this demo.</p></div>}
      {modal.type === 'order' && <div className="shop-order-success"><span className="shop-success-icon"><Check size={40} /></span><span className="shop-eyebrow">A LITTLE CARE, ALL LINED UP</span><h3>That's the demo journey, complete.</h3><p>Your sample order has been created in this session. Nothing has been charged, sent to a provider, or scheduled.</p><dl><div><dt>Demo reference</dt><dd>{modal.order.reference}</dd></div><div><dt>Items</dt><dd>{modal.order.count}</dd></div><div><dt>Sample location</dt><dd>{modal.order.destination}, {modal.order.city}</dd></div>{modal.order.slot && <div><dt>Illustrative lab slot</dt><dd>{modal.order.slot}</dd></div>}<div><dt>Demo total</dt><dd>{formatRupees(modal.order.total)}</dd></div></dl><button className="shop-button shop-primary" onClick={() => { setModal(null); browse('home'); }}>Continue exploring <ArrowRight size={16} /></button></div>}
      {modal.type === 'article' && (() => { const article = wellnessArticles.find(item => item.id === modal.id)!; return <article className="shop-article-detail"><span className="shop-eyebrow">{article.tag} · {article.readTime}</span><h3>{article.title}</h3>{article.body.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<div className="shop-inline-note"><HeartPulse size={19} />General wellbeing information, not a personalised medical assessment.</div><button className="shop-text-button" onClick={() => onNavigate('wellbeing')}>Explore your wellbeing hub <ArrowRight size={15} /></button></article>; })()}
      {modal.type === 'help' && <div className="shop-help-panel"><span className="shop-flow-icon"><MessageCircle size={33} /></span><h3>Find your next step.</h3><details open><summary>Can I place a real order here?</summary><p>This is an interactive prototype with fictional products, prices, ratings, and lab services. The checkout creates a demo confirmation only.</p></details><details><summary>What happens to my cart?</summary><p>Your cart stays available while moving between the marketplace and health hub. Refreshing the page clears this in-memory demo cart.</p></details><details><summary>How do prescriptions work?</summary><p>Use the built-in sample prescription to explore quick ordering. No personal document is needed, and no clinical or pharmacy verification is performed.</p></details><button className="shop-button shop-primary" onClick={() => { setModal(null); onOpenAI(); }}>Open the care assistant <Sparkles size={16} /></button></div>}
    </ShopDialog>}
  </div>;
}
