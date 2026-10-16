import React, { useRef, useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { observer } from 'mobx-react-lite';
import { Button, Card, Eyebrow, Note, RadioGroup, Skeleton, TextField } from '@/design-system';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { RECORD_CATEGORIES, RecordCaptureViewModel } from '@/features/vault/viewmodel/RecordCaptureViewModel';
import type { RecordCategory } from '@/features/vault/viewmodel/RecordCaptureViewModel';
import { uploadRecordPhoto } from './recordUpload';

/**
 * Photograph a prescription or health document and add it to the student's
 * records — the only use of the camera permission declared in app.json.
 *
 * The camera is asked for here, when the student chooses to photograph
 * something, never at launch. It runs only while this screen shows the
 * viewfinder, and a photo reaches the server only when the student saves it.
 */
export const RecordCaptureScreen = observer(function RecordCaptureScreen({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [vm] = useState(() => new RecordCaptureViewModel(uploadRecordPhoto));
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [shooting, setShooting] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);

  const takePhoto = async () => {
    if (shooting) return;
    setShooting(true);
    setCameraFailed(false);
    try {
      const picture = await camera.current?.takePictureAsync({ quality: 0.6, exif: false });
      if (picture) vm.setPhoto({ uri: picture.uri, width: picture.width, height: picture.height });
      else setCameraFailed(true);
    } catch {
      setCameraFailed(true);
    } finally {
      setShooting(false);
    }
  };

  const cameraStep = () => {
    if (!permission) return <Skeleton label={t('capture.askTitle')} lines={['80%', '60%']} />;
    if (!permission.granted) {
      return (
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
    }
    return (
      <View style={styles.viewfinderWrap}>
        <CameraView ref={camera} style={styles.viewfinder} facing="back" accessibilityLabel={t('capture.cameraLabel')} />
        <Button label={t('capture.shutter')} accessibilityLabel={t('capture.shutterSpoken')} size="cta" fullWidth busy={shooting} onPress={() => void takePhoto()} />
        {cameraFailed ? <Note tone="danger">{t('capture.cameraError')}</Note> : null}
      </View>
    );
  };

  if (vm.saved) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Note tone="positive">{t('capture.saved')}</Note>
        <Button label={t('capture.another')} fullWidth onPress={vm.reset} />
        <Button label={t('capture.backToRecords')} variant="secondary" fullWidth onPress={onDone} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Eyebrow>{t('vault.eyebrow')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('capture.title')}</Text>
      <Text style={styles.body}>{t('capture.intro')}</Text>

      {vm.photo ? (
        <Card>
          <Image
            source={{ uri: vm.photo.uri }}
            style={[styles.preview, { aspectRatio: vm.photo.width > 0 && vm.photo.height > 0 ? vm.photo.width / vm.photo.height : 3 / 4 }]}
            accessible
            accessibilityLabel={t('capture.previewLabel')}
          />
          <Button label={t('capture.retake')} variant="secondary" fullWidth onPress={vm.retake} />
          <TextField
            label={t('capture.titleLabel')}
            hint={t('capture.titleHint')}
            value={vm.title}
            onChangeText={vm.setTitle}
            error={vm.problem === 'title' ? t('capture.titleRequired') : undefined}
          />
          <RadioGroup<RecordCategory>
            label={t('capture.categoryLabel')}
            options={RECORD_CATEGORIES.map((c) => ({ value: c, label: t(`capture.cat.${c}` as MessageKey) }))}
            value={vm.category}
            onChange={vm.setCategory}
          />
          {vm.problem === 'category' ? <Note tone="danger">{t('capture.categoryRequired')}</Note> : null}
          {vm.problem === 'tooLarge' ? <Note tone="danger">{t('capture.tooLarge')}</Note> : null}
          {vm.problem === 'failed' ? <Note tone="danger">{t('capture.failed')}</Note> : null}
          <Button label={t('capture.save')} size="cta" fullWidth busy={vm.saving} onPress={() => void vm.save()} />
          <Text style={styles.meta}>{t('capture.galleryNote')}</Text>
        </Card>
      ) : (
        cameraStep()
      )}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text, lineHeight: font.size.body * font.lineHeight.body },
  meta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
  viewfinderWrap: { gap: space.s12 },
  viewfinder: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, overflow: 'hidden' },
  preview: { width: '100%', borderRadius: radius.md },
});
