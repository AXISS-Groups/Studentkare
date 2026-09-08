import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../theme/theme';
import { useAppStore } from '../data/store';
import { Header } from '../components/Header';
import { AIChatModal } from '../components/AIChatModal';
import { UserRoleTourGuide } from '../components/UserRoleTourGuide';
import { HeroBannerLayout } from '../components/HeroBannerLayout';
import { HdfcStyleConfirmationCard } from '../components/HdfcStyleConfirmationCard';
import { UserAccessibilityCustomizer } from '../components/UserAccessibilityCustomizer';

// Screen Imports
import { LandingPageScreen } from '../screens/landing/LandingPageScreen';
import { Flow01SignupScreen } from '../screens/auth/Flow01SignupScreen';
import { Flow02AddRecordScreen } from '../screens/vault/Flow02AddRecordScreen';
import { VaultTimelineScreen } from '../screens/vault/VaultTimelineScreen';
import { Flow03LoginScreen } from '../screens/auth/Flow03LoginScreen';
import { Flow04ProfileScreen } from '../screens/profile/Flow04ProfileScreen';
import { Flow05CampDayScreen } from '../screens/camp/Flow05CampDayScreen';
import { Flow06EmergencyScreen } from '../screens/emergency/Flow06EmergencyScreen';
import { Flow07BookCareScreen } from '../screens/care/Flow07BookCareScreen';
import { Flow08ClinicianConsoleScreen } from '../screens/clinician/Flow08ClinicianConsoleScreen';
import { Flow09PointsOffersScreen } from '../screens/rewards/Flow09PointsOffersScreen';
import { Flow10LearnScreen } from '../screens/learn/Flow10LearnScreen';
import { Flow11InstitutionConsoleScreen } from '../screens/institution/Flow11InstitutionConsoleScreen';
import { Flow12CommunityScreen } from '../screens/community/Flow12CommunityScreen';

import { M19ProviderRegistryScreen } from '../screens/fabric/M19ProviderRegistryScreen';
import { M20OrchestratorScreen } from '../screens/fabric/M20OrchestratorScreen';
import { M21PartnerOpsScreen } from '../screens/fabric/M21PartnerOpsScreen';

import { M22ClaimIntakeScreen } from '../screens/claims/M22ClaimIntakeScreen';
import { M23AdjudicationScreen } from '../screens/claims/M23AdjudicationScreen';
import { M24DecisionPackageScreen } from '../screens/claims/M24DecisionPackageScreen';
import { M25ExchangeConnectorScreen } from '../screens/claims/M25ExchangeConnectorScreen';

import {
  Smartphone,
  Monitor,
  HeartPulse,
  FolderLock,
  Activity,
  Stethoscope,
  Building2,
} from 'lucide-react';

import { StudentDashboardScreen } from '../screens/dashboard/StudentDashboardScreen';

export type ScreenRoute =
  | 'landing'
  | 'dashboard'
  | 'flow-01'
  | 'flow-02'
  | 'vault'
  | 'flow-03'
  | 'flow-04'
  | 'flow-05'
  | 'flow-06'
  | 'flow-07'
  | 'flow-08'
  | 'flow-09'
  | 'flow-10'
  | 'flow-11'
  | 'flow-12'
  | 'fabric-m19'
  | 'fabric-m20'
  | 'fabric-m21'
  | 'claims-m22'
  | 'claims-m23'
  | 'claims-m24'
  | 'claims-m25'
  | 'super-admin'
  | 'hdfc-hero';

