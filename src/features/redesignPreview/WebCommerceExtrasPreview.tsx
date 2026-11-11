import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlossTile, M2Card, M2Note, M2Pill, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { WebShellPreview } from './WebShellPreview';
import { BrandFooter } from './BrandFooter';

const noop = () => undefined;

interface SpeedOption {
  id: string;
  icon: SkIconName;
  title: string;
  note: string;
}

const SPEED_OPTIONS: ReadonlyArray<SpeedOption> = [
  { id: 'faster', icon: 'zap', title: '[Faster — ₹29/patient]', note: '[By 6 PM today]' },
  { id: 'standard', icon: 'truck', title: '[Standard — Free]', note: '[By tomorrow]' },
];

interface BoughtTogetherItem {
  id: string;
  icon: SkIconName;
  name: string;
  price: string;
}

const BOUGHT_TOGETHER: ReadonlyArray<BoughtTogetherItem> = [
  { id: 'item-1', icon: 'capsule', name: '[Vitamin D3 drops]', price: '₹149' },
  { id: 'item-2', icon: 'droplet', name: '[Hand sanitizer]', price: '₹89' },
  { id: 'item-3', icon: 'heart-pulse', name: '[Multivitamin strip]', price: '₹199' },
];

const BRAND_TILES: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'brand-a', label: '[Brand A]' },
  { id: 'brand-b', label: '[Brand B]' },
  { id: 'brand-c', label: '[Brand C]' },
  { id: 'brand-d', label: '[Brand D]' },
  { id: 'brand-e', label: '[Brand E]' },
];

interface RecentlyViewedItem {
  id: string;
  icon: SkIconName;
  name: string;
  price: string;
}

const RECENTLY_VIEWED: ReadonlyArray<RecentlyViewedItem> = [
  { id: 'recent-1', icon: 'box', name: '[Digital thermometer]', price: '₹349' },
  { id: 'recent-2', icon: 'activity', name: '[Pain relief gel]', price: '₹129' },
  { id: 'recent-3', icon: 'devices', name: '[BP monitor]', price: '₹1,499' },
];

/**
 * Flat, non-functional preview of WebCommerceExtras — the web
 * counterpart of `CommerceExtrasPreview.tsx` (2026-11-11 gap-analysis
 * pass, round 3): the same delivery-speed toggle, "frequently bought
 * together" row, "plan applied" savings note, brand-logo strip,
 * "continue browsing" dismissible cards, and quick-add floating overlay
 * reused verbatim, laid out for a wider desktop body inside the real
 * `StudentWebShell` instead of a 390px phone frame — the "frequently
 * bought together" and "continue browsing" rows show all 3 cards side
 * by side instead of a horizontal scroll, since the desktop body is wide
 * enough. There is no `design/screens/briefs/*` entry for this screen —
 * net-new, no brief, same footing as the mobile source file. Not wired,
 * not replacing anything. See NOTES.md.
 */
