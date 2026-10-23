import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { EmptyState, ErrorState, Skeleton } from '@/design-system';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardArt, BoardScreen, BoardSection, Pill, PrivacyNote, TextLink, boardText } from '@/design-system/board/BoardKit';
import { Button } from '@/design-system';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import { useT } from '@/i18n';
import type { Page, VaccineOffering } from '../models';
import { rupees } from '@/features/phoneboards/format';

export interface PreventiveCareLinks {
  back?: () => void;
  /** The campus health camp (free on campus). */
  camp?: () => void;
  /** The full preventive tools: search by pincode, report reviews, reminders. */
  more?: () => void;
}

const LISTED = 20;

/**
 * Preventive care (canvas page 2, PreventiveCare, Tier 2): vaccines offered by
 * listed providers, as the directory records them (price, whether availability
 * was confirmed, when it was checked), and the campus camp.
 *
 * The board's "pending on you" timeline (dose 2 due, a repeat test a doctor
 * asked for) needs a personal immunisation schedule the app does not hold, so
 * it is not drawn; nothing here claims a vaccine is due.
 */
export function PreventiveCareBoard({ links }: { links: PreventiveCareLinks }): React.ReactElement {
  const t = useT();
  const offers = useApiResource<Page<VaccineOffering>>(`/preventive/vaccines?offset=0&limit=${LISTED}`);
  const items = offers.data?.items ?? [];

  return (
    <BoardScreen testID="preventive-care">
      <BoardHeader title={t('pb.prev.title')} backIcon="arrow-left" backLabel={t('common.back')} onBack={links.back} />

      <View style={styles.hero}>
        <View style={styles.heroWords}>
          <Text style={boardText.eyebrow}>{t('pb.prev.eyebrow')}</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>
            {offers.data ? t('pb.prev.count', { count: offers.data.total }) : t('pb.prev.title')}
          </Text>
          <Text style={boardText.body}>{t('pb.prev.heroBody')}</Text>
        </View>
        <BoardArt name="a-clinician-giving-a-vaccine-fe143c.png" width={120} height={104} alt={t('pb.prev.art')} />
      </View>

      {offers.loading ? <Skeleton label={t('pb.prev.loading')} lines={['100%', '80%', '100%']} /> : null}
      {offers.error && !offers.loading ? <ErrorState title={t('pb.prev.failedTitle')} body={t('pb.yc.failedBody')} retryLabel={t('common.tryAgain')} onRetry={offers.reload} /> : null}
      {offers.data && items.length === 0 ? <EmptyState title={t('pb.prev.emptyTitle')} body={t('pb.prev.emptyBody')} /> : null}

      {items.length ? (
        <BoardSection label={t('pb.prev.listed')}>
          {items.map((o, i) => {
            const confirmed = o.availability === 'CONFIRMED';
            const url = o.bookingUrl ?? o.sourceUrl;
            return (
              <View key={o.id} style={styles.item} testID={`vaccine-${o.id}`}>
                <View style={styles.rail}>
                  <View style={[styles.dot, { backgroundColor: confirmed ? color.positive : color.ruleStrong }]} />
                  {i < items.length - 1 ? <View style={styles.line} /> : null}
                </View>
                <View style={styles.itemBody}>
                  <View style={styles.titleLine}>
                    <Text style={[boardText.strong, styles.flex]}>{o.vaccineName}</Text>
                    <Pill label={confirmed ? t('pb.prev.available') : t('pb.prev.checkFirst')} tone={confirmed ? 'positive' : 'neutral'} />
                  </View>
                  <Text style={boardText.body}>{[o.providerName, o.region].filter(Boolean).join(' · ')}</Text>
                  <Text style={boardText.meta}>{o.pricePaise === null ? t('pb.prev.noPrice') : t('pb.prev.price', { price: rupees(o.pricePaise) })}</Text>
                  {url ? <TextLink label={o.bookingUrl ? t('pb.prev.book') : t('pb.prev.source')} onPress={() => void Linking.openURL(url)} /> : null}
                </View>
              </View>
            );
          })}
        </BoardSection>
      ) : null}

      <PrivacyNote icon="lock-3">{t('pb.prev.privacy')}</PrivacyNote>
      {links.camp ? <Button label={t('pb.prev.camp')} size="cta" fullWidth onPress={links.camp} /> : null}
      {links.more ? <TextLink label={t('pb.prev.more')} onPress={links.more} /> : null}
    </BoardScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.s12, backgroundColor: color.surface3, borderRadius: radius.sheet, padding: space.s20 },
  heroWords: { flex: 1, gap: space.s4 },
  heroTitle: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  item: { flexDirection: 'row', gap: space.s12 },
  rail: { alignItems: 'center', width: space.s12 },
  dot: { width: space.s10, height: space.s10, borderRadius: radius.full, marginTop: space.s6 },
  line: { flex: 1, width: 2, marginTop: space.s4, backgroundColor: color.surface3 },
  itemBody: { flex: 1, gap: space.s2, paddingBottom: space.s16 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
});
