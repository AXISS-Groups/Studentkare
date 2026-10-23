import React from 'react';
import { say, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Chip, EmptyState, ErrorState, Note, Skeleton } from '@/design-system';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardRow, BoardScreen, BoardSection, TextLink, boardText } from '@/design-system/board/BoardKit';
import type { BoardTone } from '@/design-system/board/BoardKit';
import type { SkIconName } from '@/design-system/icons';
import { space } from '@/design-system/theme';
import { tabOf } from '../viewmodel/NotificationViewModel';
import type { NotificationItem, NotificationTab, NotificationViewModel } from '../viewmodel/NotificationViewModel';
import { isToday } from '@/features/phoneboards/format';

export interface NotificationLinks {
  back?: () => void;
  /** What reaches the student, and where (Notification settings). */
  settings?: () => void;
}

const TABS: readonly NotificationTab[] = ['all', 'care', 'orders', 'records'];
const KNOWN_EVENTS = new Set(['appointment_reminder', 'medication_refill', 'MEDICATION_REMINDER', 'ENCOUNTER_FINALIZED']);

const when = (ms: number) => new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** The board's tile for an event: what it is about, never what it says. */
function lookOf(item: NotificationItem): { icon: SkIconName; tone: BoardTone } {
  const type = (item.eventType ?? '').toLowerCase();
  if (item.category === 'EMERGENCY') return { icon: 'shield-2', tone: 'danger' };
  if (item.category === 'MEDICATION') return { icon: 'pill-2', tone: 'attention' };
  if (/(share|consent|access)/.test(type)) return { icon: 'lock-3', tone: 'action' };
  const tab = tabOf(type);
  if (tab === 'orders') return { icon: 'shopping-bag', tone: 'action' };
  if (tab === 'records') return { icon: 'flask-2', tone: 'positive' };
  if (tab === 'care') return { icon: 'doctor-2', tone: 'action' };
  return { icon: 'shield-2', tone: 'neutral' };
}

/**
 * Notifications (canvas page 2, Notifications, Tier 3): All / Care / Orders /
 * Records, today and earlier, unread marked. Opening one marks it read. The
 * header's filter opens Notification settings (the board's "What should reach
 * you?" sheet edits the same switches there). Every state is shown: loading,
 * error, empty, list. One source for web and native.
 */
export const NotificationNativeView = observer(function NotificationNativeView({ viewModel: vm, links = {} }: { viewModel: NotificationViewModel; links?: NotificationLinks }) {
  const t = useT();
  const nothingYet = vm.items.length === 0;
  const titleOf = (item: NotificationItem) => (item.eventType && KNOWN_EVENTS.has(item.eventType) ? t(`care.inbox.event.${item.eventType}` as MessageKey) : item.title);
  const list = vm.tabItems;
  const groups = [
    { key: 'today', label: t('pb.today'), items: list.filter((n) => isToday(n.timestamp)) },
    { key: 'earlier', label: t('pb.notif.earlier'), items: list.filter((n) => !isToday(n.timestamp)) },
  ].filter((g) => g.items.length);

  return (
    <BoardScreen testID="notifications">
      <BoardHeader
        title={t('notif.title')}
        subtitle={nothingYet ? undefined : t('pb.notif.subtitle', { unread: vm.unreadCount, total: vm.items.length })}
        backIcon="arrow-left"
        backLabel={t('common.back')}
        onBack={links.back}
        actions={links.settings ? [{ key: 'settings', icon: 'filter', label: t('pb.notif.settings'), onPress: links.settings }] : []}
      />

      {vm.loading && nothingYet ? <Skeleton label={t('notif.loading')} lines={['90%', '70%', '80%']} /> : null}
      {vm.error && nothingYet && !vm.loading ? (
        <ErrorState title={t('notif.failedTitle')} body={t('notif.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.fetchNotifications()} />
      ) : null}
      {vm.error && !nothingYet ? <Note tone="danger">{say(t, vm.error)}</Note> : null}

      {!vm.loading && !vm.error && nothingYet ? <EmptyState title={t('notif.emptyTitle')} body={t('notif.emptyBody')} animation="anim-bell-off" /> : null}

      {!nothingYet ? (
        <>
          <View style={styles.tabs} role="group" aria-label={t('notif.show')}>
            {TABS.map((tab) => (
              <Chip key={tab} label={t(`pb.notif.tab.${tab}` as MessageKey)} selected={vm.tab === tab} onPress={() => vm.setTab(tab)} testID={`notifications-tab-${tab}`} />
            ))}
          </View>
          {vm.unreadCount > 0 ? <TextLink label={t('notif.markAll', { count: vm.unreadCount })} onPress={() => void vm.markAllAsRead()} /> : null}
          {groups.length === 0 ? <Text style={boardText.body}>{t('notif.nothingInView')}</Text> : null}
          {groups.map((group) => (
            <BoardSection key={group.key} label={group.label}>
              {group.items.map((item) => {
                const look = lookOf(item);
                return (
                  <BoardRow
                    key={item.id}
                    testID={`notification-${item.id}`}
                    icon={look.icon}
                    tone={look.tone}
                    title={titleOf(item)}
                    meta={item.body}
                    unread={!item.read}
                    onPress={item.read ? undefined : () => void vm.markAsRead(item.id)}
                    accessibilityLabel={item.read ? undefined : t('notif.markReadSpoken', { title: titleOf(item) })}
                  >
                    <Text style={boardText.meta}>{item.read ? `${when(item.timestamp)} · ${t('notif.read')}` : when(item.timestamp)}</Text>
                  </BoardRow>
                );
              })}
            </BoardSection>
          ))}
        </>
      ) : null}
    </BoardScreen>
  );
});

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
});
