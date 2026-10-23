import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { BrandLogo, Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { ErrorState, Rise, Skeleton } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { discountPercent, money } from '@/data/types/workflowTypes';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { FirewallNote, IconTile, SearchField, phoneLayout, phoneText, Heading } from '@/features/phoneKit/phoneParts';
import { SHOP_CATEGORIES, listingIcon } from '@/features/phoneKit/catalogArt';
import type { CartPort, PhoneShopViewModel } from '../viewmodel/PhoneShopViewModel';
import { BagButton, cartCount } from './shopParts';
import type { ShopLinks } from './shopParts';

type Pressed = { pressed: boolean; focused?: boolean };

/** The four big tiles under the refill card (canvas: Medicines · Upload Rx · Devices · Ayurveda). */
const QUICK: { id: string; label: MessageKey; icon: SkIconName; open: 'list' | 'rx'; category?: string }[] = [
  { id: 'medicines', label: 'phone.shop.quick.medicines', icon: 'pill-2', open: 'list', category: 'medicines' },
  { id: 'rx', label: 'phone.shop.quick.rx', icon: 'upload', open: 'rx' },
  { id: 'devices', label: 'phone.shop.quick.devices', icon: 'fridge', open: 'list', category: 'devices' },
  { id: 'ayurveda', label: 'phone.shop.quick.ayurveda', icon: 'leaf-2', open: 'list', category: 'ayurveda' },
];

function DealCard({ item, onPress }: { item: LiveCatalogItem; onPress: () => void }) {
  const t = useT();
  const off = discountPercent(item.mrpPaise, item.pricePaise);
  return (
    <Pressable role="link" accessibilityRole="link" accessibilityLabel={`${item.name}, ${item.pack}, ${money(item.pricePaise)}`} onPress={onPress}
      testID={`deal-${item.id}`} style={({ focused }: Pressed) => [styles.deal, focused ? focusRing : null]}>
      <View style={styles.dealArt}>
        {off > 0 ? <View style={styles.offBadge}><Text style={styles.offText}>{t('phone.shop.percentOff', { percent: off })}</Text></View> : null}
        <Icon name={listingIcon(item)} size={28} color={color.onHero} />
      </View>
      <View style={styles.dealBody}>
        <Text numberOfLines={2} style={phoneText.title}>{item.name}</Text>
        <Text numberOfLines={1} style={phoneText.meta}>{item.pack}</Text>
        <View style={styles.priceRow}>
          <Text style={phoneText.price}>{money(item.pricePaise)}</Text>
          {off > 0 ? <Text style={phoneText.mrp}>{money(item.mrpPaise)}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Wellness shop home (canvas ShopHome, SK-062): the navy header with the cart
 * and search, Kare points, the refill shortcut, the categories, the first
 * shelf of the catalogue and the lab packages. Nothing here is chosen from
 * the health record (Rule L), and it says so at the foot.
 *
 * Left out from the board: the moving delivery banner ("before 9 PM · free
 * over ₹299"), because no delivery promise or threshold exists to back it.
 */
export const ShopHomeView = observer(function ShopHomeView({ vm, cart, links, refillArt }: {
  vm: PhoneShopViewModel; cart: CartPort; links: ShopLinks; refillArt?: React.ReactNode;
}) {
  const t = useT();
  const [query, setQuery] = useState('');
  return (
    <ScrollView style={phoneLayout.screen} contentContainerStyle={styles.page} testID="shop-home">
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <BrandLogo size={30} label="" />
          <View style={phoneLayout.grow}><Heading style={styles.heroTitle}>{t('phone.shop.title')}</Heading></View>
          <BagButton count={cartCount(cart)} onPress={() => vm.push({ name: 'cart' })} onHero />
        </View>
        <SearchField value={query} onChangeText={setQuery} onSubmit={() => { if (query.trim()) vm.openList({ query: query.trim() }); }}
          placeholder={t('phone.shop.searchPlaceholder')} label={t('phone.shop.searchLabel')} clearLabel={t('phone.search.clear')}
          onClear={() => setQuery('')} onHero testID="shop-search" />
        <Pressable role="link" accessibilityRole="link" onPress={links.openRewards} testID="shop-points"
          accessibilityLabel={vm.points === null ? t('phone.shop.pointsTitle') : t('phone.shop.points', { count: vm.points })}
          style={({ focused }: Pressed) => [styles.points, focused ? focusRing : null]}>
          <View style={styles.pointsMark}><Icon name="sparkle" size={18} color={color.onHero} /></View>
          <View style={phoneLayout.grow}>
            <Text style={styles.pointsTitle}>{vm.points === null ? t('phone.shop.pointsTitle') : t('phone.shop.points', { count: vm.points })}</Text>
            <Text style={styles.pointsNote}>{vm.homePhase === 'ready' && vm.points === null ? t('phone.shop.pointsUnavailable') : t('phone.shop.pointsNote')}</Text>
          </View>
          <Icon name="chevron-right" size={18} color={color.onHero} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Rise>
          <View style={styles.refill}>
            <View style={phoneLayout.grow}>
              <Text style={styles.refillEyebrow}>{t('phone.shop.refillEyebrow')}</Text>
              <Text style={styles.refillTitle}>{t('phone.shop.refillTitle')}</Text>
              <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('phone.shop.refillCta')} onPress={links.openRefill}
                testID="shop-refill" style={({ focused }: Pressed) => [styles.refillCta, focused ? focusRing : null]}>
                <Text style={phoneText.link}>{t('phone.shop.refillCta')}</Text>
                <Icon name="arrow-right" size={14} color={color.action} />
              </Pressable>
            </View>
            {refillArt}
          </View>
        </Rise>

        <View style={styles.quick}>
          {QUICK.map((q, i) => (
            <Rise key={q.id} index={i} style={styles.quickCell}>
              <Pressable role="link" accessibilityRole="link" accessibilityLabel={t(q.label)} testID={`shop-quick-${q.id}`}
                onPress={() => (q.open === 'rx' ? links.openPrescriptions() : vm.openList({ category: q.category }))}
                style={({ focused }: Pressed) => [styles.quickTile, focused ? focusRing : null]}>
                <IconTile icon={q.icon} size={44} iconSize={22} />
                <Text style={styles.quickText}>{t(q.label)}</Text>
              </Pressable>
            </Rise>
          ))}
        </View>

        <View style={styles.cats} accessibilityRole="list">
          {SHOP_CATEGORIES.map((c, i) => (
            <Rise key={c.id} index={i} style={styles.catCell}>
              <Pressable role="link" accessibilityRole="link" accessibilityLabel={t(c.label)} testID={`shop-cat-${c.id}`}
                onPress={() => vm.openList('category' in c.filter ? { category: c.filter.category } : { query: c.filter.query })}
                style={({ focused }: Pressed) => [styles.cat, focused ? focusRing : null]}>
                <IconTile icon={c.icon} solid size={54} iconSize={22} />
                <Text style={styles.catText}>{t(c.short)}</Text>
              </Pressable>
            </Rise>
          ))}
        </View>

        <View style={styles.shelfHead}>
          <Text accessibilityRole="header" style={phoneText.heading}>{t('phone.shop.shelf')}</Text>
          {vm.featuredTotal > 0 ? (
            <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('phone.shop.seeAll', { count: vm.featuredTotal })} onPress={() => vm.openList({})}
              testID="shop-see-all" style={({ focused }: Pressed) => [styles.seeAll, focused ? focusRing : null]}>
              <Text style={phoneText.link}>{t('phone.shop.seeAll', { count: vm.featuredTotal })}</Text>
            </Pressable>
          ) : null}
        </View>
        {vm.homePhase === 'loading' || vm.homePhase === 'idle' ? <Skeleton label={t('phone.shop.loading')} lines={['60%', '100%', '80%']} /> : null}
        {vm.homePhase === 'error' ? (
          <ErrorState title={t('phone.shop.failedTitle')} body={t('phone.shop.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.loadHome()} />
        ) : null}
        {vm.homePhase === 'ready' && vm.featured.length === 0 ? <Text style={phoneText.body}>{t('phone.shop.emptyShelf')}</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
          {vm.featured.map((item) => <DealCard key={item.id} item={item} onPress={() => vm.openProduct(item)} />)}
        </ScrollView>

        {vm.labFromPaise !== null ? (
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('phone.shop.labsFrom', { price: money(vm.labFromPaise) })} onPress={links.openLabTests}
            testID="shop-labs" style={({ focused }: Pressed) => [styles.labs, focused ? focusRing : null]}>
            <View style={styles.labsMark}><Icon name="flask-2" size={22} color={color.onHero} /></View>
            <View style={phoneLayout.grow}>
              <Text style={styles.labsTitle}>{t('phone.shop.labsFrom', { price: money(vm.labFromPaise) })}</Text>
              <Text style={styles.labsBody}>{t('phone.shop.labsBody')}</Text>
            </View>
            <Icon name="arrow-right" size={18} color={color.onHero} />
          </Pressable>
        ) : null}

        <FirewallNote text={t('phone.shop.firewall')} />
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  page: { paddingBottom: space.s32 },
  hero: { backgroundColor: color.heroBg, paddingHorizontal: space.gutterPhone, paddingTop: space.s16, paddingBottom: space.s24, gap: space.s14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  heroTitle: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  points: {
    flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s14, borderRadius: radius.xl,
    backgroundColor: color.onHeroVeil, borderWidth: 1, borderColor: color.onHeroRule,
  },
  pointsMark: { width: space.s40, height: space.s40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil },
  pointsTitle: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  pointsNote: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.onHero2 },
  body: { paddingHorizontal: space.gutterPhone, paddingTop: space.s20, gap: space.s16 },
  refill: {
    flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s20, borderRadius: radius.xl,
    backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft, overflow: 'hidden',
  },
  refillEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.action },
  refillTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginTop: space.s4 },
  refillCta: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s6, alignSelf: 'flex-start' },
  quick: { flexDirection: 'row', gap: space.s8 },
  quickCell: { flex: 1 },
  quickTile: {
    minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: space.s8, paddingVertical: space.s12, borderRadius: radius.xl,
    backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft,
  },
  quickText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text, textAlign: 'center' },
  cats: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.s14 },
  catCell: { width: '25%' },
  cat: { minHeight: size.touchTarget, alignItems: 'center', gap: space.s8 },
  catText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text, textAlign: 'center' },
  shelfHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s12 },
  seeAll: { minHeight: size.touchTarget, justifyContent: 'center' },
  shelf: { gap: space.s12, paddingRight: space.gutterPhone },
  deal: { width: 150, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  dealArt: { height: 92, alignItems: 'center', justifyContent: 'center', backgroundColor: color.heroBg },
  offBadge: { position: 'absolute', top: space.s8, left: space.s8, paddingHorizontal: space.s8, paddingVertical: space.s2, borderRadius: radius.full, backgroundColor: color.onHeroVeil },
  offText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  dealBody: { padding: space.s12, gap: space.s4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.s6 },
  labs: { flexDirection: 'row', alignItems: 'center', gap: space.s14, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.heroBg },
  labsMark: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.onHeroVeil },
  labsTitle: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  labsBody: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.onHero2 },
});
