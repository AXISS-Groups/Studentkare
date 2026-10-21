import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { ErrorState, Rise, Skeleton } from '@/design-system';
import { M2Card, M2Heading, M2_NAV_CLEARANCE, RoundButton, m2Text, useOwnPhoneChrome } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import { mapUrl } from '../model/geo';
import type { Facility } from '../model/types';
import type { CareDirectoryViewModel } from '../viewmodel/CareDirectoryViewModel';
import { EmergencyStrip, PlaceActions, PlaceChips, TypeTile, checkedDate, distanceLabel, placeMeta } from './careDirectoryParts';

/**
 * One place (M2FacilityDetail): what the directory knows, and how it was
 * checked. Call and Directions only when the listing has a number and
 * coordinates. The compact 112 / 108 strip stays at the foot.
 */

function InfoCard({ icon, title, children, testID }: { icon: SkIconName; title: string; children: React.ReactNode; testID: string }) {
  return (
    <M2Card style={styles.info} testID={testID}>
      <View style={styles.infoIcon}><Icon name={icon} size={18} color={color.action} strokeWidth={2.2} /></View>
      <View style={styles.grow}>
        <M2Heading style={m2Text.eyebrow}>{title}</M2Heading>
        {children}
      </View>
    </M2Card>
  );
}

function ExternalLink({ label, spoken, url, testID }: { label: string; spoken: string; url: string; testID: string }) {
  return (
    <Pressable role="link" accessibilityRole="link" accessibilityLabel={spoken} aria-label={spoken} onPress={() => void Linking.openURL(url)} testID={testID}
      style={({ focused }: PressState) => [styles.link, focused ? focusRing : null]}>
      <Text style={m2Text.link}>{label}</Text>
      <Icon name="arrow-up-right" size={14} color={color.action} strokeWidth={2.4} />
    </Pressable>
  );
}

const Body = observer(function Body({ facility, vm }: { facility: Facility; vm: CareDirectoryViewModel }) {
  const t = useT();
  const distanceKm = vm.distanceTo(facility);
  const { coordinates } = facility;
  return (
    <>
      <Rise style={styles.gutter}>
        <View style={styles.titleRow}>
          <TypeTile kind={facility.kind} tile={58} iconSize={28} />
          <View style={styles.grow}>
            <M2Heading level={1} style={styles.title}>{facility.name}</M2Heading>
            <Text style={m2Text.body}>{placeMeta(facility, t)}</Text>
            {distanceKm !== null ? <Text style={styles.distance} testID="fc-detail-distance">{t('fc.away', { distance: distanceLabel(distanceKm, t) })}</Text> : null}
          </View>
        </View>
        <PlaceChips facility={facility} />
      </Rise>
      <Rise index={1} style={styles.gutter}><PlaceActions facility={facility} testID="fc-detail" /></Rise>
      <Rise index={2} style={[styles.gutter, styles.cards]}>
        {facility.address || coordinates ? (
          <InfoCard icon="map-pin-2" title={t('fc.d.address')} testID="fc-detail-address">
            {facility.address ? <Text style={m2Text.body}>{[facility.address, facility.pincode].filter(Boolean).join(' · ')}</Text> : null}
            {coordinates ? (
              <ExternalLink label={t('fc.d.openMaps')} spoken={t('fc.d.openMapsSpoken', { name: facility.name })} url={mapUrl(coordinates)} testID="fc-detail-map" />
            ) : <Text style={m2Text.meta}>{t('fc.d.noPin')}</Text>}
          </InfoCard>
        ) : null}
        <InfoCard icon="clock" title={t('fc.d.hours')} testID="fc-detail-hours">
          <Text style={m2Text.body}>{facility.emergency24x7 ? t('fc.open247') : facility.hoursText || t('fc.d.noHours')}</Text>
          {facility.emergency24x7 && facility.hoursText ? <Text style={m2Text.meta}>{facility.hoursText}</Text> : null}
        </InfoCard>
        {facility.departments.length ? (
          <InfoCard icon="stethoscope" title={t('fc.d.departments')} testID="fc-detail-departments">
            <View style={styles.depts}>
              {facility.departments.map((name) => <View key={name} style={styles.dept}><Text style={styles.deptText}>{name}</Text></View>)}
            </View>
          </InfoCard>
        ) : null}
        <InfoCard icon="shield-check" title={t('fc.d.checked')} testID="fc-detail-checked">
          <Text style={m2Text.body}>
            {facility.source === 'PARTNER'
              ? t('fc.d.checkedPartner', { date: checkedDate(facility.verifiedOn) })
              : t('fc.d.checkedHow', { date: checkedDate(facility.verifiedOn), how: facility.sourceNote })}
          </Text>
          {facility.campus ? <Text style={m2Text.meta}>{t('fc.d.campusOnly', { campus: facility.campus })}</Text> : null}
          {facility.sourceUrl ? (
            <ExternalLink label={t('fc.d.source')} spoken={t('fc.d.sourceSpoken', { name: facility.name })} url={facility.sourceUrl} testID="fc-detail-source" />
          ) : null}
        </InfoCard>
        <View style={styles.note} testID="fc-detail-note">
          <Icon name="info" size={16} color={color.info} strokeWidth={2.2} />
          <Text style={[m2Text.body, styles.grow]}>{t('fc.d.callFirst')}</Text>
        </View>
      </Rise>
    </>
  );
});

