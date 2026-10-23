import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { LanguageProvider, useT } from '@/i18n';
import { color } from '@/design-system/theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppStoresProvider } from '@/store/AppStores';
import { NavigationProvider, useNavigate } from './navigation';
import PreventiveCareScreen from './PreventiveCareScreen';
import { CampScreen } from './CampScreen';
import { RecordCaptureScreen } from './RecordCaptureScreen';
import { RemindersScreen, WaterScreen } from './M2ReminderScreens';
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
import { ReturnRequestBoardScreen, SearchScreen } from './PhoneBoardsScreens';
import { FindCareScreen } from './CareDirectoryScreens';
import { MedicineInfoScreen } from './MedicineInfoScreens';
import {
  ConsultsScreen,
  InsuranceScreen,
  LabsScreen,
  MedicinesScreen,
  OrdersScreen,
} from './M2StoreScreens';
import {
  AskAyushScreen,
  CampsScreen,
  InsightsScreen,
  ProductScreen,
  ProfileScreen,
  ReportUploadScreen,
  StepsScreen,
  TrendsScreen,
  VaccinesScreen,
} from './M2HealthScreens';
import { NativeSessionProvider, useNativeSession } from './session';
import type { NativeSessionStatus } from './session';
import { createLinking } from './linking';
import { StudentHomeScreen } from './StudentHomeScreen';
import { StudentShell } from './StudentTabBar';
import { SessionCheckingScreen } from './SessionCheckingScreen';
import { OfflineBanner } from '@/design-system';
import { YourCareBoard } from '@/features/yourcare/views/YourCareBoard';
import { AppointmentsBoard } from '@/features/appointments/views/AppointmentsBoard';
import { MoreHubBoard } from '@/features/account/views/MoreHubBoard';
import { BoardScreen } from '@/design-system/board/BoardKit';
import { LegalLinksNative } from '@/features/auth/views/LegalLinksNative';

export type RootStackParamList = {
  // keep-sorted start
  AiChat: undefined;
  Appearance: undefined;
  Appointments: undefined;
  BookAppointment: undefined;
  Camp: undefined;
  Camps: undefined;
  Campuses: undefined;
  CaptureRecord: undefined;
  Checkout: undefined;
  ClinicianConsole: undefined;
  Clinicians: undefined;
  Consult: undefined;
  Consults: undefined;
  CreateAccount: undefined;
  DeleteAccount: undefined;
  DigitalId: undefined;
  Emergency: undefined;
  FindCare: { segment?: 'hospitals' | 'pharmacies' | 'ambulance' | 'doctors'; placeId?: string } | undefined;
  Home: undefined;
  HostelVisit: undefined;
  Insights: undefined;
  Insurance: undefined;
  LabList: undefined;
  LabTests: undefined;
  Labs: undefined;
  Landing: undefined;
  LeaveCampus: undefined;
  LostPhone: undefined;
  Marketplace: undefined;
  MedicineInfo: { medicineId?: string; query?: string } | undefined;
  MedicineReminders: undefined;
  Medicines: undefined;
  More: undefined;
  MyRequests: undefined;
  NotificationSettings: undefined;
  Notifications: undefined;
  Orders: { orderId?: string } | undefined;
  Partnerships: undefined;
  Plans: undefined;
  PreventiveCare: undefined;
  Product: { itemId: string };
  Profile: undefined;
  Programs: undefined;
  RefillRequest: undefined;
  ReportUpload: undefined;
  ReturnRequest: undefined;
  Rewards: undefined;
  Search: undefined;
  SignIn: undefined;
  Steps: undefined;
  Teleconsult: undefined;
  Trends: undefined;
  TwoFactorSetup: undefined;
  Vaccines: undefined;
  Vault: undefined;
  Verify: undefined;
  VerifyGate: undefined;
  Water: undefined;
  Wellness: undefined;
  YourCare: undefined;
  // keep-sorted end
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function CampRoute() {
  const navigate = useNavigate();
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <CampScreen onOpenProviders={() => navigate('PreventiveCare')} onFindCamps={() => navigate('Camps')} onSeeResults={() => navigate('Vault')} />
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

function EmergencyRoute() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const { status } = useNativeSession();
  const signedIn = status === 'signedIn';
  // The board draws its own header (SosBeacon / SosDebrief); crisis support has no Expo screen yet.
  return (
    <BoardFrame>
      <EmergencySosNativeView signedIn={signedIn} links={{
        signIn: signedIn ? undefined : () => navigate('SignIn'),
        home: signedIn ? () => navigate('Home') : undefined,
        back: () => navigation.goBack(),
        nearestHospitals: () => navigate('FindCare', { segment: 'hospitals' }),
      }} />
    </BoardFrame>
  );
}

function DigitalIdRoute() {
  const navigation = useNavigation();
  return (
    <BoardFrame>
      <DigitalIdScreen links={{ back: () => navigation.goBack() }} />
    </BoardFrame>
  );
}

/**
 * A phone board draws its own canvas header (BoardHeader), so its stack screen
 * hides the native one and the board takes the top safe area itself.
 */
function BoardFrame({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: color.canvas }}>
      {children}
    </SafeAreaView>
  );
}

