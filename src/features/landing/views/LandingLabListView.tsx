import React, { useMemo } from 'react';
import { useApiResource } from '@/hooks/api/useApiResource';
import { useT } from '@/i18n';
import { parseCatalogPage, rupees } from '../viewmodel/LandingViewModel';
import type { LandingCatalogItem } from '../viewmodel/LandingViewModel';
import { SubpageFooter, SubpageHeader, TrustPillars } from './LandingProgramsView';
import './landing.css';

const LAB_QUERY = { kind: 'lab', limit: 24 } as const;

/**
 * Lab test prices, straight from the public /catalog. This page used to list
 * eight tests with re-typed prices and "% OFF" badges, named a campus block as
 * if it were a customer, and turned "Book slot" into "Booked ✓" without
 * sending anything. Now a price is shown only when the server published it,
 * and booking happens in the shop.
 */
export function LandingLabListView(): React.ReactElement {
  const t = useT();
  const catalog = useApiResource<unknown>(`/catalog?kind=${LAB_QUERY.kind}&limit=${LAB_QUERY.limit}`);
  // Fails closed: a response that does not validate shows the error state, never a guessed price.
  const tests = useMemo<LandingCatalogItem[] | null>(() => {
    if (catalog.data === null) return null;
    try {
      return parseCatalogPage(catalog.data, LAB_QUERY);
    } catch {
      return null;
    }
  }, [catalog.data]);
  const failed = !catalog.loading && (Boolean(catalog.error) || tests === null);

  return (
    <div style={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, background: 'var(--sk-color-canvas)', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
      <SubpageHeader current="labTests" />

      {/* Top banner with background video */}
      <section
        aria-label={t('landing.lablist.bannerLabel')}
        style={{
          flexShrink: 0,
          position: 'relative',
          margin: '22px clamp(16px, 3.5vw, 44px) 0',
          height: '240px',
          borderRadius: '28px',
          background: 'var(--sk-color-brand-navy)',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden'
        }}
      >
        <video
          src="/assets/4486f2e01e220059b969dd4bce96a694.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          style={{ position: 'absolute', top: 0, right: 0, width: '72%', height: '100%', objectFit: 'cover' }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, var(--sk-color-brand-navy) 0%, var(--sk-color-brand-navy) 30%, rgba(30,27,75,0.55) 52%, rgba(30,27,75,0) 78%)'
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, width: '480px', padding: '0 0 0 clamp(20px, 3vw, 40px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '1.4px', color: 'var(--sk-color-sidebar-ink-2)' }}>
            {t('landing.lablist.eyebrow')}
          </span>
          <span style={{ fontSize: '32px', lineHeight: 1.2, fontWeight: 800, color: 'var(--sk-color-sidebar-ink)', letterSpacing: '-0.8px' }}>
            {t('landing.lablist.bannerTitle')}
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
            {(['landing.lablist.chipFasting', 'landing.lablist.chipCollection', 'landing.lablist.chipTrend'] as const).map((key) => (
              <span key={key} style={{ height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--sk-color-sidebar-ink-2)' }}>
                {t(key)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Breadcrumb */}
      <nav aria-label={t('landing.lablist.breadcrumb')} style={{ padding: '18px clamp(16px, 3.5vw, 44px) 0', display: 'flex', alignItems: 'center', gap: '9px' }}>
        <a href="/landing" style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--sk-color-text-3)', textDecoration: 'none' }}>{t('landing.lablist.home')}</a>
        <span aria-hidden="true" style={{ fontSize: '12.5px', color: 'var(--sk-color-rule-strong)' }}>›</span>
        <a href="/lab-tests" style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--sk-color-text-3)', textDecoration: 'none' }}>{t('landing.subpage.nav.labTests')}</a>
        <span aria-hidden="true" style={{ fontSize: '12.5px', color: 'var(--sk-color-rule-strong)' }}>›</span>
        <span aria-current="page" style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--sk-color-text)' }}>{t('landing.lablist.crumbPrices')}</span>
      </nav>

      {/* Heading */}
      <div style={{ padding: '14px clamp(16px, 3.5vw, 44px) 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.9px' }}>
            {t('landing.lablist.title')}
          </h1>
          {tests && tests.length > 0 ? (
            <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--sk-color-text-3)' }}>
              {t('landing.lablist.count', { count: tests.length })}
            </span>
          ) : null}
        </div>
        <a href="/shop?kind=lab" style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 18px', borderRadius: '11px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', fontSize: '13px', fontWeight: 700, color: 'var(--sk-color-action)', textDecoration: 'none' }}>
          {t('landing.lablist.searchShop')}
        </a>
      </div>

      {/* Tests grid — published catalogue rows only */}
      <div aria-live="polite" style={{ padding: '20px clamp(16px, 3.5vw, 44px) 0' }}>
        {catalog.loading ? (
          <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--sk-color-text-2)' }}>{t('landing.lablist.loading')}</span>
        ) : failed ? (
          <div role="alert" style={{ padding: '20px', borderRadius: '18px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--sk-color-text)' }}>{t('landing.lablist.errorTitle')}</span>
            <span style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--sk-color-text-2)' }}>{t('landing.lablist.errorBody')}</span>
            <button type="button" onClick={catalog.reload} style={{ minHeight: '44px', padding: '0 18px', borderRadius: '11px', border: 'none', background: 'var(--sk-color-action)', color: 'var(--sk-color-on-action)', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>
              {t('common.tryAgain')}
            </button>
          </div>
        ) : tests && tests.length === 0 ? (
          <span style={{ fontSize: '13.5px', fontWeight: 500, color: 'var(--sk-color-text-2)' }}>{t('landing.lablist.empty')}</span>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px' }}>
            {(tests ?? []).map((test) => {
              const discounted = test.mrpPaise > test.pricePaise;
              return (
                <div
                  key={test.id}
                  style={{ padding: '20px', borderRadius: '18px', background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule-soft)', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '200px' }}
                >
                  <span style={{ fontSize: '16px', lineHeight: 1.24, fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.35px' }}>
                    {test.name}
                  </span>
                  {test.pack ? (
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--sk-color-action)' }}>{test.pack}</span>
                  ) : null}
                  {test.brand ? (
                    <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--sk-color-text-3)' }}>{test.brand}</span>
                  ) : null}
                  <span style={{ flexGrow: 1 }} />
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: '11px', borderTop: '1px solid var(--sk-color-rule-soft)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {discounted ? (
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--sk-color-text-3)', textDecoration: 'line-through' }} aria-label={t('landing.lablist.wasPrice', { price: rupees(test.mrpPaise) })}>
                          {rupees(test.mrpPaise)}
                        </span>
                      ) : null}
                      <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--sk-color-text)', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>
                        {rupees(test.pricePaise)}
                      </span>
                    </div>
                    <a
                      href="/shop?kind=lab"
                      aria-label={t('landing.lablist.bookAria', { name: test.name })}
                      style={{ display: 'flex', alignItems: 'center', minHeight: '44px', padding: '0 20px', borderRadius: '11px', background: 'var(--sk-color-action)', fontSize: '12.5px', fontWeight: 800, color: 'var(--sk-color-on-action)', textDecoration: 'none' }}
                    >
                      {t('landing.lablist.book')}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clinical note */}
      <div style={{ padding: '20px clamp(16px, 3.5vw, 44px)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--sk-color-text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-5M12 8h.01" />
        </svg>
        <span style={{ fontSize: '11.5px', fontWeight: 500, color: 'var(--sk-color-text-3)' }}>
          {t('landing.lablist.disclaimer')}
        </span>
      </div>

      <TrustPillars marginTop="40px" />
      <SubpageFooter />
    </div>
  );
}