export const FacilityDetailView = observer(function FacilityDetailView({ vm, onBack, wide = false }: { vm: CareDirectoryViewModel; onBack: () => void; wide?: boolean }) {
  const t = useT();
  useOwnPhoneChrome();
  const facility = vm.detail;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, wide ? styles.contentWide : null]} testID="fc-detail">
      <View style={[styles.gutter, styles.head]}>
        <RoundButton icon="arrow-left" label={t('fc.d.back')} onPress={onBack} testID="fc-detail-back" />
        <Text style={styles.eyebrow}>{t('fc.eyebrow')}</Text>
      </View>
      {vm.detailPhase === 'loading' ? <View style={styles.gutter}><Skeleton label={t('fc.d.loading')} lines={['70%', '100%', '90%']} /></View> : null}
      {vm.detailPhase === 'error' ? (
        <View style={styles.gutter}>
          <ErrorState title={t('fc.failedTitle')} body={t('fc.failedBody')} retryLabel={t('fc.d.backToList')} onRetry={onBack} reference={{ label: t('fc.reference'), code: 'FC-PLACE' }} />
        </View>
      ) : null}
      {vm.detailPhase === 'missing' ? (
        <View style={styles.gutter}>
          <M2Card style={styles.missing} testID="fc-detail-missing">
            <Text style={m2Text.cardTitle}>{t('fc.d.missing')}</Text>
            <Text style={m2Text.body}>{t('fc.d.missingBody')}</Text>
          </M2Card>
        </View>
      ) : null}
      {vm.detailPhase === 'ready' && facility ? <Body facility={facility} vm={vm} /> : null}
      <View style={styles.gutter}><EmergencyStrip compact testID="fc-detail-emergency" /></View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingTop: space.s16, paddingBottom: M2_NAV_CLEARANCE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center' },
  contentWide: { maxWidth: size.panelMax, paddingBottom: space.s40 },
  gutter: { paddingHorizontal: space.gutterPhone },
  grow: { flex: 1, minWidth: 0, gap: space.s4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  titleRow: { flexDirection: 'row', gap: space.s14, alignItems: 'flex-start', marginBottom: space.s8 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, lineHeight: 26, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.4, color: color.text },
  distance: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  cards: { gap: space.s12 },
  info: { borderRadius: 22, padding: space.s14, flexDirection: 'row', gap: space.s12 },
  infoIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface3 },
  link: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s4, alignSelf: 'flex-start' },
  depts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6, marginTop: space.s2 },
  dept: { paddingHorizontal: space.s10, paddingVertical: space.s6, borderRadius: radius.full, backgroundColor: color.surface2 },
  deptText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  note: { flexDirection: 'row', gap: space.s10, padding: space.s14, borderRadius: radius.xl, backgroundColor: color.surface3 },
  missing: { borderRadius: 22, padding: space.s16, gap: space.s6 },
});
