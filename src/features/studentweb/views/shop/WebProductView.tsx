import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { useLiveCart } from '@/data/contexts/LiveCartContext';
import { discountPercent, money } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { M2ProductViewModel } from '@/features/shopPhone/viewmodel/M2ProductViewModel';
import { addToCart } from '@/features/shopPhone/views/M2ProductBoard';
import { strengthOf } from '@/features/shopPhone/views/M2ProductView';
import { rememberListing } from '@/features/phoneKit/listingCache';
import { navigate } from '@/lib/utils/workflowRouting';
import { useNavigate } from '@/core/navigation';
import { EmptyPanel, LoadingRows } from '../parts';
import { cannotAdd, useAddToCart } from './shopShared';
import { hueStyle, itemArt, rise } from './m2WebParts';
import { CartRail, showCartRail } from './ShopCartRail';

/** Facts beside the listing: each one true of every listing, from how the shop works. */
const FACTS: { icon: SkIconName; title: MessageKey; meta: MessageKey; hue: 'sky' | 'violet' | 'amber' }[] = [
  { icon: 'truck-2', title: 'sw.product.fact.delivery', meta: 'sw.product.fact.deliveryMeta', hue: 'sky' },
  { icon: 'rotate-cw', title: 'sw.product.fact.returns', meta: 'sw.product.fact.returnsMeta', hue: 'violet' },
  { icon: 'star-filled', title: 'sw.product.fact.ratings', meta: 'sw.product.fact.ratingsMeta', hue: 'amber' },
];

/** Other makers shown before "Show all". */
const SHOWN = 3;

/**
 * A listing above phone width (canvas 3b WebProduct merged with Mobile 2.0
 * M2Product), on the phone's medicine view model (M2ProductViewModel): the
 * listing, its stock (`GET /inventory/{id}`) and same-composition makers.
 *
 * M2Product's approved Tier 1 rules hold here too: a prescription medicine
 * gets no stepper and no "Add to cart" (the cart refuses it) and no other
 * makers; its actions are "Add Rx" and "Send your prescription to a pharmacy".
 * Reviewed medicine information (uses, side effects, do not take with) does
 * not exist yet, so none is drawn; the listing's own description and
 * preparation are shown as the provider wrote them. Nothing is checked
 * against the student's own medicines (Rule L).
 *
 * Made true, as before: no star rating or review count (the fact card says
 * there are none yet) and no "Earn N Kare points" (points are not tied to a
 * purchase). Lab tests open their booking; consults and vaccines go in the
 * cart and get a requested time at checkout.
 */
