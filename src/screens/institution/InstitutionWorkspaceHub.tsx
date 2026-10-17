import React, { useState } from 'react';
import { Activity, AlertTriangle, Ambulance, BarChart3, Building, Calendar, CheckSquare, Droplets, FileCheck, ShieldAlert, UserCheck, Users, Utensils } from 'lucide-react';
import { CampusOverviewScreen } from './CampusOverviewScreen';
import { CampusSosDesk } from './CampusSosDesk';
import { CampusHealthInsightsScreen } from './CampusHealthInsightsScreen';
import { OutbreakIsolationDeskScreen } from './OutbreakIsolationDeskScreen';
import { CampusIncidentsDeskScreen } from './CampusIncidentsDeskScreen';
import { CampusHealthScorecardScreen } from './CampusHealthScorecardScreen';
import { StudentRosterScreen } from './StudentRosterScreen';
import { CampusVerificationPanel } from '../workspace/CampusVerificationPanel';
// The counsellor crisis queue is not a tab here: it shows students' names and
// contacts, so it lives on the counsellor's own home (/counsellor), not in every
// campus administrator's hub.
import { CampusAdminTeamScreen } from './CampusAdminTeamScreen';
import { MultiBlockConfigScreen } from './MultiBlockConfigScreen';
import { MedicalLeaveApprovalsScreen } from './MedicalLeaveApprovalsScreen';
import { HostelSanitaryAuditScreen } from './HostelSanitaryAuditScreen';
import { MessFoodPoisoningDeskScreen } from './MessFoodPoisoningDeskScreen';
import { WaterContaminationRadarScreen } from './WaterContaminationRadarScreen';
import { MealDietRestrictionsScreen } from './MealDietRestrictionsScreen';
import { AmbulanceDispatchTrackerScreen } from './AmbulanceDispatchTrackerScreen';
import { CampusHealthCampHostScreen } from './CampusHealthCampHostScreen';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/workflows.css';

type InstitutionTab =
  | 'sos'
  | 'overview'
  | 'insights'
  | 'isolation'
  | 'incidents'
  | 'scorecard'
  | 'roster'
  | 'verification'
  | 'team'
  | 'multiblock'
  | 'leave-approvals'
  | 'sanitary-audit'
  | 'mess-poisoning'
  | 'water-radar'
  | 'diet-restrictions'
  | 'ambulance'
  | 'camp-host';

export function InstitutionWorkspaceHub() {
  const t = useT();
  const [activeTab, setActiveTab] = useState<InstitutionTab>('sos');

  const tabs: { id: InstitutionTab; label: MessageKey; icon: React.ElementType }[] = [
    { id: 'sos', label: 'campus.hub.tab.sos', icon: ShieldAlert },
    { id: 'overview', label: 'campus.hub.tab.overview', icon: Building },
    { id: 'insights', label: 'campus.hub.tab.insights', icon: BarChart3 },
    { id: 'isolation', label: 'campus.hub.tab.isolation', icon: ShieldAlert },
    { id: 'incidents', label: 'campus.hub.tab.incidents', icon: AlertTriangle },
    { id: 'scorecard', label: 'campus.hub.tab.scorecard', icon: Activity },
    { id: 'roster', label: 'campus.hub.tab.roster', icon: Users },
    { id: 'verification', label: 'campus.hub.tab.verification', icon: UserCheck },
    { id: 'team', label: 'campus.hub.tab.team', icon: Users },
    { id: 'multiblock', label: 'campus.hub.tab.multiblock', icon: Building },
    { id: 'leave-approvals', label: 'campus.hub.tab.leaveApprovals', icon: FileCheck },
    { id: 'sanitary-audit', label: 'campus.hub.tab.sanitaryAudit', icon: CheckSquare },
    { id: 'mess-poisoning', label: 'campus.hub.tab.messPoisoning', icon: Utensils },
    { id: 'water-radar', label: 'campus.hub.tab.waterRadar', icon: Droplets },
    { id: 'diet-restrictions', label: 'campus.hub.tab.dietRestrictions', icon: Utensils },
    { id: 'ambulance', label: 'campus.hub.tab.ambulance', icon: Ambulance },
    { id: 'camp-host', label: 'campus.hub.tab.campHost', icon: Calendar },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'sos':
        return <CampusSosDesk />;
      case 'overview':
        return <CampusOverviewScreen />;
      case 'insights':
        return <CampusHealthInsightsScreen />;
      case 'isolation':
        return <OutbreakIsolationDeskScreen />;
      case 'incidents':
        return <CampusIncidentsDeskScreen />;
      case 'scorecard':
        return <CampusHealthScorecardScreen />;
      case 'roster':
        return <StudentRosterScreen />;
      case 'verification':
        return <CampusVerificationPanel />;
      case 'team':
        return <CampusAdminTeamScreen />;
      case 'multiblock':
        return <MultiBlockConfigScreen />;
      case 'leave-approvals':
        return <MedicalLeaveApprovalsScreen />;
      case 'sanitary-audit':
        return <HostelSanitaryAuditScreen />;
      case 'mess-poisoning':
        return <MessFoodPoisoningDeskScreen />;
      case 'water-radar':
        return <WaterContaminationRadarScreen />;
      case 'diet-restrictions':
        return <MealDietRestrictionsScreen />;
      case 'ambulance':
        return <AmbulanceDispatchTrackerScreen />;
      case 'camp-host':
        return <CampusHealthCampHostScreen />;
      default:
        return <CampusOverviewScreen />;
    }
  };

  return (
    <div className="wf-institution-hub">
      <div className="wf-panel-heading" style={{ marginBottom: 16 }}>
        <div>
          <span className="care-eyebrow">{t('campus.hub.eyebrow')}</span>
          <h2>{t('campus.hub.title')}</h2>
          <p>{t('campus.hub.lead')}</p>
        </div>
      </div>

      <nav
        className="wf-tab-bar"
        aria-label={t('campus.hub.navLabel')}
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
              role="tab"
              aria-selected={isActive}
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
