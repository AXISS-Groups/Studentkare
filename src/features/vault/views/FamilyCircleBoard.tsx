import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BoardScreen } from '@/design-system/board/BoardKit';
import { Icon } from '@/design-system/icons';
import { LiftCard, M2Card, M2Grid, M2Header, M2Heading, M2PageHero, M2Tile3d, M2WideColumn, m2Text } from '@/design-system/m2';
import { color, space } from '@/design-system/theme';
import { useT } from '@/i18n';

export interface FamilyCircleLinks {
  back?: () => void;
  emergencyCard: () => void;
  /** Where a student shares a record with a clinician (and sees who can see what). */
  consent: () => void;
}

/**
 * Care circle (canvas page 2: FamilyCircle, Tier 1 — approved by Krishna
 * Chintakayala, 2026-10-21; Tier 1 look T1CareCircle / T1CareCircleDesktop,
 * approved 2026-10-24, plan tier1-parity-2026-10-24 §16). There is no
 * care-circle or family-share API (D6-12), so the board's guardian card,
 * switches and "leave" are not drawn: a switch that changes nothing would let
 * a student believe their family can, or cannot, see something. The screen
 * says nothing is shared, keeps the board's "paying does not buy access"
 * promise (true by Rule L), and points to what works: the emergency card and
 * clinician sharing.
 *
 * `embedded` drops the header when the board sits inside the records hub;
 * `wide` lays the three cards out in a row inside the desktop shell's column.
 */
export function FamilyCircleBoard({ links, embedded = false, wide = false }: { links: FamilyCircleLinks; embedded?: boolean; wide?: boolean }): React.ReactElement {
  const t = useT();
  const content = (
    <>
      {embedded ? null : <M2Header backLabel={t('common.back')} onBack={links.back} title={t('sf.fam.header')} testID="family-header" />}
      <M2PageHero hue="rose" icon="users" title={t('sf.fam.title')} body={t('fam.unavailable')} testID="family-hero"
        art={<M2Tile3d icon="users" hue="rose" size={88} float />} artOnPhone={false} />
      <M2Grid columns={{ phone: 1, tablet: 2, desktop: 3 }}>
        <M2Card fill style={styles.card} testID="family-pays">
          <View style={styles.head}>
            <M2Tile3d icon="shield-check" hue="green" />
            <View style={styles.grow}>
              <M2Heading style={m2Text.cardTitle}>{t('sf.fam.paysTitle')}</M2Heading>
              <Text style={m2Text.body}>{t('sf.fam.paysBody')}</Text>
            </View>
          </View>
        </M2Card>
        <M2Card fill style={styles.card}>
          <M2Heading style={m2Text.section}>{t('sf.fam.emergencyTitle')}</M2Heading>
          <Text style={m2Text.body}>{t('fam.emergency')}</Text>
          <LinkTile icon="heart-plus" hue="rose" label={t('fam.openCard')} onPress={links.emergencyCard} testID="family-open-card" />
        </M2Card>
        <M2Card fill style={styles.card}>
          <M2Heading style={m2Text.section}>{t('sf.fam.doctorTitle')}</M2Heading>
          <Text style={m2Text.body}>{t('fam.clinician')}</Text>
          <LinkTile icon="eye" hue="indigo" label={t('sf.fam.openConsent')} onPress={links.consent} testID="family-open-consent" />
        </M2Card>
      </M2Grid>
    </>
  );
  if (wide) return <M2WideColumn testID="family-circle">{content}</M2WideColumn>;
  return <BoardScreen testID="family-circle">{content}</BoardScreen>;
}

/** A lifted link row with a 3D tile (the board's "Update emergency card" / "See who can see what"). */
function LinkTile({ icon, hue, label, onPress, testID }: { icon: 'heart-plus' | 'eye'; hue: 'rose' | 'indigo'; label: string; onPress: () => void; testID: string }) {
  return (
    <LiftCard label={label} onPress={onPress} style={styles.link} testID={testID}>
      <M2Tile3d icon={icon} hue={hue} size={40} />
      <Text style={[m2Text.cardTitle, styles.grow]}>{label}</Text>
      <Icon name="chevron-right" size={16} color={color.text3} strokeWidth={2.6} />
    </LiftCard>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: space.s4 },
  card: { padding: space.s16, gap: space.s10 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12 },
  link: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s12, borderRadius: 18, backgroundColor: color.surface2 },
});
