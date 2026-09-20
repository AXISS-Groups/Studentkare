import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthViewModel } from '../viewmodel/useAuthViewModel';

export const AuthScreen: React.FC = () => {
  const { state, actions } = useAuthViewModel();

  useEffect(() => {
    void actions.loadOptions();
  }, [actions]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Module M01: Auth</Text>
      <Text style={styles.status}>Mode: {state.mode}</Text>
      <Text style={styles.itemCount}>User: {state.currentUser ? state.currentUser.fullName : 'Guest'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  status: { fontSize: 14, color: '#666' },
  itemCount: { fontSize: 14, marginTop: 4 },
});
