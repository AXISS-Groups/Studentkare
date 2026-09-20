import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useCheckoutViewModel } from '../viewmodel/useCheckoutViewModel';
import type { CartLineItem } from '../domain/Checkout';

const formatRupees = (paise: number): string => `₹${(paise / 100).toLocaleString('en-IN')}`;

export const CartCheckoutNativeView: React.FC = observer(() => {
  const { state, actions } = useCheckoutViewModel();

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Campus Checkout</Text>

      <ScrollView style={styles.scrollView}>
        {state.cartItems.map((item: CartLineItem) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Text style={styles.itemBrand}>{item.brand}</Text>
              <Text style={styles.itemPrice}>{formatRupees(item.pricePaise)}</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => actions.updateQuantity(item.id, item.quantity - 1)}>
                <Text style={styles.stepperText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityText}>{item.quantity}</Text>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => actions.updateQuantity(item.id, item.quantity + 1)}>
                <Text style={styles.stepperText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Payable</Text>
          <Text style={styles.totalAmount}>{formatRupees(state.totalPaise)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, !state.canSubmit && styles.disabledBtn]}
          disabled={!state.canSubmit}
          onPress={() => void actions.submitOrder()}
        >
          <Text style={styles.checkoutBtnText}>Place Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', padding: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  scrollView: { flex: 1 },
  itemCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  itemBrand: { fontSize: 11, color: '#64748b' },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#4f46e5', marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  stepperBtn: { paddingHorizontal: 6 },
  stepperText: { fontSize: 16, fontWeight: '700', color: '#475569' },
  quantityText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  footer: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16, marginTop: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalLabel: { fontSize: 14, fontWeight: '600', color: '#475569' },
  totalAmount: { fontSize: 18, fontWeight: '800', color: '#4f46e5' },
  checkoutBtn: { backgroundColor: '#4f46e5', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  disabledBtn: { backgroundColor: '#94a3b8' },
  checkoutBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
