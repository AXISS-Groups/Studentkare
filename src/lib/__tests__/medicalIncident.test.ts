import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MedicalIncidentStore } from '@/features/care/store/MedicalIncidentStore';
import { FIRST_AID_PROTOCOLS } from '@/data/medicalIncidentData';
import { careModule } from '@/features/care/module';
import { resolveAccess } from '@/core/routing/registry';
import type { AccountRole } from '@/data/types/workflowTypes';

function codeOf(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const DATASET = codeOf('src/data/datasets/medicalIncidentData.ts');

function reported(store: MedicalIncidentStore) {
  return store.reportIncident({
    studentId: 'STU-99',
    studentName: 'A Student',
    bloodGroup: 'B+',
    allergies: ['Penicillin'],
    category: 'HIGH_FEVER',
    severity: 'URGENT_2',
    title: 'High fever and chills',
    description: 'Sudden onset of fever and shivering',
    hostelBlock: 'Hostel Block 2',
    roomNumber: 'A-102',
    pincode: '502285',
  });
}

describe('first aid claims nothing has happened', () => {
  it('still gives the first aid', () => {
    expect(FIRST_AID_PROTOCOLS.FOOD_POISONING).toContain('ORS');
    expect(FIRST_AID_PROTOCOLS.INJURY_ACCIDENT).toContain('pressure');
  });

  it('never says an ambulance is coming', () => {
    // The worst of them. A student with a suspected spinal injury read
    // "Ambulance dispatched." from a screen that transmits nothing, and had
    // every reason to wait for it instead of calling 112.
    for (const text of Object.values(FIRST_AID_PROTOCOLS)) {
      expect(text).not.toMatch(/ambulance/i);
      expect(text).not.toMatch(/dispatched|en route/i);
    }
  });

  it('never says a clinician has been told', () => {
    // Matched on the claim, not on any word in it: "if you have been prescribed
    // an inhaler" is a legitimate use of the same auxiliary.
    for (const text of Object.values(FIRST_AID_PROTOCOLS)) {
      expect(text).not.toMatch(/notified|monitoring requested|are connected/i);
      expect(text).not.toMatch(/(officer|nurse|doctor|counsellor)[^.]*\bhave been\b/i);
    }
  });

  it('specifies no drug dose', () => {
    // "use inhaler (2 puffs)" was the only one. Dosing on a Tier 1 screen needs
    // the clinical sign-off DESIGN.md section 5 requires, and has not had it.
    for (const text of Object.values(FIRST_AID_PROTOCOLS)) {
      expect(text).not.toMatch(/\d+\s*(puffs?|mg|ml)\b/i);
    }
  });

  it('gives the real mental-health helpline', () => {
    expect(FIRST_AID_PROTOCOLS.MENTAL_HEALTH_DISTRESS).toContain('14416');
  });
});

describe('no incident, officer or outbreak is invented', () => {
  it('opens with all three lists empty', () => {
    const store = new MedicalIncidentStore();
    expect(store.incidents).toEqual([]);
    expect(store.meoOfficers).toEqual([]);
    expect(store.outbreakAlerts).toEqual([]);
  });

  it('ships no seeded rows', () => {
    expect(DATASET).not.toMatch(
      /INITIAL_MEDICAL_INCIDENTS|INITIAL_MEO_OFFICERS|INITIAL_OUTBREAK_ALERTS/,
    );
  });

  it('names no student, room or officer', () => {
    expect(DATASET).not.toMatch(/Aarav|Ananya|Dr\. Sharma|Dr\. Kavitha|Nurse Priya|B-214/);
  });
});

describe('the triage console is not public', () => {
  const meo = careModule.routes.find((route) => route.path === '/meo');

  it('is registered', () => {
    expect(meo).toBeDefined();
  });

  it('is not reachable without a session', () => {
    expect(meo?.public).toBeFalsy();
    expect(resolveAccess('/meo', null)).toBe(false);
  });

  it('admits staff only', () => {
    for (const role of ['CAMPUS_ADMIN', 'NMC_DOCTOR', 'SUPER_ADMIN'] as AccountRole[]) {
      expect(resolveAccess('/meo', role)).toBe(true);
    }
    for (const role of ['STUDENT', 'VENDOR'] as AccountRole[]) {
      expect(resolveAccess('/meo', role)).toBe(false);
    }
  });

  it('grants nothing for a path it does not know', () => {
    // Guardrail 1: this returned true for any unmatched path.
    expect(resolveAccess('/not-a-route', 'SUPER_ADMIN')).toBe(false);
  });
});

describe('the triage console does not claim to reach anyone', () => {
  const CONSOLE = codeOf('src/screens/medical/MeoDashboardScreen.tsx');

  it('tells the officer the queue is not receiving anything', () => {
    // An empty queue otherwise reads as "no student needs help". Nothing a
    // student files arrives here, so zero is not all-quiet.
    expect(CONSOLE).toMatch(/not receiving anything/i);
    expect(CONSOLE).toMatch(/does not mean nobody needs help/i);
  });

  it('claims no notification on saving a triage', () => {
    expect(CONSOLE).not.toMatch(/Hostel Warden notified|Student and Hostel Warden/i);
    expect(CONSOLE).toMatch(/has not been told/i);
  });

  it('claims no inspection was sent on an outbreak', () => {
    expect(CONSOLE).not.toMatch(/inspection & dining advisory dispatched|dispatched to campus warden/i);
  });

  it('defaults to no named officer', () => {
    // The roster is empty, so a prefilled "Dr. Sharma (Chief Medical Officer)"
    // put a fabricated name on a real triage record.
    expect(CONSOLE).not.toMatch(/Dr\. Sharma/);
    expect(CONSOLE).toMatch(/useState\(''\)/);
  });

  it('asserts no vitals or protocol were logged', () => {
    expect(CONSOLE).not.toMatch(/Vitals & protocol logged/i);
  });

  it('suggests no dose in the advisory placeholder', () => {
    const placeholder = /placeholder="([^"]*)"/g;
    for (const [, text] of CONSOLE.matchAll(placeholder)) {
      expect(text).not.toMatch(/\d+\s*(mg|ml)\b/i);
      expect(text).not.toMatch(/dispatched/i);
    }
  });

  it('promises no ambulance dispatch in its own description', () => {
    expect(CONSOLE).not.toMatch(/paramedic ambulance dispatches/i);
    expect(CONSOLE).toMatch(/cannot dispatch an ambulance/i);
  });
});

