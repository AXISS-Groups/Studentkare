/**
 * Seat License & Commercial Firewall Manager — P56 Billing & Licensing
 * 
 * Manages institutional seat allocations and strictly enforces Rule L Commerce Firewall:
 * Payment confers zero access, visibility, or rights to student clinical records.
 */

export interface SeatLicensePool {
  tenantId: string;
  totalSeats: number;
  allocatedSeats: number;
  licenseExpiresAt: string; // ISO
}

export class SeatLicenseManager {
  private pools: Map<string, SeatLicensePool> = new Map();

  public registerLicensePool(pool: SeatLicensePool): void {
    this.pools.set(pool.tenantId, pool);
  }

  /**
   * Allocates a seat for a new student under institution pool
   */
  public allocateSeat(tenantId: string): boolean {
    const pool = this.pools.get(tenantId);
    if (!pool) return false;

    if (new Date(pool.licenseExpiresAt).getTime() <= Date.now()) {
      return false; // License expired
    }

    if (pool.allocatedSeats >= pool.totalSeats) {
      return false; // Quota exceeded
    }

    pool.allocatedSeats++;
    this.pools.set(tenantId, pool);
    return true;
  }

  /**
   * Rule L Commerce Firewall Check — Validates that paying entity role has ZERO access
   * to student PHI or medical records.
   */
  public verifyCommerceFirewallAccess(role: 'billing_admin' | 'campus_sponsor' | 'student'): {
    phiAccessAllowed: boolean;
    reason: string;
  } {
    if (role === 'billing_admin' || role === 'campus_sponsor') {
      return {
        phiAccessAllowed: false,
        reason: 'Rule L Commerce Firewall: Payment or license administration confers zero access rights to clinical PHI'
      };
    }

    return {
      phiAccessAllowed: true,
      reason: 'Student role authorized'
    };
  }
}
