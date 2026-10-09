import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, EmptyState, ErrorState, Eyebrow, Note, RadioGroup, Skeleton } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { money } from '@/data/types/workflowTypes';
import type { AppointmentBookingViewModel, AvailabilitySlot } from '../viewmodel/AppointmentBookingViewModel';

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
};

const slotLabel = (slot: AvailabilitySlot) => `${when(slot.slotStart)} · ${slot.available} left`;

/**
 * Book an appointment (design page 2: Appointments). Every list comes from the
 * server, the price is shown before the request, and a sent request is called
 * a request until the provider confirms it.
 */
export const AppointmentBookingNativeView = observer(function AppointmentBookingNativeView({ viewModel: vm }: { viewModel: AppointmentBookingViewModel }) {
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);

  if (vm.request) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Eyebrow>Appointments</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>Request sent</Text>
        <Note tone="info" title="Waiting for the provider">
          {`You asked for ${when(vm.request.slotStart)}. It is not confirmed until the provider accepts it.`}
        </Note>
        <Button label="Book another" variant="secondary" fullWidth onPress={vm.reset} />
      </ScrollView>
    );
  }

  const service = vm.selectedService;
  const bookable = vm.slots.filter((s) => s.available > 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>Appointments</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>Book a consultation</Text>

      {vm.loadingServices ? <Skeleton label="Loading consultations" lines={['90%', '70%', '80%']} /> : null}
      {vm.servicesFailed ? <ErrorState title="Couldn't load consultations" body="Nothing has been booked. Try again." retryLabel="Try again" onRetry={() => void vm.load()} /> : null}
      {!vm.loadingServices && !vm.servicesFailed && vm.services.length === 0 ? (
        <EmptyState title="No consultations listed yet" body="When a provider lists one, you can book it here." />
      ) : null}

      {vm.services.length > 0 ? (
        <Card>
          <RadioGroup
            label="Consultation"
            options={vm.services.map((s) => ({ value: s.id, label: `${s.name} · ${s.brand} · ${money(s.pricePaise)}` }))}
            value={vm.selectedServiceId || null}
            onChange={(id) => void vm.selectService(id)}
          />
        </Card>
      ) : null}

      {service ? (
        <Card>
          <Text style={styles.cardTitle}>Available times</Text>
          {vm.loadingSlots ? <Skeleton label="Loading times" lines={['80%', '60%']} /> : null}
          {vm.slotsFailed ? <ErrorState title="Couldn't load times" body="Nothing has been booked. Try again." retryLabel="Try again" onRetry={() => void vm.loadSlots()} /> : null}
          {!vm.loadingSlots && !vm.slotsFailed && bookable.length === 0 ? (
            <EmptyState title="No open times" body="This provider hasn't published a free slot. Check back later." />
          ) : null}
          {bookable.length > 0 ? (
            <RadioGroup
              label="Time"
              options={bookable.map((s) => ({ value: s.id, label: slotLabel(s) }))}
              value={vm.selectedSlotId || null}
              onChange={vm.selectSlot}
            />
          ) : null}
        </Card>
      ) : null}

      {vm.error ? <Note tone="danger">{vm.error}</Note> : null}

      {service ? (
        <>
          <Text style={styles.meta}>{`Price: ${money(service.pricePaise)}. Sending a request doesn’t charge you.`}</Text>
          <Button
            label="Request this appointment"
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
