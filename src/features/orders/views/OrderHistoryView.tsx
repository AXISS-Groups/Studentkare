import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon, Icon3d } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { Button, Rise, Skeleton, StateScreen, useOnline } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { displayDate, money } from '@/data/types/workflowTypes';
import type { LiveOrder } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { BackButton, IconTile, PillTabs, Tag, phoneLayout, phoneText } from '@/features/phoneKit/phoneParts';
import type { Tone } from '@/features/phoneKit/phoneParts';
import { OfflineBoard } from '@/features/phoneKit/OfflineBoard';
import { orderRef } from '@/features/phoneKit/orderRef';
import type { OfflineLinks } from '@/features/phoneKit/OfflineBoard';
import { plural } from '@/features/phoneKit/plural';
import { isActive, orderKind, orderState } from '../viewmodel/OrdersViewModel';
import type { OrderKind, OrderState, OrdersTab, OrdersViewModel } from '../viewmodel/OrdersViewModel';

type Pressed = { pressed: boolean; focused?: boolean };

const KIND_ICON: Record<OrderKind, { icon: SkIconName; tone: Tone }> = {
  product: { icon: 'shopping-bag', tone: 'action' },
  lab: { icon: 'flask-2', tone: 'positive' },
  consultation: { icon: 'doctor-2', tone: 'action' },
  vaccine: { icon: 'syringe', tone: 'positive' },
};

export const STATE_LABEL: Record<OrderState, { label: MessageKey; tone: Tone }> = {
  awaitingPayment: { label: 'phone.orders.state.awaitingPayment', tone: 'attention' },
  requested: { label: 'phone.orders.state.requested', tone: 'action' },
  accepted: { label: 'phone.orders.state.accepted', tone: 'action' },
  dispatched: { label: 'phone.orders.state.dispatched', tone: 'action' },
  completed: { label: 'phone.orders.state.completed', tone: 'neutral' },
  declined: { label: 'phone.orders.state.declined', tone: 'danger' },
  cancelled: { label: 'phone.orders.state.cancelled', tone: 'neutral' },
};

export interface OrdersLinks extends OfflineLinks {
  back: () => void;
  openShop: () => void;
  track: (orderId: string) => void;
}

