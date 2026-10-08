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
import { NotificationSettingsRoute } from '@/features/notifications/views/NotificationSettingsView';
import { LeaveCampusRoute } from '@/features/campus/views/LeaveCampusView';
import { DeleteAccountRoute } from '@/features/account/views/DeleteAccountView';
import { MyRequestsRoute, NewRequestRoute } from '@/features/requests/views/RequestsViews';
import { NativeSessionProvider, useNativeSession } from './session';
import { StudentHomeScreen } from './StudentHomeScreen';
import { SessionCheckingScreen } from './SessionCheckingScreen';
import { OfflineBanner } from '@/design-system';

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
  Home: undefined;
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
  NotificationSettings: undefined;
  LeaveCampus: undefined;
  DeleteAccount: undefined;
  MyRequests: undefined;
  ReturnRequest: undefined;
  HostelVisit: undefined;
  RefillRequest: undefined;
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
  const navigate = useNavigate();
  const { status } = useNativeSession();
  const signedIn = status === 'signedIn';
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <EmergencySosNativeView signedIn={signedIn} links={{ signIn: signedIn ? undefined : () => navigate('SignIn') }} />
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

function MyRequestsScreen() {
  const navigate = useNavigate();
  return <MyRequestsRoute links={{ newReturn: () => navigate('ReturnRequest'), newHostelVisit: () => navigate('HostelVisit'), newRefill: () => navigate('RefillRequest') }} />;
}

function ReturnRequestScreen() {
  const navigate = useNavigate();
  return <NewRequestRoute kind="RETURN" links={{ done: () => navigate('MyRequests') }} />;
}

function HostelVisitScreen() {
  const navigate = useNavigate();
  return <NewRequestRoute kind="HOSTEL_VISIT" links={{ done: () => navigate('MyRequests') }} />;
}

function RefillRequestScreen() {
  const navigate = useNavigate();
  return <NewRequestRoute kind="REFILL" links={{ done: () => navigate('MyRequests') }} />;
}

function DeleteAccountScreen() {
  return <DeleteAccountRoute links={{}} />;
}

function LeaveCampusScreen() {
  const navigate = useNavigate();
  return <LeaveCampusRoute links={{ openRecords: () => navigate('Vault') }} />;
}

/**
 * The stack is built from the server-confirmed session (see ./session).
 * Signed-in screens do not exist in the tree until the server says so, so no
 * navigate() call can reach them while signed out. Emergency help is in every
 * branch, including the check itself (DESIGN.md §2.4).
 */
function RootNavigator() {
  const session = useNativeSession();

  if (session.status === 'checking') return <SessionCheckingScreen />;

  const signedIn = session.status === 'signedIn' && session.user !== null;
  const isDoctor = session.user?.role === 'NMC_DOCTOR';

  return (
    <Stack.Navigator
      key={signedIn ? 'signed-in' : 'signed-out'}
      initialRouteName={signedIn ? 'Home' : 'Landing'}
      screenOptions={{ animation: 'none', headerTintColor: '#155e75' }}
    >
      {signedIn ? (
        <Stack.Group>
          <Stack.Screen name="Home" component={StudentHomeScreen} options={{ title: 'Studentkare' }} />
          <Stack.Screen name="Vault" component={VaultRoute} options={{ title: 'Health records' }} />
          <Stack.Screen name="Appointments" component={AppointmentsRoute} options={{ title: 'Appointments' }} />
          <Stack.Screen name="DigitalId" component={DigitalIdRoute} options={{ title: 'Health ID' }} />
          <Stack.Screen name="Checkout" component={CheckoutRoute} options={{ title: 'Checkout' }} />
          <Stack.Screen name="Teleconsult" component={TeleconsultRoute} options={{ title: 'Video consult' }} />
          <Stack.Screen name="LifeShare" component={LifeShareRoute} options={{ title: 'Care circle' }} />
          <Stack.Screen name="Claims" component={ClaimsRoute} options={{ title: 'Cover and claims' }} />
          <Stack.Screen name="AiChat" component={AiChatRoute} options={{ title: 'Ask Ayush' }} />
          <Stack.Screen name="Notifications" component={NotificationsRoute} options={{ title: 'Notifications' }} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsRoute} options={{ title: 'Notification settings' }} />
          <Stack.Screen name="LeaveCampus" component={LeaveCampusScreen} options={{ title: 'Leaving campus' }} />
          <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: 'Delete my account' }} />
          <Stack.Screen name="MyRequests" component={MyRequestsScreen} options={{ title: 'My requests' }} />
          <Stack.Screen name="ReturnRequest" component={ReturnRequestScreen} options={{ title: 'Return or refund' }} />
          <Stack.Screen name="HostelVisit" component={HostelVisitScreen} options={{ title: 'Hostel room visit' }} />
          <Stack.Screen name="RefillRequest" component={RefillRequestScreen} options={{ title: 'Refill a medicine' }} />
          <Stack.Screen name="Verify" component={IdentityVerifyScreen} options={{ title: 'Verify it’s you' }} />
          <Stack.Screen name="VerifyGate" component={VerifyGateScreen} options={{ title: 'Verification required' }} />
          <Stack.Screen name="Incidents" component={IncidentsRoute} options={{ title: 'Incident triage' }} />
          <Stack.Screen name="Scanners" component={ScannersRoute} options={{ title: 'Scanner' }} />
          {isDoctor ? <Stack.Screen name="ClinicianConsole" component={ClinicianConsoleRoute} options={{ title: 'Clinician console' }} /> : null}
        </Stack.Group>
      ) : (
        <Stack.Group>
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
          <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Sign in' }} />
          <Stack.Screen name="CreateAccount" component={CreateAccountScreen} options={{ title: 'Create account' }} />
        </Stack.Group>
      )}

      {/* Either way: help, the shop and public care information. */}
      <Stack.Group>
        <Stack.Screen name="Emergency" component={EmergencyRoute} options={{ title: 'Emergency SOS' }} />
        <Stack.Screen name="LostPhone" component={LostPhoneScreen} options={{ title: 'Lost your phone?' }} />
        <Stack.Screen name="Marketplace" component={MarketplaceRoute} options={{ title: 'Medicines and lab tests' }} />
        <Stack.Screen name="PreventiveCare" component={PreventiveCareScreen} options={{ title: 'Vaccine directory' }} />
        <Stack.Screen name="Camp" component={CampRoute} options={{ title: 'Camp · health check' }} />
      </Stack.Group>
    </Stack.Navigator>
  );
}

/** Says why the app is signed out when that was not the student's choice (network, expiry). */
function SignedOutNotice() {
  const { status, problem } = useNativeSession();
  if (status !== 'signedOut' || !problem) return null;
  return <OfflineBanner message={problem} />;
}

export default function NativeApp() {
  useAppFonts();

  useEffect(() => {
    void registerForPushNotificationsAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <AppStoresProvider>
        <NativeSessionProvider>
          <SignedOutNotice />
          <NavigationProvider>
            <RootNavigator />
          </NavigationProvider>
        </NativeSessionProvider>
      </AppStoresProvider>
    </SafeAreaProvider>
  );
}
