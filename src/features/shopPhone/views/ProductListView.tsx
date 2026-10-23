import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { Button, EmptyState, ErrorState, Rise, Skeleton } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { discountPercent, money } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { BackButton, PillTabs, phoneLayout, phoneText, Heading } from '@/features/phoneKit/phoneParts';
import { SHOP_CATEGORIES, listingIcon } from '@/features/phoneKit/catalogArt';
import { plural } from '@/features/phoneKit/plural';
import type { CartPort, ListSort, PhoneShopViewModel } from '../viewmodel/PhoneShopViewModel';
import { cannotAdd } from '../viewmodel/PhoneShopViewModel';
import { BagButton, CartBar, cartCount } from './shopParts';
import type { ShopLinks } from './shopParts';

type Pressed = { pressed: boolean; focused?: boolean };

const SORT_LABEL: Record<ListSort, MessageKey> = { name: 'phone.list.sort.name', price: 'phone.list.sort.price', discount: 'phone.list.sort.discount' };

function ProductCard({ item, inCart, onOpen, onAdd }: { item: LiveCatalogItem; inCart: number; onOpen: () => void; onAdd: () => void }) {
  const t = useT();
  const off = discountPercent(item.mrpPaise, item.pricePaise);
  const blocked = cannotAdd(item);
  return (
    <View style={styles.card} testID={`product-${item.id}`}>
      <Pressable role="link" accessibilityRole="link" accessibilityLabel={`${item.name}, ${item.pack}, ${money(item.pricePaise)}`} onPress={onOpen}
        style={({ focused }: Pressed) => [styles.art, focused ? focusRing : null]}>
        {off > 0 ? <View style={styles.offBadge}><Text style={styles.offText}>{t('phone.shop.percentOff', { percent: off })}</Text></View> : null}
        <Icon name={listingIcon(item)} size={32} color={color.onHero} />
      </Pressable>
      <View style={styles.cardBody}>
        <Text numberOfLines={2} style={phoneText.title}>{item.name}</Text>
        <Text numberOfLines={1} style={phoneText.meta}>{item.pack}</Text>
        <View style={styles.cardFoot}>
          <View>
            <Text style={phoneText.price}>{money(item.pricePaise)}</Text>
            {off > 0 ? <Text style={phoneText.mrp}>{money(item.mrpPaise)}</Text> : null}
          </View>
          {item.kind === 'lab' || blocked ? (
            <Text style={styles.blocked}>{item.requiresPrescription ? t('phone.search.tag.rx') : item.kind === 'lab' ? t('phone.list.bookLab') : t('shop.outOfStock')}</Text>
          ) : (
            <Pressable role="button" accessibilityRole="button" testID={`add-${item.id}`}
              accessibilityLabel={inCart ? t('phone.list.addAnother', { name: item.name, count: inCart }) : t('shop.addSpoken', { name: item.name })}
              onPress={onAdd} style={({ focused }: Pressed) => [styles.add, focused ? focusRing : null]}>
              <Icon name="plus" size={18} color={color.onAction} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

/**
 * Product grid (canvas ProductList, SK-062): the catalogue filtered by a
 * category or a word, sortable by name, price or discount, with the cart bar
 * underneath. Prices and stock are the catalogue's.
 *
 * Left out from the board: star ratings and review counts (the catalogue has
 * none, so none are shown) and the "Rating" and "Popular" sorts that depend
 * on them; "Name" is the catalogue's own order instead.
 */
export const ProductListView = observer(function ProductListView({ vm, cart, links }: { vm: PhoneShopViewModel; cart: CartPort; links: ShopLinks }) {
  const t = useT();
  const { category, query } = vm.listFilter;
  const named = SHOP_CATEGORIES.find((c) => 'category' in c.filter && c.filter.category === category);
  const title = named ? t(named.label) : category === 'labs' ? t('phone.search.tab.labs') : query ? t('phone.list.resultsFor', { query }) : t('phone.list.all');
  const sorts: { key: ListSort; label: string }[] = (['name', 'price', 'discount'] as const).map((key) => ({ key, label: t(SORT_LABEL[key]) }));
  const inCart = (id: string) => cart.lines.find((l) => l.item.id === id)?.quantity ?? 0;
  const add = (item: LiveCatalogItem) => (item.kind === 'lab' ? links.bookLab(item.id) : cart.add(item));
  return (
    <View style={phoneLayout.screen} testID="product-list">
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <BackButton label={t('common.back')} onPress={() => vm.back()} onHero />
          <View style={phoneLayout.grow}>
            <Heading numberOfLines={1} style={styles.heroTitle}>{title}</Heading>
            <Text style={styles.heroSub} role="status">{plural(t, vm.listTotal, 'phone.list.countOne', 'phone.list.count', { sort: t(SORT_LABEL[vm.sort]).toLowerCase() })}</Text>
          </View>
          <BagButton count={cartCount(cart)} onPress={() => vm.push({ name: 'cart' })} onHero />
        </View>
        <PillTabs label={t('phone.list.sortLabel')} tabs={sorts} selected={vm.sort} onSelect={vm.setSort} onHero />
      </View>
      <ScrollView contentContainerStyle={phoneLayout.content}>
        {vm.listPhase === 'loading' && vm.listItems.length === 0 ? <Skeleton label={t('phone.shop.loading')} lines={['100%', '80%', '100%', '60%']} /> : null}
        {vm.listPhase === 'error' ? (
          <ErrorState title={t('phone.shop.failedTitle')} body={t('phone.shop.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.loadList()} />
        ) : null}
        {vm.listPhase === 'ready' && vm.listItems.length === 0 ? (
          <EmptyState title={t('phone.list.emptyTitle')} body={t('phone.list.emptyBody')} action={{ label: t('phone.list.backToShop'), onPress: vm.home }} animation="anim-search-off" />
        ) : null}
        <View style={styles.grid}>
          {vm.sortedList.map((item, i) => (
            <Rise key={item.id} index={i} style={styles.cell}>
              <ProductCard item={item} inCart={inCart(item.id)} onOpen={() => vm.openProduct(item)} onAdd={() => add(item)} />
            </Rise>
          ))}
        </View>
        {vm.canLoadMore ? <Button label={t('phone.list.more')} variant="secondary" fullWidth onPress={vm.loadMore} testID="list-more" /> : null}
      </ScrollView>
      <CartBar cart={cart} onPress={() => vm.push({ name: 'cart' })} />
    </View>
  );
});

const styles = StyleSheet.create({
  hero: { backgroundColor: color.heroBg, paddingHorizontal: space.gutterPhone, paddingTop: space.s14, paddingBottom: space.s16, gap: space.s14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  heroTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  heroSub: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.onHero2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12 },
  cell: { flexBasis: '46%', flexGrow: 1 },
  card: { borderRadius: radius.xl, overflow: 'hidden', backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  art: { height: 104, alignItems: 'center', justifyContent: 'center', backgroundColor: color.heroBg },
  offBadge: { position: 'absolute', top: space.s8, left: space.s8, paddingHorizontal: space.s8, paddingVertical: space.s2, borderRadius: radius.full, backgroundColor: color.onHeroVeil },
  offText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  cardBody: { padding: space.s12, gap: space.s4 },
  cardFoot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.s8, marginTop: space.s4 },
  add: { width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.action },
  blocked: { flexShrink: 1, fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3, textAlign: 'right' },
});
