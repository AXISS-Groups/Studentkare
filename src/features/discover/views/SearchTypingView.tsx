import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { Rise, Skeleton } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import { IconTile, phoneLayout } from '@/features/phoneKit/phoneParts';
import { listingIcon, listingTone } from '@/features/phoneKit/catalogArt';
import type { SearchViewModel } from '../viewmodel/SearchViewModel';
import { SearchBar, listingMeta } from './searchParts';
import type { SearchLinks } from './searchParts';

type Pressed = { pressed: boolean; focused?: boolean };

/** The name with the typed words in bold, as the canvas draws "**vitamin** d3 60k". */
function Highlighted({ name, query }: { name: string; query: string }) {
  const q = query.trim().toLowerCase();
  const at = q ? name.toLowerCase().indexOf(q) : -1;
  if (at < 0) return <Text style={styles.rowRest}>{name}</Text>;
  return (
    <Text style={styles.rowRest}>
      {name.slice(0, at)}
      <Text style={styles.rowName}>{name.slice(at, at + q.length)}</Text>
      {name.slice(at + q.length)}
    </Text>
  );
}

/**
 * Typing and suggestions (canvas SearchTyping, SK-035): catalogue listings that
 * match what has been typed so far, and Ayush for a question rather than a
 * product. A suggestion searches for that listing.
 */
export const SearchTypingView = observer(function SearchTypingView({ vm, links }: { vm: SearchViewModel; links: SearchLinks }) {
  const t = useT();
  return (
    <View style={phoneLayout.screen} testID="search-typing">
      <SearchBar vm={vm} onBack={vm.clear} focused />
      <ScrollView contentContainerStyle={phoneLayout.content} keyboardShouldPersistTaps="handled">
        <View style={styles.eyebrowRow}>
          <View style={styles.dot} />
          <Text accessibilityRole="header" style={styles.eyebrow}>{t('phone.search.suggestions')}</Text>
        </View>

        {vm.suggestPhase === 'loading' && vm.suggestions.length === 0 ? (
          <Skeleton label={t('phone.search.suggesting')} lines={['70%', '40%', '60%', '40%']} />
        ) : null}
        {vm.suggestPhase === 'error' ? <Text style={styles.note} role="status">{t('phone.search.suggestFailed')}</Text> : null}
        {vm.suggestPhase === 'ready' && vm.suggestions.length === 0 ? (
          <Text style={styles.note} role="status">{t('phone.search.noSuggestions', { query: vm.query.trim() })}</Text>
        ) : null}

        <View role="list">
          {vm.suggestions.map((item, i) => (
            <Rise key={item.id} index={i}>
              <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('phone.search.searchFor', { query: item.name })}
                testID={`suggestion-${item.id}`} onPress={() => void vm.submit(item.name)}
                style={({ focused }: Pressed) => [styles.row, focused ? focusRing : null]}>
                <IconTile icon={listingIcon(item)} tone={listingTone(item)} size={34} iconSize={17} />
                <View style={phoneLayout.grow}>
                  <Highlighted name={item.name} query={vm.query} />
                  <Text style={styles.rowMeta}>{listingMeta(t, item)}</Text>
                </View>
                <Icon name="corner" size={14} color={color.text3} />
              </Pressable>
            </Rise>
          ))}
        </View>

        <Text accessibilityRole="header" style={styles.eyebrow}>{t('phone.search.askInstead')}</Text>
        <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('phone.search.askAyush', { query: vm.query.trim() })}
          onPress={links.openAyush} testID="search-ask-ayush" style={({ focused }: Pressed) => [styles.ayush, focused ? focusRing : null]}>
          <View style={styles.ayushMark}><Icon name="sparkle" size={18} color={color.onHeroPositive} /></View>
          <View style={phoneLayout.grow}>
            <Text style={styles.ayushTitle}>{t('phone.search.askAyush', { query: vm.query.trim() })}</Text>
            <Text style={styles.ayushBody}>{t('phone.search.askAyushBody')}</Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  dot: { width: space.s6, height: space.s6, borderRadius: radius.full, backgroundColor: color.action },
  eyebrow: {
    fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1,
    textTransform: 'uppercase', color: color.text2,
  },
  note: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
  row: {
    minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s12,
    paddingHorizontal: space.s4, borderBottomWidth: 1, borderBottomColor: color.ruleSoft,
  },
  rowName: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  rowRest: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.regular), color: color.text },
  rowMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2 },
  ayush: {
    flexDirection: 'row', alignItems: 'center', gap: space.s14, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.heroBg,
  },
  ayushMark: { width: space.s40, height: space.s40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil },
  ayushTitle: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  ayushBody: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.onHero2 },
});
