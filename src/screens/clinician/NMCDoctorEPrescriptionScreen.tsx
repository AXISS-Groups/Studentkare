import React, { useState } from 'react';
import { Pill, CheckCircle2, ShieldCheck, FileText, Send, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '../../data/http';
import { Field, FormError, useMutation } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface RxItem {
  id: string;
  genericName: string;
  brandName?: string;
  strength: string;
  dose: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  scheduleClass: string;
  substitutionAllowed: boolean;
  instructions: string;
}

const COMMON_MEDICATIONS = [
  { genericName: 'Paracetamol', strength: '650mg', scheduleClass: 'OTC', dose: '1 tablet', frequency: 'TID' },
  { genericName: 'Amoxicillin', strength: '500mg', scheduleClass: 'Schedule H', dose: '1 capsule', frequency: 'BD' },
  { genericName: 'Cetirizine', strength: '10mg', scheduleClass: 'OTC', dose: '1 tablet', frequency: 'HS' },
  { genericName: 'Azithromycin', strength: '500mg', scheduleClass: 'Schedule H', dose: '1 tablet', frequency: 'OD' },
  { genericName: 'Pantoprazole', strength: '40mg', scheduleClass: 'Schedule H', dose: '1 tablet', frequency: 'OD (Empty Stomach)' },
  { genericName: 'Ibuprofen', strength: '400mg', scheduleClass: 'OTC', dose: '1 tablet', frequency: 'BD' },
  { genericName: 'ORS Sachet', strength: '21.8g', scheduleClass: 'OTC', dose: '1 sachet in 1L water', frequency: 'As needed' },
];

export function NMCDoctorEPrescriptionScreen() {
  const [nmcRegNo, setNmcRegNo] = useState('NMC-2024-MH-98214');
  const [selectedStudent] = useState<{ id: string; name: string; age: number; abhaId?: string } | null>({
    id: 'STU-9921',
    name: 'Aarav Sharma',
    age: 20,
    abhaId: '91-2384-9120-4491'
  });
  
  const [diagnosis, setDiagnosis] = useState('Acute Upper Respiratory Tract Infection');
  const [clinicalNotes, setClinicalNotes] = useState('Patient presented with fever, sore throat, and nasal congestion for 2 days. Chest clear.');
  const [items, setItems] = useState<RxItem[]>([
    {
      id: '1',
      genericName: 'Paracetamol',
      brandName: 'Dolo 650',
      strength: '650mg',
      dose: '1 tablet',
      frequency: 'TID (Three times a day)',
      durationDays: 5,
      quantity: 15,
      scheduleClass: 'OTC',
      substitutionAllowed: true,
      instructions: 'After meals'
    },
    {
      id: '2',
      genericName: 'Cetirizine',
      brandName: 'Cetzine',
      strength: '10mg',
      dose: '1 tablet',
      frequency: 'HS (At bedtime)',
      durationDays: 5,
      quantity: 5,
      scheduleClass: 'OTC',
      substitutionAllowed: true,
      instructions: 'Before bed, may cause drowsiness'
    }
  ]);

  const [medQuery, setMedQuery] = useState('');
  const mutation = useMutation();
  const [issuedRxId, setIssuedRxId] = useState<string | null>(null);

  const addItem = (med: typeof COMMON_MEDICATIONS[0]) => {
    const newItem: RxItem = {
      id: String(Date.now()),
      genericName: med.genericName,
      strength: med.strength,
      dose: med.dose,
      frequency: med.frequency,
      durationDays: 5,
      quantity: med.frequency === 'TID' ? 15 : med.frequency === 'BD' ? 10 : 5,
      scheduleClass: med.scheduleClass,
      substitutionAllowed: true,
      instructions: 'Take after meals'
    };
    setItems([...items, newItem]);
    setMedQuery('');
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleIssuePrescription = () => {
    if (!nmcRegNo.trim()) {
      alert('NMC Registration Number is required to sign prescriptions.');
      return;
    }
    if (!selectedStudent) {
      alert('Please select a student.');
      return;
    }
    if (items.length === 0) {
      alert('Prescription must contain at least one medication.');
      return;
    }

    mutation.run(
      () => apiRequest('/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
          studentId: selectedStudent.id,
          prescriberRegNo: nmcRegNo,
          diagnosis,
          clinicalNotes,
          items
        })
      }),
      () => {
        setIssuedRxId(`RX-${Math.floor(100000 + Math.random() * 900000)}`);
      }
    );
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">DOCTOR CONSULTATION WORKSPACE</span>
          <h2>NMC Signed E-Prescription Writer</h2>
          <p>Issue digitally signed prescriptions compliant with NMC & ABDM FHIR R4 guidelines.</p>
        </div>
      </div>

      <FormError message={mutation.error} />

      {issuedRxId ? (
        <div className="wf-card" style={{ borderLeft: '4px solid var(--accent, #10b981)', padding: 24, textAlign: 'center' }}>
          <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 12px' }} />
          <h3>Prescription Successfully Signed & Issued</h3>
          <p>Prescription ID: <strong>{issuedRxId}</strong></p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Digitally signed under NMC Reg <strong>{nmcRegNo}</strong>. Dispatched to <strong>{selectedStudent?.name}</strong>'s Health Vault & selected Campus Pharmacy.
          </p>
          <button 
            className="health-button health-button-primary"
            style={{ marginTop: 16, minHeight: 44 }}
            onClick={() => setIssuedRxId(null)}
          >
            Create Another Prescription
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* NMC Reg Header Bar */}
            <section className="wf-card" style={{ padding: 16, background: 'var(--surface-subtle, #f8fafc)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-[#10b981]between', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ShieldCheck size={22} color="#10b981" />
                  <div>
                    <strong style={{ display: 'block', fontSize: 14 }}>Prescriber NMC Verification</strong>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Registration Active · National Medical Commission</span>
                  </div>
                </div>
                <div style={{ width: 220 }}>
                  <Field label="NMC Reg No.">
                    <input 
                      type="text" 
                      value={nmcRegNo} 
                      onChange={e => setNmcRegNo(e.target.value)}
                      placeholder="e.g. NMC-2024-MH-98214"
                      required
                    />
                  </Field>
                </div>
              </div>
            </section>

            {/* Diagnosis & Notes */}
            <section className="wf-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} /> Diagnosis & Clinical Notes
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Provisional / Final Diagnosis">
                  <input 
                    type="text" 
                    value={diagnosis} 
                    onChange={e => setDiagnosis(e.target.value)} 
                    placeholder="Enter diagnosis..."
                    required
                  />
                </Field>
                <Field label="Clinical Impressions & Advice">
                  <textarea 
                    rows={3} 
                    value={clinicalNotes} 
                    onChange={e => setClinicalNotes(e.target.value)}
                    placeholder="Advice on fluid intake, rest, follow-up parameters..."
                  />
                </Field>
              </div>
            </section>

            {/* Medication List Builder */}
            <section className="wf-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pill size={18} /> Prescribed Medications ({items.length})
              </h3>

              {/* Drug Finder */}
              <div style={{ marginBottom: 16 }}>
                <Field label="Search Standard Formulary / Quick Add">
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      value={medQuery} 
                      onChange={e => setMedQuery(e.target.value)}
                      placeholder="Type medication name (e.g. Paracetamol, Amoxicillin)..."
                    />
                  </div>
                </Field>
                {medQuery.trim().length > 0 && (
                  <div style={{ background: 'var(--surface-card, #fff)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: 'auto' }}>
                    {COMMON_MEDICATIONS.filter(m => m.genericName.toLowerCase().includes(medQuery.toLowerCase())).map((m, idx) => (
                      <div 
                        key={idx} 
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        onClick={() => addItem(m)}
                      >
                        <div>
                          <strong>{m.genericName}</strong> ({m.strength})
                          <small style={{ display: 'block', color: 'var(--text-secondary)' }}>{m.scheduleClass} · {m.frequency}</small>
                        </div>
                        <button className="health-button" style={{ minHeight: 32, padding: '0 8px' }}>
                          <Plus size={14} /> Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Items Table */}
              {items.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>No medicines added to this prescription yet.</p>
              ) : (
                <div className="wf-table-scroll">
                  <table style={{ width: '100%', fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th>Generic / Brand</th>
                        <th>Dose & Freq</th>
                        <th>Days</th>
                        <th>Qty</th>
                        <th>Allow Swap</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.genericName}</strong> {item.brandName && `(${item.brandName})`}
                            <small style={{ display: 'block', color: 'var(--text-secondary)' }}>{item.strength} · {item.scheduleClass}</small>
                          </td>
                          <td>
                            <div>{item.dose}</div>
                            <small style={{ color: 'var(--text-secondary)' }}>{item.frequency}</small>
                          </td>
                          <td>{item.durationDays}d</td>
                          <td>{item.quantity}</td>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={item.substitutionAllowed}
                              onChange={e => {
                                const next = items.map(i => i.id === item.id ? { ...i, substitutionAllowed: e.target.checked } : i);
                                setItems(next);
                              }}
                            />
                          </td>
                          <td>
                            <button 
                              className="health-button" 
                              style={{ minHeight: 36, padding: '0 8px', color: 'var(--emergency, #ef4444)' }}
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Patient Summary & Issue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <section className="wf-card" style={{ padding: 20 }}>
              <span className="care-eyebrow">PATIENT CONTEXT</span>
              <h4 style={{ fontSize: 16, marginTop: 4 }}>{selectedStudent?.name}</h4>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 12px' }}>
                Age {selectedStudent?.age} · ABHA: {selectedStudent?.abhaId || 'Not Linked'}
              </p>

              <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--surface-subtle, #f8fafc)', padding: 10, borderRadius: 6 }}>
                <div><strong>Known Allergies:</strong> Penicillin (Mild)</div>
                <div><strong>Vitals:</strong> BP 120/80 · Pulse 74 · Temp 98.6°F</div>
              </div>
            </section>

            <section className="wf-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span className="care-eyebrow">DISPATCH OPTIONS</span>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" defaultChecked disabled />
                Send copy to Student Health Vault
              </label>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" defaultChecked />
                Route to On-Campus Pharmacy Queue
              </label>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" defaultChecked />
                Sync with ABDM FHIR Health Records
              </label>

              <button 
                className="health-button health-button-primary"
                disabled={mutation.busy || items.length === 0}
                style={{ minHeight: 44, width: '100%', marginTop: 8 }}
                onClick={handleIssuePrescription}
              >
                <Send size={16} /> {mutation.busy ? 'Signing...' : 'Sign & Dispatch Rx'}
              </button>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
