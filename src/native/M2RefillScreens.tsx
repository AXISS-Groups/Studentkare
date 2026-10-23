import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useOnline } from '@/design-system';
import { M2ActiveProvider } from '@/design-system/m2';
import { color } from '@/design-system/theme';
import type { Refill } from '@/features/refills/data/refillsApi';
import { RefillsViewModel } from '@/features/refills/viewmodel/RefillsViewModel';
import { ReorderViewModel } from '@/features/refills/viewmodel/ReorderViewModel';
import { M2RefillsView } from '@/features/refills/views/M2RefillsView';
import { M2ReorderView } from '@/features/refills/views/M2ReorderView';
import { useLanguage, useT } from '@/i18n';
import { createPushController } from './hardware/push';
import { useNavigate } from './navigation';

/**
 * Refills and the one-tap reorder (M2Refills, M2Reorder) in the Expo app: the
 * same views and view models as the web. Route params carry opaque ids only
 * (`id` from a refill reminder, `orderId` + `itemId` from Orders), never a
 * medicine. Refill reminders come from the server (they respect the student's
 * reminder switch and quiet hours); nothing is scheduled on the phone here.
 */
function text(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

export const RefillsScreen = observer(function RefillsScreen(): React.ReactElement {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const focused = useIsFocused();
  const online = useOnline();
  const params = useRoute().params as { id?: unknown; orderId?: unknown; itemId?: unknown } | undefined;
  const focus = text(params?.id);
  const fromOrder = text(params?.orderId);
  const fromItem = text(params?.itemId);
  const t = useT();
  const { lang } = useLanguage();
  const words = useRef({ t, lang });
  words.current = { t, lang };
  // A refill reminder is the moment notifications make sense: ask then, never at launch.
  const [vm] = useState(() => new RefillsViewModel(undefined, () => {
    void createPushController(words.current.t, () => words.current.lang).enable().catch(() => undefined);
  }));
  const [reorder, setReorder] = useState<ReorderViewModel | null>(null);

  useEffect(() => { vm.setOnline(online); reorder?.setOnline(online); }, [vm, reorder, online]);
  useEffect(() => {
    vm.setFocus(focus);
    vm.load();
    if (fromOrder && fromItem) vm.openSetup({ orderId: fromOrder, itemId: fromItem });
    return () => vm.dispose();
  }, [vm, focus, fromOrder, fromItem]);
  useEffect(() => {
    if (!reorder) return undefined;
    void reorder.load();
    return () => reorder.dispose();
  }, [reorder]);

  const back = () => { if (navigation.canGoBack()) navigation.goBack(); };
  const open = (refill: Refill) => {
    if (refill.orderId && refill.itemId) setReorder(new ReorderViewModel(refill.orderId, [refill.itemId]));
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.frame}>
      <M2ActiveProvider value={focused}>
        {reorder ? (
          <M2ReorderView vm={reorder} links={{
            back: () => { setReorder(null); vm.load(); },
            sos: () => navigate('Emergency'),
            sendPrescription: () => navigate('Vault'),
            uploadPrescription: () => navigate('CaptureRecord'),
            consult: () => navigate('Consults'),
            pharmacist: () => navigate('FindCare', { segment: 'pharmacies' }),
            track: (orderId) => navigate('Orders', { orderId }),
            orders: () => navigate('Orders'),
          }} />
        ) : (
          <M2RefillsView vm={vm} links={{
            back,
            sos: () => navigate('Emergency'),
            reorder: open,
            requestRefill: () => navigate('RefillRequest'),
          }} />
        )}
      </M2ActiveProvider>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: color.canvas },
});
