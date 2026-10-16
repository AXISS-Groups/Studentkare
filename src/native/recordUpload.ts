import { apiRequest } from '@/data/services/http';
import type { RecordDraft } from '@/features/vault/viewmodel/RecordCaptureViewModel';

/**
 * POST /api/health/documents from the phone. React Native's FormData sends a
 * local file given its uri, name and type; the server checks the bytes are a
 * real JPEG, scans them and stores them.
 */
export async function uploadRecordPhoto({ title, category, photo }: RecordDraft): Promise<void> {
  const form = new FormData();
  form.append('title', title);
  form.append('category', category);
  form.append('file', { uri: photo.uri, name: 'record.jpg', type: 'image/jpeg' });
  await apiRequest<{ id: string }>('/health/documents', { method: 'POST', body: form });
}
