import React, { useMemo, useState } from 'react';
import {
  Home,
  Scan,
  Package,
  FileText,
  ArrowLeftRight,
  KeyRound,
  RotateCcw,
  ClipboardList,
  RefreshCw,
  FlaskConical,
  Truck,
  Snowflake,
  CheckCircle2,
  Tent,
  Users,
  LayoutGrid,
  CreditCard,
  BarChart3,
  HelpCircle,
  Search,
  Plus,
  X,
} from 'lucide-react';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '@/theme/styles/vendorCatalogue.css';

export interface CatalogueProduct {
  id: string;
  name: string;
  brand: string;
  pack: string;
  price: number;
  stock: number;
  status: 'Published' | 'Low stock' | 'Out of stock' | 'Under review';
}

const INITIAL_PRODUCTS: CatalogueProduct[] = [
  {
    id: 'prod-1',
    name: 'Ashwagandha Stress Balance',
    brand: 'Root & Ritual',
    pack: 'Bottle of 60',
    price: 299,
    stock: 45,
    status: 'Published',
  },
  {
    id: 'prod-2',
    name: 'Barrier Care Daily Moisturiser',
    brand: 'Kindskin',
    pack: 'Tube of 100 ml',
    price: 279,
    stock: 50,
    status: 'Published',
  },
  {
    id: 'prod-3',
    name: 'Daily Multivitamin Essentials',
    brand: 'Nourish',
    pack: 'Bottle of 30',
    price: 299,
    stock: 8,
    status: 'Low stock',
  },
  {
    id: 'prod-4',
    name: 'Cardiac Care CoQ10 Softgels',
    brand: 'Nourish',
    pack: 'Bottle of 60',
    price: 649,
    stock: 40,
    status: 'Published',
  },
  {
    id: 'prod-5',
    name: 'Daily Defence Sunscreen SPF 50',
    brand: 'Kindskin',
    pack: 'Tube of 50 g',
    price: 429,
    stock: 0,
    status: 'Out of stock',
  },
  {
    id: 'prod-6',
    name: 'Ayurvedic Immunity Kadha Mix',
    brand: 'Root & Ritual',
    pack: 'Jar of 200 g',
    price: 249,
    stock: 50,
    status: 'Under review',
  },
];

export const DEMO_CATALOGUE_PRODUCTS: CatalogueProduct[] = INITIAL_PRODUCTS;

const STATUS_KEY: Record<CatalogueProduct['status'], MessageKey> = {
  Published: 'partner.vcon.cat.status.published',
  'Low stock': 'partner.vcon.cat.status.lowStock',
  'Out of stock': 'partner.vcon.cat.status.outOfStock',
  'Under review': 'partner.vcon.cat.status.underReview',
};

export interface VendorCatalogueScreenProps {
  initialProducts?: CatalogueProduct[];
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export function VendorCatalogueScreen({ initialProducts, onNavigate }: VendorCatalogueScreenProps) {
  const t = useT();
  // No catalogue API is wired to this screen: it starts empty unless a caller passes products.
  const [products, setProducts] = useState<CatalogueProduct[]>(() => initialProducts ?? []);
  const publishedCount = useMemo(() => products.filter((p) => p.status === 'Published').length, [products]);
  const lowStockCount = useMemo(() => products.filter((p) => p.stock > 0 && p.stock <= 10).length, [products]);
  const outOfStockCount = useMemo(() => products.filter((p) => p.stock === 0).length, [products]);
  const underReviewCount = useMemo(() => products.filter((p) => p.status === 'Under review').length, [products]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Product Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductBrand, setNewProductBrand] = useState<string>('');
  const [newProductPack, setNewProductPack] = useState<string>('');
  const [newProductPrice, setNewProductPrice] = useState<string>('');
  const [newProductStock, setNewProductStock] = useState<string>('');

  // Edit Stock/Price Modal State
  const [editingProduct, setEditingProduct] = useState<CatalogueProduct | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editStock, setEditStock] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleNav = (target: string) => {
    if (onNavigate) {
      onNavigate(target);
    } else {
      navigate(target as RoutePath);
    }
  };

