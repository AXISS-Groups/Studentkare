import { describe, it, expect, beforeEach } from 'vitest';
import { SeatLicenseManager } from '../seatLicenseManager';

describe('SeatLicenseManager (P56)', () => {
  let manager: SeatLicenseManager;
  const tenantId = 'IIT-DELHI';

  beforeEach(() => {
    manager = new SeatLicenseManager();
    manager.registerLicensePool({
      tenantId,
      totalSeats: 2,
      allocatedSeats: 0,
      licenseExpiresAt: new Date(Date.now() + 86400000).toISOString()
    });
  });

  it('allocates seat when within institutional pool quota limit', () => {
    expect(manager.allocateSeat(tenantId)).toBe(true);
    expect(manager.allocateSeat(tenantId)).toBe(true);
    // 3rd allocation exceeds quota limit of 2 seats
    expect(manager.allocateSeat(tenantId)).toBe(false);
  });

  it('enforces Rule L Commerce Firewall denying PHI access to billing admins and sponsors', () => {
    const adminCheck = manager.verifyCommerceFirewallAccess('billing_admin');
    expect(adminCheck.phiAccessAllowed).toBe(false);
    expect(adminCheck.reason).toContain('Rule L Commerce Firewall');

    const sponsorCheck = manager.verifyCommerceFirewallAccess('campus_sponsor');
    expect(sponsorCheck.phiAccessAllowed).toBe(false);

    const studentCheck = manager.verifyCommerceFirewallAccess('student');
    expect(studentCheck.phiAccessAllowed).toBe(true);
  });
});
