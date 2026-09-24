import React, { useState } from 'react';
import { Calendar, Clock, MapPin, CheckCircle2, Ticket, Users, FileText } from 'lucide-react';
import { Field } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface CampDrive {
  id: string;
  title: string;
  specialty: string;
  location: string;
  date: string;
  slotsAvailable: number;
  organizer: string;
}

export function HealthCampBookingScreen() {
  const [camps] = useState<CampDrive[]>([
    {
      id: 'camp-101',
      title: 'Annual Campus General & Cardiac Screening Camp',
      specialty: 'General Medicine & ECG',
      location: 'Student Activity Centre (SAC) Hall A',
      date: 'Saturday, 28 Sep 2026',
      slotsAvailable: 42,
      organizer: 'Apollo Hospitals & Campus Health Centre'
    },
    {
      id: 'camp-102',
      title: 'Vision & Eye Refraction Health Drive',
      specialty: 'Ophthalmology & Optometry',
      location: 'Hostel Block B Common Room',
      date: 'Sunday, 29 Sep 2026',
      slotsAvailable: 18,
      organizer: 'L.V. Prasad Eye Institute'
    }
  ]);

  const [selectedCamp, setSelectedCamp] = useState<CampDrive | null>(null);
  const [selectedSlot, setSelectedSlot] = useState('10:00 AM - 10:30 AM');
  const [tokenBooked, setTokenBooked] = useState<string | null>(null);

  const handleBookSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCamp) {
      setTokenBooked(`CAMP-TKN-${Math.floor(100 + Math.random() * 900)}`);
    }
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">PREVENTIVE CAMPUS HEALTH DRIVES</span>
          <h2>Health Camp Booking & Digital Tokens</h2>
          <p>Book free campus health drives, complete digital intake pre-screening, and receive instant queue tokens.</p>
        </div>
      </div>

      {tokenBooked ? (
        <div className="wf-card" style={{ padding: 28, textAlign: 'center', background: 'var(--surface-card, #fff)' }}>
          <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 22 }}>Health Camp Slot Confirmed!</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '4px 0 16px' }}>
            Your Digital Queue Token: <strong style={{ fontSize: 20, color: 'var(--accent, #2563eb)' }}>{tokenBooked}</strong>
          </p>
          <div style={{ maxWidth: 400, margin: '0 auto 20px', background: 'var(--surface-subtle, #f8fafc)', padding: 16, borderRadius: 10, textAlign: 'left', fontSize: 13 }}>
            <div><strong>Event:</strong> {selectedCamp?.title}</div>
            <div><strong>Location:</strong> {selectedCamp?.location}</div>
            <div><strong>Slot:</strong> {selectedSlot}</div>
          </div>
          <button 
            className="health-button health-button-primary"
            style={{ minHeight: 44 }}
            onClick={() => { setTokenBooked(null); setSelectedCamp(null); }}
          >
            Back to Health Camps
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {camps.map(camp => (
            <div key={camp.id} className="wf-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <span className="care-eyebrow">{camp.specialty}</span>
                  <h3 style={{ fontSize: 18, marginTop: 4 }}>{camp.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 10px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <span><MapPin size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {camp.location}</span>
                    <span><Calendar size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {camp.date}</span>
                  </p>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Organized by <strong>{camp.organizer}</strong></span>
                </div>

                <button 
                  className="health-button health-button-primary"
                  style={{ minHeight: 44 }}
                  onClick={() => setSelectedCamp(camp)}
                >
                  <Ticket size={16} /> Book Free Slot ({camp.slotsAvailable} left)
                </button>
              </div>

              {selectedCamp?.id === camp.id && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: 14, marginBottom: 12 }}>Select Appointment Time Slot:</h4>
                  <form onSubmit={handleBookSlot} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    {['09:00 AM - 09:30 AM', '10:00 AM - 10:30 AM', '11:30 AM - 12:00 PM', '02:00 PM - 02:30 PM'].map(slot => (
                      <button
                        key={slot}
                        type="button"
                        className={`health-button ${selectedSlot === slot ? 'health-button-primary' : ''}`}
                        style={{ minHeight: 36, fontSize: 13 }}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {slot}
                      </button>
                    ))}

                    <button className="health-button" type="submit" style={{ background: '#10b981', color: '#fff', border: 'none', minHeight: 44, fontWeight: 700, marginLeft: 'auto' }}>
                      Confirm Token ({selectedSlot})
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
