import React, { useState } from 'react';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface HealthCampEvent {
  id: string;
  title: string;
  partnerName: string;
  venue: string;
  date: string;
  capacity: number;
  rsvps: number;
}

export function CampusHealthCampHostScreen() {
  // No camp-hosting API yet: no invented events or third-party partners.
  const [camps] = useState<HealthCampEvent[]>([]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">CAMPUS EVENT MANAGEMENT</span>
          <h2>Campus Health Camp Host Portal</h2>
          <p>Approve venue allocations, coordinate partner healthcare providers, and manage student attendance.</p>
        </div>
      </div>

      {camps.length === 0 && <EmptyState title="No health camps yet." description="Health camps scheduled for your campus will appear here." />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {camps.map(item => (
          <div key={item.id} className="wf-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{item.title}</strong>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Partner: <strong>{item.partnerName}</strong> · Venue: <strong>{item.venue}</strong> · Date: {item.date}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent, #2563eb)' }}>{item.rsvps} / {item.capacity} RSVPs</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
