import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, Illustration } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { ErrorState, Skeleton } from '@/design-system';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardScreen, IconTile, TextLink, boardText } from '@/design-system/board/BoardKit';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import type { MemberProfile } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import { initialsOf, maskPhone } from './StudentProfileBoard';

export interface AccountDetailsLinks {
  back?: () => void;
  verify?: () => void;
  points?: () => void;
  /** Change name, number, email or the emergency contact. */
  edit?: () => void;
  abha?: () => void;
  exportData?: () => void;
  leaveCampus?: () => void;
  deleteAccount?: () => void;
}

type PressState = { pressed: boolean; focused?: boolean };

/**
 * Account details (canvas page 2, AccountDetails, Tier 2): identity status,
 * Kare points, contact details, and the two big decisions (leaving campus,
 * deleting the account) at the foot. Every value is the account's own. The
 * board's per-channel alert switches are not drawn: no setting stores them
 * (Notification settings holds the switches that exist).
 */
export function AccountDetailsBoard({ links }: { links: AccountDetailsLinks }): React.ReactElement {
  const t = useT();
  const resource = useApiResource<MemberProfile>('/profile');
  const points = useApiResource<{ balance: number }>('/points/me');
  const p = resource.data;
  const first = p?.fullName.split(/\s+/)[0] ?? '';
  const rows: { key: string; icon: SkIconName; label: string; value: string; action: string; onPress?: () => void }[] = p ? [
    { key: 'phone', icon: 'phone', label: t('pb.account.mobile'), value: p.phone ? maskPhone(p.phone) : t('pb.profile.notAdded'), action: p.phone ? t('pb.account.edit') : t('pb.account.add'), onPress: links.edit },
    { key: 'email', icon: 'mail', label: t('pb.account.email'), value: p.email || t('pb.profile.notAdded'), action: t('pb.account.edit'), onPress: links.edit },
    { key: 'campus', icon: 'graduation-cap-2', label: t('pb.account.campus'), value: p.university ? [p.university, p.rollNumber].filter(Boolean).join(' · ') : t('pb.account.campusMissing'), action: p.university ? t('pb.account.edit') : t('pb.account.add'), onPress: links.edit },
    { key: 'abha', icon: 'id-card-2', label: t('pb.account.abha'), value: t('pb.account.abhaMeta'), action: t('pb.account.manage'), onPress: links.abha },
    { key: 'contact', icon: 'heart-2', label: t('pb.account.contact'), value: p.emergencyContactName ? t('pb.account.contactSet') : t('pb.profile.notAdded'), action: p.emergencyContactName ? t('pb.account.edit') : t('pb.account.add'), onPress: links.edit },
  ] : [];

  return (
    <BoardScreen testID="account-details">
      <BoardHeader title={t('pb.account.title')} backIcon="arrow-left" backLabel={t('common.back')} onBack={links.back} />
      {resource.loading ? <Skeleton label={t('pb.profile.loading')} lines={['100%', '60%', '100%', '100%']} /> : null}
      {resource.error && !resource.loading ? <ErrorState title={t('pb.profile.failedTitle')} body={t('pb.yc.failedBody')} retryLabel={t('common.tryAgain')} onRetry={resource.reload} /> : null}
      {p ? (
        <>
          <Pressable
            testID="account-identity"
            accessibilityRole="button"
            accessibilityLabel={p.isVerifiedStudent ? t('pb.account.verifiedSpoken') : t('pb.account.unverifiedSpoken')}
            disabled={!links.verify}
            onPress={links.verify}
            style={({ focused }: PressState) => [styles.identity, p.isVerifiedStudent ? styles.identityOk : null, focused ? focusRing : null]}
          >
            <View style={styles.identityTop}>
              <View style={styles.avatar}>
                <Text style={styles.initials}>{initialsOf(p.fullName)}</Text>
                {p.isVerifiedStudent ? <View style={styles.badge}><Icon name="check" size={space.s12} color={color.onAction} strokeWidth={3} /></View> : null}
              </View>
              <View style={styles.flex}>
                <Text style={boardText.strong}>{p.isVerifiedStudent ? t('pb.account.verified') : t('pb.account.unverified')}</Text>
                <Text style={[boardText.meta, p.isVerifiedStudent ? { color: color.positive } : null]}>{p.isVerifiedStudent ? t('pb.account.verifiedMeta') : t('pb.account.unverifiedMeta')}</Text>
              </View>
              {links.verify ? <Icon name="chevron-right" size={size.navIcon - space.s2} color={color.text3} /> : null}
            </View>
            {p.isVerifiedStudent ? (
              <View style={styles.chips}>
                <View style={styles.chip}><Icon name="check" size={space.s12} color={color.positive} /><Text style={styles.chipText}>{t('pb.account.collegeId')}</Text></View>
              </View>
            ) : null}
          </Pressable>

          <Text accessibilityRole="header" style={boardText.title}>{t('pb.account.hi', { name: first })}</Text>

          {points.data ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t('pb.account.pointsSpoken', { points: points.data.balance })} disabled={!links.points} onPress={links.points}
              style={({ focused }: PressState) => [styles.points, focused ? focusRing : null]} testID="account-points">
              <View style={styles.pointsTile}><Icon name="star" size={size.navIcon} color={color.onHero} /></View>
              <View style={styles.flex}>
                <Text style={styles.pointsTitle}>{t('pb.account.points', { points: points.data.balance })}</Text>
                <Text style={styles.pointsMeta}>{t('pb.account.pointsMeta')}</Text>
              </View>
            </Pressable>
          ) : null}

          <View style={styles.group}>
            {rows.map((row, i) => (
              <View key={row.key} style={[styles.row, i < rows.length - 1 ? styles.divider : null]}>
                <IconTile icon={row.icon} tone="action" box={36} />
                <View style={styles.flex}>
                  <Text style={boardText.meta}>{row.label}</Text>
                  <Text style={boardText.strong}>{row.value}</Text>
                </View>
                {row.onPress ? <TextLink label={row.action} onPress={row.onPress} accessibilityLabel={`${row.action}: ${row.label}`} /> : null}
              </View>
            ))}
          </View>

          <View style={styles.campusNote}>
            <Illustration name="illustration-lock-shield" size={88} />
            <Text style={[boardText.body, styles.center]}>{t('pb.profile.campusNote')}</Text>
            {links.exportData ? <TextLink label={t('pb.account.export')} onPress={links.exportData} /> : null}
          </View>

          <View style={styles.group}>
            {links.leaveCampus ? (
              <BigChoice icon="graduation-cap" tone="neutral" title={t('pb.account.leaving')} meta={t('pb.account.leavingMeta')} onPress={links.leaveCampus} divider />
            ) : null}
            {links.deleteAccount ? (
              <BigChoice icon="trash" tone="danger" title={t('pb.account.delete')} meta={t('pb.account.deleteMeta')} onPress={links.deleteAccount} />
            ) : null}
          </View>
        </>
      ) : null}
    </BoardScreen>
  );
}

