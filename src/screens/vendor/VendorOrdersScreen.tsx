import React, { useState } from 'react';
import {
  Search,
  X,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '@/theme/styles/vendorOrders.css';
import { useAuth } from '../../data/AuthContext';
import { partnerDisplayName } from './partnerAccess';

export interface OrderItem {
  id: string;
  orderNumber: string;
  deliverTo: string;
  contentsCount: number;
  totalPrice: number;
  prescriptionStatus: 'Prescription verified' | 'No prescription needed' | 'Awaiting pharmacist check';
  statusLabel: string;
  statusType: 'pack-red' | 'pack-indigo' | 'blocked' | 'delivery' | 'delivered';
  itemsSummary: string;
  customerName: string;
  orderTime: string;
}

/** Sample orders for tests only — the screen never shows these by default. */
export const DEMO_ORDERS: OrderItem[] = [
  {
    id: 'ord-1',
    orderNumber: '#SK-40218',
    deliverTo: 'Block B-214',
    contentsCount: 2,
    totalPrice: 578,
    prescriptionStatus: 'Prescription verified',
    statusLabel: 'Pack by 16:00',
    statusType: 'pack-red',
    itemsSummary: 'Amoxicillin 500mg (10 cap), Paracetamol 650mg (15 tab)',
    customerName: 'Krishna C.',
    orderTime: '14:22',
  },
  {
    id: 'ord-2',
    orderNumber: '#SK-40217',
    deliverTo: 'Block C-108',
    contentsCount: 1,
    totalPrice: 299,
    prescriptionStatus: 'No prescription needed',
    statusLabel: 'Pack by 17:30',
    statusType: 'pack-indigo',
    itemsSummary: 'Daily Multivitamin Essentials (30 cap)',
    customerName: 'Aarav S.',
    orderTime: '14:40',
  },
  {
    id: 'ord-3',
    orderNumber: '#SK-40216',
    deliverTo: 'Block A-331',
    contentsCount: 3,
    totalPrice: 1187,
    prescriptionStatus: 'Awaiting pharmacist check',
    statusLabel: 'Blocked',
    statusType: 'blocked',
    itemsSummary: 'Prescription item (pharmacist verification pending), ORS pack (5 satchets)',
    customerName: 'Student (Anonymous)',
    orderTime: '14:55',
  },
  {
    id: 'ord-4',
    orderNumber: '#SK-40215',
    deliverTo: 'Block D-042',
    contentsCount: 1,
    totalPrice: 429,
    prescriptionStatus: 'No prescription needed',
    statusLabel: 'Out for delivery',
    statusType: 'delivery',
    itemsSummary: 'Barrier Care Daily Moisturiser (100 ml)',
    customerName: 'Diya R.',
    orderTime: '13:10',
  },
  {
    id: 'ord-5',
    orderNumber: '#SK-40214',
    deliverTo: 'Block B-119',
    contentsCount: 2,
    totalPrice: 748,
    prescriptionStatus: 'Prescription verified',
    statusLabel: 'Delivered 14:20',
    statusType: 'delivered',
    itemsSummary: 'Azithromycin 500mg (3 tab), Cetirizine 10mg (10 tab)',
    customerName: 'Meera I.',
    orderTime: '12:05',
  },
];

export interface VendorOrdersScreenProps {
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
  initialOrders?: OrderItem[];
}

const RX_STATUS_KEY: Record<OrderItem['prescriptionStatus'], MessageKey> = {
  'Prescription verified': 'partner.vhome.orders.rx.verified',
  'No prescription needed': 'partner.vhome.orders.rx.notNeeded',
  'Awaiting pharmacist check': 'partner.vhome.orders.rx.awaiting',
};

export function VendorOrdersScreen({ initialOrders }: VendorOrdersScreenProps) {
  const { user } = useAuth();
  const t = useT();
  // Orders come only from the caller. There is no orders feed wired here yet,
  // so without one the screen is honestly empty — never sample orders.
  const [orders, setOrders] = useState<OrderItem[]>(() => initialOrders ?? []);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };


  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.deliverTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'pack') {
      return order.statusType === 'pack-red' || order.statusType === 'pack-indigo';
    }
    if (activeFilter === 'blocked') {
      return order.statusType === 'blocked';
    }
    if (activeFilter === 'delivery') {
      return order.statusType === 'delivery';
    }
    if (activeFilter === 'delivered') {
      return order.statusType === 'delivered';
    }
    return true;
  });

  const handleMarkPacked = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              statusLabel: t('partner.vhome.orders.statusOutForDelivery'),
              statusType: 'delivery',
            }
          : o
      )
    );
    setSelectedOrder(null);
    // Local only: nothing is sent to a server or a courier from here yet.
    showToast(t('partner.vhome.orders.packedToast'));
  };

  // Counts are computed from the orders on screen — never typed-in numbers.
  const openCount = orders.length;
  const awaitingCount = orders.filter((o) => o.statusType === 'blocked').length;
  const deliveryCount = orders.filter((o) => o.statusType === 'delivery').length;
  const packNeededCount = orders.filter((o) => o.statusType === 'pack-red' || o.statusType === 'pack-indigo').length;
  const deliveredCount = orders.filter((o) => o.statusType === 'delivered').length;
  const itemsLabel = (order: OrderItem) =>
    t(order.contentsCount === 1 ? 'partner.vhome.orders.itemsOne' : 'partner.vhome.orders.itemsOther', {
      count: order.contentsCount,
      price: order.totalPrice,
    });


  return (
    <div className="sk-orders-page">

      {/* ================= Main Content Container ================= */}
      <main className="sk-orders-content">
        {/* Top Header Row */}
        <div className="sk-orders-header-row">
          <div className="sk-orders-header-titles">
            <h1 className="sk-orders-title">{t('partner.vhome.orders.title')}</h1>
            <span className="sk-orders-sub">
              {partnerDisplayName(user)} · {t('partner.vhome.orders.sub')}
            </span>
          </div>

          <span className="sk-orders-blocked-pill" role="status" aria-label={t('partner.vhome.orders.blockedAria', { count: awaitingCount })}>
            <span className="sk-orders-pulse-dot" aria-hidden="true" />
            {t('partner.vhome.orders.blockedPill', { count: awaitingCount })}
          </span>
        </div>

        {/* 4 Stat Cards Row */}
        <div className="sk-orders-stats-row">
          <div className="sk-orders-stat-card">
            <span className="sk-orders-stat-val">{openCount}</span>
            <span className="sk-orders-stat-label">{t('partner.vhome.orders.stat.open')}</span>
          </div>
          <div className="sk-orders-stat-card">
            <span className="sk-orders-stat-val is-amber">{awaitingCount}</span>
            <span className="sk-orders-stat-label">{t('partner.vhome.orders.stat.awaiting')}</span>
          </div>
          <div className="sk-orders-stat-card">
            <span className="sk-orders-stat-val is-emerald">{deliveryCount}</span>
            <span className="sk-orders-stat-label">{t('partner.vhome.orders.stat.delivery')}</span>
          </div>
          <div className="sk-orders-stat-card">
            {/* No pack-time measurements exist yet, so no figure is shown. */}
            <span className="sk-orders-stat-val">—</span>
            <span className="sk-orders-stat-label">{t('partner.vhome.orders.stat.medianPack')}</span>
          </div>
        </div>

        {/* Controls Toolbar: Search & Filter Tabs */}
        <div className="sk-orders-toolbar">
          <div className="sk-orders-search-box">
            <Search size={16} color="var(--sk-color-text-3)" aria-hidden="true" />
            <input
              type="text"
              className="sk-orders-search-input"
              placeholder={t('partner.vhome.orders.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('partner.vhome.orders.searchAria')}
            />
            {searchQuery && (
              <button
                type="button"
                style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setSearchQuery('')}
                aria-label={t('partner.vhome.orders.clearSearch')}
              >
                <X size={14} color="var(--sk-color-text-3)" />
              </button>
            )}
          </div>

          <div className="sk-orders-tabs" role="tablist" aria-label={t('partner.vhome.orders.filtersAria')}>
            {[
              { key: 'all', label: t('partner.vhome.orders.tab.all', { count: openCount }) },
              { key: 'pack', label: t('partner.vhome.orders.tab.pack', { count: packNeededCount }) },
              { key: 'blocked', label: t('partner.vhome.orders.tab.blocked', { count: awaitingCount }) },
              { key: 'delivery', label: t('partner.vhome.orders.tab.delivery', { count: deliveryCount }) },
              { key: 'delivered', label: t('partner.vhome.orders.tab.delivered', { count: deliveredCount }) },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeFilter === tab.key}
                className={`sk-orders-tab-btn ${activeFilter === tab.key ? 'is-active' : ''}`}
                onClick={() => setActiveFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Orders Table Card */}
        <div className="sk-orders-card">
          <div className="sk-orders-table-header">
            <span className="sk-orders-th">{t('partner.vhome.orders.th.order')}</span>
            <span className="sk-orders-th">{t('partner.vhome.orders.th.deliverTo')}</span>
            <span className="sk-orders-th">{t('partner.vhome.orders.th.contents')}</span>
            <span className="sk-orders-th">{t('partner.vhome.orders.th.rx')}</span>
            <span className="sk-orders-th align-right">{t('partner.vhome.orders.th.status')}</span>
          </div>

          {filteredOrders.length === 0 ? (
            <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--sk-color-text-3)', fontSize: 14 }}>
              {orders.length === 0 ? t('partner.vhome.orders.noOrders') : t('partner.vhome.orders.noMatch')}
            </div>
          ) : (
            filteredOrders.map((order) => {
              let badgeClass = 'sk-orders-pill-red';
              if (order.statusType === 'pack-indigo') badgeClass = 'sk-orders-pill-indigo';
              if (order.statusType === 'blocked') badgeClass = 'sk-orders-pill-amber';
              if (order.statusType === 'delivery') badgeClass = 'sk-orders-pill-emerald';
              if (order.statusType === 'delivered') badgeClass = 'sk-orders-pill-gray';

              return (
                <div
                  key={order.id}
                  className="sk-orders-row"
                  onClick={() => setSelectedOrder(order)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedOrder(order);
                    }
                  }}
                  aria-label={t('partner.vhome.orders.rowAria', { number: order.orderNumber })}
                >
                  <span className="sk-orders-col-id">{order.orderNumber}</span>
                  <span className="sk-orders-col-deliver">{order.deliverTo}</span>
                  <span className="sk-orders-col-contents">
                    {itemsLabel(order)}
                  </span>
                  <span className="sk-orders-col-rx">{t(RX_STATUS_KEY[order.prescriptionStatus])}</span>
                  <div className="sk-orders-col-status">
                    <span className={badgeClass}>{order.statusLabel}</span>
                  </div>
                </div>
              );
            })
          )}

          {/* Compliance Rule Note */}
          <span className="sk-orders-compliance-note">
            {t('partner.vhome.orders.note')}
          </span>
        </div>
      </main>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="sk-orders-modal-overlay"
          onClick={() => setSelectedOrder(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-order-title"
        >
          <div
            className="sk-orders-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sk-orders-modal-header">
              <h2 id="modal-order-title" className="sk-orders-modal-title">
                {selectedOrder.orderNumber}
              </h2>
              <button
                type="button"
                className="sk-orders-modal-close"
                onClick={() => setSelectedOrder(null)}
                aria-label={t('partner.vhome.orders.closeDetails')}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--sk-color-surface-2)', borderRadius: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sk-color-text-3)' }}>{t('partner.vhome.orders.destination')}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--sk-color-text)' }}>{selectedOrder.deliverTo}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--sk-color-surface-2)', borderRadius: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sk-color-text-3)' }}>{t('partner.vhome.orders.contents')}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sk-color-text)' }}>
                  {itemsLabel(selectedOrder)}
                </span>
              </div>

              <div style={{ padding: '10px 14px', background: 'var(--sk-color-surface-2)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--sk-color-text-3)', letterSpacing: '0.8px' }}>{t('partner.vhome.orders.itemsInPack')}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sk-color-text)' }}>{selectedOrder.itemsSummary}</span>
              </div>

              {selectedOrder.statusType === 'blocked' ? (
                <div style={{ padding: 14, background: 'var(--sk-color-attention-bg)', border: '1.5px solid var(--sk-color-attention)', borderRadius: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <AlertTriangle size={20} color="var(--sk-color-attention)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sk-color-text)', lineHeight: 1.5 }}>
                    <strong>{t('partner.vhome.orders.gateTitle')}</strong><br />
                    {t('partner.vhome.orders.gateBody')}
                  </div>
                </div>
              ) : selectedOrder.statusType === 'delivery' || selectedOrder.statusType === 'delivered' ? (
                <div style={{ padding: 14, background: 'var(--sk-color-positive-bg)', border: '1.5px solid var(--sk-color-positive)', borderRadius: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <ShieldCheck size={20} color="var(--sk-color-positive)" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sk-color-positive)' }}>
                    {selectedOrder.statusLabel}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
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
                  onClick={() => handleMarkPacked(selectedOrder.id)}
                >
                  {t('partner.vhome.orders.markPacked')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toastMessage && <div className="sk-orders-toast" role="status" aria-live="polite">{toastMessage}</div>}
    </div>
  );
}

export default VendorOrdersScreen;