describe('reporting still works, and still reaches nobody', () => {
  it('records an incident locally', () => {
    const store = new MedicalIncidentStore();
    const incident = reported(store);
    expect(store.incidents).toHaveLength(1);
    expect(incident.id).toMatch(/^INC-MED-\d{3}$/);
    expect(incident.status).toBe('REPORTED');
  });

  it('lets a triaging clinician attach an advisory', () => {
    const store = new MedicalIncidentStore();
    const incident = reported(store);

    store.triageIncident(incident.id, 'TRIAGED_BY_DOCTOR', 'Dr Example', 'Paracetamol, hydrate.');

    const updated = store.incidents.find((i) => i.id === incident.id);
    expect(updated?.status).toBe('TRIAGED_BY_DOCTOR');
    expect(updated?.assignedOfficerName).toBe('Dr Example');
    expect(updated?.medicalAdvisory).toContain('Paracetamol');
  });

  it('flags a cluster in one block', () => {
    const store = new MedicalIncidentStore();
    for (let i = 0; i < 3; i += 1) {
      store.reportIncident({
        studentId: `STU-CLUSTER-${i}`,
        studentName: `Student ${i}`,
        bloodGroup: 'O+',
        allergies: [],
        category: 'FOOD_POISONING',
        severity: 'URGENT_2',
        title: 'Nausea after dinner',
        description: 'Vomiting and cramps',
        hostelBlock: 'Hostel Block 9',
        roomNumber: `C-${i}01`,
        pincode: '502285',
      });
    }

    const cluster = store.outbreakAlerts.find((o) => o.location === 'Hostel Block 9');
    expect(cluster?.alertLevel).toBe('CRITICAL_OUTBREAK');
  });

  it('still transmits nothing, so the screens must keep saying so', () => {
    expect(codeOf('src/features/care/store/MedicalIncidentStore.tsx')).not.toMatch(
      /apiRequest|fetch\(/,
    );
  });
});
