import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// The lab files a report as a file, held for a doctor; it never releases it.
const answers: Record<string, unknown> = {};
const apiRequest = vi.fn((path: string, _init?: RequestInit) =>
  path in answers ? Promise.resolve(answers[path]) : new Promise(() => undefined));
vi.mock('../../../data/http', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../data/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));

import { LabQueuePanel } from '../FulfilmentQueuePanel';

const order = (over: Record<string, unknown> = {}) => ({
  id: 'lab-12345678', testPanel: ['CBC'], collectionMode: 'WALK_IN', slotStart: '', fastingRequired: false,
  collectorName: 'P. Rao', sampleId: 'S1', status: 'IN_ANALYSIS', criticalFlag: false, rejectionReason: '',
  createdAt: 1790000000, nextStates: ['REPORT_READY', 'SAMPLE_REJECTED'], ...over,
});

beforeEach(() => {
  const dialog = HTMLDialogElement.prototype as { showModal?: () => void; close?: () => void };
  dialog.showModal ??= vi.fn();
  dialog.close ??= vi.fn();
  Object.keys(answers).forEach(key => delete answers[key]);
  apiRequest.mockClear();
});

describe('Lab desk: filing a report', () => {
  it('uploads the file with the critical flag and note', async () => {
    answers['/work/lab-orders?limit=50'] = { items: [order()], total: 1, critical: 0 };
    answers['/work/lab-orders/lab-12345678/report'] = order({ status: 'REPORT_READY' });
    render(<LabQueuePanel />);

    fireEvent.click(await screen.findByRole('button', { name: /File the report/ }));
    const file = new File(['%PDF-1.4'], 'cbc.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Report file', { selector: 'input' }), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'This report has a critical value', hidden: true }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Which value is critical', hidden: true }), { target: { value: 'Hb 5.1 g/dL' } });
    const send = screen.getByRole('button', { name: 'Send to a doctor for review', hidden: true }) as HTMLButtonElement;
    expect(send.disabled).toBe(false);
    // jsdom can't fill a required file input, so submit the form directly.
    fireEvent.submit(send.closest('form') as HTMLFormElement);

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/work/lab-orders/lab-12345678/report', expect.objectContaining({ method: 'POST' })));
    const body = apiRequest.mock.calls.find(([path]) => path.endsWith('/report'))?.[1]?.body as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('criticalFlag')).toBe('true');
    expect(body.get('criticalNote')).toBe('Hb 5.1 g/dL');
  });

  it('offers no release button once filed: the doctor releases it', async () => {
    answers['/work/lab-orders?limit=50'] = { items: [order({ status: 'REPORT_READY', nextStates: [] })], total: 1, critical: 0 };
    render(<LabQueuePanel />);
    expect(await screen.findByText(/With a doctor for review/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Report released/i })).toBeNull();
  });
});
