import type { PickedReport } from '../viewmodel/ReportUploadViewModel';

/** What each source on the Add step accepts (the server checks the bytes again). */
export const REPORT_ACCEPT = { photo: 'image/jpeg,image/png', pdf: 'application/pdf' } as const;

/**
 * Opens the browser's file picker for a lab report: a photo (on a phone the
 * camera is offered first, `capture`) or a PDF. Nothing is read or sent here;
 * the file is held until the view-model uploads it. Resolves null when nothing
 * was chosen.
 */
export function pickReportFile(kind: keyof typeof REPORT_ACCEPT): Promise<PickedReport | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = REPORT_ACCEPT[kind];
    if (kind === 'photo') input.setAttribute('capture', 'environment');
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      resolve({ name: file.name, append: (form) => form.append('file', file) });
    };
    input.click();
  });
}
