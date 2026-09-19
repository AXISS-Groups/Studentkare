import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRewardsViewModel } from '../viewmodel/useRewardsViewModel';

export const RewardsScreen: React.FC = () => {
  const { state } = useRewardsViewModel();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Module M20: Rewards</Text>
      <Text style={styles.status}>Status: {state.status}</Text>
      <Text style={styles.itemCount}>Points Balance: {state.pointsBalance}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  status: { fontSize: 14, color: '#666' },
  itemCount: { fontSize: 14, marginTop: 4 },
});
