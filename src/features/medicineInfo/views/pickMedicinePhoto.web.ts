import type { PickedPhoto } from '../data/MedicineInfoRepository';

/**
 * The browser's file picker for one JPEG or PNG of a medicine strip or box. With
 * `camera`, phones open the back camera (`capture="environment"`). The photo is
 * held in memory and sent once to be read; it is never stored (plan
 * tier1-medicine-info-2026-10-22, D-MI-10). Resolves null when nothing was chosen.
 */
export function pickMedicinePhoto(camera: boolean): Promise<PickedPhoto | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png';
    if (camera) input.setAttribute('capture', 'environment');
    input.onchange = () => {
      const file = input.files?.[0];
      resolve(file ? { append: (form) => form.append('file', file) } : null);
    };
    input.click();
  });
}
