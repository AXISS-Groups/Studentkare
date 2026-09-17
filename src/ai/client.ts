/**
 * Studentkare — Enforced AI Constitution Client (G0.3)
 * Centralized entry point for invoking AI models. Fails closed if AI Constitution is unavailable.
 */
import { CONSTITUTION_RULES, RuleId, assertRule } from './constitution';

export interface AIModelRequest {
  prompt: string;
  ruleId: RuleId;
  context?: Record<string, unknown>;
}

export interface AIModelResponse {
  status: 'success' | 'blocked' | 'error';
  content: string;
  ruleAsserted: RuleId;
}

let forceConstitutionLoadFailure = false;

export function __setForceConstitutionFailure(fail: boolean): void {
  forceConstitutionLoadFailure = fail;
}

export function isConstitutionLoaded(): boolean {
  if (forceConstitutionLoadFailure) return false;
  try {
    return Boolean(CONSTITUTION_RULES && Object.keys(CONSTITUTION_RULES).length > 0);
  } catch {
    return false;
  }
}

export async function executeAIModelCall(request: AIModelRequest): Promise<AIModelResponse> {
  // Fail closed if Constitution fails to load or is invalid
  if (!isConstitutionLoaded()) {
    throw new Error('[AI CONSTITUTION FAILURE]: AI Constitution file failed to load. AI execution halted (fail-closed).');
  }

  // Assert rule compliance
  const rule = assertRule(request.ruleId);
  if (!rule) {
    throw new Error(`[AI CONSTITUTION VIOLATION]: Rule assertion failed for ${request.ruleId}`);
  }

  return {
    status: 'success',
    content: `[Guarded by ${rule.id} - ${rule.title}]: ${request.prompt}`,
    ruleAsserted: request.ruleId,
  };
}
