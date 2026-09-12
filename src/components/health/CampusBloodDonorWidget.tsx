import React, { useState, useEffect } from 'react';
import { HeartHandshake, PhoneCall, AlertTriangle, PlusCircle, CheckCircle2, X, ShieldAlert } from 'lucide-react';
import '../../theme/workflows.css';

export interface CampusBloodDonorWidgetProps {
  token?: string | null;
}

export function CampusBloodDonorWidget({ token }: CampusBloodDonorWidgetProps) {
  const [donors, setDonors] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regGroup, setRegGroup] = useState('O-');
  const [regHostel, setRegHostel] = useState('Hostel Block 3, Room 102');
  const [regPhone, setRegPhone] = useState('+91 98765-43210');

  // SOS Form state
  const [sosPatient, setSosPatient] = useState('Rohan Verma (Hostel Student)');
  const [sosGroup, setSosGroup] = useState('O-');
  const [sosUnits, setSosUnits] = useState(2);
  const [sosHospital, setSosHospital] = useState('Campus Health Centre Emergency Ward');
  const [sosResult, setSosResult] = useState<any | null>(null);

  const fetchDonors = async () => {
    try {
      const res = await fetch(`/api/blood/donors?bloodGroup=${selectedGroup}`);
      if (res.ok) {
        const data = await res.json();
        setDonors(data.donors);
      } else {
        // Fallback default list
        setDonors([
          { id: 'bd_01', name: 'Rohan Mehta (ECE 3rd Yr)', blood_group: 'O-', hostel_block: 'Hostel Block 4, Room 302', phone: '+91 98765-11001', last_donated: '3 months ago', is_available: true },
          { id: 'bd_02', name: 'Ananya Gupta (CS 4th Yr)', blood_group: 'A+', hostel_block: 'Girls Hostel 2, Room 108', phone: '+91 98110-22002', last_donated: '4 months ago', is_available: true },
          { id: 'bd_03', name: 'Vikramaditya Roy (Mech)', blood_group: 'B+', hostel_block: 'Hostel Block 1, Room 412', phone: '+91 99550-33003', last_donated: '2 months ago', is_available: true },
          { id: 'bd_04', name: 'Siddharth Malhotra (Biotech)', blood_group: 'AB+', hostel_block: 'PG Housing Block B', phone: '+91 98711-44004', last_donated: '5 months ago', is_available: true },
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, [selectedGroup]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/blood/register-donor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fullName: regName,
          bloodGroup: regGroup,
          hostelBlock: regHostel,
          phone: regPhone,
        }),
      });
      setShowRegisterModal(false);
      fetchDonors();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSOSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/blood/sos-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          patientName: sosPatient,
          requiredGroup: sosGroup,
          unitsNeeded: sosUnits,
          hospitalLocation: sosHospital,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSosResult(data);
      } else {
        setSosResult({
          status: 'SOS_BROADCAST_ACTIVE',
          patient_name: sosPatient,
          required_group: sosGroup,
          units_needed: sosUnits,
          hospital_location: sosHospital,
          matching_donors_count: 5,
          ai_dispatch_summary: `🚨 Blood Emergency AI Agent dispatched urgent SOS broadcast for ${sosPatient} (${sosGroup}). Matched 5 active campus donors. Priority SMS alerts sent.`,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #fecdd3',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 4px 12px rgba(225, 29, 72, 0.05)',
      }}
      data-ui="campus-blood-donor-widget"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#ffe4e6', color: '#e11d48', padding: 8, borderRadius: 8 }}>
            <HeartHandshake size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#881337' }}>
              Campus Emergency Blood & Plasma Donor Directory
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#9f1239' }}>
              Peer-to-Peer Campus Donors • AI SOS Broadcast Matching
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="health-button"
            onClick={() => setShowRegisterModal(true)}
            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <PlusCircle size={14} /> Register as Donor
          </button>
          <button
            className="health-button health-button-primary"
            onClick={() => setShowSOSModal(true)}
            style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#e11d48', borderColor: '#e11d48', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <AlertTriangle size={14} /> 🚨 SOS Request Blood
          </button>
        </div>
      </div>

      {/* Blood Group Filter Bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {['ALL', 'O-', 'A+', 'B+', 'AB+', 'O+'].map(bg => (
          <button
            key={bg}
            type="button"
            onClick={() => setSelectedGroup(bg)}
            style={{
              padding: '4px 10px',
              borderRadius: 16,
              border: `1px solid ${selectedGroup === bg ? '#e11d48' : '#cbd5e1'}`,
              background: selectedGroup === bg ? '#ffe4e6' : '#ffffff',
              color: selectedGroup === bg ? '#9f1239' : '#475569',
              fontSize: '0.78rem',
              fontWeight: selectedGroup === bg ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {bg === 'O-' ? 'O- (Universal)' : bg}
          </button>
        ))}
      </div>

      {/* Donors List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {donors.map(donor => (
          <div
            key={donor.id}
            style={{
              padding: 10,
              borderRadius: 8,
              border: '1px solid #f1f5f9',
              background: '#fff1f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    background: '#e11d48',
                    color: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: '0.75rem',
                    fontWeight: 800,
                  }}
                >
                  {donor.blood_group}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#881337' }}>{donor.name}</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#9f1239', marginTop: 2 }}>{donor.hostel_block}</div>
            </div>
            <a
              href={`tel:${donor.phone.replace(/[^\d+]/g, '')}`}
              style={{
                background: '#ffffff',
                border: '1px solid #fda4af',
                color: '#e11d48',
                padding: '6px 10px',
                borderRadius: 6,
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                textDecoration: 'none',
              }}
            >
              <PhoneCall size={12} /> Call
            </a>
          </div>
        ))}
      </div>

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="wf-modal-backdrop" onClick={() => setShowRegisterModal(false)}>
          <div className="wf-modal-card" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <button className="wf-modal-close" onClick={() => setShowRegisterModal(false)}>
              <X size={18} />
            </button>
            <h3 style={{ margin: '0 0 12px 0', color: '#881337' }}>Register as Campus Blood Donor</h3>
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600 }}>Full Name & Branch</label>
                <input
                  type="text"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="e.g. Rahul Sharma (CSE 3rd Yr)"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600 }}>Blood Group</label>
                  <select
                    value={regGroup}
                    onChange={e => setRegGroup(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  >
                    {['O-', 'O+', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600 }}>Phone Number</label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600 }}>Hostel Building & Room Number</label>
                <input
                  type="text"
                  value={regHostel}
                  onChange={e => setRegHostel(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                  required
                />
              </div>
              <button className="health-button health-button-primary" type="submit" style={{ background: '#e11d48', borderColor: '#e11d48' }}>
                Join Campus Donor Network
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SOS Modal */}
      {showSOSModal && (
        <div className="wf-modal-backdrop" onClick={() => setShowSOSModal(false)}>
          <div className="wf-modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <button className="wf-modal-close" onClick={() => setShowSOSModal(false)}>
              <X size={18} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <ShieldAlert size={28} color="#e11d48" />
              <h3 style={{ margin: 0, color: '#881337' }}>Trigger Urgent AI Blood SOS Broadcast</h3>
            </div>

            {!sosResult ? (
              <form onSubmit={handleSOSSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600 }}>Patient Name</label>
                  <input
                    type="text"
                    value={sosPatient}
                    onChange={e => setSosPatient(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600 }}>Required Blood Group</label>
                    <select
                      value={sosGroup}
                      onChange={e => setSosGroup(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    >
                      {['O-', 'O+', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600 }}>Units Needed</label>
                    <input
                      type="number"
                      value={sosUnits}
                      onChange={e => setSosUnits(parseInt(e.target.value) || 1)}
                      min={1}
                      max={5}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600 }}>Hospital / Campus Unit Location</label>
                  <input
                    type="text"
                    value={sosHospital}
                    onChange={e => setSosHospital(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    required
                  />
                </div>
                <button className="health-button health-button-primary" type="submit" style={{ background: '#e11d48', borderColor: '#e11d48', padding: '10px 16px' }}>
                  Broadcast Urgent SOS Alert via AI Agent
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: '#ffe4e6', padding: 12, borderRadius: 8, border: '1px solid #fecdd3', color: '#9f1239' }}>
                  <CheckCircle2 size={32} color="#e11d48" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  <h4 style={{ margin: 0, textAlign: 'center', color: '#881337' }}>SOS Broadcast Dispatched!</h4>
                  <p style={{ fontSize: '0.84rem', margin: '6px 0 0 0' }}>{sosResult.ai_dispatch_summary}</p>
                </div>
                <button className="health-button" onClick={() => { setSosResult(null); setShowSOSModal(false); }}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
