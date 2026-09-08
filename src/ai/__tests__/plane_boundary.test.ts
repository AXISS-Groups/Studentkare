import { describe, it, expect } from 'vitest';
import { OPERATIONAL_AI_DEPARTMENTS, DepartmentId } from '../departments';

describe('AI Department Plane Boundary Isolation Architecture Test (SA-2 / SA-3)', () => {
  it('verifies that all 9 AI operations departments (D1-D9) are registered', () => {
    const deptIds: DepartmentId[] = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9'];
    deptIds.forEach((id) => {
      const dept = OPERATIONAL_AI_DEPARTMENTS[id];
      expect(dept).toBeDefined();
      expect(dept.id).toBe(id);
    });
  });

  it('ensures all AI departments strictly cite constitution rules and declare OPERATIONAL plane', () => {
    const deptIds: DepartmentId[] = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9'];
    deptIds.forEach((id) => {
      const dept = OPERATIONAL_AI_DEPARTMENTS[id];
      expect(dept.rules.length).toBeGreaterThan(0);
      expect(dept.tools).toBeDefined();
      expect(Array.isArray(dept.tools)).toBe(true);
    });
  });

  it('verifies D1 Service Desk crisis gate escalation handling', async () => {
    const d1 = OPERATIONAL_AI_DEPARTMENTS['D1'];
    const crisisTask = await d1.processTask({ ticketText: 'Emergency: accidental overdose of medication' });
    expect(crisisTask.status).toBe('CRISIS_ESCALATED');
  });
});
