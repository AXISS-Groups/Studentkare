import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { observer } from 'mobx-react-lite';
import type { MarketplaceViewModel } from '../viewmodel/MarketplaceViewModel';
import { color } from '@/design-system/theme';

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
        <Text style={styles.eyebrow}>DIAGNOSTICS FABRIC</Text>
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

      {viewModel.error ? <Text accessibilityRole="alert" style={styles.pkgDesc}>{viewModel.error}</Text> : null}

      {/* Test Packages List */}
      {(viewModel.filteredPackages.length === 0 || viewModel.providers.length === 0) && (
        <View style={styles.card}>
          <Text style={styles.pkgTitle}>No lab packages yet</Text>
          <Text style={styles.pkgDesc}>Lab packages will appear here once real providers are published.</Text>
        </View>
      )}
      {viewModel.providers.length > 0 && viewModel.filteredPackages.map((pkg) => {
        const provider = viewModel.providers[0];
        return (
          <View key={pkg.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.categoryBadge}>{pkg.category.replace('_', ' ')}</Text>
              <Text style={styles.tatText}>{pkg.tatHours}h TAT</Text>
            </View>

            <Text style={styles.pkgTitle}>{pkg.name}</Text>
            <Text style={styles.pkgDesc}>{pkg.description}</Text>

            <Text style={styles.providerText}>Fulfilled by {provider.name}</Text>

            <View style={styles.cardFooter}>
              <View style={styles.priceRow}>
                <Text style={styles.priceText}>₹{pkg.price}</Text>
                <Text style={styles.originalPriceText}>₹{pkg.originalPrice}</Text>
              </View>

              <TouchableOpacity
                style={styles.bookBtn}
                accessibilityRole="button"
                accessibilityLabel={`Book ${pkg.name}`}
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
    backgroundColor: color.canvas,
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
    color: color.action,
    marginBottom: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: color.text,
  },
  successBanner: {
    backgroundColor: color.positiveBg,
    borderWidth: 1,
    borderColor: color.positiveRule,
    padding: 12,
    borderRadius: 8,
  },
  successTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: color.positive,
  },
  successSub: {
    fontSize: 11,
    color: color.positive,
    marginTop: 2,
  },
  searchInput: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.ruleStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: color.rule,
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
    color: color.info,
    backgroundColor: color.surface3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tatText: {
    fontSize: 11,
    color: color.text3,
  },
  pkgTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: color.text,
    marginBottom: 4,
  },
  pkgDesc: {
    fontSize: 12,
    color: color.text3,
    marginBottom: 8,
  },
  providerText: {
    fontSize: 11,
    color: color.text2,
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
    color: color.text,
  },
  originalPriceText: {
    fontSize: 12,
    color: color.text3,
    textDecorationLine: 'line-through',
  },
  bookBtn: {
    backgroundColor: color.action,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  bookBtnText: {
    color: color.onAction,
    fontSize: 12,
    fontWeight: '700',
  },
});
