import React, { useState } from 'react';
import { FlaskConical, Send, Plus, CheckCircle2 } from 'lucide-react';
import { Field } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

export function DoctorLabOrderDispatchScreen() {
  const [selectedTests, setSelectedTests] = useState<string[]>(['Complete Blood Count (CBC)', 'Dengue NS1 Antigen']);
  const [collectionMode, setCollectionMode] = useState<'HOME' | 'WALK_IN'>('WALK_IN');
  const [fasting, setFasting] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  const availableTests = [
    'Complete Blood Count (CBC)',
    'Dengue NS1 Antigen & IgM',
    'Lipid Profile Full',
    'Thyroid Function Test (T3, T4, TSH)',
    'Fasting Blood Sugar (FBS)',
    'Liver Function Test (LFT)',
    'Widal Test (Typhoid)',
    'Urine Routine & Micro'
  ];

  const toggleTest = (test: string) => {
    if (selectedTests.includes(test)) {
      setSelectedTests(selectedTests.filter(t => t !== test));
    } else {
      setSelectedTests([...selectedTests, test]);
    }
  };

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTests.length > 0) {
      setDispatched(true);
      setTimeout(() => setDispatched(false), 2000);
    }
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">DIAGNOSTIC ORDERS</span>
          <h2>Doctor Lab Order Dispatch Desk</h2>
          <p>Order clinical laboratory investigations and dispatch directly to campus diagnostic labs.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div className="wf-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FlaskConical size={18} /> Select Diagnostic Test Panels
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {availableTests.map(test => {
              const active = selectedTests.includes(test);
              return (
                <button
                  key={test}
                  type="button"
                  className={`health-button ${active ? 'health-button-primary' : ''}`}
                  style={{ justifyContent: 'flex-start', minHeight: 44, fontSize: 13, textAlign: 'left' }}
                  onClick={() => toggleTest(test)}
                >
                  {active ? '✓ ' : '+ '} {test}
                </button>
              );
            })}
          </div>

          <Field label="Collection Protocol">
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="radio" name="mode" checked={collectionMode === 'WALK_IN'} onChange={() => setCollectionMode('WALK_IN')} />
                Walk-in Campus Lab
              </label>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="radio" name="mode" checked={collectionMode === 'HOME'} onChange={() => setCollectionMode('HOME')} />
                Hostel Room Sample Collection
              </label>
            </div>
          </Field>
        </div>

        <div className="wf-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="care-eyebrow">DISPATCH SUMMARY</span>
          <div>
            <strong>Selected ({selectedTests.length} tests):</strong>
            <ul style={{ fontSize: 13, margin: '6px 0 0', paddingLeft: 16 }}>
              {selectedTests.map(t => <li key={t}>{t}</li>)}
            </ul>
          </div>

          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={fasting} onChange={e => setFasting(e.target.checked)} />
            Fasting Required (8-10 hrs)
          </label>

          <button 
            className="health-button health-button-primary"
            disabled={selectedTests.length === 0}
            style={{ minHeight: 44, width: '100%', marginTop: 'auto' }}
            onClick={handleDispatch}
          >
            <Send size={16} /> {dispatched ? 'Dispatched to Lab!' : 'Dispatch Lab Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
