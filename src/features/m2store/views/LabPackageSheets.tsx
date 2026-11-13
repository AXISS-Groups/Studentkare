import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Sheet, SwitchRow } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { M2Note, M2Table, m2TableText, m2Text, webAttrs } from '@/design-system/m2';
import type { M2TableColumn } from '@/design-system/m2';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import { discountPercent, money } from '@/data/types/workflowTypes';
import type { LabPackage } from '@/features/labBooking/data/LabBookingRepository';

type T = ReturnType<typeof useT>;

const fastingText = (p: LabPackage, t: T) => (p.fastingHours > 0 ? t('m2.labs.detail.fastingHours', { hours: p.fastingHours }) : t('m2.labs.detail.noFasting'));
const reportText = (p: LabPackage, t: T) => t('m2.labs.detail.reportHours', { hours: p.reportHours });
const collectionText = (p: LabPackage, t: T) => (p.lab.homeCollection ? t('m2.labs.detail.atYourPlace') : t('m2.labs.detail.atTheLab'));

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={m2Text.meta}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

/**
 * One lab package in full (reference-video audit 2026-11-13, lab tests): what it
 * costs, the lab that runs it, how to prepare and every test it includes. Every
 * line is the catalogue's own (GET /lab-packages); a field the catalogue leaves
 * empty is left out, never filled in. Rule L: nothing here is about the student.
 */
export function LabPackageDetailSheet({ pkg, onClose, onBook }: { pkg: LabPackage | null; onClose: () => void; onBook: (pkg: LabPackage) => void }) {
  const t = useT();
  if (!pkg) return null;
  const off = discountPercent(pkg.mrpPaise, pkg.pricePaise);
  return (
    <Sheet visible title={pkg.name} subtitle={pkg.description || undefined} onClose={onClose} testID="m2-labs-detail">
      <View style={styles.stack}>
        <View style={styles.priceLine}>
          <Text style={styles.price}>{money(pkg.pricePaise)}</Text>
          {pkg.mrpPaise > pkg.pricePaise ? <Text style={styles.mrp}>{money(pkg.mrpPaise)}</Text> : null}
          {off > 0 ? <Text style={styles.save}>{t('m2.labs.detail.off', { percent: off })}</Text> : null}
        </View>
        <View style={styles.facts}>
          <Fact label={t('m2.labs.detail.report')} value={reportText(pkg, t)} />
          <Fact label={t('m2.labs.detail.fasting')} value={fastingText(pkg, t)} />
          <Fact label={t('m2.labs.detail.collection')} value={collectionText(pkg, t)} />
        </View>
        <View style={styles.block} testID="m2-labs-detail-lab">
          <Text style={m2Text.eyebrow}>{t('m2.labs.detail.lab')}</Text>
          <Text style={m2Text.cardTitle}>{pkg.lab.name}</Text>
          {pkg.lab.accreditation ? <Text style={m2Text.meta}>{pkg.lab.accreditation}</Text> : null}
        </View>
        {pkg.preparation ? <M2Note tone="info" icon="clock" testID="m2-labs-detail-prep">{pkg.preparation}</M2Note> : null}
        <View style={styles.block}>
          <Text style={m2Text.eyebrow}>{t(pkg.includes.length === 1 ? 'm2.labs.testsOne' : 'm2.labs.tests', { count: pkg.includes.length })}</Text>
          <View {...webAttrs({ role: 'list' })} style={styles.tests} testID="m2-labs-detail-tests">
            {pkg.includes.map((name) => (
              <View key={name} {...webAttrs({ role: 'listitem' })} style={styles.test}>
                <Icon name="check" size={15} color={color.positive} strokeWidth={2.6} />
                <Text style={styles.testName}>{name}</Text>
              </View>
            ))}
          </View>
        </View>
        <Button label={t('m2.labs.bookSlot')} fullWidth onPress={() => onBook(pkg)} testID="m2-labs-detail-book" />
      </View>
    </Sheet>
  );
}

interface CompareRow {
  key: string;
  label: string;
  a: string | boolean;
  b: string | boolean;
}

function Cell({ value }: { value: string | boolean }) {
  const t = useT();
  if (typeof value === 'string') return <Text style={m2TableText.strong}>{value}</Text>;
  return (
    <View role="img" accessibilityLabel={value ? t('m2.labs.compare.included') : t('m2.labs.compare.notIncluded')}
      {...webAttrs({ 'aria-label': value ? t('m2.labs.compare.included') : t('m2.labs.compare.notIncluded') })}>
      <Icon name={value ? 'check' : 'minus'} size={16} color={value ? color.positive : color.text3} strokeWidth={2.6} />
    </View>
  );
}