function YourCareRoute() {
  const navigate = useNavigate();
  return (
    <BoardFrame>
      <YourCareBoard links={{
        appointments: () => navigate('Appointments'),
        records: () => navigate('Vault'),
        refill: () => navigate('RefillRequest'),
        crisis: () => navigate('Emergency'),
        more: () => navigate('More'),
      }} />
    </BoardFrame>
  );
}

function MoreRoute() {
  const navigate = useNavigate();
  const { user, signOut } = useNativeSession();
  const [signingOut, setSigningOut] = useState(false);
  if (!user) return null;
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: color.canvas }}>
      <BoardScreen>
        <MoreHubBoard
          account={{ fullName: user.fullName, university: user.university, role: user.role, isVerifiedStudent: user.isVerifiedStudent }}
          links={{
            open: {
              records: () => navigate('Vault'),
              requests: () => navigate('MyRequests'),
              notifications: () => navigate('NotificationSettings'),
              campus: () => navigate('DigitalId'),
              crisis: () => navigate('Emergency'),
            },
            signOut: () => { setSigningOut(true); return signOut().finally(() => setSigningOut(false)); },
            signingOut,
          }}
        />
        {/* The public Terms and Privacy Policy pages (the stores ask for an in-app link). */}
        <LegalLinksNative />
      </BoardScreen>
    </SafeAreaView>
  );
}

function AppointmentsRoute() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  // Coming back from booking shows the new request: each visit loads afresh.
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => setVisit((v) => v + 1), []));
  return (
    <BoardFrame>
      <AppointmentsBoard reloadKey={visit} links={{
        book: () => navigate('BookAppointment'),
        back: () => navigation.goBack(),
        join: () => navigate('Teleconsult'),
        crisis: () => navigate('Emergency'),
      }} />
    </BoardFrame>
  );
}

function BookAppointmentRoute() {
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
  const navigate = useNavigate();
  const navigation = useNavigation();
  const [vm] = useState(() => new NotificationViewModel());
  return (
    <BoardFrame>
      <NotificationNativeView viewModel={vm} links={{ back: () => navigation.goBack(), settings: () => navigate('NotificationSettings') }} />
    </BoardFrame>
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
  const navigation = useNavigation();
  return (
    <BoardFrame>
      <MyRequestsRoute links={{ newReturn: () => navigate('ReturnRequest'), newHostelVisit: () => navigate('HostelVisit'), newRefill: () => navigate('RefillRequest'), back: () => navigation.goBack(), crisis: () => navigate('Emergency') }} />
    </BoardFrame>
  );
}

function HostelVisitScreen() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  return <BoardFrame><NewRequestRoute kind="HOSTEL_VISIT" links={{ done: () => navigate('MyRequests'), back: () => navigation.goBack(), crisis: () => navigate('Emergency') }} /></BoardFrame>;
}

