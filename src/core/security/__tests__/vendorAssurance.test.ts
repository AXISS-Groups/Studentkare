import { describe, it, expect, beforeEach } from 'vitest';
import { VendorAssuranceManager } from '../vendorAssuranceManager';

describe('VendorAssuranceManager (P77)', () => {
  let manager: VendorAssuranceManager;

  beforeEach(() => {
    manager = new VendorAssuranceManager();
  });

  it('rejects vendor without signed DPDP DPA', () => {
    manager.registerVendor({
      vendorId: 'VEND-001',
      name: 'Unsafe Vendor',
      category: 'cloud_provider',
      dpaSigned: false,
      dataResidencyIndia: true,
      certifications: ['ISO_27001']
    });

    const res = manager.evaluateVendorApproval('VEND-001');
    expect(res.approved).toBe(false);
    expect(res.reason).toContain('DPA');
  });

  it('rejects vendor violating India data residency requirement', () => {
    manager.registerVendor({
      vendorId: 'VEND-002',
      name: 'Foreign Storage Vendor',
      category: 'cloud_provider',
      dpaSigned: true,
      dataResidencyIndia: false,
      certifications: ['ISO_27001']
    });

    const res = manager.evaluateVendorApproval('VEND-002');
    expect(res.approved).toBe(false);
    expect(res.reason).toContain('data residency');
  });

  it('approves compliant vendor meeting all DPA and certification criteria', () => {
    manager.registerVendor({
      vendorId: 'VEND-003',
      name: 'AWS India',
      category: 'cloud_provider',
      dpaSigned: true,
      dataResidencyIndia: true,
      certifications: ['ISO_27001', 'SOC_2_TYPE_2']
    });

    const res = manager.evaluateVendorApproval('VEND-003');
    expect(res.approved).toBe(true);
  });
});
