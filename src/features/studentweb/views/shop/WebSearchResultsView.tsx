import React from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { navigate } from '@/lib/utils/workflowRouting';
import { SORT_ORDERS } from '../../data/studentWebData';
import type { SortOrder } from '../../data/studentWebData';
import { UrgentNote } from '../parts';

/**
 * The search results board's pieces (canvas 3b, WebSearchResults, Tier 2), in
 * the Mobile 2.0 look and shared by the catalogue and its search: the filter
 * panel (kind with the server's counts, category, sort) and the help rail
 * (Ask Ayush, where it goes, Urgent?).
 *
 * Made true: results are listed by name (the server's order), never ranked
 * clinically and never by anything about the student; price sorting re-sorts
 * only the page on screen; "Delivering to" names no address, because pickup
 * or delivery is chosen at checkout.
 */
export type ShopKind = 'all' | 'product' | 'lab' | 'consultation' | 'vaccine';
export const SHOP_KINDS: readonly ShopKind[] = ['all', 'product', 'lab', 'consultation', 'vaccine'];
export const asShopKind = (value: string | null): ShopKind => (SHOP_KINDS as readonly string[]).includes(value ?? '') ? value as ShopKind : 'all';

/** Categories the catalogue uses (`shopweb.category.<id>` labels). */
const CATEGORIES = ['vitamins', 'skin', 'devices', 'nutrition', 'first-aid', 'ayurveda', 'medicines', 'labs', 'general-care', 'diabetes', 'heart', 'stomach', 'liver', 'bone-joint', 'kidney', 'respiratory', 'eye', 'vaccines'] as const;

const KIND_ICON: Record<ShopKind, SkIconName> = { all: 'search-2', product: 'pill-2', lab: 'flask-2', consultation: 'doctor-2', vaccine: 'pipette' };
const SORT_LABEL: Record<SortOrder, MessageKey> = { name: 'sw.search.sort.name', priceLow: 'sw.search.sort.priceLow', priceHigh: 'sw.search.sort.priceHigh' };

export function ShopFilterPanel({ kind, category, sort, counts, onKind, onCategory, onSort }: {
  kind: ShopKind;
  category: string;
  sort: SortOrder;
  /** Server totals per kind for the current search and category; undefined while loading. */
  counts: Partial<Record<ShopKind, number>>;
  onKind: (kind: ShopKind) => void;
  onCategory: (category: string) => void;
  onSort: (sort: SortOrder) => void;
}) {
  const t = useT();
  const categoryLabel = (value: string) => (value === 'all' ? t('shopweb.catalog.allCategories') : t(`shopweb.category.${value}` as MessageKey));
  return (
    <aside className="sk-m2w-filters" aria-label={t('sw.search.filtersLabel')}>
      <div className="sk-m2w-filters__group">
        <span className="sk-m2w-eyebrow" id="sk-m2w-kinds">{t('m2w.show')}</span>
        <div className="sk-m2w-chiprow" role="group" aria-labelledby="sk-m2w-kinds">
          {SHOP_KINDS.map((id) => (
            <button key={id} type="button" className="sk-m2w-kindbtn" aria-pressed={kind === id} onClick={() => onKind(id)}>
              <Icon name={KIND_ICON[id]} size={16} />
              <span>{t(`shopweb.tabs.${id}` as MessageKey)}</span>
              <span className="sk-m2w-kindbtn__count">{counts[id] ?? '—'}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="sk-m2w-filters__group">
        <span className="sk-m2w-eyebrow" id="sk-m2w-cats">{t('sw.search.category')}</span>
        <div className="sk-m2w-chiprow" role="group" aria-labelledby="sk-m2w-cats">
          {(['all', ...CATEGORIES] as const).map((value) => (
            <button key={value} type="button" className="sk-m2w-chip" aria-pressed={category === value} onClick={() => onCategory(value)}>{categoryLabel(value)}</button>
          ))}
        </div>
      </div>
      <div className="sk-m2w-filters__group">
        <label className="sk-m2w-select">
          <span className="sk-m2w-eyebrow">{t('sw.search.sortLabel')}</span>
          <span className="sk-m2w-select__box">
            <select value={sort} onChange={(event) => onSort(event.target.value as SortOrder)}>
              {SORT_ORDERS.map((id) => <option key={id} value={id}>{t(SORT_LABEL[id])}</option>)}
            </select>
            <Icon name="chevron-down" size={16} />
          </span>
        </label>
        {sort !== 'name' ? <small className="sk-m2w-meta">{t('m2w.sortNote')}</small> : null}
      </div>
      <div className="sk-m2w-ranked">
        <Icon name="check" size={16} color="var(--sk-color-positive)" />
        <span><strong>{t('sw.search.rankedTitle')}</strong><small>{t('sw.search.rankedBody')}</small></span>
      </div>
    </aside>
  );
}

/** Help beside the results: Ayush points to the right kind of care, where it goes, and urgent help. */
export function ShopHelpRail() {
  const t = useT();
  return (
    <>
      <div className="sk-m2w-ayush">
        <span className="sk-m2w-ayush__eyebrow"><span className="sk-m2w-live" aria-hidden="true" />{t('sw.search.ayushEyebrow')}</span>
        <strong>{t('sw.search.ayushTitle')}</strong>
        <p>{t('sw.search.ayushBody')}</p>
        <button type="button" className="sk-m2w-btn sk-m2w-btn--light sk-m2w-btn--sm" onClick={() => navigate('ayush')}><Icon name="ayush-spark" size={16} />{t('sw.search.askAyush')}</button>
      </div>
      <div className="sk-m2w-panel sk-m2w-deliver">
        <span className="sk-m2w-eyebrow">{t('sw.search.deliveringTo')}</span>
        <span className="sk-m2w-deliver__row">
          <Icon name="pin-drop" size={18} color="var(--sk-color-action)" />
          <span><strong>{t('sw.search.deliverTitle')}</strong><small>{t('sw.search.deliverBody')}</small></span>
        </span>
      </div>
      <UrgentNote />
    </>
  );
}
