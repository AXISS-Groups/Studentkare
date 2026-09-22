export type LanguageCode = 'EN' | 'HI' | 'TE';

export * from './admin';

export interface StudentProfile {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  dob: string;
  age: number;
  ageVerified: boolean;
  ageVerificationDoc: 'AADHAAR' | 'STUDENT_ID' | 'PASSPORT' | 'DRIVING_LICENSE';
  ageVerificationEvidence?: 'DIGILOCKER' | 'CAMPUS_ROSTER' | 'PASSPORT_PAN_DL' | 'NONE';
  studentIdNumber: string;
  institutionName: string;
  institutionId?: string | null;
  campusName: string;
  university?: string;
  isVerifiedStudent?: boolean;
  rollNumber: string;
  bloodGroup: string;
  abhaId?: string;
  abhaAddress?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  allergies: string[];
  chronicConditions: string[];
  pointsBalance: number;
  subscriptionPlanId?: 'FREE' | 'PLAN_59' | 'PLAN_159' | 'PLAN_299';
  avatarUrl?: string;
}

export type RecordCategory = 'LAB' | 'PRESCRIPTION' | 'VACCINE' | 'CAMP_REPORT' | 'DISCHARGE_SUMMARY';

export interface ProvenanceBox {
  pageNumber: number;
  box: { x: number; y: number; width: number; height: number }; // percentage coords (0-100)
  label: string;
  snippet: string;
}

export interface FHIRObservation {
  id: string;
  code: string; // LOINC or SNOMED
  display: string;
  value: string | number;
  unit: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  confidenceScore: number; // 0 - 100
  provenance?: ProvenanceBox;
}

export interface HealthRecord {
  id: string;
  title: string;
  category: RecordCategory;
  date: string;
  facilityName: string;
  doctorName?: string;
  sourceType: 'SCAN' | 'UPLOAD' | 'CAMP' | 'ABDM_PULL' | 'MANUAL';
  fhirJson?: any;
  observations: FHIRObservation[];
  confidenceGatePassed: boolean;
  humanReviewRequired: boolean;
  isCachedOffline: boolean;
  documentUrl?: string;
  fileSizeBytes?: number;
  syncStatus: 'SYNCED' | 'LOCAL_ONLY' | 'PENDING_UPLOAD';
}

export interface CampStation {
  id: string;
  name: string;
  description: string;
  iconName: string;
  status: 'PENDING' | 'IN_QUEUE' | 'COMPLETED';
  completedAt?: string;
  doctorNote?: string;
  readings: { label: string; value: string; isNormal: boolean }[];
  queueWaitMinutes: number;
}

export interface HealthCamp {
  id: string;
  campName: string;
  institution: string;
  date: string;
  location: string;
  checkInStatus: boolean;
  checkInTime?: string;
  qrCode: string;
  stations: CampStation[];
  completedCount: number;
  totalStations: number;
  digitalBadgeEarned: boolean;
}

// VERTICAL C — Health Services Fabric
export type ProviderType = 'LAB' | 'COLLECTION_CENTRE' | 'IMAGING' | 'CLINIC' | 'PHARMACY' | 'COUNSELLOR' | 'AMBULANCE';
export type ServiceModality = 'HOME_COLLECTION' | 'WALK_IN' | 'CAMP' | 'DELIVERY';

export interface FabricProvider {
  id: string;
  name: string;
  type: ProviderType;
  accreditation: 'NABL' | 'NABH' | 'ISO_15189' | 'STATE_LICENSED';
  accreditationExpiry: string;
  isAccreditationValid: boolean;
  coveredPincodes: string[];
  modalities: ServiceModality[];
  slaTatHours: number;
  fulfilmentRate: number; // %
  qualityScore: number; // 0 - 5.0
  activeContractRateDiscount: number; // %
  status: 'ACTIVE' | 'DELISTED_EXPIRED' | 'PAUSED';
}

export type OrderState =
  | 'created'
  | 'routed'
  | 'accepted'
  | 'scheduled'
  | 'in_progress'
  | 'fulfilled'
  | 'reported'
  | 'settled'
  | 'cancelled'
  | 'failed';

