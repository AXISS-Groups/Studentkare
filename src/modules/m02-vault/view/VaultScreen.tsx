import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useVaultViewModel } from '../viewmodel/useVaultViewModel';

export const VaultScreen: React.FC = () => {
  const { state, actions } = useVaultViewModel();

  useEffect(() => {
    void actions.fetchRecords();
  }, [actions]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Module M02: Vault</Text>
      <Text style={styles.status}>ABHA: {state.abhaAddress}</Text>
      <Text style={styles.itemCount}>Records: {state.storedRecords.length}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  status: { fontSize: 14, color: '#666' },
  itemCount: { fontSize: 14, marginTop: 4 },
});
