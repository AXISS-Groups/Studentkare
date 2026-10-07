import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppStoresProvider, useStores } from '@/store/AppStores';
import { registerForPushNotificationsAsync } from './hardware/notifications';
import { NavigationProvider, useNavigate } from './navigation';
import PreventiveCareScreen from './PreventiveCareScreen';
import { CampScreen } from './CampScreen';
import {
  LandingCampusScreen,
  LandingClinicianScreen,
  LandingConsultScreen,
  LandingLabListScreen,
  LandingLabTestsScreen,
  LandingPartnershipsScreen,
  LandingPlansScreen,
  LandingProgramsScreen,
  LandingScreen,
  LandingWellnessScreen,
} from './LandingScreen';
import {
  CreateAccountScreen,
  GuardianConsentScreen,
  IdentityVerifyScreen,
  LostPhoneScreen,
  SignInScreen,
  VerifyGateScreen,
} from './AuthScreens';
import { HealthVaultNativeView } from '@/modules/m02-vault/view/HealthVaultNativeView';
import { EmergencySosNativeView } from '@/modules/m04-emergency/view/EmergencySosNativeView';
import { DigitalIdNativeView } from '@/modules/m03-digital_id/view/DigitalIdNativeView';
import { CartCheckoutNativeView } from '@/modules/m16-checkout/view/CartCheckoutNativeView';
import { AppointmentBookingNativeView } from '@/features/appointments/views/AppointmentBookingNativeView';
import { AppointmentBookingViewModel } from '@/features/appointments/viewmodel/AppointmentBookingViewModel';
import { MarketplaceNativeView } from '@/features/marketplace/views/MarketplaceNativeView';
import { MarketplaceViewModel } from '@/features/marketplace/viewmodel/MarketplaceViewModel';
import { TeleconsultNativeView } from '@/features/teleconsult/views/TeleconsultNativeView';
import { TeleconsultViewModel } from '@/features/teleconsult/viewmodel/TeleconsultViewModel';
import { IncidentTriageNativeView } from '@/features/incidents/views/IncidentTriageNativeView';
import { IncidentTriageViewModel } from '@/features/incidents/viewmodel/IncidentTriageViewModel';
import { MedicalScannerNativeView } from '@/features/scanners/views/MedicalScannerNativeView';
import { MedicalScannerViewModel } from '@/features/scanners/viewmodel/MedicalScannerViewModel';
import { LifeShareNativeView } from '@/features/lifeshare/views/LifeShareNativeView';
import { LifeShareViewModel } from '@/features/lifeshare/viewmodel/LifeShareViewModel';
import { ClaimsNativeView } from '@/features/claims/views/ClaimsNativeView';
import { ClaimsViewModel } from '@/features/claims/viewmodel/ClaimsViewModel';
import { ClinicianConsoleNativeView } from '@/features/clinician/views/ClinicianConsoleNativeView';
import { ClinicianViewModel } from '@/features/clinician/viewmodel/ClinicianViewModel';
import { AiChatNativeView } from '@/features/chat/views/AiChatNativeView';
import { ChatViewModel } from '@/features/chat/viewmodel/ChatViewModel';
import { NotificationNativeView } from '@/features/notifications/views/NotificationNativeView';
import { NotificationViewModel } from '@/features/notifications/viewmodel/NotificationViewModel';
import { useAppFonts } from './useAppFonts';

export type RootStackParamList = {
  Landing: undefined;
  Campuses: undefined;
  Clinicians: undefined;
  LabTests: undefined;
  Consult: undefined;
  Partnerships: undefined;
  Programs: undefined;
  Plans: undefined;
  Wellness: undefined;
  LabList: undefined;
  SignIn: undefined;
  CreateAccount: undefined;
  LostPhone: undefined;
  Verify: undefined;
  VerifyGate: undefined;
  GuardianConsent: undefined;
  Camp: undefined;
  PreventiveCare: undefined;
  Vault: undefined;
  Emergency: undefined;
  Appointments: undefined;
  DigitalId: undefined;
  Marketplace: undefined;
  Checkout: undefined;
  Teleconsult: undefined;
  Incidents: undefined;
  Scanners: undefined;
  LifeShare: undefined;
  Claims: undefined;
  ClinicianConsole: undefined;
  AiChat: undefined;
  Notifications: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function CampRoute() {
  const navigate = useNavigate();
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <CampScreen onOpenProviders={() => navigate('PreventiveCare')} />
    </SafeAreaView>
  );
}

function VaultRoute() {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <HealthVaultNativeView />
    </SafeAreaView>
  );
}

function EmergencyRoute() {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <EmergencySosNativeView />
    </SafeAreaView>
  );
}

function DigitalIdRoute() {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <DigitalIdNativeView />
    </SafeAreaView>
  );
}

function AppointmentsRoute() {
  const [vm] = useState(() => new AppointmentBookingViewModel());
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <AppointmentBookingNativeView viewModel={vm} />
    </SafeAreaView>
  );
}

function MarketplaceRoute() {
  const [vm] = useState(() => new MarketplaceViewModel());
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <MarketplaceNativeView viewModel={vm} />
    </SafeAreaView>
  );
}

function CheckoutRoute() {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <CartCheckoutNativeView />
    </SafeAreaView>
  );
}

function TeleconsultRoute() {
  const [vm] = useState(() => new TeleconsultViewModel());
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <TeleconsultNativeView viewModel={vm} />
    </SafeAreaView>
  );
}

function IncidentsRoute() {
  const [vm] = useState(() => new IncidentTriageViewModel());
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <IncidentTriageNativeView viewModel={vm} />
    </SafeAreaView>
  );
}

