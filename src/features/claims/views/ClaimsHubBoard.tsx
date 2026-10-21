import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EmptyState, ErrorState, Skeleton } from '@/design-system';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardCard, BoardScreen, BoardSection, HeroCard, IconTile, Pill, PrivacyNote, TextLink, boardText } from '@/design-system/board/BoardKit';
import type { SkIconName } from '@/design-system/icons';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import type { ClaimRequest, LivePolicy } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import { rupees, shortDate } from '@/features/phoneboards/format';

export interface ClaimsHubLinks {
  back?: () => void;
  /** Prepare a claim or add a policy (web: the insurance form). */
  newClaim?: () => void;
}

/** The claim's tile, from what the student wrote it was for. */
function iconOf(service: string): SkIconName {
  const s = service.toLowerCase();
  if (/(lab|test|panel|blood|scan)/.test(s)) return 'flask-2';
  if (/(physio|therap|clinic|visit|consult)/.test(s)) return 'map-pin';
  return 'first-aid-kit';
}

/** The four steps a claim goes through; a prepared claim has done the first. */
const STEPS = 4;

/**
 * Cover & claims (canvas page 2, ClaimsHub, Tier 2): the policy and the claims
 * the student prepared. Honest about where things are: no insurer is connected,
 * so a claim is "prepared, not sent", and the card shows the sum insured as
 * recorded, not a remaining balance the app cannot know.
 */
export function ClaimsHubBoard({ links }: { links: ClaimsHubLinks }): React.ReactElement {
  const t = useT();
  const policies = useApiResource<{ items: LivePolicy[] }>('/health/policies');
  const claims = useApiResource<{ items: ClaimRequest[] }>('/insurance/claims');
  const today = new Date().toISOString().slice(0, 10);
  const policy = policies.data?.items.find((p) => p.validUntil >= today) ?? policies.data?.items[0];
  const active = policy ? policy.validUntil >= today : false;

  return (
    <BoardScreen testID="claims-hub">
      <BoardHeader title={t('pb.claims.title')} subtitle={policy ? policy.insurer : undefined} backIcon="arrow-left" backLabel={t('common.back')} onBack={links.back} />
      {policies.loading ? <Skeleton label={t('pb.claims.loading')} lines={['100%', '60%', '100%']} /> : null}
      {policies.error && !policies.loading ? <ErrorState title={t('pb.claims.failedTitle')} body={t('pb.yc.failedBody')} retryLabel={t('common.tryAgain')} onRetry={policies.reload} /> : null}
      {policies.data && !policy ? (
        <EmptyState title={t('pb.claims.noPolicyTitle')} body={t('pb.claims.noPolicyBody')} action={links.newClaim ? { label: t('pb.claims.addPolicy'), onPress: links.newClaim } : undefined} />
      ) : null}

      {policy ? (
        <HeroCard testID="claims-cover">
          <View style={styles.coverTop}>
            <Text style={boardText.heroEyebrow}>{t('pb.claims.sumInsured')}</Text>
            <View style={styles.status}>
              <View style={[styles.dot, { backgroundColor: active ? color.onHeroPositive : color.onHeroAttention }]} />
              <Text style={styles.statusText}>{active ? t('pb.id.active') : t('pb.id.expired')}</Text>
            </View>
          </View>
          <Text style={styles.amount}>{rupees(policy.sumInsured * 100)}</Text>
          <Text style={boardText.heroBody}>{t('pb.claims.policyLine', { number: policy.policyNumber, date: policy.validUntil })}</Text>
        </HeroCard>
      ) : null}

      {policy || claims.data?.items.length ? (
        <BoardSection label={t('pb.claims.yours')} link={links.newClaim ? { label: t('pb.claims.new'), onPress: links.newClaim } : undefined}>
          {claims.loading ? <Skeleton label={t('pb.claims.loading')} lines={['100%', '70%']} /> : null}
          {claims.data && claims.data.items.length === 0 ? <Text style={boardText.body}>{t('pb.claims.none')}</Text> : null}
          {claims.data?.items.map((c) => (
            <BoardCard key={c.id} testID={`claim-${c.id}`}>
              <View style={styles.claimTop}>
                <IconTile icon={iconOf(c.service)} tone="action" />
                <View style={styles.flex}>
                  <Text style={boardText.strong}>{[c.service, c.providerName].filter(Boolean).join(' · ') || t('pb.claims.claim')}</Text>
                  <Text style={boardText.meta}>{t('pb.claims.prepared', { date: shortDate(c.createdAt) })}</Text>
                </View>
                <Pill label={c.status === 'DRAFT' ? t('pb.claims.notSent') : c.status} tone="attention" dot />
              </View>
              <View style={styles.steps} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {Array.from({ length: STEPS }, (_, i) => <View key={i} style={[styles.step, i === 0 ? styles.stepDone : null]} />)}
              </View>
              <View style={styles.claimFoot}>
                <Text style={[boardText.meta, styles.flex]}>{t('pb.claims.stage')}</Text>
                <Text style={styles.claimAmount}>{rupees(c.amountPaise)}</Text>
              </View>
            </BoardCard>
          ))}
        </BoardSection>
      ) : null}

      <PrivacyNote icon="lock-3">{t('pb.claims.privacy')}</PrivacyNote>
      {links.newClaim && policy ? <TextLink label={t('pb.claims.manage')} onPress={links.newClaim} /> : null}
    </BoardScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: space.s2 },
  coverTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.s6, borderRadius: radius.full, backgroundColor: color.onHeroVeil, paddingHorizontal: space.s10, paddingVertical: space.s4 },
  dot: { width: space.s6, height: space.s6, borderRadius: radius.full },
  statusText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  amount: { fontFamily: font.family.sans, fontSize: font.size.display, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  claimTop: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  steps: { flexDirection: 'row', gap: space.s6 },
  step: { flex: 1, height: space.s4, borderRadius: radius.full, backgroundColor: color.surface3 },
  stepDone: { backgroundColor: color.attention },
  claimFoot: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  claimAmount: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
});
