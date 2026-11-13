import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { GlossTile, M2Card, M2Note, M2Pill, RoundButton, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';

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
  rx?: boolean;
}

const BOUGHT_TOGETHER: ReadonlyArray<BoughtTogetherItem> = [
  { id: 'item-1', icon: 'capsule', name: '[Vitamin D3 drops]', price: '₹149' },
  { id: 'item-2', icon: 'droplet', name: '[Hand sanitizer]', price: '₹89' },
  { id: 'item-3', icon: 'heart-pulse', name: '[Multivitamin strip]', price: '₹199' },
  { id: 'item-4', icon: 'capsule', name: '[Antibiotic course]', price: '₹219', rx: true },
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
 * Flat, non-functional preview of 6 small commerce/checkout UI patterns
 * found in reference-app screen recordings (Tata 1mg, Blinkit) reviewed
 * 2026-11-11 (same gap-analysis round as `CategoryBrowsePreview.tsx` and
 * the other 2026-11-11 sibling previews, round 3): a delivery-speed
 * toggle, a "frequently bought together" horizontal carousel, a "plan
 * applied" savings banner, a brand-logo strip, a "continue browsing"
 * recently-viewed row with dismiss, and a quick-add floating mini
 * overlay. This repo's shared component set has no single screen
 * combining these commerce-only checkout extras yet. There is no
 * `design/screens/briefs/*` entry for this screen — net-new, same
 * footing as `ReferFriendPreview.tsx` and `CategoryBrowsePreview.tsx`.
 *
 * Deliberately Tier 3 / commerce only: no clinical content, no personal
 * health data, no real brand names (every brand tile is bracketed
 * placeholder copy, per the task's own instruction not to invent brand
 * names), and no invented prices beyond placeholder figures. The "plan
 * applied" savings banner is static only (no confetti/animation), per
 * AGENTS.md rule 4 (commerce firewall) read narrowly: a discount applied
 * to an order is commerce, not a clinical body-metric gamification, so
 * it's in scope here, but still deliberately understated rather than
 * celebratory. If any of this is wanted for real, it needs its own brief
 * and ticket first, same caution as `CategoryBrowsePreview.tsx`. Not
 * wired, not replacing anything. See NOTES.md.
 *
 * Built only from approved pieces: `M2Card`, `GlossTile`, `m2Text`,
 * `M2Pill`, `M2Note`, `RoundButton` from `@/design-system/m2`; `Icon`
 * from `@/design-system/icons`, limited to `arrow-left` (back button),
 * `zap` and `truck` (delivery-speed option icons), `cart` (floating
 * quick-add mini overlay and header context), `check-circle-2` (plan-
 * applied savings banner), `percent` (savings banner pill), `x` (dismiss
 * button on recently-viewed cards — confirmed in
 * `design/icons/icon-manifest.json`; no separate `close`/`dismiss` entry
 * exists, so `x` is the correct confirmed icon for this), `capsule`,
 * `droplet`, `heart-pulse`, `box`, `activity`, `devices` (product-card
 * thumbnails), `prescription-2` (Rx-required badge, confirmed in the
 * manifest) — all confirmed in `design/icons/icon-manifest.json` before
 * use. Tokens only (`color`, `font`, `fontWeight`, `radius`, `space`) —
 * no hex values.
 *
 * 2026-11-11 addition (round 4, reference-video re-watch): a 4th
 * "frequently bought together" card ("[Antibiotic course]") carries an
 * `M2Pill` "Rx" badge (`tone="attention"`, `prescription-2` icon),
 * matching the Rx-needed badge seen on pharmacy grid cards in the
 * Blinkit reference recording (`video-review/frames/v2021/report.md`,
 * catalog item 12). Reuses the existing `M2Pill` component rather than a
 * hand-built badge, so its colours come from the pill's own tone map
 * (`attentionBg`/`attention`), not a one-off hex pairing.
 *
 * What's on the screen, in order: a header with a `RoundButton` back
 * control and the title "[Checkout extras]"; (1) a 2-up delivery-speed
 * toggle ("[Faster — ₹29/patient, by 6 PM today]" vs "[Standard — Free,
 * by tomorrow]") with local `useState` selection; (2) a "Frequently
 * bought together" horizontal `ScrollView` of 3 small product cards
 * (`GlossTile` thumbnail, name, price, non-functional "[Add]" button);
 * (3) a slim "Plan applied" savings banner strip, visually distinct from
 * a hero banner, reading "[Care Plan discount applied — you saved
 * ₹140]"; (4) a "[Top brands for you]" heading with a horizontal row of
 * 5 placeholder brand `GlossTile` squares; (5) a "Continue browsing"
 * recently-viewed row of 3 small product cards, each with a dismiss `x`
 * icon-button in the top-right corner, backed by local `useState` so a
 * tapped card visually disappears from this preview; (6) a small pill-
 * shaped floating quick-add overlay near the bottom, above where a real
 * footer would sit, showing "[2 items added]" with a mini `cart` icon
 * and "[View cart]", static/always-visible for this preview.
 *
 * Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No
 * real data anywhere — every name, price and brand label is bracketed
 * placeholder copy. No `check-icons.mjs --screen` run and no
 * `design/screens/implementation-map.json` entry, since there is no
 * brief or ticket yet. Not committed, pushed, or opened as a PR. See
 * NOTES.md.
 */
