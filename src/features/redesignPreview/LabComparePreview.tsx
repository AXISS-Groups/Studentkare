import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Table, RoundButton, m2Text, m2TableText } from '@/design-system/m2';
import type { M2TableColumn, PressState } from '@/design-system/m2';

const noop = () => undefined;

interface CompareRow {
  key: string;
  label: string;
  a: React.ReactNode;
  b: React.ReactNode;
  group?: string;
}

function YesNo({ included }: { included: boolean }): React.ReactElement {
  return (
    <View style={[styles.yesNo, included ? styles.yes : styles.no]} role="img" accessibilityLabel={included ? 'Included' : 'Not included'}>
      <Icon name={included ? 'check' : 'minus'} size={16} color={included ? color.positive : color.text3} strokeWidth={2.5} />
    </View>
  );
}

function rowsFor(t: ReturnType<typeof useT>): readonly CompareRow[] {
  return [
  { key: 'tests', label: 'Tests included', a: <Text style={m2TableText.strong}>{t('preview.n')}</Text>, b: <Text style={m2TableText.strong}>{t('preview.n')}</Text> },
  { key: 'report', label: 'Report in', a: <Text style={m2TableText.strong}>{t('preview.hours')}</Text>, b: <Text style={m2TableText.strong}>{t('preview.hours')}</Text> },
  { key: 'fasting', label: 'Fasting needed', a: <Text style={m2TableText.strong}>{t('preview.812H')}</Text>, b: <Text style={m2TableText.strong}>{t('preview.812H')}</Text> },
  { key: 'group-1', label: '[Test group 1]', a: <YesNo included={false} />, b: <YesNo included /> },
  { key: 'group-2', label: '[Test group 2]', a: <YesNo included />, b: <YesNo included /> },
  { key: 'group-3', label: '[Test group 3]', a: <YesNo included={false} />, b: <YesNo included /> },
  { key: 'group-4', label: '[Test group 4]', a: <YesNo included />, b: <YesNo included /> },
];
}

const COLUMNS: readonly M2TableColumn<CompareRow>[] = [
  { key: 'label', header: '', flex: 1.3, cell: (row) => <Text style={m2TableText.cell}>{row.label}</Text> },
  { key: 'a', header: '[Package A]', align: 'right', cell: (row) => row.a },
  { key: 'b', header: '[Package B]', align: 'right', cell: (row) => row.b },
];

/**
 * Flat, non-functional redesign preview of
 * https://claude.ai/artifact/XV8ZhTtjc7kQmEfhyAMZP2's LabCompare.dc.html, as a
 * dedicated full-screen comparison. The real "Comparing 2 packages" table
 * already shipped inline on M2Labs (design change 2026-11-04) — this is a
 * full-page take on the same feature, not a new capability. See NOTES.md.
 */
export function LabComparePreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-lab-compare">
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label="Back" onPress={noop} testID="preview-lab-compare-back" />
        <Text style={styles.h1}>{t('preview.comparePackages')}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.priceRow}>
          <View style={styles.priceCol}>
            <Text style={styles.packageName}>{t('preview.packageA')}</Text>
            <Text style={styles.packagePrice}>{t('preview.price')}</Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.packageName}>{t('preview.packageB')}</Text>
            <Text style={styles.packagePrice}>{t('preview.price')}</Text>
          </View>
        </View>
        <M2Table caption="What it checks" label="Compare packages" columns={COLUMNS} rows={rowsFor(t)} rowKey={(row) => row.key} testID="preview-lab-compare-table" />
        <Text style={m2Text.meta}>{t('preview.comparedFromTheCatalogueOnlyNothingHereIs')}</Text>
      </View>

      <View style={styles.footer}>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.bookA')} onPress={noop} style={({ focused }: PressState) => [styles.fillBtn, focused ? focusRing : null]}>
          <Text style={styles.fillBtnText}>{t('preview.bookA')}</Text>
        </Pressable>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.bookB')} onPress={noop} style={({ focused }: PressState) => [styles.outlineBtn, focused ? focusRing : null]}>
          <Text style={styles.outlineBtnText}>{t('preview.bookB')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { height: 64, paddingHorizontal: space.gutterPhone, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  h1: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.4, color: color.text },
  body: { flex: 1, paddingHorizontal: space.gutterPhone, gap: space.s12 },
  priceRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.s24, paddingRight: space.s4 },
  priceCol: { alignItems: 'center', gap: space.s2, minWidth: 90 },
  packageName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  packagePrice: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
  yesNo: { width: 28, height: 28, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  yes: { backgroundColor: color.positiveBg },
  no: { backgroundColor: color.neutralBg },
  footer: { borderTopWidth: 1, borderTopColor: color.ruleSoft, backgroundColor: color.surface, paddingHorizontal: space.gutterPhone, paddingVertical: space.s12, flexDirection: 'row', gap: space.s12 },
  fillBtn: { flex: 1, height: 48, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  fillBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  outlineBtn: { flex: 1, height: 48, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
});
