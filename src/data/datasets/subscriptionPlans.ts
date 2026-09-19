export type SubscriptionPlanId = 'FREE' | 'PLAN_59' | 'PLAN_159' | 'PLAN_299';

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  price: number; // 0, 59, 159, 299
  period: string; // 'Forever Free' | 'per month'
  badge?: string;
  badgeColor?: string;
  description: string;
  freeCheckups: string[];
  doctorConsultations: string;
  xrayDiscount: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'FREE',
    name: 'Free Student Plan',
    price: 0,
    period: 'Forever Free',
    badge: 'BASIC',
    badgeColor: '#64748b',
    description: 'Essential wellness checkups for all registered students.',
    freeCheckups: [
      '🩸 Basic Blood Checkup (Hb & Blood Sugar)',
      '❤️ Heart & Blood Pressure Vitals Exam',
      '👁️ Snellen Vision Acuity Checkup',
    ],
    doctorConsultations: 'Standard Pay-Per-Visit',
    xrayDiscount: '0% Discount',
    features: [
      'Free Basic Blood Checkup (Hb & Sugar)',
      'Free Heart & Blood Pressure Checkup',
      'Free Snellen Vision Acuity Exam',
      'Digital Health Vault (50 MB Storage)',
      '108 Emergency Medical ID Card',
    ],
  },
  {
    id: 'PLAN_59',
    name: 'Essential Health Pass',
    price: 59,
    period: 'per month',
    badge: 'POPULAR',
    badgeColor: '#059669',
    description: 'Basic checkups + 1 Free NMC Doctor consultation & 15% X-Ray discounts.',
    freeCheckups: [
      '🩸 Complete Blood Count (CBC) Checkup',
      '❤️ Heart, Pulse & BP Vitals Exam',
      '👁️ Vision Acuity Checkup',
    ],
    doctorConsultations: '1 Free Consultation / Month (10% off additional)',
    xrayDiscount: '15% Off X-Rays & Imaging',
    features: [
      'All Free Checkups (Blood, BP, Vision)',
      '1 Free NMC Doctor Teleconsultation / Month',
      '15% Discount on X-Rays & Chest Imaging',
      '10% Discount on Partner Diagnostic Labs',
      'Priority Campus Clinic Queue Access',
    ],
  },
  {
    id: 'PLAN_159',
    name: 'Advanced Health Pass',
    price: 159,
    period: 'per month',
    badge: 'BEST VALUE',
    badgeColor: '#7c3aed',
    description: 'Extended doctor consulting, 35% X-Ray discounts & Cardiac ECG checkups.',
    freeCheckups: [
      '🩸 Full Blood & Lipid Profile Checkup',
      '❤️ Heart, BP & 12-Lead Cardiac ECG',
      '👁️ Vision & ENT Acuity Exam',
    ],
    doctorConsultations: '3 Free Consultations / Month (25% off additional)',
    xrayDiscount: '35% Off X-Rays & Ultrasounds',
    features: [
      'Free Blood, BP, Vision & Cardiac ECG',
      '3 Free NMC Doctor Consultations / Month',
      '35% Discount on X-Rays & Ultrasound Scans',
      '25% Discount on All Diagnostic Lab Tests',
      'Free Hostel Prescription Delivery Waiver',
    ],
  },
  {
    id: 'PLAN_299',
    name: 'Full Care Protection Pass',
    price: 299,
    period: 'per month',
    badge: 'FULL SUITE',
    badgeColor: '#e11d48',
    description: 'Full health protection pass with maximum discounts across all services.',
    freeCheckups: [
      '🩸 Full Comprehensive 50+ Marker Body Panel',
      '❤️ Heart, BP, Cardiac ECG & Spirometry',
      '👁️ Vision, Dental & ENT Acuity Exam',
      '🧠 Mental Health & Stress Radar Check',
    ],
    doctorConsultations: 'Unlimited Free Doctor Consultations',
    xrayDiscount: '60% Off X-Rays, MRI & CT Scans',
    features: [
      'Full Comprehensive Annual Health Suite (50+ Markers)',
      'Unlimited Free NMC Doctor Consultations',
      '60% Discount on X-Rays, MRI, CT & Ultrasounds',
      '50% Discount on All Lab Diagnostics',
      'Free 24/7 Priority Emergency Ambulance Pass',
      'Dedicated Campus Healthcare Concierge',
    ],
  },
];
