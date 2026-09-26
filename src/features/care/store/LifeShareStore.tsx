import { makeAutoObservable } from 'mobx';
import {
  HospitalResourceNode,
  LifeShareTransferRequest,
  getCompatibleDonorTypes,
} from '../../../data/lifeshareData';

/**
 * Hospital resource availability, for when something can report it.
 *
 * Both lists start empty and stay empty: no endpoint in this repo serves
 * hospital availability, so there is nothing to load. They used to be seeded
 * with invented stock for named real hospitals — see the note in
 * data/datasets/lifeshareData.ts.
 *
 * `submitTransferRequest` is gone with them. It minted a `REQ-LS-` id, pushed
 * the request onto this array and returned it, which let the screen tell a
 * student the hospital network had been notified. Nothing was transmitted, and
 * there is nothing to transmit to. A request queue only this tab can see is
 * worse than no queue, because it reads as one.
 */
export class LifeShareStore {
  hospitals: HospitalResourceNode[] = [];
  transferRequests: LifeShareTransferRequest[] = [];

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
}
