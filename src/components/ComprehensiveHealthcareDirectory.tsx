import React, { useState, useMemo } from 'react';
import { useTheme } from '../theme/theme';
import {
  generateDoctorsCatalog,
  generateMedicationsCatalog,
  generateDiagnosticCatalog,
  TeleconsultDoctor,
  PharmacyMedication,
  DiagnosticLabTest,
} from '../data/teleconsultDataGenerator';
import {
  TeleconsultTriageLoopAgent,
  SpecialistRoutingLoopAgent,
  PrescriptionSafetyLoopAgent,
  LoopAgentStep,
} from '../ai/teleconsultLoopAgents';
import {
  Stethoscope,
  Pill,
  Building2,
  Search,
  RefreshCw,
  Truck,
  X,
} from 'lucide-react';

export const ComprehensiveHealthcareDirectory: React.FC = () => {
  const { tokens, typography } = useTheme();

  const [activeTab, setActiveTab] = useState<'DOCTORS' | 'MEDICATIONS' | 'VENDORS' | 'LOOP_AGENTS'>('DOCTORS');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Checkout Interactive States
  const [selectedDoctor, setSelectedDoctor] = useState<TeleconsultDoctor | null>(null);
  const [selectedMedication, setSelectedMedication] = useState<PharmacyMedication | null>(null);
  const [selectedTest, setSelectedTest] = useState<DiagnosticLabTest | null>(null);

  const [selectedSlot, setSelectedSlot] = useState('10:00 AM');
  const [hostelRoom, setHostelRoom] = useState('Boys Hostel A - Room 204');
  const [orderConfirmedMessage, setOrderConfirmedMessage] = useState<string | null>(null);

  // 1,100+ Generated Dataset Catalogs
  const doctorsCatalog = useMemo(() => generateDoctorsCatalog(), []);
  const medicationsCatalog = useMemo(() => generateMedicationsCatalog(), []);
  const diagnosticCatalog = useMemo(() => generateDiagnosticCatalog(), []);

  // Loop Agents Instances
  const [triageAgent] = useState(() => new TeleconsultTriageLoopAgent());
  const [routingAgent] = useState(() => new SpecialistRoutingLoopAgent());
  const [safetyAgent] = useState(() => new PrescriptionSafetyLoopAgent());

  // Loop Execution Output States
  const [activeLoopName, setActiveLoopName] = useState<string>('');
  const [loopSteps, setLoopSteps] = useState<LoopAgentStep[]>([]);
  const [isLoopExecuting, setIsLoopExecuting] = useState(false);

  // Filtered Datasets based on Search Query
  const filteredDoctors = useMemo(
    () =>
      doctorsCatalog.filter(
        (d) =>
          d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.campusStation.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [doctorsCatalog, searchQuery]
  );

  const filteredMedications = useMemo(
    () =>
      medicationsCatalog.filter(
        (m) =>
          m.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.activeMolecule.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.category.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [medicationsCatalog, searchQuery]
  );

  const filteredDiagnostics = useMemo(
    () =>
      diagnosticCatalog.filter(
        (t) =>
          t.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [diagnosticCatalog, searchQuery]
  );

  // Trigger Triage Loop Agent
  const triggerTriageLoop = () => {
    setActiveLoopName('Teleconsult Triage & Red Flag Loop Agent');
    setIsLoopExecuting(true);
    const steps = triageAgent.runTriageLoop('Acute fever x 2 days with retro-orbital ache', 101.4, '120/78');
    setLoopSteps(steps || []);
    setIsLoopExecuting(false);
  };

  // Trigger Routing Loop Agent
  const triggerRoutingLoop = () => {
    setActiveLoopName('Specialist Doctor Routing Loop Agent');
    setIsLoopExecuting(true);
    const steps = routingAgent.runRoutingLoop('Severe tension headache during exam prep');
    setLoopSteps(steps || []);
    setIsLoopExecuting(false);
  };

  // Trigger Safety Loop Agent
  const triggerSafetyLoop = () => {
    setActiveLoopName('Prescription Safety & Allergy Loop Agent');
    setIsLoopExecuting(true);
    const steps = safetyAgent.runSafetyLoop('Amoxicillin Antibiotic 500mg', ['Penicillin', 'Sulfa drugs']);
    setLoopSteps(steps || []);
    setIsLoopExecuting(false);
  };

  // Confirm Doctor Booking
  const handleConfirmDoctorBooking = () => {
    if (!selectedDoctor) return;
    setOrderConfirmedMessage(
      `🎉 Teleconsult Confirmed with ${selectedDoctor.name} at ${selectedSlot}! Video room link sent to your ABHA health vault.`
    );
    setTimeout(() => {
      setSelectedDoctor(null);
      setOrderConfirmedMessage(null);
    }, 3500);
  };

  // Confirm Medication Order
  const handleConfirmMedicationOrder = () => {
    if (!selectedMedication) return;
    setOrderConfirmedMessage(
      `📦 Order Placed! ${selectedMedication.brandName} is out for Express Delivery to ${hostelRoom}. ETA: ${selectedMedication.deliveryTimeMins} mins.`
    );
    setTimeout(() => {
      setSelectedMedication(null);
      setOrderConfirmedMessage(null);
    }, 3500);
  };

  // Confirm Diagnostic Test Booking
  const handleConfirmTestBooking = () => {
    if (!selectedTest) return;
    setOrderConfirmedMessage(
      `🧪 Test Pass Booked! ${selectedTest.testName} with ${selectedTest.vendorName}. Phlebotomist assigned for ${selectedTest.samplePickup}.`
    );
    setTimeout(() => {
      setSelectedTest(null);
      setOrderConfirmedMessage(null);
    }, 3500);
  };

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: tokens.surface,
        borderRadius: 24,
        border: `1.5px solid ${tokens.rule}`,
        padding: 28,
        boxShadow: '0 10px 32px rgba(83, 80, 204, 0.06)',
      }}
    >
      {/* Header & Catalog Counter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: tokens.text, letterSpacing: -0.5 }}>
            Care &amp; Teleconsult Directory (1,100+ Catalog Items)
          </div>
          <div style={{ fontSize: 12, color: tokens.text2, fontFamily: typography.fontMono, marginTop: 2 }}>
            400 NMC DOCTORS · 400 MEDICATIONS · 300 LAB TESTS · MULTIPLE LOOP AGENTS
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'DOCTORS', label: `NMC Doctors (${doctorsCatalog.length})`, icon: <Stethoscope size={14} /> },
            { id: 'MEDICATIONS', label: `Medications (${medicationsCatalog.length})`, icon: <Pill size={14} /> },
            { id: 'VENDORS', label: `Lab & Scans (${diagnosticCatalog.length})`, icon: <Building2 size={14} /> },
            { id: 'LOOP_AGENTS', label: 'Teleconsult Loop Agents', icon: <RefreshCw size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 800,
                border: `1px solid ${activeTab === tab.id ? tokens.action : tokens.rule}`,
                backgroundColor: activeTab === tab.id ? tokens.action : tokens.surface2,
                color: activeTab === tab.id ? '#ffffff' : tokens.text,
                cursor: 'pointer',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Filter Input (Visible for Catalog Tabs) */}
      {activeTab !== 'LOOP_AGENTS' && (
        <div style={{ position: 'relative', width: '100%', marginBottom: 20 }}>
          <Search size={16} color={tokens.text3} style={{ position: 'absolute', left: 14, top: 13 }} />
          <input
            type="text"
            placeholder={`Search across ${activeTab.toLowerCase()} catalog...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '11px 16px 11px 40px',
              borderRadius: 14,
              border: `1px solid ${tokens.rule}`,
              backgroundColor: tokens.surface2,
              color: tokens.text,
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* ─── TAB 1: 400+ DOCTORS ROSTER ───────────────────────────────── */}
      {activeTab === 'DOCTORS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, maxHeight: 620, overflowY: 'auto' }}>
          {filteredDoctors.slice(0, 40).map((doc) => (
            <div
              key={doc.id}
              style={{
                backgroundColor: tokens.canvas,
                borderRadius: 20,
                padding: 20,
                border: `1.5px solid ${tokens.ruleSoft}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                transition: 'all 160ms ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: tokens.positive, backgroundColor: tokens.positiveBg, padding: '4px 10px', borderRadius: 9999, fontFamily: typography.fontMono }}>
                    NMC VERIFIED
                  </span>
                  <span style={{ fontSize: 12, color: tokens.positive, fontWeight: 900, backgroundColor: tokens.surface3, padding: '2px 8px', borderRadius: 8 }}>★ {doc.rating}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: tokens.text }}>{doc.name}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: tokens.action, marginTop: 3 }}>{doc.specialty}</div>
                <div style={{ fontSize: 11, color: tokens.text2, fontFamily: typography.fontMono, marginTop: 8 }}>
                  {doc.councilRef} · {doc.experienceYears} Years Exp
                </div>
                <div style={{ fontSize: 11, color: tokens.text2, marginTop: 4 }}>
                  Station: <b>{doc.campusStation}</b>
                </div>
              </div>

              <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${tokens.ruleSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: tokens.positive }}>{doc.consultationFee}</span>
                <button
                  onClick={() => setSelectedDoctor(doc)}
                  style={{
                    backgroundColor: tokens.action,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '8px 14px',
                    fontWeight: 800,
                    fontSize: 11.5,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(83, 80, 204, 0.25)',
                  }}
                >
                  Book Slot →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB 2: 400+ MEDICATIONS CATALOG ──────────────────────────── */}
      {activeTab === 'MEDICATIONS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, maxHeight: 620, overflowY: 'auto' }}>
          {filteredMedications.slice(0, 40).map((med) => (
            <div
              key={med.id}
              style={{
                backgroundColor: tokens.canvas,
                borderRadius: 20,
                padding: 20,
                border: `1.5px solid ${tokens.ruleSoft}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: med.prescriptionRequired ? tokens.emergency : tokens.positive, backgroundColor: med.prescriptionRequired ? tokens.emergencyBg : tokens.positiveBg, padding: '4px 10px', borderRadius: 9999, fontFamily: typography.fontMono }}>
                    {med.prescriptionRequired ? 'PRESCRIPTION GATED' : 'OTC / FREE PASS'}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 900, color: tokens.action, fontFamily: typography.fontMono }}>₹{med.price}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: tokens.text }}>{med.brandName}</div>
                <div style={{ fontSize: 12, color: tokens.text2, fontFamily: typography.fontMono, marginTop: 3 }}>{med.activeMolecule}</div>
                <div style={{ fontSize: 11, color: tokens.positive, marginTop: 8, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Truck size={14} color={tokens.positive} />
                  <span>Express Delivery: {med.deliveryTimeMins} mins</span>
                </div>
              </div>

              <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${tokens.ruleSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: tokens.text2 }}>Stock: <b>{med.stockCount} units</b></span>
                <button
                  onClick={() => setSelectedMedication(med)}
                  style={{
                    backgroundColor: tokens.surface3,
                    color: tokens.action,
                    border: `1px solid ${tokens.veil}`,
                    borderRadius: 12,
                    padding: '8px 14px',
                    fontWeight: 800,
                    fontSize: 11.5,
                    cursor: 'pointer',
                  }}
                >
                  Order to Hostel →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB 3: 300+ DIAGNOSTIC TESTS & VENDORS ───────────────────── */}
      {activeTab === 'VENDORS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, maxHeight: 620, overflowY: 'auto' }}>
          {filteredDiagnostics.slice(0, 40).map((t) => (
            <div
              key={t.id}
              style={{
                backgroundColor: tokens.canvas,
                borderRadius: 20,
                padding: 20,
                border: `1.5px solid ${tokens.ruleSoft}`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: tokens.action, backgroundColor: tokens.surface3, padding: '4px 10px', borderRadius: 9999, fontFamily: typography.fontMono }}>
                    {t.category}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 900, color: tokens.action, fontFamily: typography.fontMono }}>₹{t.price}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: tokens.text }}>{t.testName}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: tokens.positive, marginTop: 4 }}>{t.vendorName}</div>
                <div style={{ fontSize: 11, color: tokens.text2, fontFamily: typography.fontMono, marginTop: 8 }}>
                  Turnaround: <b>{t.turnaroundHours} Hours</b>
                </div>
              </div>

              <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${tokens.ruleSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: tokens.text2 }}>{t.samplePickup}</span>
                <button
                  onClick={() => setSelectedTest(t)}
                  style={{
                    backgroundColor: tokens.action,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '8px 14px',
                    fontWeight: 800,
                    fontSize: 11.5,
                    cursor: 'pointer',
                  }}
                >
                  Book Test →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── TAB 4: MULTIPLE TELECONSULT LOOP AGENTS EXECUTOR ──────────── */}
      {activeTab === 'LOOP_AGENTS' && (
        <div style={{ backgroundColor: tokens.canvas, borderRadius: 20, padding: 24, border: `1.5px solid ${tokens.ruleSoft}` }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: tokens.text, marginBottom: 4 }}>
            Multiple Teleconsult &amp; Care Autonomous Loop Agents
          </div>
          <div style={{ fontSize: 12, color: tokens.text2, marginBottom: 20 }}>
            Run continuous feedback loops for Triage, Doctor Specialist Routing, and Prescription Safety.
          </div>

          {/* Trigger Loop Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
            <button
              onClick={triggerTriageLoop}
              disabled={isLoopExecuting}
              style={{
                backgroundColor: tokens.action,
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '10px 18px',
                fontWeight: 800,
                fontSize: 12,
                cursor: isLoopExecuting ? 'wait' : 'pointer',
              }}
            >
              Run Triage &amp; Red Flag Loop
            </button>

            <button
              onClick={triggerRoutingLoop}
              disabled={isLoopExecuting}
              style={{
                backgroundColor: tokens.surface3,
                color: tokens.action,
                border: `1px solid ${tokens.veil}`,
                borderRadius: 12,
                padding: '10px 18px',
                fontWeight: 800,
                fontSize: 12,
                cursor: isLoopExecuting ? 'wait' : 'pointer',
              }}
            >
              Run Doctor Specialist Routing Loop
            </button>

            <button
              onClick={triggerSafetyLoop}
              disabled={isLoopExecuting}
              style={{
                backgroundColor: tokens.emergencyBg,
                color: tokens.emergency,
                border: `1px solid rgba(255, 86, 71, 0.3)`,
                borderRadius: 12,
                padding: '10px 18px',
                fontWeight: 800,
                fontSize: 12,
                cursor: isLoopExecuting ? 'wait' : 'pointer',
              }}
            >
              Run Prescription Safety Loop
            </button>
          </div>

          {/* Loop Execution Step Trace Display */}
          {loopSteps.length > 0 && (
            <div style={{ backgroundColor: tokens.surface, borderRadius: 18, padding: 20, border: `1px solid ${tokens.rule}` }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: tokens.action, marginBottom: 12 }}>
                EXECUTING: {activeLoopName}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {loopSteps.filter(Boolean).map((s, idx) => (
                  <div key={s?.loopIndex ?? idx} style={{ backgroundColor: tokens.surface2, borderRadius: 14, padding: 14, border: `1px solid ${tokens.ruleSoft}` }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: tokens.action, fontFamily: typography.fontMono, marginBottom: 4 }}>
                      LOOP ITERATION #{s?.loopIndex ?? (idx + 1)}: {s?.phaseName}
                    </div>
                    <div style={{ fontSize: 13, color: tokens.text, marginBottom: 6 }}>
                      <b>Thought:</b> {s?.thought}
                    </div>
                    <div style={{ fontSize: 12, fontFamily: typography.fontMono, color: tokens.positive, backgroundColor: tokens.positiveBg, padding: '6px 10px', borderRadius: 8, marginBottom: 4 }}>
                      <b>Action:</b> {s?.action}
                    </div>
                    <div style={{ fontSize: 12, color: tokens.text2, backgroundColor: tokens.canvas, padding: '6px 10px', borderRadius: 8 }}>
                      <b>Result:</b> {s?.result}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL 1: BOOK DOCTOR TELECONSULT CHECKOUT MODAL ───────────── */}
      {selectedDoctor && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6,8,36,0.65)', backdropFilter: 'blur(8px)', zIndex: 999990, display: 'grid', placeItems: 'center', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 540, backgroundColor: tokens.surface, borderRadius: 24, padding: 28, border: `1.5px solid ${tokens.rule}`, position: 'relative' }}>
            <button onClick={() => setSelectedDoctor(null)} style={{ position: 'absolute', right: 20, top: 20, background: tokens.surface2, border: `1px solid ${tokens.ruleSoft}`, borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'grid', placeItems: 'center', color: tokens.text }}>
              <X size={18} />
            </button>

            <div style={{ fontSize: 20, fontWeight: 900, color: tokens.text, marginBottom: 4 }}>Book Teleconsult Appointment</div>
            <div style={{ fontSize: 13, color: tokens.text2, marginBottom: 18 }}>{selectedDoctor.name} · {selectedDoctor.specialty}</div>

            {orderConfirmedMessage ? (
              <div style={{ backgroundColor: tokens.positiveBg, color: tokens.positive, padding: 18, borderRadius: 16, fontSize: 14, fontWeight: 800, lineHeight: 1.5, textAlign: 'center' }}>
                {orderConfirmedMessage}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: tokens.text3, marginBottom: 6 }}>SELECT TIME SLOT TODAY</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedDoctor.availableSlots.map((slot) => (
                      <button key={slot} onClick={() => setSelectedSlot(slot)} style={{ padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800, border: `1px solid ${selectedSlot === slot ? tokens.action : tokens.rule}`, backgroundColor: selectedSlot === slot ? tokens.action : tokens.surface2, color: selectedSlot === slot ? '#fff' : tokens.text, cursor: 'pointer' }}>
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ backgroundColor: tokens.canvas, padding: 14, borderRadius: 14, border: `1px solid ${tokens.ruleSoft}`, marginBottom: 20, fontSize: 12.5, color: tokens.text2, lineHeight: 1.6 }}>
                  <b>Consultation Fee:</b> Free (Covered under Student Kare Pass)<br />
                  <b>Student ABHA Handle:</b> arjun.mehta@abdm<br />
                  <b>Encrypted Video Stream:</b> WebRTC Telemetry Connected
                </div>

                <button onClick={handleConfirmDoctorBooking} style={{ width: '100%', backgroundColor: tokens.action, color: '#ffffff', border: 'none', borderRadius: 14, padding: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                  Confirm Booking &amp; Generate Ticket →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 2: BUY EXPRESS PHARMACY MEDICATION CHECKOUT MODAL ───── */}
      {selectedMedication && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6,8,36,0.65)', backdropFilter: 'blur(8px)', zIndex: 999990, display: 'grid', placeItems: 'center', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 540, backgroundColor: tokens.surface, borderRadius: 24, padding: 28, border: `1.5px solid ${tokens.rule}`, position: 'relative' }}>
            <button onClick={() => setSelectedMedication(null)} style={{ position: 'absolute', right: 20, top: 20, background: tokens.surface2, border: `1px solid ${tokens.ruleSoft}`, borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'grid', placeItems: 'center', color: tokens.text }}>
              <X size={18} />
            </button>

            <div style={{ fontSize: 20, fontWeight: 900, color: tokens.text, marginBottom: 4 }}>Express Hostel Pharmacy Order</div>
            <div style={{ fontSize: 13, color: tokens.text2, marginBottom: 18 }}>{selectedMedication.brandName} ({selectedMedication.activeMolecule})</div>

            {orderConfirmedMessage ? (
              <div style={{ backgroundColor: tokens.positiveBg, color: tokens.positive, padding: 18, borderRadius: 16, fontSize: 14, fontWeight: 800, lineHeight: 1.5, textAlign: 'center' }}>
                {orderConfirmedMessage}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: tokens.text3, marginBottom: 6 }}>HOSTEL DELIVERY LOCATION</div>
                  <input
                    type="text"
                    value={hostelRoom}
                    onChange={(e) => setHostelRoom(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1px solid ${tokens.rule}`, backgroundColor: tokens.surface2, color: tokens.text, fontSize: 13 }}
                  />
                </div>

                <div style={{ backgroundColor: tokens.canvas, padding: 14, borderRadius: 14, border: `1px solid ${tokens.ruleSoft}`, marginBottom: 20, fontSize: 12.5, color: tokens.text2, lineHeight: 1.6 }}>
                  <b>Item Price:</b> ₹{selectedMedication.price}<br />
                  <b>Delivery SLA:</b> Guaranteed under {selectedMedication.deliveryTimeMins} mins<br />
                  <b>Prescription Check:</b> {selectedMedication.prescriptionRequired ? 'NMC MD Verified ✓' : 'OTC Pass ✓'}
                </div>

                <button onClick={handleConfirmMedicationOrder} style={{ width: '100%', backgroundColor: tokens.action, color: '#ffffff', border: 'none', borderRadius: 14, padding: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                  Pay ₹{selectedMedication.price} &amp; Dispatch Rider →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL 3: DIAGNOSTIC TEST BOOKING MODAL ────────────────────── */}
      {selectedTest && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(6,8,36,0.65)', backdropFilter: 'blur(8px)', zIndex: 999990, display: 'grid', placeItems: 'center', padding: 20 }}>
          <div style={{ width: '100%', maxWidth: 540, backgroundColor: tokens.surface, borderRadius: 24, padding: 28, border: `1.5px solid ${tokens.rule}`, position: 'relative' }}>
            <button onClick={() => setSelectedTest(null)} style={{ position: 'absolute', right: 20, top: 20, background: tokens.surface2, border: `1px solid ${tokens.ruleSoft}`, borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'grid', placeItems: 'center', color: tokens.text }}>
              <X size={18} />
            </button>

            <div style={{ fontSize: 20, fontWeight: 900, color: tokens.text, marginBottom: 4 }}>Book Diagnostic Test Pass</div>
            <div style={{ fontSize: 13, color: tokens.text2, marginBottom: 18 }}>{selectedTest.testName} · {selectedTest.vendorName}</div>

            {orderConfirmedMessage ? (
              <div style={{ backgroundColor: tokens.positiveBg, color: tokens.positive, padding: 18, borderRadius: 16, fontSize: 14, fontWeight: 800, lineHeight: 1.5, textAlign: 'center' }}>
                {orderConfirmedMessage}
              </div>
            ) : (
              <>
                <div style={{ backgroundColor: tokens.canvas, padding: 14, borderRadius: 14, border: `1px solid ${tokens.ruleSoft}`, marginBottom: 20, fontSize: 12.5, color: tokens.text2, lineHeight: 1.6 }}>
                  <b>Test Price:</b> ₹{selectedTest.price}<br />
                  <b>Sample Pickup:</b> {selectedTest.samplePickup}<br />
                  <b>FHIR Report SLA:</b> Within {selectedTest.turnaroundHours} Hours
                </div>

                <button onClick={handleConfirmTestBooking} style={{ width: '100%', backgroundColor: tokens.action, color: '#ffffff', border: 'none', borderRadius: 14, padding: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                  Confirm Diagnostic Pass (₹{selectedTest.price}) →
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
