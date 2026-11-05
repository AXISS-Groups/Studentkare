import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Pill, m2Text } from '@/design-system/m2';
import type { SkIconName } from '@/design-system/icons';
import { WebShellPreview } from './WebShellPreview';
import { BrandFooter } from './BrandFooter';

/** Item-tile row above the status line on each order card — the Blinkit
 * Order History pattern Krishna pointed to (2026-11-05). No product
 * photography in this design system, so each tile is an existing
 * `<Icon>` standing in for that item, not a photo. */
function ItemThumbRow({ icons }: { icons: readonly SkIconName[] }): React.ReactElement {
  return (
    <View style={styles.thumbRow}>
      {icons.map((name, i) => (
        <View key={`${name}-${i}`} style={styles.thumbTile}><Icon name={name} size={18} color={color.text2} /></View>
      ))}
    </View>
  );
}

/**
 * Flat, non-functional 1mg-inspired preview of WebOrders — the web
 * counterpart of M2Orders. Content from design/screens/briefs/WebOrders.md
 * (Tier 2). Not wired, not replacing anything. See NOTES.md.
 */
export function WebOrdersPreview(): React.ReactElement {
  return (
    <WebShellPreview route="orders">
      <View style={styles.body}>
        <Text style={styles.h1}>My orders</Text>
        <M2Card style={styles.orderCard}>
          <View style={styles.row}>
            <GlossTile icon="shopping-bag" hue="indigo" size={48} />
            <View style={styles.flexShrink}>
              <Text style={styles.orderTitle}>Cetirizine and ORS</Text>
              <Text style={m2Text.meta}>Ordered 4 Nov 2026</Text>
            </View>
            <M2Pill label="Delivered" tone="positive" icon="check" />
          </View>
          <ItemThumbRow icons={['pill', 'droplet']} />
        </M2Card>
        <M2Card style={styles.orderCard}>
          <View style={styles.row}>
            <GlossTile icon="flask" hue="violet" size={48} />
            <View style={styles.flexShrink}>
              <Text style={styles.orderTitle}>Complete blood count</Text>
              <Text style={m2Text.meta}>Booked 2 Nov 2026</Text>
            </View>
            <M2Pill label="Done" tone="positive" icon="check" />
          </View>
          <ItemThumbRow icons={['flask']} />
        </M2Card>
        <M2Card style={styles.orderCard}>
          <View style={styles.row}>
            <View style={styles.iconTile}><Icon name="shopping-bag" size={20} color={color.text3} /></View>
            <View style={styles.flexShrink}>
              <Text style={styles.orderTitle}>Vitamin D3 60K</Text>
              <Text style={m2Text.meta}>Ordered 28 Oct 2026</Text>
            </View>
            <M2Pill label="Picked up" tone="neutral" />
          </View>
          <ItemThumbRow icons={['med-bottle']} />
        </M2Card>
        <BrandFooter />
      </View>
    </WebShellPreview>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.s24, gap: space.s16, maxWidth: 780 },
  h1: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  orderCard: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s16 },
  iconTile: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  flexShrink: { flex: 1, minWidth: 0 },
  orderTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  thumbRow: { flexDirection: 'row', gap: space.s8, marginTop: space.s12, paddingTop: space.s12, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  thumbTile: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
});
