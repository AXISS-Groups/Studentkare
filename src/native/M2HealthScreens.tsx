import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, Card, Note, Sheet, Skeleton, useOnline } from '@/design-system';
import { M2ActiveProvider } from '@/design-system/m2';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
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
import type { Page, ReportReview } from '@/features/preventive/models';
import { TrendsViewModel } from '@/features/labResults/viewmodel/LabValuesViewModels';
import { ReportUploadViewModel } from '@/features/labResults/viewmodel/ReportUploadViewModel';
import type { PickedReport } from '@/features/labResults/viewmodel/ReportUploadViewModel';
import { M2TrendsView } from '@/features/labResults/views/M2TrendsView';
import { REVIEWS_PATH } from '@/features/labResults/viewmodel/trendScreenModels';
import { M2ReportUploadView } from '@/features/labResults/views/M2ReportUploadView';
import { StepsViewModel } from '@/features/steps/viewmodel/StepsViewModel';
import { M2StepsView } from '@/features/steps/views/M2StepsView';
import { syncToday } from '@/features/steps/sources/healthSources';
import { nativeStepConnectors } from './stepConnectors';
import { useNavigate } from './navigation';
import { useNativeSession } from './session';

/**
 * Mobile 2.0 health screens in the Expo app: My health (Insights), Profile,
 * Ask Ayush, Vaccines and the medicine page (plan package A), and Trends and
 * Add a lab report (package B, Tier 1, plan approved 2026-10-21), the same
 * views and view models as the web phone frame. Each board draws its own
 * header, so the stack hides the native one; ambient motion runs only while
 * the screen is focused.
 *
 * Add a lab report on the phone: "Take a photo" uses the camera here (asked
 * for only when the student chooses it, running only while the viewfinder
 * shows, as RecordCaptureScreen). "Upload a PDF" needs a document picker the
 * app does not bundle, so it is shown as not available on this device.
 *
 * Report upload sits under the pill nav like Trends (the nav carries the
 * bottom safe area), so its frame keeps only the top and side insets.
 *
 * Steps (new screen, Tier 2): this phone's step sources (stepConnectors.ts).
 * Opening My health looks at each source without asking anything, reconnects
 * the ones the phone still allows, and syncs today's total once; the Steps
 * screen also counts live and re-syncs while it is in front.
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
  useEffect(() => {
    let live = true;
    // Look only (no prompt): a source the phone still allows reconnects, then today's total is synced once.
    void Promise.all(nativeStepConnectors().map((c) => c.status().catch(() => 'unavailable')))
      .then(() => syncToday())
      .then((outcome) => { if (live && outcome.status === 'synced') void vm.steps.load(); });
    return () => { live = false; };
  }, [vm]);
  return (
    <Frame>
      <M2InsightsView vm={vm} name={user?.fullName ?? ''} stepsOnPhone links={{
        sos: () => navigate('Emergency'),
        trends: () => navigate('Trends'),
        records: () => navigate('Vault'),
        reportUpload: () => navigate('ReportUpload'),
        medicines: () => navigate('MedicineReminders'),
        water: () => navigate('Water'),
        refill: () => navigate('RefillRequest'),
        addVaccineCard: () => navigate('CaptureRecord'),
        appointments: () => navigate('Appointments'),
        steps: () => navigate('Steps'),
        emergencyCard: () => navigate('Emergency'),
        pass: () => navigate('DigitalId'),
      }} />
    </Frame>
  );
}

export function StepsScreen(): React.ReactElement {
  const back = useBack();
  const focused = useIsFocused();
  const [vm] = useState(() => new StepsViewModel({ connectors: nativeStepConnectors() }));
  // Live counting and the re-sync run only while the screen is in front.
  useEffect(() => {
    if (!focused) return undefined;
    vm.open();
    return () => vm.dispose();
  }, [vm, focused]);
  return (
    <Frame>
      <M2StepsView vm={vm} links={{ back }} />
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
        <M2AskAyushView vm={vm} links={{ back, sos: () => navigate('Emergency'), book: () => navigate('Consults') }} />
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
      info: (medicineId) => navigate('MedicineInfo', { medicineId }),
    }} />
  );
});

export function ProductScreen(): React.ReactElement {
  const route = useRoute();
  const params = (route.params ?? {}) as { itemId?: string };
  return <Frame><ProductBoard itemId={params.itemId ?? ''} /></Frame>;
}
export function TrendsScreen(): React.ReactElement {
  const navigate = useNavigate();
  const back = useBack();
  const online = useOnline();
  const [vm] = useState(() => new TrendsViewModel());
  const reviews = useApiResource<Page<ReportReview>>(REVIEWS_PATH);
  useEffect(() => { void vm.load(); return () => vm.dispose(); }, [vm]);
  return (
    <Frame>
      <M2TrendsView vm={vm} reviews={reviews.data?.items ?? null} online={online} links={{ back, upload: () => navigate('ReportUpload') }} />
    </Frame>
  );
}

/** The viewfinder for "Take a photo": permission, shutter, cancel. The photo goes nowhere until the view-model uploads it. */
function ReportCamera({ onPhoto, onCancel }: { onPhoto: (photo: PickedReport) => void; onCancel: () => void }) {
  const t = useT();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [shooting, setShooting] = useState(false);
  const [failed, setFailed] = useState(false);

  const shoot = async () => {
    if (shooting) return;
    setShooting(true);
    setFailed(false);
    try {
      const picture = await camera.current?.takePictureAsync({ quality: 0.6, exif: false });
      if (picture) {
        const uri = picture.uri;
        onPhoto({ name: 'report.jpg', append: (form) => form.append('file', { uri, name: 'report.jpg', type: 'image/jpeg' }) });
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setShooting(false);
    }
  };

  let body: React.ReactNode;
  if (!permission) {
    body = <Skeleton label={t('capture.askTitle')} lines={['80%', '60%']} />;
  } else if (!permission.granted) {
    body = (
      <Card>
        <Text accessibilityRole="header" style={styles.cardTitle}>{t('capture.askTitle')}</Text>
        {permission.canAskAgain ? (
          <>
            <Text style={styles.body}>{t('capture.askBody')}</Text>
            <Button label={t('capture.allow')} fullWidth onPress={() => void requestPermission()} />
          </>
        ) : (
          <>
            <Text style={styles.body}>{t('capture.deniedBody')}</Text>
            <Button label={t('capture.openSettings')} variant="secondary" fullWidth onPress={() => void Linking.openSettings()} />
          </>
        )}
      </Card>
    );
  } else {
    body = (
      <View style={styles.viewfinderWrap}>
        <CameraView ref={camera} style={styles.viewfinder} facing="back" accessibilityLabel={t('capture.cameraLabel')} />
        <Button label={t('capture.shutter')} accessibilityLabel={t('capture.shutterSpoken')} size="cta" fullWidth busy={shooting} onPress={() => void shoot()} />
        {failed ? <Note tone="danger">{t('capture.cameraError')}</Note> : null}
      </View>
    );
  }
  return (
    <ScrollView style={styles.cameraScreen} contentContainerStyle={styles.cameraContent}>
      <Text accessibilityRole="header" style={styles.cardTitle}>{t('m2v.up.photo')}</Text>
      <Text style={styles.body}>{t('m2v.up.photoSub')}</Text>
      {body}
      <Button label={t('m2v.up.cancelPhoto')} variant="secondary" fullWidth onPress={onCancel} />
    </ScrollView>
  );
}

export function ReportUploadScreen(): React.ReactElement {
  const t = useT();
  const navigate = useNavigate();
  const back = useBack();
  const online = useOnline();
  const [vm] = useState(() => new ReportUploadViewModel(t('m2v.up.documentTitle')));
  const [camera, setCamera] = useState(false);
  useEffect(() => () => vm.dispose(), [vm]);
  if (camera) {
    return (
      <Frame>
        <ReportCamera onCancel={() => setCamera(false)} onPhoto={(photo) => { setCamera(false); void vm.upload(photo); }} />
      </Frame>
    );
  }
  return (
    <Frame>
      <M2ReportUploadView vm={vm} sources={{ photo: () => setCamera(true), pdf: null }} online={online}
        links={{ back, trends: () => navigate('Trends') }} />
    </Frame>
  );
}
const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: color.canvas },
  sheet: { gap: space.s10 },
  cameraScreen: { flex: 1, backgroundColor: color.canvas },
  cameraContent: { padding: space.gutterPhone, gap: space.s16 },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, color: color.text2 },
  viewfinderWrap: { gap: space.s12 },
  viewfinder: { height: 420, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: color.cameraBg },
});
