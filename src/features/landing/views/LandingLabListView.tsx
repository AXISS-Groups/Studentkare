import React, { useMemo } from 'react';
import { useApiResource } from '@/hooks/api/useApiResource';
import { useT } from '@/i18n';
import { CanvasVideo } from '@/design-system/art';
import { PublicSiteHeader, PublicSitePage } from '@/design-system/public-site';
import { parseCatalogPage, rupees } from '../viewmodel/LandingViewModel';
import type { LandingCatalogItem } from '../viewmodel/LandingViewModel';
import { LwBanner, LwIconTile, LwLabSearch, LwLoadState, LwNote, offPercent } from './landingWebKit';
import './landingWeb.css';

const LAB_QUERY = { kind: 'lab', limit: 24 } as const;

/**
 * Lab test prices, straight from the public /catalog (design board
 * WebLabList). A price, a saving and a pack size are shown only when the
 * server published them; booking happens in the shop.
 *
 * Not drawn from the board, because nothing publishes them: the named campus
 * block, report turnaround and fasting rules per test, and the "no fasting" /
 * "report in 24 hrs" filters that would sort on them.
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
  const list = tests ?? [];

  return (
    <PublicSitePage header={<PublicSiteHeader current="labTests" variant="compact" />} art="alternate" footerNote={t('landing.lablist.footerNote')}>
      <LwBanner
        label={t('landing.lablist.bannerLabel')}
        eyebrow={t('landing.lablist.eyebrow')}
        title={t('landing.lablist.bannerTitle')}
        chips={[t('landing.lablist.chipFasting'), t('landing.lablist.chipCollection'), t('landing.lablist.chipTrend')]}
        media={<CanvasVideo name="video-4486f2.mp4" />}
      />

      <LwLabSearch compact href="/shop" />

      <nav aria-label={t('landing.lablist.breadcrumb')} className="lw-crumbs">
        <a href="/">{t('landing.lablist.home')}</a>
        <span aria-hidden="true" className="lw-crumbs__sep">{t('landing.lablist.crumbSep')}</span>
        <a href="/lab-tests">{t('landing.subpage.nav.labTests')}</a>
        <span aria-hidden="true" className="lw-crumbs__sep">{t('landing.lablist.crumbSep')}</span>
        <span aria-current="page">{t('landing.lablist.crumbPrices')}</span>
      </nav>

      <div className="lw-section lw-section--tight">
        <div className="lw-heading">
          <div className="lw-heading__text">
            <h1 className="lw-h2">{t('landing.lablist.title')}</h1>
            {list.length > 0 ? <span className="lw-count">{t('landing.lablist.count', { count: list.length })}</span> : null}
          </div>
          <a href="/shop?kind=lab" className="lw-btn lw-btn--secondary">
            {t('landing.lablist.searchShop')}
          </a>
        </div>

        <div aria-live="polite">
          <LwLoadState
            loading={catalog.loading}
            failed={failed}
            empty={list.length === 0}
            onRetry={catalog.reload}
            text={{ loading: t('landing.lablist.loading'), errorTitle: t('landing.lablist.errorTitle'), errorBody: t('landing.lablist.errorBody'), empty: t('landing.lablist.empty') }}
          />
          {!catalog.loading && !failed && list.length > 0 ? (
            <ul className="lw-grid lw-grid--4">
              {list.map((test) => {
                const off = offPercent(test.mrpPaise, test.pricePaise);
                return (
                  <li key={test.id} className="lw-panel lw-test">
                    <div className="lw-test__top">
                      <LwIconTile icon="flask-2" size={34} />
                      {off > 0 ? <span className="lw-off">{t('landing.labtests.offPct', { pct: off })}</span> : null}
                    </div>
                    <span className="lw-panel__title">{test.name}</span>
                    {test.pack ? <span className="lw-test__pack">{test.pack}</span> : null}
                    {test.brand ? <span className="lw-test__brand">{test.brand}</span> : null}
                    <span className="lw-spacer" />
                    <div className="lw-price">
                      <div className="lw-price__amounts">
                        {off > 0 ? (
                          <span className="lw-price__was" aria-label={t('landing.lablist.wasPrice', { price: rupees(test.mrpPaise) })}>
                            {rupees(test.mrpPaise)}
                          </span>
                        ) : null}
                        <span className="lw-price__now">{rupees(test.pricePaise)}</span>
                      </div>
                      <a href="/shop?kind=lab" className="lw-btn lw-btn--primary" aria-label={t('landing.lablist.bookAria', { name: test.name })}>
                        {t('landing.lablist.book')}
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <LwNote icon="info-3">{t('landing.lablist.disclaimer')}</LwNote>
      </div>
    </PublicSitePage>
  );
}
