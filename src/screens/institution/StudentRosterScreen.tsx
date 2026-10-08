import React, { useState } from 'react';
import { Users, Upload, AlertCircle, Search } from 'lucide-react';
import { EmptyState } from '../../components/interface/WorkflowUI';

export interface RosterStudent {
  id: string;
  name: string;
  rollNo: string;
  programme: string;
  year: string;
  hostelBlock: string;
  roomNo: string;
  contact: string;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'INVITED';
  emergencyContact: string;
}

export const StudentRosterScreen: React.FC = () => {
  const [students] = useState<RosterStudent[]>([]); // No roster API yet — never seed invented students.
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [csvUploaded, setCsvUploaded] = useState<boolean>(false);

  const handleSimulateCsvUpload = () => {
    setCsvUploaded(true);
    setTimeout(() => setCsvUploaded(false), 3000);
  };

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.hostelBlock.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '24px' }}>
      <div className="wf-card" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users style={{ color: 'var(--action)', width: '24px', height: '24px' }} />
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>Campus & Hostel Student Roster</h2>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-3)' }}>
            Manage student accounts, room assignments & campus verification (Non-health fields only • Rule L compliant).
          </p>
        </div>

        <button
          className="wf-btn-primary"
          onClick={handleSimulateCsvUpload}
          style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
        >
          <Upload size={16} />
          <span>Upload Student CSV</span>
        </button>
      </div>

      {csvUploaded && (
        <div role="status" style={{ background: 'var(--attention-fill)', color: '#7c2d12', padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>Roster upload isn’t available yet. No file was read and no invites were sent.</span>
        </div>
      )}

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-3)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name, roll number, or hostel block..."
            style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' }}
          />
        </div>
      </div>

      {/* Roster Table */}
      {students.length === 0 ? <EmptyState title="No students on the roster yet." description="Students appear here once they join and verify with your campus." /> : <div className="wf-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--rule)', color: 'var(--text-2)' }}>
              <th style={{ padding: '12px 16px' }}>Student Name</th>
              <th style={{ padding: '12px 16px' }}>Roll No</th>
              <th style={{ padding: '12px 16px' }}>Programme & Year</th>
              <th style={{ padding: '12px 16px' }}>Hostel / Room</th>
              <th style={{ padding: '12px 16px' }}>Contact Phone</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
                <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text)' }}>{s.name}</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-2)' }}>{s.rollNo}</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-2)' }}>{s.programme} • {s.year}</td>
                <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text)' }}>{s.hostelBlock} - Rm {s.roomNo}</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-2)' }}>{s.contact}</td>
                <td style={{ padding: '14px 16px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: s.verificationStatus === 'VERIFIED' ? 'var(--positive-fill)' : 'var(--attention-fill)',
                      color: s.verificationStatus === 'VERIFIED' ? '#064e3b' : '#7c2d12',
                    }}
                  >
                    {s.verificationStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </div>
  );
};
