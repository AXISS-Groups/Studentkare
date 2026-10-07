import React, { useState } from 'react';
import { CheckCircle2, Clock, Download } from 'lucide-react';
import '../../theme/workflows.css';

interface VaccineRecord {
  id: string;
  name: string;
  category: 'CAMPUS_MANDATORY' | 'PREVENTIVE' | 'SEASONAL';
  status: 'COMPLETED' | 'DUE' | 'UPCOMING';
  administeredDate?: string;
  dueDate?: string;
  doseDetails: string;
  batchNo?: string;
  facility: string;
}

export function VaccinationScheduleScreen() {
  const [vaccines] = useState<VaccineRecord[]>([
    {
      id: 'v-1',
      name: 'Hepatitis B (3 Dose Series)',
      category: 'CAMPUS_MANDATORY',
      status: 'COMPLETED',
      administeredDate: '2025-09-10',
      doseDetails: 'Dose 3 of 3 (Complete)',
      batchNo: 'HEP-B-2025-9982',
      facility: 'IIT Hyderabad Health Centre'
    },
    {
      id: 'v-2',
      name: 'Typhoid Conjugate Vaccine (TCV)',
      category: 'CAMPUS_MANDATORY',
      status: 'COMPLETED',
      administeredDate: '2025-10-15',
      doseDetails: 'Single Dose',
      batchNo: 'TYPH-2025-1102',
      facility: 'IIT Hyderabad Health Centre'
    },
    {
      id: 'v-3',
      name: 'HPV Vaccine (Human Papillomavirus)',
      category: 'PREVENTIVE',
      status: 'DUE',
      dueDate: '2026-10-10',
      doseDetails: 'Dose 2 of 2 Due',
      facility: 'Campus Health Centre / Apollo Clinic'
    },
    {
      id: 'v-4',
      name: 'Influenza Annual Quadrivalent Booster',
      category: 'SEASONAL',
      status: 'UPCOMING',
      dueDate: '2026-11-01',
      doseDetails: 'Annual Booster',
      facility: 'On-Campus Health Camp'
    }
  ]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">PREVENTIVE IMMUNIZATION TRACKER</span>
          <h2>Student Vaccination Schedule</h2>
          <p>Track campus-required vaccines, batch numbers, and upcoming preventive booster dates compliant with ABDM FHIR R4 immunization records.</p>
        </div>
      </div>

      {/* Compliance Status Card */}
      <div className="wf-card" style={{ padding: 20, marginBottom: 24, background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)', color: '#fff', borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontSize: 11, letterSpacing: 1.5, color: '#a7f3d0', textTransform: 'uppercase', fontWeight: 700 }}>CAMPUS IMMUNIZATION STATUS</span>
            <h3 style={{ fontSize: 22, marginTop: 4, color: '#fff' }}>100% Mandatory Campus Compliant</h3>
            <p style={{ fontSize: 13, color: '#d1fae5', margin: '2px 0 0' }}>
              All mandatory Institute vaccines (Hepatitis B, Typhoid) verified by Campus Health Officer.
            </p>
          </div>
          <button className="health-button" style={{ background: '#fff', color: '#047857', border: 'none', fontWeight: 700, minHeight: 44 }}>
            <Download size={16} /> Download ABDM Certificate PDF
          </button>
        </div>
      </div>

      {/* Vaccine List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {vaccines.map(v => (
          <div key={v.id} className="wf-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <strong style={{ fontSize: 16 }}>{v.name}</strong>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  background: v.category === 'CAMPUS_MANDATORY' ? '#dbeafe' : '#f3e8ff',
                  color: v.category === 'CAMPUS_MANDATORY' ? '#1e40af' : '#6b21a8'
                }}>
                  {v.category.replace(/_/g, ' ')}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0' }}>
                {v.doseDetails} · Provider: <strong>{v.facility}</strong>
              </p>
              {v.batchNo && (
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Batch No: <code>{v.batchNo}</code></span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {v.status === 'COMPLETED' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16, 185, 129, 0.1)', color: '#065f46', padding: '6px 14px', borderRadius: 999, fontWeight: 700, fontSize: 13 }}>
                  <CheckCircle2 size={16} color="#10b981" /> Completed ({v.administeredDate})
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(245, 158, 11, 0.1)', color: '#92400e', padding: '6px 14px', borderRadius: 999, fontWeight: 700, fontSize: 13 }}>
                  <Clock size={16} color="#f59e0b" /> Due: {v.dueDate}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
