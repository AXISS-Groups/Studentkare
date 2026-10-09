import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, EmptyState, ErrorState, Eyebrow, RadioGroup, Skeleton, TextField } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { money } from '@/data/types/workflowTypes';
import { useCheckoutViewModel } from '@/modules/m16-checkout';
import { ShopViewModel } from '../viewmodel/ShopViewModel';
import type { CatalogItem, ShopKind } from '../viewmodel/ShopViewModel';

const KINDS: { value: ShopKind; label: string }[] = [
  { value: 'product', label: 'Medicines and essentials' },
  { value: 'lab', label: 'Lab tests' },
];

export interface ShopLinks {
  openCart: () => void;
}

const ItemCard = observer(function ItemCard({ item }: { item: CatalogItem }) {
  const { state, actions } = useCheckoutViewModel();
  const inCart = state.cartItems.find((line) => line.id === item.id)?.quantity ?? 0;
  const orderable = ShopViewModel.orderable(item);
  return (
    <Card>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.meta}>{[item.brand, item.pack].filter(Boolean).join(' · ')}</Text>
      <Text style={styles.price}>{money(item.pricePaise)}</Text>
      {item.requiresPrescription ? (
        <Text style={styles.meta}>Needs a prescription. It can’t be ordered in the app until prescription review is connected.</Text>
      ) : item.stock <= 0 ? (
        <Text style={styles.meta}>Out of stock</Text>
      ) : null}
      {orderable ? (
        <Button
          label={inCart ? `Add another (${inCart} in cart)` : 'Add to cart'}
          variant={inCart ? 'secondary' : 'primary'}
          accessibilityLabel={`Add ${item.name} to cart`}
          disabled={inCart >= Math.min(item.stock, 10)}
          onPress={() => actions.addItem({
            id: item.id, name: item.name, brand: item.brand, kind: item.kind === 'lab' ? 'lab' : 'product',
            pricePaise: item.pricePaise, mrpPaise: item.mrpPaise, stock: item.stock, requiresPrescription: item.requiresPrescription,
          })}
        />
      ) : null}
    </Card>
  );
});

/** Shop (design page 2: ShopHome, ProductList, LabPackages). Prices are shown before anything is added. */
export const ShopNativeView = observer(function ShopNativeView({ viewModel: vm, links }: { viewModel: ShopViewModel; links: ShopLinks }) {
  const { state } = useCheckoutViewModel();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Eyebrow>Shop</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>Medicines and lab tests</Text>
      {state.itemCount > 0 ? <Button label={`View cart (${state.itemCount})`} size="cta" fullWidth onPress={links.openCart} /> : null}

      <RadioGroup<ShopKind> label="Browse" options={KINDS} value={vm.kind} onChange={vm.setKind} />
      <View style={styles.search}>
        <TextField label="Search" value={vm.query} onChangeText={vm.setQuery} />
        <Button label="Search" variant="secondary" onPress={() => void vm.load()} />
      </View>

      {vm.loading ? <Skeleton label="Loading the catalogue" lines={['90%', '70%', '80%']} /> : null}
      {vm.failed ? <ErrorState title="Couldn't load the catalogue" body="Check your connection and try again." retryLabel="Try again" onRetry={() => void vm.load()} /> : null}
      {vm.items && vm.items.length === 0 ? (
        <EmptyState title="Nothing listed here yet" body={vm.query ? 'No matches. Try a different word.' : 'Providers haven’t listed anything in this section yet.'} />
      ) : null}
      {vm.items?.map((item) => <ItemCard key={item.id} item={item} />)}
    </ScrollView>
  );
});

export function ShopRoute({ links }: { links: ShopLinks }): React.ReactElement {
  const [vm] = useState(() => new ShopViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <ShopNativeView viewModel={vm} links={links} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  search: { gap: space.s8 },
  name: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
  meta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
  price: { fontFamily: font.family.mono, fontSize: font.size.body, color: color.text },
});
