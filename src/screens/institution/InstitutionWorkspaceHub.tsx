import React, { useState } from 'react';
import { Activity, AlertTriangle, Ambulance, BarChart3, Building, Calendar, CheckSquare, Droplets, FileCheck, ShieldAlert, Sparkles, UserCheck, Users, Utensils } from 'lucide-react';
import { CampusOverviewScreen } from './CampusOverviewScreen';
import { CampusHealthInsightsScreen } from './CampusHealthInsightsScreen';
import { OutbreakIsolationDeskScreen } from './OutbreakIsolationDeskScreen';
import { CampusIncidentsDeskScreen } from './CampusIncidentsDeskScreen';
import { CampusHealthScorecardScreen } from './CampusHealthScorecardScreen';
import { StudentRosterScreen } from './StudentRosterScreen';
import { CampusVerificationPanel } from '../workspace/CampusVerificationPanel';
import { CounsellorQueueScreen } from './CounsellorQueueScreen';
import { CampusAdminTeamScreen } from './CampusAdminTeamScreen';
import { MultiBlockConfigScreen } from './MultiBlockConfigScreen';
import { MedicalLeaveApprovalsScreen } from './MedicalLeaveApprovalsScreen';
import { HostelSanitaryAuditScreen } from './HostelSanitaryAuditScreen';
import { MessFoodPoisoningDeskScreen } from './MessFoodPoisoningDeskScreen';
import { WaterContaminationRadarScreen } from './WaterContaminationRadarScreen';
import { MealDietRestrictionsScreen } from './MealDietRestrictionsScreen';
import { AmbulanceDispatchTrackerScreen } from './AmbulanceDispatchTrackerScreen';
import { CampusHealthCampHostScreen } from './CampusHealthCampHostScreen';
import '../../theme/workflows.css';

type InstitutionTab =
  | 'overview'
  | 'insights'
  | 'isolation'
  | 'incidents'
  | 'scorecard'
  | 'roster'
  | 'verification'
  | 'counsellor'
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
  const [activeTab, setActiveTab] = useState<InstitutionTab>('overview');

  const tabs: { id: InstitutionTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Campus Overview', icon: Building },
    { id: 'insights', label: 'Health Insights', icon: BarChart3 },
    { id: 'isolation', label: 'Isolation Desk', icon: ShieldAlert },
    { id: 'incidents', label: 'Incidents Desk', icon: AlertTriangle },
    { id: 'scorecard', label: 'Scorecard', icon: Activity },
    { id: 'roster', label: 'Student Roster', icon: Users },
    { id: 'verification', label: 'Verification Queue', icon: UserCheck },
    { id: 'counsellor', label: 'Counsellors', icon: Sparkles },
    { id: 'team', label: 'Admin Team', icon: Users },
    { id: 'multiblock', label: 'Multi-Block Config', icon: Building },
    { id: 'leave-approvals', label: 'Medical Leaves', icon: FileCheck },
    { id: 'sanitary-audit', label: 'Sanitary Audit', icon: CheckSquare },
    { id: 'mess-poisoning', label: 'Mess Safety', icon: Utensils },
    { id: 'water-radar', label: 'Water Radar', icon: Droplets },
    { id: 'diet-restrictions', label: 'Diet Restrictions', icon: Utensils },
    { id: 'ambulance', label: 'Ambulance Dispatch', icon: Ambulance },
    { id: 'camp-host', label: 'Health Camps', icon: Calendar },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
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
      case 'counsellor':
        return <CounsellorQueueScreen />;
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
          <span className="care-eyebrow">INSTITUTION HEALTH OPERATIONS</span>
          <h2>Campus & Hostel Health Management.</h2>
          <p>Monitor campus outbreaks, student rosters, medical leaves, sanitary audits, and emergency dispatch.</p>
        </div>
      </div>

      <nav
        className="wf-tab-bar"
        aria-label="Institution workspace tabs"
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