function RefillRequestScreen() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  return <BoardFrame><NewRequestRoute kind="REFILL" links={{ done: () => navigate('MyRequests'), back: () => navigation.goBack() }} /></BoardFrame>;
}

function DeleteAccountScreen() {
  const navigation = useNavigation();
  return <BoardFrame><DeleteAccountRoute links={{ back: () => navigation.goBack() }} /></BoardFrame>;
}

function LeaveCampusScreen() {
  const navigate = useNavigate();
  const navigation = useNavigation();
  return <BoardFrame><LeaveCampusRoute links={{ openRecords: () => navigate('Vault'), back: () => navigation.goBack() }} /></BoardFrame>;
}

function NotificationSettingsScreen() {
  const navigation = useNavigation();
  return <BoardFrame><NotificationSettingsRoute links={{ back: () => navigation.goBack() }} /></BoardFrame>;
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
          <Stack.Screen name="Home" component={StudentHomeScreen} options={{ title: 'Studentkare', headerShown: !isStudent }} />
          <Stack.Screen name="Medicines" component={MedicinesScreen} options={{ title: t('m2.med.title'), headerShown: false }} />
          <Stack.Screen name="Labs" component={LabsScreen} options={{ title: t('m2.labs.title'), headerShown: false }} />
          <Stack.Screen name="Consults" component={ConsultsScreen} options={{ title: t('m2.doc.eyebrow'), headerShown: false }} />
          <Stack.Screen name="Insurance" component={InsuranceScreen} options={{ title: t('m2.ins.title'), headerShown: false }} />
          <Stack.Screen name="Vaccines" component={VaccinesScreen} options={{ title: t('m2.vac.eyebrow'), headerShown: false }} />
          <Stack.Screen name="Camps" component={CampsScreen} options={{ title: t('camps.title'), headerShown: false }} />
          <Stack.Screen name="Product" component={ProductScreen} options={{ title: t('m2.med.title'), headerShown: false }} />
          <Stack.Screen name="Insights" component={InsightsScreen} options={{ title: t('m2.nav.health'), headerShown: false }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: t('m2.nav.profile'), headerShown: false }} />
          <Stack.Screen name="Trends" component={TrendsScreen} options={{ title: t('m2v.tr.title'), headerShown: false }} />
          <Stack.Screen name="Steps" component={StepsScreen} options={{ title: t('steps.title'), headerShown: false }} />
          <Stack.Screen name="ReportUpload" component={ReportUploadScreen} options={{ title: t('m2v.up.title'), headerShown: false }} />
          <Stack.Screen name="Vault" component={VaultRoute} options={{ title: t('nav.records') }} />
          <Stack.Screen name="CaptureRecord" component={CaptureRecordRoute} options={{ title: t('capture.title') }} />
          {/* Mobile 2.0 Medicines today and reminders (M2Reminders) and Water (M2Water): each draws its own header. */}
          <Stack.Screen name="MedicineReminders" component={RemindersScreen} options={{ title: t('m2r.meds.title'), headerShown: false }} />
          <Stack.Screen name="Water" component={WaterScreen} options={{ title: t('m2r.water.title'), headerShown: false }} />
          <Stack.Screen name="YourCare" component={YourCareRoute} options={{ title: t('tabbar.yourCare'), headerShown: false }} />
          <Stack.Screen name="More" component={MoreRoute} options={{ title: t('ws.tab.more') }} />
          <Stack.Screen name="Appointments" component={AppointmentsRoute} options={{ title: t('nav.appointments'), headerShown: false }} />
          <Stack.Screen name="BookAppointment" component={BookAppointmentRoute} options={{ title: t('care.appts.book') }} />
          <Stack.Screen name="DigitalId" component={DigitalIdRoute} options={{ title: t('onboard.nav.healthId'), headerShown: false }} />
          <Stack.Screen name="Checkout" component={CheckoutRoute} options={{ title: t('onboard.nav.checkout') }} />
          <Stack.Screen name="Teleconsult" component={TeleconsultRoute} options={{ title: t('onboard.nav.videoConsult') }} />
          {/* A student gets Mobile 2.0 Ask Ayush (general mode); other roles keep the plain chat. */}
          <Stack.Screen name="AiChat" component={isStudent ? AskAyushScreen : AiChatRoute} options={{ title: t('nav.ayush'), headerShown: !isStudent }} />
          <Stack.Screen name="Notifications" component={NotificationsRoute} options={{ title: t('nav.notifications'), headerShown: false }} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ title: t('onboard.nav.notificationSettings'), headerShown: false }} />
          <Stack.Screen name="Appearance" component={AppearanceRoute} options={{ title: t('appearance.title') }} />
          <Stack.Screen name="LeaveCampus" component={LeaveCampusScreen} options={{ title: t('onboard.nav.leaveCampus'), headerShown: false }} />
          <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: t('onboard.nav.deleteAccount'), headerShown: false }} />
          <Stack.Screen name="Rewards" component={RewardsRoute} options={{ title: t('nav.rewards') }} />
          <Stack.Screen name="MyRequests" component={MyRequestsScreen} options={{ title: t('nav.myRequests'), headerShown: false }} />
          <Stack.Screen name="ReturnRequest" component={ReturnRequestBoardScreen} options={{ title: t('onboard.nav.returnRequest') }} />
          <Stack.Screen name="Search" component={SearchScreen} options={{ title: t('phone.search.title') }} />
          <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: t('phone.orders.title'), headerShown: false }} />
          <Stack.Screen name="HostelVisit" component={HostelVisitScreen} options={{ title: t('onboard.nav.hostelVisit'), headerShown: false }} />
          <Stack.Screen name="RefillRequest" component={RefillRequestScreen} options={{ title: t('onboard.nav.refill'), headerShown: false }} />
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
        <Stack.Screen name="Emergency" component={EmergencyRoute} options={{ title: t('home.sos'), headerShown: false }} />
        <Stack.Screen name="LostPhone" component={LostPhoneScreen} options={{ title: t('onboard.nav.lostPhone') }} />
        <Stack.Screen name="Marketplace" component={MarketplaceRoute} options={{ title: t('onboard.nav.marketplace') }} />
        <Stack.Screen name="PreventiveCare" component={PreventiveCareScreen} options={{ title: t('onboard.nav.vaccines') }} />
        <Stack.Screen name="Camp" component={CampRoute} options={{ title: t('onboard.nav.camp') }} />
        {/* Find care near you: public, signed in or out (location stays on the phone). */}
        <Stack.Screen name="FindCare" component={FindCareScreen} options={{ title: t('fc.eyebrow'), headerShown: false }} />
        {/* Medicine information: public, signed in or out (reviewed information only; photos never kept). */}
        <Stack.Screen name="MedicineInfo" component={MedicineInfoScreen} options={{ title: t('mi.eyebrow'), headerShown: false }} />
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
 * Deep links (studentkare:// and https://studentkare.co, see ./linking). The
 * first link waits for the session check, because the stack it opens into is
 * built from the session; until then the checking screen shows.
 */
function LinkedNavigation({ children }: { children: React.ReactNode }) {
  const { status } = useNativeSession();
  const statusRef = useRef<NativeSessionStatus>(status);
  statusRef.current = status;
  const settled = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);
  if (settled.current === null) {
    let resolve: () => void = () => undefined;
    const promise = new Promise<void>((done) => { resolve = done; });
    settled.current = { promise, resolve };
  }
  useEffect(() => {
    if (status !== 'checking') settled.current?.resolve();
  }, [status]);
  const [linking] = useState(() => createLinking(
    () => statusRef.current,
    () => settled.current?.promise ?? Promise.resolve(),
    () => Linking.getInitialURL(),
  ));
  return <NavigationProvider linking={linking} fallback={<SessionCheckingScreen />}>{children}</NavigationProvider>;
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
            <LinkedNavigation>
              <RootNavigator />
            </LinkedNavigation>
          </NativeSessionProvider>
        </AppStoresProvider>
      </SafeAreaProvider>
    </LanguageProvider>
  );
}
