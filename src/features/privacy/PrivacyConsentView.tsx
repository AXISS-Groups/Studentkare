import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLanguage, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Button, ErrorState, OfflineBanner, Skeleton, useOnline } from '@/design-system';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import {
  M2Card, M2Grid, M2Header, M2Heading, M2ListRow, M2PageHero, M2Tile3d, M2ConsentTimeline, M2WideColumn, m2Text, useM2Layout, useOwnPhoneChrome,
} from '@/design-system/m2';
import type { M2ConsentTimelineItem, PressState, ServiceHue } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { navigate } from '@/lib/utils/workflowRouting';
import { privacyRepository, UNPUBLISHED } from './privacyRepository';
import type { ConsentOverview, OptionalPurpose } from './privacyRepository';
import { dateOf } from './dates';

type Repository = Pick<typeof privacyRepository, 'consents' | 'change'>;

const REQUIRED_TITLES: Record<string, MessageKey> = {
  RECORDS_STORAGE: 'member.consent.store.title',
  CAMPUS_ENROLMENT: 'member.consent.campus.title',
  ADULT_18_PLUS: 'member.consent.adult.title',
};

const purposeTitle = (purpose: string): MessageKey =>
  REQUIRED_TITLES[purpose] ?? (`privacy.purpose.${purpose}.title` as MessageKey);

/** The 3D tile each optional purpose carries on the board (T1Privacy). */
const PURPOSE_ART: Record<OptionalPurpose, { icon: SkIconName; hue: ServiceHue }> = {
  AYUSH_HISTORY: { icon: 'sparkle', hue: 'indigo' },
  BLOOD_DONOR_CONTACT: { icon: 'droplet', hue: 'rose' },
  PICKUP_LOCATION: { icon: 'home-2', hue: 'sky' },
  SEASONAL_EDUCATION: { icon: 'sun', hue: 'amber' },
  PREVENTIVE_OFFERS: { icon: 'heart-plus', hue: 'teal' },
  WALLET_GOOGLE: { icon: 'devices', hue: 'blue' },
};

/**
 * The consent switch: the whole row's control (role switch, aria-checked),
 * named by the purpose and its state so "Keep my Ayush chats, On" is what a
 * screen reader says. It draws only the state the server confirmed.
 */
function ConsentSwitch({ title, on, working, onFlip, disabled, testID }: { title: string; on: boolean; working: boolean; onFlip: () => void; disabled: boolean; testID: string }) {
  const t = useT();
  const state = working ? t('privacy.optional.saving') : on ? t('privacy.optional.on') : t('privacy.optional.off');
  return (
    <Pressable
      testID={testID}
      role="switch"
      aria-checked={on}
      accessibilityRole="switch"
      accessibilityLabel={`${title} ${state}`}
      aria-label={`${title} ${state}`}
      accessibilityState={{ checked: on, disabled: disabled || working, busy: working }}
      {...(Platform.OS === 'web' ? { 'aria-busy': working } : {})}
      disabled={disabled || working}
      onPress={onFlip}
      style={({ focused }: PressState) => [styles.switch, focused ? focusRing : null, disabled ? styles.switchOff : null]}
    >
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[styles.track, { backgroundColor: on ? color.action : color.ruleStrong }]}>
        <View style={[styles.thumb, { transform: [{ translateX: on ? 20 : 0 }] }]} />
      </View>
      <Text style={[styles.switchState, on ? styles.switchOn : null]}>{state}</Text>
    </Pressable>
  );
}

