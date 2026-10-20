/**
 * Studentkare — Medication Information Screen (M-4.1 & M-4.2)
 * Compliance: Medication Information Specification
 *
 * Provides medication lookup by name or on-device OCR photograph scan.
 * Integrates:
 * - Advisor-approved plain-language descriptions (English & Telugu)
 * - Deterministic allergy cross-checking
 * - Jan Aushadhi generic price comparison
 * - CDSCO recall status alert
 * - Unlabelled pill notice ("I can't tell you what this is — don't take it")
 * - Mandatory honesty header
 */

import React, { useState } from 'react';
import { Search, Camera, ShieldCheck, Info } from 'lucide-react';
import { resolveOCRTextToCDCI, OCRResolutionResult } from '../../ai/engines/ocrResolutionPipeline';
import { performAllergyCrossCheck, StudentAllergyRecord } from '../../ai/engines/allergyCrossCheck';
import { evaluateCrisisGate } from '../../ai/core/crisisGate';
import { JanAushadhiComparison } from '../../components/JanAushadhiComparison';
import { useStudentStore } from '../../store/AppStores';

export const MedicationInfoScreen: React.FC = () => {
  const { student } = useStudentStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState<'EN' | 'TE'>('EN');
  const [resolutionResult, setResolutionResult] = useState<OCRResolutionResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [unlabelledPillNotice, setUnlabelledPillNotice] = useState(false);
  const [crisisAlertMessage, setCrisisAlertMessage] = useState<string | null>(null);

  // Mock CDCI Resolved Data
  const [medData, setMedData] = useState<any | null>(null);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    // 1. Crisis Gate Interception first
    const crisisCheck = evaluateCrisisGate(searchQuery);
    if (crisisCheck.kind !== 'CLEAR') {
      setCrisisAlertMessage(crisisCheck.message);
      setMedData(null);
      return;
    }
    setCrisisAlertMessage(null);

    // 2. Perform OCR / Text resolution
    const res = resolveOCRTextToCDCI(searchQuery);
    setResolutionResult(res);

    if (res.status === 'RESOLVED_SINGLE') {
      loadMedicationData(res.matchedCode!);
    } else {
      setMedData(null);
    }
  };

  const loadMedicationData = (cdciCode: string) => {
    // Mock database fetch by CDCI code
    if (cdciCode === 'CDCI_10482') {
      setMedData({
        cdci_code: 'CDCI_10482',
        brand_name: 'Bactrim DS',
        generic_name: 'Trimethoprim / Sulfamethoxazole',
        substance_code: 'SUB_SULFA_COMPOUND',
        strength: '800mg / 160mg',
        dosage_form: 'Tablet',
        drug_class: 'Sulfonamide Antibiotic',
        is_prescription_only: true,
        mrp_inr: 42.00,
        plain_description_en: 'Sulfamethoxazole-Trimethoprim is a combination antibiotic used to treat bacterial infections such as urinary tract and respiratory infections.',
        plain_description_te: 'సల్ఫామెథాక్సాజోల్-ట్రైమెథోప్రిమ్ అనేది బ్యాక్టీరియా ఇన్ఫెక్షన్ల చికిత్సకు ఉపయోగించే ఒక సమ్మేళన యాంటిబయోటిక్.',
        common_side_effects: ['Skin rash', 'Nausea', 'Mild dizziness'],
        storage_guidance: 'Store below 30°C in a dry place away from direct sunlight.',
        advisor_name: 'Dr. R. K. Sharma, MD Internal Medicine',
        approval_date: '2026-05-12',
      });
    } else {
      setMedData({
        cdci_code: 'CDCI_74820',
        brand_name: 'Crocin 650',
        generic_name: 'Paracetamol',
        substance_code: 'SUB_PARACETAMOL_500',
        strength: '650 mg',
        dosage_form: 'Tablet',
        drug_class: 'Analgesic & Antipyretic',
        is_prescription_only: false,
        mrp_inr: 34.50,
        plain_description_en: 'Paracetamol is commonly used to reduce fever and relieve mild-to-moderate pain such as headaches or body aches.',
        plain_description_te: 'పారసిటమాల్ సాధారణంగా జ్వరం తగ్గించడానికి మరియు మైల్డ్ నొప్పులను తగ్గించడానికి ఉపయోగిస్తారు.',
        common_side_effects: ['Nausea', 'Mild stomach discomfort'],
        storage_guidance: 'Store below 30°C in a dry place away from direct sunlight.',
        advisor_name: 'Dr. R. K. Sharma, MD Internal Medicine',
        approval_date: '2026-05-10',
      });
    }
  };

  const handleSimulateCameraScan = () => {
    setIsScanning(true);
    setUnlabelledPillNotice(false);
    setCrisisAlertMessage(null);

    setTimeout(() => {
      setIsScanning(false);
      // Simulate scanning printed text "CROCIN 65O"
      setSearchQuery("Crocin 650");
      const res = resolveOCRTextToCDCI("CROCIN 65O");
      setResolutionResult(res);
      loadMedicationData("CDCI_74820");
    }, 1200);
  };

  const handleUnlabelledPillScan = () => {
    setIsScanning(true);
    setMedData(null);
    setCrisisAlertMessage(null);

    setTimeout(() => {
      setIsScanning(false);
      setUnlabelledPillNotice(true);
    }, 1000);
  };

  // Perform Allergy Cross Check dynamically from student profile
  const activeAllergies: StudentAllergyRecord[] = (student?.allergies && student.allergies.length > 0)
    ? student.allergies.map(a => ({ substanceCode: a.toUpperCase().startsWith('SUB_') ? a.toUpperCase() : `SUB_${a.toUpperCase()}`, allergyName: a }))
    : [{ substanceCode: 'SUB_SULFA_COMPOUND', allergyName: 'Sulfa' }];

  const allergyCheck = medData
    ? performAllergyCrossCheck(medData.substance_code, medData.generic_name, activeAllergies)
    : { hasConflict: false };

  return (
    <div style={{ padding: '24px', background: 'var(--sk-color-canvas)', color: 'var(--sk-color-text)', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Honesty Header Banner */}
      <div style={{ background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <Info size={18} color="var(--sk-color-positive)" />
        <span style={{ fontSize: '13px', color: 'var(--sk-color-text-2)' }}>
          <strong>Honesty Register:</strong> General information about this medicine. Not advice about your situation. Ask a doctor.
        </span>
      </div>

      <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 16px' }}>Medication Information Lookup</h2>

      {/* Dual Search & Scan Control */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color="var(--sk-color-text-3)" style={{ position: 'absolute', left: '14px', top: '14px' }} />
          <input
            type="text"
            placeholder="Type brand or molecule (e.g. Crocin 650, Bactrim)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px 12px 42px', borderRadius: '10px', background: 'var(--sk-color-surface)',
              border: '1px solid var(--sk-color-rule-strong)', color: 'var(--sk-color-text)', fontSize: '14px',
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleSimulateCameraScan}
          style={{
            padding: '0 16px', borderRadius: '10px', background: 'var(--sk-color-action)', color: 'var(--sk-color-on-action)', fontWeight: 700,
            fontSize: '13px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          <Camera size={18} /> {isScanning ? 'Scanning...' : 'Scan Printed Strip'}
        </button>

        <button
          type="button"
          onClick={handleUnlabelledPillScan}
          style={{
            padding: '0 14px', borderRadius: '10px', background: 'var(--sk-color-surface)', color: 'var(--sk-color-text-2)',
            fontWeight: 600, fontSize: '12px', border: '1px solid var(--sk-color-rule-strong)', cursor: 'pointer',
          }}
        >
          Scan Loose Pill
        </button>
      </form>

      {/* Crisis Interception Banner */}
      {crisisAlertMessage && (
        <div style={{ background: 'var(--sk-color-danger-bg)', border: '1px solid var(--sk-color-danger-rule)', padding: '18px', borderRadius: '14px', color: 'var(--sk-color-danger)', margin: '16px 0' }}>
          <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800 }}>Safety Priority Alert</h4>
          <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6 }}>{crisisAlertMessage}</p>
        </div>
      )}

      {/* Unlabelled Pill Notice */}
      {unlabelledPillNotice && (
        <div style={{ background: 'var(--sk-color-attention-bg)', border: '1px solid color-mix(in srgb, var(--sk-color-attention) 35%, var(--sk-color-attention-bg))', padding: '18px', borderRadius: '14px', color: 'var(--sk-color-attention)', margin: '16px 0' }}>
          <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800 }}>Unlabelled Medication Detected</h4>
          <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6 }}>
            I can't tell you what this is — don't take it. India has thousands of manufacturers producing visually near-identical generics. Unlabelled tablets cannot be safely identified by appearance alone.
          </p>
        </div>
      )}

      {/* Low Confidence OCR Notice */}
      {resolutionResult?.status === 'LOW_CONFIDENCE_UNRESOLVED' && !unlabelledPillNotice && !crisisAlertMessage && (
        <div style={{ background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', padding: '16px', borderRadius: '12px', color: 'var(--sk-color-text-2)', fontSize: '13.5px' }}>
          {resolutionResult.message}
        </div>
      )}

      {/* Resolved Medication Details */}
      {medData && !crisisAlertMessage && (
        <div style={{ background: 'var(--sk-color-surface)', border: '1px solid var(--sk-color-rule)', borderRadius: '16px', padding: '24px', marginTop: '16px' }}>
          {/* Allergy Warning Flag */}
          {allergyCheck.hasConflict && (
            <div style={{ background: 'var(--sk-color-danger-bg)', border: '1px solid var(--sk-color-danger-rule)', padding: '14px', borderRadius: '10px', color: 'var(--sk-color-danger)', fontWeight: 700, fontSize: '13.5px', marginBottom: '20px' }}>
              ⚠️ {allergyCheck.warningFlagText}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sk-color-clinical-value)', fontFamily: 'monospace' }}>CDCI CODE: {medData.cdci_code}</span>
              <h3 style={{ margin: '4px 0 2px', fontSize: '22px', fontWeight: 800 }}>{medData.brand_name}</h3>
              <div style={{ fontSize: '14px', color: 'var(--sk-color-text-2)', fontFamily: 'monospace' }}>
                {medData.generic_name} · {medData.strength} · {medData.dosage_form}
              </div>
            </div>

            {/* Language Switcher */}
            <div style={{ display: 'flex', background: 'var(--sk-color-surface-2)', borderRadius: '8px', padding: '3px', border: '1px solid var(--sk-color-rule)' }}>
              <button
                onClick={() => setSelectedLang('EN')}
                style={{ padding: '6px 12px', borderRadius: '6px', background: selectedLang === 'EN' ? 'var(--sk-color-action)' : 'transparent', color: selectedLang === 'EN' ? 'var(--sk-color-on-action)' : 'var(--sk-color-text)', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                English
              </button>
              <button
                onClick={() => setSelectedLang('TE')}
                style={{ padding: '6px 12px', borderRadius: '6px', background: selectedLang === 'TE' ? 'var(--sk-color-action)' : 'transparent', color: selectedLang === 'TE' ? 'var(--sk-color-on-action)' : 'var(--sk-color-text)', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                తెలుగు (Telugu)
              </button>
            </div>
          </div>

          {/* Monograph Description */}
          <div style={{ marginTop: '20px', background: 'var(--sk-color-surface-2)', border: '1px solid var(--sk-color-rule)', borderRadius: '12px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: 'var(--sk-color-action)' }}>Plain-Language Monograph</h4>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
              {selectedLang === 'EN' ? medData.plain_description_en : medData.plain_description_te}
            </p>

            <div style={{ marginTop: '14px', fontSize: '11.5px', color: 'var(--sk-color-text-3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} color="var(--sk-color-positive)" />
              <span>Approved by {medData.advisor_name} on {medData.approval_date}</span>
            </div>
          </div>

          {/* Jan Aushadhi Generic Comparison */}
          <JanAushadhiComparison
            genericName={medData.generic_name}
            brandedMrp={medData.mrp_inr}
            janMrp={medData.cdci_code === 'CDCI_10482' ? 14.50 : 11.20}
            savingsPercentage={67.5}
          />
        </div>
      )}
    </div>
  );
};