export const AppNavigator: React.FC = () => {
  const { tokens, isDark, radius } = useTheme();
  const { emergencyActive } = useAppStore();

  const [currentRoute, setCurrentRoute] = useState<ScreenRoute>('landing');
  const [viewportMode, setViewportMode] = useState<'DESKTOP_WEB' | 'MOBILE_375'>('DESKTOP_WEB');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const renderActiveScreen = () => {
    switch (currentRoute) {
      case 'landing':
        return <LandingPageScreen onNavigate={(r) => setCurrentRoute(r as ScreenRoute)} />;
      case 'dashboard':
        return (
          <StudentDashboardScreen
            onLogout={() => setCurrentRoute('landing')}
            onOpenAI={() => setIsAiModalOpen(true)}
          />
        );
      case 'flow-01':
        return <Flow01SignupScreen onComplete={() => setCurrentRoute('dashboard')} />;
      case 'flow-02':
        return <Flow02AddRecordScreen onRecordSaved={() => setCurrentRoute('vault')} />;
      case 'vault':
        return <VaultTimelineScreen onAddNew={() => setCurrentRoute('flow-02')} />;
      case 'flow-03':
        return <Flow03LoginScreen onLoginSuccess={() => setCurrentRoute('dashboard')} />;
      case 'flow-04':
        return <Flow04ProfileScreen />;
      case 'flow-05':
        return <Flow05CampDayScreen />;
      case 'flow-06':
        return <Flow06EmergencyScreen />;
      case 'flow-07':
        return <Flow07BookCareScreen />;
      case 'flow-08':
        return <Flow08ClinicianConsoleScreen />;
      case 'flow-09':
        return <Flow09PointsOffersScreen />;
      case 'flow-10':
        return <Flow10LearnScreen />;
      case 'flow-11':
        return <Flow11InstitutionConsoleScreen />;
      case 'flow-12':
        return <Flow12CommunityScreen />;
      case 'fabric-m19':
        return <M19ProviderRegistryScreen />;
      case 'fabric-m20':
        return <M20OrchestratorScreen />;
      case 'fabric-m21':
        return <M21PartnerOpsScreen />;
      case 'claims-m22':
        return <M22ClaimIntakeScreen />;
      case 'claims-m23':
        return <M23AdjudicationScreen />;
      case 'claims-m24':
        return <M24DecisionPackageScreen />;
      case 'claims-m25':
        return <M25ExchangeConnectorScreen />;
            case 'hdfc-hero':
        return (
          <HeroBannerLayout title="Add Payee" subtitle="" onBack={() => setCurrentRoute('dashboard')}>
            <HdfcStyleConfirmationCard
              title="Payee Added"
              subtitle="You can transfer funds to this payee after 30 minutes."
              payeeName="Nikita Naresh"
              accountNumber="**** **** 4292"
              accountName="NIKITA NARESH KHANNA"
              bankDetails="ICICI BANK LIMITED"
              ifscCode="ICIC0004374"
              confirmationNotice="You'll receive a confirmation shortly via WhatsApp, SMS, and email."
              onPrimaryAction={() => setCurrentRoute('dashboard')}
              onSecondaryAction={() => setCurrentRoute('hdfc-hero')}
              onTertiaryAction={() => setCurrentRoute('flow-09')}
            />
          </HeroBannerLayout>
        );

      default:
        return <LandingPageScreen onNavigate={(r) => setCurrentRoute(r as ScreenRoute)} />;
    }
  };

  const navCategories = [
    {
      group: 'Core Student Flows',
      items: [
        { route: 'landing', label: 'Marketing Portal' },
        { route: 'dashboard', label: 'Student Portal Dashboard' },
        { route: 'flow-01', label: 'Flow 01: Signup & KYC' },
        { route: 'vault', label: 'M2: Records Vault' },
        { route: 'flow-02', label: 'Flow 02: Add & OCR' },
        { route: 'flow-03', label: 'Flow 03: ABDM Login' },
        { route: 'flow-04', label: 'Flow 04: Profile & DPDP' },
        { route: 'flow-05', label: 'Flow 05: Camp Day' },
        { route: 'flow-06', label: 'Flow 06: 108 SOS' },
        { route: 'flow-07', label: 'Flow 07: Book Care' },
        { route: 'flow-09', label: 'Flow 09: Points & Streaks' },
        { route: 'flow-10', label: 'Flow 10: Learn Library' },
        { route: 'flow-12', label: 'Flow 12: Community' },
      ],
    },
    {
      group: 'Enterprise Consoles',
      items: [
        { route: 'flow-08', label: 'M18 Clinician EMR' },
        { route: 'flow-11', label: 'M15 Institution Admin' },
      ],
    },
    {
      group: 'Vertical C: Services Fabric',
      items: [
        { route: 'fabric-m19', label: 'M19 Provider Network' },
        { route: 'fabric-m20', label: 'M20 Fulfilment Orchestrator' },
        { route: 'fabric-m21', label: 'M21 Partner API & Widget' },
      ],
    },
    {
      group: 'Vertical D: Claims Intelligence',
      items: [
        { route: 'claims-m22', label: 'M22 Bill Intake & OCR' },
        { route: 'claims-m23', label: 'M23 Adjudication Rules' },
        { route: 'claims-m24', label: 'M24 Decision Package & FWA' },
        { route: 'claims-m25', label: 'M25 OpenHCX Exchange' },
      ],
    },
  ];

  return (
    <View style={[styles.rootContainer, { backgroundColor: tokens.canvas }]}>
      {/* Top Header */}
      <Header
        onOpenAI={() => setIsAiModalOpen(true)}
        onOpenEmergency={() => setCurrentRoute('flow-06')}
        onSelectFlow={(f) => setCurrentRoute(f as ScreenRoute)}
      />

      {/* Navigation & Viewport Mode Toolbar */}
      <View
        style={[
          styles.navBar,
          {
            backgroundColor: tokens.surface2,
            borderBottomColor: tokens.ruleSoft,
          },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navScroll}>
          {navCategories.map((cat, cIdx) => (
            <View key={cIdx} style={styles.navGroup}>
              <Text style={[styles.groupLabel, { color: tokens.text3 }]}>{cat.group}:</Text>
              {cat.items.map((item) => {
                const active = currentRoute === item.route;
                return (
                  <TouchableOpacity
                    key={item.route}
                    onPress={() => setCurrentRoute(item.route as ScreenRoute)}
                    style={[
                      styles.routePill,
                      {
                        backgroundColor: active ? tokens.action : tokens.surface,
                        borderColor: active ? tokens.action : tokens.rule,
                        borderRadius: radius.full,
                        boxShadow: active ? '0 2px 8px rgba(82, 79, 217, 0.35)' : 'none',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.routePillText,
                        { color: active ? '#ffffff' : tokens.text, fontWeight: active ? '700' : '500' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Viewport Switcher */}
        <View style={[styles.viewportSwitcher, { backgroundColor: tokens.surface, borderColor: tokens.rule, borderRadius: radius.full }]}>
          <TouchableOpacity
            onPress={() => setViewportMode('DESKTOP_WEB')}
            style={[
              styles.vpBtn,
              { borderRadius: radius.full },
              viewportMode === 'DESKTOP_WEB' && {
                backgroundColor: tokens.action,
              },
            ]}
          >
            <Monitor size={13} color={viewportMode === 'DESKTOP_WEB' ? '#ffffff' : tokens.text2} />
            <Text
              style={[
                styles.vpText,
                { color: viewportMode === 'DESKTOP_WEB' ? '#ffffff' : tokens.text2 },
              ]}
            >
              Desktop Web
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewportMode('MOBILE_375')}
            style={[
              styles.vpBtn,
              { borderRadius: radius.full },
              viewportMode === 'MOBILE_375' && {
                backgroundColor: tokens.action,
              },
            ]}
          >
            <Smartphone size={13} color={viewportMode === 'MOBILE_375' ? '#ffffff' : tokens.text2} />
            <Text
              style={[
                styles.vpText,
                { color: viewportMode === 'MOBILE_375' ? '#ffffff' : tokens.text2 },
              ]}
            >
              Mobile (375×812)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Render Canvas */}
      <View style={styles.canvasArea}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <UserAccessibilityCustomizer />
          <UserRoleTourGuide onNavigateRoute={(r) => setCurrentRoute(r as ScreenRoute)} />
        </View>

        {viewportMode === 'DESKTOP_WEB' ? (
          <View style={styles.desktopFrame}>
            <HeroBannerLayout
              title={
                currentRoute === "dashboard" ? "Student Health & ABDM Portal" :
                currentRoute === "vault" ? "Digital Health Vault & Timeline" :
                currentRoute === "flow-06" ? "108 SOS Lockscreen Emergency Pass" :
                currentRoute === "flow-07" ? "Campus OPD Clinic & Wait Time Radar" :
                currentRoute === "flow-08" ? "NMC Physician OPD Console & E-Prescription" :
                currentRoute === "claims-m23" ? "Drools Claims Adjudication & Pre-Auth" :
                currentRoute === "super-admin" ? "Super Admin Control Plane & AI Operations D1-D9" :
                "Studentkare Enterprise Health Portal"
              }
              subtitle="Ayushman Bharat Digital Mission (ABDM) & DPDP Act 2023 Compliant Platform"
              currentRoute={currentRoute}
              onNavigateRoute={(r) => setCurrentRoute(r as ScreenRoute)}
            >
              {renderActiveScreen()}
            </HeroBannerLayout>
          </View>
        ) : (
          <View style={styles.mobileWrapper}>
            {/* Mobile Device Mockup Frame */}
            <View
              style={[
                styles.mobileFrame,
                {
                  backgroundColor: tokens.canvas,
                  borderColor: isDark ? tokens.veil : '#232269',
                  borderRadius: radius.r3xl2,
                  boxShadow: '0 20px 60px rgba(22, 22, 92, 0.25)',
                },
              ]}
            >
              {/* Mobile Notch / Status Bar */}
              <View style={[styles.mobileStatusBar, { backgroundColor: tokens.ink }]}>
                <Text style={styles.statusTime}>9:41</Text>
                <View style={styles.notchPill} />
                <Text style={styles.statusIcons}>5G ▮▮▮ 100%</Text>
              </View>

              <View style={{ flex: 1 }}>{renderActiveScreen()}</View>

              {/* Mobile Bottom Tab Bar */}
              <View
                style={[
                  styles.mobileTabBar,
                  {
                    backgroundColor: tokens.surface,
                    borderTopColor: tokens.ruleSoft,
                  },
                ]}
              >
                {[
                  { route: 'vault', label: 'Vault', icon: FolderLock },
                  { route: 'flow-05', label: 'Camp', icon: Activity },
                  { route: 'flow-06', label: '108 SOS', icon: HeartPulse, isEmergency: true },
                  { route: 'flow-07', label: 'Care', icon: Stethoscope },
                  { route: 'flow-04', label: 'Profile', icon: Building2 },
                ].map((tab) => {
                  const IconComp = tab.icon;
                  const active = currentRoute === tab.route;
                  return (
                    <TouchableOpacity
                      key={tab.route}
                      onPress={() => setCurrentRoute(tab.route as ScreenRoute)}
                      style={styles.mobileTabItem}
                    >
                      <IconComp
                        size={18}
                        color={
                          tab.isEmergency
                            ? tokens.emergency
                            : active
                            ? tokens.action
                            : tokens.text3
                        }
                      />
                      <Text
                        style={[
                          styles.mobileTabLabel,
                          {
                            color: tab.isEmergency
                              ? tokens.emergency
                              : active
                              ? tokens.action
                              : tokens.text3,
                            fontWeight: active ? '700' : '500',
                          },
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* AI Care Copilot Modal */}
      <AIChatModal
        visible={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onNavigateRoute={(r) => setCurrentRoute(r as ScreenRoute)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  },
  navBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 40,
  },
  navScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingRight: 16,
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 2,
  },
  routePill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  routePillText: {
    fontSize: 12,
  },
  viewportSwitcher: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  vpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  vpText: {
    fontSize: 11,
    fontWeight: '600',
  },
  canvasArea: {
    flex: 1,
    overflow: 'hidden',
  },
  desktopFrame: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mobileWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  mobileFrame: {
    width: 375,
    height: 760,
    borderWidth: 8,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  mobileStatusBar: {
    height: 38,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusTime: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  notchPill: {
    width: 70,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10104a',
  },
  statusIcons: {
    color: '#b1a6f6',
    fontSize: 10,
    fontWeight: '600',
  },
  mobileTabBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
  },
  mobileTabItem: {
    alignItems: 'center',
    gap: 2,
  },
  mobileTabLabel: {
    fontSize: 10,
  },
});
