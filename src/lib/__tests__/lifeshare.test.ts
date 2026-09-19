import { describe, it, expect } from 'vitest';
import { LifeShareStore } from '@/features/care/store/LifeShareStore';
import { getCompatibleDonorTypes } from '@/data/lifeshareData';

describe('LifeShare Emergency Hospital & Blood Bank Network', () => {
  it('correctly resolves blood type compatibility for universal donor O-', () => {
    const oNegDonors = getCompatibleDonorTypes('O-');
    expect(oNegDonors).toEqual(['O-']);
  });

  it('correctly resolves blood type compatibility for recipient A+', () => {
    const aPosDonors = getCompatibleDonorTypes('A+');
    expect(aPosDonors).toContain('A+');
    expect(aPosDonors).toContain('O-');
  });

  it('searches hospitals by pincode and blood group stock', () => {
    const store = new LifeShareStore();
    const results = store.searchHospitals('502285', 'O-');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].pincode).toBe('502285');
  });

  it('submits high-urgency emergency transfer requests to store', () => {
    const store = new LifeShareStore();
    const initialCount = store.transferRequests.length;
    const newReq = store.submitTransferRequest({
      requestingHospital: 'IIT Hyderabad Campus Health Centre',
      targetHospital: 'Yashoda Hospital — Somajiguda',
      resourceType: 'BLOOD_UNIT',
      details: '2 Units O- Negative Red Blood Cells',
      urgency: 'LIFE_THREATENING',
      status: 'PENDING',
    });

    expect(store.transferRequests.length).toBe(initialCount + 1);
    expect(newReq.id).toMatch(/^REQ-LS-\d{4}$/);
    expect(store.transferRequests[0].requestingHospital).toBe('IIT Hyderabad Campus Health Centre');
  });
});
