import { makeAutoObservable } from 'mobx';
import {
  HospitalResourceNode,
  LifeShareTransferRequest,
  INITIAL_HOSPITAL_NODES,
  INITIAL_TRANSFER_REQUESTS,
  getCompatibleDonorTypes,
} from '../../../data/lifeshareData';

export class LifeShareStore {
  hospitals: HospitalResourceNode[] = INITIAL_HOSPITAL_NODES;
  transferRequests: LifeShareTransferRequest[] = INITIAL_TRANSFER_REQUESTS;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setHospitals(hospitals: HospitalResourceNode[]): void {
    this.hospitals = hospitals;
  }

  setTransferRequests(requests: LifeShareTransferRequest[]): void {
    this.transferRequests = requests;
  }

  searchHospitals(pincodeOrName?: string, bloodType?: string): HospitalResourceNode[] {
    let result = this.hospitals;

    if (pincodeOrName && pincodeOrName.trim()) {
      const q = pincodeOrName.trim().toLowerCase();
      result = result.filter(
        (h) =>
          h.pincode.includes(q) ||
          h.name.toLowerCase().includes(q) ||
          h.city.toLowerCase().includes(q) ||
          h.district.toLowerCase().includes(q)
      );
    }

    if (bloodType && bloodType.trim()) {
      const compatibleTypes = getCompatibleDonorTypes(bloodType);
      result = result.filter((h) =>
        compatibleTypes.some((bt: string) => (h.bloodUnits[bt] || 0) > 0)
      );
    }

    return result;
  }

  submitTransferRequest(requestData: Omit<LifeShareTransferRequest, 'id' | 'timestamp'>): LifeShareTransferRequest {
    const newRequest: LifeShareTransferRequest = {
      id: `REQ-LS-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: 'Just now',
      ...requestData,
    };
    this.transferRequests = [newRequest, ...this.transferRequests];
    return newRequest;
  }
}
