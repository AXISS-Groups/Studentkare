// Public directory + existing camp demonstration. Private native care needs native auth.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppStoresProvider } from '@/store/AppStores';
import { NavigationProvider, useNavigate } from './navigation';
import PreventiveCareScreen from './PreventiveCareScreen';
import { CampScreen } from './CampScreen';
import { LandingCampusScreen, LandingClinicianScreen, LandingLabTestsScreen, LandingPartnershipsScreen, LandingScreen } from './LandingScreen';

const Stack = createNativeStackNavigator<{
  Landing: undefined; Campuses: undefined; Clinicians: undefined; LabTests: undefined; Partnerships: undefined;
  Camp: undefined; PreventiveCare: undefined;
}>();

function CampRoute() {
  const navigate = useNavigate();
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}><CampScreen onOpenProviders={() => navigate('PreventiveCare')} /></SafeAreaView>;
}

export default function NativeApp() {
  return <SafeAreaProvider><AppStoresProvider><NavigationProvider>
    <Stack.Navigator initialRouteName="Landing" screenOptions={{ animation: 'none', headerTintColor: '#155e75' }}>
      <Stack.Screen name="Landing" component={LandingScreen} options={{ title: 'Studentkare' }} />
      <Stack.Screen name="Campuses" component={LandingCampusScreen} options={{ title: 'For campuses' }} />
      <Stack.Screen name="Clinicians" component={LandingClinicianScreen} options={{ title: 'For clinicians' }} />
      <Stack.Screen name="LabTests" component={LandingLabTestsScreen} options={{ title: 'Lab tests' }} />
      <Stack.Screen name="Partnerships" component={LandingPartnershipsScreen} options={{ title: 'Partnerships' }} />
      <Stack.Screen name="Camp" component={CampRoute} options={{ title: 'Camp · proof of concept' }} />
      <Stack.Screen name="PreventiveCare" component={PreventiveCareScreen} options={{ title: 'Public vaccine directory' }} />
    </Stack.Navigator>
  </NavigationProvider></AppStoresProvider></SafeAreaProvider>;
}