/** The rows of the comparison: the facts first, then every test either package includes. */
function compareRows(a: LabPackage, b: LabPackage, t: T): CompareRow[] {
  const has = (p: LabPackage, name: string) => p.includes.some((x) => x.trim().toLowerCase() === name.trim().toLowerCase());
  const tests: string[] = [];
  for (const name of [...a.includes, ...b.includes]) {
    if (!tests.some((x) => x.trim().toLowerCase() === name.trim().toLowerCase())) tests.push(name);
  }
  return [
    { key: 'price', label: t('m2.labs.compare.price'), a: money(a.pricePaise), b: money(b.pricePaise) },
    { key: 'count', label: t('m2.labs.compare.tests'), a: String(a.includes.length), b: String(b.includes.length) },
    { key: 'report', label: t('m2.labs.detail.report'), a: reportText(a, t), b: reportText(b, t) },
    { key: 'fasting', label: t('m2.labs.detail.fasting'), a: fastingText(a, t), b: fastingText(b, t) },
    { key: 'lab', label: t('m2.labs.detail.lab'), a: a.lab.name, b: b.lab.name },
    { key: 'collection', label: t('m2.labs.detail.collection'), a: collectionText(a, t), b: collectionText(b, t) },
    ...tests.map((name) => ({ key: `test:${name}`, label: name, a: has(a, name), b: has(b, name) })),
  ];
}

/**
 * Two lab packages side by side (reference-video audit 2026-11-13). Catalogue
 * facts only; it says what each package contains and never which one to choose.
 */
export function LabCompareSheet({ pair, onClose, onBook }: { pair: readonly [LabPackage, LabPackage] | null; onClose: () => void; onBook: (pkg: LabPackage) => void }) {
  const t = useT();
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const rows = useMemo(() => {
    if (!pair) return [];
    const all = compareRows(pair[0], pair[1], t);
    return onlyDifferences ? all.filter((row) => row.a !== row.b) : all;
  }, [pair, onlyDifferences, t]);
  if (!pair) return null;
  const [a, b] = pair;
  const columns: M2TableColumn<CompareRow>[] = [
    { key: 'label', header: t('m2.labs.compare.what'), flex: 1.3, cell: (row) => <Text style={m2TableText.cell}>{row.label}</Text> },
    { key: 'a', header: a.name, align: 'right', cell: (row) => <Cell value={row.a} /> },
    { key: 'b', header: b.name, align: 'right', cell: (row) => <Cell value={row.b} /> },
  ];
  return (
    <Sheet visible title={t('m2.labs.compare.title')} subtitle={t('m2.labs.compare.sub')} onClose={onClose} testID="m2-labs-compare">
      <View style={styles.stack}>
        <SwitchRow label={t('m2.labs.compare.onlyDifferences')} value={onlyDifferences} onChange={setOnlyDifferences} testID="m2-labs-compare-diff" />
        {rows.length === 0
          ? <Text style={m2Text.body} testID="m2-labs-compare-same">{t('m2.labs.compare.same')}</Text>
          : <M2Table<CompareRow> caption={t('m2.labs.compare.caption', { a: a.name, b: b.name })} rows={rows} rowKey={(row) => row.key} columns={columns} testID="m2-labs-compare-table" />}
        <View style={styles.bookRow}>
          <Button label={t('m2.labs.compare.book', { name: a.name })} variant="secondary" fullWidth onPress={() => onBook(a)} testID="m2-labs-compare-book-a" />
          <Button label={t('m2.labs.compare.book', { name: b.name })} variant="secondary" fullWidth onPress={() => onBook(b)} testID="m2-labs-compare-book-b" />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.s14 },
  priceLine: { flexDirection: 'row', alignItems: 'baseline', gap: space.s8, flexWrap: 'wrap' },
  price: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text, fontVariant: ['tabular-nums'] },
  mrp: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text3, textDecorationLine: 'line-through' },
  save: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  facts: { flexDirection: 'row', gap: space.s8, flexWrap: 'wrap' },
  fact: { flexGrow: 1, flexBasis: 96, borderRadius: radius.lg, paddingVertical: space.s10, paddingHorizontal: space.s12, gap: space.s2, backgroundColor: color.surface2 },
  factValue: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  block: { gap: space.s4 },
  tests: { gap: space.s6, marginTop: space.s4 },
  test: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  testName: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text },
  bookRow: { gap: space.s8 },
});
