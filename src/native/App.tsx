import React, { useEffect, useState } from 'react';
import { LanguageProvider } from '@/i18n';
import { color } from '@/design-system/theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppStoresProvider } from '@/store/AppStores';
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
import { HealthVaultRoute } from '@/features/vault/views/HealthVaultNativeView';
import { EmergencySosNativeView } from '@/modules/m04-emergency/view/EmergencySosNativeView';
import { DigitalIdRoute as DigitalIdScreen } from '@/features/digital_id/views/DigitalIdNativeView';
import { CartCheckoutNativeView } from '@/modules/m16-checkout/view/CartCheckoutNativeView';
import { AppointmentBookingNativeView } from '@/features/appointments/views/AppointmentBookingNativeView';
import { AppointmentBookingViewModel } from '@/features/appointments/viewmodel/AppointmentBookingViewModel';
import { ShopRoute } from '@/features/marketplace/views/ShopNativeView';
import { TeleconsultNativeView } from '@/features/teleconsult/views/TeleconsultNativeView';
import { ClinicianConsoleNativeView } from '@/features/clinician/views/ClinicianConsoleNativeView';
import { AyushChatRoute } from '@/features/chat/views/AyushChatNativeView';
import { NotificationNativeView } from '@/features/notifications/views/NotificationNativeView';
import { NotificationViewModel } from '@/features/notifications/viewmodel/NotificationViewModel';
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
      <HealthVaultRoute />
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
      <DigitalIdScreen />
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
  const navigate = useNavigate();
  const { status } = useNativeSession();
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      {/* Checkout exists only when signed in; a signed-out shopper signs in first and keeps the cart. */}
      <ShopRoute links={{ openCart: () => navigate(status === 'signedIn' ? 'Checkout' : 'SignIn') }} />
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
  const navigate = useNavigate();
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <TeleconsultNativeView links={{ bookAppointment: () => navigate('Appointments') }} />
    </SafeAreaView>
  );
}

function ClinicianConsoleRoute() {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <ClinicianConsoleNativeView />
    </SafeAreaView>
  );
}

function AiChatRoute() {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <AyushChatRoute />
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
      screenOptions={{ animation: 'none', headerTintColor: color.action }}
    >
      {signedIn ? (
        <Stack.Group>
          <Stack.Screen name="Home" component={StudentHomeScreen} options={{ title: 'Studentkare' }} />
          <Stack.Screen name="Vault" component={VaultRoute} options={{ title: 'Health records' }} />
          <Stack.Screen name="Appointments" component={AppointmentsRoute} options={{ title: 'Appointments' }} />
          <Stack.Screen name="DigitalId" component={DigitalIdRoute} options={{ title: 'Health ID' }} />
          <Stack.Screen name="Checkout" component={CheckoutRoute} options={{ title: 'Checkout' }} />
          <Stack.Screen name="Teleconsult" component={TeleconsultRoute} options={{ title: 'Video consult' }} />
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
  useEffect(() => {
    void registerForPushNotificationsAsync();
  }, []);

  return (
    <LanguageProvider>
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
    </LanguageProvider>
  );
}
