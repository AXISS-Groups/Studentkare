import { useState } from 'react';
import { Ticket, Search, Download, X, Sparkles } from 'lucide-react';
import { CAMPUS_100_TICKETS, CampusTicket } from '../../data/campus100Tickets';

interface ServiceDeskTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ServiceDeskTicketsModal({ isOpen, onClose }: ServiceDeskTicketsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<CampusTicket | null>(null);

  if (!isOpen) return null;

  const filteredTickets = CAMPUS_100_TICKETS.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.subCategory.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    const matchesPriority = selectedPriority === 'ALL' || t.priority === selectedPriority;
    const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  const exportTicketsMarkdown = () => {
    const header = `# 🎫 Studentkare 100 Campus Health & Service Desk Tickets Export
Generated At: ${new Date().toLocaleString()}
Total Tickets Exported: ${filteredTickets.length} / 100

| Ticket ID | Student Name | Hostel Block | Category | Priority | Status | Title |
|-----------|--------------|--------------|----------|----------|--------|-------|
`;

    const rows = filteredTickets.map(t =>
      `| ${t.id} | ${t.studentName} | ${t.hostelBlock} | ${t.category} | ${t.priority} | ${t.status} | ${t.title} |`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campus-100-tickets-export-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="wf-modal-backdrop" onClick={onClose}>
      <div className="wf-modal-card" style={{ maxWidth: '960px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 20 }} onClick={e => e.stopPropagation()}>
        <button className="wf-modal-close" onClick={onClose} aria-label="Close Tickets Modal">
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#eff6ff', color: '#2563eb', padding: 10, borderRadius: 12 }}>
              <Ticket size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>100 Campus Health & Service Desk Tickets</h3>
                <span className="health-badge health-badge-teal" style={{ fontSize: '10px' }}>
                  <Sparkles size={10} /> 100 Flow Tickets Ready
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Complete multi-aspect workflow log across Tele-Health, Smart Sensors, Labs, Sanitation, Pharmacy, Insurance & Emergency.
              </p>
            </div>
          </div>

          <button onClick={exportTicketsMarkdown} className="health-button health-button-primary" style={{ fontSize: '11px', gap: 6 }}>
            <Download size={13} /> Export 100 Tickets (MD)
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, background: '#f8fafc', padding: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '4px 10px' }}>
            <Search size={14} color="#64748b" style={{ marginRight: 6 }} />
            <input
              type="text"
              placeholder="Search by ticket ID, student name, keyword..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.8rem' }}
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff' }}
          >
            <option value="ALL">All Categories (100 Engineering Tickets)</option>
            <option value="DEV_SCALING">Development Scaling & Infra (25)</option>
            <option value="QA_BACKEND">QA Backend & Automation (25)</option>
            <option value="AI_ENGINEERING">AI Architecture & LLMs (25)</option>
            <option value="SECOPS_AUTOMATION">SecOps, CI/CD & Scouting (25)</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={e => setSelectedPriority(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff' }}
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">🔴 Critical</option>
            <option value="HIGH">🟠 High</option>
            <option value="MEDIUM">🟡 Medium</option>
            <option value="LOW">🔵 Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="ESCALATED">Escalated</option>
          </select>

          <span style={{ fontSize: '0.78rem', color: '#64748b', alignSelf: 'center', fontWeight: 600, marginLeft: 'auto' }}>
            Showing {filteredTickets.length} / 100 Tickets
          </span>
        </div>

        {/* Tickets Table / List */}
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 2 }}>
              <tr>
                <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Ticket ID</th>
                <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Student & Hostel</th>
                <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Category</th>
                <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Title & Description</th>
                <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Priority</th>
                <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket, index) => (
                <tr
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: index % 2 === 0 ? '#ffffff' : '#fafafa',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}>
                    {ticket.id}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <strong style={{ color: '#0f172a', display: 'block' }}>{ticket.studentName}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{ticket.hostelBlock}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', background: '#e2e8f0', color: '#334155', borderRadius: 4 }}>
                      {ticket.subCategory}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', maxWidth: 320 }}>
                    <strong style={{ color: '#1e293b', display: 'block', marginBottom: 2 }}>{ticket.title}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                      {ticket.description}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: ticket.priority === 'CRITICAL' ? '#ffe4e6' : ticket.priority === 'HIGH' ? '#ffedd5' : ticket.priority === 'MEDIUM' ? '#fef9c3' : '#e0f2fe',
                        color: ticket.priority === 'CRITICAL' ? '#be123c' : ticket.priority === 'HIGH' ? '#c2410c' : ticket.priority === 'MEDIUM' ? '#a16207' : '#0369a1'
                      }}
                    >
                      {ticket.priority}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 12,
                        background: ticket.status === 'RESOLVED' ? '#dcfce7' : ticket.status === 'IN_PROGRESS' ? '#dbeafe' : ticket.status === 'ESCALATED' ? '#fee2e2' : '#f1f5f9',
                        color: ticket.status === 'RESOLVED' ? '#15803d' : ticket.status === 'IN_PROGRESS' ? '#1d4ed8' : ticket.status === 'ESCALATED' ? '#b91c1c' : '#475569'
                      }}
                    >
                      {ticket.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ticket Detail Drawer Modal */}
        {selectedTicket && (
          <div className="wf-modal-backdrop" onClick={() => setSelectedTicket(null)}>
            <div className="wf-modal-card" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
              <button className="wf-modal-close" onClick={() => setSelectedTicket(null)}>
                <X size={18} />
              </button>

              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 10, marginBottom: 12 }}>
                <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 800, fontFamily: 'monospace' }}>
                  {selectedTicket.id} · {selectedTicket.studentId}
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.1rem', color: '#0f172a' }}>{selectedTicket.title}</h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{selectedTicket.studentName} · {selectedTicket.hostelBlock}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.84rem' }}>
                <p style={{ margin: 0, color: '#334155', lineHeight: 1.5 }}>
                  <strong>Description:</strong> {selectedTicket.description}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#f8fafc', padding: 10, borderRadius: 8 }}>
                  <div><span style={{ color: '#64748b', fontSize: '0.75rem' }}>Assigned Team:</span><br /><strong>{selectedTicket.assignedTeam}</strong></div>
                  <div><span style={{ color: '#64748b', fontSize: '0.75rem' }}>Logged Timestamp:</span><br /><strong>{selectedTicket.timestamp}</strong></div>
                  <div><span style={{ color: '#64748b', fontSize: '0.75rem' }}>Category:</span><br /><strong>{selectedTicket.category}</strong></div>
                  <div><span style={{ color: '#64748b', fontSize: '0.75rem' }}>AI Triaged:</span><br /><strong>{selectedTicket.aiTriaged ? 'Yes (Verified)' : 'No'}</strong></div>
                </div>

                {selectedTicket.resolutionNote && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: 10, borderRadius: 8, color: '#166534' }}>
                    <strong>Resolution Note:</strong> {selectedTicket.resolutionNote}
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="health-button" onClick={() => setSelectedTicket(null)}>
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
