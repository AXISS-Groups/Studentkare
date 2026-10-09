import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, EmptyState, ErrorState, Eyebrow, Note, RadioGroup, Skeleton } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import type { NotificationFilter, NotificationViewModel } from '../viewmodel/NotificationViewModel';

const FILTERS: { value: NotificationFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'emergency', label: 'Emergency' },
];

const when = (ms: number) => new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** Notifications (design page 2: Notifications). Every state is shown: loading, error, empty, list. */
export const NotificationNativeView = observer(function NotificationNativeView({ viewModel: vm }: { viewModel: NotificationViewModel }) {
  const nothingYet = vm.items.length === 0;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>Updates</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>Notifications</Text>

      {vm.loading && nothingYet ? <Skeleton label="Loading notifications" lines={['90%', '70%', '80%']} /> : null}
      {vm.error && nothingYet && !vm.loading ? (
        <ErrorState title="Couldn't load notifications" body="Check your connection and try again." retryLabel="Try again" onRetry={() => void vm.fetchNotifications()} />
      ) : null}
      {vm.error && !nothingYet ? <Note tone="danger">{vm.error}</Note> : null}

      {!vm.loading && !vm.error && nothingYet ? (
        <EmptyState title="No notifications yet" body="Updates about your requests, appointments and safety alerts appear here." />
      ) : null}

      {!nothingYet ? (
        <>
          <RadioGroup<NotificationFilter> label="Show" options={FILTERS} value={vm.filter} onChange={vm.setFilter} />
          {vm.unreadCount > 0 ? <Button label={`Mark all ${vm.unreadCount} as read`} variant="secondary" fullWidth onPress={() => void vm.markAllAsRead()} /> : null}
          {vm.filteredItems.length === 0 ? <Text style={styles.meta}>Nothing in this view.</Text> : null}
          {vm.filteredItems.map((item) => (
            <Card key={item.id}>
              <View style={styles.row}>
                <Text style={[styles.itemTitle, !item.read && styles.unread]}>{item.title}</Text>
                <Text style={styles.meta}>{when(item.timestamp)}</Text>
              </View>
              {item.category === 'EMERGENCY' ? <Note tone="danger">{item.body}</Note> : <Text style={styles.body}>{item.body}</Text>}
              {!item.read ? (
                <Button label="Mark as read" variant="ghost" accessibilityLabel={`Mark "${item.title}" as read`} onPress={() => void vm.markAsRead(item.id)} />
              ) : (
                <Text style={styles.meta}>Read</Text>
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
