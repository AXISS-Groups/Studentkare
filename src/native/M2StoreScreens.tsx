import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { M2ActiveProvider } from '@/design-system/m2';
import { color } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import { PhoneShopViewModel } from '@/features/shopPhone/viewmodel/PhoneShopViewModel';
import { LabBookingRoute } from '@/features/labBooking/views/LabBookingFlow';
import { useLabPackages } from '@/features/m2store/data/useLabPackages';
import { M2MedicinesView } from '@/features/m2store/views/M2MedicinesView';
import { M2LabsView } from '@/features/m2store/views/M2LabsView';
import { M2ConsultsView } from '@/features/m2store/views/M2ConsultsView';
import { ConsultsViewModel } from '@/features/m2store/viewmodel/ConsultsViewModel';
import { observer } from 'mobx-react-lite';
import { useNavigate } from './navigation';
import { useNativeSession } from './session';

/**
 * Mobile 2.0 Medicines, Lab tests and Doctor consults in the Expo app: the
 * same views as the web phone frame, handing off to the app's own screens
 * (Marketplace and Checkout keep the app's cart; booking a consult opens
 * BookAppointment). Each board draws its own header, so the stack hides the
 * native one; ambient motion runs only while the screen is focused.
 */

function useBack(): () => void {
  const navigation = useNavigation();
  return () => { if (navigation.canGoBack()) navigation.goBack(); };
}

function Frame({ children }: { children: React.ReactNode }) {
  const focused = useIsFocused();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: color.canvas }}>
      <M2ActiveProvider value={focused}>{children}</M2ActiveProvider>
    </SafeAreaView>
  );
}

const MedicinesBoard = observer(function MedicinesBoard({ vm }: { vm: PhoneShopViewModel }) {
  const navigate = useNavigate();
  const back = useBack();
  return (
    <M2MedicinesView
      cartCount={0}
      shelf={{ phase: vm.homePhase, items: vm.featured, retry: () => void vm.loadHome() }}
      points={{ value: vm.points, ready: vm.homePhase === 'ready' }}
      labFromPaise={vm.labFromPaise}
      links={{
        back,
        cart: () => navigate('Checkout'),
        // The app's shop (Marketplace) keeps its own list, product page and cart.
        search: () => navigate('Marketplace'),
        rx: () => navigate('Vault'),
        category: () => navigate('Marketplace'),
        generics: () => navigate('Marketplace'),
        refills: () => navigate('Insights'),
        product: (item) => navigate('Product', { itemId: item.id }),
        seeAll: () => navigate('Marketplace'),
        rewards: () => navigate('Rewards'),
        labs: () => navigate('Labs'),
      }}
    />
  );
});

export function MedicinesScreen(): React.ReactElement {
  const [vm] = useState(() => new PhoneShopViewModel());
  useEffect(() => { void vm.loadHome(); return () => vm.dispose(); }, [vm]);
  return <Frame><MedicinesBoard vm={vm} /></Frame>;
}

interface ProfileLine { hostelBlock?: string }

export function LabsScreen(): React.ReactElement {
  const navigate = useNavigate();
  const back = useBack();
  const { user } = useNativeSession();
  const labs = useLabPackages();
  const profile = useApiResource<ProfileLine>('/profile');
  const [booking, setBooking] = useState<string | null>(null);
  if (booking) {
    return (
      <Frame>
        <LabBookingRoute openItemId={booking} studentName={user?.fullName ?? ''}
          links={{ onExit: () => setBooking(null), onReports: () => navigate('Vault'), onViewBooking: () => navigate('Vault') }} />
      </Frame>
    );
  }
  return (
    <Frame>
      <M2LabsView phase={labs.phase} packages={labs.items} retry={labs.reload} block={profile.data?.hostelBlock ?? ''}
        links={{ back, reports: () => navigate('Vault'), rx: () => navigate('Vault'), book: (pkg) => setBooking(pkg.id) }} />
    </Frame>
  );
}

export function ConsultsScreen(): React.ReactElement {
  const navigate = useNavigate();
  const back = useBack();
  const [vm] = useState(() => new ConsultsViewModel());
  useEffect(() => { void vm.load(); return () => vm.dispose(); }, [vm]);
  return (
    <Frame>
      <M2ConsultsView vm={vm} links={{ back, book: () => navigate('BookAppointment') }} />
    </Frame>
  );
}

