import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { GlossTile, M2Card, M2Pill, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import type { SkIconName } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { WebShellPreview } from './WebShellPreview';
import { BrandFooter } from './BrandFooter';

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
 * Flat, non-functional preview of WebCategoryBrowse — the web
 * counterpart of `CategoryBrowsePreview.tsx` (2026-11-11 gap-analysis
 * pass, round 3): the same persona selector chip row, category tile
 * grid, and BOGO/family-offer promo tiles reused verbatim, laid out for
 * a wider desktop body inside the real `StudentWebShell` instead of a
 * 390px phone frame — the desktop body shows the 6 category tiles in a
 * wider grid (up to 6 columns in one row, vs mobile's 3-column wrap).
 * There is no `design/screens/briefs/*` entry for this screen — net-new,
 * no brief, same footing as the mobile source file. Not wired, not
 * replacing anything. See NOTES.md.
 *
 * Same as the mobile source: the persona selector is deliberately a
 * plain horizontal row of selectable chips with a local `useState` for
 * which one is highlighted — nothing more. It is NOT the family-avatar-
 * switcher/"Family Hub" pattern this repo already rejected (AGENTS.md
 * rule 8, see NOTES.md Part 6, 2026-11-05): it does not let one account
 * view another member's record, does not imply shared/visible health
 * data across people, and carries no clinical content at all. It only
 * answers "who is this single order for" — closer to a shipping-
 * recipient picker than a family profile system. If a real family-
 * profile pattern is ever wanted, it should follow `FamilyCircle`
 * ("Care circle", Tier 1), not this chip row.
 */
export function WebCategoryBrowsePreview(): React.ReactElement {
  const [selectedPersona, setSelectedPersona] = useState<string>(PERSONAS[0].id);
  const t = useT();

  return (
    <WebShellPreview route="shop">
      <View style={styles.body} testID="preview-web-category-browse">
        <Text style={styles.title}>{t('preview.shopByCategory')}</Text>

        <Text style={m2Text.eyebrow}>{t('preview.shoppingFor')}</Text>
        <View style={styles.personaRow} testID="preview-web-category-browse-personas">
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
                testID={`preview-web-category-browse-persona-${persona.id}`}
              >
                <GlossTile icon={persona.icon} hue={selected ? 'indigo' : 'blue'} size={40} />
                <Text style={[m2Text.tileLabel, styles.personaLabel]}>{persona.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.shopByCategory')}</Text>
        <View style={styles.grid} testID="preview-web-category-browse-grid">
          {CATEGORIES.map((category) => (
            <View key={category.id} style={styles.tileWrap} testID={`preview-web-category-browse-tile-${category.id}`}>
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
        <View style={styles.promoRow} testID="preview-web-category-browse-promos">
          <M2Card style={styles.promoCard} testID="preview-web-category-browse-promo-bogo">
            <GlossTile icon="capsule" hue="violet" size={40} />
            <Text style={styles.promoTitle}>{t('preview.buy1Get1Vitamins')}</Text>
            <Text style={m2Text.meta}>{t('preview.onSelectVitaminPacksThisWeek')}</Text>
            <M2Pill label="[BOGO]" tone="positive" icon="percent" />
          </M2Card>
          <M2Card style={styles.promoCard} testID="preview-web-category-browse-promo-family">
            <GlossTile icon="users" hue="rose" size={40} />
            <Text style={styles.promoTitle}>{t('preview.familyPackSave30')}</Text>
            <Text style={m2Text.meta}>{t('preview.stockUpForTheWholeHostelFloor')}</Text>
            <M2Pill label="[30% off]" tone="positive" icon="percent" />
          </M2Card>
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
  personaRow: { flexDirection: 'row', gap: space.s16 },
  personaChip: { alignItems: 'center', gap: space.s4, padding: space.s4, borderRadius: radius.lg, borderWidth: 2, borderColor: 'transparent' },
  personaChipSelected: { borderColor: color.action, backgroundColor: color.surface2 },
  personaLabel: { maxWidth: 72 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s16 },
  tileWrap: { width: 136, position: 'relative' },
  tileInner: { alignItems: 'center', gap: space.s4, padding: space.s12, borderRadius: radius.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  tileLabel: { marginTop: space.s2 },
  ribbon: { position: 'absolute', top: -space.s4, right: -space.s4 },
  promoRow: { flexDirection: 'row', gap: space.s16 },
  promoCard: { flex: 1, gap: space.s4, maxWidth: 420 },
  promoTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
});
