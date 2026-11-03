import React, { useState, useEffect } from 'react';
import { GraduationCap, IdCard, MessageCircle, Package, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../../data/contexts/AuthContext';
import type { MemberProfile } from '../../data/types/workflowTypes';
import { useApiResource } from '../../hooks/api/useApiResource';
import { DataState } from '../../components/interface/WorkflowUI';
import { BillingPanel } from '../billing/BillingPanel';
import { DigitalIdPanel } from './DigitalIdPanel';
import { CampusVerificationPanel } from './CampusVerificationPanel';
import { InsurancePanel, OrdersPanel, SupportPanel } from './MemberPanels';
import { ProfileForm } from '@/features/m2profile/views/ProfileForm';
import { useT } from '@/i18n';
import '@/design-system/styles/member-profile.css';

type ProfileTab = 'profile' | 'plan' | 'digital-id' | 'insurance' | 'orders' | 'campus' | 'support';

export function MemberProfilePanel({ initialTab = 'profile' }: { initialTab?: 'profile' | 'plan' | 'digital-id' | 'insurance' }) {
  const t = useT();
  const { user: account } = useAuth();
  const isStudent = account?.role === 'STUDENT';
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const resource = useApiResource<MemberProfile>('/profile');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return <>
    <div className="wf-panel-heading">
      <div>
        <span className="care-eyebrow">{t('member.profile.eyebrow')}</span>
        <h2>{t('member.profile.title')}</h2>
        <p>{t('member.profile.body')}</p>
      </div>
    </div>

    {/* Unified Tab Bar */}
    <div className="wf-choice-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBlock: '8px 24px' }}>
      <button
        type="button"
        className={`health-button ${activeTab === 'profile' ? 'health-button-primary' : ''}`}
        aria-pressed={activeTab === 'profile'}
        onClick={() => setActiveTab('profile')}
      >
        <UserRound size={16} aria-hidden="true" /> {t('member.profile.tabPersonal')}
      </button>

      <button
        type="button"
        className={`health-button ${activeTab === 'plan' ? 'health-button-primary' : ''}`}
        aria-pressed={activeTab === 'plan'}
        onClick={() => setActiveTab('plan')}
      >
        <ShieldCheck size={16} aria-hidden="true" /> {t('member.profile.tabPlan')}
      </button>

      <button
        type="button"
        className={`health-button ${activeTab === 'digital-id' ? 'health-button-primary' : ''}`}
        aria-pressed={activeTab === 'digital-id'}
        onClick={() => setActiveTab('digital-id')}
      >
        <IdCard size={16} aria-hidden="true" /> {t('member.profile.tabDigitalId')}
      </button>

      <button
        type="button"
        className={`health-button ${activeTab === 'insurance' ? 'health-button-primary' : ''}`}
        aria-pressed={activeTab === 'insurance'}
        onClick={() => setActiveTab('insurance')}
      >
        <ShieldCheck size={16} aria-hidden="true" /> {t('member.profile.tabInsurance')}
      </button>

      {isStudent && <>
        <button
          type="button"
          className={`health-button ${activeTab === 'orders' ? 'health-button-primary' : ''}`}
          aria-pressed={activeTab === 'orders'}
          onClick={() => setActiveTab('orders')}
        >
          <Package size={16} aria-hidden="true" /> {t('member.profile.tabOrders')}
        </button>

        <button
          type="button"
          className={`health-button ${activeTab === 'campus' ? 'health-button-primary' : ''}`}
          aria-pressed={activeTab === 'campus'}
          onClick={() => setActiveTab('campus')}
        >
          <GraduationCap size={16} aria-hidden="true" /> {t('member.profile.tabCampus')}
        </button>

        <button
          type="button"
          className={`health-button ${activeTab === 'support' ? 'health-button-primary' : ''}`}
          aria-pressed={activeTab === 'support'}
          onClick={() => setActiveTab('support')}
        >
          <MessageCircle size={16} aria-hidden="true" /> {t('member.profile.tabSupport')}
        </button>
      </>}
    </div>

    {activeTab === 'profile' && (
      <DataState {...resource} retry={resource.reload}>
        {resource.data && <ProfileForm initial={resource.data} onOpenDigitalId={() => setActiveTab('digital-id')} />}
      </DataState>
    )}

    {activeTab === 'plan' && <BillingPanel />}
    {activeTab === 'digital-id' && <DigitalIdPanel />}
    {activeTab === 'insurance' && <InsurancePanel />}
    {isStudent && activeTab === 'orders' && <OrdersPanel />}
    {isStudent && activeTab === 'campus' && <CampusVerificationPanel />}
    {isStudent && activeTab === 'support' && <SupportPanel />}
  </>;
}
