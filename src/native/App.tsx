import React, { useCallback, useState } from 'react';
import { LanguageProvider, useT } from '@/i18n';
import { color } from '@/design-system/theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppStoresProvider } from '@/store/AppStores';
import { NavigationProvider, useNavigate } from './navigation';
import PreventiveCareScreen from './PreventiveCareScreen';
import { CampScreen } from './CampScreen';
import { RecordCaptureScreen } from './RecordCaptureScreen';
import { MedicineRemindersScreen } from './MedicineRemindersScreen';
import { AppearanceScreen } from './AppearanceScreen';
import { applyAppearanceAndRestart } from './applyAppearance';
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
  TwoFactorHeldScreen,
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
import { RewardsRoute } from '@/features/rewards/views/RewardsView';
import { MyRequestsRoute, NewRequestRoute } from '@/features/requests/views/RequestsViews';
import { NativeSessionProvider, useNativeSession } from './session';
import { StudentHomeScreen } from './StudentHomeScreen';
import { StudentShell } from './StudentTabBar';
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
  TwoFactorSetup: undefined;
  CreateAccount: undefined;
  LostPhone: undefined;
  Verify: undefined;
  VerifyGate: undefined;
  Home: undefined;
  Camp: undefined;
  PreventiveCare: undefined;
  Vault: undefined;
  CaptureRecord: undefined;
  MedicineReminders: undefined;
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
  Appearance: undefined;
  LeaveCampus: undefined;
  DeleteAccount: undefined;
  Rewards: undefined;
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
      <CampScreen onOpenProviders={() => navigate('PreventiveCare')} onSeeResults={() => navigate('Vault')} />
    </SafeAreaView>
  );
}

function VaultRoute() {
  const navigate = useNavigate();
  // Coming back from photographing a record shows it: each visit loads afresh.
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => setVisit((v) => v + 1), []));
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <HealthVaultRoute key={visit} onCapture={() => navigate('CaptureRecord')} />
    </SafeAreaView>
  );
}

function CaptureRecordRoute() {
  const navigate = useNavigate();
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <RecordCaptureScreen onDone={() => navigate('Vault')} />
    </SafeAreaView>
  );
}

