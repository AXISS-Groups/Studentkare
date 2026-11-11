import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { StatusPill } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, RoundButton, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { WebShellPreview } from './WebShellPreview';
import { BrandFooter } from './BrandFooter';

const noop = () => undefined;

const ESTIMATES: ReadonlyArray<{ name: string; range: string }> = [
  { name: '[Laparoscopic gallbladder removal]', range: '[₹85,000 – ₹1,40,000]' },
  { name: '[Knee arthroscopy]', range: '[₹1,10,000 – ₹1,90,000]' },
  { name: '[Appendix removal]', range: '[₹65,000 – ₹1,05,000]' },
];

/**
 * Flat, non-functional preview of WebSecondOpinion — the web counterpart
 * of `SecondOpinionPreview.tsx`, inside the real `StudentWebShell`. Part
 * of the 2026-11-11 gap-analysis pass; no
 * `design/screens/briefs/WebSecondOpinion.md` exists — same net-new
 * footing as the mobile screen it mirrors.
 *
 * CAUTION — carried over from `SecondOpinionPreview.tsx` verbatim, because
 * it applies just as much to this web layout:
 *
 * (a) This is a UI-shape preview only — layout, copy and component
 *     choices, nothing else. Nothing here is wired, nothing here reads
 *     or writes real data, and nothing here is a built feature.
 *
 * (b) A real "second opinion" / surgical cost-estimator feature is a NEW
 *     CLINICAL SERVICE LINE — surgical referrals and second-opinion
 *     review are not a UI pattern to restyle, they are a new category of
 *     clinical work this platform does not currently do. Before any real
 *     engineering starts this needs an explicit product +
 *     clinical-governance decision covering, at minimum: who reviews a
 *     submitted request (which clinician, what credentialing), what
 *     liability and consent language is required of the student before a
 *     request is even accepted, and how the cost ranges shown would
 *     actually be sourced (which hospitals, how current, who is
 *     accountable for them being right). That is a different, heavier
 *     bar than the named-reviewer content check that gates an ordinary
 *     Tier 1 screen — this screen does not claim that bar has been
 *     cleared.
 *
 * (c) Built 2026-11-11 as part of a gap-analysis pass, at Krishna's
 *     explicit request to preview this direction (same request that
 *     produced the mobile version) — this caveat is stated up front for
 *     exactly that reason. Not wired, not replacing anything, alongside
 *     the real screens. See NOTES.md.
 *
 * Reuses the same pieces as the mobile screen — `M2Card`, `M2Note`,
 * `GlossTile`, `RoundButton`, `StatusPill`, `m2Text` — with a wider
 * desktop layout only: the three illustrative cost-range cards sit side
 * by side instead of a mobile stack; the describe-diagnosis text area,
 * upload-reports row, submit button and the request-status card keep
 * the same single-column reading order as the mobile version, since
 * that is a form flow, not a layout that benefits from splitting.
 */