/**
 * Profile → Privacy & consent (audit H2; plans tier1-canvas-wp03 D3-4 and wp06,
 * amended 2026-10-23; Tier 1 look T1Privacy / T1PrivacyDesktop, approved by
 * Krishna Chintakayala 2026-10-24, plan tier1-parity-2026-10-24 §13). Every
 * consent the student gave, from the server's ledger (GET /privacy/consents):
 * the sign-up ones with their wording and notice versions, and each optional
 * one with a switch that withdraws it as easily as it was given (POST
 * /privacy/consents/{purpose}). The required ones say what withdrawing means
 * (stop using the service = delete the account) and link there. Clinician
 * shares stay on their own page (ConsentInbox, revocable). The full record is
 * the board's timeline (M2Timeline), newest first as the server sends it.
 *
 * React Native, so Expo can register it (phase 4). Every title, wording and
 * notice line is the same i18n value as before; no switch is pre-ticked and
 * a row draws only the state the server replied with, never optimistically.
 */
export function PrivacyConsentView({ repository = privacyRepository, wide = false }: { repository?: Repository; wide?: boolean }): React.ReactElement {
  const t = useT();
  const { lang } = useLanguage();
  useOwnPhoneChrome();
  const online = useOnline();
  const [data, setData] = useState<ConsentOverview | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<OptionalPurpose | null>(null);
  const [failed, setFailed] = useState<OptionalPurpose | null>(null);

  const load = useCallback(() => {
    setError(false);
    setData(null);
    repository.consents().then(setData, () => setError(true));
  }, [repository]);
  useEffect(load, [load]);

  const flip = (purpose: OptionalPurpose, granted: boolean) => {
    setBusy(purpose);
    setFailed(null);
    repository.change(purpose, granted, lang)
      .then(setData, () => setFailed(purpose))
      .finally(() => setBusy(null));
  };

  const required = data ? (
    <M2Card style={styles.card} testID="privacy-required">
      <View style={styles.head}>
        <M2Tile3d icon="shield-check" hue="green" size={48} />
        <View style={styles.grow}>
          <M2Heading style={m2Text.section}>{t('privacy.required.title')}</M2Heading>
          <Text style={m2Text.body}>{t('privacy.required.body')}</Text>
        </View>
      </View>
      {data.required ? (
        <>
          {data.required.purposes.map((purpose) => (
            <View key={purpose} style={styles.requiredRow} accessible {...(Platform.OS === 'web' ? {} : { accessibilityLabel: `${t(purposeTitle(purpose))}. ${t('privacy.required.given', { date: dateOf(data.required?.givenAt ?? 0, lang), version: data.required?.version ?? '' })}` })}>
              <M2Tile3d icon="check" hue="green" size={34} />
              <View style={styles.grow}>
                <Text style={m2Text.cardTitle}>{t(purposeTitle(purpose))}</Text>
                <Text style={m2Text.meta}>{t('privacy.required.given', { date: dateOf(data.required?.givenAt ?? 0, lang), version: data.required?.version ?? '' })}</Text>
              </View>
            </View>
          ))}
          <View style={styles.versions}>
            <Text style={m2Text.meta}>{noticeLine(t, data.required.noticeVersion)}</Text>
            {data.required.termsVersion ? (
              <Text style={m2Text.meta}>{data.required.termsVersion === UNPUBLISHED ? t('privacy.required.termsUnpublished') : t('privacy.required.terms', { version: data.required.termsVersion })}</Text>
            ) : null}
          </View>
        </>
      ) : <Text style={m2Text.body}>{t('privacy.required.missing')}</Text>}
      <View style={styles.withdraw}>
        <M2Heading style={m2Text.cardTitle}>{t('privacy.required.withdrawTitle')}</M2Heading>
        <Text style={m2Text.body}>{t('privacy.required.withdrawBody')}</Text>
        <View style={styles.actions}>
          <Button label={t('privacy.required.export')} variant="secondary" onPress={() => navigate('data-export')} icon={<Icon name="download" size={16} color={color.action} />} />
          <Button label={t('privacy.required.delete')} variant="dangerOutline" onPress={() => navigate('delete-account')} testID="privacy-delete" />
        </View>
      </View>
    </M2Card>
  ) : null;

  const optional = data ? (
    <M2Card style={styles.card} testID="privacy-optional">
      <View style={styles.head}>
        <M2Tile3d icon="sparkles" hue="violet" size={48} />
        <View style={styles.grow}>
          <M2Heading style={m2Text.section}>{t('privacy.optional.title')}</M2Heading>
          <Text style={m2Text.body}>{t('privacy.optional.body')}</Text>
        </View>
      </View>
      {data.optional.map((item, index) => {
        const title = t(`privacy.purpose.${item.purpose}.title` as MessageKey);
        const working = busy === item.purpose;
        const art = PURPOSE_ART[item.purpose];
        const whenOn = item.on
          ? (item.givenAt ? t('privacy.optional.given', { date: dateOf(item.givenAt, lang), version: item.version ?? '' }) : t('privacy.optional.givenEarlier'))
          : null;
        const whenOff = item.withdrawnAt ? t('privacy.optional.withdrawn', { date: dateOf(item.withdrawnAt, lang) }) : t('privacy.optional.never');
        return (
          <View key={item.purpose} style={[styles.optionalRow, index === 0 ? null : styles.optionalRule]} testID={`privacy-row-${item.purpose}`}>
            <M2Tile3d icon={art.icon} hue={art.hue} size={40} />
            <View style={styles.grow}>
              <Text style={m2Text.cardTitle}>{title}</Text>
              <Text style={m2Text.body}>{t(`privacy.purpose.${item.purpose}.body` as MessageKey)}</Text>
              {whenOn ? <Text style={[m2Text.meta, styles.on]}>{whenOn}</Text> : null}
              <Text style={m2Text.meta}>{whenOff}</Text>
              {failed === item.purpose ? <Text role="alert" accessibilityRole="alert" style={styles.failed}>{t('privacy.optional.failed')}</Text> : null}
              {!online ? <Text style={m2Text.meta}>{t('common.retryConnection')}</Text> : null}
            </View>
            {item.canGiveHere ? (
              <ConsentSwitch title={title} on={item.on} working={working} disabled={!online} onFlip={() => flip(item.purpose, !item.on)} testID={`privacy-switch-${item.purpose}`} />
            ) : (
              // Given on its own screen first: the donor page, or the emergency card's wallet field picker. Under the words on a phone, beside them wider.
              <View style={wide ? null : styles.underWords}>
                <Button label={t(item.purpose === 'WALLET_GOOGLE' ? 'privacy.optional.walletFromCard' : 'privacy.optional.donorFirst')} variant="secondary"
                  onPress={() => navigate(item.purpose === 'WALLET_GOOGLE' ? 'emergency-card' : 'lifeshare')} />
              </View>
            )}
          </View>
        );
      })}
    </M2Card>
  ) : null;

  const links = (
    <View style={styles.links}>
      <M2ListRow icon="eye" hue="indigo" title={t('privacy.shares.title')} meta={t('privacy.shares.body')} onPress={() => navigate('consent')} testID="privacy-shares" />
      <M2ListRow icon="shield-2" hue="violet" title={t('privacy.rightsLink.title')} meta={t('privacy.rightsLink.meta')} onPress={() => navigate('data-rights')} testID="privacy-rights" />
    </View>
  );

  const items: M2ConsentTimelineItem[] = (data?.history ?? []).map((row) => ({
    key: `${row.version}-${row.givenAt}-${row.purposes.join()}`,
    what: row.purposes.map((purpose) => t(purposeTitle(purpose))).join(' · '),
    wording: row.version,
    given: dateOf(row.givenAt, lang),
    withdrawn: row.withdrawnAt ? dateOf(row.withdrawnAt, lang) : null,
  }));
  const history = items.length ? (
    <M2Card style={styles.card} testID="privacy-history">
      <View style={styles.head}>
        <M2Tile3d icon="clock-3" hue="blue" size={48} />
        <View style={styles.grow}>
          <M2Heading style={m2Text.section}>{t('privacy.history.title')}</M2Heading>
          <Text style={m2Text.body}>{t('privacy.history.caption')}</Text>
        </View>
      </View>
      <M2ConsentTimeline items={items} caption={t('privacy.history.caption')} testID="privacy-timeline"
        labels={{ what: t('privacy.history.what'), wording: t('privacy.history.wording'), given: t('privacy.history.given'), withdrawn: t('privacy.history.withdrawn'), stillOn: t('privacy.history.stillOn') }} />
    </M2Card>
  ) : null;

  const states = (
    <>
      {!online ? <OfflineBanner message={t('common.retryConnection')} /> : null}
      {error ? <M2Card style={styles.card}><ErrorState title={t('privacy.error.title')} body={t('privacy.error.body')} retryLabel={t('common.tryAgain')} onRetry={load} /></M2Card> : null}
      {!error && !data ? <M2Card style={styles.card}><Skeleton label={t('privacy.loading')} lines={['70%', '100%', '90%', '60%']} /></M2Card> : null}
    </>
  );

  const hero = <M2PageHero hue="indigo" icon="shield-2" title={wide ? t('privacy.title') : undefined} body={t('privacy.sub')} testID="privacy-hero" art={<M2Tile3d icon="shield-check" hue="indigo" size={96} float />} artOnPhone={false} />;

  if (wide) {
    return (
      <M2WideColumn testID="privacy-consent">
        <M2Header backLabel={t('common.back')} onBack={() => navigate('profile')} title={t('privacy.title')} testID="privacy-header" />
        {hero}
        {states}
        <TwoColumns left={required} right={optional} />
        <TwoColumns left={links} right={history} />
      </M2WideColumn>
    );
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="privacy-consent">
      <M2Header backLabel={t('common.back')} onBack={() => navigate('profile')} title={t('privacy.title')} testID="privacy-header" />
      <View style={[styles.gutter, styles.column]}>
        {hero}
        {states}
        {optional}
        {required}
        {links}
        {history}
      </View>
    </ScrollView>
  );
}

