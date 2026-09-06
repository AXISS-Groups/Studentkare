import { FHIRObservation, HealthRecord, BillLineItem } from '../types';
import { assertRule } from './constitution';

export interface ExtractedDocumentResult {
  title: string;
  documentType: 'LAB_REPORT' | 'PRESCRIPTION' | 'HOSPITAL_BILL';
  confidenceOverall: number;
  observations?: FHIRObservation[];
  billItems?: BillLineItem[];
  facilityName: string;
  doctorName?: string;
  date: string;
  rawText: string;
}

export function simulateDocumentOcrExtraction(fileName: string): ExtractedDocumentResult {
  assertRule('Rule-K4');
  assertRule('Rule-C');

  const isBill = fileName.toLowerCase().includes('bill') || fileName.toLowerCase().includes('invoice');

  if (isBill) {
    return {
      title: 'Inpatient Hospitalization Itemized Bill',
      documentType: 'HOSPITAL_BILL',
      confidenceOverall: 94,
      facilityName: 'Apollo Hospitals Campus Annex',
      doctorName: 'Dr. R. Venkatraman, MS',
      date: '2026-08-12',
      rawText: 'APOLLO HOSPITALS · INVOICE #AP-2026-8921 · PATIENT: ROHIT SHARMA · ROOM RENT: 4500 · PHARMACY: 2350 · INVESTIGATIONS: 3800 · NON-MEDICAL SANITIZER: 350',
      billItems: [
        {
          id: 'bi-1',
          category: 'ROOM_RENT',
          itemDescription: 'Standard AC Room Bed Charges (2 Days @ ₹2,250)',
          billedAmount: 4500,
          adjudicatedAmount: 4000,
          deductionAmount: 500,
          deductionReason: 'Policy Room Rent Capped at 1% of Sum Insured (₹2,000/day)',
          ruleCodeApplied: 'RULE-POL-04',
          isNmeExclusion: false,
          confidence: 98,
          provenance: {
            documentId: 'doc-bill-01',
            page: 1,
            bbox: [12.0, 34.0, 76.0, 6.0],
          },
        },
        {
          id: 'bi-2',
          category: 'INVESTIGATION',
          itemDescription: 'CBC + Dengue NS1 Antigen Elisa Panel',
          billedAmount: 3800,
          adjudicatedAmount: 3800,
          deductionAmount: 0,
          isNmeExclusion: false,
          confidence: 96,
          provenance: {
            documentId: 'doc-bill-01',
            page: 1,
            bbox: [12.0, 44.0, 76.0, 6.0],
          },
        },
        {
          id: 'bi-3',
          category: 'PHARMACY',
          itemDescription: 'IV Fluids (RL + DNS 500ml) & Paracetamol Infusion',
          billedAmount: 2350,
          adjudicatedAmount: 2350,
          deductionAmount: 0,
          isNmeExclusion: false,
          confidence: 92,
          provenance: {
            documentId: 'doc-bill-01',
            page: 2,
            bbox: [14.0, 22.0, 72.0, 5.0],
          },
        },
        {
          id: 'bi-4',
          category: 'NON_MEDICAL',
          itemDescription: 'PPE Kit, Sanitizer Dispensers & Admission File charges',
          billedAmount: 850,
          adjudicatedAmount: 0,
          deductionAmount: 850,
          deductionReason: 'IRDAI Standard Non-Medical Expenses Exclusion List (Item 14 & 29)',
          ruleCodeApplied: 'RULE-IRDAI-NME-01',
          isNmeExclusion: true,
          confidence: 89,
          provenance: {
            documentId: 'doc-bill-01',
            page: 2,
            bbox: [14.0, 38.0, 72.0, 5.0],
          },
        },
      ],
    };
  }

  // Otherwise Lab Report
  return {
    title: 'Complete Blood Count (CBC) & Lipid Panel',
    documentType: 'LAB_REPORT',
    confidenceOverall: 97,
    facilityName: 'Dr. Lal PathLabs · Campus Health Centre',
    doctorName: 'Dr. Ananya Rao, MD (Path)',
    date: '2026-08-14',
    rawText: 'DR LAL PATHLABS · CBC REPORT · HEMOGLOBIN: 14.2 g/dL · WBC: 6,800 /µL · PLATELETS: 240,000 /µL · FASTING GLUCOSE: 92 mg/dL',
    observations: [
      {
        id: 'obs-1',
        code: '718-7',
        display: 'Hemoglobin',
        value: '14.2',
        unit: 'g/dL',
        referenceRange: '13.0 - 17.0',
        isAbnormal: false,
        confidenceScore: 99,
        provenance: {
          pageNumber: 1,
          box: { x: 15, y: 28, width: 70, height: 4.5 },
          label: 'Hemoglobin 14.2 g/dL',
          snippet: 'HEMOGLOBIN (Photometric) : 14.2 g/dL [Normal: 13.0 - 17.0]',
        },
      },
      {
        id: 'obs-2',
        code: '6690-2',
        display: 'Total Leukocyte Count (WBC)',
        value: '6,800',
        unit: '/µL',
        referenceRange: '4,000 - 11,000',
        isAbnormal: false,
        confidenceScore: 97,
        provenance: {
          pageNumber: 1,
          box: { x: 15, y: 34, width: 70, height: 4.5 },
          label: 'WBC 6800 /µL',
          snippet: 'TOTAL LEUKOCYTE COUNT : 6,800 /cumm [Normal: 4000 - 11000]',
        },
      },
      {
        id: 'obs-3',
        code: '777-3',
        display: 'Platelet Count',
        value: '240,000',
        unit: '/µL',
        referenceRange: '150,000 - 450,000',
        isAbnormal: false,
        confidenceScore: 96,
        provenance: {
          pageNumber: 1,
          box: { x: 15, y: 40, width: 70, height: 4.5 },
          label: 'Platelet Count 240k',
          snippet: 'PLATELET COUNT : 2.40 Lakhs/cumm [Normal: 1.5 - 4.5]',
        },
      },
      {
        id: 'obs-4',
        code: '1558-6',
        display: 'Fasting Blood Glucose',
        value: '92',
        unit: 'mg/dL',
        referenceRange: '70 - 99',
        isAbnormal: false,
        confidenceScore: 95,
        provenance: {
          pageNumber: 1,
          box: { x: 15, y: 47, width: 70, height: 4.5 },
          label: 'Fasting Blood Sugar 92 mg/dL',
          snippet: 'GLUCOSE, FASTING (GOD-POD) : 92.0 mg/dL [Normal: 70 - 99]',
        },
      },
    ],
  };
}
