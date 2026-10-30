import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { OfflineBanner, TELE_MANAS_NUMBER, useOnline } from '@/design-system';
import { M2Card, M2HeaderSos, M2WideColumn, M2_NAV_CLEARANCE, RoundButton, m2Text, useM2Layout, useOwnPhoneChrome, M2Heading, webAttrs } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, shadow, shadowStyle, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { AyushViewModel } from '../viewmodel/AyushViewModel';
import { AyushThread, Orb } from './AyushThread';
import type { AyushThreadLinks } from './AyushThread';

/**
 * Mobile 2.0 Ask Ayush (canvas page 9 M2AskAyush, Tier 1), in GENERAL MODE
 * only (plan package A, approved by Krishna Chintakayala 2026-10-21): Ayush
 * answers from approved sources through the server agent (crisis gate first,
 * scope guard, grounding and output guards, unchanged) and cannot read the
 * student's records (D-M2-13 not built; the AI-constitution owner signs that
 * part). So the banner says Ayush can't read records, record suggestions and
 * the report card are not drawn, and the header says "Answers from approved
 * sources. Not a doctor." instead of "Explains your own records".
 *
 * The crisis card comes from the server's CRISIS outcome and stays while it is
 * the latest answer (D7-5); the Tele-MANAS line is always on screen and needs
 * no request.
 *
 * One view at every width (Tier 1 parity plan 2026-10-24 §9, Q2): on desktop
 * the chat column sits beside the web board's side column (what Ayush will not
 * do, the transcript note, talk to a person); on a phone "What Ayush won't do"
 * is a card under the banner, closed until opened. SOS is the shell's (§1).
 */
export interface M2AskAyushLinks extends AyushThreadLinks {
  back: () => void;
  /** Where the student turns Ayush history on or off. Omitted where there is no such screen. */
  manageHistory?: () => void;
}

/** What the server refuses before or after retrieval (agent_ayush.py: scope guard, vault boundary, grounding floor). */
const LIMITS: ReadonlyArray<{ title: MessageKey; meta: MessageKey }> = [
  { title: 'swt.ayush.limit.diagnose', meta: 'swt.ayush.limit.diagnoseMeta' },
  { title: 'swt.ayush.limit.prescribe', meta: 'swt.ayush.limit.prescribeMeta' },
  { title: 'swt.ayush.limit.vault', meta: 'swt.ayush.limit.vaultMeta' },
  { title: 'swt.ayush.limit.source', meta: 'swt.ayush.limit.sourceMeta' },
];

function LimitRows() {
  const t = useT();
  return (
    <View style={styles.limits} testID="m2-ask-limit-rows">
      {LIMITS.map((limit) => (
        <View key={limit.title} style={styles.limit}>
          <View style={styles.limitIcon}><Icon name="lock-4" size={15} color={color.text2} /></View>
          <View style={styles.grow}>
            <Text style={m2Text.cardTitle}>{t(limit.title)}</Text>
            <Text style={m2Text.meta}>{t(limit.meta)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Phone: "What Ayush won't do" as a card that opens in place (closed at first). */
function LimitsCard() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <M2Card style={styles.limitsCard} testID="m2-ask-limits">
      <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('swt.ayush.limitsTitle')} aria-label={t('swt.ayush.limitsTitle')}
        aria-expanded={open} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} testID="m2-ask-limits-toggle"
        style={({ focused }: PressState) => [styles.limitsHead, focused ? focusRing : null]}>
        <Text style={[m2Text.cardTitle, styles.grow]}>{t('swt.ayush.limitsTitle')}</Text>
        <Icon name="chevron-right" size={16} color={color.text3} strokeWidth={2.6} />
      </Pressable>
      {open ? <LimitRows /> : null}
    </M2Card>
  );
}

/** Desktop: the web board's side column, in M2 cards with the same words. */
function SideColumn({ links }: { links: M2AskAyushLinks }) {
  const t = useT();
  return (
    <View style={styles.side} testID="m2-ask-side" {...webAttrs({ role: 'complementary', 'aria-label': t('swt.ayush.limitsTitle') })}>
      <M2Card style={styles.sideCard}>
        <Text style={m2Text.eyebrow}>{t('swt.ayush.limitsTitle')}</Text>
        <LimitRows />
      </M2Card>
      <M2Card style={styles.sideCard} testID="m2-ask-transcript">
        <Text style={m2Text.eyebrow}>{t('swt.ayush.transcriptTitle')}</Text>
        <Text style={m2Text.body}>{t('swt.ayush.transcriptBody')}</Text>
        {links.manageHistory ? (
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('swt.ayush.manage')} aria-label={t('swt.ayush.manage')} onPress={links.manageHistory}
            testID="m2-ask-manage" style={({ focused }: PressState) => [styles.link, focused ? focusRing : null]}>
            <Text style={m2Text.link}>{t('swt.ayush.manage')}</Text>
          </Pressable>
        ) : null}
      </M2Card>
      <M2Card style={styles.sideCard} testID="m2-ask-person">
        <M2Heading style={m2Text.cardTitle}>{t('swt.ayush.personTitle')}</M2Heading>
        <Text style={m2Text.body}>{t('swt.ayush.personBody')}</Text>
        <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('swt.crisis.callTelemanas')} aria-label={t('swt.crisis.callTelemanas')}
          onPress={() => void Linking.openURL(`tel:${TELE_MANAS_NUMBER}`)} testID="m2-ask-person-call"
          style={({ focused }: PressState) => [styles.personCall, focused ? focusRing : null]}>
          <Icon name="phone-2" size={17} color={color.action} />
          <Text style={styles.personCallText}>{t('swt.ayush.callTelemanas')}</Text>
        </Pressable>
      </M2Card>
    </View>
  );
}

