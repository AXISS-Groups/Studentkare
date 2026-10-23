import { cardLabel } from '@/design-system/m2';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { Rise } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import { IconTile, SectionHead, phoneLayout } from '@/features/phoneKit/phoneParts';
import { SEARCH_CATEGORIES } from '@/features/phoneKit/catalogArt';
import type { SearchViewModel } from '../viewmodel/SearchViewModel';
import { SearchBar } from './searchParts';
import type { SearchLinks } from './searchParts';

type Pressed = { pressed: boolean; focused?: boolean };

/**
 * Search entry (canvas SearchEntry, SK-035): the field, the prescription
 * shortcut, this session's recent searches and the popular categories.
 * Recent searches are only the ones made on this screen since it opened;
 * nothing is kept on the device.
 */
export const SearchEntryView = observer(function SearchEntryView({ vm, links }: { vm: SearchViewModel; links: SearchLinks }) {
  const t = useT();
  return (
    <View style={phoneLayout.screen} testID="search-entry">
      <SearchBar vm={vm} onBack={links.exit} />
      <ScrollView contentContainerStyle={phoneLayout.content} keyboardShouldPersistTaps="handled">
        <Rise>
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={`${t('phone.search.rxTitle')}. ${t('phone.search.rxBody')}`}
            onPress={links.openPrescriptions} testID="search-rx" style={({ focused }: Pressed) => [styles.rx, focused ? focusRing : null]}>
            <IconTile icon="file-text" solid size={42} iconSize={20} />
            <View style={phoneLayout.grow}>
              <Text style={styles.rxTitle}>{t('phone.search.rxTitle')}</Text>
              <Text style={styles.rxBody}>{t('phone.search.rxBody')}</Text>
            </View>
            <Icon name="arrow-right" size={18} color={color.action} />
          </Pressable>
        </Rise>
        {links.openMedicineInfo ? (
          <Rise index={1}>
            <Pressable role="link" accessibilityRole="link" {...cardLabel(`${t('mi.entryTitle')}. ${t('mi.entryBody')}`)}
              onPress={() => links.openMedicineInfo?.()} testID="search-medicine-info" style={({ focused }: Pressed) => [styles.rx, focused ? focusRing : null]}>
              <IconTile icon="pill" solid size={42} iconSize={20} />
              <View style={phoneLayout.grow}>
                <Text style={styles.rxTitle}>{t('mi.entryTitle')}</Text>
                <Text style={styles.rxBody}>{t('mi.entryBody')}</Text>
              </View>
              <Icon name="arrow-right" size={18} color={color.action} />
            </Pressable>
          </Rise>
        ) : null}

        {vm.recents.length > 0 ? (
          <View style={styles.section} testID="search-recents">
            <SectionHead title={t('phone.search.recent')} action={{ label: t('phone.search.clearAll'), onPress: vm.clearRecents }} />
            <View style={styles.chips}>
              {vm.recents.map((q) => (
                <View key={q} style={styles.chip}>
                  <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('phone.search.searchFor', { query: q })}
                    onPress={() => void vm.submit(q)} style={({ focused }: Pressed) => [styles.chipMain, focused ? focusRing : null]}>
                    <Icon name="clock-2" size={14} color={color.text3} />
                    <Text style={styles.chipText}>{q}</Text>
                  </Pressable>
                  <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('phone.search.forget', { query: q })}
                    onPress={() => vm.forget(q)} style={({ focused }: Pressed) => [styles.chipX, focused ? focusRing : null]}>
                    <Icon name="x" size={12} color={color.text3} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHead title={t('phone.search.popular')} meta={t('phone.search.categoryCount', { count: SEARCH_CATEGORIES.length })} />
          <View style={styles.grid}>
            {SEARCH_CATEGORIES.map((cat, i) => (
              <Rise key={cat.id} index={i + 1} style={styles.cell}>
                <Pressable role="link" accessibilityRole="link" {...cardLabel(t(cat.label))} testID={`search-cat-${cat.id}`}
                  onPress={() => links.openList('category' in cat.filter ? { category: cat.filter.category } : { query: cat.filter.query })}
                  style={({ focused }: Pressed) => [styles.cat, focused ? focusRing : null]}>
                  <IconTile icon={cat.icon} tone={cat.tone} size={34} iconSize={17} />
                  <View style={phoneLayout.grow}>
                    <Text style={styles.catName}>{t(cat.label)}</Text>
                    <Text style={styles.catMeta}>{t(cat.meta)}</Text>
                  </View>
                </Pressable>
              </Rise>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  rx: {
    flexDirection: 'row', alignItems: 'center', gap: space.s14, padding: space.s16, borderRadius: radius.xl,
    backgroundColor: color.surface3,
  },
  rxTitle: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  rxBody: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2 },
  section: { gap: space.s12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', borderRadius: radius.full, backgroundColor: color.surface,
    borderWidth: 1, borderColor: color.ruleSoft, paddingLeft: space.s12,
  },
  chipMain: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s6 },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  chipX: { width: size.touchTarget, height: size.touchTarget, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s10 },
  cell: { flexBasis: '47%', flexGrow: 1 },
  cat: {
    minHeight: size.controlLg + space.s20, flexDirection: 'row', alignItems: 'center', gap: space.s10, padding: space.s12,
    borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft,
  },
  catName: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  catMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2 },
});
