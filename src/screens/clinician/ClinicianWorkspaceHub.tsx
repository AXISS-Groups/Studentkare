import React, { useState } from 'react';
import { Calendar, ClipboardList, Clock, Compass, FileCheck, FileText, FlaskConical, LayoutDashboard, Stethoscope, UserCheck, Users } from 'lucide-react';
import { DoctorTodayScreen } from './DoctorTodayScreen';
import { DoctorConsultRoomScreen } from './DoctorConsultRoomScreen';
import { NMCDoctorEPrescriptionScreen } from './NMCDoctorEPrescriptionScreen';
import { DoctorClinicalInboxScreen } from './DoctorClinicalInboxScreen';
import { DoctorScheduleScreen } from './DoctorScheduleScreen';
import { DoctorFollowupTrackerScreen } from './DoctorFollowupTrackerScreen';
import { DoctorLabOrderDispatchScreen } from './DoctorLabOrderDispatchScreen';
import { DoctorSpecialistReferralScreen } from './DoctorSpecialistReferralScreen';
import { AyushConsultationScreen } from './AyushConsultationScreen';
import { EHRTimelineScreen } from './EHRTimelineScreen';
import { MultiClinicSwitcherScreen } from './MultiClinicSwitcherScreen';
import '../../theme/workflows.css';

type ClinicianTab =
  | 'today'
  | 'consult'
  | 'eprescription'
  | 'inbox'
  | 'schedule'
  | 'followup'
  | 'lab-dispatch'
  | 'referral'
  | 'ayush'
  | 'ehr-timeline'
  | 'multi-clinic';

export function ClinicianWorkspaceHub() {
  const [activeTab, setActiveTab] = useState<ClinicianTab>('today');

  const tabs: { id: ClinicianTab; label: string; icon: React.ElementType }[] = [
    { id: 'today', label: "Today's Queue", icon: LayoutDashboard },
    { id: 'consult', label: 'Consult Room', icon: Stethoscope },
    { id: 'eprescription', label: 'E-Prescription', icon: FileCheck },
    { id: 'inbox', label: 'Clinical Inbox', icon: FileText },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'followup', label: 'Follow-ups', icon: Clock },
    { id: 'lab-dispatch', label: 'Lab Dispatch', icon: FlaskConical },
    { id: 'referral', label: 'Referrals', icon: UserCheck },
    { id: 'ayush', label: 'AYUSH Consult', icon: Compass },
    { id: 'ehr-timeline', label: 'EHR Timeline', icon: ClipboardList },
    { id: 'multi-clinic', label: 'Multi-Clinic', icon: Users },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'today':
        return <DoctorTodayScreen />;
      case 'consult':
        return <DoctorConsultRoomScreen />;
      case 'eprescription':
        return <NMCDoctorEPrescriptionScreen />;
      case 'inbox':
        return <DoctorClinicalInboxScreen />;
      case 'schedule':
        return <DoctorScheduleScreen />;
      case 'followup':
        return <DoctorFollowupTrackerScreen />;
      case 'lab-dispatch':
        return <DoctorLabOrderDispatchScreen />;
      case 'referral':
        return <DoctorSpecialistReferralScreen />;
      case 'ayush':
        return <AyushConsultationScreen />;
      case 'ehr-timeline':
        return <EHRTimelineScreen />;
      case 'multi-clinic':
        return <MultiClinicSwitcherScreen />;
      default:
        return <DoctorTodayScreen />;
    }
  };

  return (
    <div className="wf-clinician-hub">
      <div className="wf-panel-heading" style={{ marginBottom: 16 }}>
        <div>
          <span className="care-eyebrow">CLINICIAN WORKSPACE & NMC DESK</span>
          <h2>Doctor Practice & Patient Care Management.</h2>
          <p>Access consultations, e-prescriptions, clinical inboxes, and diagnostic decision support.</p>
        </div>
      </div>

      <nav
        className="wf-tab-bar"
        aria-label="Clinician workspace tabs"
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 20,
          borderBottom: '1px solid #e7d8ef',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              onClick={() => setActiveTab(tab.id)}
              className={`health-button ${isActive ? 'health-button-primary' : ''}`}
              style={{
                minHeight: 44,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                borderRadius: 10,
                cursor: 'pointer',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <main className="wf-tab-content">{renderTabContent()}</main>
    </div>
  );
}
