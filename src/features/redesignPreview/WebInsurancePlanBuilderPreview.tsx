import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Card, M2Note, M2Pill, M2Table, m2TableText, m2Text, RoundButton } from '@/design-system/m2';
import type { M2TableColumn, PressState } from '@/design-system/m2';
import { StepDiagram } from '@/design-system';
import { WebShellPreview } from './WebShellPreview';
import { BrandFooter } from './BrandFooter';

const TOP_UP_STEPS = [
  { title: '[Pick a base plan]', description: '[Start with the coverage amount that fits your family.]' },
  { title: '[Add a top-up]', description: '[Extend your cover for a small added cost per month.]' },
  { title: '[Claim like normal]', description: '[Once your base cover is used, the top-up kicks in automatically.]' },
];

const noop = () => undefined;

const COVERAGE_OPTIONS: readonly string[] = ['[₹5L]', '[₹10L]', '[₹25L]'];

interface PlanRow {
  key: string;
  name: string;
  ribbon?: 'bestValue' | 'recommended';
  price: string;
  opd: boolean;
}

const PLAN_ROWS: readonly PlanRow[] = [
  { key: 'basic', name: '[Family Health Shield — Basic]', price: '₹[499]/mo', opd: false },
  { key: 'plus', name: '[Family Health Shield — Plus]', ribbon: 'bestValue', price: '₹[799]/mo', opd: true },
  { key: 'max', name: '[Family Health Shield — Max]', ribbon: 'recommended', price: '₹[1,199]/mo', opd: true },
];

function OpdCell({ included }: { included: boolean }): React.ReactElement {
  return included
    ? <Icon name="check" size={16} color={color.positive} />
    : <Icon name="minus" size={16} color={color.text3} />;
}

const PLAN_COLUMNS: ReadonlyArray<M2TableColumn<PlanRow>> = [
  {
    key: 'name',
    header: 'Plan',
    flex: 1.6,
    cell: (row) => (
      <View style={styles.planNameCell}>
        <Text style={m2TableText.strong}>{row.name}</Text>
        {row.ribbon ? (
          <M2Pill
            label={row.ribbon === 'bestValue' ? 'BEST VALUE' : 'RECOMMENDED'}
            tone={row.ribbon === 'bestValue' ? 'positive' : 'action'}
          />
        ) : null}
      </View>
    ),
  },
  { key: 'price', header: 'Monthly', align: 'right', cell: (row) => <Text style={m2TableText.cell}>{row.price}</Text> },
  { key: 'opd', header: 'Covers OPD', align: 'right', cell: (row) => <OpdCell included={row.opd} /> },
];

/**
 * Flat, non-functional 1mg-inspired preview of WebInsurancePlanBuilder —
 * the web counterpart of `InsurancePlanBuilderPreview.tsx`, inside the
 * real `StudentWebShell`. Part of the 2026-11-11 gap-analysis pass; no
 * `design/screens/briefs/WebInsurancePlanBuilder.md` exists — same
 * net-new footing as the mobile screen it mirrors. Not wired, not
 * replacing anything. See NOTES.md.
 *
 * CAUTION — carried over from `InsurancePlanBuilderPreview.tsx` verbatim:
 * a real insurance plan builder is a pricing/underwriting decision, not
 * just a UI pattern — the numbers on this screen are illustrative
 * placeholders, not a rate card, and nothing here computes, quotes, or
 * binds a real premium. Reusing this shape for real needs product +
 * compliance review (actuarial/underwriting sign-off on how a quote is
 * computed and presented), not just a named-reviewer design approval —
 * this is a stronger bar than the Tier-1 design-review process in
 * AGENTS.md/CLAUDE.md, because the risk here is mispriced or misleading
 * insurance terms, not only a safety-critical UI detail. This applies
 * equally to this web layout: it is the same underlying flow as the
 * mobile preview, just arranged for desktop width — no additional
 * review has happened for it either.
 *
 * Reuses the same pieces as the mobile screen — `M2Table`, `StepDiagram`,
 * `M2Pill`, `M2Note`, `M2Card`, `RoundButton` — with a wider desktop
 * layout only: the "who's covered" steppers and coverage chips sit in a
 * left column, the plan comparison table and "how a top-up works" step
 * diagram run wider on the right, and the quote breakdown sits beside the
 * table instead of stacked below it.
 */
