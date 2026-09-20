import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCheckoutViewModel } from '../viewmodel/useCheckoutViewModel';

export const CheckoutScreen: React.FC = () => {
  const { state } = useCheckoutViewModel();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Module M16: Checkout</Text>
      <Text style={styles.status}>Delivery: {state.deliveryMode}</Text>
      <Text style={styles.itemCount}>Items: {state.cartItems.length}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  status: { fontSize: 14, color: '#666' },
  itemCount: { fontSize: 14, marginTop: 4 },
});
