import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, M2Pill, RoundButton, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { StarRating } from '@/design-system';
import { WebShellPreview } from './WebShellPreview';
import { BrandFooter } from './BrandFooter';

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
 * Flat, non-functional preview of WebDoctorBrowse — the web counterpart
 * of `DoctorBrowsePreview.tsx`, inside the real `StudentWebShell`. Part
 * of the 2026-11-11 gap-analysis pass; no
 * `design/screens/briefs/WebDoctorBrowse.md` exists — same net-new
 * footing as the mobile screen it mirrors. Not wired, not replacing
 * anything. See NOTES.md.
 *
 * Reuses the same pieces as the mobile screen — `M2Card`, `GlossTile`,
 * `m2Text`, `M2Pill`, `RoundButton`, `M2Note`, `StarRating` — laid out as
 * a desktop grid instead of a horizontal-scroll carousel, since a wider
 * viewport can show more cards at once without scrolling.
 *
 * CAUTION — carried over from `DoctorBrowsePreview.tsx` verbatim: doctor
 * booking content here is adjacent to this repo's real appointments
 * feature. If this direction is wanted for real, "Book" must route
 * through the existing appointments/teleconsult booking logic (consent,
 * slot availability, fail-closed checks per AGENTS.md) rather than
 * reinventing it here — this preview only shows the visual shape of a
 * browse/discovery grid, with no booking logic, no real doctors, and no
 * real availability.
 */
export function WebDoctorBrowsePreview(): React.ReactElement {
  const [activeFilter, setActiveFilter] = useState<string>(FILTERS[0]);
  const t = useT();

  return (
    <WebShellPreview route="appointments">
      <View style={styles.body}>
        <Text style={styles.pageTitle}>{t('preview.findADoctor')}</Text>

        <View style={styles.filterRow}>
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
        </View>

        <View style={styles.grid}>
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
        </View>

        <M2Note tone="info" icon="doctor">
          {t('preview.whyBookThroughStudentkareEveryDoctorShownHere')}
        </M2Note>
        <BrandFooter />
      </View>
    </WebShellPreview>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.s24, gap: space.s20, maxWidth: 1040 },
  pageTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  chip: { paddingHorizontal: space.s16, paddingVertical: space.s8, borderRadius: radius.full, backgroundColor: color.surface3, borderWidth: 1, borderColor: color.ruleSoft },
  chipActive: { backgroundColor: color.action, borderColor: color.action },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  chipTextActive: { color: color.onAction },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s16 },
  doctorCard: { width: 240, gap: space.s8, alignItems: 'flex-start' },
});
