import { apiRequest } from '@/data/http';

/** Opens the browser's file picker and uploads one PNG/JPEG to the return. Rejects if nothing was chosen or the upload fails. */
export function attachReturnPhoto(returnId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { reject(new Error('No file chosen')); return; }
      const form = new FormData();
      form.append('file', file);
      apiRequest(`/returns/${encodeURIComponent(returnId)}/photo`, { method: 'POST', body: form }).then(() => resolve(), reject);
    };
    input.click();
  });
}
