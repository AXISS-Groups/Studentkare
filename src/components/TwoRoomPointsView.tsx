/**
 * Studentkare — Two-Room Points Model Component (UI-3.4)
 * Compliance: Section UI-3.4 Specification
 *
 * Structurally separates:
 * - Room 1: Care Savings (₹0 CBC, ₹0 Teleconsult, Preventive milestones)
 * - Room 2: Student Discount Marketplace (Partners learn only campus + year)
 *
 * Strict Rules:
 * - Violet (#7C5CFC) is reserved EXCLUSIVELY for the Points Register.
 * - ZERO points for blood donation (incentivised donation compromises blood safety).
 */

import React, { useState } from 'react';
import { Award, ShoppingBag, HeartPulse, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const TwoRoomPointsView: React.FC = () => {
  const [activeRoom, setActiveRoom] = useState<'CARE_SAVINGS' | 'MARKETPLACE'>('CARE_SAVINGS');
  const [userPoints, setUserPoints] = useState(480);

  return (
    <div style={{ background: '#08080F', color: '#F4F4FA', borderRadius: '18px', border: '1px solid #1F1F30', overflow: 'hidden' }}>
      {/* Header Banner — Violet accents reserved for Points Register */}
      <div style={{ background: 'linear-gradient(135deg, #101019, #14141F)', padding: '24px', borderBottom: '1px solid #1F1F30', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#A78BFA', letterSpacing: '1px', textTransform: 'uppercase' }}>Points Register</span>
          <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800 }}>Studentkare Care & Rewards</h2>
        </div>
        <div style={{ background: 'rgba(124,92,252,0.15)', border: '1px solid #7C5CFC', padding: '10px 18px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Award size={20} color="#A78BFA" />
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#A78BFA', fontFamily: 'monospace' }}>{userPoints} PTS</span>
        </div>
      </div>

      {/* Room Selection Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#101019', borderBottom: '1px solid #1F1F30' }}>
        <button
          onClick={() => setActiveRoom('CARE_SAVINGS')}
          style={{
            padding: '16px', background: activeRoom === 'CARE_SAVINGS' ? 'rgba(124,92,252,0.12)' : 'transparent',
            border: 'none', borderBottom: activeRoom === 'CARE_SAVINGS' ? '2px solid #7C5CFC' : '2px solid transparent',
            color: activeRoom === 'CARE_SAVINGS' ? '#A78BFA' : '#9095A8', fontWeight: 700, fontSize: '14px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <HeartPulse size={18} /> Room 1: Care Savings (₹0 Care)
        </button>

        <button
          onClick={() => setActiveRoom('MARKETPLACE')}
          style={{
            padding: '16px', background: activeRoom === 'MARKETPLACE' ? 'rgba(124,92,252,0.12)' : 'transparent',
            border: 'none', borderBottom: activeRoom === 'MARKETPLACE' ? '2px solid #7C5CFC' : '2px solid transparent',
            color: activeRoom === 'MARKETPLACE' ? '#A78BFA' : '#9095A8', fontWeight: 700, fontSize: '14px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          <ShoppingBag size={18} /> Room 2: Student Marketplace
        </button>
      </div>

      {/* Room 1 Content: Care Savings */}
      {activeRoom === 'CARE_SAVINGS' && (
        <div style={{ padding: '24px' }}>
          <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: '#9095A8', lineHeight: 1.6 }}>
            Points in Room 1 attach to completing preventive milestones (e.g. annual health checkup, camp station clearance).
            They redeem directly for zero-cost clinical services.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#14141F', border: '1px solid #1F1F30', borderRadius: '14px', padding: '18px' }}>
              <div style={{ fontSize: '12px', color: '#34D399', fontWeight: 700, marginBottom: '6px' }}>₹0 FULLY COVERED</div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Complete Blood Count (CBC)</div>
              <div style={{ fontSize: '13px', color: '#9095A8', marginBottom: '16px' }}>NABL Accredited Partner Lab · 150 PTS</div>
              <button style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#7C5CFC', color: '#FFF', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                Redeem ₹0 CBC Voucher
              </button>
            </div>

            <div style={{ background: '#14141F', border: '1px solid #1F1F30', borderRadius: '14px', padding: '18px' }}>
              <div style={{ fontSize: '12px', color: '#34D399', fontWeight: 700, marginBottom: '6px' }}>₹0 FULLY COVERED</div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>General Teleconsultation</div>
              <div style={{ fontSize: '13px', color: '#9095A8', marginBottom: '16px' }}>Verified Campus Clinician · 100 PTS</div>
              <button style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#7C5CFC', color: '#FFF', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                Redeem ₹0 Consult
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room 2 Content: Student Marketplace */}
      {activeRoom === 'MARKETPLACE' && (
        <div style={{ padding: '24px' }}>
          <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', padding: '12px 16px', borderRadius: '10px', color: '#60A5FA', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Lock size={16} />
            <span>Marketplace Privacy Rule: External partners learn ONLY your campus name and graduation year. Zero health data is shared.</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#14141F', border: '1px solid #1F1F30', borderRadius: '14px', padding: '18px' }}>
              <div style={{ fontSize: '12px', color: '#A78BFA', fontWeight: 700, marginBottom: '6px' }}>30% OFF PARTNER OFFER</div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Self-Drive Bike & Car Rentals</div>
              <div style={{ fontSize: '13px', color: '#9095A8', marginBottom: '16px' }}>Available across Hyderabad campuses · 200 PTS</div>
              <button style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(124,92,252,0.2)', color: '#A78BFA', border: '1px solid #7C5CFC', fontWeight: 700, cursor: 'pointer' }}>
                Claim 30% Coupon
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '14px 24px', background: '#0C0C14', borderTop: '1px solid #1F1F30', fontSize: '11.5px', color: '#7E7E92', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldCheck size={14} color="#34D399" />
        <span>Ethical Commitment: Points attach strictly to task completion. Blood donation is un-incentivised by design.</span>
      </div>
    </div>
  );
};
