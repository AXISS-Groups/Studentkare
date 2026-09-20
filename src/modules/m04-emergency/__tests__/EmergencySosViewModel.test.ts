import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emergencyStore } from '../state/EmergencyStore';

describe('M04 Emergency Module Characterisation Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    emergencyStore.reset();
  });

  it('initializes with default IDLE status and countdown of 3', () => {
    expect(emergencyStore.status).toBe('IDLE');
    expect(emergencyStore.countdownSeconds).toBe(3);
    expect(emergencyStore.isEmergencyActive).toBe(false);
    expect(emergencyStore.activeDispatch).toBeNull();
  });

  it('triggers 3-second countdown state machine on triggerSos', async () => {
    emergencyStore.triggerSos();
    expect(emergencyStore.status).toBe('COUNTDOWN');
    expect(emergencyStore.isEmergencyActive).toBe(true);

    vi.advanceTimersByTime(1000);
    expect(emergencyStore.countdownSeconds).toBe(2);

    vi.advanceTimersByTime(1000);
    expect(emergencyStore.countdownSeconds).toBe(1);

    vi.advanceTimersByTime(1000);
    await emergencyStore.dispatchEmergency();
    expect(emergencyStore.status).toBe('DISPATCHED');
    expect(emergencyStore.activeDispatch).not.toBeNull();
    expect(emergencyStore.emergencyContacts.every(c => c.notified)).toBe(true);
  });

  it('cancels SOS countdown immediately when cancelSos is called', () => {
    emergencyStore.triggerSos();
    expect(emergencyStore.status).toBe('COUNTDOWN');

    emergencyStore.cancelSos();
    expect(emergencyStore.status).toBe('CANCELLED');
    expect(emergencyStore.isEmergencyActive).toBe(false);
    expect(emergencyStore.activeDispatch).toBeNull();
  });
});
