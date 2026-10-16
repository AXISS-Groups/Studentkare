import React from 'react';
import { say, useT } from '@/i18n';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, EmptyState, ErrorState, Eyebrow, Note, RadioGroup, Skeleton } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import type { NotificationFilter, NotificationViewModel } from '../viewmodel/NotificationViewModel';


const when = (ms: number) => new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Notifications (design page 2: Notifications). Every state is shown: loading, error, empty, list. */
export const NotificationNativeView = observer(function NotificationNativeView({ viewModel: vm }: { viewModel: NotificationViewModel }) {
  const nothingYet = vm.items.length === 0;
  const t = useT();
  const filters: { value: NotificationFilter; label: string }[] = [
    { value: 'all', label: t('notif.filter.all') },
    { value: 'unread', label: t('notif.filter.unread') },
    { value: 'emergency', label: t('notif.filter.emergency') },
  ];
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>{t('notif.eyebrow')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('notif.title')}</Text>

      {vm.loading && nothingYet ? <Skeleton label={t('notif.loading')} lines={['90%', '70%', '80%']} /> : null}
      {vm.error && nothingYet && !vm.loading ? (
        <ErrorState title={t('notif.failedTitle')} body={t('notif.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.fetchNotifications()} />
      ) : null}
      {vm.error && !nothingYet ? <Note tone="danger">{say(t, vm.error)}</Note> : null}

      {!vm.loading && !vm.error && nothingYet ? (
        <EmptyState title={t('notif.emptyTitle')} body={t('notif.emptyBody')} />
      ) : null}

      {!nothingYet ? (
        <>
          <RadioGroup<NotificationFilter> label={t('notif.show')} options={filters} value={vm.filter} onChange={vm.setFilter} />
          {vm.unreadCount > 0 ? <Button label={t('notif.markAll', { count: vm.unreadCount })} variant="secondary" fullWidth onPress={() => void vm.markAllAsRead()} /> : null}
          {vm.filteredItems.length === 0 ? <Text style={styles.meta}>{t('notif.nothingInView')}</Text> : null}
          {vm.filteredItems.map((item) => (
            <Card key={item.id}>
              <View style={styles.row}>
                <Text style={[styles.itemTitle, !item.read && styles.unread]}>{item.title}</Text>
                <Text style={styles.meta}>{when(item.timestamp)}</Text>
              </View>
              {item.category === 'EMERGENCY' ? <Note tone="danger">{item.body}</Note> : <Text style={styles.body}>{item.body}</Text>}
              {!item.read ? (
                <Button label={t('notif.markRead')} variant="ghost" accessibilityLabel={t('notif.markReadSpoken', { title: item.title })} onPress={() => void vm.markAsRead(item.id)} />
              ) : (
                <Text style={styles.meta}>{t('notif.read')}</Text>
              )}
            </Card>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.s8 },
  itemTitle: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.body, color: color.text, textTransform: 'capitalize' },
  unread: { fontWeight: fontWeight(font.weight.strong) },
  body: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text },
  meta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
});
