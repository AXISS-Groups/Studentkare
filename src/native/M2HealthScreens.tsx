import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { Button, Sheet } from '@/design-system';
import { M2ActiveProvider } from '@/design-system/m2';
import { color, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import { useCheckoutViewModel } from '@/modules/m16-checkout';
import { InsightsViewModel } from '@/features/insights/viewmodel/InsightsViewModel';
import { M2InsightsView } from '@/features/insights/views/M2InsightsView';
import { ProfileViewModel } from '@/features/m2profile/viewmodel/ProfileViewModel';
import { M2ProfileView } from '@/features/m2profile/views/M2ProfileView';
import { AyushViewModel } from '@/features/chat/viewmodel/AyushViewModel';
import { M2AskAyushView } from '@/features/chat/views/M2AskAyushView';
import { VaccinesViewModel } from '@/features/preventive/viewmodel/VaccinesViewModel';
import { M2VaccinesView } from '@/features/preventive/views/M2VaccinesView';
import { M2ProductViewModel } from '@/features/shopPhone/viewmodel/M2ProductViewModel';
import { M2ProductView } from '@/features/shopPhone/views/M2ProductView';
import { HealthPlaceholder } from '@/features/m2health/views/HealthPlaceholder';
import { useNavigate } from './navigation';
import { useNativeSession } from './session';

/**
 * Mobile 2.0 health screens in the Expo app (plan package A): My health
 * (Insights), Profile, Ask Ayush, Vaccines and the medicine page, the same
 * views and view models as the web phone frame. Each board draws its own
 * header, so the stack hides the native one; ambient motion runs only while
 * the screen is focused. Report upload and Trends ship in their own update:
 * until then their routes say so.
 */

function useBack(): () => void {
  const navigation = useNavigation();
  return () => { if (navigation.canGoBack()) navigation.goBack(); };
}

function Frame({ children }: { children: React.ReactNode }) {
  const focused = useIsFocused();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.frame}>
      <M2ActiveProvider value={focused}>{children}</M2ActiveProvider>
    </SafeAreaView>
  );
}

export function InsightsScreen(): React.ReactElement {
  const navigate = useNavigate();
  const { user } = useNativeSession();
  const [vm] = useState(() => new InsightsViewModel());
  useEffect(() => { vm.load(); return () => vm.dispose(); }, [vm]);
  return (
    <Frame>
      <M2InsightsView vm={vm} name={user?.fullName ?? ''} links={{
        sos: () => navigate('Emergency'),
        trends: () => navigate('Trends'),
        records: () => navigate('Vault'),
        reportUpload: () => navigate('ReportUpload'),
        refill: () => navigate('RefillRequest'),
        addVaccineCard: () => navigate('CaptureRecord'),
        appointments: () => navigate('Appointments'),
        emergencyCard: () => navigate('Emergency'),
        pass: () => navigate('DigitalId'),
      }} />
    </Frame>
  );
}

export function ProfileScreen(): React.ReactElement {
  const t = useT();
  const navigate = useNavigate();
  const { signOut } = useNativeSession();
  const [vm] = useState(() => new ProfileViewModel());
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { vm.load(); return () => vm.dispose(); }, [vm]);
  return (
    <Frame>
      <M2ProfileView vm={vm} links={{
        sos: () => navigate('Emergency'),
        settings: () => navigate('More'),
        emergencyCard: () => navigate('Emergency'),
        pass: () => navigate('DigitalId'),
        documents: () => navigate('Vault'),
        addDocument: () => navigate('ReportUpload'),
        orders: () => navigate('Orders'),
        privacy: () => navigate('DeleteAccount'),
        signOut: () => setConfirm(true),
      }} />
      <Sheet visible={confirm} title={t('shell.logoutTitle')} onClose={() => setConfirm(false)} busy={busy}>
        <View style={styles.sheet}>
          <Button label={t('shell.logout')} fullWidth busy={busy} onPress={() => { setBusy(true); void signOut().finally(() => { setBusy(false); setConfirm(false); }); }} />
          <Button label={t('common.cancel')} variant="ghost" fullWidth onPress={() => setConfirm(false)} />
        </View>
      </Sheet>
    </Frame>
  );
}

export function AskAyushScreen(): React.ReactElement {
  const navigate = useNavigate();
  const back = useBack();
  const [vm] = useState(() => new AyushViewModel());
  useEffect(() => { void vm.loadHistory(); return () => vm.dispose(); }, [vm]);
  return (
    <Frame>
      <KeyboardAvoidingView style={styles.frame} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <M2AskAyushView vm={vm} links={{ back, sos: () => navigate('Emergency') }} />
      </KeyboardAvoidingView>
    </Frame>
  );
}

export function VaccinesScreen(): React.ReactElement {
  const navigate = useNavigate();
  const back = useBack();
  const [vm] = useState(() => new VaccinesViewModel());
  useEffect(() => { vm.load(); return () => vm.dispose(); }, [vm]);
  return (
    <Frame>
      <M2VaccinesView vm={vm} links={{ back, myHealth: () => navigate('Insights'), camp: () => navigate('Camp'), more: () => navigate('PreventiveCare') }} />
    </Frame>
  );
}

const ProductBoard = observer(function ProductBoard({ itemId }: { itemId: string }) {
  const navigate = useNavigate();
  const back = useBack();
  const { state, actions } = useCheckoutViewModel();
  const [vm] = useState(() => new M2ProductViewModel());
  useEffect(() => { void vm.load(itemId); return () => vm.dispose(); }, [vm, itemId]);
  const count = state.cartItems.reduce((n, line) => n + line.quantity, 0);
  return (
    <M2ProductView vm={vm} cartCount={count} links={{
      back,
      cart: () => navigate('Checkout'),
      open: (alt) => navigate('Product', { itemId: alt.id }),
      add: (quantity) => {
        const item = vm.item;
        if (!item) return;
        const line = state.cartItems.find((l) => l.id === item.id);
        if (!line) {
          actions.addItem({ id: item.id, name: item.name, brand: item.brand, kind: 'product', pricePaise: item.pricePaise, mrpPaise: item.mrpPaise, stock: item.stock, requiresPrescription: item.requiresPrescription });
        }
        actions.updateQuantity(item.id, (line?.quantity ?? 0) + quantity);
        navigate('Checkout');
      },
      addRx: () => navigate('CaptureRecord'),
    }} />
  );
});

export function ProductScreen(): React.ReactElement {
  const route = useRoute();
  const params = (route.params ?? {}) as { itemId?: string };
  return <Frame><ProductBoard itemId={params.itemId ?? ''} /></Frame>;
}

export function ReportUploadScreen(): React.ReactElement {
  const navigate = useNavigate();
  return <SafeAreaView edges={['left', 'right']} style={styles.frame}><HealthPlaceholder onRecords={() => navigate('Vault')} /></SafeAreaView>;
}

export function TrendsScreen(): React.ReactElement {
  const navigate = useNavigate();
  return <SafeAreaView edges={['left', 'right']} style={styles.frame}><HealthPlaceholder onRecords={() => navigate('Vault')} /></SafeAreaView>;
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: color.canvas },
  sheet: { gap: space.s10 },
});