export const WebProductView = observer(function WebProductView({ itemId, signedIn, onBack, onOpen, onBookLab }: {
  itemId: string;
  signedIn: boolean;
  onBack: () => void;
  /** Open another listing (another maker). */
  onOpen: (id: string) => void;
  onBookLab: (item: LiveCatalogItem) => void;
}) {
  const t = useT();
  const routerNavigate = useNavigate();
  const cart = useLiveCart();
  const [vm] = useState(() => new M2ProductViewModel());
  const [all, setAll] = useState(false);
  const { add, announce, toast } = useAddToCart(onBookLab, signedIn ? undefined : showCartRail);
  useEffect(() => {
    void vm.load(itemId);
    return () => vm.dispose();
  }, [vm, itemId]);
  const cartUnits = cart.lines.reduce((sum, line) => sum + line.quantity, 0);

  const bar = (
    <div className="sk-m2w-pdp__bar">
      <button type="button" className="sk-m2w-btn sk-m2w-btn--ghost" onClick={onBack}><Icon name="arrow-left" size={16} />{t('sw.product.back')}</button>
      <button type="button" className="sk-m2w-roundbtn" aria-label={cartUnits ? (cartUnits === 1 ? t('m2.cartOne') : t('m2.cartCount', { count: cartUnits })) : t('m2.cart')} onClick={() => (signedIn ? navigate('checkout') : showCartRail())}>
        <Icon name="cart" size={20} />
        {cartUnits ? <span className="sk-m2w-roundbtn__badge" aria-hidden="true">{cartUnits}</span> : null}
      </button>
    </div>
  );

  const item = vm.item;
  if (!item) {
    return (
      <div className="sk-sw-page sk-m2w" data-testid="m2w-product-missing">
        {bar}
        {vm.phase === 'loading' ? <LoadingRows label={t('phone.shop.loading')} rows={4} /> : (
          <EmptyPanel title={t('phone.detail.missingTitle')} body={t('phone.detail.missingBody')} action={{ label: t('phone.list.backToShop'), onPress: onBack }} />
        )}
      </div>
    );
  }

  const art = itemArt(item);
  const off = discountPercent(item.mrpPaise, item.pricePaise);
  const rx = vm.prescription;
  const product = item.kind === 'product';
  const medicine = product && (Boolean(item.medicineId) || item.category === 'medicines');
  const strength = strengthOf(vm.composition);
  const stockText = !product ? '' : vm.stockPhase === 'ready' ? (vm.available ? t('m2.prod.inStock') : t('shop.outOfStock')) : vm.stockPhase === 'error' ? t('m2.prod.stockUnknown') : '';
  const alts = all ? vm.alternatives : vm.alternatives.slice(0, SHOWN);
  const addLabel = vm.canAdd ? t('m2.prod.addN', { count: vm.quantity }) : stockText || t('shop.outOfStock');

  return (
    <div className="sk-sw-page sk-m2w sk-m2w-pdp" data-testid="m2w-product">
      {bar}
      <div className="sk-m2w-cq">
      <div className="sk-m2w-pdp__layout">
        <div className="sk-m2w-pdp__hero sk-m2w-rise" style={rise(0)}>
          <span className="sk-m2w-pdp__ring" aria-hidden="true" />
          {medicine ? (
            <span className="sk-m2w-blister" aria-hidden="true">
              <span className="sk-m2w-blister__pills">{Array.from({ length: 10 }, (_, i) => <span key={i} />)}</span>
              {strength ? <span className="sk-m2w-blister__strength">{strength}</span> : null}
            </span>
          ) : (
            <span className="sk-m2w-pdp__glyph" style={hueStyle(art.hue)} aria-hidden="true"><Icon name={art.icon} size={72} strokeWidth={1.6} /></span>
          )}
          <span className="sk-m2w-pdp__artnote">{t('shopweb.card.illustration')}</span>
        </div>

        <div className="sk-m2w-pdp__info">
          <div className="sk-m2w-rise" style={rise(1)}>
            <div className="sk-m2w-tags">
              {rx ? <span className="sk-m2w-tag sk-m2w-tag--rx" data-testid="m2w-prod-rx">{t('m2.prod.rxNeeded')}</span> : <span className="sk-m2w-tag">{medicine ? t('m2.svc.medicines') : t(`shopweb.kind.${item.kind}` as MessageKey)}</span>}
              {stockText ? (
                <span className={`sk-m2w-tag${vm.available ? ' sk-m2w-tag--ok' : ''}`} aria-live="polite" data-testid="m2w-prod-stock">
                  {vm.available ? <span className="sk-m2w-dot" aria-hidden="true" /> : null}{stockText}
                </span>
              ) : null}
            </div>
            <span className="sk-m2w-eyebrow">{item.brand}</span>
            <h1 className="sk-m2w-pdp__name">{item.name}</h1>
            <p className="sk-m2w-meta">{item.pack}</p>
            {vm.composition ? (
              <p className="sk-m2w-contains"><Icon name="flask" size={16} />{t('m2.prod.contains', { composition: vm.composition })}</p>
            ) : null}
            {item.medicineId ? (
              <a className="sk-m2w-link" href={`/medicine-info?medicine=${encodeURIComponent(item.medicineId)}`} data-testid="m2w-prod-info"
                onClick={(event) => { event.preventDefault(); routerNavigate(`/medicine-info?medicine=${encodeURIComponent(item.medicineId ?? '')}`); }}>
                <Icon name="info" size={16} />{t('mi.productLink')}
              </a>
            ) : null}
          </div>

          <div className="sk-m2w-panel sk-m2w-buy sk-m2w-rise" style={rise(2)}>
            <div className="sk-m2w-buy__price">
              <strong>{money(item.pricePaise)}</strong>
              {off > 0 ? <span className="sk-m2w-meta">{t('m2.prod.mrp', { price: money(item.mrpPaise), percent: off })}</span> : null}
            </div>
            {product && !rx && vm.canAdd ? (
              <div className="sk-m2w-stepper" role="group" aria-label={t('m2.prod.quantity')}>
                <button type="button" aria-label={t('m2.prod.fewer')} disabled={vm.quantity <= 1} onClick={() => vm.setQuantity(vm.quantity - 1)}><Icon name="minus" size={18} strokeWidth={2.6} /></button>
                <output aria-live="polite">{vm.quantity}</output>
                <button type="button" aria-label={t('m2.prod.more')} disabled={vm.quantity >= vm.maxQuantity} onClick={() => vm.setQuantity(vm.quantity + 1)}><Icon name="plus" size={18} strokeWidth={2.6} /></button>
              </div>
            ) : null}
            <div className="sk-m2w-buy__actions">
              {rx ? (
                <>
                  <button type="button" className="sk-m2w-btn sk-m2w-btn--outline" onClick={() => navigate('records')}>{t('m2.prod.addRx')}</button>
                  <button type="button" className="sk-m2w-btn sk-m2w-btn--primary sk-m2w-btn--grow" onClick={() => navigate('prescriptions')}>{t('m2.prod.sendRx')}</button>
                </>
              ) : product ? (
                <button type="button" className="sk-m2w-btn sk-m2w-btn--primary sk-m2w-btn--grow" disabled={!vm.canAdd}
                  onClick={() => { addToCart(cart, item, vm.quantity); announce(item); }}>{addLabel}</button>
              ) : (
                <button type="button" className="sk-m2w-btn sk-m2w-btn--primary sk-m2w-btn--grow" disabled={cannotAdd(item)} onClick={() => add(item)}>
                  {t('shopweb.card.bookSlot')}
                </button>
              )}
            </div>
            {product && vm.stockPhase === 'error' ? <button type="button" className="sk-m2w-textlink" onClick={vm.retryStock}>{t('m2.prod.stockRetry')}</button> : null}
          </div>

          {rx ? (
            <div className="sk-m2w-panel sk-m2w-rxnote sk-m2w-rise" style={rise(3)} data-testid="m2w-prod-rx-note">
              <h2 className="sk-m2w-h3">{t('m2.prod.rxTitle')}</h2>
              <p>{t('m2.prod.rxBody')}</p>
            </div>
          ) : product && item.medicineId ? (
            <section className="sk-m2w-panel sk-m2w-alts sk-m2w-rise" style={rise(3)} aria-labelledby="sk-m2w-alts-title" data-testid="m2w-prod-alts">
              <h2 id="sk-m2w-alts-title" className="sk-m2w-h3">{t('m2.prod.altsTitle')}</h2>
              <p className="sk-m2w-meta">{t('m2.prod.altsSub')}</p>
              {vm.alternativesPhase === 'loading' ? <LoadingRows label={t('m2.prod.altsTitle')} rows={2} /> : null}
              {vm.alternativesPhase === 'error' ? <button type="button" className="sk-m2w-textlink" onClick={vm.retryAlternatives}>{t('m2.prod.altsRetry')}</button> : null}
              {vm.alternativesPhase === 'ready' && vm.alternatives.length === 0 ? <p className="sk-m2w-meta">{t('m2.prod.altsNone')}</p> : null}
              <ul className="sk-m2w-alts__list" aria-live="polite">
                {alts.map((alt, i) => (
                  <li key={alt.id}>
                    <button type="button" onClick={() => { const next = M2ProductViewModel.asItem(alt, item.category); rememberListing(next); onOpen(next.id); }}
                      aria-label={`${alt.name}, ${alt.pack}, ${money(alt.pricePaise)}${i === 0 ? `, ${t('m2.prod.lowest')}` : ''}`}>
                      <span><strong>{alt.name}</strong><small>{[alt.pack, alt.manufacturer || alt.brand].filter(Boolean).join(' · ')}</small></span>
                      {i === 0 ? <span className="sk-m2w-lowest">{t('m2.prod.lowest')}</span> : null}
                      <strong className="sk-m2w-alts__price">{money(alt.pricePaise)}</strong>
                    </button>
                  </li>
                ))}
              </ul>
              {vm.alternatives.length > SHOWN ? (
                <button type="button" className="sk-m2w-textlink" aria-expanded={all} onClick={() => setAll(!all)}>
                  {all ? t('m2.prod.altsFewer') : t('m2.prod.altsAll', { count: vm.alternatives.length })}
                  <Icon name="chevron-down" size={16} className={all ? 'is-open' : undefined} />
                </button>
              ) : null}
            </section>
          ) : null}

          {item.description ? <p className="sk-m2w-desc">{item.description}</p> : null}
          {item.preparation ? <p className="sk-m2w-note">{item.preparation}</p> : null}
          <p className="sk-m2w-note">{t('phone.detail.caution')}</p>
        </div>

        <aside className="sk-m2w-pdp__side" aria-label={t('sw.product.factsLabel')}>
          {FACTS.map((fact) => (
            <div key={fact.title} className="sk-m2w-fact">
              <span className="sk-m2w-soft sk-m2w-soft--sm" style={hueStyle(fact.hue)} aria-hidden="true"><Icon name={fact.icon} size={18} /></span>
              <span><strong>{t(fact.title)}</strong><small>{t(fact.meta)}</small></span>
            </div>
          ))}
          <div className="sk-m2w-advice">
            <span className="sk-m2w-eyebrow">{t('sw.product.adviceEyebrow')}</span>
            <p>{t('sw.product.adviceBody')}</p>
            <div className="sk-m2w-advice__links">
              <button type="button" className="sk-m2w-textlink" onClick={() => navigate('care')}>{t('sw.product.findClinician')}<Icon name="arrow-right" size={14} /></button>
              <button type="button" className="sk-m2w-textlink" onClick={() => navigate('ayush')}><Icon name="sparkle" size={14} />{t('sw.product.askAyush')}</button>
            </div>
          </div>
          <CartRail signedIn={signedIn} />
        </aside>
      </div>
      </div>
      {toast}
    </div>
  );
});
