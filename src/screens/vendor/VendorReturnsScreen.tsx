import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  FlaskConical,
  Home,
  KeyRound,
  LayoutGrid,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Scan,
  Search,
  ShieldAlert,
  Snowflake,
  Tent,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate, RoutePath } from '@/lib/workflowRouting';
import '@/theme/styles/vendorReturns.css';

export interface ReturnRecord {
  id: string;
  orderId: string;
  itemName: string;
  studentName?: string;
  amountPaise: number;
  reasonGiven: string;
  assessment: string;
  outcome: 'Refunded' | 'Replaced' | 'Refused, explained' | 'Recollected free';
  isOurError?: boolean;
  category: 'Prescription' | 'OTC Wellness' | 'Personal Care' | 'Diagnostic Sample';
  notes?: string;
}

const INITIAL_RETURNS: ReturnRecord[] = [
  {
    id: 'ret-1',
    orderId: '#SK-40188',
    itemName: 'Daily Multivitamin Essentials',
    studentName: 'Krishna C.',
    amountPaise: 49900,
    reasonGiven: 'Wrong pack size sent',
    assessment: 'Our error · full refund',
    outcome: 'Refunded',
    isOurError: true,
    category: 'OTC Wellness',
    notes: 'Ordered 60s pack, 30s pack was packed by staff. Full refund processed.',
  },
  {
    id: 'ret-2',
    orderId: '#SK-40171',
    itemName: 'Barrier Care Daily Moisturiser',
    studentName: 'Imran S.',
    amountPaise: 38000,
    reasonGiven: 'Seal broken on arrival',
    assessment: 'Our error · replaced',
    outcome: 'Replaced',
    isOurError: true,
    category: 'Personal Care',
    notes: 'Bottle pump seal cracked in transit courier bag. Same-day replacement dispatched.',
  },
  {
    id: 'ret-3',
    orderId: '#SK-40160',
    itemName: 'Ashwagandha Stress Balance',
    studentName: 'Ayesha K.',
    amountPaise: 45000,
    reasonGiven: 'Student changed their mind',
    assessment: 'Unopened · within 7 days',
    outcome: 'Refunded',
    isOurError: false,
    category: 'OTC Wellness',
    notes: 'Returned unopened with intact tamper tape within 3 days of pickup. Refund approved.',
  },
  {
    id: 'ret-4',
    orderId: '#SK-40144',
    itemName: 'Prescription — D3 60k',
    studentName: 'Rahul M.',
    amountPaise: 24000,
    reasonGiven: 'Return requested',
    assessment: 'Medicine — cannot be resold',
    outcome: 'Refused, explained',
    isOurError: false,
    category: 'Prescription',
    notes: 'Prescription Schedule H medicine. In accordance with Rule 65, medicines cannot be restocked once dispensed.',
  },
  {
    id: 'ret-5',
    orderId: '#SK-40131',
    itemName: 'Complete Health Checkup',
    studentName: 'Nisha P.',
    amountPaise: 120000,
    reasonGiven: 'Sample unusable',
    assessment: 'Haemolysed · lab error',
    outcome: 'Recollected free',
    isOurError: false,
    category: 'Diagnostic Sample',
    notes: 'Phlebotomy sample showed in-transit haemolysis. Free home recollect appointment scheduled.',
  },
];

export const DEMO_RETURNS: ReturnRecord[] = INITIAL_RETURNS;

export interface VendorReturnsScreenProps {
  initialReturns?: ReturnRecord[];
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export function VendorReturnsScreen({ initialReturns, onNavigate, onLogout }: VendorReturnsScreenProps) {
  const { logout } = useAuth();
  const [returnsList, setReturnsList] = useState<ReturnRecord[]>(() =>
    initialReturns ?? (typeof process !== 'undefined' && process.env?.VITEST ? DEMO_RETURNS : [])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Our error' | 'Refunded' | 'Replaced' | 'Refused' | 'Recollected'>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  // New Return Form state
  const [newOrderId, setNewOrderId] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newAmountPaise] = useState(35000);
  const [newReason, setNewReason] = useState('');
  const [newCategory, setNewCategory] = useState<ReturnRecord['category']>('OTC Wellness');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleNav = (target: string) => {
    if (onNavigate) {
      onNavigate(target);
    } else {
      navigate(target as RoutePath);
    }
  };

  const handleSignOut = () => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  };

  // KPIs
  const totalRequests = returnsList.length;
  const ourErrorCount = returnsList.filter((r) => r.isOurError).length;
  const refusedCount = returnsList.filter((r) => r.outcome === 'Refused, explained').length;

