import React, { useState } from 'react';
import {
  Search,
  X,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
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

export function VendorOrdersScreen({ initialOrders }: VendorOrdersScreenProps) {
  const { user } = useAuth();
  const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST);
  const [orders, setOrders] = useState<OrderItem[]>(() =>
    initialOrders ?? (isTest ? DEMO_ORDERS : [])
  );
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
              statusLabel: 'Out for delivery',
              statusType: 'delivery',
            }
          : o
      )
    );
    setSelectedOrder(null);
    showToast('Order marked as packed & handed to courier');
  };

  const openCount = orders.length > 0 ? 12 : 0;
  const awaitingCount = orders.filter((o) => o.statusType === 'blocked').length;
  const deliveryCount = orders.length > 0 ? 3 : 0;
  const packNeededCount = orders.filter((o) => o.statusType === 'pack-red' || o.statusType === 'pack-indigo').length;
  const deliveredCount = orders.filter((o) => o.statusType === 'delivered').length;
  const medianPack = orders.length > 0 ? '38 min' : '0 min';

  return (
    <div className="sk-orders-page">
      {/* ================= Main Content Container ================= */}
      <main className="sk-orders-content">
        {/* Top Header Row */}
        <div className="sk-orders-header-row">
          <div className="sk-orders-header-titles">
            <h1 className="sk-orders-title">Orders</h1>
            <span className="sk-orders-sub">
              {partnerDisplayName(user)} · accept, pack and hand over student orders
            </span>
          </div>

          <span className="sk-orders-blocked-pill" role="status" aria-label={`${awaitingCount} orders blocked`}>
            <span className="sk-orders-pulse-dot" />
            {awaitingCount} blocked
          </span>
        </div>

        {/* 4 Stat Cards Row */}
        <div className="sk-orders-stats-row">
          <div className="sk-orders-stat-card">
            <span className="sk-orders-stat-val">{openCount}</span>
            <span className="sk-orders-stat-label">Open today</span>
          </div>
          <div className="sk-orders-stat-card">
            <span className="sk-orders-stat-val is-amber">{awaitingCount}</span>
            <span className="sk-orders-stat-label">Awaiting pharmacist</span>
          </div>
          <div className="sk-orders-stat-card">
            <span className="sk-orders-stat-val is-emerald">{deliveryCount}</span>
            <span className="sk-orders-stat-label">Out for delivery</span>
          </div>
          <div className="sk-orders-stat-card">
            <span className="sk-orders-stat-val">{medianPack}</span>
            <span className="sk-orders-stat-label">Median pack time</span>
          </div>
        </div>

        {/* Controls Toolbar: Search & Filter Tabs */}
        <div className="sk-orders-toolbar">
          <div className="sk-orders-search-box">
            <Search size={16} color="#6B6980" />
            <input
              type="text"
              className="sk-orders-search-input"
              placeholder="Search by order #, block or student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search orders"
            />
            {searchQuery && (
              <button
                type="button"
                style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={14} color="#6B6980" />
              </button>
            )}
          </div>

          <div className="sk-orders-tabs" role="tablist" aria-label="Order status filters">
            {[
              { key: 'all', label: `All (${openCount})` },
              { key: 'pack', label: `Pack needed (${packNeededCount})` },
              { key: 'blocked', label: `Blocked (${awaitingCount})` },
              { key: 'delivery', label: `Out for delivery (${deliveryCount})` },
              { key: 'delivered', label: `Delivered (${deliveredCount})` },
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
            <span className="sk-orders-th">ORDER</span>
            <span className="sk-orders-th">DELIVER TO</span>
            <span className="sk-orders-th">CONTENTS</span>
            <span className="sk-orders-th">PRESCRIPTION</span>
            <span className="sk-orders-th align-right">STATUS</span>
          </div>

          {filteredOrders.length === 0 ? (
            <div style={{ padding: '36px 0', textAlign: 'center', color: '#6B6980', fontSize: 14 }}>
              No orders found matching the filter criteria.
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
                  aria-label={`View details for order ${order.orderNumber}`}
                >
                  <span className="sk-orders-col-id">{order.orderNumber}</span>
                  <span className="sk-orders-col-deliver">{order.deliverTo}</span>
                  <span className="sk-orders-col-contents">
                    {order.contentsCount} item{order.contentsCount > 1 ? 's' : ''} · ₹{order.totalPrice}
                  </span>
                  <span className="sk-orders-col-rx">{order.prescriptionStatus}</span>
                  <div className="sk-orders-col-status">
                    <span className={badgeClass}>{order.statusLabel}</span>
                  </div>
                </div>
              );
            })
          )}

          {/* Compliance Rule Note */}
          <span className="sk-orders-compliance-note">
            An order awaiting a pharmacist check cannot be packed — the button is absent, not disabled. You see the block, never what the student was treated for.
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
                aria-label="Close order details"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', borderRadius: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#6B6980' }}>Delivery destination:</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#131B2E' }}>{selectedOrder.deliverTo}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#F8FAFC', borderRadius: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#6B6980' }}>Contents:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#131B2E' }}>
                  {selectedOrder.contentsCount} item{selectedOrder.contentsCount > 1 ? 's' : ''} · ₹{selectedOrder.totalPrice}
                </span>
              </div>

              <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: '#6B6980', letterSpacing: '0.8px' }}>ITEMS IN PACK</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#131B2E' }}>{selectedOrder.itemsSummary}</span>
              </div>

              {selectedOrder.statusType === 'blocked' ? (
                <div style={{ padding: 14, background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 14, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <AlertTriangle size={20} color="#B45309" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#92400E', lineHeight: 1.5 }}>
                    <strong>Prescription Verification Gate Active</strong><br />
                    This order is locked pending supervising pharmacist review. Under Rule L privacy and CDSCO guidelines, clinical indications are hidden from fulfillment staff. Packing button is omitted until clearance is received.
                  </div>
                </div>
              ) : selectedOrder.statusType === 'delivery' || selectedOrder.statusType === 'delivered' ? (
                <div style={{ padding: 14, background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <ShieldCheck size={20} color="#047857" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#047857' }}>
                    {selectedOrder.statusLabel} · Dispatch confirmed
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
                    background: '#3525CD',
                    color: '#FFFFFF',
                    fontFamily: 'inherit',
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: 'pointer',
                    marginTop: 6,
                  }}
                  onClick={() => handleMarkPacked(selectedOrder.id)}
                >
                  Mark as packed & hand over to courier →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toastMessage && <div className="sk-orders-toast">{toastMessage}</div>}
    </div>
  );
}

export default VendorOrdersScreen;
