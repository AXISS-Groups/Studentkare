export type ErasureStatus = 'pending' | 'completed' | 'blocked';

export interface ErasureRequest {
  id: string;
  studentId: string;
  requestDate: string;
  scheduledErasureDate: string;
  status: ErasureStatus;
  legallyRetainedItems: string[];
}

export interface ConsentPolicyVersion {
  id: string;
  version: string;
  title: string;
  changeSummary: string;
  effectiveDate: string;
  forceReconsent: boolean;
}