/** Desktop: two columns; narrower: stacked. */
function TwoColumns({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  const desktop = useM2Layout() === 'desktop';
  if (!left && !right) return null;
  if (!desktop) return <View style={styles.column}>{left}{right}</View>;
  return <M2Grid columns={{ desktop: 2 }}>{left ?? <View />}{right ?? <View />}</M2Grid>;
}

function noticeLine(t: ReturnType<typeof useT>, version: string | null): string {
  if (!version) return t('privacy.required.noticeUnknown');
  if (version === UNPUBLISHED) return t('privacy.required.noticeUnpublished');
  return t('privacy.required.notice', { version });
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { gap: space.s14, paddingBottom: space.s40 },
  gutter: { paddingHorizontal: space.gutterPhone },
  column: { gap: space.s14 },
  card: { padding: space.s16, gap: space.s14 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12 },
  requiredRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  versions: { gap: space.s2 },
  withdraw: { gap: space.s8, padding: space.s14, borderRadius: radius.xl, backgroundColor: color.surface2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8, marginTop: space.s4 },
  optionalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12, flexWrap: 'wrap' },
  underWords: { width: '100%', paddingLeft: 40 + space.s12, marginTop: -space.s4 },
  optionalRule: { paddingTop: space.s14, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  on: { color: color.positive, fontWeight: fontWeight(font.weight.heavy) },
  failed: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.danger },
  links: { gap: space.s10 },
  switch: { alignItems: 'center', gap: space.s4, minHeight: size.touchTarget, minWidth: size.touchTarget, justifyContent: 'center', paddingHorizontal: space.s4, borderRadius: radius.md },
  switchOff: { opacity: 0.6 },
  track: { width: 50, height: 30, borderRadius: radius.full, padding: 3 },
  thumb: { width: 24, height: 24, borderRadius: radius.full, backgroundColor: color.surface },
  switchState: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text3 },
  switchOn: { color: color.action },
});
