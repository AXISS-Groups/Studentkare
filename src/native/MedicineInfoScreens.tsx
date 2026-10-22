import React, { useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, Card, Note, Skeleton } from '@/design-system';
import { M2ActiveProvider } from '@/design-system/m2';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import { M2MedicineInfoView } from '@/features/medicineInfo/views/M2MedicineInfoView';
import { MedicineInfoViewModel } from '@/features/medicineInfo/viewmodel/MedicineInfoViewModel';
import type { PickedPhoto } from '@/features/medicineInfo/data/MedicineInfoRepository';
import { useNavigate } from './navigation';
import { useNativeSession } from './session';

/**
 * Medicine information in the Expo app (M2MedicineInfo; plan
 * docs/plans/tier1-medicine-info-2026-10-22.md): the same view and view model as
 * the web, signed in or out. "Take a photo" asks for the camera only when chosen
 * and runs it only while the viewfinder shows; the photo is sent once to be read
 * and never kept. There is no photo library picker in the app, so "Upload a
 * photo" is web only. Route params: `medicineId` (from the shop) or `query`.
 */
function StripCamera({ onPhoto, onCancel }: { onPhoto: (photo: PickedPhoto) => void; onCancel: () => void }) {
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
      const picture = await camera.current?.takePictureAsync({ quality: 0.7, exif: false });
      if (picture) {
        const uri = picture.uri;
        onPhoto({ append: (form) => form.append('file', { uri, name: 'strip.jpg', type: 'image/jpeg' }) });
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
          <Button label={t('capture.allow')} fullWidth onPress={() => void requestPermission()} />
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.cardTitle}>{t('mi.photo.take')}</Text>
      <Text style={styles.body}>{t('mi.photo.cameraHint')}</Text>
      <Text style={styles.body}>{t('mi.photo.privacy')}</Text>
      {body}
      <Button label={t('mi.photo.cancel')} variant="secondary" fullWidth onPress={onCancel} />
    </ScrollView>
  );
}

export function MedicineInfoScreen(): React.ReactElement {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const focused = useIsFocused();
  const params = useRoute().params as { medicineId?: unknown; query?: unknown } | undefined;
  const { status, user } = useNativeSession();
  const student = status === 'signedIn' && user?.role === 'STUDENT';
  const [vm] = useState(() => new MedicineInfoViewModel());
  const [camera, setCamera] = useState(false);
  useEffect(() => {
    vm.start({
      medicineId: typeof params?.medicineId === 'string' ? params.medicineId : null,
      query: typeof params?.query === 'string' ? params.query : null,
    });
    return () => vm.dispose();
  }, [vm, params?.medicineId, params?.query]);
  if (camera) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
        <StripCamera onCancel={() => setCamera(false)} onPhoto={(photo) => { setCamera(false); void vm.readPhoto(photo); }} />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <M2ActiveProvider value={focused}>
        <M2MedicineInfoView vm={vm} links={{
          back: navigation.canGoBack() ? () => navigation.goBack() : undefined,
          consult: () => navigate(student ? 'BookAppointment' : status === 'signedIn' ? 'Consults' : 'Consult'),
          pharmacy: () => navigate('FindCare', { segment: 'pharmacies' }),
          sendRx: () => navigate(student ? 'CaptureRecord' : 'SignIn'),
          product: (itemId) => navigate('Product', { itemId }),
          crisis: () => navigate('Emergency'),
          takePhoto: () => setCamera(true),
        }} />
      </M2ActiveProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16 },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, color: color.text2 },
  viewfinderWrap: { gap: space.s12 },
  viewfinder: { height: 420, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: color.cameraBg },
});
