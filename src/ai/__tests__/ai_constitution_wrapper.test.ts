/**
 * Studentkare — AI Constitution Enforced Wrapper Test (G0.3)
 * Asserts that AI execution fails closed if the Constitution fails to load.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { executeAIModelCall, __setForceConstitutionFailure } from '../client';

describe('G0.3 AI Constitution Wrapper Test Suite', () => {
  beforeEach(() => {
    __setForceConstitutionFailure(false);
  });

  it('must execute model call successfully when Constitution is loaded', async () => {
    const res = await executeAIModelCall({
      prompt: 'Summarize symptom triage',
      ruleId: 'Rule-A',
    });
    expect(res.status).toBe('success');
    expect(res.ruleAsserted).toBe('Rule-A');
    expect(res.content).toContain('Rule-A');
  });

  it('must fail closed (throw error) if Constitution fails to load', async () => {
    __setForceConstitutionFailure(true);

    await expect(
      executeAIModelCall({
        prompt: 'Summarize symptom triage',
        ruleId: 'Rule-A',
      })
    ).rejects.toThrow('[AI CONSTITUTION FAILURE]');
  });

  it('must fail if invalid ruleId is passed', async () => {
    await expect(
      executeAIModelCall({
        prompt: 'Uncertified action',
        ruleId: 'INVALID_RULE' as any,
      })
    ).rejects.toThrow('[CONSTITUTION VIOLATION]');
  });
});
