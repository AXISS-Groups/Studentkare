import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { color } from '@/design-system/theme';
import { PrivacyConsentView } from '@/features/privacy/PrivacyConsentView';
import { DataRightsView } from '@/features/privacy/DataRightsView';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { useNavigate } from './navigation';
import { useNativeWebAction } from './webActions';

/** Existing approved privacy boards; only the native action adapters live here. */
function PrivacyFrame({ children }: { children: React.ReactNode }) {
  return <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: color.canvas }}>{children}</SafeAreaView>;
}

/** Native registration approved 2026-11-01. Export and LifeShare explain their availability. */
export function PrivacyScreen() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const webAction = useNativeWebAction();
  return <PrivacyFrame><PrivacyConsentView links={{
    back: () => navigation.goBack(),
    delete: () => navigate('DeleteAccount'),
    emergencyCard: () => navigate('EmergencyCard'),
    shares: () => navigate('Vault', { tab: 'who' }),
    dataRights: () => navigate('DataRights'),
    export: () => webAction('export'),
    lifeshare: () => webAction('lifeshare'),
  }} /></PrivacyFrame>;
}

/** Existing data-rights design approved by Krishna Chintakayala 2026-10-24. */
export function DataRightsScreen() {
  const navigate = useNavigate();
  const webAction = useNativeWebAction();
  const resolve = (route: RoutePath) => {
    if (route === 'profile') return navigate('Profile');
    if (route === 'emergency-card') return navigate('EmergencyCard');
    if (route === 'delete-account') return navigate('DeleteAccount');
    if (route === 'privacy-consent') return navigate('Privacy');
    if (route === 'data-export') return webAction('export');
    if (route === 'support') return webAction('support');
    return webAction('lifeshare');
  };
  return <PrivacyFrame><DataRightsView onNavigate={resolve} /></PrivacyFrame>;
}
