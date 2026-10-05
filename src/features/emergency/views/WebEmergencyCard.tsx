import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, Heart, Plus, Printer, Shield, Trash2, X } from 'lucide-react';
import { useAuth } from '@/data/AuthContext';
import { apiRequest } from '@/data/http';
import type { MemberProfile } from '@/data/workflowTypes';
import './web-emergency-card.css';

export type BloodGroup = 'Not set' | 'I don’t know' | 'A+' | 'A−' | 'B+' | 'B−' | 'O+' | 'O−' | 'AB+' | 'AB−';
export type ContactRelation = 'Parent' | 'Sibling' | 'Partner' | 'Friend' | 'Warden' | 'Other';

export interface EmergencyContactInput {
  name: string;
  phone: string;
  rel: ContactRelation;
}

const BLOOD_GROUPS: BloodGroup[] = ['Not set', 'I don’t know', 'A+', 'A−', 'B+', 'B−', 'O+', 'O−', 'AB+', 'AB−'];
const RELATIONS: ContactRelation[] = ['Parent', 'Sibling', 'Partner', 'Friend', 'Warden', 'Other'];

export const isValidIndianMobile = (phone: string): boolean => /^[6-9]\d{9}$/.test(phone.trim());

export interface WebEmergencyCardProps {
  initialBloodGroup?: BloodGroup;
  initialAllergies?: string[];
  initialNka?: boolean;
  initialConditions?: string;
  initialMedicines?: string;
  initialContacts?: EmergencyContactInput[];
  onSaveSuccess?: () => void;
}

