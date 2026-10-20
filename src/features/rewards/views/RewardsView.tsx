import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Button, Card, EmptyState, ErrorState, Eyebrow, ListRow, Note, Rise, Skeleton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { color, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { RewardsViewModel } from '../viewmodel/RewardsViewModel';
import type { MedalId } from '../viewmodel/RewardsViewModel';
import type { InviteShare, ShareOutcome } from '../shareTypes';
import { canCopyLink, copyInvite, shareInvite } from '../share';

const MEDAL_ICON: Record<MedalId, SkIconName> = {
  PROFILE_VERIFIED: 'shield-check',
  EMERGENCY_CARD_COMPLETE: 'id-card',
  FIRST_HEALTH_CAMP: 'first-aid-kit',
  FRIEND_JOINED: 'users',
};

export interface RewardsActions {
  share: (invite: InviteShare) => Promise<ShareOutcome>;
  copy: (text: string) => Promise<ShareOutcome>;
  canCopy: boolean;
}

// Icon sizes from the spacing scale (there is no separate icon-size token).
const ICON_TILE = space.s24;
const ICON_MEDAL = space.s20;
const ICON_BUTTON = space.s16;

const platformActions: RewardsActions = { share: shareInvite, copy: copyInvite, canCopy: canCopyLink };

/**
 * Invite friends + Points & medals (Tier 3, settings; no canvas brief), one
 * source for web and native, built from design-system components.
 *
 * Calm on purpose (DESIGN.md §2): no confetti, no streaks, no leaderboard, no
 * comparison with anyone. Points come only from friends who join and are
 * verified; medals only from things the student did, never from a value.
 * Referral numbers are counts, never names.
 */
export const RewardsView = observer(function RewardsView({
  viewModel: vm,
  actions = platformActions,
}: {
  viewModel: RewardsViewModel;
  actions?: RewardsActions;
}) {
  const t = useT();
  const referral = vm.referral;
  const message = referral ? t('rewards.share.message', { code: referral.code, link: referral.shareUrl }) : '';
  const compose = (code: string, link: string): InviteShare => ({
    message: t('rewards.share.message', { code, link }),
    url: link,
    title: t('rewards.share.title'),
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Rise>
        <Eyebrow>{t('rewards.eyebrow')}</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>
          {t('rewards.title')}
        </Text>
      </Rise>

      {vm.phase === 'loading' ? <Skeleton label={t('rewards.loading')} lines={['60%', '100%', '100%', '40%', '100%']} /> : null}

      {vm.phase === 'failed' ? (
        <ErrorState
          title={t('rewards.failedTitle')}
          body={t('rewards.failedBody')}
          retryLabel={t('common.tryAgain')}
          onRetry={() => void vm.load()}
        />
      ) : null}

      {vm.phase === 'ready' && referral && vm.points ? (
        <>
          <Rise index={1}>
            <Card>
              <View style={styles.inviteRow}>
                <View style={styles.iconTile}>
                  <Icon name="share" size={ICON_TILE} color={color.action} />
                </View>
                <View style={styles.grow}>
                  <ListRow
                    testID="rewards-invite"
                    title={t('rewards.inviteRow')}
                    detail={t('rewards.inviteDetail', { points: referral.pointsPerReferral })}
                    accessibilityLabel={t('rewards.inviteSpoken')}
                    onPress={() => void vm.share(actions.share, compose)}
                  />
                </View>
              </View>
              <View style={styles.codeRow}>
                <View style={styles.grow}>
                  <Text style={styles.meta}>{t('rewards.yourCode')}</Text>
                  <Text selectable style={styles.code} accessibilityLabel={t('rewards.yourCodeSpoken', { code: referral.code.split('').join(' ') })}>
                    {referral.code}
                  </Text>
                </View>
                {actions.canCopy ? (
                  <Button
                    label={t('rewards.copyLink')}
                    accessibilityLabel={t('rewards.copyLinkSpoken')}
                    variant="secondary"
                    icon={<Icon name="copy" size={ICON_BUTTON} color={color.action} />}
                    onPress={() => void vm.copy(actions.copy, message)}
                  />
                ) : null}
              </View>
              {vm.lastShare === 'copied' ? <Note tone="positive">{t('rewards.share.copied')}</Note> : null}
              {vm.lastShare === 'failed' ? <Note tone="danger">{t('rewards.share.failed')}</Note> : null}
              {vm.lastShare === 'failed' ? <Text selectable style={styles.link}>{referral.shareUrl}</Text> : null}
            </Card>
          </Rise>

          <Rise index={2}>
            <Card>
              <Text accessibilityRole="header" style={styles.cardTitle}>{t('rewards.points.title')}</Text>
              <View style={styles.balanceRow} accessible accessibilityLabel={t('rewards.points.balanceSpoken', { balance: vm.points.balance })}>
                <Icon name="star" size={ICON_TILE} color={color.action} />
                <Text style={styles.balance}>{vm.points.balance}</Text>
                <Text style={styles.meta}>{t('rewards.points.balance')}</Text>
              </View>
              <Note tone="info">{t('rewards.points.note')}</Note>
              <ListRow title={t('rewards.counts.invited')} value={String(referral.counts.invited)} />
              <ListRow title={t('rewards.counts.joined')} value={String(referral.counts.joined)} />
              <ListRow title={t('rewards.counts.rewarded')} value={String(referral.counts.rewarded)} />
              <Text style={styles.meta}>{t('rewards.cap', { cap: referral.monthlyCap, count: referral.rewardedThisMonth })}</Text>
              <Text style={styles.meta}>{t('rewards.counts.private')}</Text>
            </Card>
          </Rise>

          <Rise index={3}>
            <Card>
              <Text accessibilityRole="header" style={styles.cardTitle}>{t('rewards.medals.title')}</Text>
              {vm.earnedMedals.length === 0 ? (
                <EmptyState title={t('rewards.medals.empty')} body={t('rewards.medals.emptyBody')} />
              ) : (
                <View role="list" style={styles.medals}>
                  {vm.earnedMedals.map((id) => (
                    <View key={id} role="listitem" style={styles.medal} testID={`medal-${id}`}>
                      <View style={styles.iconTile}>
                        <Icon name={MEDAL_ICON[id]} size={ICON_MEDAL} color={color.action} />
                      </View>
                      <Text style={styles.medalLabel}>{t(`rewards.medal.${id}` as MessageKey)}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.meta}>{t('rewards.medals.private')}</Text>
            </Card>
          </Rise>
        </>
      ) : null}
    </ScrollView>
  );
});

/** Owns the view model's lifetime for a route on either platform. */
export function RewardsRoute(): React.ReactElement {
  const [vm] = useState(() => new RewardsViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <RewardsView viewModel={vm} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: size.panelMax },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginTop: space.s4 },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  grow: { flex: 1, minWidth: 0 },
  iconTile: { width: size.touchTarget, height: size.touchTarget, borderRadius: radius.md, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, flexWrap: 'wrap' },
  code: { fontFamily: font.family.mono, fontSize: font.size.title, fontWeight: fontWeight(font.weight.strong), color: color.text, letterSpacing: space.s2 },
  link: { fontFamily: font.family.mono, fontSize: font.size.bodySm, color: color.text2 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  balance: { fontFamily: font.family.mono, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  medals: { gap: space.s8 },
  medal: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: size.touchTarget },
  medalLabel: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.body, color: color.text },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
});
