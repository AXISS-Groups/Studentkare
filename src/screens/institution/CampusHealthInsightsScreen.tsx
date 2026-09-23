import React, { useState } from 'react';
import { CampusEpidemicOutbreakRadar } from '@/components/CampusEpidemicOutbreakRadar';
import { BarChart3, ShieldCheck, Filter } from 'lucide-react';

export const CampusHealthInsightsScreen: React.FC = () => {
  const [selectedCohort, setSelectedCohort] = useState<string>('ALL');

  return (
    <div style={{ padding: '24px' }}>
      <div className="wf-card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 style={{ color: 'var(--action)', width: '24px', height: '24px' }} />
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>Campus & Cohort Health Insights</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            Aggregate health metrics (Screening coverage %, Vaccination %, BP/BMI bands). Groups &lt; 5 hidden; zero body-metric leaderboards (Rule L).
          </p>
        </div>

        {/* Cohort Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: 'var(--text-3)' }} />
          <select
            value={selectedCohort}
            onChange={(e) => setSelectedCohort(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}
          >
            <option value="ALL">All Campus Cohorts</option>
            <option value="BLOCK_A">Hostel Block A</option>
            <option value="BLOCK_B">Hostel Block B</option>
            <option value="YEAR_1">1st Year Students</option>
            <option value="YEAR_2">2nd Year Students</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <CampusEpidemicOutbreakRadar />
      </div>
    </div>
  );
};
