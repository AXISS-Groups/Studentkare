import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { Button, ErrorState, Note, Rise, Skeleton } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { displayDate, money } from '@/data/types/workflowTypes';
import type { LiveOrder } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { BackButton, phoneLayout, phoneText, Heading } from '@/features/phoneKit/phoneParts';
import { orderRef } from '@/features/phoneKit/orderRef';
import { plural } from '@/features/phoneKit/plural';
import { canCancel, isActive, isPaid, orderState, trackSteps } from '../viewmodel/OrdersViewModel';
import type { OrdersViewModel, TrackStep } from '../viewmodel/OrdersViewModel';
import { STATE_LABEL } from './OrderHistoryView';

type Pressed = { pressed: boolean; focused?: boolean };

const STEP_COPY: Record<TrackStep['key'], { title: MessageKey; meta: MessageKey }> = {
  placed: { title: 'phone.track.step.placed', meta: 'phone.track.step.placedMeta' },
  paid: { title: 'phone.track.step.paid', meta: 'phone.track.step.paidMeta' },
  accepted: { title: 'phone.track.step.accepted', meta: 'phone.track.step.acceptedMeta' },
  dispatched: { title: 'phone.track.step.dispatched', meta: 'phone.track.step.dispatchedMeta' },
  completed: { title: 'phone.track.step.completed', meta: 'phone.track.step.completedMeta' },
};

export interface TrackingLinks {
  back: () => void;
  allOrders: () => void;
  support: () => void;
}

function Timeline({ order }: { order: LiveOrder }) {
  const t = useT();
  const steps = trackSteps(order);
  return (
    <View role="list" accessibilityLabel={t('phone.track.timeline')}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const copy = STEP_COPY[s.key];
        return (
          <Rise key={s.key} index={i}>
            <View role="listitem" style={styles.step} testID={`step-${s.key}`}
              accessibilityLabel={`${t(copy.title)}, ${t(`phone.track.state.${s.state}` as MessageKey)}`}>
              <View style={styles.rail}>
                <View style={[styles.node, s.state === 'done' ? styles.nodeDone : s.state === 'active' ? styles.nodeActive : styles.nodeTodo]}>
                  {s.state === 'done' ? <Icon name="check" size={14} color={color.onAction} strokeWidth={3} /> : null}
                </View>
                {last ? null : <View style={[styles.line, s.state === 'done' ? styles.lineDone : null]} />}
              </View>
              <View style={styles.stepWords}>
                <View style={styles.stepHead}>
                  <Text style={[styles.stepTitle, s.state === 'todo' ? styles.stepTodo : null]}>{t(copy.title)}</Text>
                  {s.key === 'placed' ? <Text style={styles.time}>{displayDate(order.createdAt)}</Text> : null}
                  {s.state === 'active' ? <Text style={styles.time}>{t('phone.track.now')}</Text> : null}
                </View>
                <Text style={phoneText.meta}>{s.key === 'paid' && s.state === 'done' ? t('phone.track.paidAmount', { amount: money(order.totalPaise) }) : t(copy.meta)}</Text>
              </View>
            </View>
          </Rise>
        );
      })}
    </View>
  );
}

/**
 * Order tracking (canvas OrderTracking): the order's steps as the server has
 * them — placed, paid, accepted by the provider, dispatched (products), done.
 * Only the time the order was placed is known, so no other step claims a
 * time. Help with an order goes to support.
 *
 * Left out from the board: the runner's name, phone and minutes away, and an
 * arrival time — the platform has no runner or location data.
 */
