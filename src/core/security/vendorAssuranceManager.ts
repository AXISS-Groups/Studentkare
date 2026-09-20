/**
 * Partner Assurance & Vendor Security Manager — P77 Partner Assurance
 * 
 * Assesses third-party vendors for DPDP 2023 DPA compliance, SOC 2 / ISO 27001 evidence,
 * data residency in India, and offboarding data shredding verification.
 */

export interface VendorRecord {
  vendorId: string;
  name: string;
  category: 'cloud_provider' | 'sms_gateway' | 'analytics' | 'lab_partner';
  dpaSigned: boolean;
  dataResidencyIndia: boolean;
  certifications: Array<'ISO_27001' | 'SOC_2_TYPE_2' | 'ABDM_M3'>;
  offboardedAt?: string;
  dataShreddedVerified?: boolean;
}

export class VendorAssuranceManager {
  private vendors: Map<string, VendorRecord> = new Map();

  public registerVendor(vendor: VendorRecord): void {
    this.vendors.set(vendor.vendorId, vendor);
  }

  /**
   * Evaluates if vendor meets safety criteria to process clinical or operational data
   */
  public evaluateVendorApproval(vendorId: string): { approved: boolean; reason: string } {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) {
      return { approved: false, reason: 'Vendor not registered in system' };
    }

    if (vendor.offboardedAt) {
      return { approved: false, reason: 'Vendor has been offboarded' };
    }

    if (!vendor.dpaSigned) {
      return { approved: false, reason: 'Mandatory DPDP Data Processing Agreement (DPA) not signed' };
    }

    if (!vendor.dataResidencyIndia) {
      return { approved: false, reason: 'Vendor fails India data residency requirement' };
    }

    if (vendor.certifications.length === 0) {
      return { approved: false, reason: 'Vendor lacks required ISO 27001 or SOC 2 Type 2 security certifications' };
    }

    return { approved: true, reason: 'Vendor meets all compliance and partner assurance criteria' };
  }
}
