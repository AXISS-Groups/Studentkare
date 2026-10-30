import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { Button, ErrorState, Rise, Skeleton, useReducedMotion } from '@/design-system';
import {
  Gradient, M2Card, M2Header, M2Heading, M2_NAV_CLEARANCE, NAVY_STOPS, NotYetTile, SoftIcon, heroStops, m2Text, useAmbientMotion, useLift, useLoop,
  useOwnPhoneChrome,
  M2WideColumn,
} from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, motion, radius, shadow, shadowStyle, size, space, webOnly } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { money } from '@/data/types/workflowTypes';
import type { ClaimRequest } from '@/data/types/workflowTypes';
import { shortDate, toDate } from '@/features/phoneboards/format';
import { claimStage, maskPolicy, parseDay } from '../viewmodel/InsuranceViewModel';
import type { InsuranceViewModel } from '../viewmodel/InsuranceViewModel';
import { ClaimSheet, PolicySheet } from './InsuranceSheets';

/**
 * Mobile 2.0 Insurance (canvas page 9 M2Insurance, Tier 2; replaces ClaimsHub
 * on the phone). The policy card is the student's own record of their policy
 * (GET /health/policies), marked as entered by them; "Start a claim" saves a
 * prepared claim (POST /insurance/claims) and "Your claims" shows each one's
 * stage as the server has it. No insurer is connected, so nothing is sent.
 *
 * Shown as not available yet (no backend): E-card, Network hospitals, and
 * the three "More cover" products (the board already says "Not yet").
 * Kept from ClaimsHub: adding a policy when there is none, the expired state,
 * and (web) the full insurance page for eligibility, removing a policy and
 * the benefits guide ("Manage policies and claims").
 */
export interface M2InsuranceLinks {
  back: () => void;
  sos: () => void;
  /** The web's full insurance page (left out where there is none). */
  manage?: () => void;
}

const STAGE_KEYS: readonly MessageKey[] = ['m2.ins.stage.prepared', 'm2.ins.stage.sent', 'm2.ins.stage.decided', 'm2.ins.stage.paid'];

const MORE_COVER: readonly { key: string; label: MessageKey; icon: SkIconName }[] = [
  { key: 'accident', label: 'm2.ins.cover.accident', icon: 'shield-alert' },
  { key: 'topup', label: 'm2.ins.cover.topUp', icon: 'plus' },
  { key: 'travel', label: 'm2.ins.cover.travel', icon: 'plane' },
];

function formatDay(value: string): string {
  const at = parseDay(value);
  return at ? at.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : value;
}

/** The light sweep across the policy card (canvas skShine), only while ambient motion runs. */
function Shine() {
  const ambient = useAmbientMotion();
  const sweep = useLoop(ambient, motion.duration.ambient + motion.duration.base * 3);
  if (!ambient) return null;
  return (
    <Animated.View pointerEvents="none" testID="m2-ins-shine" style={[styles.shine, {
      transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-160, 420] }) }, { rotate: '12deg' }],
    }]} />
  );
}

const PolicyCard = observer(function PolicyCard({ vm }: { vm: InsuranceViewModel }) {
  const t = useT();
  const policy = vm.policy;
  if (!policy) return null;
  const active = vm.policyActive;
  const last = policy.policyNumber.trim().slice(-4);
  return (
    <Gradient colors={NAVY_STOPS} angle={150} style={styles.policy} testID="m2-ins-policy">
      <Shine />
      <View pointerEvents="none" style={styles.policyRing} />
      <View style={styles.policyTop}>
        <Text style={styles.policyEyebrow}>{t('m2.ins.policyEyebrow')}</Text>
        <View style={styles.activeChip} testID="m2-ins-status">
          <View style={[styles.activeDot, { backgroundColor: active ? color.onHeroPositive : color.onHeroAttention }]} />
          <Text style={[styles.activeText, { color: active ? color.onHeroPositive : color.onHeroAttention }]}>{t(active ? 'm2.ins.active' : 'm2.ins.expired')}</Text>
        </View>
      </View>
      <Text style={styles.policyLabel}>{t('m2.ins.sumInsured')}</Text>
      <Text style={styles.amount} testID="m2-ins-sum">{money(policy.sumInsured * 100)}</Text>
      <View style={styles.policyRow}>
        <View style={[styles.policyCell, styles.policyCellGrow]}>
          <Text style={styles.policyLabel}>{t('m2.ins.insurer')}</Text>
          <Text numberOfLines={2} style={styles.policyValue}>{policy.insurer}</Text>
        </View>
        <View style={styles.policyCell}>
          <Text style={styles.policyLabel}>{t('m2.ins.validTill')}</Text>
          <Text numberOfLines={1} style={styles.policyValue}>{formatDay(policy.validUntil)}</Text>
        </View>
        <View style={styles.policyCell} accessible accessibilityLabel={`${t('m2.ins.policy')}: ${t('m2.ins.policyEnding', { last })}`} aria-label={`${t('m2.ins.policy')}: ${t('m2.ins.policyEnding', { last })}`}>
          <Text style={styles.policyLabel}>{t('m2.ins.policy')}</Text>
          <Text numberOfLines={1} style={[styles.policyValue, styles.mono]}>{maskPolicy(policy.policyNumber)}</Text>
        </View>
      </View>
      <Text style={styles.recorded}>{t('m2.ins.userRecorded')}</Text>
    </Gradient>
  );
});

