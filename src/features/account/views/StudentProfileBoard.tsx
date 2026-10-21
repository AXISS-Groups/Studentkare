import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { ErrorState, Skeleton } from '@/design-system';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardScreen, BoardSection, TextLink, boardText } from '@/design-system/board/BoardKit';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import type { MemberProfile } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';

export interface StudentProfileLinks {
  back?: () => void;
  digitalId?: () => void;
  /** Change these details (web: the profile form). */
  edit?: () => void;
}

/** "k•••••@vnrvjiet.in": enough to recognise, not enough to read over a shoulder. */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  return `${name.charAt(0)}${'•'.repeat(Math.min(5, Math.max(1, name.length - 1)))}@${domain}`;
}

/** "+91 98••• ••231". */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return phone;
  const local = digits.slice(-10);
  const code = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : '';
  return `${code}${local.slice(0, 2)}••• ••${local.slice(-3)}`;
}

export function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
}

/**
 * Student profile (canvas page 2, StudentProfile, Tier 2): who you are, where
 * you are and your care basics, as GET /profile returns them. Empty fields say
 * "Not added". The board's delivery-address sheet is not drawn: there is no
 * saved-address store behind it (the hostel block and room are the address).
 */
export function StudentProfileBoard({ links }: { links: StudentProfileLinks }): React.ReactElement {
  const t = useT();
  const resource = useApiResource<MemberProfile>('/profile');
  const p = resource.data;
  const notAdded = t('pb.profile.notAdded');
  const groups = p ? [
    { label: t('pb.profile.aboutYou'), rows: [
      { key: 'name', label: t('pb.profile.fullName'), value: p.fullName || notAdded },
      { key: 'email', label: t('pb.profile.email'), value: p.email ? maskEmail(p.email) : notAdded },
      { key: 'phone', label: t('pb.profile.phone'), value: p.phone ? maskPhone(p.phone) : notAdded },
    ] },
    { label: t('pb.profile.whereYouAre'), rows: [
      { key: 'block', label: t('pb.profile.hostel'), value: p.hostelBlock ? (p.room ? t('pb.profile.blockRoom', { block: p.hostelBlock, room: p.room }) : p.hostelBlock) : notAdded },
      { key: 'campus', label: t('pb.profile.campus'), value: p.university || notAdded },
    ] },
    { label: t('pb.profile.careBasics'), rows: [
      { key: 'blood', label: t('pb.profile.bloodGroup'), value: p.bloodGroup || notAdded },
      { key: 'allergies', label: t('pb.profile.allergies'), value: p.allergies.length ? p.allergies.join(', ') : t('pb.profile.noneRecorded') },
      { key: 'contact', label: t('pb.profile.emergencyContact'), value: p.emergencyContactName ? [p.emergencyContactRelation || p.emergencyContactName, p.emergencyContactPhone ? maskPhone(p.emergencyContactPhone) : ''].filter(Boolean).join(' · ') : notAdded },
    ] },
  ] : [];

  return (
    <BoardScreen testID="student-profile">
      <BoardHeader
        title={t('pb.profile.title')}
        backIcon="arrow-left"
        backLabel={t('common.back')}
        onBack={links.back}
        trailingKey={links.digitalId ? 'id' : ''}
        trailing={links.digitalId ? <TextLink label={t('pb.profile.digitalId')} onPress={links.digitalId} /> : null}
      />
      {resource.loading ? <Skeleton label={t('pb.profile.loading')} lines={['40%', '100%', '80%', '100%']} /> : null}
      {resource.error && !resource.loading ? <ErrorState title={t('pb.profile.failedTitle')} body={t('pb.yc.failedBody')} retryLabel={t('common.tryAgain')} onRetry={resource.reload} /> : null}
      {p ? (
        <>
          <View style={styles.who}>
            <View style={styles.avatar}><Text style={styles.initials}>{initialsOf(p.fullName)}</Text></View>
            <Text accessibilityRole="header" style={boardText.title}>{p.fullName}</Text>
            <Text style={boardText.body}>{[p.university, p.isVerifiedStudent ? t('pb.profile.verified') : t('pb.profile.unverified')].filter(Boolean).join(' · ')}</Text>
          </View>
          {groups.map((group) => (
            <BoardSection key={group.label} label={group.label}>
              <View style={styles.group}>
                {group.rows.map((row, i) => (
                  <ProfileRow key={row.key} label={row.label} value={row.value} divider={i < group.rows.length - 1} onPress={links.edit} />
                ))}
              </View>
            </BoardSection>
          ))}
          <Text style={[boardText.body, styles.note]}>{t('pb.profile.campusNote')}</Text>
        </>
      ) : null}
    </BoardScreen>
  );
}

function ProfileRow({ label, value, divider, onPress }: { label: string; value: string; divider: boolean; onPress?: () => void }): React.ReactElement {
  const body = (
    <>
      <View style={styles.rowWords}>
        <Text style={boardText.meta}>{label}</Text>
        <Text style={boardText.strong}>{value}</Text>
      </View>
      {onPress ? <Icon name="chevron-right" size={size.navIcon - space.s2} color={color.text3} /> : null}
    </>
  );
  const look = [styles.row, divider ? styles.divider : null];
  if (!onPress) return <View style={look}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress}
      style={({ focused }: { pressed: boolean; focused?: boolean }) => [...look, focused ? focusRing : null]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: size.touchTarget, paddingVertical: space.s12, paddingHorizontal: space.s16 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  rowWords: { flex: 1, minWidth: 0, gap: space.s2 },
  note: { textAlign: 'center' },
  who: { gap: space.s6 },
  avatar: { width: size.touchTarget + space.s24, height: size.touchTarget + space.s24, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center', marginBottom: space.s8 },
  initials: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  group: { backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, overflow: 'hidden' },
});
