import { apiRequest } from '@/data/services/http';
import type { PickedPhoto } from './ReturnRequestView';

/**
 * Opens the browser's file picker for one PNG or JPEG. The photo is held in
 * memory until the return exists, then uploaded to it (POST
 * /api/returns/{id}/photo). Resolves null when nothing was chosen.
 */
export function pickReturnPhoto(): Promise<PickedPhoto | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      resolve({
        name: file.name,
        upload: (returnId: string) => {
          const form = new FormData();
          form.append('file', file);
          return apiRequest(`/returns/${encodeURIComponent(returnId)}/photo`, { method: 'POST', body: form }).then(() => undefined);
        },
      });
    };
    input.click();
  });
}
