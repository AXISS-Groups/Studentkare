import type { PartnerEnquiryBody } from '../partnerApi';

/**
 * The partner application (design page 6: PartnerApply, WebPartnerApply).
 * Pure model, shared by the phone and web layouts.
 *
 * There is no partner-application endpoint. The application is sent as a
 * partnership enquiry (`POST /billing/inquiries`, the same channel as the
 * Partnerships page), which reaches Studentkare ops with a reference. So it
 * carries only what an enquiry may: business and licence numbers as text.
 * Document photos and bank details are NOT collected here (no upload or
 * penny-drop service exists, and bank numbers do not belong in a free-text
 * message); the form says so instead of pretending to take them.
 */

export const PARTNER_TYPES = ['pharmacy', 'lab', 'clinic', 'wellness'] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export const APPLY_STEPS = ['type', 'business', 'licences', 'payouts', 'rules'] as const;
export type ApplyStep = (typeof APPLY_STEPS)[number];

/** The four rules a partner agrees to (board step 5), in order. */
export const APPLY_RULES = ['ruleL', 'passScan', 'prices', 'dpa'] as const;

export interface ApplyValues {
  type: PartnerType | null;
  businessName: string;
  gstin: string;
  address: string;
  campuses: string;
  contactName: string;
  email: string;
  licenceNumber: string;
  professionalName: string;
  registration: string;
  agreed: Record<(typeof APPLY_RULES)[number], boolean>;
  /** Consent to be contacted about this application: never pre-ticked. */
  consent: boolean;
}

export const EMPTY_APPLICATION: ApplyValues = {
  type: null,
  businessName: '',
  gstin: '',
  address: '',
  campuses: '',
  contactName: '',
  email: '',
  licenceNumber: '',
  professionalName: '',
  registration: '',
  agreed: { ruleL: false, passScan: false, prices: false, dpa: false },
  consent: false,
};

/** 15 characters: state code, PAN, entity, Z, check (as on the board: 36AABCM1234C1Z5). */
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_NAME = 3;
const MIN_ADDRESS = 6;
const MIN_LICENCE = 3;

export type ApplyField =
  | 'type' | 'businessName' | 'gstin' | 'address' | 'contactName' | 'email'
  | 'licenceNumber' | 'professionalName' | 'registration' | 'agreed' | 'consent';

/** The fields still wrong on a step, in the order they appear. */
export function problemsOn(step: ApplyStep, values: ApplyValues): ApplyField[] {
  const out: ApplyField[] = [];
  switch (step) {
    case 'type':
      if (!values.type) out.push('type');
      break;
    case 'business':
      if (values.businessName.trim().length < MIN_NAME) out.push('businessName');
      if (!GSTIN.test(values.gstin.trim().toUpperCase())) out.push('gstin');
      if (values.address.trim().length < MIN_ADDRESS) out.push('address');
      if (values.contactName.trim().length < 2) out.push('contactName');
      if (!EMAIL.test(values.email.trim())) out.push('email');
      break;
    case 'licences':
      if (values.licenceNumber.trim().length < MIN_LICENCE) out.push('licenceNumber');
      if (values.professionalName.trim().length < MIN_LICENCE) out.push('professionalName');
      if (values.registration.trim().length < MIN_LICENCE) out.push('registration');
      break;
    case 'payouts':
      break;
    case 'rules':
      if (APPLY_RULES.some((rule) => !values.agreed[rule])) out.push('agreed');
      if (!values.consent) out.push('consent');
      break;
  }
  return out;
}

/** Labels for the ops-facing message. Read by Studentkare ops, not shown to the applicant. */
const TYPE_FOR_OPS: Record<PartnerType, string> = { pharmacy: 'Pharmacy', lab: 'Diagnostic lab', clinic: 'Clinic or hospital', wellness: 'Wellness' };

/** The enquiry body. Refuses (throws) unless every step is complete: the server is the second gate. */
export function enquiryFor(values: ApplyValues): PartnerEnquiryBody {
  const incomplete = APPLY_STEPS.some((step) => problemsOn(step, values).length > 0);
  if (incomplete || !values.type || !values.consent) throw new Error('The application is not complete.');
  const lines = [
    `Partner application · ${TYPE_FOR_OPS[values.type]}`,
    `GSTIN: ${values.gstin.trim().toUpperCase()}`,
    `Address: ${values.address.trim()}`,
    `Campuses: ${values.campuses.trim() || '(not given)'}`,
    `Licence / registration no.: ${values.licenceNumber.trim()}`,
    `Registered professional: ${values.professionalName.trim()} · ${values.registration.trim()}`,
    'Agreed: Rule L (no health data for marketing), pass scan + photo match at every handover, prices before booking, DPDP data processing agreement.',
    'Documents and bank details: not collected in the app; ask by email.',
  ];
  return {
    organization: values.businessName.trim().slice(0, 160),
    contactName: values.contactName.trim().slice(0, 120),
    email: values.email.trim().slice(0, 254),
    seats: 0,
    planId: 'ENTERPRISE',
    message: lines.join('\n').slice(0, 4000),
    consent: true,
  };
}
