import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { M2ActiveProvider } from '@/design-system/m2';
import { color } from '@/design-system/theme';
import { FindCare } from '@/features/careDirectory/views/CareDirectoryView';
import { CareDirectoryViewModel } from '@/features/careDirectory/viewmodel/CareDirectoryViewModel';
import { isDirectorySegment } from '@/features/careDirectory/model/types';
import { deviceLocate } from './deviceLocation';
import { useNavigate } from './navigation';
import { useNativeSession } from './session';

/**
 * Find care near you in the Expo app (M2FindCare, M2FacilityDetail): the same
 * board as the web, signed in or out. Route params pick the first tab
 * ("Nearest hospitals" opens Hospitals) and may open one place. Booking hands
 * off to BookAppointment; signed out it goes to sign in. SOS opens Emergency.
 */
export function FindCareScreen(): React.ReactElement {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const focused = useIsFocused();
  const params = useRoute().params as { segment?: unknown; placeId?: unknown } | undefined;
  const { status, user } = useNativeSession();
  const student = status === 'signedIn' && user?.role === 'STUDENT';
  const [vm] = useState(() => new CareDirectoryViewModel({ locate: deviceLocate, signedIn: student }));
  useEffect(() => {
    vm.start(isDirectorySegment(params?.segment) ? params.segment : 'hospitals');
    if (typeof params?.placeId === 'string') void vm.openById(params.placeId);
    return () => vm.dispose();
  }, [vm, params?.segment, params?.placeId]);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: color.canvas }}>
      <M2ActiveProvider value={focused}>
        <FindCare vm={vm} links={{
          back: navigation.canGoBack() ? () => navigation.goBack() : undefined,
          sos: student ? () => navigate('Emergency') : undefined,
          book: () => navigate(student ? 'BookAppointment' : status === 'signedIn' ? 'Consults' : 'SignIn'),
        }} />
      </M2ActiveProvider>
    </SafeAreaView>
  );
}
