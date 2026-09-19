import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useChatViewModel } from '../viewmodel/useChatViewModel';

export const ChatScreen: React.FC = () => {
  const { state, actions } = useChatViewModel();

  useEffect(() => {
    actions.loadData();
  }, [actions]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Module M13: Chat</Text>
      <Text style={styles.status}>Status: {state.status}</Text>
      <Text style={styles.itemCount}>Items: {state.items.length}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  status: { fontSize: 14, color: '#666' },
  itemCount: { fontSize: 14, marginTop: 4 },
});
