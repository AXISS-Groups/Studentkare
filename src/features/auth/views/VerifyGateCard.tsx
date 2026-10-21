import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Skeleton } from '@/design-system';
import { Icon3d } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { IdentityVerifyViewModel } from '../viewmodel/IdentityVerifyViewModel';
import { IdentityCheckRow } from './IdentityCheckRow';

/** "Always open without verification": each one a real place, never behind the gate. */
export interface AlwaysOpenLinks {
  crisis: () => void;
  sos: () => void;
  emergencyCard: () => void;
  /** Omitted where the platform has no help screen yet. */
  help?: () => void;
}

export interface VerifyGateLinks {
  finish: () => void;
  notNow: () => void;
  always: AlwaysOpenLinks;
}

const ALWAYS: readonly { key: keyof AlwaysOpenLinks; label: MessageKey }[] = [
  { key: 'crisis', label: 'ident.gate.crisis' },
  { key: 'sos', label: 'ident.gate.sos' },
  { key: 'emergencyCard', label: 'ident.gate.card' },
  { key: 'help', label: 'ident.gate.help' },
];

/**
 * Verification gate (canvas VerifyGate / WebVerifyGate, Tier 1, approved 2026-10-21).
 *
 * The gate never decides what is blocked: the server enforces that. It shows the
 * four checks from GET /identity (only the server marks one done), and it is
 * never a dead end: "Not now" always closes it. The always-open links are drawn
 * first and outside any loading or error state, so crisis help, SOS, the
 * emergency card and help are reachable even when /identity is slow or fails.
 */
export const VerifyGateCard = observer(function VerifyGateCard({ viewModel: vm, links, wide = false }: { viewModel: IdentityVerifyViewModel; links: VerifyGateLinks; wide?: boolean }) {
  const t = useT();
  const share = vm.availableCount > 0 ? vm.verifiedCount / vm.availableCount : 0;
  const always = ALWAYS.filter((item) => links.always[item.key]);

  const alwaysOpen = (
    <View style={styles.always} testID="gate-always-open">
      <Text style={styles.alwaysLead}>{t('ident.gate.always')}</Text>
      {always.map((item) => (
        <Pressable
          key={item.key}
          role="link"
          accessibilityRole="link"
          testID={`gate-always-${item.key}`}
          onPress={() => links.always[item.key]?.()}
          style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.alwaysLink, focused ? focusRing : null]}
        >
          <Text style={styles.alwaysText}>{t(item.label)}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Icon3d name="shield--p5" size={52} />
        <View style={styles.headWords}>
          <Text accessibilityRole="header" nativeID="verify-gate-title" style={styles.title}>{t('ident.gate.title')}</Text>
          <Text style={styles.lead}>{t('ident.gate.lead')}</Text>
        </View>
      </View>

      {vm.loading ? <Skeleton label={t('ident.gate.loading')} lines={['100%', '100%', '100%', '100%']} /> : null}
      {vm.loadFailed ? (
        <View style={styles.failed} accessibilityRole="alert">
          <Text style={styles.failedText}>{t('ident.gate.failed')}</Text>
          <Button variant="secondary" label={t('common.tryAgain')} onPress={() => void vm.load()} />
        </View>
      ) : null}

      {!vm.loading && !vm.loadFailed ? (
        <>
          <View style={styles.progress}>
            <View
              style={styles.track}
              role="progressbar"
              accessibilityRole="progressbar"
              aria-valuemin={0}
              aria-valuemax={vm.availableCount}
              aria-valuenow={vm.verifiedCount}
              accessibilityLabel={t('ident.verify.ring', { done: vm.verifiedCount, total: vm.availableCount })}
            >
              <View style={[styles.fill, { width: `${Math.round(share * 100)}%` }]} />
            </View>
            <Text style={styles.count}>{`${vm.verifiedCount}/${vm.availableCount}`}</Text>
          </View>
          <View style={styles.rows} role="list">
            {vm.checks.map((check) => (
              <View key={check.id} role="listitem">
                <IdentityCheckRow check={check} testID={`gate-${check.id}`} />
              </View>
            ))}
          </View>
        </>
      ) : null}

      <View style={[styles.actions, wide ? styles.actionsWide : null]}>
        {wide ? (
          <View style={styles.flex1}><Button variant="secondary" fullWidth label={t('gate.notNow')} onPress={links.notNow} testID="gate-not-now" /></View>
        ) : null}
        <View style={wide ? styles.flex1 : null}>
          <Button size="cta" fullWidth label={t('ident.gate.finish')} onPress={links.finish} testID="gate-finish" />
        </View>
      </View>

      {alwaysOpen}
      {wide ? null : (
        <Pressable
          role="button"
          accessibilityRole="button"
          testID="gate-not-now"
          onPress={links.notNow}
          style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.notNow, focused ? focusRing : null]}
        >
          <Text style={styles.notNowText}>{t('gate.notNow')}</Text>
        </Pressable>
      )}
    </View>
  );
});

/** The card with its own view model (GET /identity on open). */
export function VerifyGateRoute({ links, wide = false }: { links: VerifyGateLinks; wide?: boolean }): React.ReactElement {
  const [vm] = useState(() => new IdentityVerifyViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <VerifyGateCard viewModel={vm} links={links} wide={wide} />;
}

const styles = StyleSheet.create({
  card: { gap: space.s16, width: '100%' },
  head: { flexDirection: 'row', gap: space.s14, alignItems: 'center' },
  headWords: { flex: 1, gap: space.s4 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  lead: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, lineHeight: font.size.bodySm * font.lineHeight.body },
  progress: { flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  track: { flex: 1, height: 8, borderRadius: radius.full, backgroundColor: color.surface3, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.full, backgroundColor: color.action },
  count: { fontFamily: font.family.mono, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  rows: { gap: space.s10 },
  failed: { gap: space.s10, padding: space.s14, borderRadius: radius.lg, backgroundColor: color.surface2 },
  failedText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text, lineHeight: font.size.bodySm * font.lineHeight.body },
  actions: { gap: space.s12 },
  actionsWide: { flexDirection: 'row' },
  flex1: { flex: 1 },
  always: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.s10, paddingHorizontal: space.s14,
    paddingVertical: space.s6, borderRadius: radius.lg, backgroundColor: color.dangerBg, borderWidth: 1, borderColor: color.dangerRule,
  },
  alwaysLead: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.danger },
  alwaysLink: { minHeight: size.touchTarget, justifyContent: 'center' },
  alwaysText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.danger, textDecorationLine: 'underline' },
  notNow: { minHeight: size.touchTarget, alignItems: 'center', justifyContent: 'center' },
  notNowText: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
});
