import React, { useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { Button, OfflineBanner, RadioGroup, Rise, Sheet, Skeleton, useOnline } from '@/design-system';
import {
  cardLabel,
  Gradient, LiftCard, M2Card, M2Heading, M2_NAV_CLEARANCE, ProgressRing, SosButton, heroStops, m2Text, useAmbientMotion, useLift, useLoop, useOwnPhoneChrome,
} from '@/design-system/m2';
import type { PressState, ServiceHue } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, motion, radius, shadow, shadowStyle, size, space, webOnly } from '@/design-system/theme';
import { LANGUAGE_NAMES, useLanguage, useT } from '@/i18n';
import type { Lang, MessageKey } from '@/i18n';
import { shortDate } from '@/features/phoneboards/format';
import { initials } from '@/features/m2store/views/M2HomeView';
import { CardError, NavyHero, TileIcon } from '@/features/m2health/HealthParts';
import { DOCUMENT_CARDS, countOf } from '../viewmodel/ProfileViewModel';
import type { Plan, ProfileViewModel } from '../viewmodel/ProfileViewModel';

/**
 * Mobile 2.0 Profile (canvas page 9 M2Profile, Tier 1; plan package A,
 * approved by Krishna Chintakayala 2026-10-21). Replaces StudentProfile and the
 * More hub as the Profile destination; the More hub stays one tap away
 * (Settings), so nothing it offered is lost.
 *
 * Honest gaps: course, year and medical leave are not stored (D-M2-16), so
 * they are left out; "Ayush can read my records" is not available yet
 * (D-M2-13) and "Share with family" is coming soon (D-M2-15): neither draws a
 * switch, because a switch that does nothing is a fake control.
 */
export interface M2ProfileLinks {
  sos: () => void;
  /** The More hub: account, requests, notifications, verification, plans… */
  settings: () => void;
  /** Change these details (name, hostel, emergency contact). */
  account?: () => void;
  emergencyCard: () => void;
  pass: () => void;
  documents: () => void;
  /** Add a health document (M2ReportUpload). */
  addDocument?: () => void;
  plus?: () => void;
  orders: () => void;
  privacy?: () => void;
  help?: () => void;
  /** What's new: the team's product update posts (features/newsroom M2WhatsNew). */
  whatsNew?: () => void;
  signOut: () => void;
}

const DOC_STYLE: Record<(typeof DOCUMENT_CARDS)[number]['key'], { hue: ServiceHue; icon: SkIconName; label: MessageKey }> = {
  lab: { hue: 'violet', icon: 'flask', label: 'm2.prof.docLab' },
  rx: { hue: 'green', icon: 'doc', label: 'm2.prof.docRx' },
  scans: { hue: 'orange', icon: 'scan', label: 'm2.prof.docScans' },
  vaccines: { hue: 'rose', icon: 'syringe', label: 'm2.prof.docVaccines' },
};

const LANGS: readonly Lang[] = ['en', 'te', 'hi'];

function Shine() {
  const ambient = useAmbientMotion();
  const sweep = useLoop(ambient, motion.duration.ambient);
  if (!ambient) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.shine, {
      transform: [{ translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-80, 260] }) }],
    }]} />
  );
}

function Row({ icon, fill, ink, title, meta, onPress, trailing, testID }: {
  icon: SkIconName; fill: string; ink: string; title: string; meta: string; onPress?: () => void; trailing?: React.ReactNode; testID: string;
}) {
  const body = (
    <>
      <TileIcon icon={icon} fill={fill} ink={ink} tile={38} />
      <View style={styles.rowText}>
        <Text style={m2Text.cardTitle}>{title}</Text>
        <Text style={m2Text.meta}>{meta}</Text>
      </View>
      {trailing ?? (onPress ? <Icon name="chevron-right" size={16} color={color.text3} strokeWidth={2.4} /> : null)}
    </>
  );
  if (!onPress) {
    return <View style={styles.row} testID={testID} accessible {...cardLabel(`${title}, ${meta}`)}>{body}</View>;
  }
  return (
    <Pressable role="link" accessibilityRole="link" {...cardLabel(`${title}, ${meta}`)} onPress={onPress} testID={testID}
      style={({ focused }: PressState) => [styles.row, focused ? focusRing : null]}>
      {body}
    </Pressable>
  );
}