function ScannersRoute() {
  const [vm] = useState(() => new MedicalScannerViewModel());
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <MedicalScannerNativeView viewModel={vm} />
    </SafeAreaView>
  );
}

function LifeShareRoute() {
  const [vm] = useState(() => new LifeShareViewModel());
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <LifeShareNativeView viewModel={vm} />
    </SafeAreaView>
  );
}

function ClaimsRoute() {
  const stores = useStores();
  const [vm] = useState(() => new ClaimsViewModel(stores.claims));
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <ClaimsNativeView viewModel={vm} />
    </SafeAreaView>
  );
}

function ClinicianConsoleRoute() {
  const stores = useStores();
  const [vm] = useState(() => new ClinicianViewModel(stores.clinician));
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <ClinicianConsoleNativeView viewModel={vm} />
    </SafeAreaView>
  );
}

function AiChatRoute() {
  const stores = useStores();
  const [vm] = useState(() => new ChatViewModel(stores.chat));
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <AiChatNativeView viewModel={vm} />
    </SafeAreaView>
  );
}

function NotificationsRoute() {
  const [vm] = useState(() => new NotificationViewModel());
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <NotificationNativeView viewModel={vm} />
    </SafeAreaView>
  );
}

export default function NativeApp() {
  useAppFonts();

  useEffect(() => {
    void registerForPushNotificationsAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <AppStoresProvider>
        <NavigationProvider>
          <Stack.Navigator
            initialRouteName="Landing"
            screenOptions={{ animation: 'none', headerTintColor: '#155e75' }}
          >
            {/* Public Landing Surfaces */}
            <Stack.Screen name="Landing" component={LandingScreen} options={{ title: 'Studentkare' }} />
            <Stack.Screen name="Campuses" component={LandingCampusScreen} options={{ title: 'For campuses' }} />
            <Stack.Screen name="Clinicians" component={LandingClinicianScreen} options={{ title: 'For clinicians' }} />
            <Stack.Screen name="LabTests" component={LandingLabTestsScreen} options={{ title: 'Lab tests' }} />
            <Stack.Screen name="Consult" component={LandingConsultScreen} options={{ title: 'Consult a doctor' }} />
            <Stack.Screen name="Partnerships" component={LandingPartnershipsScreen} options={{ title: 'Partnerships' }} />
            <Stack.Screen name="Programs" component={LandingProgramsScreen} options={{ title: 'Care programmes' }} />
            <Stack.Screen name="Plans" component={LandingPlansScreen} options={{ title: 'Plans & pricing' }} />
            <Stack.Screen name="Wellness" component={LandingWellnessScreen} options={{ title: 'Wellness training' }} />
            <Stack.Screen name="LabList" component={LandingLabListScreen} options={{ title: 'Lab panels' }} />

            {/* Authentication & Security Surfaces */}
            <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Sign in' }} />
            <Stack.Screen name="CreateAccount" component={CreateAccountScreen} options={{ title: 'Create account' }} />
            <Stack.Screen name="LostPhone" component={LostPhoneScreen} options={{ title: 'Lost phone recovery' }} />
            <Stack.Screen name="Verify" component={IdentityVerifyScreen} options={{ title: 'Identity verification' }} />
            <Stack.Screen name="VerifyGate" component={VerifyGateScreen} options={{ title: 'Verification gate' }} />
            <Stack.Screen name="GuardianConsent" component={GuardianConsentScreen} options={{ title: 'Guardian consent' }} />

            {/* Core Clinical & Student Features */}
            <Stack.Screen name="Camp" component={CampRoute} options={{ title: 'Camp · health check' }} />
            <Stack.Screen name="PreventiveCare" component={PreventiveCareScreen} options={{ title: 'Vaccine directory' }} />
            <Stack.Screen name="Vault" component={VaultRoute} options={{ title: 'Health Vault' }} />
            <Stack.Screen name="Emergency" component={EmergencyRoute} options={{ title: 'Emergency SOS' }} />
            <Stack.Screen name="Appointments" component={AppointmentsRoute} options={{ title: 'Book appointment' }} />
            <Stack.Screen name="DigitalId" component={DigitalIdRoute} options={{ title: 'Health ID' }} />
            <Stack.Screen name="Marketplace" component={MarketplaceRoute} options={{ title: 'Marketplace' }} />
            <Stack.Screen name="Checkout" component={CheckoutRoute} options={{ title: 'Checkout' }} />
            <Stack.Screen name="Teleconsult" component={TeleconsultRoute} options={{ title: 'Teleconsultation' }} />
            <Stack.Screen name="Incidents" component={IncidentsRoute} options={{ title: 'Incident triage' }} />
            <Stack.Screen name="Scanners" component={ScannersRoute} options={{ title: 'AI Scanner' }} />
            <Stack.Screen name="LifeShare" component={LifeShareRoute} options={{ title: 'LifeShare' }} />
            <Stack.Screen name="Claims" component={ClaimsRoute} options={{ title: 'Insurance claims' }} />
            <Stack.Screen name="ClinicianConsole" component={ClinicianConsoleRoute} options={{ title: 'Clinician console' }} />
            <Stack.Screen name="AiChat" component={AiChatRoute} options={{ title: 'AI Triage chat' }} />
            <Stack.Screen name="Notifications" component={NotificationsRoute} options={{ title: 'Activity notifications' }} />
          </Stack.Navigator>
        </NavigationProvider>
      </AppStoresProvider>
    </SafeAreaProvider>
  );
}
