import React, { useState } from 'react';
import '../../theme/workflows.css';

interface Workshop {
  id: string;
  title: string;
  instructor: string;
  schedule: string;
  venue: string;
  rsvps: number;
}

export function WellnessWorkshopsScreen() {
  const [workshops] = useState<Workshop[]>([
    { id: 'w-1', title: 'Mindfulness & Exam Stress Resilience Workshop', instructor: 'Dr. Neha Kapoor (Clinical Psychologist)', schedule: 'Every Wednesday, 5:00 PM', venue: 'Student Wellness Centre Studio', rsvps: 42 },
    { id: 'w-2', title: 'Sleep Hygiene & Circadian Reset Session', instructor: 'Coach S. Ramakrishnan', schedule: 'Friday 6:00 PM', venue: 'Sports Complex Meditation Room', rsvps: 28 }
  ]);

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">PREVENTIVE MENTAL WELLNESS</span>
          <h2>Campus Wellness Workshops & Yoga Schedule</h2>
          <p>Organize mental wellness seminars, mindfulness groups, and stress resilience sessions for students.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {workshops.map(w => (
          <div key={w.id} className="wf-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <strong style={{ fontSize: 16 }}>{w.title}</strong>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Instructor: <strong>{w.instructor}</strong> · Schedule: <strong>{w.schedule}</strong> · Venue: <strong>{w.venue}</strong>
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent, #2563eb)' }}>{w.rsvps} Student RSVPs</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
