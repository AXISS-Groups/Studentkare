import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useHealthViewModel } from '../viewmodel/useHealthViewModel';

export const HealthScreen: React.FC = () => {
  const { state, actions } = useHealthViewModel();

  useEffect(() => {
    actions.loadData();
  }, [actions]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Module M07: Health</Text>
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
