import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { Button, Checkbox, Rise, Sheet } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import type { HomeArticle, LiveCatalogItem } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import { FirewallNote, UnderlineTabs, phoneLayout } from '@/features/phoneKit/phoneParts';
import { ARTICLE_ICON } from '@/features/phoneKit/catalogArt';
import { plural } from '@/features/phoneKit/plural';
import type { ResultsTab, SearchViewModel } from '../viewmodel/SearchViewModel';
import { ListingCard, ResultCard, SearchBar } from './searchParts';
import type { SearchLinks } from './searchParts';

type Pressed = { pressed: boolean; focused?: boolean };

/**
 * All results, tabbed (canvas SearchResults, SK-035). All and Medicines list
 * in place; Lab tests and Doctors open their own boards (LabResults,
 * DoctorResults). Articles open in a sheet. "Filters" narrows to what can be
 * ordered now. Order is the catalogue's (by name), never paid placement.
 */
export const SearchResultsView = observer(function SearchResultsView({ vm, links }: { vm: SearchViewModel; links: SearchLinks }) {
  const t = useT();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [article, setArticle] = useState<HomeArticle | null>(null);

  const keep = (item: LiveCatalogItem) => !inStockOnly || (item.kind !== 'product' || (item.stock > 0 && !item.requiresPrescription));
  const medicines = vm.medicines.filter(keep);
  const all = vm.allHits.filter((h) => h.type === 'article' || keep(h.item));
  const shown = vm.tab === 'medicines' ? medicines.length : all.length;
  const tabs: { key: ResultsTab; label: string }[] = [
    { key: 'all', label: t('phone.search.tab.all') },
    { key: 'medicines', label: t('phone.search.tab.medicines') },
    { key: 'labs', label: t('phone.search.tab.labs') },
    { key: 'doctors', label: t('phone.search.tab.doctors') },
  ];
  const openListing = (item: LiveCatalogItem) => {
    if (item.kind === 'lab') vm.setTab('labs');
    else if (item.kind === 'consultation') vm.setTab('doctors');
    else links.openProduct(item);
  };

  return (
    <View style={phoneLayout.screen} testID="search-results">
      <SearchBar vm={vm} onBack={vm.editQuery} editable={false} />
      <View style={styles.tabs}>
        <UnderlineTabs label={t('phone.search.tabsLabel')} tabs={tabs} selected={vm.tab} onSelect={vm.setTab} />
      </View>
      <ScrollView contentContainerStyle={phoneLayout.content}>
        <View style={styles.head}>
          <View style={phoneLayout.grow}>
            <Text accessibilityRole="header" style={styles.heading}>
              {vm.tab === 'medicines' ? t('phone.search.tab.medicines') : t('phone.search.everythingFor', { query: vm.searched })}
            </Text>
            <Text style={styles.sub} role="status">{plural(t, shown, 'phone.search.resultCountOne', 'phone.search.resultCount')}</Text>
          </View>
          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('phone.search.filters')} onPress={() => setFiltersOpen(true)}
            testID="search-filters" style={({ focused }: Pressed) => [styles.filter, inStockOnly ? styles.filterOn : null, focused ? focusRing : null]}>
            <Icon name="filter" size={15} color={inStockOnly ? color.onAction : color.text} />
            <Text style={[styles.filterText, inStockOnly ? styles.filterTextOn : null]}>{t('phone.search.filters')}</Text>
          </Pressable>
        </View>

        {links.openMedicineInfo && vm.tab !== 'labs' && vm.tab !== 'doctors' ? (
          <ResultCard icon="pill" tone="neutral" title={t('mi.lookUp', { query: vm.searched })} meta={t('mi.entryBody')}
            onPress={() => links.openMedicineInfo?.(vm.searched)} testID="search-medicine-info-result" />
        ) : null}
        {vm.tab === 'medicines'
          ? medicines.map((item, i) => <Rise key={item.id} index={i}><ListingCard item={item} onPress={() => links.openProduct(item)} /></Rise>)
          : all.map((hit, i) => (
            <Rise key={hit.type === 'listing' ? hit.item.id : `a-${hit.article.id}`} index={i}>
              {hit.type === 'listing' ? (
                <ListingCard item={hit.item} onPress={() => openListing(hit.item)} />
              ) : (
                <ResultCard icon={ARTICLE_ICON} tone="neutral" title={hit.article.title}
                  meta={[t('phone.search.kind.article'), hit.article.tag].filter(Boolean).join(' · ')} price={hit.article.readTime}
                  tag={{ label: t('phone.search.tag.read'), tone: 'neutral' }} onPress={() => setArticle(hit.article)} testID={`article-${hit.article.id}`} />
              )}
            </Rise>
          ))}

        {shown === 0 ? <Text style={styles.sub} role="status">{t('phone.search.tabEmpty')}</Text> : null}

        <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('phone.search.showEverything', { query: vm.searched })}
          onPress={() => links.openList({ query: vm.searched })} testID="search-show-everything"
          style={({ focused }: Pressed) => [styles.everything, focused ? focusRing : null]}>
          <Text style={styles.everythingText}>{t('phone.search.showEverything', { query: vm.searched })}</Text>
        </Pressable>
        <FirewallNote text={t('phone.search.fairOrder')} />
      </ScrollView>

      <Sheet visible={filtersOpen} title={t('phone.search.filters')} subtitle={t('phone.search.filtersSub')} onClose={() => setFiltersOpen(false)} testID="search-filter-sheet">
        <View style={styles.sheetBody}>
          <Checkbox label={t('phone.search.inStockOnly')} detail={t('phone.search.inStockOnlyBody')} checked={inStockOnly} onChange={setInStockOnly} />
          <Button label={plural(t, vm.tab === 'medicines' ? medicines.length : all.length, 'phone.search.showOne', 'phone.search.showN')} fullWidth size="cta" onPress={() => setFiltersOpen(false)} />
        </View>
      </Sheet>

      <Sheet visible={article !== null} title={article?.title ?? ''} subtitle={article ? [article.tag, article.readTime].filter(Boolean).join(' · ') : undefined}
        onClose={() => setArticle(null)} testID="search-article-sheet">
        <View style={styles.sheetBody}>
          {article?.body.map((p, i) => <Text key={i} style={styles.paragraph}>{p}</Text>)}
        </View>
      </Sheet>
    </View>
  );
});

const styles = StyleSheet.create({
  tabs: { backgroundColor: color.surface, paddingHorizontal: space.gutterPhone },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  heading: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  sub: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2 },
  filter: {
    minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s6, paddingHorizontal: space.s14,
    borderRadius: radius.full, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft,
  },
  filterOn: { backgroundColor: color.action, borderColor: color.action },
  filterText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  filterTextOn: { color: color.onAction },
  everything: {
    minHeight: size.controlLg, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full,
    backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft, paddingHorizontal: space.s16,
  },
  everythingText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action, textAlign: 'center' },
  sheetBody: { gap: space.s14 },
  paragraph: { fontFamily: font.family.sans, fontSize: font.size.body, lineHeight: font.size.body * font.lineHeight.body, color: color.text },
});
