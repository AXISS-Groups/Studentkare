import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { Skeleton } from '@/design-system';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import { FirewallNote, phoneLayout } from '@/features/phoneKit/phoneParts';
import type { SearchViewModel } from '../viewmodel/SearchViewModel';
import { SearchBar } from './searchParts';

const ROWS = ['72%', '58%', '66%', '50%', '62%'] as const;

/**
 * Searching (canvas SearchLoading, SK-035): the field stays put, the progress
 * line runs, and the result cards hold their shape as skeletons. The note at
 * the foot says how results are ordered — by name, never by payment.
 */
export const SearchLoadingView = observer(function SearchLoadingView({ vm }: { vm: SearchViewModel }) {
  const t = useT();
  return (
    <View style={phoneLayout.screen} testID="search-loading">
      <SearchBar vm={vm} onBack={vm.editQuery} focused editable={false} />
      <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><View style={styles.bar} /></View>
      <ScrollView contentContainerStyle={phoneLayout.content}>
        <View style={styles.status} role="status" accessibilityLiveRegion="polite">
          <Icon name="file" size={16} color={color.action} />
          <Text style={styles.statusText}>{t('phone.search.searching')}</Text>
        </View>
        <View style={styles.chips} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {['30%', '20%', '28%'].map((w) => <View key={w} style={[styles.chip, { width: w as `${number}%` }]} />)}
        </View>
        {ROWS.map((w) => (
          <View key={w} style={styles.card}>
            <View style={styles.block} />
            <View style={phoneLayout.grow}>
              <Skeleton label={t('phone.search.searching')} lines={[w, '38%']} />
            </View>
          </View>
        ))}
      </ScrollView>
      <FirewallNote text={t('phone.search.fairOrder')} />
    </View>
  );
});

const styles = StyleSheet.create({
  track: { height: 3, backgroundColor: color.ruleSoft, overflow: 'hidden' },
  bar: { width: '40%', height: 3, borderRadius: radius.full, backgroundColor: color.action },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  statusText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  chips: { flexDirection: 'row', gap: space.s8 },
  chip: { height: 34, borderRadius: radius.full, backgroundColor: color.skeleton },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: space.s14, padding: space.s16, borderRadius: radius.xl,
    backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft,
  },
  block: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: color.skeleton },
});
