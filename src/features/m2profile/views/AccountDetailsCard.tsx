import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { Skeleton } from '@/design-system';
import { M2Card, M2Heading, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { Drawer } from '@/design-system/overlays/Drawer';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { useAuth } from '@/data/contexts/AuthContext';
import { useApiResource } from '@/hooks/api/useApiResource';
import type { IdentitySummary, MemberProfile } from '@/data/types/workflowTypes';
import type { NotificationPreferences } from '@/features/notifications/viewmodel/NotificationSettingsViewModel';
import { ProfileForm } from '@/screens/workspace/MemberProfilePanel';
import { CardError, TileIcon } from '@/features/m2health/HealthParts';

/**
 * "Account details" on desktop Profile (Tier 1 parity plan 2026-10-24 §11, Q2):
 * the web Account page's contact & identity rows, Kare points, the messages
 * summary and the Edit drawer (the same ProfileForm, its validation and the 18+
 * birth-date rule untouched), plus Privacy, Leave campus and Delete. Every row
 * is read from the account (`/profile` through the Profile view-model,
 * `/identity`, `/points/me`, `/notifications/preferences`); nothing is invented.
 * The "Are you a clinician?" banner is not carried over: no marketing on a
 * signed-in health page (it stays on the public site).
 */
export interface AccountDetailsLinks {
  verify: () => void;
  rewards: () => void;
  notifications: () => void;
  privacy: () => void;
  leaveCampus: () => void;
  deleteAccount: () => void;
  digitalId: () => void;
}

interface ContactRow { icon: SkIconName; label: MessageKey; value: string; action?: { label: MessageKey; onPress: () => void } }

function LinkRow({ icon, title, meta, onPress, danger = false, testID }: { icon: SkIconName; title: string; meta: string; onPress: () => void; danger?: boolean; testID: string }) {
  const label = `${title}. ${meta}`;
  return (
    <Pressable role="link" accessibilityRole="link" accessibilityLabel={label} aria-label={label} onPress={onPress} testID={testID}
      style={({ focused }: PressState) => [styles.row, focused ? focusRing : null]}>
      <TileIcon icon={icon} fill={danger ? color.dangerBg : color.neutralBg} ink={danger ? color.danger : color.text2} tile={38} />
      <View style={styles.grow}>
        <Text style={[m2Text.cardTitle, danger ? styles.dangerText : null]}>{title}</Text>
        <Text style={m2Text.meta}>{meta}</Text>
      </View>
      <Icon name="chevron-right" size={16} color={color.text3} strokeWidth={2.4} />
    </Pressable>
  );
}

export function AccountDetailsCard({ profile, profileFailed, onRetryProfile, onEdited, links }: {
  /** `/profile`, as the Profile view-model read it (one read for the page). */
  profile: MemberProfile | null;
  profileFailed: boolean;
  onRetryProfile: () => void;
  /** After the Edit drawer closes: read the profile again. */
  onEdited: () => void;
  links: AccountDetailsLinks;
}) {
  const t = useT();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const identity = useApiResource<IdentitySummary>('/identity');
  const points = useApiResource<{ balance: number; redeemable: boolean }>('/points/me');
  const prefs = useApiResource<NotificationPreferences>('/notifications/preferences');

  const campusStatus = identity.data?.campusStatus;
  const campusVerified = campusStatus === 'VERIFIED' || (!identity.data && Boolean(user?.isVerifiedStudent));
  const checks: { label: MessageKey; done: boolean }[] = [
    { label: 'sw.account.check.campus', done: campusVerified },
    { label: 'sw.account.check.age', done: Boolean(profile?.ageVerified) },
  ];
  const doneCount = checks.filter((check) => check.done).length;
  const rows: ContactRow[] = profile ? [
    { icon: 'phone', label: 'sw.account.mobile', value: profile.phone || t('sw.account.notAdded') },
    { icon: 'mail', label: 'sw.account.email', value: profile.email || t('sw.account.notAdded') },
    {
      icon: 'graduation-cap-2', label: 'sw.account.campus',
      value: campusStatus === 'VERIFIED' ? t('sw.account.campusVerified', { campus: profile.university || t('sw.account.campusUnnamed') })
        : campusStatus === 'PENDING' ? t('sw.account.campusPending') : t('sw.account.campusNone'),
      action: { label: campusStatus === 'VERIFIED' ? 'sw.account.details' : 'sw.account.verify', onPress: links.verify },
    },
    { icon: 'id-card-2', label: 'sw.account.abha', value: t('shell.unavailable') },
    {
      icon: 'heart-2', label: 'sw.account.emergency',
      value: profile.emergencyContactName ? t('sw.account.emergencyOne') : t('sw.account.notAdded'),
      action: { label: profile.emergencyContactName ? 'sw.account.edit' : 'sw.account.add', onPress: () => setEditing(true) },
    },
    { icon: 'user', label: 'sw.account.personal', value: profile.fullName, action: { label: 'sw.account.edit', onPress: () => setEditing(true) } },
  ] : [];
  const channels: { label: MessageKey; on: boolean | undefined }[] = [
    { label: 'nset.push', on: prefs.data?.pushEnabled },
    { label: 'nset.email', on: prefs.data?.emailEnabled },
    { label: 'nset.reminders', on: prefs.data?.remindersEnabled },
  ];
  const pointsTitle = points.data ? t('sw.account.points', { count: points.data.balance }) : points.error ? t('sw.account.pointsTitle') : t('sw.account.pointsLoading');
  const pointsMeta = points.error ? t('sw.account.pointsError') : t('sw.account.pointsNote');

  return (
    <View style={styles.stack} testID="m2-prof-account">
      <M2Card style={styles.card} testID="m2-prof-account-contact">
        <View style={styles.head}>
          <M2Heading style={[m2Text.section, styles.grow]}>{t('sw.account.contact')}</M2Heading>
          {profile ? (
            <View style={[styles.pill, { backgroundColor: doneCount === checks.length ? color.positiveBg : color.attentionBg }]}>
              <Text style={[styles.pillText, { color: doneCount === checks.length ? color.positive : color.attention }]}>{t('sw.account.checksDone', { done: doneCount, total: checks.length })}</Text>
            </View>
          ) : null}
        </View>
        {!profile && !profileFailed ? <Skeleton label={t('sw.account.loading')} lines={['100%', '80%', '100%']} /> : null}
        {profileFailed ? <CardError title={t('sw.account.errorTitle')} onRetry={onRetryProfile} testID="m2-prof-account-error" /> : null}
        {profile ? (
          <>
            <View style={styles.verify}>
              <View style={styles.grow}>
                <Text style={m2Text.cardTitle}>{doneCount === checks.length ? t('sw.account.verifiedAll') : t('sw.account.verifiedSome')}</Text>
                <View style={styles.ticks}>
                  {checks.map((check) => (
                    <View key={check.label} style={styles.tick} accessible accessibilityLabel={`${t(check.label)}: ${check.done ? t('sw.account.checkDone') : t('sw.account.checkTodo')}`}
                      aria-label={`${t(check.label)}: ${check.done ? t('sw.account.checkDone') : t('sw.account.checkTodo')}`}>
                      <Icon name={check.done ? 'check' : 'circle'} size={13} color={check.done ? color.positive : color.text3} />
                      <Text style={m2Text.meta}>{t(check.label)}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('sw.account.detailsLink')} aria-label={t('sw.account.detailsLink')} onPress={links.verify}
                testID="m2-prof-account-verify" style={({ focused }: PressState) => [styles.action, focused ? focusRing : null]}>
                <Text style={m2Text.link}>{t('sw.account.detailsLink')}</Text>
              </Pressable>
            </View>
            <View testID="m2-prof-account-rows">
              {rows.map((row) => (
                <View key={row.label} style={styles.row} testID={`m2-prof-account-${row.label.split('.').pop() ?? ''}`}>
                  <TileIcon icon={row.icon} fill={color.surface3} ink={color.action} tile={38} />
                  <View style={styles.grow}>
                    <Text style={m2Text.meta}>{t(row.label)}</Text>
                    <Text style={m2Text.cardTitle}>{row.value}</Text>
                  </View>
                  {row.action ? (
                    <Pressable role="button" accessibilityRole="button" accessibilityLabel={`${t(row.action.label)}: ${t(row.label)}`} aria-label={`${t(row.action.label)}: ${t(row.label)}`}
                      onPress={row.action.onPress} style={({ focused }: PressState) => [styles.action, focused ? focusRing : null]}>
                      <Text style={m2Text.link}>{t(row.action.label)}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          </>
        ) : null}
      </M2Card>

      <M2Card style={styles.card} testID="m2-prof-account-messages">
        <LinkRow icon="star" title={pointsTitle} meta={pointsMeta} onPress={links.rewards} testID="m2-prof-account-points" />
        <M2Heading style={m2Text.section}>{t('sw.account.messages')}</M2Heading>
        {prefs.loading ? <Skeleton label={t('sw.account.loading')} lines={['100%', '100%']} /> : null}
        {prefs.error ? <Text accessibilityRole="alert" style={styles.error}>{t('sw.account.prefsError')}</Text> : null}
        {prefs.data ? channels.map((channel) => (
          <View key={channel.label} style={styles.channel}>
            <Text style={[m2Text.body, styles.grow]}>{t(channel.label)}</Text>
            <View style={[styles.pill, { backgroundColor: channel.on ? color.surface3 : color.neutralBg }]}>
              <Text style={[styles.pillText, { color: channel.on ? color.action : color.text2 }]}>{channel.on ? t('sw.on') : t('sw.off')}</Text>
            </View>
          </View>
        )) : null}
        <Text style={m2Text.meta}>{t('sw.account.offersOff')}</Text>
        <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('sw.account.manage')} aria-label={t('sw.account.manage')} onPress={links.notifications}
          testID="m2-prof-account-manage" style={({ focused }: PressState) => [styles.action, focused ? focusRing : null]}>
          <Text style={m2Text.link}>{t('sw.account.manage')}</Text>
        </Pressable>
        <Text style={m2Text.meta}>{t('always.detail')}</Text>
      </M2Card>

      <M2Card style={styles.card} testID="m2-prof-account-leave">
        <LinkRow icon="lock-4" title={t('privacy.title')} meta={t('privacy.accountMeta')} onPress={links.privacy} testID="m2-prof-account-privacy" />
        <LinkRow icon="graduation-cap" title={t('sw.account.leaveTitle')} meta={t('sw.account.leaveMeta')} onPress={links.leaveCampus} testID="m2-prof-account-leave-campus" />
        <LinkRow icon="trash" danger title={t('sw.account.deleteTitle')} meta={t('sw.account.deleteMeta')} onPress={links.deleteAccount} testID="m2-prof-account-delete" />
      </M2Card>

      {profile ? (
        <Drawer open={editing} title={t('sw.account.editTitle')} onClose={() => { setEditing(false); onEdited(); }}>
          <ProfileForm initial={profile} onOpenDigitalId={() => { setEditing(false); links.digitalId(); }} />
        </Drawer>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.s16 },
  card: { padding: space.s16, gap: space.s10, borderRadius: 26 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.s8, flexWrap: 'wrap' },
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  pill: { paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full },
  pillText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  verify: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s12, borderRadius: radius.lg, backgroundColor: color.surface2 },
  ticks: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12, marginTop: space.s4 },
  tick: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  row: { minHeight: size.touchTarget + space.s8, flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s6 },
  action: { minHeight: size.touchTarget, minWidth: size.touchTarget, justifyContent: 'center', paddingHorizontal: space.s4 },
  channel: { flexDirection: 'row', alignItems: 'center', gap: space.s8, minHeight: size.touchTarget },
  error: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.danger },
  dangerText: { color: color.danger },
});
