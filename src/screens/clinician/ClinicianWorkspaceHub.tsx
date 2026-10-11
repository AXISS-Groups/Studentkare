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
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
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

  const t = useT();
  const tabs: { id: ClinicianTab; label: MessageKey; icon: React.ElementType }[] = [
    { id: 'today', label: 'partner.clin.hub.tab.today', icon: LayoutDashboard },
    { id: 'consult', label: 'partner.clin.hub.tab.consult', icon: Stethoscope },
    { id: 'eprescription', label: 'partner.clin.hub.tab.eprescription', icon: FileCheck },
    { id: 'inbox', label: 'partner.clin.hub.tab.inbox', icon: FileText },
    { id: 'schedule', label: 'partner.clin.hub.tab.schedule', icon: Calendar },
    { id: 'followup', label: 'partner.clin.hub.tab.followup', icon: Clock },
    { id: 'lab-dispatch', label: 'partner.clin.hub.tab.labDispatch', icon: FlaskConical },
    { id: 'referral', label: 'partner.clin.hub.tab.referral', icon: UserCheck },
    { id: 'ayush', label: 'partner.clin.hub.tab.ayush', icon: Compass },
    { id: 'ehr-timeline', label: 'partner.clin.hub.tab.ehrTimeline', icon: ClipboardList },
    { id: 'multi-clinic', label: 'partner.clin.hub.tab.multiClinic', icon: Users },
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
          <span className="care-eyebrow">{t('partner.clin.hub.eyebrow')}</span>
          <h2>{t('partner.clin.hub.title')}</h2>
          <p>{t('partner.clin.hub.intro')}</p>
        </div>
      </div>

      <nav
        className="wf-tab-bar"
        aria-label={t('partner.clin.hub.tabsLabel')}
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 8,
          marginBottom: 20,
          borderBottom: '1px solid var(--sk-color-rule)',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
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
              <Icon size={16} aria-hidden="true" />
              {t(tab.label)}
            </button>
          );
        })}
      </nav>

      <main className="wf-tab-content">{renderTabContent()}</main>
    </div>
  );
}
