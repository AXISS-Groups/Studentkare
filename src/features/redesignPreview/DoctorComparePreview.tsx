import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Table, m2TableText, m2Text } from '@/design-system/m2';
import type { M2TableColumn, PressState } from '@/design-system/m2';

const noop = () => undefined;

interface Row { label: string; a: React.ReactNode; b: React.ReactNode }
function YesNo({ included }: { included: boolean }): React.ReactElement {
  return included
    ? <Icon name="check" size={16} color={color.positive} />
    : <Icon name="minus" size={16} color={color.text3} />;
}

const COLUMNS: ReadonlyArray<M2TableColumn<Row>> = [
  { key: 'label', header: '', cell: (r) => <Text style={m2TableText.strong}>{r.label}</Text> },
  { key: 'a', header: 'Dr. A', cell: (r) => r.a },
  { key: 'b', header: 'Dr. B', cell: (r) => r.b },
];
function rowsFor(t: ReturnType<typeof useT>): readonly Row[] {
  return [
  { label: 'Fee', a: <Text style={m2TableText.cell}>₹399</Text>, b: <Text style={m2TableText.cell}>₹299</Text> },
  { label: 'Next slot', a: <Text style={m2TableText.cell}>{t('preview.today6Pm')}</Text>, b: <Text style={m2TableText.cell}>{t('preview.tomorrow10Am')}</Text> },
  { label: 'Video consult', a: <YesNo included />, b: <YesNo included /> },
  { label: 'Years of practice', a: <Text style={m2TableText.cell}>9</Text>, b: <Text style={m2TableText.cell}>14</Text> },
  { label: 'Speaks Telugu', a: <YesNo included />, b: <YesNo included={false} /> },
];
}

/**
 * Flat, non-functional, net-new concept: comparing two doctors before
 * booking, in the same 1mg-inspired visual language as the rest of this
 * set. There is no existing brief or screen for this — it extends the
 * LabComparePreview pattern (same M2Table) to M2Consults, the way the
 * canvas's own LabCompare did for lab packages. If this direction is
 * wanted for real, it needs its own brief and ticket first, same caution
 * as LabPrepPreview. Not wired, not replacing anything. See NOTES.md.
 */
export function DoctorComparePreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-doctor-compare">
      <View style={styles.header}>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
          <Icon name="arrow-left" size={20} color={color.text} />
        </Pressable>
        <Text style={styles.title}>{t('preview.comparing2Doctors')}</Text>
      </View>
      <View style={styles.scroll}>
        <View style={styles.body}>
          <Text style={m2Text.meta}>{t('preview.drAGeneralPhysicianVsDrBGeneral')}</Text>
          <M2Table caption="Doctor comparison" columns={COLUMNS} rows={rowsFor(t)} rowKey={(r) => r.label} label="Comparing two doctors" />
        </View>
      </View>
      <View style={styles.footer}>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.bookDrA')} onPress={noop} style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}>
          <Text style={styles.outlineBtnText}>{t('preview.bookDrA')}</Text>
        </Pressable>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.bookDrB')} onPress={noop} style={({ focused }: PressState) => [styles.fillBtn, focused ? focusRing : null]}>
          <Text style={styles.fillBtnText}>{t('preview.bookDrB')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  scroll: { flex: 1 },
  body: { paddingHorizontal: space.gutterPhone, gap: space.s12 },
  footer: { flexDirection: 'row', gap: space.s12, padding: space.gutterPhone, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  outlineBtn: { flex: 1, height: 48, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  fillBtn: { flex: 1, height: 48, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  fillBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
