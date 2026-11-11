import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

type Member = { initial: string; name: string; sub: string; locked: boolean; active?: boolean };

function membersFor(t: ReturnType<typeof useT>): readonly Member[] {
  return [
    { initial: t('preview.k'), name: t('preview.you'), sub: t('preview.ownRecordFullAccess'), locked: false, active: true },
    { initial: t('preview.a'), name: t('preview.amma'), sub: t('preview.shortListOnlyNoClinicalDetail'), locked: true },
  ];
}

/**
 * Flat, non-functional, net-new concept: an avatar-circle family-member
 * switcher (You / member name+age / lock icon) plus an "Add member"
 * button, modeled on Tata 1mg's own Family Hub screen from the video
 * Krishna shared. There is no brief or ticket for this — it is explicitly
 * the pattern StudentKare's real, briefed `FamilyCircle` screen
 * (`M2FamilyCirclePreview.tsx`) was built to avoid: 1mg's switcher lets
 * one account see another member's full record, which conflicts with
 * this product's 18+, student-owned-record architecture (AGENTS.md rule
 * 8). Built anyway, flagged as a concept-only preview, per Krishna's
 * explicit call: the lock icon on every member but "You" is the whole
 * point — it stands for "can't switch into this", not a real switch.
 * Nothing here is wired; tapping a member or "Add member" does nothing.
 * If this direction is wanted for real, it needs its own brief and
 * ticket, and — because it touches identity/access to another person's
 * record — a named reviewer, same as any Tier-1 consent screen. See
 * NOTES.md.
 */
export function M2FamilyHubPreview(): React.ReactElement {
  const t = useT();
  const members = membersFor(t);
  return (
    <View style={styles.screen} testID="preview-m2-family-hub">
      <View style={styles.header}>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
          <Icon name="arrow-left" size={20} color={color.text} />
        </Pressable>
        <Text style={styles.title}>{t('preview.family')}</Text>
      </View>
      <View style={styles.scroll}>
        <View style={styles.body}>
          <Text style={m2Text.meta}>{t('preview.switchToSeeWhatEachMemberSharesWithYou')}</Text>
          <View style={styles.row}>
            {members.map((m) => (
              <Pressable key={m.name} role="button" accessibilityRole="button" accessibilityLabel={m.name} onPress={noop}
                style={({ focused }: PressState) => [styles.memberCol, focused ? focusRing : null]}>
                <View style={[styles.avatar, m.active ? styles.avatarActive : null]}>
                  <Text style={styles.avatarText}>{m.initial}</Text>
                  {m.locked ? (
                    <View style={styles.lockBadge}>
                      <Icon name="lock-5" size={11} color={color.onAction} />
                    </View>
                  ) : null}
                </View>
                <Text style={styles.memberName}>{m.name}</Text>
                <Text style={styles.memberSub}>{m.sub}</Text>
              </Pressable>
            ))}
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('preview.addMember')} onPress={noop}
              style={({ focused }: PressState) => [styles.memberCol, focused ? focusRing : null]}>
              <View style={styles.addAvatar}>
                <Icon name="plus" size={20} color={color.action} />
              </View>
              <Text style={styles.addLabel}>{t('preview.addMember')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { height: 64, paddingHorizontal: space.gutterPhone, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s16 },
  row: { flexDirection: 'row', gap: space.s16, flexWrap: 'wrap' },
  memberCol: { width: 84, alignItems: 'center', gap: space.s4, borderRadius: radius.md },
  avatar: { width: 56, height: 56, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  avatarActive: { backgroundColor: color.actionSoft, borderWidth: 2, borderColor: color.action },
  avatarText: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  lockBadge: { position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: radius.full, backgroundColor: color.text3, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: color.canvas },
  memberName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text, textAlign: 'center' },
  memberSub: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.text3, textAlign: 'center' },
  addAvatar: { width: 56, height: 56, borderRadius: radius.full, backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.actionSoft, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.action, textAlign: 'center' },
});
