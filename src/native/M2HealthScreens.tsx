import React, { useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, Card, Note, Skeleton, useOnline } from '@/design-system';
import { M2ActiveProvider } from '@/design-system/m2';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import { useT } from '@/i18n';
import type { Page, ReportReview } from '@/features/preventive/models';
import { TrendsViewModel } from '@/features/labResults/viewmodel/LabValuesViewModels';
import { ReportUploadViewModel } from '@/features/labResults/viewmodel/ReportUploadViewModel';
import type { PickedReport } from '@/features/labResults/viewmodel/ReportUploadViewModel';
import { M2TrendsView } from '@/features/labResults/views/M2TrendsView';
import { REVIEWS_PATH } from '@/features/labResults/viewmodel/trendScreenModels';
import { M2ReportUploadView } from '@/features/labResults/views/M2ReportUploadView';
import { useNavigate } from './navigation';

/**
 * Mobile 2.0 My health boards in the Expo app (Tier 1, plan approved
 * 2026-10-21): Trends and Add a lab report, the same views as the web phone
 * frame. Each board draws its own header, so the stack hides the native one.
 *
 * Add a lab report on the phone: "Take a photo" uses the camera here (asked
 * for only when the student chooses it, running only while the viewfinder
 * shows, as RecordCaptureScreen). "Upload a PDF" needs a document picker the
 * app does not bundle, so it is shown as not available on this device.
 */

function useBack(): () => void {
  const navigation = useNavigation();
  return () => { if (navigation.canGoBack()) navigation.goBack(); };
}

function Frame({ children, bottom = false }: { children: React.ReactNode; bottom?: boolean }) {
  const focused = useIsFocused();
  return (
    <SafeAreaView edges={bottom ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']} style={styles.frame}>
      <M2ActiveProvider value={focused}>{children}</M2ActiveProvider>
    </SafeAreaView>
  );
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
      <Frame bottom>
        <ReportCamera onCancel={() => setCamera(false)} onPhoto={(photo) => { setCamera(false); void vm.upload(photo); }} />
      </Frame>
    );
  }
  return (
    <Frame bottom>
      <M2ReportUploadView vm={vm} sources={{ photo: () => setCamera(true), pdf: null }} online={online}
        links={{ back, trends: () => navigate('Trends') }} />
    </Frame>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: color.canvas },
  cameraScreen: { flex: 1, backgroundColor: color.canvas },
  cameraContent: { padding: space.gutterPhone, gap: space.s16 },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, color: color.text2 },
  viewfinderWrap: { gap: space.s12 },
  viewfinder: { height: 420, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: color.cameraBg },
});
