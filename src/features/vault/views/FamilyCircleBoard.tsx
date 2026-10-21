import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/design-system';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardCard, BoardScreen, boardText } from '@/design-system/board/BoardKit';
import { color, radius, space } from '@/design-system/theme';
import { useT } from '@/i18n';

export interface FamilyCircleLinks {
  back?: () => void;
  emergencyCard: () => void;
  /** Where a student shares a record with a clinician (and sees who can see what). */
  consent: () => void;
}

/**
 * Care circle (canvas page 2: FamilyCircle, Tier 1 — approved by Krishna
 * Chintakayala, 2026-10-21). There is no care-circle or family-share API
 * (D6-12), so the board's guardian card, switches and "leave" are not drawn:
 * a switch that changes nothing would let a student believe their family can,
 * or cannot, see something. The screen says nothing is shared, keeps the
 * board's "paying does not buy access" promise (true by Rule L), and points to
 * what works: the emergency card and clinician sharing.
 *
 * `embedded` drops the header when the board sits inside the records hub.
 */
export function FamilyCircleBoard({ links, embedded = false }: { links: FamilyCircleLinks; embedded?: boolean }): React.ReactElement {
  const t = useT();
  return (
    <BoardScreen testID="family-circle">
      {embedded ? null : <BoardHeader title={t('sf.fam.header')} backIcon="arrow-left" backLabel={t('common.back')} onBack={links.back} />}
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={boardText.title}>{t('sf.fam.title')}</Text>
        <Text style={boardText.body}>{t('fam.unavailable')}</Text>
      </View>

      <View style={styles.pays} testID="family-pays">
        <Text style={[boardText.strong, { color: color.info }]}>{t('sf.fam.paysTitle')}</Text>
        <Text style={[boardText.body, { color: color.info }]}>{t('sf.fam.paysBody')}</Text>
      </View>

      <BoardCard>
        <Text style={boardText.strong}>{t('sf.fam.emergencyTitle')}</Text>
        <Text style={boardText.body}>{t('fam.emergency')}</Text>
        <Button label={t('fam.openCard')} fullWidth onPress={links.emergencyCard} testID="family-open-card" />
      </BoardCard>

      <BoardCard>
        <Text style={boardText.strong}>{t('sf.fam.doctorTitle')}</Text>
        <Text style={boardText.body}>{t('fam.clinician')}</Text>
        <Button label={t('sf.fam.openConsent')} variant="secondary" fullWidth onPress={links.consent} />
      </BoardCard>
    </BoardScreen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: space.s8 },
  pays: { gap: space.s6, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.surface3 },
});