function BigChoice({ icon, tone, title, meta, onPress, divider = false }: { icon: SkIconName; tone: 'neutral' | 'danger'; title: string; meta: string; onPress: () => void; divider?: boolean }): React.ReactElement {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}, ${meta}`} onPress={onPress}
      style={({ focused }: PressState) => [styles.row, divider ? styles.divider : null, focused ? focusRing : null]}>
      <IconTile icon={icon} tone={tone} box={36} />
      <View style={styles.flex}>
        <Text style={[boardText.strong, tone === 'danger' ? { color: color.danger } : null]}>{title}</Text>
        <Text style={boardText.meta}>{meta}</Text>
      </View>
      <Icon name="chevron-right" size={size.navIcon - space.s2} color={color.text3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: space.s2 },
  center: { textAlign: 'center' },
  identity: { gap: space.s12, backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1.5, borderColor: color.rule, padding: space.s16, minHeight: size.touchTarget },
  identityOk: { borderColor: color.positiveRule },
  identityTop: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  avatar: { width: size.control + space.s4, height: size.control + space.s4, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  badge: { position: 'absolute', right: -space.s2, bottom: -space.s2, width: space.s20, height: space.s20, borderRadius: radius.full, backgroundColor: color.positiveFill, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.s4, borderRadius: radius.full, backgroundColor: color.positiveBg, paddingHorizontal: space.s10, paddingVertical: space.s4 },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  points: { flexDirection: 'row', alignItems: 'center', gap: space.s12, backgroundColor: color.heroBg, borderRadius: radius.xl, padding: space.s16, minHeight: size.touchTarget },
  pointsTile: { width: size.touchTarget - space.s4, height: size.touchTarget - space.s4, borderRadius: radius.md, backgroundColor: color.onHeroVeil, alignItems: 'center', justifyContent: 'center' },
  pointsTitle: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  pointsMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.onHero2 },
  group: { backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: size.touchTarget, paddingVertical: space.s14, paddingHorizontal: space.s16 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  campusNote: { alignItems: 'center', gap: space.s10, paddingHorizontal: space.s16 },
});
