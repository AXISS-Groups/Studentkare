import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { AMBULANCE_NUMBER, EMERGENCY_NUMBER } from '@/design-system/CrisisLinks';
import { cardLabel, M2Card, SERVICE_HUES, m2Text, useLift } from '@/design-system/m2';
import type { PressState, ServiceHue } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, shadow, shadowStyle, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { directionsUrl, distanceParts, telUrl } from '../model/geo';
import type { Facility, FacilityKind } from '../model/types';
import type { CareDirectoryViewModel, ListedPlace } from '../viewmodel/CareDirectoryViewModel';

/**
 * The care directory's shared pieces (M2FindCare, M2FacilityDetail, WebFindCare):
 * the pinned emergency strip, the type tile, a place card, the location card
 * and the chips. React Native primitives, so the web and Expo draw the same.
 */

type T = ReturnType<typeof useT>;

export const KIND_STYLE: Readonly<Record<FacilityKind, { icon: SkIconName; hue: ServiceHue; label: MessageKey }>> = {
  HOSPITAL: { icon: 'hospital', hue: 'blue', label: 'fc.kind.HOSPITAL' },
  CLINIC: { icon: 'stethoscope', hue: 'sky', label: 'fc.kind.CLINIC' },
  PHARMACY: { icon: 'pill', hue: 'teal', label: 'fc.kind.PHARMACY' },
  AMBULANCE: { icon: 'ambulance', hue: 'orange', label: 'fc.kind.AMBULANCE' },
  BLOOD_BANK: { icon: 'droplet', hue: 'rose', label: 'fc.kind.BLOOD_BANK' },
};

/** "12 Oct 2026" from the server's ISO date, read as a calendar day (no time-zone shift). */
export function checkedDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function distanceLabel(km: number, t: T): string {
  const parts = distanceParts(km);
  return parts.unit === 'm' ? t('fc.distanceM', { metres: parts.value }) : t('fc.distanceKm', { km: parts.value });
}

/** Type · area, e.g. "Hospital · Kandi". */
export function placeMeta(facility: Facility, t: T): string {
  const kind = t(KIND_STYLE[facility.kind].label);
  const where = facility.area || facility.pincode;
  return where ? `${kind} · ${where}` : kind;
}

export function openTel(phone: string): void {
  void Linking.openURL(telUrl(phone));
}

