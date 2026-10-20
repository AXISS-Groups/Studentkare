import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { Rise } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import { IconTile, phoneLayout, phoneText } from '@/features/phoneKit/phoneParts';
import type { SearchViewModel } from '../viewmodel/SearchViewModel';
import { SearchBar } from './searchParts';
import type { SearchLinks } from './searchParts';

type Pressed = { pressed: boolean; focused?: boolean };

/**
 * No results (canvas NoResults, SK-035). Never a dead end: each word of a
 * longer search on its own, then Ayush for plain words and the prescription
 * upload. There is no spelling service, so the board's "did you mean"
 * corrections are not guessed.
 */
export const NoResultsView = observer(function NoResultsView({ vm, links }: { vm: SearchViewModel; links: SearchLinks }) {
  const t = useT();
  const fixes = vm.retryWords;
  return (
    <View style={phoneLayout.screen} testID="no-results">
      <SearchBar vm={vm} onBack={vm.editQuery} editable={false} />
      <ScrollView contentContainerStyle={phoneLayout.content}>
        <View style={styles.hero} role="status">
          <View style={styles.mark}><Icon name="search-4" size={40} color={color.action} /></View>
          <Text accessibilityRole="header" style={[phoneText.display, styles.center]}>{t('phone.search.noneTitle')}</Text>
          <Text style={[phoneText.body, styles.center]}>
            {fixes.length ? t('phone.search.noneBodyWords', { query: vm.searched }) : t('phone.search.noneBody', { query: vm.searched })}
          </Text>
        </View>
        {fixes.length ? (
          <View style={styles.chips}>
            {fixes.map((w, i) => (
              <Rise key={w} index={i}>
                <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('phone.search.searchFor', { query: w })}
                  onPress={() => void vm.submit(w)} testID={`retry-${w}`} style={({ focused }: Pressed) => [styles.chip, focused ? focusRing : null]}>
                  <Icon name="search-2" size={14} color={color.action} />
                  <Text style={styles.chipText}>{w}</Text>
                </Pressable>
              </Rise>
            ))}
          </View>
        ) : null}

        <Text accessibilityRole="header" style={styles.eyebrow}>{t('phone.search.otherWays')}</Text>
        <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('phone.search.describeAyush')} onPress={links.openAyush}
          testID="no-results-ayush" style={({ focused }: Pressed) => [styles.ayush, focused ? focusRing : null]}>
          <View style={styles.ayushMark}><Icon name="sparkle" size={18} color={color.onHeroPositive} /></View>
          <View style={phoneLayout.grow}>
            <Text style={styles.ayushTitle}>{t('phone.search.describeAyush')}</Text>
            <Text style={styles.ayushBody}>{t('phone.search.describeAyushBody')}</Text>
          </View>
        </Pressable>
        <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('phone.search.uploadRx')} onPress={links.openPrescriptions}
          testID="no-results-rx" style={({ focused }: Pressed) => [styles.rx, focused ? focusRing : null]}>
          <IconTile icon="file-2" size={40} />
          <View style={phoneLayout.grow}>
            <Text style={phoneText.title}>{t('phone.search.uploadRx')}</Text>
            <Text style={phoneText.meta}>{t('phone.search.uploadRxBody')}</Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.s12, paddingTop: space.s24 },
  mark: { width: 104, height: 104, borderRadius: radius.sheet, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface3 },
  center: { textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.s8 },
  chip: {
    minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s6, paddingHorizontal: space.s14,
    borderRadius: radius.full, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft,
  },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.text2 },
  ayush: { flexDirection: 'row', alignItems: 'center', gap: space.s14, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.heroBg },
  ayushMark: { width: space.s40, height: space.s40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil },
  ayushTitle: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  ayushBody: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.onHero2 },
  rx: {
    flexDirection: 'row', alignItems: 'center', gap: space.s14, padding: space.s16, borderRadius: radius.xl,
    backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft,
  },
});
