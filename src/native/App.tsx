import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppStoresProvider } from '@/store/AppStores';
import { NavigationProvider, useNavigate } from './navigation';
import PreventiveCareScreen from './PreventiveCareScreen';
import { CampScreen } from './CampScreen';
import { LandingCampusScreen, LandingClinicianScreen, LandingConsultScreen, LandingLabTestsScreen, LandingPartnershipsScreen, LandingScreen } from './LandingScreen';
import { HealthVaultNativeView } from '@/modules/m02-vault/view/HealthVaultNativeView';
import { EmergencySosNativeView } from '@/modules/m04-emergency/view/EmergencySosNativeView';
import { DigitalIdNativeView } from '@/modules/m03-digital_id/view/DigitalIdNativeView';
import { CartCheckoutNativeView } from '@/modules/m16-checkout/view/CartCheckoutNativeView';
import { AppointmentBookingNativeView } from '@/features/appointments/views/AppointmentBookingNativeView';
import { AppointmentBookingViewModel } from '@/features/appointments/viewmodel/AppointmentBookingViewModel';
import { MarketplaceNativeView } from '@/features/marketplace/views/MarketplaceNativeView';
import { MarketplaceViewModel } from '@/features/marketplace/viewmodel/MarketplaceViewModel';
import { useAppFonts } from './useAppFonts';

const Stack = createNativeStackNavigator<{
  Landing: undefined;
  Campuses: undefined;
  Clinicians: undefined;
  LabTests: undefined;
  Consult: undefined;
  Partnerships: undefined;
  Camp: undefined;
  PreventiveCare: undefined;
  Vault: undefined;
  Emergency: undefined;
  Appointments: undefined;
  DigitalId: undefined;
  Marketplace: undefined;
  Checkout: undefined;
}>();

function CampRoute() {
  const navigate = useNavigate();
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}><CampScreen onOpenProviders={() => navigate('PreventiveCare')} /></SafeAreaView>;
}

function VaultRoute() {
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}><HealthVaultNativeView /></SafeAreaView>;
}

function EmergencyRoute() {
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}><EmergencySosNativeView /></SafeAreaView>;
}

function DigitalIdRoute() {
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}><DigitalIdNativeView /></SafeAreaView>;
}

function AppointmentsRoute() {
  const [vm] = useState(() => new AppointmentBookingViewModel());
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}><AppointmentBookingNativeView viewModel={vm} /></SafeAreaView>;
}

function MarketplaceRoute() {
  const [vm] = useState(() => new MarketplaceViewModel());
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}><MarketplaceNativeView viewModel={vm} /></SafeAreaView>;
}

function CheckoutRoute() {
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}><CartCheckoutNativeView /></SafeAreaView>;
}

export default function NativeApp() {
  useAppFonts();
  return <SafeAreaProvider><AppStoresProvider><NavigationProvider>
    <Stack.Navigator initialRouteName="Landing" screenOptions={{ animation: 'none', headerTintColor: '#155e75' }}>
      <Stack.Screen name="Landing" component={LandingScreen} options={{ title: 'Studentkare' }} />
      <Stack.Screen name="Campuses" component={LandingCampusScreen} options={{ title: 'For campuses' }} />
      <Stack.Screen name="Clinicians" component={LandingClinicianScreen} options={{ title: 'For clinicians' }} />
      <Stack.Screen name="LabTests" component={LandingLabTestsScreen} options={{ title: 'Lab tests' }} />
      <Stack.Screen name="Consult" component={LandingConsultScreen} options={{ title: 'Consult a doctor' }} />
      <Stack.Screen name="Partnerships" component={LandingPartnershipsScreen} options={{ title: 'Partnerships' }} />
      <Stack.Screen name="Camp" component={CampRoute} options={{ title: 'Camp · proof of concept' }} />
      <Stack.Screen name="PreventiveCare" component={PreventiveCareScreen} options={{ title: 'Public vaccine directory' }} />
      <Stack.Screen name="Vault" component={VaultRoute} options={{ title: 'Health Vault' }} />
      <Stack.Screen name="Emergency" component={EmergencyRoute} options={{ title: 'Emergency SOS' }} />
      <Stack.Screen name="Appointments" component={AppointmentsRoute} options={{ title: 'Book appointment' }} />
      <Stack.Screen name="DigitalId" component={DigitalIdRoute} options={{ title: 'Health ID' }} />
      <Stack.Screen name="Marketplace" component={MarketplaceRoute} options={{ title: 'Marketplace' }} />
      <Stack.Screen name="Checkout" component={CheckoutRoute} options={{ title: 'Checkout' }} />
    </Stack.Navigator>
  </NavigationProvider></AppStoresProvider></SafeAreaProvider>;
}