function OrderCard({ order, onOpen }: { order: LiveOrder; onOpen: () => void }) {
  const t = useT();
  const kind = KIND_ICON[orderKind(order)];
  const state = STATE_LABEL[orderState(order)];
  const active = isActive(order);
  const where = order.delivery.mode === 'pickup' ? t('cart.pickup') : [order.delivery.city, order.delivery.pincode].filter(Boolean).join(' · ');
  return (
    <View style={styles.card} testID={`order-${order.id}`}>
      <View style={phoneLayout.top}>
        <IconTile icon={kind.icon} tone={kind.tone} size={40} />
        <View style={phoneLayout.grow}>
          <Text style={styles.ref}>{orderRef(order.id)}</Text>
          <Text style={phoneText.meta}>{displayDate(order.createdAt)}</Text>
        </View>
        <Tag label={t(state.label)} tone={state.tone} dot={active} />
      </View>
      <View style={styles.rule} />
      <Text style={phoneText.title}>{order.lines.map((l) => l.name).join(', ')}</Text>
      <Text style={phoneText.meta}>{[where, t(state.label)].filter(Boolean).join(' · ')}</Text>
      <View style={styles.foot}>
        <Text style={styles.total}>{money(order.totalPaise)}</Text>
        <Pressable role="link" accessibilityRole="link" testID={`order-open-${order.id}`}
          accessibilityLabel={active ? t('phone.orders.trackSpoken', { ref: orderRef(order.id) }) : t('phone.orders.viewSpoken', { ref: orderRef(order.id) })}
          onPress={onOpen} style={({ focused }: Pressed) => [styles.cta, focused ? focusRing : null]}>
          <Text style={styles.ctaText}>{active ? t('phone.orders.track') : t('phone.orders.view')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Your orders (canvas OrderHistory): every order, newest first, with its state
 * from the server and one way in to track it. Tabs: all, active, lab tests
 * (lab bookings bought in the shop — never their results), past. States:
 * loading, error, first time (no orders yet), empty tab, offline.
 */
export const OrderHistoryView = observer(function OrderHistoryView({ vm, links }: { vm: OrdersViewModel; links: OrdersLinks }) {
  const t = useT();
  const online = useOnline();
  const tabs: { key: OrdersTab; label: string }[] = [
    { key: 'all', label: t('phone.orders.tab.all') },
    { key: 'active', label: t('phone.orders.tab.active') },
    { key: 'labs', label: t('phone.orders.tab.labs') },
    { key: 'past', label: t('phone.orders.tab.past') },
  ];
  const tabLabel = tabs.find((x) => x.key === vm.tab)?.label ?? '';
  const firstTime = vm.phase === 'ready' && vm.items.length === 0;
  return (
    <View style={phoneLayout.screen} testID="order-history">
      <View style={styles.head}>
        <View style={phoneLayout.top}>
          <BackButton label={t('common.back')} onPress={links.back} />
          <View style={phoneLayout.grow}>
            <Text accessibilityRole="header" style={phoneText.heading}>{t('phone.orders.title')}</Text>
            <Text style={phoneText.meta} role="status">{plural(t, vm.shown.length, 'phone.orders.countOne', 'phone.orders.count', { tab: tabLabel.toLowerCase() })}</Text>
          </View>
        </View>
        <PillTabs label={t('phone.orders.tabsLabel')} tabs={tabs} selected={vm.tab} onSelect={vm.setTab} />
      </View>
      <ScrollView contentContainerStyle={phoneLayout.content}>
        {!online ? <OfflineBoard links={links} onRetry={() => void vm.load()} /> : null}
        {online && (vm.phase === 'loading' || vm.phase === 'idle') && vm.items.length === 0 ? (
          <Skeleton label={t('phone.orders.loading')} lines={['100%', '70%', '100%', '60%']} />
        ) : null}
        {online && vm.phase === 'error' ? (
          <StateScreen kind="failure" title={t('phone.orders.failedTitle')} body={t('phone.orders.failedBody')}
            primary={{ label: t('common.tryAgain'), onPress: () => void vm.load(), testID: 'orders-retry' }} />
        ) : null}
        {online && firstTime ? (
          <View style={styles.first} testID="orders-first-time">
            <Icon3d name="cart-alt--p3" size={72} />
            <Text accessibilityRole="header" style={phoneText.heading}>{t('phone.orders.firstTitle')}</Text>
            <Text style={[phoneText.body, styles.center]}>{t('phone.orders.firstBody')}</Text>
            <Button label={t('phone.orders.browseShop')} onPress={links.openShop} testID="orders-browse" />
          </View>
        ) : null}
        {online && vm.phase === 'ready' && !firstTime && vm.shown.length === 0 ? (
          <View style={styles.first} testID="orders-empty-tab">
            <Icon name="shopping-bag" size={32} color={color.action} />
            <Text accessibilityRole="header" style={phoneText.title}>{t('phone.orders.emptyTab')}</Text>
            <Button label={t('phone.orders.browseWellness')} variant="secondary" onPress={links.openShop} />
          </View>
        ) : null}
        {online ? vm.shown.map((o, i) => <Rise key={o.id} index={i}><OrderCard order={o} onOpen={() => links.track(o.id)} /></Rise>) : null}
        {online && vm.canLoadMore ? <Button label={t('phone.orders.more')} variant="secondary" fullWidth onPress={() => void vm.loadMore()} testID="orders-more" /> : null}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  head: { paddingHorizontal: space.gutterPhone, paddingTop: space.s12, paddingBottom: space.s14, gap: space.s12, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  card: { gap: space.s8, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  ref: { fontFamily: font.family.mono, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  rule: { height: 1, backgroundColor: color.ruleSoft, marginVertical: space.s4 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.s4 },
  total: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  cta: { minHeight: size.touchTarget, paddingHorizontal: space.s16, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface3 },
  ctaText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  first: { alignItems: 'center', gap: space.s12, padding: space.s24, borderRadius: radius.xl, backgroundColor: color.surface },
  center: { textAlign: 'center' },
});
