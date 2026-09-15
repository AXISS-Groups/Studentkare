export interface Page<T> { items: T[]; total: number; offset: number; limit: number }
export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'EXPIRED';
export interface VaccineOffering {
  id: string; providerId: string; providerName: string; vaccineName: string;
  pincode: string; region: string; sourceUrl: string; bookingUrl: string | null;
  lastVerifiedAt: number | null; expiresAt: number | null; pricePaise: number | null;
  currency: 'INR'; availability: 'UNKNOWN' | 'CONFIRMED'; verificationStatus: VerificationStatus;
}
export interface ProviderListing {
  id: string; name: string; sourceUrl: string; bookingUrl: string | null;
  verificationStatus: VerificationStatus;
}
export type Topic = 'vaccines' | 'seasonal-health' | 'health-camps' | 'wellbeing';
export interface PreventivePreferences {
  seasonalEducationEnabled: boolean; promotionsEnabled: boolean; region: string; topics: Topic[];
  consentVersion: number; updatedAt: number | null;
}
export interface ReportReview {
  id: string; documentId: string; status: 'REQUESTED' | 'ASSIGNED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  version: number; reviewedBy: string | null; reviewedAt: number | null;
  guidance: null | { summary: string; questions: string[]; nextSteps: string[]; sourceRefs: { title: string; url: string }[] };
}
