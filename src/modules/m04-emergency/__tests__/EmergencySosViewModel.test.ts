import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emergencyStore } from '../state/EmergencyStore';
import { emergencyRepository } from '../data/EmergencyRepository';
import { anyoneReached } from '../domain/Emergency';
import type { SosAlert } from '../domain/Emergency';

const alert = (over: Partial<SosAlert> = {}): SosAlert => ({
  id: 'a1', status: 'ACTIVE', campus: 'IIT Hyderabad', locationNote: null, createdAt: 1, acknowledgedAt: null,
  resolvedAt: null, cancelledAt: null, resolutionNote: null,
  deliveries: [{ recipientKind: 'CAMPUS_CONSOLE', channel: 'CONSOLE', recipient: 'IIT Hyderabad', status: 'SENT', detail: '' }],
  ...over,
});

describe('M04 SOS store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    emergencyStore.reset();
  });

  it('counts down three seconds and can be cancelled before anything is sent', () => {
    const raise = vi.spyOn(emergencyRepository, 'raiseSos');
    emergencyStore.triggerSos();
    expect(emergencyStore.status).toBe('COUNTDOWN');
    vi.advanceTimersByTime(1000);
    expect(emergencyStore.countdownSeconds).toBe(2);
    emergencyStore.cancelCountdown();
    vi.advanceTimersByTime(5000);
    expect(emergencyStore.status).toBe('IDLE');
    expect(raise).not.toHaveBeenCalled();
  });

  it('never shows an alert the server did not record', async () => {
    vi.spyOn(emergencyRepository, 'raiseSos').mockRejectedValueOnce(new Error('offline'));
    await emergencyStore.dispatchEmergency();
    expect(emergencyStore.status).toBe('FAILED');
    expect(emergencyStore.alert).toBeNull();
    expect(emergencyStore.error).toMatch(/112/);
  });

  it('shows exactly what the server recorded, and sends the location note', async () => {
    const raise = vi.spyOn(emergencyRepository, 'raiseSos').mockResolvedValueOnce(alert());
    emergencyStore.setLocationNote('Library, 2nd floor');
    await emergencyStore.dispatchEmergency();
    expect(raise).toHaveBeenCalledWith('Library, 2nd floor');
    expect(emergencyStore.status).toBe('OPEN');
    expect(emergencyStore.alert?.deliveries).toHaveLength(1);
  });

  it('only shows the alert closed once the server confirms the cancel', async () => {
    vi.spyOn(emergencyRepository, 'raiseSos').mockResolvedValueOnce(alert());
    await emergencyStore.dispatchEmergency();
    vi.spyOn(emergencyRepository, 'cancel').mockRejectedValueOnce(new Error('offline'));
    await emergencyStore.cancelAlert();
    expect(emergencyStore.status).toBe('OPEN');
    expect(emergencyStore.error).toMatch(/112/);
    vi.spyOn(emergencyRepository, 'cancel').mockResolvedValueOnce(alert({ status: 'CANCELLED', cancelledAt: 2 }));
    await emergencyStore.cancelAlert();
    expect(emergencyStore.status).toBe('CLOSED');
  });

  it('treats an alert as reaching someone only if a delivery was actually sent', () => {
    expect(anyoneReached(alert())).toBe(true);
    expect(anyoneReached(alert({ deliveries: [{ recipientKind: 'CAMPUS_SECURITY', channel: 'WHATSAPP', recipient: 'Gate', status: 'FAILED', detail: '' }] }))).toBe(false);
  });
});