/** Desktop: chat and side column side by side; narrower (a tablet column), one under the other. */
function WideBody({ chat, side }: { chat: React.ReactNode; side: React.ReactNode }) {
  const desktop = useM2Layout() === 'desktop';
  return (
    <View style={desktop ? styles.split : styles.stack} testID="m2-ask-split">
      <View style={[styles.stack, desktop ? styles.chatColumn : null]}>{chat}</View>
      <View style={desktop ? styles.sideColumn : null}>{side}</View>
    </View>
  );
}

export const M2AskAyushView = observer(function M2AskAyushView({ vm, links, wide = false }: {
  vm: AyushViewModel; links: M2AskAyushLinks;
  /** Laid out wide in the desktop web shell (parity plan §9): chat column and side column. */
  wide?: boolean;
}) {
  const t = useT();
  useOwnPhoneChrome();
  const online = useOnline();
  const inset = wide ? 0 : space.gutterPhone;
  const gutter = wide ? undefined : styles.gutter;

  const header = (
    <View style={[styles.header, wide ? styles.headerWide : null]}>
      <RoundButton icon="arrow-left" label={t('m2.ask.back')} onPress={links.back} testID="m2-ask-back" />
      <Orb />
      <View style={styles.grow}>
        <View style={styles.titleRow}>
          <M2Heading level={1} style={styles.title}>{t('m2.ask.title')}</M2Heading>
          <View style={styles.beta}><Text style={styles.betaText}>{t('m2.ask.beta')}</Text></View>
        </View>
        <Text style={m2Text.meta}>{t('m2.ask.sub')}</Text>
      </View>
      <M2HeaderSos testID="m2-ask-sos" />
    </View>
  );
  const banner = (
    <View style={[styles.banner, wide ? styles.bannerWide : null]} testID="m2-ask-banner">
      <Icon name="shield" size={18} color={color.text2} />
      <Text style={[styles.bannerText, styles.grow]}>{t('m2.ask.noRecords')}</Text>
    </View>
  );
  const offline = !online ? <View style={gutter}><OfflineBanner message={t('m2.ask.offline')} /></View> : null;
  const thread = <AyushThread vm={vm} online={online} links={links} inset={inset} wide={wide} />;

  if (wide) {
    return (
      <M2WideColumn testID="m2-ask-ayush">
        {header}
        <WideBody chat={<>{banner}{offline}{thread}</>} side={<SideColumn links={links} />} />
      </M2WideColumn>
    );
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="m2-ask-ayush">
      <View pointerEvents="none" style={styles.glow} />
      {header}
      {banner}
      <View style={styles.gutter}><LimitsCard /></View>
      {offline}
      {thread}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s12, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', top: -160, left: -60, width: 420, height: 360, borderRadius: radius.full, backgroundColor: color.surface3, opacity: 0.8 },
  gutter: { paddingHorizontal: space.gutterPhone },
  grow: { flex: 1, minWidth: 0 },
  header: { paddingTop: space.s16, paddingHorizontal: space.gutterPhone, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.s6 },
  title: { fontFamily: font.family.sans, fontSize: 19, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  beta: { paddingHorizontal: space.s8, paddingVertical: space.s2, borderRadius: radius.full, backgroundColor: color.neutralBg },
  betaText: { fontFamily: font.family.sans, fontSize: 10.5, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  banner: {
    marginHorizontal: space.gutterPhone, paddingVertical: space.s10, paddingHorizontal: space.s12, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', gap: space.s10,
    backgroundColor: color.surface, ...shadowStyle(shadow.hairline),
  },
  bannerText: { fontFamily: font.family.sans, fontSize: 11.5, lineHeight: 16, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  headerWide: { paddingHorizontal: 0 },
  bannerWide: { marginHorizontal: 0 },
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s24 },
  stack: { gap: space.s12 },
  chatColumn: { flex: 1, minWidth: 0, maxWidth: size.panelMax + space.s40 + space.s40 },
  sideColumn: { width: size.phoneWidth, flexShrink: 0 },
  side: { gap: space.s16 },
  sideCard: { padding: space.s16, gap: space.s10, borderRadius: radius.xl },
  limits: { gap: space.s12 },
  limit: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s10 },
  limitIcon: { width: 28, height: 28, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.neutralBg },
  limitsCard: { paddingHorizontal: space.s14, paddingVertical: space.s4, borderRadius: radius.lg, gap: space.s8, ...shadowStyle(shadow.hairline) },
  limitsHead: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  link: { minHeight: size.touchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  personCall: {
    minHeight: size.touchTarget, alignSelf: 'flex-start', paddingHorizontal: space.s14, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: space.s8,
    borderWidth: 1.5, borderColor: color.action,
  },
  personCallText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
});
