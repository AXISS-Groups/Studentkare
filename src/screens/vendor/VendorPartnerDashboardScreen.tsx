import React, { useState } from 'react';
import { useTheme } from '../../theme/theme';
import {
  Package,
  Truck,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { StudentKareLogo } from '../../components/StudentKareLogo';

interface VendorPartnerDashboardProps {
  onLogout: () => void;
  onSwitchRole: (role: 'student' | 'admin' | 'vendor') => void;
}

export const VendorPartnerDashboardScreen: React.FC<VendorPartnerDashboardProps> = ({
  onLogout,
  onSwitchRole,
}) => {
  const { tokens, typography } = useTheme();
  ;

  return (
    <div style={{ width: '100%', minHeight: '100vh', backgroundColor: tokens.canvas, padding: '28px 40px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <StudentKareLogo size={34} showStrapline={true} straplineText="DIAGNOSTIC & VENDOR CONSOLE" />
          <span style={{ fontSize: 11, fontFamily: typography.fontMono, backgroundColor: tokens.positiveBg, color: tokens.positive, padding: '4px 12px', borderRadius: 9999, fontWeight: 800 }}>
            ● SRL / LAL PATHLABS KITS ONLINE
          </span>
        </div>

        {/* Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => onSwitchRole('student')}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              backgroundColor: tokens.surface3,
              color: tokens.action,
              border: `1px solid ${tokens.veil}`,
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            🎓 Switch to Student Portal
          </button>
          <button
            onClick={() => onSwitchRole('admin')}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              backgroundColor: tokens.surface3,
              color: tokens.action,
              border: `1px solid ${tokens.veil}`,
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ⚡ Switch to Super Admin
          </button>
          <button
            onClick={onLogout}
            style={{
              padding: '8px 16px',
              borderRadius: 12,
              backgroundColor: tokens.surface2,
              color: tokens.text,
              border: `1px solid ${tokens.ruleSoft}`,
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Vendor Hero Summary */}
      <div
        style={{
          backgroundColor: tokens.surface,
          borderRadius: 24,
          border: `1.5px solid ${tokens.rule}`,
          padding: 28,
          marginBottom: 28,
          boxShadow: '0 10px 32px rgba(83, 80, 204, 0.06)',
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 900, color: tokens.text, letterSpacing: -0.6, marginBottom: 4 }}>
          Diagnostic Lab Orders & Express Hostel Pharmacy Delivery
        </div>
        <div style={{ fontSize: 13, color: tokens.text2, marginBottom: 20 }}>
          Automated CBC Blood Sample dispatches, NABL Lab Reports, and Under 2-Hour Express Pharmacy deliveries to University Hostels.
        </div>

        {/* 4 Vendor KPI Bento Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          
          <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 20, border: `1px solid ${tokens.ruleSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>LAB SAMPLES DISPATCHED</span>
              <FileText size={20} color={tokens.action} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: tokens.text, fontFamily: typography.fontMono }}>
              1,420
            </div>
            <div style={{ fontSize: 11, color: tokens.positive, marginTop: 6, fontWeight: 700 }}>
              100% Barcode Provenance Verified
            </div>
          </div>

          <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 20, border: `1px solid ${tokens.ruleSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>EXPRESS HOSTEL DELIVERIES</span>
              <Truck size={20} color={tokens.action} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: tokens.text, fontFamily: typography.fontMono }}>
              384 <span style={{ fontSize: 14, color: tokens.positive, fontWeight: 700 }}>Avg 42 mins</span>
            </div>
            <div style={{ fontSize: 11, color: tokens.text2, marginTop: 6 }}>
              Under 2-Hour SLA Target Met
            </div>
          </div>

          <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 20, border: `1px solid ${tokens.ruleSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>CONNECTED DEVICES DEPLOYED</span>
              <Package size={20} color={tokens.positive} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: tokens.text, fontFamily: typography.fontMono }}>
              520 <span style={{ fontSize: 14, color: tokens.text3 }}>kits</span>
            </div>
            <div style={{ fontSize: 11, color: tokens.text2, marginTop: 6 }}>
              Omron BP Cuffs, Nonin SpO2, Weight Scales
            </div>
          </div>

          <div style={{ backgroundColor: tokens.canvas, borderRadius: 18, padding: 20, border: `1px solid ${tokens.ruleSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: tokens.text3, fontFamily: typography.fontMono }}>NABL REPORT GENERATION</span>
              <CheckCircle2 size={20} color={tokens.positive} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: tokens.text, fontFamily: typography.fontMono }}>
              99.8%
            </div>
            <div style={{ fontSize: 11, color: tokens.positive, marginTop: 6, fontWeight: 700 }}>
              Auto FHIR Conversion Passed
            </div>
          </div>

        </div>
      </div>

      {/* Main Vendor Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
        
        {/* Lab Test Sample Orders Table */}
        <div style={{ backgroundColor: tokens.surface, borderRadius: 20, border: `1.5px solid ${tokens.rule}`, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: tokens.text, marginBottom: 16 }}>
            SRL Diagnostics Lab Order Dispatches
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { id: 'LAB-9842', test: 'Complete Blood Count (CBC) + Ferritin', student: 'Arjun Mehta (Roll CS2026)', location: 'Osmania Hostel B-402', status: 'Dispatched to SRL Lab' },
              { id: 'LAB-9843', test: 'HbA1c & Fasting Blood Glucose', student: 'Sneha Reddy (Roll CS2024)', location: 'IIT Hyderabad Room H-12', status: 'Report Ready (FHIR)' },
              { id: 'LAB-9844', test: 'Vitamin D3 & B12 Panel', student: 'Rahul Verma (Roll EE2025)', location: 'BITS Hyderabad Hostel 3', status: 'Sample Collected' },
            ].map((order, i) => (
              <div key={i} style={{ backgroundColor: tokens.surface2, borderRadius: 14, padding: 16, border: `1px solid ${tokens.ruleSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: tokens.text }}>{order.test}</div>
                  <div style={{ fontSize: 12, color: tokens.text2, fontFamily: typography.fontMono, marginTop: 2 }}>
                    Ref: {order.id} · {order.student}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: tokens.action, backgroundColor: tokens.surface3, padding: '4px 10px', borderRadius: 9999, fontFamily: typography.fontMono }}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Express Pharmacy Hostel Orders */}
        <div style={{ backgroundColor: tokens.surface, borderRadius: 20, border: `1.5px solid ${tokens.rule}`, padding: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: tokens.text, marginBottom: 16 }}>
            Express Hostel Pharmacy Delivery Routing
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { id: 'PHARM-302', item: 'Inhaler + Anti-Allergy Pack', deliveryTo: 'Osmania Boys Hostel-A, Room 204', eta: '18 mins left', status: 'Out for Delivery 🛵' },
              { id: 'PHARM-303', item: 'ORS Rehydration & Electrolyte Kits', deliveryTo: 'IIT Hyderabad Girls Hostel-2', eta: 'Delivered', status: 'Completed ✓' },
              { id: 'PHARM-304', item: 'Paracetamol & Cold Relief', deliveryTo: 'BITS Hyderabad Hostel-1', eta: '35 mins left', status: 'Packing Bag' },
            ].map((ph, i) => (
              <div key={i} style={{ backgroundColor: tokens.surface2, borderRadius: 14, padding: 16, border: `1px solid ${tokens.ruleSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: tokens.text }}>{ph.item}</div>
                  <div style={{ fontSize: 12, color: tokens.text2, fontFamily: typography.fontMono, marginTop: 2 }}>
                    {ph.deliveryTo} · {ph.eta}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: tokens.positive, backgroundColor: tokens.positiveBg, padding: '4px 10px', borderRadius: 9999, fontFamily: typography.fontMono }}>
                  {ph.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