export function WebSecondOpinionPreview(): React.ReactElement {
  return (
    <WebShellPreview route="care-navigator">
      <View style={styles.body}>
        <Text style={styles.pageTitle}>[Get a second opinion]</Text>

        <M2Note tone="attention" icon="shield-check" title="This is a preview, not a built feature">
          A real second opinion and cost estimator would be a new kind of clinical service for this platform — who reviews it, what consent it needs and where cost figures come from all need a decision first. Nothing on this screen is wired or real.
        </M2Note>

        <View style={styles.introRow}>
          <GlossTile icon="doctor" hue="indigo" size={48} />
          <Text style={styles.introText}>[If a doctor has recommended surgery, a second clinician can review your case and share their own view before you decide — no appointment needed.]</Text>
        </View>

        <Text style={m2Text.section}>[Describe your diagnosis or planned procedure]</Text>
        <M2Card style={styles.textareaCard}>
          <Text style={styles.textareaPlaceholder}>[e.g. "My doctor recommended gallbladder removal after an ultrasound showed stones. I'd like a second opinion before scheduling."]</Text>
        </M2Card>

        <Pressable role="button" accessibilityRole="button" accessibilityLabel="Upload existing reports (optional)" onPress={noop} style={({ focused }: PressState) => [styles.uploadRow, focused ? focusRing : null]}>
          <Icon name="cloud-upload" size={20} color={color.action} />
          <View style={styles.uploadWords}>
            <Text style={styles.uploadLabel}>[Upload existing reports (optional)]</Text>
            <Text style={m2Text.meta}>[Scans, lab results or a doctor's note]</Text>
          </View>
          <Icon name="doc-upload" size={18} color={color.text3} />
        </Pressable>

        <View style={styles.submitBlock}>
          <Pressable role="button" accessibilityRole="button" accessibilityLabel="Submit for review" onPress={noop} style={({ focused }: PressState) => [styles.submitBtn, focused ? focusRing : null]}>
            <Text style={styles.submitBtnText}>[Submit for review]</Text>
          </Pressable>
          <M2Note tone="info" icon="doctor-alt">
            A human clinician reviews every request — this is never an instant, AI-generated opinion. Expect a personal response, not an automated one.
          </M2Note>
        </View>

        <View style={styles.divider} />

        <Text style={m2Text.section}>[Estimate surgery cost]</Text>
        <M2Note tone="info" icon="percent">
          These are illustrative ranges only, not a quote — the actual cost varies by hospital, surgeon and case complexity, and is never guaranteed by this screen.
        </M2Note>
        <View style={styles.estimateRow}>
          {ESTIMATES.map((item) => (
            <M2Card key={item.name} style={styles.estimateCard}>
              <GlossTile icon="hospital" hue="teal" size={40} />
              <View style={styles.estimateWords}>
                <Text style={styles.estimateName}>{item.name}</Text>
                <Text style={styles.estimateRange}>{item.range}</Text>
              </View>
            </M2Card>
          ))}
        </View>

        <View style={styles.divider} />

        <Text style={m2Text.section}>[Your request]</Text>
        <M2Card style={styles.statusCard}>
          <View style={styles.statusTop}>
            <Icon name="stethoscope-2" size={18} color={color.text2} />
            <Text style={styles.statusProcedure}>[Laparoscopic gallbladder removal — submitted]</Text>
          </View>
          <StatusPill tone="attention">[Pending review]</StatusPill>
          <View style={styles.statusEtaRow}>
            <Icon name="check-circle-2" size={14} color={color.text3} />
            <Text style={m2Text.meta}>[Typically reviewed within 3-5 business days]</Text>
          </View>
        </M2Card>

        <RoundButton icon="stethoscope" label="View review status" onPress={noop} />
        <BrandFooter />
      </View>
    </WebShellPreview>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.s24, gap: space.s16, maxWidth: 880 },
  pageTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s14, borderRadius: radius.lg, backgroundColor: color.surface },
  introText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  textareaCard: { minHeight: 96, justifyContent: 'flex-start', maxWidth: 640 },
  textareaPlaceholder: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, fontWeight: fontWeight(font.weight.regular), color: color.text3 },
  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s14, borderRadius: radius.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft, maxWidth: 640 },
  uploadWords: { flex: 1, gap: space.s2 },
  uploadLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  submitBlock: { gap: space.s12, marginTop: space.s4, maxWidth: 640 },
  submitBtn: { height: 50, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  divider: { height: 1, backgroundColor: color.ruleSoft, marginVertical: space.s4 },
  estimateRow: { flexDirection: 'row', gap: space.s12 },
  estimateCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  estimateWords: { flex: 1, gap: space.s2 },
  estimateName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  estimateRange: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  statusCard: { gap: space.s10, alignItems: 'flex-start', maxWidth: 640 },
  statusTop: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  statusProcedure: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  statusEtaRow: { flexDirection: 'row', alignItems: 'center', gap: space.s6 },
});
