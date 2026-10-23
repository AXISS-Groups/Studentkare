import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, CrisisLinks, ErrorState, Eyebrow, Note, PhoneInput, Select, Skeleton, TextField } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { BLOOD_GROUPS, EmergencyCardViewModel, RELATIONS } from '../viewmodel/EmergencyCardViewModel';
import type { BloodGroup } from '../viewmodel/EmergencyCardViewModel';

/**
 * Emergency card editor (design: EmergencyCard / WebEmergencyCard, Tier 1).
 * Built on design-system primitives so the same view can serve the native app.
 * Everything shown comes from the student's own profile; see
 * EmergencyCardViewModel for what this replaced.
 */
export const EmergencyCardView = observer(function EmergencyCardView({ vm }: { vm: EmergencyCardViewModel }) {
  const t = useT();
  const relationLabel = (value: string) =>
    (RELATIONS as readonly string[]).includes(value) ? t(`ice.rel.${value}` as MessageKey) : value;
  const d = vm.draft;
  const s = vm.saved;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>{t('ice.eyebrow')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('ice.title')}</Text>
      <Text style={styles.body}>{t('ice.intro')}</Text>
      <CrisisLinks />

      {vm.loading ? <Skeleton label={t('ice.loading')} lines={['70%', '90%', '60%']} /> : null}
      {vm.loadFailed ? <ErrorState title={t('ice.failedTitle')} body={t('ice.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}

      {d && s ? (
        <>
          <Card>
            <Select<BloodGroup>
              label={t('ice.blood')}
              hint={t('ice.bloodHint')}
              options={BLOOD_GROUPS.map((g) => ({ value: g, label: g || t('ice.notRecorded') }))}
              value={d.bloodGroup}
              onChange={(g) => vm.set('bloodGroup', g)}
            />
            <TextField label={t('ice.allergies')} hint={t('ice.allergiesHint')} value={d.allergies} onChangeText={(v) => vm.set('allergies', v)} />
            <TextField label={t('ice.conditions')} hint={t('ice.conditionsHint')} value={d.conditions} onChangeText={(v) => vm.set('conditions', v)} />
          </Card>

          <Card>
            <Text style={styles.cardTitle}>{t('ice.contact')}</Text>
            <TextField label={t('ice.contactName')} value={d.contactName} onChangeText={(v) => vm.set('contactName', v)} />
            <PhoneInput
              label={t('ice.contactPhone')}
              value={d.contactPhone}
              onChangeText={(v) => vm.set('contactPhone', v)}
              error={vm.phoneError ? t('ice.contactPhoneError') : undefined}
            />
            <Select<string>
              label={t('ice.relation')}
              options={RELATIONS.map((r) => ({ value: r, label: t(`ice.rel.${r}` as MessageKey) }))}
              value={d.contactRelation || null}
              onChange={(r) => vm.set('contactRelation', r)}
            />
          </Card>

          {vm.error ? <Note tone="danger">{t(vm.error)}</Note> : null}
          {vm.notice ? <Note tone="positive">{t(vm.notice)}</Note> : null}
          {vm.dirty ? <Text style={styles.meta}>{t('ice.unsaved')}</Text> : null}
          <Button label={t('ice.save')} size="cta" fullWidth busy={vm.saving} disabled={!vm.canSave && !vm.saving} onPress={() => void vm.save()} />
          {vm.dirty ? <Button label={t('ice.discard')} variant="ghost" fullWidth onPress={vm.discard} /> : null}

          <Card>
            <Text style={styles.cardTitle}>{t('ice.preview')}</Text>
            <View style={styles.row}><Text style={styles.label}>{t('ice.blood')}</Text><Text style={styles.value}>{s.bloodGroup || t('ice.notRecorded')}</Text></View>
            <View style={styles.row}><Text style={styles.label}>{t('ice.allergies')}</Text><Text style={styles.value}>{s.allergies || t('ice.noneRecorded')}</Text></View>
            <View style={styles.row}><Text style={styles.label}>{t('ice.conditions')}</Text><Text style={styles.value}>{s.conditions || t('ice.noneRecorded')}</Text></View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('ice.contact')}</Text>
              <Text style={styles.value}>
                {s.contactName ? `${s.contactName}${s.contactRelation ? ` (${relationLabel(s.contactRelation)})` : ''}${s.contactPhone ? ` · +91 ${s.contactPhone}` : ''}` : t('ice.noneRecorded')}
              </Text>
            </View>
            {vm.missing.length ? (
              <Note tone="attention" title={t('ice.missingTitle')}>{vm.missing.map((k) => t(k)).join(' · ')}</Note>
            ) : null}
            <Text style={styles.meta}>{t('ice.previewNote')}</Text>
            {Platform.OS === 'web' && !vm.dirty ? (
              <Button label={t('ice.print')} variant="secondary" onPress={() => window.print()} />
            ) : null}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
});

/** Route /emergency-card. */
export function WebEmergencyCard(): React.ReactElement {
  const [vm] = useState(() => new EmergencyCardViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <EmergencyCardView vm={vm} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2, lineHeight: font.size.body * font.lineHeight.body },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: space.s12, flexWrap: 'wrap' },
  label: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
  value: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.clinicalValue, flexShrink: 1, textAlign: 'right' },
  meta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text3 },
});