function MedicineRemindersRoute() {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <MedicineRemindersScreen />
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
  const { status, user } = useNativeSession();
  const signedIn = status === 'signedIn';
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      {/* Checkout exists only when signed in; a signed-out shopper signs in first and keeps the cart. */}
      <ShopRoute links={{
        openCart: () => navigate(signedIn ? 'Checkout' : 'SignIn'),
        signedIn, studentName: user?.fullName ?? '', signIn: () => navigate('SignIn'),
        openRecords: () => navigate(signedIn ? 'Vault' : 'SignIn'),
      }} />
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

function AppearanceRoute() {
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <AppearanceScreen applySaved={applyAppearanceAndRestart} />
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
 * branch, including the check itself (DESIGN.md §2.4). A session held to
 * two-step set-up gets the set-up screen and nothing else signed-in.
 */
function RootNavigator() {
  const session = useNativeSession();
  const t = useT();

  if (session.status === 'checking') return <SessionCheckingScreen />;

  const held = session.status === 'twoFactorSetup';
  const signedIn = session.status === 'signedIn' && session.user !== null;
  const isDoctor = session.user?.role === 'NMC_DOCTOR';
  const isStudent = signedIn && session.user?.role === 'STUDENT';

  return (
    <Stack.Navigator
      key={held ? 'held' : signedIn ? 'signed-in' : 'signed-out'}
      initialRouteName={held ? 'TwoFactorSetup' : signedIn ? 'Home' : 'Landing'}
      screenOptions={{ animation: 'none', headerTintColor: color.action }}
      layout={isStudent ? ({ state, navigation, children }) => (
        <StudentShell currentRoute={state.routes[state.index]?.name ?? ''} navigate={(route) => navigation.navigate(route)}>
          {children}
        </StudentShell>
      ) : undefined}
    >
      {held ? (
        <Stack.Group>
          <Stack.Screen name="TwoFactorSetup" component={TwoFactorHeldScreen} options={{ title: t('sec.twofa.title') }} />
        </Stack.Group>
      ) : signedIn ? (
        <Stack.Group>
          <Stack.Screen name="Home" component={StudentHomeScreen} options={{ title: 'Studentkare' }} />
          <Stack.Screen name="Vault" component={VaultRoute} options={{ title: t('nav.records') }} />
          <Stack.Screen name="CaptureRecord" component={CaptureRecordRoute} options={{ title: t('capture.title') }} />
          <Stack.Screen name="MedicineReminders" component={MedicineRemindersRoute} options={{ title: t('reminders.title') }} />
          <Stack.Screen name="Appointments" component={AppointmentsRoute} options={{ title: t('nav.appointments') }} />
          <Stack.Screen name="DigitalId" component={DigitalIdRoute} options={{ title: t('onboard.nav.healthId') }} />
          <Stack.Screen name="Checkout" component={CheckoutRoute} options={{ title: t('onboard.nav.checkout') }} />
          <Stack.Screen name="Teleconsult" component={TeleconsultRoute} options={{ title: t('onboard.nav.videoConsult') }} />
          <Stack.Screen name="AiChat" component={AiChatRoute} options={{ title: t('nav.ayush') }} />
          <Stack.Screen name="Notifications" component={NotificationsRoute} options={{ title: t('nav.notifications') }} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsRoute} options={{ title: t('onboard.nav.notificationSettings') }} />
          <Stack.Screen name="Appearance" component={AppearanceRoute} options={{ title: t('appearance.title') }} />
          <Stack.Screen name="LeaveCampus" component={LeaveCampusScreen} options={{ title: t('onboard.nav.leaveCampus') }} />
          <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: t('onboard.nav.deleteAccount') }} />
          <Stack.Screen name="Rewards" component={RewardsRoute} options={{ title: t('nav.rewards') }} />
          <Stack.Screen name="MyRequests" component={MyRequestsScreen} options={{ title: t('nav.myRequests') }} />
          <Stack.Screen name="ReturnRequest" component={ReturnRequestScreen} options={{ title: t('onboard.nav.returnRequest') }} />
          <Stack.Screen name="HostelVisit" component={HostelVisitScreen} options={{ title: t('onboard.nav.hostelVisit') }} />
          <Stack.Screen name="RefillRequest" component={RefillRequestScreen} options={{ title: t('onboard.nav.refill') }} />
          <Stack.Screen name="Verify" component={IdentityVerifyScreen} options={{ title: t('verify.title') }} />
          <Stack.Screen name="VerifyGate" component={VerifyGateScreen} options={{ title: t('gate.eyebrow') }} />
          {isDoctor ? <Stack.Screen name="ClinicianConsole" component={ClinicianConsoleRoute} options={{ title: t('onboard.nav.clinicianConsole') }} /> : null}
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="Landing" component={LandingScreen} options={{ title: 'Studentkare' }} />
          <Stack.Screen name="Campuses" component={LandingCampusScreen} options={{ title: t('onboard.nav.campuses') }} />
          <Stack.Screen name="Clinicians" component={LandingClinicianScreen} options={{ title: t('onboard.nav.clinicians') }} />
          <Stack.Screen name="LabTests" component={LandingLabTestsScreen} options={{ title: t('onboard.nav.labTests') }} />
          <Stack.Screen name="Consult" component={LandingConsultScreen} options={{ title: t('onboard.nav.consult') }} />
          <Stack.Screen name="Partnerships" component={LandingPartnershipsScreen} options={{ title: t('onboard.nav.partnerships') }} />
          <Stack.Screen name="Programs" component={LandingProgramsScreen} options={{ title: t('onboard.nav.programs') }} />
          <Stack.Screen name="Plans" component={LandingPlansScreen} options={{ title: t('onboard.nav.plans') }} />
          <Stack.Screen name="Wellness" component={LandingWellnessScreen} options={{ title: t('nav.wellnessTraining') }} />
          <Stack.Screen name="LabList" component={LandingLabListScreen} options={{ title: t('onboard.nav.labList') }} />
          <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: t('auth.signIn') }} />
          <Stack.Screen name="CreateAccount" component={CreateAccountScreen} options={{ title: t('auth.createAccount') }} />
        </Stack.Group>
      )}

      {/* Either way: help, the shop and public care information. */}
      <Stack.Group>
        <Stack.Screen name="Emergency" component={EmergencyRoute} options={{ title: t('home.sos') }} />
        <Stack.Screen name="LostPhone" component={LostPhoneScreen} options={{ title: t('onboard.nav.lostPhone') }} />
        <Stack.Screen name="Marketplace" component={MarketplaceRoute} options={{ title: t('onboard.nav.marketplace') }} />
        <Stack.Screen name="PreventiveCare" component={PreventiveCareScreen} options={{ title: t('onboard.nav.vaccines') }} />
        <Stack.Screen name="Camp" component={CampRoute} options={{ title: t('onboard.nav.camp') }} />
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

/**
 * Nothing is asked for at launch. The camera is requested when a student
 * photographs a record, notifications when they turn on a medicine reminder.
 */
export default function NativeApp() {
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