export function WebEmergencyCard({
  initialBloodGroup = 'Not set',
  initialAllergies = ['Penicillin'],
  initialNka = false,
  initialConditions = 'Asthma',
  initialMedicines = 'Salbutamol inhaler, as needed',
  initialContacts = [{ name: 'Sunita C.', phone: '9848012345', rel: 'Parent' }],
  onSaveSuccess,
}: WebEmergencyCardProps): React.ReactElement {
  const { user } = useAuth();

  // State
  const [bg, setBg] = useState<BloodGroup>(initialBloodGroup);
  const [nka, setNka] = useState<boolean>(initialNka);
  const [allergies, setAllergies] = useState<string[]>(initialAllergies);
  const [allergyDraft, setAllergyDraft] = useState<string>('');
  const [conditions, setConditions] = useState<string>(initialConditions);
  const [medicines, setMedicines] = useState<string>(initialMedicines);
  const [contacts, setContacts] = useState<EmergencyContactInput[]>(initialContacts);

  // Sync / Dirty state
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // Sync with auth user profile if available on initial mount
  useEffect(() => {
    let active = true;
    apiRequest<MemberProfile>('/profile')
      .then((profile) => {
        if (!active || !profile) return;
        if (profile.bloodGroup && BLOOD_GROUPS.includes(profile.bloodGroup as BloodGroup)) {
          setBg(profile.bloodGroup as BloodGroup);
        }
        if (profile.allergies && profile.allergies.length > 0) {
          setAllergies(profile.allergies);
          setNka(false);
        }
        if (profile.chronicConditions && profile.chronicConditions.length > 0) {
          setConditions(profile.chronicConditions.join(', '));
        }
        if (profile.emergencyContactName && profile.emergencyContactPhone) {
          const matchedRel = RELATIONS.find((r) => r.toLowerCase() === (profile.emergencyContactRelation || '').toLowerCase()) || 'Other';
          const cleanPhone = profile.emergencyContactPhone.replace(/[^0-9]/g, '').slice(-10);
          setContacts([{ name: profile.emergencyContactName, phone: cleanPhone, rel: matchedRel }]);
        }
      })
      .catch(() => {
        // Offline or unauthenticated preview fallback uses props
      });
    return () => {
      active = false;
    };
  }, []);

  // Validation calculations
  const okContactsCount = contacts.filter((c) => c.name.trim() !== '' && isValidIndianMobile(c.phone) && Boolean(c.rel)).length;
  const hasPhoneFormatError = contacts.some((c) => c.phone.trim() !== '' && !isValidIndianMobile(c.phone));

  const todoItems: string[] = [];
  if (bg === 'Not set') {
    todoItems.push('Blood group is not set');
  }
  if (!nka && allergies.length === 0) {
    todoItems.push('Say “No known allergies” or add them');
  }
  if (okContactsCount === 0) {
    todoItems.push('Add at least one reachable contact');
  }

  const points = (bg !== 'Not set' ? 1 : 0) + (nka || allergies.length > 0 ? 1 : 0) + (okContactsCount > 0 ? 1 : 0);
  const readinessPct = Math.round((points / 3) * 100);

  // Handlers
  const handlePickBg = (selected: BloodGroup) => {
    setBg(selected);
    setIsDirty(true);
    setIsSaved(false);
  };

  const handleToggleNka = () => {
    const nextNka = !nka;
    setNka(nextNka);
    if (nextNka) {
      setAllergies([]);
    }
    setIsDirty(true);
    setIsSaved(false);
  };

  const handleAddAllergy = () => {
    const trimmed = allergyDraft.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed]);
      setAllergyDraft('');
      setNka(false);
      setIsDirty(true);
      setIsSaved(false);
    }
  };

  const handleRemoveAllergy = (indexToRemove: number) => {
    setAllergies(allergies.filter((_, i) => i !== indexToRemove));
    setIsDirty(true);
    setIsSaved(false);
  };

  const handleContactChange = (index: number, patch: Partial<EmergencyContactInput>) => {
    const next = contacts.map((c, i) => (i === index ? { ...c, ...patch } : c));
    setContacts(next);
    setIsDirty(true);
    setIsSaved(false);
  };

  const handleAddContact = () => {
    if (contacts.length < 3) {
      setContacts([...contacts, { name: '', phone: '', rel: 'Parent' }]);
      setIsDirty(true);
      setIsSaved(false);
    }
  };

  const handleRemoveContact = (index: number) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((_, i) => i !== index));
      setIsDirty(true);
      setIsSaved(false);
    }
  };

  const handleDiscard = () => {
    setBg(initialBloodGroup);
    setNka(initialNka);
    setAllergies(initialAllergies);
    setConditions(initialConditions);
    setMedicines(initialMedicines);
    setContacts(initialContacts);
    setIsDirty(false);
    setIsSaved(true);
    showToast('Changes discarded');
  };

  const handleSave = async () => {
    if (hasPhoneFormatError) {
      showToast('Fix the phone number first');
      return;
    }

    const primaryContact = contacts.find((c) => isValidIndianMobile(c.phone)) || contacts[0];
    const payload = {
      bloodGroup: bg === 'Not set' || bg === 'I don’t know' ? '' : bg,
      allergies: nka ? [] : allergies,
      chronicConditions: conditions ? conditions.split(',').map((s) => s.trim()).filter(Boolean) : [],
      emergencyContactName: primaryContact?.name || '',
      emergencyContactPhone: primaryContact?.phone || '',
      emergencyContactRelation: primaryContact?.rel || '',
    };

    try {
      await apiRequest<MemberProfile>('/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } catch {
      // Offline fallback: keep saved in client view
    }

    setIsDirty(false);
    setIsSaved(true);
    showToast('Saved · offline card updated on your phone');
    onSaveSuccess?.();
  };

  const handlePrint = () => {
    if (isSaved && !isDirty) {
      showToast('PDF ready · printed copies cannot be updated later');
      setTimeout(() => {
        window.print();
      }, 300);
    } else {
      showToast('Save your card first');
    }
  };

  // Display texts for preview
  const studentDisplayName = user?.fullName || 'Krishna C.';
  const studentDetails = user?.university ? `${user.university} · Student` : 'Student Kare Member';

  const previewBloodGroupText = bg === 'Not set' ? 'Not set' : bg === 'I don’t know' ? 'Unknown' : bg;
  const previewAllergiesText = nka ? 'None known' : allergies.length > 0 ? allergies.join(', ') : 'Not recorded';

  const validContacts = contacts.filter((c) => c.name.trim() !== '' && isValidIndianMobile(c.phone));
  const previewCallText =
    validContacts.length > 0
      ? validContacts
          .map((c) => `${c.name} (${c.rel.toLowerCase()}) · +91 ${c.phone.slice(0, 5)} ${c.phone.slice(5)}`)
          .join(' — ')
      : 'No contact yet';

  return (
    <div className="web-emergency-container" role="region" aria-label="Emergency card editor">
      {toastMessage && (
        <div className="web-emergency-toast" role="status" aria-live="polite">
          <Check size={18} color="#6EE7B7" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="web-emergency-header">
        <div>
          <h1>Emergency card</h1>
          <p>What a stranger or a doctor needs in the first ten minutes. You decide what goes on it.</p>
        </div>
        <div>
          <button
            type="button"
            className="health-button"
            onClick={handlePrint}
            aria-label="Print or save as PDF"
            style={{
              height: 44,
              padding: '0 20px',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: isSaved && !isDirty ? '#3525CD' : '#FFFFFF',
              color: isSaved && !isDirty ? '#FFFFFF' : '#464555',
              border: isSaved && !isDirty ? 'none' : '1px solid #DAE2FD',
            }}
          >
            <Printer size={16} aria-hidden="true" />
            <span>Print / save PDF</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="web-emergency-layout">
        {/* Left Column: Form Editor */}
        <section className="web-emergency-form" aria-label="Emergency details form">
          {/* Blood Group */}
          <div className="web-emergency-field-group">
            <span className="web-emergency-field-label">BLOOD GROUP</span>
            <div className="web-emergency-blood-groups" role="group" aria-label="Select blood group">
              {BLOOD_GROUPS.map((g) => {
                const isActive = g === bg;
                const isNeutral = g === 'Not set' || g === 'I don’t know';
                const buttonClass = isActive
                  ? isNeutral
                    ? 'web-emergency-bg-btn active-neutral'
                    : 'web-emergency-bg-btn active-danger'
                  : 'web-emergency-bg-btn';

                return (
                  <button
                    key={g}
                    type="button"
                    className={buttonClass}
                    aria-pressed={isActive}
                    aria-label={`Blood group: ${g}`}
                    onClick={() => handlePickBg(g)}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
            <span className="web-emergency-helper-text">
              Not set is the default. A wrong blood group is worse than none — pick only what a report or doctor confirmed.
            </span>
          </div>

          {/* Allergies */}
          <div className="web-emergency-field-group">
            <span className="web-emergency-field-label">ALLERGIES</span>
            <button
              type="button"
              className={`web-emergency-nka-btn ${nka ? 'is-active' : ''}`}
              onClick={handleToggleNka}
              aria-pressed={nka}
              aria-label="No known allergies"
            >
              <span className="web-emergency-nka-checkbox" aria-hidden="true">
                {nka && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
              </span>
              <span>No known allergies</span>
            </button>

            {!nka && (
              <div className="web-emergency-allergy-box">
                {allergies.map((item, index) => (
                  <span key={item} className="web-emergency-allergy-chip">
                    {item}
                    <button
                      type="button"
                      aria-label={`Remove allergy ${item}`}
                      onClick={() => handleRemoveAllergy(index)}
                    >
                      <X size={12} strokeWidth={2.8} aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="web-emergency-allergy-input"
                  placeholder="Type and press Enter"
                  value={allergyDraft}
                  onChange={(e) => setAllergyDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAllergy();
                    }
                  }}
                  aria-label="Add an allergy"
                />
                {allergyDraft.trim() && (
                  <button
                    type="button"
                    onClick={handleAddAllergy}
                    className="health-button"
                    style={{ minHeight: 32, padding: '0 10px', fontSize: 12, borderRadius: 8 }}
                    aria-label="Confirm adding allergy"
                  >
                    Add
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Long Term Conditions & Current Medicines */}
          <div className="web-emergency-grid-2">
            <label className="web-emergency-field-group">
              <span className="web-emergency-field-label">LONG-TERM CONDITIONS</span>
              <input
                type="text"
                className="web-emergency-input"
                value={conditions}
                onChange={(e) => {
                  setConditions(e.target.value);
                  setIsDirty(true);
                  setIsSaved(false);
                }}
                placeholder="e.g. Asthma, Type 1 Diabetes"
                aria-label="Long-term conditions"
              />
            </label>

            <label className="web-emergency-field-group">
              <span className="web-emergency-field-label">CURRENT MEDICINES</span>
              <input
                type="text"
                className="web-emergency-input"
                value={medicines}
                onChange={(e) => {
                  setMedicines(e.target.value);
                  setIsDirty(true);
                  setIsSaved(false);
                }}
                placeholder="e.g. Salbutamol inhaler, as needed"
                aria-label="Current medicines"
              />
            </label>
          </div>

          {/* Emergency Contacts */}
          <div className="web-emergency-field-group">
            <span className="web-emergency-field-label">EMERGENCY CONTACTS · UP TO 3</span>

            {contacts.map((c, i) => {
              const isInvalid = c.phone.trim() !== '' && !isValidIndianMobile(c.phone);

              return (
                <div key={i} className="web-emergency-contact-card" role="group" aria-label={`Emergency contact ${i + 1}`}>
                  <div className="web-emergency-contact-row">
                    <input
                      type="text"
                      className="web-emergency-input"
                      placeholder="Full name"
                      value={c.name}
                      onChange={(e) => handleContactChange(i, { name: e.target.value })}
                      aria-label={`Contact ${i + 1} full name`}
                    />

                    <span className={`web-emergency-phone-wrapper ${isInvalid ? 'has-error' : ''}`}>
                      <span className="web-emergency-phone-prefix">+91</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        className="web-emergency-phone-input"
                        placeholder="10-digit mobile"
                        value={c.phone}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                          handleContactChange(i, { phone: sanitized });
                        }}
                        aria-label={`Contact ${i + 1} phone number`}
                        maxLength={10}
                      />
                    </span>

                    {contacts.length > 1 && (
                      <button
                        type="button"
                        className="health-button"
                        onClick={() => handleRemoveContact(i)}
                        aria-label={`Remove contact ${i + 1}`}
                        style={{ height: 44, width: 44, padding: 0, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={16} color="#BE123C" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {/* Relationship Pills */}
                  <div className="web-emergency-rel-pills" role="radiogroup" aria-label={`Contact ${i + 1} relationship`}>
                    {RELATIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`web-emergency-rel-pill ${c.rel === r ? 'is-active' : ''}`}
                        aria-pressed={c.rel === r}
                        aria-label={`Relationship: ${r}`}
                        onClick={() => handleContactChange(i, { rel: r })}
                      >
                        {r}
                      </button>
                    ))}
                  </div>

                  {isInvalid && (
                    <span className="web-emergency-error-text" role="alert">
                      Enter a 10-digit Indian mobile starting with 6–9
                    </span>
                  )}
                </div>
              );
            })}

            {contacts.length < 3 && (
              <button
                type="button"
                className="web-emergency-add-contact-btn"
                onClick={handleAddContact}
                aria-label="Add another emergency contact"
              >
                <Plus size={16} aria-hidden="true" />
                <span>+ Add another contact</span>
              </button>
            )}
          </div>
        </section>

        {/* Right Column: Live Card Preview & Info */}
        <div className="web-emergency-preview-col">
          {/* Card Preview */}
          <section className="web-emergency-card-preview" aria-label="Emergency card preview">
            <div className="web-emergency-preview-badge">
              <span className="web-emergency-preview-icon" aria-hidden="true">
                <Heart size={22} fill="#FFFFFF" />
              </span>
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.2px', color: '#FCA5A5' }}>
                  IN CASE OF EMERGENCY
                </span>
                <span style={{ fontSize: 18, fontWeight: 800 }}>{studentDisplayName}</span>
                <span style={{ fontSize: 12, opacity: 0.85 }}>{studentDetails}</span>
              </div>
              <div className="web-emergency-preview-qr-box" aria-hidden="true">
                <Shield size={20} color="#1E1B4B" />
                <span>ICE QR</span>
              </div>
            </div>

            <div className="web-emergency-preview-grid">
              <div className="web-emergency-preview-tile">
                <span className="web-emergency-preview-tile-label">BLOOD GROUP</span>
                <span style={{ fontSize: previewBloodGroupText.length <= 3 ? 24 : 15, fontWeight: 900, color: previewBloodGroupText.length <= 3 ? '#FCA5A5' : '#FFFFFF' }}>
                  {previewBloodGroupText}
                </span>
              </div>
              <div className="web-emergency-preview-tile">
                <span className="web-emergency-preview-tile-label">ALLERGIES</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{previewAllergiesText}</span>
              </div>
            </div>

            <div className="web-emergency-preview-tile" style={{ fontSize: 13.5, fontWeight: 600 }}>
              <span className="web-emergency-preview-tile-label">CALL IN EMERGENCY</span>
              <span>{previewCallText}</span>
            </div>

            <span style={{ fontSize: 11, fontWeight: 600, color: '#A5B4FC' }}>
              Works offline on your phone · QR shows only this card
            </span>
          </section>

          {/* Readiness Meter */}
          <section className="web-emergency-readiness-card" aria-label="Card readiness assessment">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 16, fontWeight: 800, color: '#131B2E' }}>
                Card is {readinessPct}% ready
              </strong>
            </div>

            <div className="web-emergency-progress-track" role="progressbar" aria-valuenow={readinessPct} aria-valuemin={0} aria-valuemax={100}>
              <span
                className="web-emergency-progress-bar"
                style={{
                  width: `${readinessPct}%`,
                  background: readinessPct === 100 ? '#10B981' : '#F59E0B',
                }}
              />
            </div>

            {todoItems.map((item) => (
              <span key={item} style={{ fontSize: 12.5, fontWeight: 600, color: '#B45309', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={14} aria-hidden="true" />
                {item}
              </span>
            ))}
          </section>

          {/* Transparency / Privacy Panel */}
          <section className="web-emergency-readiness-card" aria-label="Who can see this card">
            <strong style={{ fontSize: 15, fontWeight: 800, color: '#131B2E' }}>
              Who can see this card
            </strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, lineHeight: 1.55, fontWeight: 500, color: '#464555' }}>
              <span>• Anyone who scans your QR — this card only, nothing else</span>
              <span>• Your campus in an emergency, via audited break-glass — you are notified</span>
              <span>• Never shown to shops, partners or your campus otherwise</span>
            </div>
          </section>
        </div>
      </div>

      {/* Sticky Bottom Bar for Unsaved Changes */}
      {isDirty && (
        <div className="web-emergency-dirty-bar" role="region" aria-label="Unsaved card changes">
          <span style={{ width: 10, height: 10, borderRadius: 999, background: '#FBBF24', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ flexGrow: 1, fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>
            Unsaved changes · your offline card updates when you save
          </span>
          <button
            type="button"
            className="health-button"
            onClick={handleDiscard}
            style={{
              height: 44,
              padding: '0 16px',
              borderRadius: 11,
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'transparent',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
            }}
            aria-label="Discard changes"
          >
            Discard
          </button>
          <button
            type="button"
            className="health-button health-button-primary"
            onClick={handleSave}
            style={{
              height: 44,
              padding: '0 20px',
              borderRadius: 11,
              fontWeight: 800,
              fontSize: 13.5,
              cursor: 'pointer',
              background: hasPhoneFormatError ? '#6B7280' : '#FFFFFF',
              color: '#131B2E',
              border: 'none',
            }}
            aria-label="Save emergency card"
          >
            Save card
          </button>
        </div>
      )}
    </div>
  );
}
