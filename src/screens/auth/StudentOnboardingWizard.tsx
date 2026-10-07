import React, { useState } from 'react';
import { EvidencedAgeSignup } from '@/components/EvidencedAgeSignup';
import { navigate } from '@/lib/workflowRouting';
import { Shield, CheckCircle2, ArrowRight } from 'lucide-react';

export const StudentOnboardingWizard: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [, setIsAgeVerified] = useState<boolean>(false);
  const [consentGranted, setConsentGranted] = useState<boolean>(false);
  const [campus, setCampus] = useState<string>('Knowledge Park Campus');
  const [hostel, setHostel] = useState<string>('Block A - Room 304');
  const [bloodGroup, setBloodGroup] = useState<string>('O+');
  const [emergencyContact, setEmergencyContact] = useState<string>('+91 98765 43210');
  const [abhaId, setAbhaId] = useState<string>('');

  const handleAgeSuccess = () => {
    setIsAgeVerified(true);
    setStep(2);
  };

  const handleConsentSubmit = () => {
    if (!consentGranted) return;
    setStep(3);
  };

  const handleCampusSubmit = () => {
    setStep(4);
  };

  const handleEmergencySubmit = () => {
    setStep(5);
  };

  const handleCompleteOnboarding = () => {
    // Persist onboarding consent timestamp
    localStorage.setItem('studentkare_onboarding_completed', 'true');
    localStorage.setItem('studentkare_dpdp_consent', JSON.stringify({
      version: 'v1.2.2026',
      timestamp: new Date().toISOString(),
      granted: true,
    }));
    navigate('health');
  };

  return (
    <div className="wf-card" style={{ maxWidth: '720px', margin: '32px auto', padding: '32px' }}>
      {/* Wizard Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', borderBottom: '1px solid var(--rule)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield style={{ color: 'var(--action)', width: '24px', height: '24px' }} />
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>Student First-Run Onboarding</h2>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-3)' }}>Step {step} of 5</span>
      </div>

      {/* Step 1: 18+ Age & Identity Evidence Verification */}
      {step === 1 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>1. Verify 18+ Age & Student Identity</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '24px' }}>
            In accordance with Rule L and Studentkare House Constitution, students must confirm 18+ age evidence before accessing personal health features.
          </p>
          <EvidencedAgeSignup onVerificationComplete={(res) => { if (res.isVerified) handleAgeSuccess(); }} />
        </div>
      )}

      {/* Step 2: DPDP Consent Agreement */}
      {step === 2 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>2. DPDP Health Data Consent</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '16px' }}>
            Only you own your health records. Campus wardens, sponsors, and payers get zero access to your clinical data.
          </p>
          <div style={{ background: 'var(--surface-2)', padding: '20px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text)' }}>
              <li><strong>Record Ownership:</strong> Only you can grant access to your records.</li>
              <li><strong>Zero Payer Visibility (Rule L):</strong> Hostel contracts or campus payers gain no access by paying.</li>
              <li><strong>Explicit Expiry:</strong> Every consent grant has a mandatory purpose and duration.</li>
            </ul>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '24px' }}>
            <input
              type="checkbox"
              checked={consentGranted}
              onChange={(e) => setConsentGranted(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
              I agree to Studentkare DPDP Consent v1.2 (Recorded with timestamp & version)
            </span>
          </label>
          <button
            className="wf-btn-primary"
            disabled={!consentGranted}
            onClick={handleConsentSubmit}
            style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <span>Proceed to Campus Assignment</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* Step 3: Campus & Hostel Block Selection */}
      {step === 3 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>3. Campus & Hostel Details</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '20px' }}>
            Assign your campus and hostel block for localized medical emergency response and camp services.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>University / Campus</label>
              <select
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value="Knowledge Park Campus">Knowledge Park Campus</option>
                <option value="HITEC University Main">HITEC University Main</option>
                <option value="Tech City Health Campus">Tech City Health Campus</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Hostel Block & Room</label>
              <input
                type="text"
                value={hostel}
                onChange={(e) => setHostel(e.target.value)}
                placeholder="e.g. Block A - Room 304"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' }}
              />
            </div>
          </div>
          <button
            className="wf-btn-primary"
            onClick={handleCampusSubmit}
            style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <span>Save Campus & Create Emergency Card</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* Step 4: Emergency Card Basics */}
      {step === 4 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>4. Offline Emergency Card Setup</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '20px' }}>
            Provide basic emergency data (blood group & emergency contact) for break-glass card generation.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' }}
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Emergency Contact Phone</label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="+91 98765 43210"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)' }}
              />
            </div>
          </div>
          <button
            className="wf-btn-primary"
            onClick={handleEmergencySubmit}
            style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <span>Proceed to ABHA Setup (Optional)</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* Step 5: ABHA Link (Skippable) & Complete */}
      {step === 5 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>5. Link ABHA Digital Health ID (Optional)</h3>
          <p style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '20px' }}>
            Link your Ayushman Bharat Health Account (ABHA) to sync national health records automatically.
          </p>
          <div style={{ marginBottom: '24px' }}>
            <input
              type="text"
              value={abhaId}
              onChange={(e) => setAbhaId(e.target.value)}
              placeholder="e.g. 91-1234-5678-9012 or username@abha"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--rule)', background: 'var(--surface)', color: 'var(--text)', marginBottom: '12px' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>You can skip this step and link ABHA anytime from Digital ID.</span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="wf-btn-secondary"
              onClick={handleCompleteOnboarding}
              style={{ flex: 1, padding: '12px' }}
            >
              Skip ABHA for Now
            </button>
            <button
              className="wf-btn-primary"
              onClick={handleCompleteOnboarding}
              style={{ flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <CheckCircle2 size={18} />
              <span>Complete Setup</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
