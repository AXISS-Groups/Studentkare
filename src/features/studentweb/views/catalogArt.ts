import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import type { SkIconName } from '@/design-system/icons';

/**
 * The drawing on a catalogue card. The canvas draws illustrative packaging
 * (never a real product photo it does not have) from the pack wording; these
 * are the drawings each board uses. Labelled "Illustrative packaging" wherever
 * it is shown.
 */
type Art = Pick<LiveCatalogItem, 'kind' | 'pack' | 'category'>;

const isJar = (pack: string) => /\bjar\b|\btub\b/i.test(pack);
const isTube = (pack: string) => /tube|lotion|cream|gel/i.test(pack);
const isBottle = (pack: string) => /bottle|vial|syrup|capsule|softgel|tablet/i.test(pack);

/** WebShop and search cards. */
function shopArt(item: Art): SkIconName {
  if (item.kind === 'lab' || item.kind === 'consultation') return 'file-text-2';
  if (item.kind === 'vaccine') return 'pipette';
  if (isJar(item.pack)) return 'jar';
  if (isTube(item.pack)) return 'cup';
  return 'bottle-2';
}

/** WebReorder cards (bought shop items). */
export function reorderArt(item: Pick<LiveCatalogItem, 'pack' | 'category'> | undefined, name: string): SkIconName {
  if (item?.category === 'devices' || /thermometer|monitor|oximeter/i.test(name)) return 'thermometer';
  if (item && isJar(item.pack)) return 'jar-2';
  if (item && isTube(item.pack)) return 'bottle-pump';
  return 'glass';
}

/** WebProduct hero and WebCheckout cart thumbnails. */
function productArt(item: Art): SkIconName {
  if (item.category === 'ayurveda' || item.category === 'nutrition' || item.category === 'vitamins') return 'leaf-3';
  if (item.category === 'skin' || isTube(item.pack)) return 'droplet-2';
  if (isBottle(item.pack)) return 'leaf-2';
  return shopArt(item);
}

/** Checkout thumbnails use the lighter line set of the WebCheckout board. */
function checkoutArt(item: Art): SkIconName {
  return item.category === 'skin' || isTube(item.pack) ? 'droplet-2' : 'leaf-2';
}