export function WebInsurancePlanBuilderPreview(): React.ReactElement {
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [coverage, setCoverage] = useState(COVERAGE_OPTIONS[1]);

  return (
    <WebShellPreview route="insurance">
      <View style={styles.body}>
        <Text style={styles.pageTitle}>[Build your plan]</Text>
        <View style={styles.columns}>
          <View style={styles.leftCol}>
            <M2Card>
              <Text style={m2Text.section}>Who's covered</Text>
              <View style={[styles.countRow, styles.countRowRule]}>
                <Text style={styles.countLabel}>Adults</Text>
                <View style={styles.stepper}>
                  <Pressable role="button" accessibilityRole="button" accessibilityLabel="One fewer adult" onPress={noop}
                    style={({ focused }: PressState) => [styles.stepBtn, focused ? focusRing : null]}>
                    <Icon name="minus" size={16} color={color.action} />
                  </Pressable>
                  <Text style={styles.countValue}>{adults}</Text>
                  <Pressable role="button" accessibilityRole="button" accessibilityLabel="One more adult" onPress={noop}
                    style={({ focused }: PressState) => [styles.stepBtn, focused ? focusRing : null]}>
                    <Icon name="plus" size={16} color={color.action} />
                  </Pressable>
                </View>
              </View>
              <View style={styles.countRow}>
                <Text style={styles.countLabel}>Children</Text>
                <View style={styles.stepper}>
                  <Pressable role="button" accessibilityRole="button" accessibilityLabel="One fewer child" onPress={noop}
                    style={({ focused }: PressState) => [styles.stepBtn, focused ? focusRing : null]}>
                    <Icon name="minus" size={16} color={color.action} />
                  </Pressable>
                  <Text style={styles.countValue}>{children}</Text>
                  <Pressable role="button" accessibilityRole="button" accessibilityLabel="One more child" onPress={noop}
                    style={({ focused }: PressState) => [styles.stepBtn, focused ? focusRing : null]}>
                    <Icon name="plus" size={16} color={color.action} />
                  </Pressable>
                </View>
              </View>
            </M2Card>

            <View>
              <Text style={[m2Text.section, styles.sectionGap]}>Coverage amount</Text>
              <View style={styles.chipRow}>
                {COVERAGE_OPTIONS.map((option) => {
                  const selected = option === coverage;
                  return (
                    <Pressable
                      key={option}
                      role="button"
                      accessibilityRole="button"
                      accessibilityLabel={`Coverage ${option}`}
                      accessibilityState={{ selected }}
                      onPress={() => setCoverage(option)}
                      style={({ focused }: PressState) => [styles.chip, selected ? styles.chipOn : null, focused ? focusRing : null]}
                    >
                      {selected ? <Icon name="check" size={14} color={color.onAction} /> : null}
                      <Text style={[styles.chipText, selected ? styles.chipTextOn : null]}>{option}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <M2Card>
              <Text style={m2Text.section}>[How a top-up works]</Text>
              <View style={styles.stepDiagramWrap}>
                <StepDiagram steps={TOP_UP_STEPS} />
              </View>
            </M2Card>

            <RoundButton icon="shield-check-2" label="Talk to an advisor" onPress={noop} />
          </View>

          <View style={styles.rightCol}>
            <View>
              <Text style={[m2Text.section, styles.sectionGap]}>Compare plans</Text>
              <M2Table caption="Plan comparison" label="Comparing 3 plans" columns={PLAN_COLUMNS} rows={PLAN_ROWS} rowKey={(row) => row.key} />
            </View>

            <M2Card>
              <Text style={m2Text.section}>Quote breakdown</Text>
              <View style={[styles.quoteRow, styles.quoteRule]}>
                <Text style={styles.quoteLabel}>Base price</Text>
                <Text style={styles.quoteValue}>₹[799]</Text>
              </View>
              <View style={[styles.quoteRow, styles.quoteRule]}>
                <Text style={styles.quoteLabel}>Add-ons</Text>
                <Text style={styles.quoteValue}>₹[120]</Text>
              </View>
              <View style={[styles.quoteRow, styles.quoteRule]}>
                <Text style={styles.quoteLabel}>GST</Text>
                <Text style={styles.quoteValue}>₹[83]</Text>
              </View>
              <View style={styles.quoteRow}>
                <Text style={styles.quoteTotalLabel}>Total</Text>
                <Text style={styles.quoteTotalValue}>₹[1,002]/mo</Text>
              </View>
            </M2Card>

            <M2Note tone="info" icon="shield-check-2">
              [This is an illustrative quote. A licensed advisor confirms your actual premium before purchase.]
            </M2Note>
          </View>
        </View>
        <BrandFooter />
      </View>
    </WebShellPreview>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.s24, gap: space.s20, maxWidth: 1040 },
  pageTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  columns: { flexDirection: 'row', gap: space.s24, alignItems: 'flex-start' },
  leftCol: { flex: 1, minWidth: 0, gap: space.s20 },
  rightCol: { flex: 1.4, minWidth: 0, gap: space.s20 },
  sectionGap: { marginBottom: space.s12 },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.s12 },
  countRowRule: { borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  countLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  stepBtn: { width: 32, height: 32, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  countValue: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text, minWidth: 16, textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.s6, height: 40, paddingHorizontal: space.s16, borderRadius: radius.full, borderWidth: 1, borderColor: color.rule, backgroundColor: color.surface, justifyContent: 'center' },
  chipOn: { backgroundColor: color.action, borderColor: color.action },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  chipTextOn: { color: color.onAction },
  planNameCell: { flexDirection: 'row', alignItems: 'center', gap: space.s8, flexWrap: 'wrap' },
  stepDiagramWrap: { marginTop: space.s12 },
  quoteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.s10 },
  quoteRule: { borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  quoteLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  quoteValue: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'right' },
  quoteTotalLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  quoteTotalValue: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'right' },
});
