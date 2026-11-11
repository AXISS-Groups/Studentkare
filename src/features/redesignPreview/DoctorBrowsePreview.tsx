import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, M2Pill, RoundButton, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { StarRating } from '@/design-system';

const noop = () => undefined;

interface DoctorCard {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  rating: number;
  reviews: string;
  availability: string;
}

const DOCTORS: readonly DoctorCard[] = [
  { id: 'd1', name: '[Dr. Ananya Rao]', specialty: '[General Physician]', experience: '[12 yrs experience]', rating: 4.8, reviews: '(1,204)', availability: '[Available today]' },
  { id: 'd2', name: '[Dr. Vikram Sheth]', specialty: '[Dermatologist]', experience: '[9 yrs experience]', rating: 4.6, reviews: '(842)', availability: '[Next slot tomorrow]' },
  { id: 'd3', name: '[Dr. Priya Nair]', specialty: '[Pediatrician]', experience: '[15 yrs experience]', rating: 4.9, reviews: '(2,031)', availability: '[Available today]' },
  { id: 'd4', name: '[Dr. Farhan Ali]', specialty: '[General Physician]', experience: '[7 yrs experience]', rating: 4.5, reviews: '(530)', availability: '[Next slot tomorrow]' },
  { id: 'd5', name: '[Dr. Meera Iyer]', specialty: '[Dermatologist]', experience: '[11 yrs experience]', rating: 4.7, reviews: '(998)', availability: '[Available today]' },
];

const FILTERS: readonly string[] = ['[General Physician]', '[Dermatologist]', '[Pediatrician]', '[Cardiologist]'];

/**
 * Flat, non-functional, net-new concept — part of the 2026-11-11
 * gap-analysis pass, round 3. A reference app's doctor-browsing flow
 * renders a horizontally-scrollable carousel of doctor profile cards for
 * discovery, distinct from `DoctorComparePreview.tsx` in this same folder,
 * which is a side-by-side table comparing two already-chosen doctors. This
 * screen is the step before that: scanning a filtered list of doctors to
 * find one worth comparing or booking. It is a SEPARATE, ADDITIONAL screen,
 * not an edit to `DoctorComparePreview.tsx`.
 *
 * Doctor booking content here is adjacent to this repo's real appointments
 * feature. If this direction is wanted for real, "Book" must route through
 * the existing appointments/teleconsult booking logic (consent, slot
 * availability, fail-closed checks) rather than reinventing it here — this
 * preview only shows the visual shape of a browse/discovery carousel, with
 * no booking logic, no real doctors, and no real availability.
 *
 * Built only from the approved pieces, nothing invented: `M2Card`,
 * `GlossTile`, `m2Text`, `M2Pill`, `RoundButton`, `M2Note` from
 * `@/design-system/m2`; `StarRating` from `@/design-system`; `Icon` from
 * `@/design-system/icons`, limited to `arrow-left` (back button) and
 * `doctor` (photo-placeholder tile) — both confirmed in
 * `design/icons/icon-manifest.json` before use. `doctor-alt`,
 * `check-circle-2` and `shield-check` also exist in the manifest but
 * weren't needed for this screen's content. Tokens only (`color`, `font`,
 * `fontWeight`, `radius`, `space`) — no hex values.
 *
 * Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No real
 * data anywhere — every doctor name, specialty, rating, review count and
 * availability badge is bracketed placeholder copy, not a real doctor or
 * review. No `check-icons.mjs --screen` run and no
 * `design/screens/implementation-map.json` entry, since there is no brief
 * or ticket yet. See NOTES.md for the full note on this pass.
 */
export function DoctorBrowsePreview(): React.ReactElement {
  const [activeFilter, setActiveFilter] = useState<string>(FILTERS[0]);
  const t = useT();

  return (
    <View style={styles.screen} testID="preview-doctor-browse">
      <View style={styles.header}>
        <Pressable
          role="button"
          accessibilityRole="button"
          accessibilityLabel={t('preview.back')}
          onPress={noop}
          style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}
        >
          <Icon name="arrow-left" size={20} color={color.text} />
        </Pressable>
        <Text style={styles.title}>{t('preview.findADoctor')}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterRowContent}>
        {FILTERS.map((filter) => {
          const active = filter === activeFilter;
          return (
            <Pressable
              key={filter}
              role="button"
              accessibilityRole="button"
              accessibilityLabel={filter}
              accessibilityState={{ selected: active }}
              onPress={() => setActiveFilter(filter)}
              style={({ focused }: PressState) => [styles.chip, active ? styles.chipActive : null, focused ? focusRing : null]}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{filter}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
          {DOCTORS.map((doctor) => (
            <M2Card key={doctor.id} style={styles.doctorCard}>
              <GlossTile icon="doctor" hue="indigo" size={56} />
              <Text style={m2Text.cardTitle}>{doctor.name}</Text>
              <Text style={m2Text.meta}>{doctor.specialty}</Text>
              <Text style={m2Text.meta}>{doctor.experience}</Text>
              <StarRating value={doctor.rating} label={`${doctor.rating} ${doctor.reviews}`} size={14} />
              <M2Pill label={doctor.availability} tone="positive" />
              <RoundButton icon="doctor" label={`Book ${doctor.name}`} onPress={noop} testID={`book-${doctor.id}`} />
            </M2Card>
          ))}
        </ScrollView>

        <View style={styles.noteWrap}>
          <M2Note tone="info" icon="doctor">
            {t('preview.whyBookThroughStudentkareEveryDoctorShownHere')}
          </M2Note>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  filterRow: { flexGrow: 0 },
  filterRowContent: { flexDirection: 'row', gap: space.s8, paddingHorizontal: space.gutterPhone, paddingBottom: space.s8 },
  chip: { paddingHorizontal: space.s16, paddingVertical: space.s8, borderRadius: radius.full, backgroundColor: color.surface3, borderWidth: 1, borderColor: color.ruleSoft },
  chipActive: { backgroundColor: color.action, borderColor: color.action },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  chipTextActive: { color: color.onAction },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: space.s24, gap: space.s16 },
  carousel: { flexDirection: 'row', gap: space.s12, paddingHorizontal: space.gutterPhone, paddingTop: space.s8 },
  doctorCard: { width: 180, gap: space.s8, alignItems: 'flex-start' },
  noteWrap: { paddingHorizontal: space.gutterPhone },
});