/** The claim's stage bar: fills to its stage once (canvas skFill), or is drawn filled under reduced motion. */
function StageBar({ step }: { step: number }) {
  const reduced = useReducedMotion();
  const target = step / 4;
  const fill = useRef(new Animated.Value(reduced ? target : 0)).current;
  useEffect(() => {
    if (reduced) { fill.setValue(target); return undefined; }
    const anim = Animated.timing(fill, { toValue: target, duration: motion.duration.base * 3, delay: motion.duration.base, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [reduced, target, fill]);
  const paid = step === 4;
  return (
    <View style={styles.track}>
      <Animated.View style={[styles.barBox, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}>
        <Gradient colors={paid ? [color.positiveFill, color.positive] : [color.serviceAmber, color.attention]} angle={90} style={styles.bar} />
      </Animated.View>
    </View>
  );
}

function ClaimRow({ claim }: { claim: ClaimRequest }) {
  const t = useT();
  const stage = claimStage(claim.status);
  const at = toDate(claim.createdAt);
  const month = at ? at.toLocaleDateString(undefined, { month: 'short' }) : '';
  const what = claim.service || claim.providerName;
  const title = what ? t('m2.ins.claimTitle', { service: what, month }) : t('m2.ins.claimFallback');
  const paid = stage.step === 4;
  const spoken = t('m2.ins.claimSpoken', { title, state: t(stage.label), step: String(stage.step) });
  return (
    <View style={styles.claim} testID={`m2-ins-claim-${claim.id}`} accessible accessibilityLabel={`${spoken}. ${t('m2.ins.claimMeta', { amount: money(claim.amountPaise), date: shortDate(claim.createdAt) })}`}>
      <View style={styles.claimTop}>
        <View style={styles.grow}>
          <Text style={m2Text.cardTitle}>{title}</Text>
          <Text style={m2Text.meta}>{t('m2.ins.claimMeta', { amount: money(claim.amountPaise), date: shortDate(claim.createdAt) })}</Text>
        </View>
        <View style={[styles.statePill, { backgroundColor: paid ? color.positiveBg : color.attentionBg }]}>
          <Text style={[styles.statePillText, { color: paid ? color.positive : color.attention }]}>{t(stage.label)}</Text>
        </View>
      </View>
      <StageBar step={stage.step} />
      <View style={styles.stages}>
        {STAGE_KEYS.map((k) => <Text key={k} style={styles.stageText}>{t(k)}</Text>)}
      </View>
    </View>
  );
}

function ActionTile({ icon, label, onPress, testID }: { icon: SkIconName; label: string; onPress: () => void; testID: string }) {
  const lift = useLift();
  return (
    <Pressable role="button" accessibilityRole="button" accessibilityLabel={label} aria-label={label} onPress={onPress} testID={testID}
      style={(s: PressState) => [styles.tilePress, lift(s)]}>
      <Gradient colors={heroStops('green')} angle={150} style={styles.tile}>
        <Icon name={icon} size={22} color={color.onHero} strokeWidth={2.1} />
        <Text style={styles.tileLabelOn}>{label}</Text>
      </Gradient>
    </Pressable>
  );
}

export const M2InsuranceView = observer(function M2InsuranceView({ vm, links, wide = false }: { vm: InsuranceViewModel; links: M2InsuranceLinks; /** Laid out wide in the desktop web shell (parity phase 2). */ wide?: boolean }) {
  const t = useT();
  useOwnPhoneChrome();
  const [sheet, setSheet] = useState<'policy' | 'claim' | null>(null);
  const hasPolicy = vm.policy !== null;
  const startClaim = () => setSheet(hasPolicy ? 'claim' : 'policy');

  // Wide, the shell's page column gives the gutter (parity phase 2).
  const gutter = wide ? undefined : styles.gutter;
  const board = (
    <>
        {Platform.OS === 'web' && !wide ? <View pointerEvents="none" style={styles.glow} /> : null}
        <Rise>
          <M2Header backLabel={t('m2.backHome')} onBack={links.back} eyebrow={t('m2.ins.eyebrow')} title={t('m2.ins.title')} testID="m2-ins-header"
            // Wide, the web shell's top bar carries SOS on every page.
            sos={wide ? false : { label: t('m2.sos'), spoken: t('m2.sosSpoken'), onPress: links.sos }} />
        </Rise>

        <Rise index={1} style={gutter}>
          {vm.phase === 'loading' ? <Skeleton label={t('m2.ins.loading')} lines={['100%', '60%', '100%']} /> : null}
          {vm.phase === 'error' ? (
            <ErrorState title={t('m2.ins.failedTitle')} body={t('m2.ins.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} />
          ) : null}
          {vm.phase === 'ready' && hasPolicy ? <PolicyCard vm={vm} /> : null}
          {vm.phase === 'ready' && !hasPolicy ? (
            <M2Card style={styles.noPolicy} testID="m2-ins-no-policy">
              <SoftIcon icon="shield" hue="green" tile={44} iconSize={22} />
              <M2Heading style={m2Text.section}>{t('m2.ins.noPolicyTitle')}</M2Heading>
              <Text style={m2Text.body}>{t('m2.ins.noPolicyBody')}</Text>
              <Button label={t('m2.ins.addPolicy')} onPress={() => setSheet('policy')} testID="m2-ins-add-policy" />
            </M2Card>
          ) : null}
        </Rise>

        <Rise index={2} style={[gutter, styles.row3]}>
          <ActionTile icon="plus" label={t('m2.ins.startClaim')} onPress={startClaim} testID="m2-ins-start-claim" />
          <NotYetTile icon="card-lines" title={t('m2.ins.eCard')} note={t('m2.notYet')} style={styles.notYet} testID="m2-ins-ecard" />
          <NotYetTile icon="home-2" title={t('m2.ins.network')} note={t('m2.notYet')} style={styles.notYet} testID="m2-ins-network" />
        </Rise>

        {vm.phase === 'ready' ? (
          <Rise index={3} style={gutter}>
            <M2Card style={styles.claims} testID="m2-ins-claims">
              <M2Heading style={styles.claimsHead}>{t('m2.ins.claims')}</M2Heading>
              {vm.claimsFailed ? (
                <ErrorState title={t('m2.ins.failedTitle')} body={t('m2.ins.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.reloadClaims()} />
              ) : null}
              {!vm.claimsFailed && vm.claims.length === 0 ? <Text style={[m2Text.body, styles.noClaims]} testID="m2-ins-no-claims">{t('m2.ins.noClaims')}</Text> : null}
              {vm.claims.map((c) => <ClaimRow key={c.id} claim={c} />)}
              <Text style={styles.note}>{t('m2.ins.claimsNote')}</Text>
              {links.manage ? (
                <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.ins.manage')} aria-label={t('m2.ins.manage')} onPress={links.manage} testID="m2-ins-manage"
                  style={({ focused }: PressState) => [styles.manage, focused ? focusRing : null]}>
                  <Text style={m2Text.link}>{t('m2.ins.manage')}</Text>
                  <Icon name="chevron-right" size={16} color={color.action} strokeWidth={2.6} />
                </Pressable>
              ) : null}
            </M2Card>
          </Rise>
        ) : null}

        <Rise index={4} style={gutter}>
          <M2Heading style={m2Text.section}>{t('m2.ins.moreCover')}</M2Heading>
          <Text style={[m2Text.meta, styles.coverSub]}>{t('m2.ins.moreCoverSub')}</Text>
          <View style={styles.row3}>
            {MORE_COVER.map((c) => (
              <View key={c.key} style={styles.cover} testID={`m2-ins-cover-${c.key}`} accessible accessibilityLabel={`${t(c.label)}, ${t('m2.ins.notYet')}`} aria-label={`${t(c.label)}, ${t('m2.ins.notYet')}`}>
                <SoftIcon icon={c.icon} hue="indigo" neutral tile={38} iconSize={20} />
                <Text style={styles.coverName}>{t(c.label)}</Text>
                <Text style={styles.coverNote}>{t('m2.ins.notYet')}</Text>
              </View>
            ))}
          </View>
        </Rise>
    </>
  );
  return (
    <>
      {wide ? <M2WideColumn testID="m2-insurance">{board}</M2WideColumn> : (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-insurance">{board}</ScrollView>
      )}
      <PolicySheet vm={vm} visible={sheet === 'policy'} onClose={() => setSheet(null)} />
      <ClaimSheet vm={vm} visible={sheet === 'claim'} onClose={() => setSheet(null)} />
    </>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center', overflow: 'hidden' },
  glow: {
    position: 'absolute', top: -140, right: -110, width: 330, height: 330, borderRadius: radius.full,
    ...webOnly({ backgroundImage: `radial-gradient(circle, ${color.serviceGreenSoft}, transparent 70%)` }),
  },
  gutter: { paddingHorizontal: space.gutterPhone },
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  row3: { flexDirection: 'row', gap: space.s10 },
  policy: { borderRadius: 28, padding: space.s20, minHeight: 206, overflow: 'hidden', ...shadowStyle(shadow.float) },
  shine: { position: 'absolute', top: -60, left: 0, width: 110, height: 340, backgroundColor: color.onHeroVeil },
  policyRing: { position: 'absolute', right: -50, bottom: -70, width: 200, height: 200, borderRadius: radius.full, borderWidth: 28, borderColor: color.onHeroRule },
  policyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s8, marginBottom: space.s16 },
  policyEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1.2, textTransform: 'uppercase', color: color.onHeroLabel },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: space.s6, paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full, backgroundColor: color.onHeroVeil },
  activeDot: { width: 7, height: 7, borderRadius: radius.full },
  activeText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  policyLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.onHeroLabel },
  amount: { fontFamily: font.family.sans, fontSize: font.size.display, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.9, color: color.onHero, fontVariant: ['tabular-nums'] },
  policyRow: { flexDirection: 'row', gap: space.s14, marginTop: space.s14 },
  policyCell: { flexShrink: 0, gap: space.s2 },
  policyCellGrow: { flex: 1, flexShrink: 1, minWidth: 0 },
  policyValue: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  mono: { fontFamily: font.family.mono, fontWeight: fontWeight(font.weight.strong) },
  recorded: { marginTop: space.s14, fontFamily: font.family.sans, fontSize: font.size.caption, color: color.onHero2 },
  noPolicy: { padding: space.s20, gap: space.s10, alignItems: 'flex-start' },
  tilePress: { flex: 1, minWidth: 0, borderRadius: radius.xl, ...shadowStyle(shadow.card) },
  tile: { flex: 1, minHeight: 86, borderRadius: radius.xl, paddingVertical: space.s12, paddingHorizontal: space.s10, gap: space.s8 },
  tileLabelOn: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: 16, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  notYet: { flex: 1, minWidth: 0, minHeight: 86 },
  claims: { borderRadius: 26, padding: space.s16 },
  claimsHead: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginBottom: space.s4 },
  noClaims: { paddingVertical: space.s12, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  claim: { paddingVertical: space.s14, borderTopWidth: 1, borderTopColor: color.ruleSoft, gap: space.s10 },
  claimTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.s10 },
  statePill: { flexShrink: 0, paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full },
  statePillText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  track: { height: 6, borderRadius: radius.full, backgroundColor: color.surface3, overflow: 'hidden' },
  barBox: { height: '100%' },
  bar: { flex: 1, borderRadius: radius.full },
  stages: { flexDirection: 'row', justifyContent: 'space-between' },
  stageText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  note: { marginTop: space.s4, fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: 17, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  manage: { minHeight: size.touchTarget, marginTop: space.s4, flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  coverSub: { marginTop: space.s4, marginBottom: space.s12 },
  cover: {
    flex: 1, minWidth: 0, borderRadius: radius.xl, paddingVertical: space.s12, paddingHorizontal: space.s10, gap: space.s8,
    backgroundColor: color.surface, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.rule,
  },
  coverName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: 16, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  coverNote: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
});
