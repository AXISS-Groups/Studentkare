import React, { useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, EmptyState, ErrorState, Eyebrow, Note, RadioGroup, Skeleton } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { MedicineRemindersViewModel, REMINDER_SLOTS } from '@/features/reminders/viewmodel/MedicineRemindersViewModel';
import type { ReminderSlot } from '@/features/reminders/viewmodel/MedicineRemindersViewModel';
import { createReminderScheduler } from './hardware/notifications';

type Choice = ReminderSlot | 'off';

/** Daily medicine reminders on this phone. Permission is asked for when a reminder is first turned on. */
export const MedicineRemindersScreen = observer(function MedicineRemindersScreen() {
  const t = useT();
  // Read when a reminder is scheduled, so it is worded in the language chosen then.
  const words = useRef(t);
  words.current = t;
  const [vm] = useState(
    () =>
      new MedicineRemindersViewModel(
        createReminderScheduler(() => ({
          title: words.current('reminders.notifyTitle'),
          body: words.current('reminders.notifyBody'),
          channelName: words.current('reminders.channel'),
        })),
      ),
  );

  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);

  const options = [
    { value: 'off' as const, label: t('reminders.off') },
    ...REMINDER_SLOTS.map((slot) => ({ value: slot, label: t(`reminders.slot.${slot}` as MessageKey) })),
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>{t('nav.medications')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('reminders.title')}</Text>
      <Text style={styles.body}>{t('reminders.intro')}</Text>
      <Text style={styles.meta}>{t('reminders.lockScreen')}</Text>

      {vm.permissionDenied ? (
        <Card>
          <Note tone="attention">{t('reminders.denied')}</Note>
          <Button label={t('reminders.openSettings')} variant="secondary" fullWidth onPress={() => void Linking.openSettings()} />
        </Card>
      ) : null}
      {vm.failed ? <Note tone="danger">{t('reminders.failed')}</Note> : null}

      {vm.loading ? <Skeleton label={t('reminders.loading')} lines={['90%', '70%']} /> : null}
      {vm.loadFailed ? <ErrorState title={t('reminders.failedTitle')} body={t('reminders.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}
      {vm.plans && vm.plans.length === 0 ? <EmptyState title={t('reminders.emptyTitle')} body={t('reminders.emptyBody')} /> : null}

      {vm.plans?.map((plan) => (
        <Card key={plan.id}>
          <Text style={styles.cardTitle}>{plan.name}</Text>
          {plan.dosage || plan.frequency ? <Text style={styles.meta}>{[plan.dosage, plan.frequency].filter(Boolean).join(' · ')}</Text> : null}
          <RadioGroup<Choice>
            label={t('reminders.timeLabel', { name: plan.name })}
            options={options}
            value={vm.reminders[plan.id] ?? 'off'}
            onChange={(choice) => void vm.setReminder(plan.id, choice === 'off' ? null : choice)}
          />
        </Card>
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text, lineHeight: font.size.body * font.lineHeight.body },
  meta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
});
