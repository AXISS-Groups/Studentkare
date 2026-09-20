import React from 'react';
import { observer } from 'mobx-react-lite';
import { Search, ShieldCheck, Clock, CheckCircle2, ShoppingBag } from 'lucide-react';
import type { MarketplaceViewModel } from '../viewmodel/MarketplaceViewModel';
import './marketplace.css';

interface MarketplaceWebViewProps {
  viewModel: MarketplaceViewModel;
}

/**
 * Web View Component for Health Fabric Diagnostics Marketplace.
 * Binds reactively to `MarketplaceViewModel` via MobX `observer`.
 */
export const MarketplaceWebView: React.FC<MarketplaceWebViewProps> = observer(({ viewModel }) => {
  const activeOrder = viewModel.activeOrder;

  return (
    <div className="marketplace-container">
      <div className="marketplace-header">
        <span className="marketplace-eyebrow">NABL ACCREDITED DIAGNOSTICS FABRIC</span>
        <h2>Diagnostics & Lab Test Marketplace</h2>
        <p>Book lab test packages with doorstep sample collection & guaranteed TAT SLA.</p>
      </div>

      {/* Success Notification */}
      {viewModel.successMessage && activeOrder && (
        <div className="order-success-card">
          <CheckCircle2 size={36} color="#16a34a" />
          <div className="order-success-info">
            <h3>{viewModel.successMessage}</h3>
            <p>Phlebotomist sample collection scheduled. Track status below.</p>
            <span className="order-badge">Order State: {activeOrder.state.toUpperCase()}</span>
          </div>
          <button type="button" className="btn-close-order" onClick={() => viewModel.clearOrder()}>
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="marketplace-filter-bar">
        <div className="search-input-box">
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Search lab tests (e.g. CBC, Vitamin D, Dengue Profile)..."
            value={viewModel.searchQuery}
            onChange={(e) => viewModel.setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-pills">
          {['ALL', 'HEALTH_CHECKUP', 'DIAGNOSTICS'].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`pill-btn ${viewModel.selectedCategory === cat ? 'active' : ''}`}
              onClick={() => viewModel.setCategory(cat)}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Test Packages Grid */}
      <div className="packages-grid">
        {viewModel.filteredPackages.map((pkg) => {
          const provider = viewModel.providers[0]; // Primary accredited provider
          return (
            <div key={pkg.id} className="pkg-card">
              <div className="pkg-header">
                <span className="pkg-category-tag">{pkg.category.replace('_', ' ')}</span>
                <span className="pkg-tat"><Clock size={12} /> {pkg.tatHours}h TAT</span>
              </div>

              <h3>{pkg.name}</h3>
              <p className="pkg-desc">{pkg.description}</p>

              <div className="pkg-meta">
                <span className="meta-tag"><ShieldCheck size={14} color="#16a34a" /> {pkg.testCount} Parameters</span>
                {pkg.fastingHours > 0 && <span className="meta-tag">{pkg.fastingHours}h Fasting Required</span>}
              </div>

              <div className="pkg-provider-info">
                <span>Fulfilled by <strong>{provider.name}</strong> ({provider.accreditation})</span>
              </div>

              <div className="pkg-footer">
                <div className="price-box">
                  <span className="price">₹{pkg.price}</span>
                  <span className="original-price">₹{pkg.originalPrice}</span>
                  <span className="discount-badge">
                    {Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)}% OFF
                  </span>
                </div>

                <button
                  type="button"
                  className="btn-book-pkg"
                  onClick={() => viewModel.bookPackage(pkg, provider)}
                  disabled={viewModel.isBooking}
                >
                  <ShoppingBag size={16} /> Book Now
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