export interface FabricOrder {
  id: string;
  partnerId: string;
  partnerName: string;
  serviceCategory: 'DIAGNOSTICS' | 'TELECONSULT' | 'PHARMACY' | 'AMBULANCE' | 'COUNSELLOR';
  serviceCodeLoinc: string;
  serviceName: string;
  pincode: string;
  modality: ServiceModality;
  assignedProviderId?: string;
  assignedProviderName?: string;
  fallbackProviderId?: string;
  state: OrderState;
  stateHistory: { state: OrderState; timestamp: string; note: string }[];
  patientId: string;
  patientName: string;
  providerCost: number;
  partnerPrice: number;
  settlementStatus: 'UNBILLED' | 'INVOICED' | 'RECONCILED';
  fhirResultBundle?: any;
  createdAt: string;
}

// VERTICAL D — Claims Intelligence (M22 - M25)
export type ClaimDocType =
  | 'DISCHARGE_SUMMARY'
  | 'ITEMIZED_BILL'
  | 'PHARMACY_RECEIPT'
  | 'LAB_REPORT'
  | 'PRESCRIPTION'
  | 'GOVT_ID'
  | 'PREAUTH_LETTER';

export interface Provenance {
  documentId: string;
  page: number;
  bbox: [number, number, number, number];
}

export interface BillLineItem {
  id: string;
  category: 'ROOM_RENT' | 'PROCEDURE' | 'CONSUMABLES' | 'PHARMACY' | 'INVESTIGATION' | 'NON_MEDICAL';
  itemDescription: string;
  billedAmount: number;
  adjudicatedAmount: number;
  deductionAmount: number;
  deductionReason?: string;
  ruleCodeApplied?: string;
  isNmeExclusion: boolean;
  confidence: number;
  provenance: Provenance;
}

export interface FwaAnomalyFlag {
  id: string;
  code: 'UPCODING' | 'UNBUNDLING' | 'DUPLICATE_CLAIM' | 'UNUSUAL_LOS' | 'TARIFF_EXCESS';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  impactAmount: number;
  dismissed: boolean;
  dismissalReason?: string;
  provenance: Provenance;
}

export interface ClaimAdjudication {
  id: string;
  claimNumber: string;
  policyNumber: string;
  patientName: string;
  hospitalName: string;
  admissionDate: string;
  dischargeDate: string;
  totalBilled: number;
  totalApproved: number;
  totalDeductions: number;
  lineItems: BillLineItem[];
  anomalyFlags: FwaAnomalyFlag[];
  ruleVersionsPinned: string;
  assignedReviewerId?: string;
  assignedReviewerName?: string;
  reviewerSignedAt?: string;
  decisionStatus: 'DRAFT_AI_FINDING' | 'REVIEWER_IN_PROGRESS' | 'APPROVED' | 'PARTIAL_APPROVED' | 'REJECTED';
  sensitiveCategoryFlag?: 'MENTAL_HEALTH' | 'REPRODUCTIVE' | 'HIV' | 'NONE';
  exchangeProtocol: 'NHCX' | 'OPEN_HCX';
}

// M18 Clinician Console
export interface ClinicianPatient {
  id: string;
  name: string;
  age: number;
  gender: string;
  bloodGroup: string;
  lastVisit: string;
  chiefComplaint: string;
  vitals: {
    bp: string;
    pulse: number;
    spo2: number;
    tempF: number;
    weightKg: number;
  };
  timeline: { date: string; type: string; title: string; notes: string }[];
  currentMedications: { drug: string; dosage: string; freq: string }[];
  aiDifferentialSuggestions: string[];
  drugInteractions: { drugPair: string; severity: 'HIGH' | 'MODERATE'; warning: string }[];
}

import type { RuleId } from '../ai/constitution';

// AI Message Chat
export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  constitutionRuleRef?: RuleId;
  triageSeverity?: 'LOW' | 'MODERATE' | 'URGENT_EMERGENCY';
  actionPrompt?: string;
  actionPayload?: any;
}

// Telemetry & Vitals OpenAPI Contract Types
export interface TelemetryVitalsPayload {
  deviceId: string;
  deviceType?: string;
  studentId?: string;
  heartRateBpm?: number;
  systolicBp?: number;
  diastolicBp?: number;
  spO2Percent?: number;
  spo2Percent?: number;
  respirationRateRpm?: number;
  respirationRpm?: number;
  temperatureF?: number;
  sensorAccuracyIndex: number; // Required by OpenAPI specification
  readings?: Record<string, unknown>;
  notes?: string;
}

export interface TelemetryVitalsRequest extends TelemetryVitalsPayload {}

export interface TelemetryVitalsResponse {
  status: 'SUCCESS' | 'ERROR';
  recordId: string;
  summary: string;
  sensorAccuracyIndex: number;
  timestamp: string;
}

