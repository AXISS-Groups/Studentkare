import React from 'react';
import { useT } from '@/i18n';
import { useSearchParams } from '@/core/navigation';
import { WebOrdersView } from './WebOrdersView';
import { WebMyLabTestsView } from './t1/WebMyLabTestsView';

/** `?view=lab-tests` opens the lab tests tab; anything else is the orders. */
export const LAB_TESTS_VIEW = 'lab-tests';

/**
 * Orders above phone width, with My lab tests as its second tab (founder
 * decision, 23 Oct 2026: each place once; the sidebar no longer has a separate
 * "My lab tests"). Each tab is the page it was, unchanged: shop orders from
 * /orders, lab bookings from /lab-orders.
 */
export function WebOrdersHub() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const labs = params.get('view') === LAB_TESTS_VIEW;
  const show = (lab: boolean) => {
    const next = new URLSearchParams(params);
    if (lab) next.set('view', LAB_TESTS_VIEW); else next.delete('view');
    setParams(next);
  };
  return (
    <>
      <div className="sk-sw-page sk-sw-hubbar">
        <div className="sk-sw-tabs" role="group" aria-label={t('shell.item.orders')} data-testid="orders-hub-tabs">
          <button type="button" className="sk-sw-tab" aria-pressed={!labs} onClick={() => show(false)}>{t('shell.item.orders')}</button>
          <button type="button" className="sk-sw-tab" aria-pressed={labs} onClick={() => show(true)}>{t('shell.item.labTests')}</button>
        </div>
      </div>
      {labs ? <WebMyLabTestsView /> : <WebOrdersView />}
    </>
  );
}
