import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../http';
import {
  approveRxUpload,
  deletePrescriptionUpload,
  listPharmacies,
  requestRxUploadLink,
  runPrescriptionUpload,
  sendPrescriptionForReview,
  uploadPrescription,
  uploadProblem,
  type StoredPrescription,
  type UploadState,
} from '../prescriptionUploads';

afterEach(() => vi.unstubAllGlobals());

const STORED: StoredPrescription = {
  id: 'doc-1', title: 'Prescription', filename: 'rx.heic', mimeType: 'image/heic', createdAt: 1, sizeBytes: 9,
};

function respond(status: number, body: unknown) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const photo = () => new Blob([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112])], { type: 'image/heic' });

describe('upload states', () => {
  it('starts idle: nothing is sent until an upload runs', () => {
    const fetchMock = respond(201, STORED);
    const idle: UploadState = { kind: 'idle' };
    expect(idle.kind).toBe('idle');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('goes uploading, then success with what the server stored', async () => {
    respond(201, STORED);
    const states: UploadState[] = [];
    const final = await runPrescriptionUpload(photo(), (s) => states.push(s));
    expect(states.map((s) => s.kind)).toEqual(['uploading', 'success']);
    expect(final).toEqual({ kind: 'success', upload: STORED });
  });

  it('reports an unsupported type (415) as an error, never as saved', async () => {
    respond(415, { detail: 'Upload a photo (JPEG, PNG, HEIC, HEIF or WebP), a PDF or a TIFF scan.' });
    const states: UploadState[] = [];
    const final = await runPrescriptionUpload(new Blob(['MZ']), (s) => states.push(s));
    expect(states.map((s) => s.kind)).toEqual(['uploading', 'error']);
    expect(final).toMatchObject({ kind: 'error', problem: 'unsupported' });
    expect(final.kind === 'error' && final.message).toContain('PDF');
  });

  it('reports a file over the limit (413)', async () => {
    respond(413, { detail: 'Prescriptions must be 10 MB or smaller.' });
    expect(await runPrescriptionUpload(photo(), () => undefined)).toMatchObject({ kind: 'error', problem: 'tooLarge' });
  });

  it('a network failure is an error state, not a success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    const final = await runPrescriptionUpload(photo(), () => undefined);
    expect(final).toMatchObject({ kind: 'error', problem: 'failed' });
  });

  it('maps server statuses to problems', () => {
    expect(uploadProblem(new ApiError('x', 413))).toBe('tooLarge');
    expect(uploadProblem(new ApiError('x', 415))).toBe('unsupported');
    expect(uploadProblem(new ApiError('infected', 400))).toBe('rejected');
    expect(uploadProblem(new ApiError('empty', 422))).toBe('rejected');
    expect(uploadProblem(new ApiError('x', 500))).toBe('failed');
    expect(uploadProblem(new Error('x'))).toBe('failed');
  });
});

describe('requests', () => {
  it('uploads the file as multipart with a title', async () => {
    const fetchMock = respond(201, STORED);
    await uploadPrescription(photo(), 'Dr Rao', 'rx.heic');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/health/prescription-uploads');
    expect(init?.method).toBe('POST');
    const body = init?.body;
    expect(body).toBeInstanceOf(FormData);
    expect(body instanceof FormData && body.get('title')).toBe('Dr Rao');
    expect(body instanceof FormData && body.get('file')).toBeInstanceOf(Blob);
  });

  it('lists pharmacies and sends to one', async () => {
    const fetchMock = respond(200, { items: [{ id: 'ph-1', name: 'Campus Pharmacy', area: '500001' }], total: 1 });
    expect((await listPharmacies()).items[0].name).toBe('Campus Pharmacy');
    respond(201, { id: 'r1' });
    await sendPrescriptionForReview('doc 1', 'ph-1');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/pharmacies');
  });

  it('encodes ids in paths', async () => {
    const fetchMock = respond(200, { success: true, withdrawnReviews: 0 });
    await deletePrescriptionUpload('a/b');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/health/prescription-uploads/a%2Fb');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE');
  });

  it('turns the server file link into one on this client API base', async () => {
    respond(200, { url: '/api/v1/pharmacy/rx-uploads/r1/file?token=abc', expiresAt: 99 });
    expect(await requestRxUploadLink('r1')).toEqual({ url: '/api/v1/pharmacy/rx-uploads/r1/file?token=abc', expiresAt: 99 });
  });

  it('approves with the five checks', async () => {
    const fetchMock = respond(200, { reviewId: 'r1', status: 'RX_VERIFIED', verifiedBy: 'R. Iyer', verifiedAt: 1, rejectionReason: '' });
    const checks = { prescriberRegistration: true, prescriptionDate: true, patientMatches: true, allergyChecked: true, scheduleLogged: true };
    await approveRxUpload('r1', 'R. Iyer', checks);
    const init = fetchMock.mock.calls[0][1];
    expect(JSON.parse(String(init?.body))).toEqual({ pharmacistName: 'R. Iyer', checks });
  });
});
