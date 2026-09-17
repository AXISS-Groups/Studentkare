import { describe, it, expect } from 'vitest';
import { MedicalIncidentStore } from '@/features/care/store/MedicalIncidentStore';
import { FIRST_AID_PROTOCOLS } from '@/data/medicalIncidentData';

describe('Campus Medical Incident & MEO Triage Network', () => {
  it('provides instant pre-hospital first-aid protocols for incident categories', () => {
    expect(FIRST_AID_PROTOCOLS.FOOD_POISONING).toContain('ORS');
    expect(FIRST_AID_PROTOCOLS.INJURY_ACCIDENT).toContain('pressure');
  });

  it('submits a new student medical incident to store', () => {
    const store = new MedicalIncidentStore();
    const initialCount = store.incidents.length;

    const newInc = store.reportIncident({
      studentId: 'STU-99',
      studentName: 'Rohan Verma',
      bloodGroup: 'B+',
      allergies: ['Penicillin'],
      category: 'HIGH_FEVER',
      severity: 'URGENT_2',
      title: 'High fever 102F & chills',
      description: 'Sudden onset of fever and shivering in Hostel Block 2',
      hostelBlock: 'Hostel Block 2',
      roomNumber: 'A-102',
      pincode: '502285',
    });

    expect(store.incidents.length).toBe(initialCount + 1);
    expect(newInc.id).toMatch(/^INC-MED-\d{3}$/);
    expect(newInc.status).toBe('REPORTED');
  });

  it('allows MEO doctor to triage incident and dispatch clinical advisory', () => {
    const store = new MedicalIncidentStore();
    const targetId = store.incidents[0].id;

    store.triageIncident(
      targetId,
      'TRIAGED_BY_DOCTOR',
      'Dr. Sharma (CMO)',
      'Administer Paracetamol 500mg. Hydrate with ORS.'
    );

    const updated = store.incidents.find((i) => i.id === targetId);
    expect(updated?.status).toBe('TRIAGED_BY_DOCTOR');
    expect(updated?.assignedOfficerName).toBe('Dr. Sharma (CMO)');
    expect(updated?.medicalAdvisory).toContain('Paracetamol');
  });

  it('automatically triggers campus outbreak cluster alert when 3 incidents occur in same hostel', () => {
    const store = new MedicalIncidentStore();

    // Report 3 food poisoning incidents in Hostel Block 9
    for (let i = 1; i <= 3; i++) {
      store.reportIncident({
        studentId: `STU-CLUSTER-${i}`,
        studentName: `Student ${i}`,
        bloodGroup: 'O+',
        allergies: [],
        category: 'FOOD_POISONING',
        severity: 'URGENT_2',
        title: `Nausea after dinner ${i}`,
        description: 'Vomiting and cramps',
        hostelBlock: 'Hostel Block 9',
        roomNumber: `C-${i}01`,
        pincode: '502285',
      });
    }

    const cluster = store.outbreakAlerts.find((o) => o.location === 'Hostel Block 9');
    expect(cluster).toBeDefined();
    expect(cluster?.alertLevel).toBe('CRITICAL_OUTBREAK');
  });
});
