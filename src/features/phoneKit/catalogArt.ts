import type { SkIconName } from '@/design-system/icons';
import type { MessageKey } from '@/i18n';
import type { Tone } from './phoneParts';

/**
 * The icon each catalogue listing is drawn with on the phone boards. Decoration
 * only: the canvas draws each product as an icon on a tile, and the catalogue
 * carries no art of its own, so the icon follows the listing's kind and
 * category (and a few words in its name). It never says anything about the
 * person looking at it.
 */

/** Categories as the catalogue stores them (CatalogEntry.category), with the canvas icon for each. */
const CATEGORY_ICONS: Readonly<Record<string, SkIconName>> = {
  vitamins: 'pill-2',
  medicines: 'pill-2',
  skin: 'droplet-2',
  nutrition: 'fruit',
  devices: 'fridge',
  ayurveda: 'leaf-2',
  'first-aid': 'first-aid-kit',
  sleep: 'moon',
  hygiene: 'droplet-4',
  labs: 'flask-2',
};

/** Words in a product name that pick a more specific canvas drawing (ProductList). */
const NAME_ICONS: ReadonlyArray<readonly [RegExp, SkIconName]> = [
  [/omega|fish/i, 'fish'],
  [/sleep|melatonin|magnesium/i, 'moon'],
  [/vitamin\s*c\b|effervescent/i, 'target-cross'],
  [/vitamin\s*d|\bd3\b/i, 'crosshair'],
  [/ashwagandha|herbal|tulsi|ayur/i, 'leaf-2'],
];

export interface ArtListing { kind: string; category: string; name: string }

/** Lab listings: a blood test draws the drop, a profile or panel the trace, anything else the flask. */
const LAB_NAME_ICONS: ReadonlyArray<readonly [RegExp, SkIconName]> = [
  [/blood|b12|cbc|haemo|hemo|ferritin|iron/i, 'droplet-3'],
  [/profile|panel|package|checkup|check-up/i, 'activity-2'],
];

export function listingIcon(item: ArtListing): SkIconName {
  if (item.kind === 'lab') return LAB_NAME_ICONS.find(([pattern]) => pattern.test(item.name))?.[1] ?? 'flask-2';
  // A nutritionist's consult is drawn with the fruit, as on the canvas; every other consult with the stethoscope tube.
  if (item.kind === 'consultation') return item.category === 'nutrition' ? 'fruit' : 'doctor-2';
  if (item.kind === 'vaccine') return 'syringe';
  const named = NAME_ICONS.find(([pattern]) => pattern.test(item.name));
  if (named) return named[1];
  // Medicines and vitamins draw the capsule; other wellness products the wellness leaf (canvas map-pin).
  return CATEGORY_ICONS[item.category] ?? 'map-pin';
}

/** Articles (GET /api/home) are drawn as a page. */
export const ARTICLE_ICON: SkIconName = 'file-3';

export function listingTone(item: ArtListing): Tone {
  if (item.kind === 'lab') return 'positive';
  if (item.kind === 'consultation') return 'action';
  if (item.category === 'skin' || item.category === 'first-aid') return 'danger';
  if (item.category === 'vitamins' || item.category === 'medicines') return 'attention';
  if (item.category === 'ayurveda' || item.category === 'nutrition') return 'positive';
  return 'action';
}

/**
 * The shop's category grid (canvas ShopHome) and the search entry's popular
 * categories (SearchEntry). Each opens the catalogue filtered to that category;
 * "sleep" and "hygiene" are not catalogue categories yet, so they search by word
 * and show the honest empty state until something is listed.
 */
export interface ShopCategory {
  id: string;
  label: MessageKey;
  /** The shorter name under the shop's category tiles (canvas ShopHome). */
  short: MessageKey;
  meta: MessageKey;
  icon: SkIconName;
  tone: Tone;
  /** How the list is filtered: by the catalogue category, or by a search word. */
  filter: { category: string } | { query: string };
}

export const SHOP_CATEGORIES: readonly ShopCategory[] = [
  { id: 'vitamins', label: 'phone.cat.vitamins', short: 'phone.cat.vitaminsShort', meta: 'phone.cat.vitaminsMeta', icon: 'pill-2', tone: 'attention', filter: { category: 'vitamins' } },
  { id: 'skin', label: 'phone.cat.skin', short: 'phone.cat.skin', meta: 'phone.cat.skinMeta', icon: 'droplet-2', tone: 'danger', filter: { category: 'skin' } },
  { id: 'nutrition', label: 'phone.cat.nutrition', short: 'phone.cat.nutrition', meta: 'phone.cat.nutritionMeta', icon: 'fruit', tone: 'positive', filter: { category: 'nutrition' } },
  { id: 'devices', label: 'phone.cat.devices', short: 'phone.cat.devicesShort', meta: 'phone.cat.devicesMeta', icon: 'fridge', tone: 'action', filter: { category: 'devices' } },
  { id: 'ayurveda', label: 'phone.cat.ayurveda', short: 'phone.cat.ayurveda', meta: 'phone.cat.ayurvedaMeta', icon: 'leaf-2', tone: 'positive', filter: { category: 'ayurveda' } },
  { id: 'first-aid', label: 'phone.cat.firstAid', short: 'phone.cat.firstAid', meta: 'phone.cat.firstAidMeta', icon: 'first-aid-kit', tone: 'danger', filter: { category: 'first-aid' } },
  { id: 'sleep', label: 'phone.cat.sleep', short: 'phone.cat.sleep', meta: 'phone.cat.sleepMeta', icon: 'moon', tone: 'action', filter: { query: 'sleep' } },
  { id: 'hygiene', label: 'phone.cat.hygiene', short: 'phone.cat.hygiene', meta: 'phone.cat.hygieneMeta', icon: 'droplet-4', tone: 'action', filter: { query: 'hygiene' } },
];

/** The six the search entry shows (SearchEntry "Popular categories"); nutrition is drawn as the apple there. */
export const SEARCH_CATEGORIES: readonly ShopCategory[] = SHOP_CATEGORIES.slice(0, 6).map((c) => (c.id === 'nutrition' ? { ...c, icon: 'apple' } : c));

/** Catalogue categories that have a translated name (`shopweb.category.<id>`); anything else is the server's word. */
const NAMED_CATEGORIES = ['vitamins', 'skin', 'devices', 'nutrition', 'first-aid', 'ayurveda', 'medicines', 'labs', 'general-care',
  'diabetes', 'heart', 'stomach', 'liver', 'bone-joint', 'kidney', 'respiratory', 'eye', 'vaccines'] as const;
type NamedCategory = typeof NAMED_CATEGORIES[number];
const isNamed = (id: string): id is NamedCategory => (NAMED_CATEGORIES as readonly string[]).includes(id);

export function categoryName(t: (key: MessageKey) => string, id: string): string {
  return isNamed(id) ? t(`shopweb.category.${id}`) : id.replace(/-/g, ' ');
}
