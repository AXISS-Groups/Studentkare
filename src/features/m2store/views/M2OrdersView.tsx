import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { AnimatedIcon, Icon3d } from '@/design-system/icons';
import { Button, ErrorState, Note, Rise, Skeleton, useOnline } from '@/design-system';
import {
  M2Card, M2Header, M2Heading, M2_NAV_CLEARANCE, SosButton, m2Text, useAmbientMotion, useLift, useLoop, useOwnPhoneChrome, webAttrs,
} from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, motion, radius, shadow, shadowStyle, size, space, webOnly } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { money } from '@/data/types/workflowTypes';
import type { LiveOrder } from '@/data/types/workflowTypes';
import { clockLabel, shortDate } from '@/features/phoneboards/format';
import { OfflineBoard } from '@/features/phoneKit/OfflineBoard';
import type { OfflineLinks } from '@/features/phoneKit/OfflineBoard';
import { orderRef } from '@/features/phoneKit/orderRef';
import { plural } from '@/features/phoneKit/plural';
import { canCancel, isActive, isPaid, orderState } from '@/features/orders/viewmodel/OrdersViewModel';
import type { OrdersViewModel, TrackStep } from '@/features/orders/viewmodel/OrdersViewModel';
import { STATE_TONE, canReturn, hasGoods, hasLab, headline, initialTab, pastLabel, routeProgress } from '../data/orderProgress';
import type { PillTone, StepShow } from '../data/orderProgress';
import { OrderRouteBand } from './OrderRouteBand';

/**
 * Mobile 2.0 Orders (canvas page 9 M2Orders, Tier 2; replaces OrderHistory and
 * OrderTracking on the phone). Active · Past, from GET /orders.
 *
 * An active order's card shows its steps exactly as the order API has them
 * (placed, paid, accepted, dispatched for goods, completed): the time it was
 * placed, "Now" on the step it is at, nothing invented. The board's live map,
 * rider and arrival time ("by 12 pm") have no backend, so the band above the
 * card is the steps drawn as a route with the marker on the current one, and
 * the headline says the step, not a time. The handover code has no backend
 * and is left out.
 *
 * Kept from the old boards: cancelling an unpaid order nobody has acted on,
 * help with an order (support), "Show older orders", the offline board
 * (emergency card, check-in pass, crisis help), the first-time state, one
 * order's page (`focusId`: the old tracking link), and SOS in the header.
 * Rule L: a lab order links to My reports and never shows a result.
 */
export interface M2OrdersLinks extends OfflineLinks {
  help: () => void;
  sos: () => void;
  shop: () => void;
  /** Buy the order's items again (the reorder page / the app's shop). */
  buyAgain: (order: LiveOrder) => void;
  /** Return an item from this order (the return request checks each line). */
  returnItem: (order: LiveOrder) => void;
  /** My health: the reports (nothing about the order is passed). */
  reports: () => void;
  /** One order's page. */
  details: (orderId: string) => void;
  /** Back to the list from one order's page. */
  allOrders: () => void;
  /**
   * Start a refill reminder from this order's product line (My health · Refills).
   * Only ids go across; nothing about health comes back to this screen (Rule L).
   */
  refill?: (orderId: string, itemId: string) => void;
}

const TONE: Readonly<Record<PillTone, { bg: string; fg: string }>> = {
  positive: { bg: color.positiveBg, fg: color.positive },
  attention: { bg: color.attentionBg, fg: color.attention },
  action: { bg: color.surface3, fg: color.action },
  danger: { bg: color.dangerBg, fg: color.danger },
  neutral: { bg: color.neutralBg, fg: color.text2 },
};

const STEP_TITLE: Readonly<Record<TrackStep['key'], MessageKey>> = {
  placed: 'phone.track.step.placed',
  paid: 'phone.track.step.paid',
  accepted: 'phone.track.step.accepted',
  dispatched: 'phone.track.step.dispatched',
  completed: 'phone.track.step.completed',
};

function StatePill({ label, tone, testID }: { label: string; tone: PillTone; testID?: string }) {
  const c = TONE[tone];
  return <View style={[styles.pill, { backgroundColor: c.bg }]} testID={testID}><Text style={[styles.pillText, { color: c.fg }]}>{label}</Text></View>;
}

function NowDot() {
  const ambient = useAmbientMotion();
  const pulse = useLoop(ambient, motion.duration.ambient / 2);
  return (
    <View style={styles.dotBox}>
      {ambient ? <Animated.View testID="m2-ord-now-pulse" style={[styles.dotRing, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }] }]} /> : null}
      <View style={[styles.dot, styles.dotNow]} />
    </View>
  );
}

