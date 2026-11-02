import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { M2Card, M2Heading, m2Text } from '@/design-system/m2';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

const COMPARE: readonly { key: string; label: MessageKey; generic: MessageKey; branded: MessageKey }[] = [
  { key: 'ingredient', label: 'm2.med.cmp.ingredient', generic: 'm2.med.cmp.same', branded: 'm2.med.cmp.same' },
  { key: 'strength', label: 'm2.med.cmp.strength', generic: 'm2.med.cmp.same', branded: 'm2.med.cmp.same' },
  { key: 'quality', label: 'm2.med.cmp.quality', generic: 'm2.med.cmp.same', branded: 'm2.med.cmp.same' },
  { key: 'price', label: 'm2.med.cmp.price', generic: 'm2.med.cmp.lower', branded: 'm2.med.cmp.higher' },
];

/**
 * "Generic or branded: what is the same?" (M2Medicines), one card for the
 * phone board, the app and the web shop. A real table to assistive tech
 * (table / row / column and row headers), drawn as the board draws it.
 */
export function GenericsCompare({ testID = 'm2-med-compare' }: { testID?: string }) {
  const t = useT();
  const title = t('m2.med.cmpTitle');
  return (
    <M2Card style={styles.compare} testID={testID}>
      <View style={styles.head}><M2Heading style={m2Text.cardTitle}>{title}</M2Heading></View>
      <View role="table" accessibilityLabel={title} aria-label={title}>
        <View role="row" style={styles.row}>
          {/* The corner: an empty cell, not an empty header. */}
          <View role="cell" style={[styles.key, styles.headCell]} />
          <View role="columnheader" style={[styles.cell, styles.genericBg]}><Text style={[styles.cellText, styles.genericHead]}>{t('m2.med.cmpGeneric')}</Text></View>
          <View role="columnheader" style={[styles.cell, styles.headCell]}><Text style={[styles.cellText, styles.brandHead]}>{t('m2.med.cmpBranded')}</Text></View>
        </View>
        {COMPARE.map((row) => (
          <View key={row.key} role="row" style={[styles.row, styles.rule]}>
            <View role="rowheader" style={styles.key}><Text style={styles.keyText}>{t(row.label)}</Text></View>
            <View role="cell" style={[styles.cell, styles.genericBg]}><Text style={[styles.cellText, styles.generic]}>{t(row.generic)}</Text></View>
            <View role="cell" style={styles.cell}><Text style={[styles.cellText, styles.brand]}>{t(row.branded)}</Text></View>
          </View>
        ))}
      </View>
      <Text style={[m2Text.body, styles.note]}>{t('m2.med.cmpNote')}</Text>
    </M2Card>
  );
}

const styles = StyleSheet.create({
  compare: { borderRadius: 26, overflow: 'hidden' },
  head: { paddingHorizontal: space.s16, paddingTop: space.s16, paddingBottom: space.s10 },
  row: { flexDirection: 'row' },
  rule: { borderTopWidth: 1, borderTopColor: color.ruleSoft },
  headCell: { backgroundColor: color.canvas },
  key: { flex: 1.5, paddingVertical: space.s10, paddingHorizontal: space.s16, justifyContent: 'center' },
  keyText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  cell: { flex: 1, paddingVertical: space.s10, justifyContent: 'center' },
  cellText: { textAlign: 'center', fontFamily: font.family.sans, fontSize: font.size.bodySm },
  genericBg: { backgroundColor: color.positiveBg },
  genericHead: { fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  brandHead: { fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  generic: { fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  brand: { fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  note: { paddingHorizontal: space.s16, paddingTop: space.s12, paddingBottom: space.s16 },
});
