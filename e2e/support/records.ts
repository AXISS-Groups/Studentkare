import type { Page } from '@playwright/test';

export interface UploadResult {
  status: number;
  id: string;
  kind: string;
  duplicate: boolean;
}

/**
 * Stores a small PDF in the signed-in student's vault through the real upload
 * endpoint, with the session's own CSRF token. The three-step "Add a lab
 * report" screen ends in typed clinical values and has its own unit tests;
 * the journeys here only need a record to exist.
 */
export async function uploadRecord(page: Page, title: string, fileName: string, category = 'LAB'): Promise<UploadResult> {
  return page.evaluate(async ({ title, fileName, category }) => {
    const session = await (await fetch('/api/auth/session')).json();
    const form = new FormData();
    form.append('title', title);
    form.append('category', category);
    const bytes = new TextEncoder().encode(`%PDF-1.4\n1 0 obj\n<< /Title (${title}) >>\nendobj\ntrailer\n<<>>\n%%EOF`);
    form.append('file', new File([bytes], fileName, { type: 'application/pdf' }));
    const response = await fetch('/api/health/documents', { method: 'POST', body: form, headers: { 'x-csrf-token': session.csrfToken ?? '' } });
    const body = await response.json().catch(() => ({}));
    return { status: response.status, id: body.id ?? '', kind: body.kind ?? '', duplicate: Boolean(body.duplicate) };
  }, { title, fileName, category });
}

/** What the server answers when this browser's session asks for someone's record. */
export async function probeRecord(page: Page, documentId: string): Promise<{ file: number; move: number; remove: number; listed: boolean }> {
  return page.evaluate(async (id) => {
    const session = await (await fetch('/api/auth/session')).json();
    const csrf = { 'x-csrf-token': session.csrfToken ?? '' };
    const list = await fetch('/api/health/documents');
    const items: { id: string }[] = list.ok ? (await list.json()).items ?? [] : [];
    const file = await fetch(`/api/health/documents/${id}/file`);
    const move = await fetch(`/api/health/documents/${id}/kind`, { method: 'PATCH', headers: { ...csrf, 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'urine' }) });
    const remove = await fetch(`/api/health/documents/${id}`, { method: 'DELETE', headers: csrf });
    return { file: file.status, move: move.status, remove: remove.status, listed: items.some(item => item.id === id) };
  }, documentId);
}
