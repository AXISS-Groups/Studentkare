// Public directory + existing camp demonstration. Private native care needs native auth.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppStoresProvider } from '@/store/AppStores';
import { NavigationProvider, useNavigate } from './navigation';
import PreventiveCareScreen from './PreventiveCareScreen';
import { CampScreen } from './CampScreen';

const Stack = createNativeStackNavigator<{ Camp: undefined; PreventiveCare: undefined }>();

function CampRoute() {
  const navigate = useNavigate();
  return <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}><CampScreen onOpenProviders={() => navigate('PreventiveCare')} /></SafeAreaView>;
}

export default function NativeApp() {
  return <SafeAreaProvider><AppStoresProvider><NavigationProvider>
    <Stack.Navigator initialRouteName="Camp" screenOptions={{ animation: 'none', headerTintColor: '#155e75' }}>
      <Stack.Screen name="Camp" component={CampRoute} options={{ title: 'Camp · proof of concept' }} />
      <Stack.Screen name="PreventiveCare" component={PreventiveCareScreen} options={{ title: 'Public vaccine directory' }} />
    </Stack.Navigator>
  </NavigationProvider></AppStoresProvider></SafeAreaProvider>;
}
