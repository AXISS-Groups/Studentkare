import React, { useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { Field } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface HostelBlock {
  id: string;
  name: string;
  code: string;
  capacity: number;
  assignedWarden: string;
  activeCount: number;
}

export function MultiBlockConfigScreen() {
  const [blocks, setBlocks] = useState<HostelBlock[]>([
    { id: 'b-1', name: 'Hostel Block A (Ramanujan Hall)', code: 'BLK-A', capacity: 450, assignedWarden: 'Prof. S. V. Kumar', activeCount: 412 },
    { id: 'b-2', name: 'Hostel Block B (Aryabhata Hall)', code: 'BLK-B', capacity: 500, assignedWarden: 'Dr. Ananya Roy', activeCount: 485 },
    { id: 'b-3', name: 'Hostel Block C (Sarojini Naidu Hall)', code: 'BLK-C', capacity: 350, assignedWarden: 'Smt. P. Lakshmi', activeCount: 320 }
  ]);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState('400');
  const [warden, setWarden] = useState('');

  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && code) {
      setBlocks([...blocks, {
        id: `b-${Date.now()}`,
        name,
        code,
        capacity: Number(capacity),
        assignedWarden: warden || 'Unassigned',
        activeCount: 0
      }]);
      setName('');
      setCode('');
      setWarden('');
    }
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">INSTITUTIONAL HIERARCHY</span>
          <h2>Campus Multi-Block Hierarchy Config</h2>
          <p>Define hostel blocks, warden scopes, and student capacity boundaries for cohort health isolation.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="wf-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={18} /> Configured Hostel Blocks ({blocks.length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {blocks.map(b => (
                <div key={b.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, background: 'var(--surface-card, #fff)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: 15 }}>{b.name}</strong> (<code>{b.code}</code>)
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                        Warden Scope: <strong>{b.assignedWarden}</strong> · Capacity: <strong>{b.activeCount} / {b.capacity} Residents</strong>
                      </p>
                    </div>
                    <span style={{ fontSize: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#065f46', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                      ACTIVE
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="wf-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={18} /> Add New Hostel Block
            </h3>
            <form onSubmit={handleAddBlock} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Block Name">
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Block D (Bhabha Hall)" required />
                </Field>
                <Field label="Block Code">
                  <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. BLK-D" required />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Resident Capacity">
                  <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} required />
                </Field>
                <Field label="Assigned Warden Name">
                  <input type="text" value={warden} onChange={e => setWarden(e.target.value)} placeholder="e.g. Dr. K. Raman" />
                </Field>
              </div>

              <button className="health-button health-button-primary" type="submit" style={{ minHeight: 44, width: 'fit-content' }}>
                Save Block Configuration
              </button>
            </form>
          </section>
        </div>

        <div className="wf-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="care-eyebrow">COHORT PRIVACY THRESHOLD</span>
          <h4 style={{ fontSize: 15, marginTop: 4 }}>Rule L $k \ge 5$ Anonymity</h4>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Wardens only see health trends for blocks with 5 or more active residents to preserve individual health privacy.
          </p>
        </div>
      </div>
    </div>
  );
}
