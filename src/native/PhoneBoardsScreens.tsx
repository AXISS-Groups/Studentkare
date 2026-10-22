import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { SearchViewModel } from '@/features/discover/viewmodel/SearchViewModel';
import { SearchFlow } from '@/features/discover/views/SearchFlow';
import type { SearchLinks } from '@/features/discover/views/searchParts';
import { ReturnRequestRoute } from '@/features/requests/views/ReturnRequestView';
import { useNavigate } from './navigation';
import { nativePhoneArt } from './phoneArt';

/**
 * The phone boards of design page 2 in the Expo app: search (SearchEntry …
 * DoctorResults) and the return request (orders moved to Mobile 2.0 Orders,
 * M2StoreScreens.tsx).
 * The same views as the web's phone frame; only where they hand off differs.
 * The shop, cart and checkout keep the app's own screens (Marketplace,
 * Checkout), whose order flow is not the web's.
 */

function useBack(): () => void {
  const navigation = useNavigation();
  return () => { if (navigation.canGoBack()) navigation.goBack(); };
}

export function SearchScreen(): React.ReactElement {
  const navigate = useNavigate();
  const back = useBack();
  const [vm] = useState(() => new SearchViewModel());
  useEffect(() => () => vm.dispose(), [vm]);
  const links: SearchLinks = {
    exit: back,
    openProduct: () => navigate('Marketplace'),
    openList: () => navigate('Marketplace'),
    bookLab: () => navigate('Marketplace'),
    bookDoctor: () => navigate('Appointments'),
    openPrescriptions: () => navigate('Vault'),
    openAyush: () => navigate('AiChat'),
    openEmergencyCard: () => navigate('Emergency'),
    openPass: () => navigate('DigitalId'),
    openCrisis: () => navigate('Emergency'),
    openMedicineInfo: (query) => navigate('MedicineInfo', query ? { query } : undefined),
  };
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1 }}>
      <SearchFlow vm={vm} links={links} doctorArt={nativePhoneArt.doctorOnScreen} />
    </SafeAreaView>
  );
}

export function ReturnRequestBoardScreen(): React.ReactElement {
  const navigate = useNavigate();
  return <ReturnRequestRoute links={{ done: () => navigate('MyRequests') }} />;
}
