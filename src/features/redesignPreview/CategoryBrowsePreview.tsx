import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { GlossTile, M2Card, M2Pill, RoundButton, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import type { SkIconName } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';

const noop = () => undefined;

interface Persona {
  id: string;
  label: string;
  icon: SkIconName;
}

const PERSONAS: ReadonlyArray<Persona> = [
  { id: 'myself', label: '[Myself]', icon: 'user' },
  { id: 'partner', label: '[Partner]', icon: 'user-2' },
  { id: 'parent', label: '[Parent]', icon: 'user-3' },
  { id: 'add', label: '[Add profile]', icon: 'plus' },
];

interface CategoryTile {
  id: string;
  label: string;
  icon: SkIconName;
  badge?: string;
}

const CATEGORIES: ReadonlyArray<CategoryTile> = [
  { id: 'vitamins', label: '[Vitamins]', icon: 'capsule', badge: '[Trending]' },
  { id: 'skin', label: '[Skin Care]', icon: 'droplet' },
  { id: 'diabetes', label: '[Diabetes Care]', icon: 'heart-pulse', badge: '[Best Seller]' },
  { id: 'pain', label: '[Pain Relief]', icon: 'activity' },
  { id: 'baby', label: '[Baby Care]', icon: 'box', badge: '[New]' },
  { id: 'devices', label: '[Devices]', icon: 'devices' },
];

/**
 * Flat, non-functional preview of 3 small commerce/browse card patterns
 * found in reference-app screen recordings reviewed 2026-11-11 (same
 * gap-analysis round as `LabPackageSelectionPreview.tsx` and the other
 * 2026-11-11 sibling previews): a category icon-tile grid with ribbon
 * badges, a "who are you shopping for" persona/avatar chip row, and a
 * BOGO/family-offer promo tile pair. This repo's shared component set
 * already has a generic product card, but not this specific category-
 * grid-with-ribbon-badge shape, so it's previewed here as its own
 * reusable pattern. There is no `design/screens/briefs/*` entry for this
 * screen — net-new, same footing as `ReferFriendPreview.tsx`.
 *
 * The persona selector is deliberately a plain horizontal row of
 * selectable chips with a local `useState` for which one is highlighted
 * — nothing more. It is NOT the family-avatar-switcher/"Family Hub"
 * pattern this repo already rejected (AGENTS.md rule 8, see NOTES.md
 * Part 6, 2026-11-05): it does not let one account view another
 * member's record, does not imply shared/visible health data across
 * people, and carries no clinical content at all. It only answers "who
 * is this single order for" — closer to a shipping-recipient picker than
 * a family profile system. If a real family-profile pattern is ever
 * wanted, it should follow `FamilyCircle` ("Care circle", Tier 1), not
 * this chip row.
 *
 * Built only from approved pieces: `M2Card`, `GlossTile`, `m2Text`,
 * `M2Pill`, `RoundButton` from `@/design-system/m2`; icons confirmed in
 * `design/icons/icon-manifest.json` before use. "Trending" and "New"
 * have no literal matching icon in the manifest (no `trending`/`flame`/
 * `new` entries), so `trend-arrow` stands in for "Trending" and
 * `sparkle` stands in for "New" — both already-existing icons closest
 * in meaning, not invented look-alikes. "Best Seller" uses `star-filled`
 * per the task's own suggested substitute. Tokens only (`color`, `font`,
 * `fontWeight`, `radius`, `space`) — no hex values.
 *
 * Not wired into navigation, routing, or `studentPhoneBoards.tsx`. No
 * real data anywhere — every label and price is bracketed placeholder
 * copy. No `check-icons.mjs --screen` run and no
 * `design/screens/implementation-map.json` entry, since there is no
 * brief or ticket yet. Not committed, pushed, or opened as a PR. See
 * NOTES.md.
 */
export function CategoryBrowsePreview(): React.ReactElement {
  const [selectedPersona, setSelectedPersona] = useState<string>(PERSONAS[0].id);
  const t = useT();

  return (
    <View style={styles.screen} testID="preview-category-browse">
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label="Back" onPress={noop} />
        <Text style={styles.title}>{t('preview.shopByCategory')}</Text>
      </View>

      <View style={styles.scroll}>
        <View style={styles.body}>
          <Text style={m2Text.eyebrow}>{t('preview.shoppingFor')}</Text>
          <View style={styles.personaRow} testID="preview-category-browse-personas">
            {PERSONAS.map((persona) => {
              const selected = persona.id === selectedPersona;
              return (
                <Pressable
                  key={persona.id}
                  role="button"
                  accessibilityRole="button"
                  accessibilityLabel={persona.label}
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedPersona(persona.id)}
                  style={({ focused }: PressState) => [
                    styles.personaChip,
                    selected ? styles.personaChipSelected : null,
                    focused ? focusRing : null,
                  ]}
                  testID={`preview-category-browse-persona-${persona.id}`}
                >
                  <GlossTile icon={persona.icon} hue={selected ? 'indigo' : 'blue'} size={40} />
                  <Text style={[m2Text.tileLabel, styles.personaLabel]}>{persona.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.shopByCategory')}</Text>
          <View style={styles.grid} testID="preview-category-browse-grid">
            {CATEGORIES.map((category) => (
              <View key={category.id} style={styles.tileWrap} testID={`preview-category-browse-tile-${category.id}`}>
                <View style={styles.tileInner}>
                  <GlossTile icon={category.icon} hue="teal" size={52} />
                  <Text style={[m2Text.tileLabel, styles.tileLabel]}>{category.label}</Text>
                </View>
                {category.badge ? (
                  <View style={styles.ribbon}>
                    <M2Pill
                      label={category.badge}
                      tone="attention"
                      icon={
                        category.badge === '[Trending]'
                          ? 'trend-arrow'
                          : category.badge === '[Best Seller]'
                            ? 'star-filled'
                            : 'sparkle'
                      }
                    />
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.offersForYou')}</Text>
          <View style={styles.promoRow} testID="preview-category-browse-promos">
            <M2Card style={styles.promoCard} testID="preview-category-browse-promo-bogo">
              <GlossTile icon="capsule" hue="violet" size={40} />
              <Text style={styles.promoTitle}>{t('preview.buy1Get1Vitamins')}</Text>
              <Text style={m2Text.meta}>{t('preview.onSelectVitaminPacksThisWeek')}</Text>
              <M2Pill label="[BOGO]" tone="positive" icon="percent" />
            </M2Card>
            <M2Card style={styles.promoCard} testID="preview-category-browse-promo-family">
              <GlossTile icon="users" hue="rose" size={40} />
              <Text style={styles.promoTitle}>{t('preview.familyPackSave30')}</Text>
              <Text style={m2Text.meta}>{t('preview.stockUpForTheWholeHostelFloor')}</Text>
              <M2Pill label="[30% off]" tone="positive" icon="percent" />
            </M2Card>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 1280, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  scroll: { flex: 1 },
  body: { paddingHorizontal: space.gutterPhone, paddingBottom: space.s20, gap: space.s12 },
  personaRow: { flexDirection: 'row', gap: space.s12 },
  personaChip: { alignItems: 'center', gap: space.s4, padding: space.s4, borderRadius: radius.lg, borderWidth: 2, borderColor: 'transparent' },
  personaChipSelected: { borderColor: color.action, backgroundColor: color.surface2 },
  personaLabel: { maxWidth: 72 },
  sectionGap: { marginTop: space.s8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12 },
  tileWrap: { width: '30%', position: 'relative' },
  tileInner: { alignItems: 'center', gap: space.s4, padding: space.s8, borderRadius: radius.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  tileLabel: { marginTop: space.s2 },
  ribbon: { position: 'absolute', top: -space.s4, right: -space.s4 },
  promoRow: { flexDirection: 'row', gap: space.s12 },
  promoCard: { flex: 1, gap: space.s4 },
  promoTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
});
