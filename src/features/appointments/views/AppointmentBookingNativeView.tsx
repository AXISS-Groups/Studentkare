import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, EmptyState, ErrorState, Eyebrow, Note, RadioGroup, Skeleton } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { money } from '@/data/types/workflowTypes';
import type { AppointmentBookingViewModel } from '../viewmodel/AppointmentBookingViewModel';
import { useT } from '@/i18n';

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};


/**
 * Book an appointment (design page 2: Appointments). Every list comes from the
 * server, the price is shown before the request, and a sent request is called
 * a request until the provider confirms it.
 */
export const AppointmentBookingNativeView = observer(function AppointmentBookingNativeView({ viewModel: vm }: { viewModel: AppointmentBookingViewModel }) {
  const t = useT();
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);

  if (vm.request) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Eyebrow>{t('appt.eyebrow')}</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>{t('appt.sentTitle')}</Text>
        <Note tone="info" title={t('appt.waitingTitle')}>
          {t('appt.waitingBody', { when: when(vm.request.slotStart) })}
        </Note>
        <Button label={t('appt.another')} variant="secondary" fullWidth onPress={vm.reset} />
      </ScrollView>
    );
  }

  const service = vm.selectedService;
  const bookable = vm.slots.filter((s) => s.available > 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>{t('appt.eyebrow')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('appt.title')}</Text>

      {vm.loadingServices ? <Skeleton label={t('appt.loading')} lines={['90%', '70%', '80%']} /> : null}
      {vm.servicesFailed ? <ErrorState title={t('appt.loadFailedTitle')} body={t('appt.nothingBooked')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}
      {!vm.loadingServices && !vm.servicesFailed && vm.services.length === 0 ? (
        <EmptyState title={t('appt.emptyTitle')} body={t('appt.emptyBody')} animation="anim-calendar" />
      ) : null}

      {vm.services.length > 0 ? (
        <Card>
          <RadioGroup
            label={t('appt.consultation')}
            options={vm.services.map((s) => ({ value: s.id, label: `${s.name} · ${s.brand} · ${money(s.pricePaise)}` }))}
            value={vm.selectedServiceId || null}
            onChange={(id) => void vm.selectService(id)}
          />
        </Card>
      ) : null}

      {service ? (
        <Card>
          <Text style={styles.cardTitle}>{t('appt.times')}</Text>
          {vm.loadingSlots ? <Skeleton label={t('appt.loadingTimes')} lines={['80%', '60%']} /> : null}
          {vm.slotsFailed ? <ErrorState title={t('appt.timesFailedTitle')} body={t('appt.nothingBooked')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.loadSlots()} /> : null}
          {!vm.loadingSlots && !vm.slotsFailed && bookable.length === 0 ? (
            <EmptyState title={t('appt.noTimesTitle')} body={t('appt.noTimesBody')} animation="anim-calendar" />
          ) : null}
          {bookable.length > 0 ? (
            <RadioGroup
              label={t('appt.time')}
              options={bookable.map((s) => ({ value: s.id, label: `${when(s.slotStart)} · ${t('appt.left', { count: s.available })}` }))}
              value={vm.selectedSlotId || null}
              onChange={vm.selectSlot}
            />
          ) : null}
        </Card>
      ) : null}

      {vm.error ? <Note tone="danger">{vm.error}</Note> : null}

      {service ? (
        <>
          <Text style={styles.meta}>{t('appt.price', { price: money(service.pricePaise) })}</Text>
          <Button
            label={t('appt.request')}
            size="cta"
            fullWidth
            busy={vm.submitting}
            disabled={!vm.canSubmit && !vm.submitting}
            onPress={() => void vm.submit()}
          />
        </>
      ) : null}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  meta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
});