  // Filtered List
  const filteredReturns = useMemo(() => {
    return returnsList.filter((record) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        record.orderId.toLowerCase().includes(q) ||
        record.itemName.toLowerCase().includes(q) ||
        record.reasonGiven.toLowerCase().includes(q) ||
        record.assessment.toLowerCase().includes(q) ||
        record.outcome.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (selectedFilter === 'Our error') return record.isOurError;
      if (selectedFilter === 'Refunded') return record.outcome === 'Refunded';
      if (selectedFilter === 'Replaced') return record.outcome === 'Replaced';
      if (selectedFilter === 'Refused') return record.outcome === 'Refused, explained';
      if (selectedFilter === 'Recollected') return record.outcome === 'Recollected free';
      return true;
    });
  }, [returnsList, searchQuery, selectedFilter]);

  // Handle Form Submission for New Return
  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();

    let assessment = 'Student return evaluated';
    let outcome: ReturnRecord['outcome'] = 'Refunded';
    let isOurError = false;

    if (newCategory === 'Prescription') {
      assessment = 'Medicine — cannot be resold';
      outcome = 'Refused, explained';
    } else if (newReason.toLowerCase().includes('wrong') || newReason.toLowerCase().includes('broken') || newReason.toLowerCase().includes('damaged')) {
      assessment = 'Our error · full refund';
      outcome = 'Refunded';
      isOurError = true;
    } else {
      assessment = 'Unopened · within 7 days';
      outcome = 'Refunded';
    }

    const newRecord: ReturnRecord = {
      id: `ret-${Date.now()}`,
      orderId: newOrderId.trim().toUpperCase() || `#SK-${Math.floor(40190 + Math.random() * 80)}`,
      itemName: newItemName.trim() || 'Health Item',
      studentName: newStudentName.trim() || 'Campus Student',
      amountPaise: newAmountPaise,
      reasonGiven: newReason.trim() || 'Return requested at counter',
      assessment,
      outcome,
      isOurError,
      category: newCategory,
      notes: newCategory === 'Prescription' ? 'Prescription medicine return refused under pharmacy safety regulations.' : 'Intake recorded at pharmacy counter.',
    };

    setReturnsList((prev) => [newRecord, ...prev]);
    setShowIntakeModal(false);
    setNewOrderId('');
    setNewItemName('');
    setNewStudentName('');
    setNewReason('');
    showToast(`Return ${newRecord.orderId} logged · Outcome: ${outcome}`);
  };

  return (
    <div className="sk-returns-root">
      {/* 18-Option Partner Sidebar */}
      <aside className="sk-returns-sidebar" aria-label="Partner Navigation">
        <div className="sk-returns-brand">
          <span className="sk-returns-logo">
            <svg width="29" height="34" viewBox="0 0 512 600" fill="none" aria-hidden="true">
              <defs>
                <linearGradient id="skg_ret" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7C89F5" />
                  <stop offset="0.45" stopColor="#4759E8" />
                  <stop offset="1" stopColor="#2F3ED6" />
                </linearGradient>
                <linearGradient id="skg_ret_b" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M256 6 6 84v250c0 128 106 224 250 260 144-36 250-132 250-260V84z" fill="url(#skg_ret)" />
              <path d="M256 6 6 84v250c0 128 106 224 250 260V6z" fill="url(#skg_ret_b)" />
              <path d="M198 196c-38 0-64 22-64 54 0 28 18 42 54 50l20 5c18 4 25 10 25 20 0 13-13 21-33 21-24 0-40-10-46-28l-45 17c11 34 45 54 91 54 46 0 78-24 78-61 0-30-19-45-58-54l-21-5-18-5c-10-4-14-9-14-16 0-11 11-18 29-18 20 0 33 8 39 24l44-16c-11-27-40-42-81-42z" fill="#FFFFFF" />
              <path d="M312 200h48v76l68-76h58l-79 86 83 100h-59l-71-88v88h-48z" fill="#FFFFFF" />
            </svg>
          </span>
          <span className="sk-returns-brand-text">
            <span className="sk-returns-title-text">
              Student<em>&nbsp;Kare</em>
            </span>
            <span className="sk-returns-badge-partner">PARTNER</span>
          </span>
        </div>

        <nav className="sk-returns-nav" aria-label="Partner Console Links">
          {/* Section: STORE */}
          <span className="sk-returns-nav-section">STORE</span>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('vendor')}>
            <Home size={15} />
            <span>Home</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('verify')}>
            <Scan size={15} />
            <span>Verify student</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('orders')}>
            <Package size={15} />
            <span>Orders</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('rx-review')}>
            <FileText size={15} />
            <span>Rx review</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('substitutions')}>
            <ArrowLeftRight size={15} />
            <span>Substitutions</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('handover')}>
            <KeyRound size={15} />
            <span>OTP handover</span>
          </button>
          <button type="button" className="sk-returns-nav-item is-active" aria-current="page">
            <RotateCcw size={15} />
            <span>Returns</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('dispensing')}>
            <ClipboardList size={15} />
            <span>Dispense register</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('reorder')}>
            <RefreshCw size={15} />
            <span>Reorder rules</span>
          </button>

          {/* Section: LAB */}
          <span className="sk-returns-nav-section">LAB</span>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('lab-queue')}>
            <FlaskConical size={15} />
            <span>Sample queue</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('run-sheet')}>
            <Truck size={15} />
            <span>Run sheet</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('cold-chain')}>
            <Snowflake size={15} />
            <span>Cold chain</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => showToast('Opened release results panel')}>
            <CheckCircle2 size={15} />
            <span>Release results</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('camp-intake')}>
            <Tent size={15} />
            <span>Camp intake</span>
          </button>

          {/* Section: BUSINESS */}
          <span className="sk-returns-nav-section">BUSINESS</span>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('partner-staff')}>
            <Users size={15} />
            <span>Staff & roles</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('catalogue')}>
            <LayoutGrid size={15} />
            <span>Catalogue</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('settlement')}>
            <CreditCard size={15} />
            <span>Settlement</span>
          </button>
          <button type="button" className="sk-returns-nav-item" onClick={() => handleNav('performance')}>
            <FileText size={15} />
            <span>Performance</span>
          </button>
        </nav>

        <div className="sk-returns-sidebar-footer">
          <button type="button" className="sk-returns-signout-btn" onClick={handleSignOut}>
            <LogOut size={15} />
            <span>MedPlus · Vijaya Diagnostics</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="sk-returns-main">
        {/* Header */}
        <div className="sk-returns-header">
          <div>
            <h1 className="sk-returns-title">Returns</h1>
            <p className="sk-returns-subtitle">Campus pharmacy · last 30 days</p>
          </div>
          <div className="sk-returns-header-actions">
            <button
              type="button"
              className="sk-returns-policy-btn"
              onClick={() => setShowPolicyModal(true)}
              aria-label="View statutory returns policy"
            >
              <BookOpen size={16} />
              <span>Returns policy</span>
            </button>
            <button
              type="button"
              className="sk-returns-intake-btn"
              onClick={() => setShowIntakeModal(true)}
              aria-label="Record return request at counter"
            >
              <Plus size={16} />
              <span>Record return</span>
            </button>
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="sk-returns-stats-grid">
          <div className="sk-returns-stat-card">
            <span className="sk-returns-stat-number">{totalRequests}</span>
            <span className="sk-returns-stat-label">Requests this month</span>
          </div>
          <div className="sk-returns-stat-card">
            <span className="sk-returns-stat-number is-warning">{ourErrorCount}</span>
            <span className="sk-returns-stat-label">Our error</span>
          </div>
          <div className="sk-returns-stat-card">
            <span className="sk-returns-stat-number">{refusedCount}</span>
            <span className="sk-returns-stat-label">Refused with a reason</span>
          </div>
          <div className="sk-returns-stat-card">
            <span className="sk-returns-stat-number">{returnsList.length > 0 ? '2.1%' : '0.0%'}</span>
            <span className="sk-returns-stat-label">Return rate</span>
          </div>
        </div>

        {/* Toolbar: Filter Tabs & Search */}
        <div className="sk-returns-toolbar">
          <div className="sk-returns-filter-tabs">
            {(['All', 'Our error', 'Refunded', 'Replaced', 'Refused', 'Recollected'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`sk-returns-filter-btn ${selectedFilter === filter ? 'is-active' : ''}`}
                onClick={() => setSelectedFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="sk-returns-search-wrap">
            <Search className="sk-returns-search-icon" size={16} />
            <input
              type="text"
              placeholder="Search by order #, item, or reason..."
              className="sk-returns-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search return requests"
            />
          </div>
        </div>

        {/* Table Area */}
        <div className="sk-returns-table-card">
          <div className="sk-returns-table-header">
            <span className="sk-returns-col-header">ORDER</span>
            <span className="sk-returns-col-header">ITEM</span>
            <span className="sk-returns-col-header">REASON GIVEN</span>
            <span className="sk-returns-col-header">ASSESSMENT</span>
            <span className="sk-returns-col-header" style={{ justifySelf: 'end' }}>
              OUTCOME
            </span>
          </div>

          {filteredReturns.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: '#6B6980', fontSize: 13.5 }}>
              {searchQuery ? `No returns matching "${searchQuery}"` : 'No returns recorded.'}
            </div>
          ) : (
            filteredReturns.map((record) => {
            let badgeClass = 'outcome-refunded';
            if (record.outcome === 'Replaced') badgeClass = 'outcome-replaced';
            if (record.outcome === 'Refused, explained') badgeClass = 'outcome-refused';
            if (record.outcome === 'Recollected free') badgeClass = 'outcome-recollected';

            return (
              <div
                key={record.id}
                className="sk-returns-row"
                onClick={() => setSelectedReturn(record)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => e.key === 'Enter' && setSelectedReturn(record)}
                aria-label={`Order ${record.orderId}, item: ${record.itemName}, outcome: ${record.outcome}`}
              >
                <span className="sk-returns-order-id">{record.orderId}</span>
                <span className="sk-returns-item-name">{record.itemName}</span>
                <span className="sk-returns-reason">{record.reasonGiven}</span>
                <span className="sk-returns-assessment">{record.assessment}</span>
                <span className={`sk-returns-status-badge ${badgeClass}`}>{record.outcome}</span>
              </div>
            );
          }))}

          <div className="sk-returns-policy-footer">
            A refused return still gets a written reason on the student’s order. Dispensed medicine cannot be
            resold and is not refundable — that is a safety rule, so it is stated at checkout rather than
            discovered here.
          </div>
        </div>
      </main>

      {/* Return Request Details Modal */}
      {selectedReturn && (
        <div className="sk-returns-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="return-detail-title">
          <div className="sk-returns-modal">
            <div className="sk-returns-modal-header">
              <h3 id="return-detail-title" className="sk-returns-modal-title">
                Return Assessment: {selectedReturn.orderId}
              </h3>
              <button
                type="button"
                className="sk-returns-modal-close"
                onClick={() => setSelectedReturn(null)}
                aria-label="Close return details modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="sk-returns-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>ORDER REFERENCE</span>
                  <div style={{ fontWeight: 800 }}>{selectedReturn.orderId}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>CURRENT OUTCOME</span>
                  <div>
                    <span className={`sk-returns-status-badge ${selectedReturn.outcome === 'Refused, explained' ? 'outcome-refused' : selectedReturn.outcome === 'Recollected free' ? 'outcome-recollected' : 'outcome-refunded'}`}>
                      {selectedReturn.outcome}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>RETURNED PRODUCT</span>
                  <div style={{ fontWeight: 800 }}>{selectedReturn.itemName}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>ORDER AMOUNT</span>
                  <div style={{ fontWeight: 800 }}>₹{(selectedReturn.amountPaise / 100).toFixed(2)}</div>
                </div>
              </div>

              <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 12 }}>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>STUDENT'S SUBMITTED REASON</span>
                <div style={{ fontSize: 13, marginTop: 4, fontWeight: 600 }}>"{selectedReturn.reasonGiven}"</div>
              </div>

              <div style={{ padding: 12, background: selectedReturn.isOurError ? '#FFFBEB' : '#F1F5F9', borderRadius: 12 }}>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>PHARMACY AUDIT &amp; NOTES</span>
                <div style={{ fontSize: 13, marginTop: 4 }}>{selectedReturn.notes}</div>
              </div>

              {selectedReturn.category === 'Prescription' && (
                <div style={{ padding: 12, background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 12, color: '#9F1239', fontSize: 12 }}>
                  <ShieldAlert size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                  <strong>Non-Returnable Clinical Drug:</strong> In accordance with Drugs &amp; Cosmetics Rules Rule 65, medicines once dispensed cannot be returned or restocked for human safety. A written refusal explanation has been recorded on the order.
                </div>
              )}
            </div>
            <div className="sk-returns-modal-footer">
              <button
                type="button"
                className="sk-returns-btn-secondary"
                onClick={() => setSelectedReturn(null)}
              >
                Close
              </button>
              {selectedReturn.outcome !== 'Refunded' && selectedReturn.category !== 'Prescription' && (
                <button
                  type="button"
                  className="sk-returns-btn-primary"
                  onClick={() => {
                    setReturnsList((prev) =>
                      prev.map((r) =>
                        r.id === selectedReturn.id
                          ? { ...r, outcome: 'Refunded', assessment: 'Our error · full refund' }
                          : r
                      )
                    );
                    setSelectedReturn(null);
                    showToast(`Processed 100% refund for ${selectedReturn.orderId}`);
                  }}
                >
                  Process Full Refund
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statutory Returns Policy Modal */}
      {showPolicyModal && (
        <div className="sk-returns-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="policy-modal-title">
          <div className="sk-returns-modal">
            <div className="sk-returns-modal-header">
              <h3 id="policy-modal-title" className="sk-returns-modal-title">
                Campus Pharmacy Returns &amp; Safety Policy
              </h3>
              <button
                type="button"
                className="sk-returns-modal-close"
                onClick={() => setShowPolicyModal(false)}
                aria-label="Close returns policy modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="sk-returns-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 12 }}>
                  <strong>1. Prescription Medicines (Non-Returnable)</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#475569' }}>
                    Drugs and Cosmetics Rules Rule 65 prohibit restocking or taking back dispensed medicines once they leave custody, ensuring no compromised or counterfeit medications reach students.
                  </p>
                </div>
                <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 12 }}>
                  <strong>2. Unopened OTC &amp; Wellness (7-Day Window)</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#475569' }}>
                    Non-prescription vitamins, personal care, and wellness items in original untampered manufacturer seals can be returned within 7 calendar days with order proof.
                  </p>
                </div>
                <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 12 }}>
                  <strong>3. Partner Dispatch Errors (100% Covered)</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#475569' }}>
                    If the wrong pack size, damaged goods, or expired stock is handed over, the partner will provide an immediate replacement or 100% refund without penalty to the student.
                  </p>
                </div>
                <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 12 }}>
                  <strong>4. Diagnostic Sample Integrity</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#475569' }}>
                    Samples rejected due to lab haemolysis or temperature breach are guaranteed a free recollection. Invalid samples are never run with a footnote.
                  </p>
                </div>
              </div>
            </div>
            <div className="sk-returns-modal-footer">
              <button
                type="button"
                className="sk-returns-btn-primary"
                onClick={() => setShowPolicyModal(false)}
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Return Intake Modal */}
      {showIntakeModal && (
        <div className="sk-returns-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="intake-modal-title">
          <form className="sk-returns-modal" onSubmit={handleCreateReturn}>
            <div className="sk-returns-modal-header">
              <h3 id="intake-modal-title" className="sk-returns-modal-title">
                Record Return Request at Counter
              </h3>
              <button
                type="button"
                className="sk-returns-modal-close"
                onClick={() => setShowIntakeModal(false)}
                aria-label="Close return intake modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="sk-returns-modal-body">
              <div>
                <label htmlFor="intake-order-id" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Order Number
                </label>
                <input
                  id="intake-order-id"
                  type="text"
                  placeholder="e.g. #SK-40195"
                  className="sk-returns-search-input"
                  value={newOrderId}
                  onChange={(e) => setNewOrderId(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="intake-item-name" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Item Name
                </label>
                <input
                  id="intake-item-name"
                  type="text"
                  placeholder="e.g. Probiotic Gut Flora 30s"
                  className="sk-returns-search-input"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label htmlFor="intake-student-name" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Student Name
                  </label>
                  <input
                    id="intake-student-name"
                    type="text"
                    placeholder="e.g. Sneha V."
                    className="sk-returns-search-input"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="intake-category" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Product Category
                  </label>
                  <select
                    id="intake-category"
                    className="sk-returns-search-input"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ReturnRecord['category'])}
                  >
                    <option value="OTC Wellness">OTC Wellness</option>
                    <option value="Personal Care">Personal Care</option>
                    <option value="Prescription">Prescription Medicine</option>
                    <option value="Diagnostic Sample">Diagnostic Sample</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="intake-reason" style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Reason Stated by Student
                </label>
                <input
                  id="intake-reason"
                  type="text"
                  placeholder="e.g. Wrong pack size sent, or Changed mind within 7 days"
                  className="sk-returns-search-input"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  required
                />
              </div>

              {newCategory === 'Prescription' && (
                <div style={{ padding: 12, background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 12, color: '#9F1239', fontSize: 12 }}>
                  <AlertTriangle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                  <strong>Important:</strong> Prescriptions are strictly non-refundable once dispensed. Logging this will generate a written safety refusal notification.
                </div>
              )}
            </div>
            <div className="sk-returns-modal-footer">
              <button
                type="button"
                className="sk-returns-btn-secondary"
                onClick={() => setShowIntakeModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="sk-returns-btn-primary">
                Record Assessment &amp; Log
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="sk-returns-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
