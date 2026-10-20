import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ArtSource } from '@/features/phoneKit/artSource';
import { observer } from 'mobx-react-lite';
import { Button, EmptyState, Rise, Sheet } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { money } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import { BackButton, ChoiceRow, phoneLayout, phoneText } from '@/features/phoneKit/phoneParts';
import { categoryName } from '@/features/phoneKit/catalogArt';
import { plural } from '@/features/phoneKit/plural';
import type { SearchViewModel } from '../viewmodel/SearchViewModel';
import type { SearchLinks } from './searchParts';

type Pressed = { pressed: boolean; focused?: boolean };

const initials = (name: string) => name.replace(/^dr\.?\s*/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

/**
 * Doctor results (canvas DoctorResults, SK-037): the published consultations
 * that match the search, each with its fee before anything is booked, and a
 * sheet to narrow by kind of care. "Book" opens the real appointment flow,
 * where the slots and the price are confirmed.
 *
 * Shown only from the listing: its name, provider and fee. The board's NMC
 * numbers, "on shift now" dots and next-free times are not in the catalogue,
 * so they are left out rather than invented.
 */
export const DoctorResultsView = observer(function DoctorResultsView({ vm, links, art }: { vm: SearchViewModel; links: SearchLinks; art?: ArtSource }) {
  const t = useT();
  const [sheet, setSheet] = useState(false);
  const [pick, setPick] = useState(vm.doctorCategory);
  const list = vm.doctorList;
  const count = (category: string) => (category ? vm.doctors.filter((d) => d.category === category).length : vm.doctors.length);
  const fee = (d: LiveCatalogItem) => (d.pricePaise === 0 ? t('phone.doctor.free') : money(d.pricePaise));
  return (
    <View style={phoneLayout.screen} testID="doctor-results">
      <View style={styles.top}>
        <BackButton label={t('common.back')} onPress={() => vm.setTab('all')} testID="doctor-back" />
        <Text accessibilityRole="header" style={[phoneText.heading, phoneLayout.grow]}>{t('phone.doctor.title')}</Text>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('phone.doctor.filter')} testID="doctor-filter"
          onPress={() => { setPick(vm.doctorCategory); setSheet(true); }}
          style={({ focused }: Pressed) => [styles.filter, vm.doctorCategory ? styles.filterOn : null, focused ? focusRing : null]}>
          <Text style={[styles.filterText, vm.doctorCategory ? styles.filterTextOn : null]}>{vm.doctorCategory ? categoryName(t, vm.doctorCategory) : t('phone.doctor.filter')}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={phoneLayout.content}>
        <View style={styles.hero}>
          <View style={phoneLayout.grow}>
            <Text style={styles.heroEyebrow}>{vm.doctorCategory ? t('phone.doctor.filtered') : t('phone.doctor.bookable')}</Text>
            <Text style={styles.heroCount} role="status">{plural(t, list.length, 'phone.doctor.countOne', 'phone.doctor.count')}</Text>
          </View>
          {art ? <Image source={art} style={styles.heroArt} resizeMode="contain" accessibilityIgnoresInvertColors accessible={false} /> : null}
        </View>

        {list.map((d, i) => (
          <Rise key={d.id} index={i}>
            <View style={styles.row} testID={`doctor-${d.id}`}>
              <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Text style={styles.avatarText}>{initials(d.brand || d.name)}</Text>
              </View>
              <View style={phoneLayout.grow}>
                <Text style={phoneText.title}>{d.name}</Text>
                <Text style={phoneText.meta}>{[d.brand, d.category ? categoryName(t, d.category) : '', d.pack].filter(Boolean).join(' · ')}</Text>
              </View>
              <View style={styles.end}>
                <Text style={styles.fee}>{fee(d)}</Text>
                <Button label={t('phone.doctor.book')} accessibilityLabel={t('phone.doctor.bookFor', { name: d.name, fee: fee(d) })}
                  onPress={() => links.bookDoctor(d)} testID={`doctor-book-${d.id}`} />
              </View>
            </View>
          </Rise>
        ))}
        {list.length === 0 ? <EmptyState title={t('phone.doctor.emptyTitle')} body={t('phone.doctor.emptyBody')} /> : null}

        <Text style={styles.foot}>{t('phone.doctor.fairOrder')}</Text>
      </ScrollView>

      <Sheet visible={sheet} title={t('phone.doctor.narrow')} subtitle={plural(t, count(pick), 'phone.doctor.matchNowOne', 'phone.doctor.matchNow')} onClose={() => setSheet(false)} testID="doctor-sheet">
        <View role="radiogroup" accessibilityLabel={t('phone.doctor.narrow')} style={styles.sheetBody}>
          <ChoiceRow label={t('phone.doctor.allCare')} meta={t('phone.doctor.allCareMeta')} selected={pick === ''} onPress={() => setPick('')} testID="doctor-cat-all" />
          {vm.doctorCategories.map((c) => (
            <ChoiceRow key={c} label={categoryName(t, c)} meta={plural(t, count(c), 'phone.doctor.countOne', 'phone.doctor.count')} selected={pick === c} onPress={() => setPick(c)} testID={`doctor-cat-${c}`} />
          ))}
          <Button label={plural(t, count(pick), 'phone.doctor.showOne', 'phone.doctor.show')} size="cta" fullWidth onPress={() => { vm.setDoctorCategory(pick); setSheet(false); }} testID="doctor-sheet-confirm" />
          <Button label={t('phone.close')} variant="ghost" fullWidth onPress={() => setSheet(false)} />
        </View>
      </Sheet>
    </View>
  );
});

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.gutterPhone, paddingVertical: space.s12,
    backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.ruleSoft,
  },
  filter: { minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface3 },
  filterOn: { backgroundColor: color.action },
  filterText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  filterTextOn: { color: color.onAction },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s20, borderRadius: radius.xl, backgroundColor: color.surface3, minHeight: 150 },
  heroEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.text2 },
  heroCount: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  heroArt: { width: 110, height: 140 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s12, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  avatar: { width: 46, height: 46, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface3 },
  avatarText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  end: { alignItems: 'flex-end', gap: space.s6 },
  fee: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  foot: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: font.size.caption * font.lineHeight.body, color: color.text3, textAlign: 'center' },
  sheetBody: { gap: space.s10 },
});
