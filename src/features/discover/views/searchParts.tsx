import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { discountPercent, money } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { BackButton, IconTile, SearchField, Tag } from '@/features/phoneKit/phoneParts';
import type { Tone } from '@/features/phoneKit/phoneParts';
import { listingIcon, listingTone } from '@/features/phoneKit/catalogArt';
import type { SkIconName } from '@/design-system/icons';
import type { SearchViewModel } from '../viewmodel/SearchViewModel';

/**
 * The parts the search boards share: the top bar (back + field) and a result
 * card. Prices and stock are the catalogue's; a tag never invents a claim.
 */

/** Where the search hands off: the shop, a lab booking, a doctor, help. */
export interface SearchLinks {
  /** Leave search (the board's back on the entry step). */
  exit: () => void;
  openProduct: (item: LiveCatalogItem) => void;
  /** Open the shop's product list filtered by a catalogue category or a search word. */
  openList: (filter: { category?: string; query?: string }) => void;
  bookLab: (itemId: string) => void;
  bookDoctor: (item: LiveCatalogItem) => void;
  openPrescriptions: () => void;
  openAyush: () => void;
  /** Offline: what still works (canvas "Still works without internet"). */
  openEmergencyCard: () => void;
  openPass: () => void;
  openCrisis: () => void;
  /** Medicine information (reviewed label information, lookup by name or photo), optionally with the words searched. */
  openMedicineInfo?: (query?: string) => void;
}

export const SearchBar = observer(function SearchBar({ vm, onBack, focused = false, editable = true }: {
  vm: SearchViewModel; onBack: () => void; focused?: boolean; editable?: boolean;
}) {
  const t = useT();
  return (
    <View style={styles.bar}>
      <BackButton label={t('common.back')} onPress={onBack} testID="search-back" />
      <SearchField
        value={vm.query}
        onChangeText={editable ? vm.setQuery : undefined}
        onPress={editable ? undefined : vm.editQuery}
        onSubmit={() => void vm.submit()}
        placeholder={t('phone.search.placeholder')}
        label={t('phone.search.label')}
        clearLabel={t('phone.search.clear')}
        onClear={vm.clear}
        mic={vm.query ? undefined : { label: t('phone.search.micUnavailable') }}
        focused={focused}
        autoFocus={editable && focused}
      />
    </View>
  );
});

const KIND_LABEL: Record<LiveCatalogItem['kind'], MessageKey> = {
  product: 'phone.search.kind.product',
  lab: 'phone.search.kind.lab',
  consultation: 'phone.search.kind.consultation',
  vaccine: 'phone.search.kind.vaccine',
};

/** "Medicine · Brand · Pack", from the listing only. */
export function listingMeta(t: (key: MessageKey) => string, item: LiveCatalogItem): string {
  const kind = item.kind === 'product' && (item.category === 'medicines' || item.category === 'vitamins')
    ? t('phone.search.kind.medicine') : t(KIND_LABEL[item.kind]);
  return [kind, item.brand, item.pack].filter(Boolean).join(' · ');
}

/** The listing's honest tag: prescription, stock, or the discount the catalogue prices give. */
export function listingTag(t: (key: MessageKey, vars?: Record<string, string | number>) => string, item: LiveCatalogItem): { label: string; tone: Tone } | null {
  if (item.requiresPrescription) return { label: t('phone.search.tag.rx'), tone: 'attention' };
  if (item.kind === 'product' && item.stock < 1) return { label: t('shop.outOfStock'), tone: 'neutral' };
  const off = discountPercent(item.mrpPaise, item.pricePaise);
  if (off > 0) return { label: t('phone.shop.percentOff', { percent: off }), tone: 'action' };
  if (item.kind === 'product') return { label: t('phone.search.tag.inStock'), tone: 'positive' };
  return null;
}

export function ResultCard({ icon, tone, title, meta, price, tag, onPress, testID }: {
  icon: SkIconName; tone: Tone; title: string; meta: string; price?: string; tag?: { label: string; tone: Tone } | null; onPress: () => void; testID?: string;
}) {
  return (
    <Pressable role="link" accessibilityRole="link" accessibilityLabel={[title, meta, price].filter(Boolean).join(', ')} onPress={onPress}
      testID={testID} style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.card, focused ? focusRing : null]}>
      <IconTile icon={icon} tone={tone} />
      <View style={styles.words}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{meta}</Text>
      </View>
      <View style={styles.end}>
        {price ? <Text style={styles.price}>{price}</Text> : null}
        {tag ? <Tag label={tag.label} tone={tag.tone} /> : null}
      </View>
    </Pressable>
  );
}

export function ListingCard({ item, onPress }: { item: LiveCatalogItem; onPress: () => void }) {
  const t = useT();
  return (
    <ResultCard icon={listingIcon(item)} tone={listingTone(item)} title={item.name} meta={listingMeta(t, item)}
      price={money(item.pricePaise)} tag={listingTag(t, item)} onPress={onPress} testID={`hit-${item.id}`} />
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.gutterPhone, paddingVertical: space.s12,
    backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.ruleSoft,
  },
  card: {
    minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s14,
    borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft,
  },
  words: { flex: 1, gap: space.s2 },
  title: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2 },
  end: { alignItems: 'flex-end', gap: space.s6 },
  price: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
});