  const filteredProducts = products.filter((prod) => {
    const matchesSearch =
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.brand.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'published') return prod.status === 'Published';
    if (activeFilter === 'low-stock') return prod.status === 'Low stock';
    if (activeFilter === 'out-of-stock') return prod.status === 'Out of stock';
    if (activeFilter === 'under-review') return prod.status === 'Under review';
    return true;
  });

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductBrand.trim()) {
      showToast(t('partner.vcon.cat.toastNeedNames'));
      return;
    }

    // Never invent a price or stock level: both must be entered.
    const priceNum = parseFloat(newProductPrice);
    const stockNum = parseInt(newProductStock, 10);
    if (!Number.isFinite(priceNum) || priceNum <= 0 || !Number.isInteger(stockNum) || stockNum < 0) {
      showToast(t('partner.vcon.cat.toastNeedPriceStock'));
      return;
    }

    let computedStatus: CatalogueProduct['status'] = 'Published';
    if (stockNum === 0) computedStatus = 'Out of stock';
    else if (stockNum <= 10) computedStatus = 'Low stock';

    const newProd: CatalogueProduct = {
      id: `prod-${Date.now()}`,
      name: newProductName.trim(),
      brand: newProductBrand.trim(),
      pack: newProductPack.trim() || '—',
      price: priceNum,
      stock: stockNum,
      status: computedStatus,
    };

    setProducts((prev) => [newProd, ...prev]);
    setShowAddModal(false);
    setNewProductName('');
    setNewProductBrand('');
    setNewProductPack('');
    setNewProductPrice('');
    setNewProductStock('');
    showToast(t('partner.vcon.cat.toastAddedLocal', { name: newProd.name }));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const priceNum = parseFloat(editPrice) || editingProduct.price;
    const stockNum = parseInt(editStock, 10);
    const validStock = isNaN(stockNum) ? editingProduct.stock : stockNum;

    let computedStatus = editingProduct.status;
    if (computedStatus !== 'Under review') {
      if (validStock === 0) computedStatus = 'Out of stock';
      else if (validStock <= 10) computedStatus = 'Low stock';
      else computedStatus = 'Published';
    }

    setProducts((prev) =>
      prev.map((p) =>
        p.id === editingProduct.id
          ? {
              ...p,
              price: priceNum,
              stock: validStock,
              status: computedStatus,
            }
          : p
      )
    );
    setEditingProduct(null);
    showToast(t('partner.vcon.cat.toastUpdatedLocal', { name: editingProduct.name }));
  };

  return (
    <div className="sk-cat-page">
      {/* ================= Left Sidebar ================= */}
      <aside className="sk-cat-sidebar" aria-label={t('partner.vcon.nav.sidebarLabel')}>
        <div className="sk-cat-brand">
          <div className="sk-cat-brand-logo" aria-hidden="true">
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none">
              <defs>
                <linearGradient id="skgCat" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
                <linearGradient id="skgCatB" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#skgCat)" />
              <path d="M256 6 6 84v250c0 128 106 224 250 260V6z" fill="url(#skgCatB)" />
              <path
                d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z"
                fill="#FFFFFF"
              />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </div>
          <div className="sk-cat-brand-text">
            <span className="sk-cat-brand-name">
              Student<em>&nbsp;Kare</em>
            </span>
            <span className="sk-cat-brand-partner">{t('partner.vcon.nav.badge')}</span>
          </div>
        </div>

        <nav className="sk-cat-nav" aria-label={t('partner.vcon.nav.label')}>
          {/* Section: STORE */}
          <span className="sk-cat-nav-section">{t('partner.vcon.nav.store')}</span>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => handleNav('vendor')}
          >
            <Home size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.home')}</span>
          </button>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => handleNav('scan-verify')}
          >
            <Scan size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.verify')}</span>
          </button>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => handleNav('orders')}
          >
            <Package size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.orders')}</span>
          </button>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => handleNav('rx-review')}
          >
            <FileText size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.rxReview')}</span>
          </button>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => handleNav('substitutions')}
          >
            <ArrowLeftRight size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.substitutions')}</span>
          </button>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => handleNav('handover')}
          >
            <KeyRound size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.handover')}</span>
          </button>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => handleNav('returns')}
          >
            <RotateCcw size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.returns')}</span>
          </button>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => handleNav('dispensing')}
          >
            <ClipboardList size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.dispensing')}</span>
          </button>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => handleNav('reorder')}
          >
            <RefreshCw size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.reorder')}</span>
          </button>

          {/* Section: LAB */}
          <span className="sk-cat-nav-section">{t('partner.vcon.nav.lab')}</span>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => handleNav('lab-queue')}
          >
            <FlaskConical size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.sampleQueue')}</span>
          </button>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => handleNav('run-sheet')}
          >
            <Truck size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.runSheet')}</span>
          </button>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => handleNav('cold-chain')}
          >
            <Snowflake size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.coldChain')}</span>
          </button>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => showToast(t('partner.vcon.cat.toastReleaseUnavailable'))}
          >
            <CheckCircle2 size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.releaseResults')}</span>
          </button>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => handleNav('camp-intake')}
          >
            <Tent size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.campIntake')}</span>
          </button>

          {/* Section: BUSINESS */}
          <span className="sk-cat-nav-section">{t('partner.vcon.nav.business')}</span>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => handleNav('partner-staff')}
          >
            <Users size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.staff')}</span>
          </button>
          <button
            type="button"
            className="sk-cat-nav-item is-active"
            aria-current="page"
          >
            <LayoutGrid size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.catalogue')}</span>
          </button>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => handleNav('settlement')}
          >
            <CreditCard size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.settlement')}</span>
          </button>
          <button
            type="button"
            className="sk-cat-nav-item"
            onClick={() => handleNav('performance')}
          >
            <BarChart3 size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.performance')}</span>
          </button>
        </nav>

        <div className="sk-cat-sidebar-bottom">
          <button
            type="button"
            className="sk-cat-help-link"
            onClick={() => showToast(t('partner.vcon.cat.toastSupportUnavailable'))}
          >
            <HelpCircle size={15} aria-hidden="true" />
            <span>{t('partner.vcon.nav.help')}</span>
          </button>
        </div>
      </aside>

      {/* ================= Main Content Container ================= */}
      <main className="sk-cat-content">
        {/* Top Header Row */}
        <div className="sk-cat-header-row">
          <div className="sk-cat-header-titles">
            <h1 className="sk-cat-title">{t('partner.vcon.cat.title')}</h1>
            <span className="sk-cat-sub">
              {products.length > 0
                ? t('partner.vcon.cat.subCount', { count: publishedCount })
                : t('partner.vcon.cat.subNone')}
            </span>
          </div>

          <button
            type="button"
            className="sk-cat-btn-add"
            onClick={() => setShowAddModal(true)}
            aria-label={t('partner.vcon.cat.addAria')}
          >
            <Plus size={16} aria-hidden="true" />
            <span>{t('partner.vcon.cat.add')}</span>
          </button>
        </div>

        {/* 4 Stat Cards Row */}
        <div className="sk-cat-stats-row">
          <div className="sk-cat-stat-card">
            <span className="sk-cat-stat-val">
              {products.length > 0 ? publishedCount : '—'}
            </span>
            <span className="sk-cat-stat-label">{t('partner.vcon.cat.status.published')}</span>
          </div>
          <div className="sk-cat-stat-card">
            <span className="sk-cat-stat-val is-amber">
              {products.length > 0 ? lowStockCount : '—'}
            </span>
            <span className="sk-cat-stat-label">{t('partner.vcon.cat.status.lowStock')}</span>
          </div>
          <div className="sk-cat-stat-card">
            <span className="sk-cat-stat-val is-red">
              {products.length > 0 ? outOfStockCount : '—'}
            </span>
            <span className="sk-cat-stat-label">{t('partner.vcon.cat.status.outOfStock')}</span>
          </div>
          <div className="sk-cat-stat-card">
            <span className="sk-cat-stat-val">
              {products.length > 0 ? underReviewCount : '—'}
            </span>
            <span className="sk-cat-stat-label">{t('partner.vcon.cat.status.underReview')}</span>
          </div>
        </div>

        {/* Controls Toolbar: Search & Filter Tabs */}
        <div className="sk-cat-toolbar">
          <div className="sk-cat-search-box">
            <Search size={16} color="var(--sk-color-text-3)" aria-hidden="true" />
            <input
              type="text"
              className="sk-cat-search-input"
              placeholder={t('partner.vcon.cat.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('partner.vcon.cat.searchAria')}
            />
            {searchQuery && (
              <button
                type="button"
                style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setSearchQuery('')}
                aria-label={t('partner.vcon.clearSearch')}
              >
                <X size={14} color="var(--sk-color-text-3)" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="sk-cat-tabs" role="tablist" aria-label={t('partner.vcon.cat.filtersAria')}>
            {[
              { key: 'all', label: t('partner.vcon.cat.filterAll') },
              { key: 'published', label: t('partner.vcon.cat.status.published') },
              { key: 'low-stock', label: t('partner.vcon.cat.status.lowStock') },
              { key: 'out-of-stock', label: t('partner.vcon.cat.status.outOfStock') },
              { key: 'under-review', label: t('partner.vcon.cat.status.underReview') },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeFilter === tab.key}
                className={`sk-cat-tab-btn ${activeFilter === tab.key ? 'is-active' : ''}`}
                onClick={() => setActiveFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Table Card */}
        <div className="sk-cat-card">
          <div className="sk-cat-table-header">
            <span className="sk-cat-th">{t('partner.vcon.cat.th.product')}</span>
            <span className="sk-cat-th">{t('partner.vcon.cat.th.brand')}</span>
            <span className="sk-cat-th">{t('partner.vcon.cat.th.pack')}</span>
            <span className="sk-cat-th">{t('partner.vcon.cat.th.price')}</span>
            <span className="sk-cat-th">{t('partner.vcon.cat.th.stock')}</span>
            <span className="sk-cat-th align-right">{t('partner.vcon.cat.th.status')}</span>
          </div>

          {filteredProducts.length === 0 ? (
            <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--sk-color-text-3)', fontSize: 14 }}>
              {searchQuery ? t('partner.vcon.cat.emptySearch') : t('partner.vcon.cat.empty')}
            </div>
          ) : (
            filteredProducts.map((prod) => {
              let badgeClass = 'sk-cat-pill-green';
              if (prod.status === 'Low stock') badgeClass = 'sk-cat-pill-amber';
              if (prod.status === 'Out of stock') badgeClass = 'sk-cat-pill-red';
              if (prod.status === 'Under review') badgeClass = 'sk-cat-pill-indigo';

              return (
                <div
                  key={prod.id}
                  className="sk-cat-row"
                  onClick={() => {
                    setEditingProduct(prod);
                    setEditPrice(prod.price.toString());
                    setEditStock(prod.stock.toString());
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setEditingProduct(prod);
                      setEditPrice(prod.price.toString());
                      setEditStock(prod.stock.toString());
                    }
                  }}
                  aria-label={t('partner.vcon.cat.editAria', { name: prod.name })}
                >
                  <span className="sk-cat-col-product">{prod.name}</span>
                  <span className="sk-cat-col-brand">{prod.brand}</span>
                  <span className="sk-cat-col-pack">{prod.pack}</span>
                  <span className="sk-cat-col-price">₹{prod.price}</span>
                  <span className="sk-cat-col-stock">{prod.stock}</span>
                  <div className="sk-cat-col-status">
                    <span className={badgeClass}>{t(STATUS_KEY[prod.status])}</span>
                  </div>
                </div>
              );
            })
          )}

          {/* Rule L Compliance Note */}
          <span className="sk-cat-compliance-note">
            {t('partner.vcon.cat.ruleL')}
          </span>
        </div>
      </main>

      {/* Add Product Modal */}
      {showAddModal && (
        <div
          className="sk-cat-modal-overlay"
          onClick={() => setShowAddModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-modal-title"
        >
          <div
            className="sk-cat-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sk-cat-modal-header">
              <h2 id="add-modal-title" className="sk-cat-modal-title">
                {t('partner.vcon.cat.add')}
              </h2>
              <button
                type="button"
                className="sk-cat-modal-close"
                onClick={() => setShowAddModal(false)}
                aria-label={t('partner.vcon.closeDialog')}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--sk-color-text-2)', lineHeight: 1.5 }}>
              {t('partner.vcon.cat.notSavedNote')}
            </p>
            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="sk-cat-form-group">
                <label className="sk-cat-form-label" htmlFor="prod-name">{t('partner.vcon.cat.form.name')}</label>
                <input
                  id="prod-name"
                  type="text"
                  required
                  className="sk-cat-form-input"
                  placeholder={t('partner.vcon.cat.form.namePh')}
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                />
              </div>

              <div className="sk-cat-form-group">
                <label className="sk-cat-form-label" htmlFor="prod-brand">{t('partner.vcon.cat.form.brand')}</label>
                <input
                  id="prod-brand"
                  type="text"
                  required
                  className="sk-cat-form-input"
                  placeholder={t('partner.vcon.cat.form.brandPh')}
                  value={newProductBrand}
                  onChange={(e) => setNewProductBrand(e.target.value)}
                />
              </div>

              <div className="sk-cat-form-group">
                <label className="sk-cat-form-label" htmlFor="prod-pack">{t('partner.vcon.cat.form.pack')}</label>
                <input
                  id="prod-pack"
                  type="text"
                  className="sk-cat-form-input"
                  placeholder={t('partner.vcon.cat.form.packPh')}
                  value={newProductPack}
                  onChange={(e) => setNewProductPack(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="sk-cat-form-group">
                  <label className="sk-cat-form-label" htmlFor="prod-price">{t('partner.vcon.cat.form.price')}</label>
                  <input
                    id="prod-price"
                    type="number"
                    min="1"
                    required
                    className="sk-cat-form-input"
                    placeholder="150"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                  />
                </div>
                <div className="sk-cat-form-group">
                  <label className="sk-cat-form-label" htmlFor="prod-stock">{t('partner.vcon.cat.form.initialStock')}</label>
                  <input
                    id="prod-stock"
                    type="number"
                    min="0"
                    required
                    className="sk-cat-form-input"
                    placeholder="50"
                    value={newProductStock}
                    onChange={(e) => setNewProductStock(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                style={{
                  height: 46,
                  minHeight: 44,
                  borderRadius: 12,
                  border: 0,
                  background: 'var(--sk-color-action)',
                  color: 'var(--sk-color-on-action)',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginTop: 6,
                }}
              >
                {t('partner.vcon.cat.form.submitAdd')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Stock/Price Modal */}
      {editingProduct && (
        <div
          className="sk-cat-modal-overlay"
          onClick={() => setEditingProduct(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <div
            className="sk-cat-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sk-cat-modal-header">
              <h2 id="edit-modal-title" className="sk-cat-modal-title">
                {t('partner.vcon.cat.editTitle')}
              </h2>
              <button
                type="button"
                className="sk-cat-modal-close"
                onClick={() => setEditingProduct(null)}
                aria-label={t('partner.vcon.closeDialog')}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--sk-color-text)', marginBottom: 4 }}>
              {editingProduct.name} <span style={{ color: 'var(--sk-color-action)', fontWeight: 600 }}>({editingProduct.brand})</span>
            </div>

            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--sk-color-text-2)', lineHeight: 1.5 }}>
              {t('partner.vcon.cat.notSavedNote')}
            </p>
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="sk-cat-form-group">
                  <label className="sk-cat-form-label" htmlFor="edit-price">{t('partner.vcon.cat.form.price')}</label>
                  <input
                    id="edit-price"
                    type="number"
                    min="1"
                    className="sk-cat-form-input"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                  />
                </div>
                <div className="sk-cat-form-group">
                  <label className="sk-cat-form-label" htmlFor="edit-stock">{t('partner.vcon.cat.form.stockLevel')}</label>
                  <input
                    id="edit-stock"
                    type="number"
                    min="0"
                    className="sk-cat-form-input"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ fontSize: 11.5, color: 'var(--sk-color-text-3)', lineHeight: 1.5 }}>
                {t('partner.vcon.cat.form.stockHint')}
              </div>

              <button
                type="submit"
                style={{
                  height: 46,
                  minHeight: 44,
                  borderRadius: 12,
                  border: 0,
                  background: 'var(--sk-color-action)',
                  color: 'var(--sk-color-on-action)',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginTop: 6,
                }}
              >
                {t('partner.vcon.cat.form.save')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toastMessage && <div className="sk-cat-toast" role="status" aria-live="polite">{toastMessage}</div>}
    </div>
  );
}

export default VendorCatalogueScreen;
