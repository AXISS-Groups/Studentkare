import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { CartCheckoutViewModel } from '../viewmodel/CartCheckoutViewModel';

interface CartCheckoutNativeViewProps {
  viewModel: CartCheckoutViewModel;
}

const formatMoney = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

/**
 * React Native / Mobile View for Shopping Cart & Order Checkout Pipeline.
 *
 * Consumes the exact same `CartCheckoutViewModel` as the web app.
 */
export const CartCheckoutNativeView: React.FC<CartCheckoutNativeViewProps> = observer(({ viewModel }) => {
  if (viewModel.completedOrder) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successBadge}>✓ ORDER SUBMITTED</Text>
        <Text style={styles.successTitle}>Thank You for Ordering!</Text>
        <Text style={styles.orderId}>Order Ref: {viewModel.completedOrder.orderId}</Text>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>TOTAL PAID</Text>
          <Text style={styles.totalVal}>{formatMoney(viewModel.completedOrder.totalPaise)}</Text>

          <Text style={[styles.summaryLabel, styles.marginTop]}>FULFILLMENT</Text>
          <Text style={styles.summaryVal}>
            {viewModel.completedOrder.deliveryMode === 'delivery' ? '🚀 Campus Delivery' : '🏥 Self Pickup'}
          </Text>

          {viewModel.completedOrder.address && (
            <>
              <Text style={[styles.summaryLabel, styles.marginTop]}>DELIVERY LOCATION</Text>
              <Text style={styles.summaryVal}>{viewModel.completedOrder.address}</Text>
            </>
          )}

          <Text style={[styles.summaryLabel, styles.marginTop]}>ESTIMATED TIME</Text>
          <Text style={styles.summaryVal}>{viewModel.completedOrder.estimatedFulfillment}</Text>
        </View>

        <TouchableOpacity style={styles.btnPrimary} onPress={() => viewModel.reset()}>
          <Text style={styles.btnPrimaryText}>Return to Marketplace</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>HEALTHCARE MARKETPLACE</Text>
      <Text style={styles.title}>Your Shopping Cart ({viewModel.itemCount})</Text>

      {viewModel.error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{viewModel.error}</Text>
        </View>
      )}

      {viewModel.cartItems.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Add medicines, lab tests or consults from the catalog.</Text>
        </View>
      ) : (
        <>
          {/* Cart List */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cart Items</Text>
            {viewModel.cartItems.map(item => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemKind}>{item.kind.toUpperCase()}</Text>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemBrand}>{item.brand}</Text>
                  <Text style={styles.itemPrice}>{formatMoney(item.pricePaise * item.quantity)}</Text>
                </View>

                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => viewModel.updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Text style={styles.stepText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepCount}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => viewModel.updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Text style={styles.stepText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Fulfillment Mode */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fulfillment Method</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, viewModel.deliveryMode === 'pickup' && styles.toggleActive]}
                onPress={() => viewModel.setDeliveryMode('pickup')}
              >
                <Text style={[styles.toggleText, viewModel.deliveryMode === 'pickup' && styles.toggleTextActive]}>
                  🏥 Pickup
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleBtn, viewModel.deliveryMode === 'delivery' && styles.toggleActive]}
                onPress={() => viewModel.setDeliveryMode('delivery')}
              >
                <Text style={[styles.toggleText, viewModel.deliveryMode === 'delivery' && styles.toggleTextActive]}>
                  🚀 Delivery
                </Text>
              </TouchableOpacity>
            </View>

            {viewModel.deliveryMode === 'delivery' && (
              <View style={styles.fieldsGap}>
                <TextInput
                  style={styles.input}
                  placeholder="Delivery Address (Hostel / Room)"
                  value={viewModel.address}
                  onChangeText={(text: string) => viewModel.setAddress(text)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Pincode (6 digits)"
                  keyboardType="numeric"
                  maxLength={6}
                  value={viewModel.pincode}
                  onChangeText={(text: string) => viewModel.setPincode(text)}
                />
              </View>
            )}
          </View>

          {/* Bill Summary */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Order Summary</Text>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Subtotal</Text>
              <Text style={styles.billVal}>{formatMoney(viewModel.itemsSubtotalPaise)}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Fee</Text>
              <Text style={styles.billVal}>
                {viewModel.deliveryFeePaise === 0 ? 'FREE' : formatMoney(viewModel.deliveryFeePaise)}
              </Text>
            </View>

            {viewModel.couponDiscountPaise > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.discountLabel}>Promo Discount</Text>
                <Text style={styles.discountVal}>-{formatMoney(viewModel.couponDiscountPaise)}</Text>
              </View>
            )}

            <View style={[styles.billRow, styles.totalRow]}>
              <Text style={styles.grandLabel}>Total Payable</Text>
              <Text style={styles.grandVal}>{formatMoney(viewModel.totalPaise)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, !viewModel.canSubmit && styles.btnDisabled]}
              disabled={!viewModel.canSubmit}
              onPress={() => viewModel.submitOrder()}
            >
              <Text style={styles.btnPrimaryText}>
                {viewModel.submitting ? 'Placing Order...' : 'Submit Order Request'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 16 },
  eyebrow: { fontSize: 10, fontWeight: '700', color: '#4f46e5', letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  errorBox: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5' },
  errorText: { color: '#b91c1c', fontSize: 12 },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: '#ffffff', borderRadius: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  emptySub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemInfo: { flex: 1, gap: 2 },
  itemKind: { fontSize: 9, fontWeight: '700', color: '#4f46e5' },
  itemName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  itemBrand: { fontSize: 11, color: '#64748b' },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#4f46e5', marginTop: 2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 4, gap: 8 },
  stepBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  stepText: { fontSize: 16, fontWeight: '700', color: '#475569' },
  stepCount: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  toggleRow: { flexDirection: 'row', gap: 8, backgroundColor: '#f1f5f9', padding: 4, borderRadius: 10 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  toggleActive: { backgroundColor: '#ffffff' },
  toggleText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  toggleTextActive: { color: '#4f46e5', fontWeight: '700' },
  fieldsGap: { gap: 8, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 13, backgroundColor: '#ffffff' },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  billLabel: { fontSize: 13, color: '#475569' },
  billVal: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  discountLabel: { fontSize: 13, color: '#16a34a' },
  discountVal: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, marginTop: 4 },
  grandLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  grandVal: { fontSize: 16, fontWeight: '800', color: '#4f46e5' },
  btnPrimary: { backgroundColor: '#4f46e5', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnDisabled: { backgroundColor: '#94a3b8' },
  btnPrimaryText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  successContainer: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  successBadge: { fontSize: 14, fontWeight: '800', color: '#16a34a', marginBottom: 8 },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  orderId: { fontSize: 12, color: '#64748b', marginTop: 4 },
  summaryBox: { width: '100%', backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginVertical: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  summaryVal: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginTop: 2 },
  totalVal: { fontSize: 18, fontWeight: '800', color: '#4f46e5', marginTop: 2 },
  marginTop: { marginTop: 12 },
});
