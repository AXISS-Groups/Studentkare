import React, { useState } from 'react';
import { ShieldAlert, Bed } from 'lucide-react';
import { QuarantineDischargeCertificateModal } from '../../components/institution/QuarantineDischargeCertificateModal';
import '../../theme/workflows.css';

interface IsolatedStudent {
  id: string;
  studentName: string;
  roomNo: string;
  condition: string;
  isolatedDate: string;
  temp: string;
  mealStatus: 'DELIVERED' | 'PENDING';
}

export function OutbreakIsolationDeskScreen() {
  const [isolations, setIsolations] = useState<IsolatedStudent[]>([
    { id: 'iso-1', studentName: 'Rohan Mehta', roomNo: 'Block B - Iso Room 04', condition: 'Viral Gastroenteritis', isolatedDate: '2026-09-23', temp: '99.2 °F', mealStatus: 'DELIVERED' },
    { id: 'iso-2', studentName: 'Priya Nair', roomNo: 'Block B - Iso Room 02', condition: 'Influenza A', isolatedDate: '2026-09-22', temp: '100.4 °F', mealStatus: 'PENDING' }
  ]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">EPIDEMIC CONTAINMENT WORKSPACE</span>
          <h2>Campus Outbreak Isolation & Quarantine Desk</h2>
          <p>Manage hostel isolation rooms, daily temperature logs, and contactless mess meal deliveries during infectious outbreaks.</p>
        </div>
      </div>

      <div className="wf-card" style={{ padding: 20, marginBottom: 20, borderLeft: '4px solid var(--emergency, #ef4444)' }}>
        <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--emergency, #ef4444)' }}>
          <ShieldAlert size={20} /> Active Infection Cluster Monitoring
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          2 students currently in hostel isolation rooms. Symptom trends updated twice daily by Resident Medical Assistant.
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <QuarantineDischargeCertificateModal />
      </div>

      <div className="wf-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bed size={18} /> Isolation Room Roster ({isolations.length})
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isolations.map(item => (
            <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, background: 'var(--surface-card, #fff)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <strong style={{ fontSize: 15 }}>{item.studentName}</strong> — <code>{item.roomNo}</code>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0' }}>
                    Condition: <strong>{item.condition}</strong> · Isolated since: {item.isolatedDate} · Latest Temp: <strong>{item.temp}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                    background: item.mealStatus === 'DELIVERED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: item.mealStatus === 'DELIVERED' ? '#065f46' : '#92400e'
                  }}>
                    Mess Meal Drop: {item.mealStatus}
                  </span>
                  <button 
                    className="health-button" 
                    style={{ minHeight: 36, fontSize: 12 }}
                    onClick={() => {
                      setIsolations(isolations.map(i => i.id === item.id ? { ...i, mealStatus: 'DELIVERED' } : i));
                    }}
                  >
                    Mark Meal Delivered
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
