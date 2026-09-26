import React, { useState } from 'react';
import { Utensils, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import '../../theme/workflows.css';

interface DietLog {
  id: string;
  studentName: string;
  roomNo: string;
  restriction: 'GLUTEN_FREE' | 'LACTOSE_INTOLERANT' | 'DIABETIC_SPECIAL' | 'RECOVERY_LIGHT_DIET';
  prescribedBy: string;
  startDate: string;
}

export function MealDietRestrictionsScreen() {
  const [diets] = useState<DietLog[]>([
    { id: 'd-1', studentName: 'Aditya Sen', roomNo: 'Block A - Room 104', restriction: 'GLUTEN_FREE', prescribedBy: 'Dr. V. Prasad (Campus Clinic)', startDate: '2026-08-10' },
    { id: 'd-2', studentName: 'Rohan Mehta', roomNo: 'Block B - Iso Room 04', restriction: 'RECOVERY_LIGHT_DIET', prescribedBy: 'Dr. V. Prasad (Campus Clinic)', startDate: '2026-09-23' }
  ]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">MESS NUTRITION & CLINICAL DIETS</span>
          <h2>Campus Meal & Special Diet Restrictions</h2>
          <p>Track student medical dietary requirements verified by campus clinicians for hostel mess catering.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {diets.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{item.studentName}</strong> (<code>{item.roomNo}</code>)
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Prescribed by <strong>{item.prescribedBy}</strong> on {item.startDate}
              </p>
            </div>

            <span style={{
              fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 999,
              background: '#dbeafe', color: '#1e40af'
            }}>
              {item.restriction.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
