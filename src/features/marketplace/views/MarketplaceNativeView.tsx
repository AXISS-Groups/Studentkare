import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { MarketplaceViewModel } from '../viewmodel/MarketplaceViewModel';

interface MarketplaceNativeViewProps {
  viewModel: MarketplaceViewModel;
}

/**
 * Mobile (React Native) View Component for Health Fabric Diagnostics Marketplace.
 * Binds reactively to `MarketplaceViewModel` via MobX `observer`.
 */
export const MarketplaceNativeView: React.FC<MarketplaceNativeViewProps> = observer(({ viewModel }) => {
  const activeOrder = viewModel.activeOrder;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>NABL ACCREDITED DIAGNOSTICS FABRIC</Text>
        <Text style={styles.title}>Lab Test Marketplace</Text>
      </View>

      {/* Success Banner */}
      {viewModel.successMessage && activeOrder && (
        <View style={styles.successBanner}>
          <Text style={styles.successTitle}>{viewModel.successMessage}</Text>
          <Text style={styles.successSub}>Order #{activeOrder.id} • Scheduled</Text>
        </View>
      )}

      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search lab packages (CBC, Vitamin D)..."
        value={viewModel.searchQuery}
        onChangeText={(text: string) => viewModel.setSearchQuery(text)}
      />

      {/* Test Packages List */}
      {viewModel.filteredPackages.map((pkg) => {
        const provider = viewModel.providers[0];
        return (
          <View key={pkg.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.categoryBadge}>{pkg.category.replace('_', ' ')}</Text>
              <Text style={styles.tatText}>{pkg.tatHours}h TAT</Text>
            </View>

            <Text style={styles.pkgTitle}>{pkg.name}</Text>
            <Text style={styles.pkgDesc}>{pkg.description}</Text>

            <Text style={styles.providerText}>Fulfilled by {provider.name} ({provider.accreditation})</Text>

            <View style={styles.cardFooter}>
              <View style={styles.priceRow}>
                <Text style={styles.priceText}>₹{pkg.price}</Text>
                <Text style={styles.originalPriceText}>₹{pkg.originalPrice}</Text>
              </View>

              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => viewModel.bookPackage(pkg, provider)}
                disabled={viewModel.isBooking}
              >
                <Text style={styles.bookBtnText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  successBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 12,
    borderRadius: 8,
  },
  successTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#14532d',
  },
  successSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369a1',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tatText: {
    fontSize: 11,
    color: '#64748b',
  },
  pkgTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  pkgDesc: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  providerText: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  originalPriceText: {
    fontSize: 12,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  bookBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  bookBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
