import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { NotificationViewModel } from '../viewmodel/NotificationViewModel';

interface NotificationNativeViewProps {
  viewModel: NotificationViewModel;
}

/**
 * React Native / Mobile View for Campus Notifications.
 *
 * Consumes the exact same `NotificationViewModel` as the web application,
 * maintaining 100% code reuse for the MVVM logic layer.
 */
export const NotificationNativeView: React.FC<NotificationNativeViewProps> = observer(({ viewModel }) => {
  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Campus Activity</Text>
        <TouchableOpacity
          style={styles.markReadBtn}
          onPress={() => viewModel.markAllAsRead()}
          disabled={viewModel.unreadCount === 0}
        >
          <Text style={styles.markReadText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        {(['all', 'unread', 'emergency'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, viewModel.filter === f && styles.filterChipActive]}
            onPress={() => viewModel.setFilter(f)}
          >
            <Text style={[styles.filterText, viewModel.filter === f && styles.filterTextActive]}>
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notification List */}
      <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent}>
        {viewModel.filteredItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No notifications found.</Text>
          </View>
        ) : (
          viewModel.filteredItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.itemCard,
                !item.read && styles.itemCardUnread,
                item.category === 'EMERGENCY' && styles.itemCardEmergency,
              ]}
              onPress={() => viewModel.markAsRead(item.id)}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemTime}>
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={styles.itemBody}>{item.body}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  markReadBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#e0e7ff',
  },
  markReadText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4338ca',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  filterChipActive: {
    backgroundColor: '#4f46e5',
  },
  filterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 10,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemCardUnread: {
    backgroundColor: '#faf5ff',
    borderColor: '#c084fc',
    borderLeftWidth: 4,
  },
  itemCardEmergency: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderLeftWidth: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  itemTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginLeft: 8,
  },
  itemBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
});