export const OrderTrackingView = observer(function OrderTrackingView({ vm, orderId, links }: { vm: OrdersViewModel; orderId: string; links: TrackingLinks }) {
  const t = useT();
  const order = vm.byId(orderId);
  if (!order) {
    return (
      <View style={phoneLayout.screen} testID="order-tracking-missing">
        <View style={styles.plainTop}><BackButton label={t('common.back')} onPress={links.back} /></View>
        <View style={phoneLayout.content}>
          {vm.phase === 'loading' || vm.phase === 'idle' ? <Skeleton label={t('phone.orders.loading')} lines={['60%', '100%', '80%']} /> : (
            <ErrorState title={t('phone.track.missingTitle')} body={t('phone.track.missingBody')} retryLabel={t('phone.track.allOrders')} onRetry={links.allOrders} />
          )}
        </View>
      </View>
    );
  }
  const state = orderState(order);
  const active = isActive(order);
  return (
    <View style={phoneLayout.screen} testID="order-tracking">
      <View style={styles.hero}>
        <View style={phoneLayout.top}>
          <BackButton label={t('common.back')} onPress={links.back} onHero />
          <View style={phoneLayout.grow}>
            <Heading style={styles.heroTitle}>{t('phone.track.title', { ref: orderRef(order.id) })}</Heading>
            <Text style={styles.heroSub}>
              {isPaid(order) ? plural(t, order.lines.length, 'phone.track.subPaidOne', 'phone.track.subPaid', { amount: money(order.totalPaise) }) : plural(t, order.lines.length, 'phone.track.subUnpaidOne', 'phone.track.subUnpaid', { amount: money(order.totalPaise) })}
            </Text>
          </View>
          {active ? <View style={styles.live}><View style={styles.liveDot} /><Text style={styles.liveText}>{t('phone.track.live')}</Text></View> : null}
        </View>
        <Text style={styles.status} role="status" accessibilityLiveRegion="polite">{t(STATE_LABEL[state].label)}</Text>
        <Text style={styles.heroSub}>{order.lines.map((l) => l.name).join(', ')}</Text>
      </View>
      <ScrollView contentContainerStyle={phoneLayout.content}>
        {state === 'declined' || state === 'cancelled' ? (
          <Note tone={state === 'declined' ? 'danger' : 'info'}>{t(state === 'declined' ? 'phone.track.declinedNote' : 'phone.track.cancelledNote')}</Note>
        ) : <Timeline order={order} />}

        <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('phone.track.help')} onPress={links.support} testID="track-help"
          style={({ focused }: Pressed) => [styles.help, focused ? focusRing : null]}>
          <View style={phoneLayout.grow}>
            <Text style={phoneText.title}>{t('phone.track.help')}</Text>
            <Text style={phoneText.meta}>{t('phone.track.helpBody')}</Text>
          </View>
          <View style={styles.phone}><Icon name="phone-2" size={18} color={color.onAction} /></View>
        </Pressable>

        {vm.cancelFailed ? <Note tone="danger">{t('phone.track.cancelFailed')}</Note> : null}
        {canCancel(order) ? (
          <Button label={t('phone.track.cancel')} variant="ghost" fullWidth busy={vm.cancelling} onPress={() => void vm.cancel(order)} testID="track-cancel" />
        ) : null}
      </ScrollView>
      <View style={styles.ctas}>
        <View style={styles.ctaCell}><Button label={t('phone.track.allOrders')} variant="secondary" fullWidth onPress={links.allOrders} testID="track-all" /></View>
        <View style={styles.ctaCell}><Button label={t('phone.track.report')} variant="secondary" fullWidth onPress={links.support} testID="track-report" /></View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  plainTop: { paddingHorizontal: space.gutterPhone, paddingVertical: space.s12 },
  hero: { backgroundColor: color.heroBg, paddingHorizontal: space.gutterPhone, paddingTop: space.s14, paddingBottom: space.s20, gap: space.s8 },
  heroTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  heroSub: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.onHero2 },
  live: { flexDirection: 'row', alignItems: 'center', gap: space.s6, paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full, backgroundColor: color.onHeroVeil },
  liveDot: { width: space.s6, height: space.s6, borderRadius: radius.full, backgroundColor: color.onHero },
  liveText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onHero, textTransform: 'uppercase' },
  status: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.onHero, marginTop: space.s8 },
  step: { flexDirection: 'row', gap: space.s14 },
  rail: { alignItems: 'center', width: 26 },
  node: { width: 26, height: 26, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: color.action },
  nodeActive: { backgroundColor: color.action, borderWidth: 4, borderColor: color.surface3 },
  nodeTodo: { backgroundColor: color.surface, borderWidth: 2, borderColor: color.ruleStrong },
  line: { width: 2, flexGrow: 1, minHeight: 30, backgroundColor: color.rule },
  lineDone: { backgroundColor: color.action },
  stepWords: { flex: 1, paddingBottom: space.s20, gap: space.s2 },
  stepHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.s8 },
  stepTitle: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  stepTodo: { color: color.text3 },
  time: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  help: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  phone: { width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.action },
  ctas: { flexDirection: 'row', gap: space.s10, paddingHorizontal: space.gutterPhone, paddingVertical: space.s12, backgroundColor: color.canvas },
  ctaCell: { flex: 1 },
});