/** The pinned emergency calls: 112 and 108, in every state, before anything loads. */
export function EmergencyStrip({ compact = false, testID = 'fc-emergency' }: { compact?: boolean; testID?: string }): React.ReactElement {
  const t = useT();
  const lines: readonly { number: string; icon: SkIconName; label: MessageKey; sub: MessageKey; spoken: MessageKey }[] = [
    { number: EMERGENCY_NUMBER, icon: 'phone', label: 'fc.call112', sub: 'fc.call112Sub', spoken: 'fc.call112Spoken' },
    { number: AMBULANCE_NUMBER, icon: 'ambulance', label: 'fc.call108', sub: 'fc.call108Sub', spoken: 'fc.call108Spoken' },
  ];
  return (
    <View style={[styles.strip, compact ? styles.stripCompact : null]} testID={testID}>
      {compact ? null : <Text style={m2Text.eyebrow}>{t('fc.emergencyEyebrow')}</Text>}
      <View style={styles.stripRow}>
        {lines.map((line) => (
          <Pressable key={line.number} role="link" accessibilityRole="link" {...cardLabel(t(line.spoken))}
            onPress={() => openTel(line.number)} testID={`${testID}-${line.number}`}
            style={({ focused }: PressState) => [styles.callBtn, focused ? focusRing : null]}>
            <Icon name={line.icon} size={20} color={color.onDangerFill} strokeWidth={2.2} />
            <View style={styles.grow}>
              <Text style={styles.callLabel}>{t(line.label)}</Text>
              {compact ? null : <Text style={styles.callSub}>{t(line.sub)}</Text>}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function TypeTile({ kind, tile = 46, iconSize = 22 }: { kind: FacilityKind; tile?: number; iconSize?: number }): React.ReactElement {
  const style = KIND_STYLE[kind];
  const hue = SERVICE_HUES[style.hue];
  return (
    <View style={[styles.tile, { width: tile, height: tile, backgroundColor: hue.soft }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Icon name={style.icon} size={iconSize} color={hue.ink} strokeWidth={2} />
    </View>
  );
}

export function PlaceChips({ facility, onHero = false }: { facility: Facility; onHero?: boolean }): React.ReactElement | null {
  const t = useT();
  const chips: { key: string; label: string; icon?: SkIconName }[] = [];
  if (facility.emergency24x7) chips.push({ key: '247', label: t('fc.chip247'), icon: 'clock' });
  if (facility.campus) chips.push({ key: 'campus', label: t('fc.chipCampus') });
  if (facility.source === 'PARTNER') chips.push({ key: 'partner', label: t('fc.chipPartner') });
  if (!chips.length) return null;
  return (
    <View style={styles.chips}>
      {chips.map((chip) => (
        <View key={chip.key} style={[styles.chip, onHero ? styles.chipOnHero : null]} testID={`fc-chip-${chip.key}`}>
          {chip.icon ? <Icon name={chip.icon} size={12} color={onHero ? color.onHero : color.text2} strokeWidth={2.4} /> : null}
          <Text style={[styles.chipText, onHero ? styles.chipTextOnHero : null]}>{chip.label}</Text>
        </View>
      ))}
    </View>
  );
}

function ActionPill({ icon, label, spoken, onPress, primary = false, testID }: {
  icon: SkIconName; label: string; spoken: string; onPress: () => void; primary?: boolean; testID: string;
}) {
  return (
    <Pressable role="link" accessibilityRole="link" accessibilityLabel={spoken} aria-label={spoken} onPress={onPress} testID={testID}
      style={({ focused }: PressState) => [styles.action, primary ? styles.actionPrimary : null, focused ? focusRing : null]}>
      <Icon name={icon} size={16} color={primary ? color.onAction : color.action} strokeWidth={2.4} />
      <Text style={[styles.actionText, primary ? styles.actionTextPrimary : null]}>{label}</Text>
    </Pressable>
  );
}

/** Call (only with a number) and Directions (only with coordinates). */
export function PlaceActions({ facility, testID }: { facility: Facility; testID: string }): React.ReactElement | null {
  const t = useT();
  const { phone, coordinates } = facility;
  if (!phone && !coordinates) return null;
  return (
    <View style={styles.actions}>
      {phone ? (
        <ActionPill icon="phone" primary label={t('fc.call')} spoken={t('fc.callSpoken', { name: facility.name, number: phone })}
          onPress={() => openTel(phone)} testID={`${testID}-call`} />
      ) : null}
      {coordinates ? (
        <ActionPill icon="directions" label={t('fc.directions')} spoken={t('fc.directionsSpoken', { name: facility.name })}
          onPress={() => void Linking.openURL(directionsUrl(coordinates))} testID={`${testID}-directions`} />
      ) : null}
    </View>
  );
}

export function FacilityCard({ place, onOpen, style }: { place: ListedPlace; onOpen: () => void; style?: object }): React.ReactElement {
  const t = useT();
  const lift = useLift();
  const { facility, distanceKm } = place;
  const meta = placeMeta(facility, t);
  const distance = distanceKm === null ? null : distanceLabel(distanceKm, t);
  const hours = facility.emergency24x7 ? t('fc.open247') : facility.hoursText;
  const spoken = [facility.name, meta, hours, distance ? t('fc.away', { distance }) : null, t('fc.details')].filter(Boolean).join('. ');
  return (
    <View style={[styles.card, style]} testID={`fc-place-${facility.id}`}>
      <Pressable role="link" accessibilityRole="link" accessibilityLabel={spoken} aria-label={spoken} onPress={onOpen} testID={`fc-open-${facility.id}`}
        style={(state: PressState) => [styles.cardMain, lift(state)]}>
        <TypeTile kind={facility.kind} />
        <View style={styles.grow}>
          <Text numberOfLines={2} style={m2Text.cardTitle}>{facility.name}</Text>
          <View style={styles.metaRow}>
            <Icon name="map-pin-2" size={12} color={color.text3} strokeWidth={2.2} />
            <Text numberOfLines={1} style={[m2Text.meta, styles.shrink]}>{meta}</Text>
          </View>
          <PlaceChips facility={facility} />
          {facility.hoursText && !facility.emergency24x7 ? (
            <View style={styles.metaRow}>
              <Icon name="clock" size={12} color={color.text3} strokeWidth={2.2} />
              <Text numberOfLines={2} style={[m2Text.meta, styles.shrink]}>{facility.hoursText}</Text>
            </View>
          ) : null}
          {facility.departments.length ? (
            <Text numberOfLines={1} style={m2Text.meta}>
              {facility.departments.length > DEPARTMENTS_SHOWN
                ? t('fc.departmentsMore', { names: facility.departments.slice(0, DEPARTMENTS_SHOWN).join(' · '), count: facility.departments.length - DEPARTMENTS_SHOWN })
                : facility.departments.join(' · ')}
            </Text>
          ) : null}
          {distance ? <Text style={styles.distance} testID={`fc-distance-${facility.id}`}>{t('fc.away', { distance })}</Text> : null}
        </View>
        <Icon name="chevron-right" size={16} color={color.text3} strokeWidth={2.4} />
      </Pressable>
      <View style={styles.cardFoot}>
        <View style={[styles.metaRow, styles.shrink]}>
          <Icon name="shield-check" size={13} color={color.positive} strokeWidth={2.2} />
          <Text numberOfLines={1} style={[m2Text.meta, styles.shrink]}>{t('fc.checked', { date: checkedDate(facility.verifiedOn) })}</Text>
        </View>
        <PlaceActions facility={facility} testID={`fc-${facility.id}`} />
      </View>
    </View>
  );
}

const DEPARTMENTS_SHOWN = 3;

/** "Sort by distance": asked for only on a tap, with the plain explainer; nothing leaves the device. */
export const LocationCard = observer(function LocationCard({ vm }: { vm: CareDirectoryViewModel }) {
  const t = useT();
  const state = vm.location;
  const title: MessageKey = state === 'on' ? 'fc.loc.onTitle' : state === 'asking' ? 'fc.loc.asking' : 'fc.loc.title';
  const body: MessageKey = {
    off: 'fc.loc.body', asking: 'fc.loc.body', on: 'fc.loc.onBody', denied: 'fc.loc.denied', unavailable: 'fc.loc.unavailable',
    timeout: 'fc.loc.timeout', unsupported: 'fc.loc.unsupported',
  }[state] as MessageKey;
  const action: { label: MessageKey; onPress: () => void } | null = state === 'on' ? { label: 'fc.loc.stop', onPress: vm.stopLocation }
    : state === 'off' ? { label: 'fc.loc.use', onPress: () => void vm.useLocation() }
      : state === 'unavailable' || state === 'timeout' ? { label: 'fc.loc.retry', onPress: () => void vm.useLocation() }
        : null;
  return (
    <M2Card style={styles.loc} testID="fc-location">
      <View style={styles.locHead}>
        <View style={styles.locIcon}><Icon name="locate" size={20} color={color.action} strokeWidth={2.2} /></View>
        <View style={styles.grow}>
          <Text style={m2Text.cardTitle} accessibilityLiveRegion="polite" aria-live="polite">{t(title)}</Text>
          <Text style={m2Text.body} testID={`fc-location-${state}`}>{t(body)}</Text>
        </View>
      </View>
      {state === 'off' ? (
        <View style={styles.explainer}>
          <Icon name="info" size={14} color={color.info} strokeWidth={2.2} />
          <Text style={[m2Text.meta, styles.shrink]}>{t('fc.loc.explainer')}</Text>
        </View>
      ) : null}
      {action ? (
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t(action.label)} aria-label={t(action.label)} onPress={action.onPress}
          testID="fc-location-action" style={({ focused }: PressState) => [styles.locBtn, state === 'on' ? styles.locBtnQuiet : null, focused ? focusRing : null]}>
          <Text style={[styles.locBtnText, state === 'on' ? styles.locBtnTextQuiet : null]}>{t(action.label)}</Text>
        </Pressable>
      ) : null}
    </M2Card>
  );
});

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: space.s4 },
  shrink: { flexShrink: 1 },
  strip: { padding: space.s14, borderRadius: 24, gap: space.s10, backgroundColor: color.surface, ...shadowStyle(shadow.float) },
  stripCompact: { padding: space.s10, gap: 0, ...shadowStyle(shadow.card) },
  stripRow: { flexDirection: 'row', gap: space.s10 },
  callBtn: {
    flex: 1, minWidth: 0, minHeight: size.controlLg, paddingHorizontal: space.s12, paddingVertical: space.s10, borderRadius: radius.lg,
    flexDirection: 'row', alignItems: 'center', gap: space.s10, backgroundColor: color.dangerFill,
  },
  callLabel: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.onDangerFill },
  callSub: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.onDangerFill },
  tile: { borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6, marginTop: space.s2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.s4, paddingHorizontal: space.s8, paddingVertical: space.s4, borderRadius: radius.full, backgroundColor: color.surface2 },
  chipOnHero: { backgroundColor: color.onHeroVeil },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  chipTextOnHero: { color: color.onHero },
  card: { borderRadius: 24, backgroundColor: color.surface, overflow: 'hidden', ...shadowStyle(shadow.card) },
  cardMain: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12, padding: space.s14, minHeight: size.touchTarget },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  distance: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  cardFoot: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.s8,
    paddingHorizontal: space.s14, paddingVertical: space.s10, borderTopWidth: 1, borderTopColor: color.ruleSoft,
  },
  actions: { flexDirection: 'row', gap: space.s8 },
  action: {
    minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: space.s6,
    backgroundColor: color.surface3,
  },
  actionPrimary: { backgroundColor: color.action },
  actionText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  actionTextPrimary: { color: color.onAction },
  loc: { borderRadius: 24, padding: space.s14, gap: space.s10 },
  locHead: { flexDirection: 'row', gap: space.s12, alignItems: 'flex-start' },
  locIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface3 },
  explainer: { flexDirection: 'row', gap: space.s6, alignItems: 'flex-start', padding: space.s10, borderRadius: radius.md, backgroundColor: color.surface3 },
  locBtn: { minHeight: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.action, paddingHorizontal: space.s16 },
  locBtnQuiet: { backgroundColor: color.surface3, alignSelf: 'flex-start' },
  locBtnText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  locBtnTextQuiet: { color: color.action },
});
