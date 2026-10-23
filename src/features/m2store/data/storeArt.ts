import type { SkIconName } from '@/design-system/icons';
import type { ServiceHue } from '@/design-system/m2';
import type { MessageKey } from '@/i18n';

/**
 * How the Mobile 2.0 store boards draw catalogue listings and lab packages,
 * and where their concern / category tiles lead. Decoration only: the
 * catalogue carries no art, so a listing's icon and tint follow its category
 * and a few words of its name. It never says anything about the person
 * looking (Rule L).
 */
export interface Art { icon: SkIconName; hue: ServiceHue }

const PRODUCT_NAME_ART: ReadonlyArray<readonly [RegExp, Art]> = [
  [/\bors\b|electrolyte|rehydrat/i, { icon: 'droplet', hue: 'blue' }],
  [/sunscreen|\bspf\b/i, { icon: 'sun', hue: 'rose' }],
  [/vitamin|multivit|\bd3\b|\bb12\b|capsule/i, { icon: 'bottle', hue: 'amber' }],
];

const PRODUCT_CATEGORY_ART: Readonly<Record<string, Art>> = {
  medicines: { icon: 'pill-alt', hue: 'teal' },
  vitamins: { icon: 'bottle', hue: 'amber' },
  skin: { icon: 'bottle', hue: 'rose' },
  devices: { icon: 'monitor', hue: 'sky' },
  ayurveda: { icon: 'sprout', hue: 'green' },
  'first-aid': { icon: 'first-aid-kit', hue: 'green' },
  sleep: { icon: 'moon-2', hue: 'violet' },
};

const PRODUCT_DEFAULT: Art = { icon: 'pill-alt', hue: 'teal' };

export function productArt(item: { name: string; category: string }): Art {
  return PRODUCT_NAME_ART.find(([pattern]) => pattern.test(item.name))?.[1] ?? PRODUCT_CATEGORY_ART[item.category] ?? PRODUCT_DEFAULT;
}

/** Lab packages by the words in their name (most specific first). */
const LAB_NAME_ART: ReadonlyArray<readonly [RegExp, Art]> = [
  [/thyroid|\btsh\b/i, { icon: 'thyroid', hue: 'violet' }],
  [/lipid|cholesterol/i, { icon: 'trend-zigzag', hue: 'sky' }],
  [/iron|ha?emo|anaemi|anemi|ferritin/i, { icon: 'heart-3', hue: 'rose' }],
  [/pcos|hormone/i, { icon: 'droplet', hue: 'rose' }],
  [/diabet|sugar|hba1c|glucose/i, { icon: 'droplet', hue: 'blue' }],
  [/vitamin/i, { icon: 'bottle', hue: 'amber' }],
  [/fever|dengue|malaria|typhoid/i, { icon: 'thermometer', hue: 'orange' }],
  [/allerg/i, { icon: 'sprout', hue: 'green' }],
  [/muscle|protein|creatin/i, { icon: 'dumbbell', hue: 'teal' }],
  [/sport|fitness/i, { icon: 'trend-arrow', hue: 'indigo' }],
  [/women/i, { icon: 'female', hue: 'rose' }],
  [/\bmen\b|\bmen['’]s/i, { icon: 'male', hue: 'blue' }],
];

const LAB_DEFAULT: Art = { icon: 'person-badge', hue: 'violet' };

export function labArt(name: string): Art {
  return LAB_NAME_ART.find(([pattern]) => pattern.test(name))?.[1] ?? LAB_DEFAULT;
}

/** Where a tile opens the shop: a catalogue category, or a search by word for what is not a category yet. */
export type ShopFilter = { category: string } | { query: string };

export interface StoreTile {
  key: string;
  label: MessageKey;
  icon: SkIconName;
  hue: ServiceHue;
  filter: ShopFilter;
  neutral?: boolean;
}

/** M2Home "Shop by concern" (canvas order and drawings). */
export const HOME_CONCERNS: readonly StoreTile[] = [
  { key: 'fever', label: 'm2.home.concern.fever', icon: 'thermo', hue: 'orange', filter: { query: 'fever' } },
  { key: 'skin', label: 'm2.home.concern.skin', icon: 'bottle', hue: 'rose', filter: { category: 'skin' } },
  { key: 'sleep', label: 'm2.home.concern.sleep', icon: 'moon-2', hue: 'violet', filter: { query: 'sleep' } },
  { key: 'sports', label: 'm2.home.concern.sports', icon: 'trend-arrow', hue: 'blue', filter: { query: 'sports' } },
  { key: 'eye', label: 'm2.home.concern.eye', icon: 'eye', hue: 'teal', filter: { query: 'eye' } },
  { key: 'sexual', label: 'm2.home.concern.sexual', icon: 'heart-3', hue: 'rose', filter: { query: 'sexual' } },
  { key: 'vitamins', label: 'm2.home.concern.vitamins', icon: 'med-bottle', hue: 'amber', filter: { category: 'vitamins' } },
  { key: 'firstAid', label: 'm2.home.concern.firstAid', icon: 'first-aid-kit', hue: 'green', filter: { category: 'first-aid' } },
];

/** M2Medicines "Categories" (canvas order and drawings). */
export const MEDICINE_CATEGORIES: readonly StoreTile[] = [
  { key: 'fever', label: 'm2.med.cat.fever', icon: 'thermometer', hue: 'orange', filter: { query: 'fever' } },
  { key: 'cold', label: 'm2.med.cat.cold', icon: 'wind', hue: 'sky', filter: { query: 'cough' } },
  { key: 'stomach', label: 'm2.med.cat.stomach', icon: 'stomach', hue: 'amber', filter: { query: 'stomach' } },
  { key: 'skin', label: 'm2.med.cat.skin', icon: 'bottle', hue: 'rose', filter: { category: 'skin' } },
  { key: 'vitamins', label: 'm2.med.cat.vitamins', icon: 'bottle', hue: 'amber', filter: { category: 'vitamins' } },
  { key: 'diabetes', label: 'm2.med.cat.diabetes', icon: 'droplet', hue: 'blue', filter: { query: 'diabetes' } },
  { key: 'eye', label: 'm2.med.cat.eye', icon: 'eye', hue: 'teal', filter: { query: 'eye' } },
  { key: 'sexual', label: 'm2.med.cat.sexual', icon: 'heart-3', hue: 'rose', filter: { query: 'sexual' } },
  { key: 'sports', label: 'm2.med.cat.sports', icon: 'trend-arrow', hue: 'indigo', filter: { query: 'sports' } },
  { key: 'devices', label: 'm2.med.cat.devices', icon: 'monitor', hue: 'sky', filter: { category: 'devices' }, neutral: true },
  { key: 'ayurveda', label: 'm2.med.cat.ayurveda', icon: 'sprout', hue: 'green', filter: { category: 'ayurveda' } },
  { key: 'firstAid', label: 'm2.med.cat.firstAid', icon: 'first-aid-kit', hue: 'green', filter: { category: 'first-aid' } },
];
