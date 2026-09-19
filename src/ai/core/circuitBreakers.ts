import { assertRule } from './constitution';
import { DepartmentId, OPERATIONAL_AI_DEPARTMENTS } from '../departments';

export interface CircuitBreakerState {
  departmentId: DepartmentId;
  totalCalls: number;
  errorCalls: number;
  errorRate: number;
  isTripped: boolean;
  lastTrippedAt?: string;
}

export class DepartmentCircuitBreakers {
  private states: Record<DepartmentId, CircuitBreakerState> = {
    D1: { departmentId: 'D1', totalCalls: 100, errorCalls: 0, errorRate: 0, isTripped: false },
    D2: { departmentId: 'D2', totalCalls: 50, errorCalls: 1, errorRate: 0.02, isTripped: false },
    D3: { departmentId: 'D3', totalCalls: 80, errorCalls: 0, errorRate: 0, isTripped: false },
    D4: { departmentId: 'D4', totalCalls: 40, errorCalls: 0, errorRate: 0, isTripped: false },
    D5: { departmentId: 'D5', totalCalls: 120, errorCalls: 2, errorRate: 0.016, isTripped: false },
    D6: { departmentId: 'D6', totalCalls: 200, errorCalls: 0, errorRate: 0, isTripped: false },
    D7: { departmentId: 'D7', totalCalls: 30, errorCalls: 0, errorRate: 0, isTripped: true, lastTrippedAt: new Date(Date.now() - 3600000).toISOString() },
    D8: { departmentId: 'D8', totalCalls: 300, errorCalls: 1, errorRate: 0.003, isTripped: false },
    D9: { departmentId: 'D9', totalCalls: 25, errorCalls: 0, errorRate: 0, isTripped: false },
  };

  public recordExecution(departmentId: DepartmentId, isError: boolean): CircuitBreakerState {
    assertRule('Rule-K1');

    const state = this.states[departmentId];
    if (!state) throw new Error(`[CIRCUIT BREAKER]: Department "${departmentId}" not recognized.`);

    state.totalCalls += 1;
    if (isError) state.errorCalls += 1;
    state.errorRate = state.errorCalls / state.totalCalls;

    // Automatic trip threshold: Error rate >= 5% after at least 10 calls
    if (state.totalCalls >= 10 && state.errorRate >= 0.05 && !state.isTripped) {
      state.isTripped = true;
      state.lastTrippedAt = new Date().toISOString();

      // Trip the department agent kill switch
      const deptAgent = OPERATIONAL_AI_DEPARTMENTS[departmentId];
      if (deptAgent) {
        deptAgent.killSwitchActive = true;
      }
    }

    return state;
  }

  public getState(departmentId: DepartmentId): CircuitBreakerState {
    return this.states[departmentId];
  }

  public getAllStates(): CircuitBreakerState[] {
    return Object.values(this.states);
  }

  public resetCircuitBreaker(departmentId: DepartmentId): CircuitBreakerState {
    assertRule('Rule-K1');
    const state = this.states[departmentId];
    if (state) {
      state.errorCalls = 0;
      state.totalCalls = 0;
      state.errorRate = 0;
      state.isTripped = false;
      state.lastTrippedAt = undefined;

      const deptAgent = OPERATIONAL_AI_DEPARTMENTS[departmentId];
      if (deptAgent) {
        deptAgent.killSwitchActive = false;
      }
    }
    return state;
  }
}

export const circuitBreakerManager = new DepartmentCircuitBreakers();