const SHOW_SPOKEN: Readonly<Record<StepShow, MessageKey>> = { done: 'phone.track.state.done', now: 'phone.track.state.active', todo: 'phone.track.state.todo' };

function Steps({ order }: { order: LiveOrder }) {
  const t = useT();
  const { steps, show } = routeProgress(order);
  return (
    <View role="list" accessibilityLabel={t('phone.track.timeline')} aria-label={t('phone.track.timeline')} style={styles.steps} testID={`m2-ord-steps-${order.id}`}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const how = show[i] ?? 'todo';
        const meta = how === 'now' ? t('phone.track.now')
          : s.key === 'placed' ? clockLabel(order.createdAt)
            : s.key === 'paid' && s.state === 'done' ? t('phone.track.paidAmount', { amount: money(order.totalPaise) }) : '';
        const spoken = `${t(STEP_TITLE[s.key])}, ${t(SHOW_SPOKEN[how])}`;
        return (
          <View key={s.key} role="listitem" style={styles.step} testID={`m2-ord-step-${s.key}`} accessibilityLabel={spoken} aria-label={spoken}>
            <View style={styles.rail}>
              {how === 'now' ? <NowDot /> : <View style={styles.dotBox}><View style={[styles.dot, how === 'done' ? styles.dotDone : styles.dotTodo]} /></View>}
              {last ? null : <View style={[styles.line, how === 'done' ? styles.lineDone : null]} />}
            </View>
            <View style={styles.stepWords}>
              <Text style={[styles.stepTitle, how === 'now' ? styles.stepNow : how === 'todo' ? styles.stepTodo : null]}>{t(STEP_TITLE[s.key])}</Text>
              {meta ? <Text style={styles.stepMeta}>{meta}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** An order with its route band, headline and steps: the Active tab and one order's page. */
const OrderCard = observer(function OrderCard({ order, vm, links }: { order: LiveOrder; vm: OrdersViewModel; links: M2OrdersLinks }) {
  const t = useT();
  const state = orderState(order);
  const ref = orderRef(order.id);
  const progress = routeProgress(order);
  const head = headline(order);
  const ended = state === 'declined' || state === 'cancelled';
  const showBand = hasGoods(order) && !ended;
  const stepWord = t(STEP_TITLE[progress.steps[progress.at]?.key ?? 'placed']);
  return (
    <M2Card style={styles.orderCard} testID={`m2-ord-card-${order.id}`}>
      {showBand ? (
        <OrderRouteBand progress={progress} delivery={order.delivery.mode === 'delivery'} testID={`m2-ord-route-${order.id}`}
          label={t('m2.ord.routeLabel', { step: String(progress.at + 1), count: String(progress.steps.length), state: stepWord })} />
      ) : null}
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={m2Text.eyebrow}>{t('m2.ord.ref', { ref })}</Text>
          <StatePill label={isActive(order) ? t(`phone.orders.state.${state}` as MessageKey) : t(pastLabel(order))} tone={STATE_TONE[state]} testID={`m2-ord-state-${order.id}`} />
        </View>
        <M2Heading style={styles.headline}>{t(head.key, head.vars)}</M2Heading>
        <Text style={styles.sub}>
          {isPaid(order)
            ? plural(t, order.lines.length, 'phone.track.subPaidOne', 'phone.track.subPaid', { amount: money(order.totalPaise) })
            : plural(t, order.lines.length, 'phone.track.subUnpaidOne', 'phone.track.subUnpaid', { amount: money(order.totalPaise) })}
        </Text>
        <Text numberOfLines={2} style={m2Text.meta}>{order.lines.map((l) => l.name).join(', ')}</Text>
        {ended ? (
          <Note tone={state === 'declined' ? 'danger' : 'info'}>{t(state === 'declined' ? 'phone.track.declinedNote' : 'phone.track.cancelledNote')}</Note>
        ) : <Steps order={order} />}
        {showBand ? <Text style={styles.routeNote}>{t('m2.ord.routeNote')}</Text> : null}
        {vm.cancelFailed && canCancel(order) ? <Note tone="danger">{t('phone.track.cancelFailed')}</Note> : null}
        <View style={styles.actions}>
          <SmallButton label={t('m2.ord.getHelp')} spoken={t('m2.ord.getHelpSpoken', { ref })} onPress={links.help} testID={`m2-ord-help-${order.id}`} />
          {canCancel(order) ? (
            <Button label={t('phone.track.cancel')} variant="ghost" busy={vm.cancelling} onPress={() => void vm.cancel(order)} testID={`m2-ord-cancel-${order.id}`} />
          ) : null}
        </View>
      </View>
    </M2Card>
  );
});

function SmallButton({ label, spoken, onPress, primary = false, role = 'button', testID }: {
  label: string; spoken?: string; onPress: () => void; primary?: boolean; role?: 'button' | 'link'; testID?: string;
}) {
  return (
    <Pressable role={role} accessibilityRole={role} accessibilityLabel={spoken ?? label} aria-label={spoken ?? label} onPress={onPress} testID={testID}
      style={({ focused }: PressState) => [styles.small, primary ? styles.smallPrimary : styles.smallOutline, focused ? focusRing : null]}>
      <Text style={[styles.smallText, primary ? styles.smallTextPrimary : null]}>{label}</Text>
    </Pressable>
  );
}

function PastCard({ order, links }: { order: LiveOrder; links: M2OrdersLinks }) {
  const t = useT();
  const lift = useLift();
  const ref = orderRef(order.id);
  const names = order.lines.map((l) => l.name).join(', ');
  const state = orderState(order);
  // The first product the student was sold on this order (a refill counts one medicine).
  const refillLine = order.lines.find((l) => l.kind === 'product' && l.status !== 'CANCELLED' && l.status !== 'DECLINED');
  return (
    <View style={styles.pastCard} testID={`m2-ord-past-${order.id}`}>
      <View style={styles.pastTop}>
        <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.ord.detailsSpoken', { ref })} aria-label={t('m2.ord.detailsSpoken', { ref })}
          onPress={() => links.details(order.id)} testID={`m2-ord-details-${order.id}`} style={(s: PressState) => [styles.pastTitleBox, lift(s)]}>
          <Text numberOfLines={2} style={styles.pastTitle}>{names}</Text>
          <Text style={m2Text.meta}>{t('m2.ord.pastMeta', { date: shortDate(order.createdAt), amount: money(order.totalPaise) })}</Text>
        </Pressable>
        <StatePill label={t(pastLabel(order))} tone={state === 'completed' ? 'neutral' : STATE_TONE[state]} />
      </View>
      <View style={styles.actions}>
        {hasGoods(order) ? <SmallButton primary role="link" label={t('m2.ord.buyAgain')} spoken={t('m2.ord.buyAgainSpoken', { name: names })} onPress={() => links.buyAgain(order)} testID={`m2-ord-again-${order.id}`} /> : null}
        {canReturn(order) ? <SmallButton role="link" label={t('m2.ord.return')} spoken={t('m2.ord.returnSpoken', { ref })} onPress={() => links.returnItem(order)} testID={`m2-ord-return-${order.id}`} /> : null}
        {refillLine && links.refill ? <SmallButton role="link" label={t('refill.link.fromOrder')} spoken={t('refill.link.fromOrderSpoken', { ref })} onPress={() => links.refill?.(order.id, refillLine.itemId)} testID={`m2-ord-refill-${order.id}`} /> : null}
        {hasLab(order) ? <SmallButton role="link" label={t('m2.ord.reports')} spoken={t('m2.ord.reportsSpoken')} onPress={links.reports} testID={`m2-ord-reports-${order.id}`} /> : null}
        <SmallButton role="link" label={t('m2.ord.details')} spoken={t('m2.ord.detailsSpoken', { ref })} onPress={() => links.details(order.id)} />
      </View>
    </View>
  );
}

function Tabs({ tab, activeCount, onPick }: { tab: 'active' | 'past'; activeCount: number; onPick: (tab: 'active' | 'past') => void }) {
  const t = useT();
  const items: { key: 'active' | 'past'; label: string }[] = [
    { key: 'active', label: activeCount > 0 ? t('m2.ord.tabActive', { count: String(activeCount) }) : t('m2.ord.tabActiveNone') },
    { key: 'past', label: t('m2.ord.tabPast') },
  ];
  return (
    <View role="tablist" accessibilityLabel={t('m2.ord.tabsLabel')} aria-label={t('m2.ord.tabsLabel')} style={styles.tabs} testID="m2-ord-tabs">
      {items.map((item) => {
        const on = item.key === tab;
        return (
          <Pressable key={item.key} role="tab" accessibilityRole="tab" accessibilityState={{ selected: on }} {...webAttrs({ 'aria-selected': on ? 'true' : 'false' })}
            accessibilityLabel={item.label} onPress={() => onPick(item.key)} testID={`m2-ord-tab-${item.key}`}
            style={({ focused }: PressState) => [styles.tab, on ? styles.tabOn : null, focused ? focusRing : null]}>
            <Text style={[styles.tabText, on ? styles.tabTextOn : null]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const M2OrdersView = observer(function M2OrdersView({ vm, links, focusId = null }: { vm: OrdersViewModel; links: M2OrdersLinks; focusId?: string | null }) {
  const t = useT();
  useOwnPhoneChrome();
  const online = useOnline();
  const settled = useRef(false);
  const tab: 'active' | 'past' = vm.tab === 'past' ? 'past' : 'active';

  useEffect(() => {
    if (vm.tab !== 'active' && vm.tab !== 'past') vm.setTab('active');
  }, [vm]);
  useEffect(() => {
    if (settled.current || vm.phase !== 'ready') return;
    settled.current = true;
    vm.setTab(initialTab(vm.items));
  }, [vm, vm.phase, vm.items]);

  const pick = (next: 'active' | 'past') => { settled.current = true; vm.setTab(next); };
  const activeCount = vm.items.filter(isActive).length;
  const loading = (vm.phase === 'loading' || vm.phase === 'idle') && vm.items.length === 0;
  const firstTime = vm.phase === 'ready' && vm.items.length === 0;

  if (focusId) {
    const order = vm.byId(focusId);
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-orders-one">
        <M2Header backLabel={t('phone.track.allOrders')} onBack={links.allOrders} eyebrow={t('m2.ord.eyebrow')} title={order ? t('m2.ord.ref', { ref: orderRef(order.id) }) : t('phone.orders.title')}
          sos={{ label: t('m2.sos'), spoken: t('m2.sosSpoken'), onPress: links.sos }} />
        <View style={styles.gutter}>
          {!order && loading ? <Skeleton label={t('phone.orders.loading')} lines={['60%', '100%', '80%']} /> : null}
          {!order && !loading ? (
            <ErrorState title={t('phone.track.missingTitle')} body={t('phone.track.missingBody')} retryLabel={t('phone.track.allOrders')} onRetry={links.allOrders} />
          ) : null}
          {order ? <Rise><OrderCard order={order} vm={vm} links={links} /></Rise> : null}
          {order && !isActive(order) ? (
            <View style={[styles.actions, styles.focusActions]}>
              {hasGoods(order) ? <SmallButton primary role="link" label={t('m2.ord.buyAgain')} onPress={() => links.buyAgain(order)} /> : null}
              {canReturn(order) ? <SmallButton role="link" label={t('m2.ord.return')} spoken={t('m2.ord.returnSpoken', { ref: orderRef(order.id) })} onPress={() => links.returnItem(order)} /> : null}
              {hasLab(order) ? <SmallButton role="link" label={t('m2.ord.reports')} spoken={t('m2.ord.reportsSpoken')} onPress={links.reports} /> : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    );
  }

  const shown = tab === 'active' ? vm.items.filter(isActive) : vm.items.filter((o) => !isActive(o));
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-orders">
      <Rise>
        <View style={styles.header}>
          <View style={styles.grow}>
            <Text style={styles.eyebrow}>{t('m2.ord.eyebrow')}</Text>
            <M2Heading level={1} style={styles.title}>{t('phone.orders.title')}</M2Heading>
          </View>
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.ord.helpSpoken')} aria-label={t('m2.ord.helpSpoken')} onPress={links.help} testID="m2-ord-help"
            style={({ focused }: PressState) => [styles.helpPill, focused ? focusRing : null]}>
            <Text style={styles.helpText}>{t('m2.ord.help')}</Text>
          </Pressable>
          <SosButton label={t('m2.sos')} spoken={t('m2.sosSpoken')} onPress={links.sos} />
        </View>
      </Rise>
      <Rise index={1} style={styles.gutter}><Tabs tab={tab} activeCount={activeCount} onPick={pick} /></Rise>

      <View style={styles.gutter} role="tabpanel" accessibilityLabel={tab === 'active' ? t('m2.ord.tabActiveNone') : t('m2.ord.tabPast')}>
        {!online ? <OfflineBoard links={links} onRetry={() => void vm.load()} /> : null}
        {online && loading ? <Skeleton label={t('phone.orders.loading')} lines={['100%', '70%', '100%', '60%']} /> : null}
        {online && vm.phase === 'error' ? (
          <ErrorState title={t('phone.orders.failedTitle')} body={t('phone.orders.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} />
        ) : null}
        {online && firstTime ? (
          <M2Card style={styles.empty} testID="m2-ord-first">
            <AnimatedIcon name="anim-shopping-cart" variant="3d" hue="orange" poster={<Icon3d name="cart-alt--p3" size={72} />} />
            <M2Heading style={m2Text.section}>{t('phone.orders.firstTitle')}</M2Heading>
            <Text style={[m2Text.body, styles.centre]}>{t('phone.orders.firstBody')}</Text>
            <Button label={t('phone.orders.browseShop')} onPress={links.shop} testID="m2-ord-browse" />
          </M2Card>
        ) : null}
        {online && vm.phase === 'ready' && !firstTime && shown.length === 0 ? (
          <M2Card style={styles.empty} testID={`m2-ord-empty-${tab}`}>
            <AnimatedIcon name="anim-package" variant="3d" hue="indigo" />
            <M2Heading style={m2Text.section}>{t(tab === 'active' ? 'm2.ord.emptyActive' : 'm2.ord.emptyPast')}</M2Heading>
            <Text style={[m2Text.body, styles.centre]}>{t(tab === 'active' ? 'm2.ord.emptyActiveBody' : 'm2.ord.emptyPastBody')}</Text>
            {tab === 'active' ? <Button label={t('m2.ord.seePast')} variant="secondary" onPress={() => pick('past')} testID="m2-ord-see-past" /> : null}
            <Button label={t('phone.orders.browseShop')} variant={tab === 'active' ? 'ghost' : 'secondary'} onPress={links.shop} />
          </M2Card>
        ) : null}
        {online ? (
          <View style={styles.list}>
            {shown.map((o, i) => (
              <Rise key={o.id} index={i}>
                {tab === 'active' ? <OrderCard order={o} vm={vm} links={links} /> : <PastCard order={o} links={links} />}
              </Rise>
            ))}
          </View>
        ) : null}
        {online && vm.canLoadMore ? <Button label={t('phone.orders.more')} variant="secondary" fullWidth onPress={() => void vm.loadMore()} testID="m2-ord-more" /> : null}
      </View>
    </ScrollView>
  );
});

const DOT = 14;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center' },
  gutter: { paddingHorizontal: space.gutterPhone, gap: space.s12 },
  grow: { flex: 1, minWidth: 0 },
  centre: { textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingHorizontal: space.gutterPhone, paddingTop: space.s16 },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.7, color: color.text },
  helpPill: {
    minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, justifyContent: 'center', backgroundColor: color.surface, ...shadowStyle(shadow.hairline),
  },
  helpText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  tabs: { flexDirection: 'row', padding: space.s4, borderRadius: radius.full, backgroundColor: color.surface, ...shadowStyle(shadow.hairline) },
  tab: {
    flex: 1, minHeight: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
    ...webOnly({ transitionProperty: 'background-color, color, box-shadow', transitionDuration: `${motion.duration.base}ms` }),
  },
  tabOn: { backgroundColor: color.action, ...shadowStyle(shadow.hairline) },
  tabText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  tabTextOn: { color: color.onAction },
  list: { gap: space.s12 },
  orderCard: { borderRadius: 28, overflow: 'hidden', ...shadowStyle(shadow.float) },
  cardBody: { padding: space.s16, gap: space.s6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s8 },
  pill: { paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full },
  pillText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  headline: { marginTop: space.s4, fontFamily: font.family.sans, fontSize: font.size.title, lineHeight: 26, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.4, color: color.text },
  sub: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  steps: { marginTop: space.s12 },
  step: { flexDirection: 'row', gap: space.s12 },
  rail: { alignItems: 'center', width: DOT },
  dotBox: { width: DOT, height: DOT, marginTop: space.s2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: radius.full },
  dotRing: { position: 'absolute', width: DOT, height: DOT, borderRadius: radius.full, backgroundColor: color.positiveFill },
  dotDone: { backgroundColor: color.action },
  dotNow: { backgroundColor: color.positiveFill },
  dotTodo: { backgroundColor: color.surface, borderWidth: 2, borderColor: color.ruleStrong },
  line: { width: 2, flexGrow: 1, minHeight: 20, backgroundColor: color.rule },
  lineDone: { backgroundColor: color.action },
  stepWords: { flex: 1, paddingBottom: space.s14, gap: space.s2 },
  stepTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  stepNow: { fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  stepTodo: { color: color.text3 },
  stepMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  routeNote: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.s8, marginTop: space.s4 },
  focusActions: { marginTop: 0 },
  small: { minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, justifyContent: 'center' },
  smallPrimary: { backgroundColor: color.action },
  smallOutline: { borderWidth: 1.5, borderColor: color.rule, backgroundColor: color.surface },
  smallText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  smallTextPrimary: { color: color.onAction },
  pastCard: { borderRadius: 24, padding: space.s16, gap: space.s10, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  pastTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.s10 },
  pastTitleBox: { flex: 1, minWidth: 0, gap: space.s2, borderRadius: radius.md },
  pastTitle: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  empty: { alignItems: 'center', gap: space.s12, padding: space.s24 },
});
