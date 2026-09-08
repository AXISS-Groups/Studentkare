import { describe, it, expect } from 'vitest';
import { OPERATIONAL_AI_DEPARTMENTS, DepartmentId } from '../departments';

describe('Phase SA-2 — Operational AI Department & Plane Isolation Suite', () => {
  it('should register all 9 Operational AI Departments (D1 to D9)', () => {
    const ids: DepartmentId[] = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9'];
    ids.forEach((id) => {
      const dept = OPERATIONAL_AI_DEPARTMENTS[id];
      expect(dept).toBeDefined();
      expect(dept.id).toBe(id);
      expect(dept.rules.length).toBeGreaterThan(0);
    });
  });

  it('D1 Service Desk AI — should delegate crisis inputs to crisis gate and return CRISIS_ESCALATED', async () => {
    const res = await OPERATIONAL_AI_DEPARTMENTS.D1.processTask({
      taskId: 't_01',
      ticketText: 'I want to end it all tonight I cannot handle exam pressure',
    });

    expect(res.status).toBe('CRISIS_ESCALATED');
    expect(res.details?.hotline).toBe('14416');
  });

  it('D2 Partner Ops AI — should flag pincodes with < 2 emergency providers under Rule-J1', async () => {
    const res = await OPERATIONAL_AI_DEPARTMENTS.D2.processTask({
      taskId: 't_02',
      pincode: '500008',
      activeProviderCount: 1,
    });

    expect(res.status).toBe('PENDING_HUMAN_APPROVAL');
    expect(res.ruleAsserted).toBe('Rule-J1');
    expect(res.proposedAction).toBeDefined();
  });

  it('D5 Claims Ops AI — should reject claim line items missing Rule-K4 pixel provenance', async () => {
    const invalidRes = await OPERATIONAL_AI_DEPARTMENTS.D5.processTask({
      taskId: 't_05',
      billItem: { description: 'Blood Test', netAmount: 450 },
    });

    expect(invalidRes.status).toBe('RULE_VIOLATED');
    expect(invalidRes.ruleAsserted).toBe('Rule-K4');

    const validRes = await OPERATIONAL_AI_DEPARTMENTS.D5.processTask({
      taskId: 't_05_valid',
      billItem: {
        description: 'Blood Test',
        netAmount: 450,
        provenance: { documentId: 'DOC-101', page: 1, bbox: [10, 20, 100, 50] },
      },
    });

    expect(validRes.status).toBe('COMPLETED');
    expect(validRes.ruleAsserted).toBe('Rule-K4');
  });

  it('D6 Institution Success AI — should enforce Rule K-Anonymity suppression on sub-20 cohorts', async () => {
    const res = await OPERATIONAL_AI_DEPARTMENTS.D6.processTask({
      taskId: 't_06',
      cohortName: 'Special Needs Pod',
      cohortCount: 12,
    });

    expect(res.status).toBe('COMPLETED');
    expect(res.ruleAsserted).toBe('Rule-K-Anonymity');
    expect(res.details?.formattedCount).toContain('Suppressed');
  });

  it('should halt execution when department kill switch is active', async () => {
    const d7Agent = OPERATIONAL_AI_DEPARTMENTS.D7;
    d7Agent.killSwitchActive = true;

    const res = await d7Agent.processTask({ taskId: 't_07' });
    expect(res.status).toBe('HALTED_BY_KILL_SWITCH');

    // Reset kill switch
    d7Agent.killSwitchActive = false;
  });
});