const groupInr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
/** Indian digit grouping for a catalogue price; a non-numeric price is shown as the server sent it. */
const inr = (value: number | string): string => (typeof value === 'number' ? groupInr.format(value) : value);

function plusLine(plan: Plan, t: ReturnType<typeof useT>): string {
  const quarter = plan.packages[0];
  const price = inr(plan.price);
  return quarter
    ? t('m2.prof.plusPrices', { price, months: quarter.months, total: inr(quarter.price) })
    : t('m2.prof.plusPrice', { price });
}

export const M2ProfileView = observer(function M2ProfileView({ vm, links }: { vm: ProfileViewModel; links: M2ProfileLinks }) {
  const t = useT();
  useOwnPhoneChrome();
  const online = useOnline();
  const lift = useLift();
  const { lang, setLang } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const p = vm.profile.data;
  const done = vm.completeness;
  const place = p ? [p.university, p.hostelBlock].filter(Boolean).join(' · ') : '';
  const address = p?.hostelBlock ? (p.room ? t('pb.profile.blockRoom', { block: p.hostelBlock, room: p.room }) : p.hostelBlock) : t('pb.profile.notAdded');
  const plus = vm.studentPlus;

  const vitals: { key: string; label: string; value: string | null; note: string }[] = [
    { key: 'height', label: t('m2.prof.height'), value: vm.body.data?.height ? `${vm.body.data.height.value} ${vm.body.data.height.unit}` : null, note: vm.body.data?.height ? t('m2.prof.added', { date: shortDate(vm.body.data.height.recordedAt) }) : '' },
    { key: 'weight', label: t('m2.prof.weight'), value: vm.body.data?.weight ? `${vm.body.data.weight.value} ${vm.body.data.weight.unit}` : null, note: vm.body.data?.weight ? t('m2.prof.added', { date: shortDate(vm.body.data.weight.recordedAt) }) : '' },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-profile">
      <Rise>
        <NavyHero>
          <View style={styles.headRow}>
            <M2Heading level={1} style={styles.title}>{t('m2.nav.profile')}</M2Heading>
            <View style={styles.headActions}>
              <SosButton label={t('m2.sos')} spoken={t('m2.sosSpoken')} onPress={links.sos} testID="m2-prof-sos" />
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('m2.prof.settings')} aria-label={t('m2.prof.settings')} onPress={links.settings}
                testID="m2-prof-settings" style={({ focused }: PressState) => [styles.settings, focused ? focusRing : null]}>
                <Icon name="settings" size={18} color={color.onHero} />
              </Pressable>
            </View>
          </View>

          {vm.profile.phase === 'loading' ? <View style={styles.idLoading}><Skeleton label={t('m2.prof.loading')} lines={['60%', '40%']} /></View> : null}
          {p ? (
            <Pressable role={links.account ? 'link' : undefined} accessibilityRole={links.account ? 'link' : undefined} disabled={!links.account} onPress={links.account}
              {...cardLabel([p.fullName, place, done ? t('m2.prof.complete', { done: done.done, total: done.total }) : ''].filter(Boolean).join(', '))}
              testID="m2-prof-identity" style={({ focused }: PressState) => [styles.identity, focused ? focusRing : null]}>
              <View style={styles.ringBox}>
                <ProgressRing value={done?.fraction ?? 0} centre="" size={92} tone={color.onHero} track={color.onHeroTrack} testID="chart-profile-complete-ring" />
                <Gradient colors={heroStops('orange')} style={styles.avatar}><Text style={styles.avatarText}>{initials(p.fullName)}</Text></Gradient>
              </View>
              <View style={styles.idText}>
                <Text style={styles.name}>{p.fullName}</Text>
                {place ? <Text style={styles.place}>{place}</Text> : null}
                {done ? <Text style={styles.complete} testID="m2-prof-complete">{t('m2.prof.complete', { done: done.done, total: done.total })}</Text> : null}
              </View>
            </Pressable>
          ) : null}
          {vm.profile.phase === 'error' ? (
            <Pressable role="button" accessibilityRole="button" {...cardLabel(t('m2.prof.failed'))} onPress={() => void vm.profile.load()}
              testID="m2-prof-identity-retry" style={({ focused }: PressState) => [styles.heroRetry, focused ? focusRing : null]}>
              <Text style={styles.place}>{t('m2.prof.failed')}</Text>
              <Icon name="refresh" size={16} color={color.onHero} />
            </Pressable>
          ) : null}
          <Text style={styles.ringNote}>{t('m2.prof.ringNote')}</Text>
        </NavyHero>
      </Rise>

      {!online ? <View style={styles.gutter}><OfflineBanner message={t('m2h.offline')} /></View> : null}

      <Rise index={1} style={[styles.gutter, styles.vitals]}>
        {vitals.map((v) => (
          <M2Card key={v.key} style={styles.vital} testID={`m2-prof-${v.key}`}>
            <Text style={styles.vitalLabel}>{v.label}</Text>
            {vm.body.phase === 'ready' ? (
              <>
                <Text style={[styles.vitalValue, v.value ? null : styles.vitalEmpty]}>{v.value ?? t('pb.profile.notAdded')}</Text>
                <Text style={styles.vitalNote}>{v.value ? v.note : ' '}</Text>
              </>
            ) : (
              <Text style={styles.vitalNote}>{vm.body.phase === 'loading' ? t('m2h.loadingShort') : t('m2h.notLoaded')}</Text>
            )}
          </M2Card>
        ))}
        <M2Card style={styles.vital} testID="m2-prof-blood">
          <Text style={styles.vitalLabel}>{t('m2.prof.blood')}</Text>
          <Text style={[styles.vitalValue, p?.bloodGroup ? null : styles.vitalEmpty]}>{p?.bloodGroup || t('pb.profile.notAdded')}</Text>
          <Text style={styles.vitalNote}>{p?.bloodGroup ? t('m2.prof.typedByYou') : ' '}</Text>
        </M2Card>
      </Rise>
      {vm.body.phase === 'error' ? <View style={styles.gutter}><CardError title={t('m2.prof.vitalsFailed')} onRetry={() => void vm.body.load()} testID="m2-prof-body-error" /></View> : null}

      <Rise index={2} style={styles.gutter}>
        <M2Heading style={[m2Text.section, styles.sectionTitle]}>{t('m2.prof.onCampus')}</M2Heading>
        <View style={styles.campus}>
          <Pressable role="link" accessibilityRole="link" {...cardLabel(`${t('m2.prof.emergency')}. ${t('m2.prof.emergencyBody')}`)}
            onPress={links.emergencyCard} testID="m2-prof-emergency" style={(state: PressState) => [styles.emergency, lift(state)]}>
            <Shine />
            <View style={styles.emergencyIcon}><Icon name="plus-square" size={22} color={color.onDangerFill} /></View>
            <View style={styles.emergencyText}>
              <Text style={styles.emergencyTitle}>{t('m2.prof.emergency')}</Text>
              <Text style={styles.emergencyBody}>{t('m2.prof.emergencyBody')}</Text>
            </View>
          </Pressable>
          <View style={styles.campusSide}>
            <LiftCard label={`${t('m2.prof.pass')}. ${t('m2.prof.passBody')}`} onPress={links.pass} testID="m2-prof-pass" style={styles.sideCard}>
              <Text style={m2Text.cardTitle}>{t('m2.prof.pass')}</Text>
              <Text style={m2Text.meta}>{t('m2.prof.passBody')}</Text>
            </LiftCard>
          </View>
        </View>
      </Rise>

      <Rise index={3}>
        <View style={[styles.gutter, styles.docsHead]}>
          <M2Heading style={m2Text.section}>{t('m2.prof.documents')}</M2Heading>
          {links.addDocument ? (
            <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.prof.addSpoken')} aria-label={t('m2.prof.addSpoken')} onPress={links.addDocument}
              testID="m2-prof-add" style={({ focused }: PressState) => [styles.addLink, focused ? focusRing : null]}>
              <Icon name="plus" size={15} color={color.action} strokeWidth={2.6} />
              <Text style={m2Text.link}>{t('m2.add')}</Text>
            </Pressable>
          ) : null}
        </View>
        {vm.documents.phase === 'loading' ? <View style={styles.gutter}><Skeleton label={t('m2.prof.docsLoading')} lines={['100%']} /></View> : null}
        {vm.documents.phase === 'error' ? <View style={styles.gutter}><CardError title={t('m2.prof.documents')} onRetry={() => void vm.documents.load()} testID="m2-prof-docs-error" /></View> : null}
        {vm.documents.data ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.docRail} testID="m2-prof-docs">
            {DOCUMENT_CARDS.map((d) => {
              const s = DOC_STYLE[d.key];
              const n = vm.documents.data ? countOf(vm.documents.data, d.category) : 0;
              return (
                <Pressable key={d.key} role="link" accessibilityRole="link" {...cardLabel(`${n} ${t(s.label)}`)} onPress={links.documents}
                  testID={`m2-prof-doc-${d.key}`} style={(state: PressState) => [styles.docPress, lift(state)]}>
                  <Gradient colors={heroStops(s.hue)} gloss style={styles.doc}>
                    <View style={styles.docIcon}><Icon name={s.icon} size={20} color={color.onHero} /></View>
                    <View>
                      <Text style={styles.docCount}>{n}</Text>
                      <Text style={styles.docLabel}>{t(s.label)}</Text>
                    </View>
                  </Gradient>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        {vm.documents.data ? <Text style={[m2Text.meta, styles.gutter, styles.docNote]}>{t('m2.prof.docsNote')}</Text> : null}
      </Rise>

      {plus ? (
        <Rise index={4} style={styles.gutter}>
          <LiftCard label={`${plus.name}. ${plusLine(plus, t)}`} onPress={links.plus} disabled={!links.plus} testID="m2-prof-plus" style={styles.plus}>
            <Gradient colors={heroStops('orange')} style={styles.plusIcon}><Icon name="star" size={24} color={color.onHero} /></Gradient>
            <View style={styles.rowText}>
              <Text style={m2Text.cardTitle}>{plus.name}</Text>
              <Text style={styles.plusMeta}>{plusLine(plus, t)}</Text>
            </View>
            {links.plus ? <View style={styles.view}><Text style={styles.viewText}>{t('m2.prof.view')}</Text></View> : null}
          </LiftCard>
        </Rise>
      ) : null}

      <Rise index={5} style={styles.gutter}>
        <M2Card style={styles.rows}>
          <Row icon="shield-2" fill={color.positiveBg} ink={color.positive} title={t('m2.prof.ayush')} meta={t('m2.notYet')} testID="m2-prof-ayush" />
          <Row icon="user-5" fill={color.surface3} ink={color.action} title={t('m2.prof.family')} meta={t('m2.prof.familyMeta')} testID="m2-prof-family" />
          <Row icon="map-pin-2" fill={color.serviceOrangeSoft} ink={color.serviceOrangeInk} title={t('m2.prof.addresses')} meta={address} onPress={links.account} testID="m2-prof-addresses" />
          <Row icon="credit-card" fill={color.serviceVioletSoft} ink={color.serviceVioletInk} title={t('m2.prof.orders')} meta={t('m2.prof.ordersMeta')} onPress={links.orders} testID="m2-prof-orders" />
          <Row icon="translate" fill={color.serviceBlueSoft} ink={color.serviceBlueInk} title={t('m2.prof.language')} meta={LANGS.map((l) => LANGUAGE_NAMES[l]).join(' · ')} onPress={() => setLangOpen(true)} testID="m2-prof-language" />
          {links.privacy ? <Row icon="lock-4" fill={color.neutralBg} ink={color.text2} title={t('m2.prof.privacy')} meta={t('m2.prof.privacyMeta')} onPress={links.privacy} testID="m2-prof-privacy" /> : null}
          {links.whatsNew ? <Row icon="sparkles" fill={color.surface3} ink={color.action} title={t('news.whatsNew.title')} meta={t('news.whatsNew.meta')} onPress={links.whatsNew} testID="m2-prof-whats-new" /> : null}
          {links.help ? <Row icon="message-circle-3" fill={color.serviceSkySoft} ink={color.serviceSkyInk} title={t('m2.prof.help')} meta={t('m2.prof.helpMeta')} onPress={links.help} testID="m2-prof-help" /> : null}
        </M2Card>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('home.signOut')} aria-label={t('home.signOut')} onPress={links.signOut} testID="m2-prof-sign-out"
          style={({ focused }: PressState) => [styles.signOut, focused ? focusRing : null]}>
          <Text style={styles.signOutText}>{t('home.signOut')}</Text>
        </Pressable>
      </Rise>

      <Sheet visible={langOpen} title={t('m2.prof.language')} onClose={() => setLangOpen(false)} testID="m2-prof-language-sheet">
        <View style={styles.sheet}>
          <RadioGroup label={t('m2.prof.language')} value={lang} options={LANGS.map((l) => ({ value: l, label: LANGUAGE_NAMES[l] }))}
            onChange={(l) => { setLang(l); setLangOpen(false); }} />
          <Button label={t('phone.close')} variant="ghost" fullWidth onPress={() => setLangOpen(false)} />
        </View>
      </Sheet>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center', overflow: 'hidden' },
  gutter: { paddingHorizontal: space.gutterPhone },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s12 },
  headActions: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  title: { fontFamily: font.family.sans, fontSize: 22, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.5, color: color.onHero },
  settings: { width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil },
  idLoading: { marginTop: space.s20 },
  identity: { marginTop: space.s20, flexDirection: 'row', alignItems: 'center', gap: space.s16, borderRadius: radius.xl, minHeight: size.touchTarget },
  ringBox: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center' },
  avatar: { position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.family.sans, fontSize: 26, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  idText: { flex: 1, minWidth: 0, gap: space.s2 },
  name: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.4, color: color.onHero },
  place: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.onHero2 },
  complete: { marginTop: space.s4, fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  heroRetry: { marginTop: space.s16, minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  ringNote: { marginTop: space.s12, fontFamily: font.family.sans, fontSize: 11, lineHeight: 16, fontWeight: fontWeight(font.weight.strong), color: color.onHero2 },
  vitals: { flexDirection: 'row', gap: space.s10 },
  vital: { flex: 1, minWidth: 0, borderRadius: radius.xl, padding: space.s12, gap: space.s2 },
  vitalLabel: { fontFamily: font.family.sans, fontSize: 11, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  vitalValue: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text, fontVariant: ['tabular-nums'] },
  vitalEmpty: { fontSize: font.size.bodySm, color: color.text2 },
  vitalNote: { fontFamily: font.family.sans, fontSize: 11, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  sectionTitle: { marginBottom: space.s12 },
  campus: { flexDirection: 'row', gap: space.s10 },
  emergency: {
    flex: 1.2, minHeight: 170, borderRadius: 26, padding: space.s16, justifyContent: 'space-between', overflow: 'hidden', backgroundColor: color.dangerFill,
    ...webOnly({ transitionProperty: 'transform, box-shadow', transitionDuration: `${motion.duration.fast}ms` }),
  },
  shine: { position: 'absolute', top: 0, bottom: 0, width: 60, backgroundColor: color.onHeroVeil },
  emergencyIcon: { width: 42, height: 42, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil },
  emergencyText: { gap: space.s4 },
  emergencyTitle: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.onDangerFill },
  emergencyBody: { fontFamily: font.family.sans, fontSize: 11.5, lineHeight: 16, fontWeight: fontWeight(font.weight.strong), color: color.onDangerFill },
  campusSide: { flex: 1, gap: space.s10 },
  sideCard: { flex: 1, borderRadius: 22, padding: space.s14, gap: space.s6, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  docsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.s8 },
  addLink: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s4, paddingHorizontal: space.s4 },
  docRail: { paddingHorizontal: space.gutterPhone, paddingBottom: space.s6, gap: space.s10 },
  docPress: { borderRadius: 24 },
  doc: { width: 130, height: 140, borderRadius: 24, padding: space.s14, justifyContent: 'space-between', overflow: 'hidden' },
  docIcon: { width: 40, height: 40, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil },
  docCount: { fontFamily: font.family.sans, fontSize: 26, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.5, color: color.onHero, fontVariant: ['tabular-nums'] },
  docLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
  docNote: { marginTop: space.s6 },
  plus: { borderRadius: 26, padding: space.s16, flexDirection: 'row', alignItems: 'center', gap: space.s14, backgroundColor: color.serviceOrangeSoft },
  plusIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  plusMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.serviceOrangeInk },
  view: { minHeight: 38, paddingHorizontal: space.s14, borderRadius: radius.full, justifyContent: 'center', backgroundColor: color.action },
  viewText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  rows: { borderRadius: 26, paddingVertical: space.s6 },
  row: { minHeight: size.touchTarget + space.s12, paddingHorizontal: space.s16, paddingVertical: space.s10, flexDirection: 'row', alignItems: 'center', gap: space.s14 },
  rowText: { flex: 1, minWidth: 0, gap: space.s2 },
  signOut: { marginTop: space.s14, minHeight: 50, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface3 },
  signOutText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  sheet: { gap: space.s12 },
});
