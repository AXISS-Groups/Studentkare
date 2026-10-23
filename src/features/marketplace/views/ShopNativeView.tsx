import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, EmptyState, ErrorState, Eyebrow, RadioGroup, Skeleton, TextField } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { money } from '@/data/types/workflowTypes';
import { useCheckoutViewModel } from '@/modules/m16-checkout';
import { ShopViewModel } from '../viewmodel/ShopViewModel';
import type { CatalogItem, ShopKind } from '../viewmodel/ShopViewModel';
import { LabBookingRoute } from '@/features/labBooking/views/LabBookingFlow';
import { useT } from '@/i18n';


export interface ShopLinks {
  openCart: () => void;
  /** A lab test is booked, not added to the cart. Signed out: sign in first. */
  signedIn?: boolean;
  studentName?: string;
  signIn?: () => void;
  openRecords?: () => void;
}

const ItemCard = observer(function ItemCard({ item, onBookLab }: { item: CatalogItem; onBookLab: (id: string) => void }) {
  const { state, actions } = useCheckoutViewModel();
  const t = useT();
  const inCart = state.cartItems.find((line) => line.id === item.id)?.quantity ?? 0;
  const orderable = ShopViewModel.orderable(item);
  if (item.kind === 'lab') {
    return (
      <Card>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>{[item.brand, item.pack].filter(Boolean).join(' · ')}</Text>
        <Text style={styles.price}>{money(item.pricePaise)}</Text>
        <Button label={t('labbook.book')} accessibilityLabel={t('labbook.bookSpoken', { name: item.name, price: money(item.pricePaise) })}
          onPress={() => onBookLab(item.id)} />
      </Card>
    );
  }
  return (
    <Card>
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.meta}>{[item.brand, item.pack].filter(Boolean).join(' · ')}</Text>
      <Text style={styles.price}>{money(item.pricePaise)}</Text>
      {item.requiresPrescription ? (
        <Text style={styles.meta}>{t('shop.needsRx')}</Text>
      ) : item.stock <= 0 ? (
        <Text style={styles.meta}>{t('shop.outOfStock')}</Text>
      ) : null}
      {orderable ? (
        <Button
          label={inCart ? t('shop.addAnother', { count: inCart }) : t('shop.add')}
          variant={inCart ? 'secondary' : 'primary'}
          accessibilityLabel={t('shop.addSpoken', { name: item.name })}
          disabled={inCart >= Math.min(item.stock, 10)}
          onPress={() => actions.addItem({
            id: item.id, name: item.name, brand: item.brand, kind: 'product',
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
  const t = useT();
  const [labItemId, setLabItemId] = useState<string | null>(null);
  const kinds: { value: ShopKind; label: string }[] = [
    { value: 'product', label: t('shop.kind.product') },
    { value: 'lab', label: t('shop.kind.lab') },
  ];
  const bookLab = (id: string) => {
    if (links.signedIn === false) { links.signIn?.(); return; }
    setLabItemId(id);
  };
  if (labItemId) {
    const records = links.openRecords ?? (() => setLabItemId(null));
    return (
      <LabBookingRoute openItemId={labItemId} studentName={links.studentName ?? ''}
        links={{ onExit: () => setLabItemId(null), onReports: records, onViewBooking: records }} />
    );
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Eyebrow>{t('shop.eyebrow')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('shop.title')}</Text>
      {state.itemCount > 0 ? <Button label={t('shop.viewCart', { count: state.itemCount })} size="cta" fullWidth onPress={links.openCart} /> : null}

      <RadioGroup<ShopKind> label={t('shop.browse')} options={kinds} value={vm.kind} onChange={vm.setKind} />
      <View style={styles.search}>
        <TextField label={t('shop.search')} value={vm.query} onChangeText={vm.setQuery} />
        <Button label={t('shop.search')} variant="secondary" onPress={() => void vm.load()} />
      </View>

      {vm.loading ? <Skeleton label={t('shop.loading')} lines={['90%', '70%', '80%']} /> : null}
      {vm.failed ? <ErrorState title={t('shop.failedTitle')} body={t('shop.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}
      {vm.items && vm.items.length === 0 ? (
        <EmptyState title={t('shop.emptyTitle')} body={vm.query ? t('shop.noMatches') : t('shop.emptyBody')} />
      ) : null}
      {vm.items?.map((item) => <ItemCard key={item.id} item={item} onBookLab={bookLab} />)}
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
