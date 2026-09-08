import { describe, it, expect } from 'vitest';
import { approvalQueueManager } from '../approvalQueue';
import { circuitBreakerManager } from '../circuitBreakers';
import { RAGPipelineEngine } from '../agenticRAGEngine';
import { OPERATIONAL_AI_DEPARTMENTS } from '../departments';

describe('Phase SA-3 — Agent Safety Runtime & Controls Test Suite', () => {
  it('Unified Approval Queue — should enqueue pending proposals for high-blast radius actions and record admin approval', () => {
    const initialPendingCount = approvalQueueManager.getPendingProposals().length;

    const newProposal = approvalQueueManager.enqueueAction({
      id: `act_${Date.now()}`,
      departmentId: 'D5',
      actionType: 'REJECT_UNPROVENANCED_CLAIM',
      description: 'Reject claim line item missing pixel provenance coordinates.',
      ruleId: 'Rule-K4',
      requiresHumanApproval: true,
      blastRadius: 'HIGH',
      inputData: { claimId: 'CLM-991' },
      timestamp: new Date().toISOString(),
    });

    expect(newProposal.status).toBe('PENDING');
    expect(approvalQueueManager.getPendingProposals().length).toBe(initialPendingCount + 1);

    // Admin approves proposal
    const approved = approvalQueueManager.approveProposal(newProposal.id, 'ADM-SUPER-01');
    expect(approved.status).toBe('APPROVED');
    expect(approved.reviewedByAdminId).toBe('ADM-SUPER-01');
  });

  it('Unified Approval Queue — should record admin rejection with mandatory justification', () => {
    const newProposal = approvalQueueManager.enqueueAction({
      id: `act_${Date.now()}_2`,
      departmentId: 'D4',
      actionType: 'PROPOSE_SEAT_TIER_EXPANSION',
      description: 'Propose B2B seat tier expansion for IIT Hyderabad.',
      ruleId: 'Rule-L2',
      requiresHumanApproval: true,
      blastRadius: 'MEDIUM',
      inputData: { campusCode: 'IITH-KANDI' },
      timestamp: new Date().toISOString(),
    });

    const rejected = approvalQueueManager.rejectProposal(newProposal.id, 'ADM-SUPER-01', 'Budget cap reached for Q3');
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toBe('Budget cap reached for Q3');
  });

  it('Departmental Circuit Breakers — should automatically trip kill switch when error rate exceeds 5%', () => {
    const deptId = 'D8';
    circuitBreakerManager.resetCircuitBreaker(deptId);

    // Simulate 10 successful calls
    for (let i = 0; i < 10; i++) {
      circuitBreakerManager.recordExecution(deptId, false);
    }
    expect(circuitBreakerManager.getState(deptId).isTripped).toBe(false);

    // Simulate 2 errors (2/12 = ~16.6% > 5%)
    circuitBreakerManager.recordExecution(deptId, true);
    const finalState = circuitBreakerManager.recordExecution(deptId, true);

    expect(finalState.isTripped).toBe(true);
    expect(OPERATIONAL_AI_DEPARTMENTS.D8.killSwitchActive).toBe(true);

    // Reset circuit breaker
    circuitBreakerManager.resetCircuitBreaker(deptId);
    expect(circuitBreakerManager.getState(deptId).isTripped).toBe(false);
    expect(OPERATIONAL_AI_DEPARTMENTS.D8.killSwitchActive).toBe(false);
  });

  it('Operational RAG Engine — should retrieve relevant semantic chunks over SOPs & Constitution', () => {
    const rag = new RAGPipelineEngine();
    const result = rag.generateRAGResponse('Monsoon fever Dengue Paracetamol protocol');

    expect(result.retrievedChunks).toBeDefined();
    expect(result.retrievedChunks.length).toBe(2);
    expect(result.response).toContain('Based on retrieved clinical guidelines');
  });
});
