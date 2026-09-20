import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useNotificationViewModel } from '../viewmodel/useNotificationViewModel';

export const NotificationNativeView: React.FC = observer(() => {
  const { state, actions } = useNotificationViewModel();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.unreadBadge}>{state.unreadCount} Unread</Text>
      </View>

      {state.filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No notifications found.</Text>
        </View>
      ) : (
        state.filteredItems.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.itemCard, item.read && styles.readCard]}
            onPress={() => actions.markAsRead(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.itemHeader}>
              <Text style={styles.categoryTag}>{item.category}</Text>
              <Text style={styles.itemTitle}>{item.title}</Text>
            </View>
            <Text style={styles.itemBody}>{item.body}</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  unreadBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  readCard: {
    opacity: 0.7,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  categoryTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366f1',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  itemBody: {
    fontSize: 12,
    color: '#475569',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