export function WebCommerceExtrasPreview(): React.ReactElement {
  const [selectedSpeed, setSelectedSpeed] = useState<string>(SPEED_OPTIONS[0].id);
  const [dismissedIds, setDismissedIds] = useState<ReadonlyArray<string>>([]);

  const visibleRecentlyViewed = RECENTLY_VIEWED.filter((item) => !dismissedIds.includes(item.id));

  return (
    <WebShellPreview route="shop">
      <View style={styles.body} testID="preview-web-commerce-extras">
        <Text style={styles.title}>[Checkout extras]</Text>

        <Text style={m2Text.section}>[Delivery speed]</Text>
        <View style={styles.speedRow} testID="preview-web-commerce-extras-speed">
          {SPEED_OPTIONS.map((option) => {
            const selected = option.id === selectedSpeed;
            return (
              <Pressable
                key={option.id}
                role="button"
                accessibilityRole="button"
                accessibilityLabel={`${option.title}, ${option.note}`}
                accessibilityState={{ selected }}
                onPress={() => setSelectedSpeed(option.id)}
                style={({ focused }: PressState) => [
                  styles.speedCard,
                  selected ? styles.speedCardSelected : null,
                  focused ? focusRing : null,
                ]}
                testID={`preview-web-commerce-extras-speed-${option.id}`}
              >
                <Icon name={option.icon} size={20} color={selected ? color.action : color.text2} />
                <Text style={styles.speedTitle}>{option.title}</Text>
                <Text style={m2Text.meta}>{option.note}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[m2Text.section, styles.sectionGap]}>[Frequently bought together]</Text>
        <View style={styles.productRow} testID="preview-web-commerce-extras-bought-together">
          {BOUGHT_TOGETHER.map((item) => (
            <M2Card key={item.id} style={styles.productCard} testID={`preview-web-commerce-extras-bought-together-${item.id}`}>
              <GlossTile icon={item.icon} hue="indigo" size={48} />
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={m2Text.price}>{item.price}</Text>
              <Pressable
                role="button"
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name}`}
                onPress={noop}
                style={({ focused }: PressState) => [styles.addBtn, focused ? focusRing : null]}
              >
                <Text style={styles.addBtnText}>[Add]</Text>
              </Pressable>
            </M2Card>
          ))}
        </View>

        <M2Note tone="positive" icon="check-circle-2" title="[Care Plan discount applied]" testID="preview-web-commerce-extras-plan-banner">
          [You saved ₹140 on this order.]
        </M2Note>

        <Text style={[m2Text.section, styles.sectionGap]}>[Top brands for you]</Text>
        <View style={styles.brandRow} testID="preview-web-commerce-extras-brands">
          {BRAND_TILES.map((brand) => (
            <View key={brand.id} style={styles.brandTileWrap} testID={`preview-web-commerce-extras-brand-${brand.id}`}>
              <GlossTile icon="box" hue="teal" size={56} />
              <Text style={[m2Text.tileLabel, styles.brandLabel]}>{brand.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[m2Text.section, styles.sectionGap]}>[Continue browsing]</Text>
        {visibleRecentlyViewed.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.carousel}
            contentContainerStyle={styles.carouselContent}
            testID="preview-web-commerce-extras-recently-viewed"
          >
            {visibleRecentlyViewed.map((item) => (
              <M2Card key={item.id} style={styles.productCard} testID={`preview-web-commerce-extras-recently-viewed-${item.id}`}>
                <Pressable
                  role="button"
                  accessibilityRole="button"
                  accessibilityLabel={`Dismiss ${item.name}`}
                  onPress={() => setDismissedIds((prev) => [...prev, item.id])}
                  style={({ focused }: PressState) => [styles.dismissBtn, focused ? focusRing : null]}
                >
                  <Icon name="x" size={12} color={color.text2} />
                </Pressable>
                <GlossTile icon={item.icon} hue="violet" size={48} />
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={m2Text.price}>{item.price}</Text>
              </M2Card>
            ))}
          </ScrollView>
        ) : (
          <Text style={m2Text.meta}>[Nothing left here — every item was dismissed.]</Text>
        )}

        <View style={styles.quickAddOverlay} testID="preview-web-commerce-extras-quick-add">
          <Icon name="cart" size={16} color={color.onAction} />
          <Text style={styles.quickAddText}>[2 items added]</Text>
          <M2Pill label="[View cart]" tone="hero" />
        </View>

        <BrandFooter />
      </View>
    </WebShellPreview>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.s24, gap: space.s12, maxWidth: 920 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  sectionGap: { marginTop: space.s8 },

  speedRow: { flexDirection: 'row', gap: space.s12, maxWidth: 480 },
  speedCard: { flex: 1, gap: space.s4, padding: space.s12, borderRadius: radius.lg, borderWidth: 2, borderColor: color.ruleSoft, backgroundColor: color.surface },
  speedCardSelected: { borderColor: color.action, backgroundColor: color.surface2 },
  speedTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },

  productRow: { flexDirection: 'row', gap: space.s16 },
  productCard: { width: 168, gap: space.s6, position: 'relative' },
  productName: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text },
  addBtn: { alignSelf: 'flex-start', height: 28, paddingHorizontal: space.s12, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  dismissBtn: { position: 'absolute', top: space.s6, right: space.s6, width: 24, height: 24, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center', zIndex: 1 },

  carousel: { marginHorizontal: -space.s24 },
  carouselContent: { paddingHorizontal: space.s24, gap: space.s16 },

  brandRow: { flexDirection: 'row', gap: space.s20 },
  brandTileWrap: { alignItems: 'center', gap: space.s4 },
  brandLabel: { maxWidth: 72 },

  quickAddOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s8,
    height: 48,
    maxWidth: 320,
    marginTop: space.s8,
    paddingHorizontal: space.s16,
    borderRadius: radius.full,
    backgroundColor: color.action,
  },
  quickAddText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