export function CommerceExtrasPreview(): React.ReactElement {
  const [selectedSpeed, setSelectedSpeed] = useState<string>(SPEED_OPTIONS[0].id);
  const [dismissedIds, setDismissedIds] = useState<ReadonlyArray<string>>([]);

  const visibleRecentlyViewed = RECENTLY_VIEWED.filter((item) => !dismissedIds.includes(item.id));
  const t = useT();

  return (
    <View style={styles.screen} testID="preview-commerce-extras">
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label="Back" onPress={noop} />
        <Text style={styles.title}>{t('preview.checkoutExtras')}</Text>
      </View>

      <View style={styles.scroll}>
        <View style={styles.body}>
          <Text style={m2Text.section}>{t('preview.deliverySpeed')}</Text>
          <View style={styles.speedRow} testID="preview-commerce-extras-speed">
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
                  testID={`preview-commerce-extras-speed-${option.id}`}
                >
                  <Icon name={option.icon} size={20} color={selected ? color.action : color.text2} />
                  <Text style={styles.speedTitle}>{option.title}</Text>
                  <Text style={m2Text.meta}>{option.note}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.frequentlyBoughtTogether')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.carousel}
            contentContainerStyle={styles.carouselContent}
            testID="preview-commerce-extras-bought-together"
          >
            {BOUGHT_TOGETHER.map((item) => (
              <M2Card key={item.id} style={styles.productCard} testID={`preview-commerce-extras-bought-together-${item.id}`}>
                {item.rx ? (
                  <View style={styles.rxBadge} testID={`preview-commerce-extras-rx-badge-${item.id}`}>
                    <M2Pill label="[Rx]" tone="attention" icon="prescription-2" />
                  </View>
                ) : null}
                <GlossTile icon={item.icon} hue="indigo" size={48} />
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={m2Text.price}>{item.price}</Text>
                <Pressable
                  role="button"
                  accessibilityRole="button"
                  accessibilityLabel={t('preview.addName', { name: item.name })}
                  onPress={noop}
                  style={({ focused }: PressState) => [styles.addBtn, focused ? focusRing : null]}
                >
                  <Text style={styles.addBtnText}>{t('preview.add')}</Text>
                </Pressable>
              </M2Card>
            ))}
          </ScrollView>

          <M2Note tone="positive" icon="check-circle-2" title={t('preview.carePlanDiscountApplied')} testID="preview-commerce-extras-plan-banner">
            {t('preview.youSaved140OnThisOrder')}
          </M2Note>

          <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.topBrandsForYou')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.carousel}
            contentContainerStyle={styles.carouselContent}
            testID="preview-commerce-extras-brands"
          >
            {BRAND_TILES.map((brand) => (
              <View key={brand.id} style={styles.brandTileWrap} testID={`preview-commerce-extras-brand-${brand.id}`}>
                <GlossTile icon="box" hue="teal" size={56} />
                <Text style={[m2Text.tileLabel, styles.brandLabel]}>{brand.label}</Text>
              </View>
            ))}
          </ScrollView>

          <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.continueBrowsing')}</Text>
          {visibleRecentlyViewed.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.carousel}
              contentContainerStyle={styles.carouselContent}
              testID="preview-commerce-extras-recently-viewed"
            >
              {visibleRecentlyViewed.map((item) => (
                <M2Card key={item.id} style={styles.productCard} testID={`preview-commerce-extras-recently-viewed-${item.id}`}>
                  <Pressable
                    role="button"
                    accessibilityRole="button"
                    accessibilityLabel={t('preview.dismissName', { name: item.name })}
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
            <Text style={m2Text.meta}>{t('preview.nothingLeftHereEveryItemWasDismissed')}</Text>
          )}
        </View>
      </View>

      <View style={styles.quickAddOverlay} testID="preview-commerce-extras-quick-add">
        <Icon name="cart" size={16} color={color.onAction} />
        <Text style={styles.quickAddText}>{t('preview.2ItemsAdded')}</Text>
        <M2Pill label="[View cart]" tone="hero" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 1320, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  scroll: { flex: 1 },
  body: { paddingHorizontal: space.gutterPhone, paddingBottom: space.s20, gap: space.s12 },
  sectionGap: { marginTop: space.s8 },

  speedRow: { flexDirection: 'row', gap: space.s12 },
  speedCard: { flex: 1, gap: space.s4, padding: space.s12, borderRadius: radius.lg, borderWidth: 2, borderColor: color.ruleSoft, backgroundColor: color.surface },
  speedCardSelected: { borderColor: color.action, backgroundColor: color.surface2 },
  speedTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },

  carousel: { marginHorizontal: -space.gutterPhone },
  carouselContent: { paddingHorizontal: space.gutterPhone, gap: space.s12 },
  productCard: { width: 128, gap: space.s6, position: 'relative' },
  productName: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text },
  addBtn: { alignSelf: 'flex-start', height: 28, paddingHorizontal: space.s12, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  dismissBtn: { position: 'absolute', top: space.s6, right: space.s6, width: 24, height: 24, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  rxBadge: { position: 'absolute', top: space.s6, left: space.s6, zIndex: 1 },

  brandTileWrap: { alignItems: 'center', gap: space.s4 },
  brandLabel: { maxWidth: 72 },

  quickAddOverlay: {
    position: 'absolute',
    bottom: space.s20,
    left: space.gutterPhone,
    right: space.gutterPhone,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s8,
    height: 48,
    paddingHorizontal: space.s16,
    borderRadius: radius.full,
    backgroundColor: color.action,
  },
  quickAddText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
});
