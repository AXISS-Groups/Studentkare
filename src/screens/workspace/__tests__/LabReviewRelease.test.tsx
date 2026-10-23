import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// A doctor reviews, approves and releases each lab report. Only HTTP is mocked.
const answers: Record<string, unknown> = {};
const apiRequest = vi.fn((path: string, _init?: RequestInit) =>
  path in answers ? Promise.resolve(answers[path]) : new Promise(() => undefined));
vi.mock('../../../data/services/http', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));

import { ClinicalReviewPanel } from '../ClinicalReviewPanel';

const empty = { items: [], total: 0 };

beforeEach(() => {
  // jsdom has no <dialog>.showModal(); the dialog's content is what is under test.
  const dialog = HTMLDialogElement.prototype as { showModal?: () => void; close?: () => void };
  dialog.showModal ??= vi.fn();
  dialog.close ??= vi.fn();
  Object.keys(answers).forEach(key => delete answers[key]);
  apiRequest.mockClear();
  answers['/work/critical-results'] = empty;
  answers['/work/substitutions'] = empty;
  answers['/work/lab-orders/awaiting-collection'] = empty;
});

describe('Lab reports waiting for review', () => {
  it('opens the held report and releases it only with a note for the student', async () => {
    answers['/work/lab-reviews'] = { items: [{ id: 'lab-7', testPanel: ['Electrolytes'], sampleId: 'S1', criticalFlag: true, criticalNote: 'Potassium 6.8', waitingSeconds: 120 }], total: 1 };
    answers['/work/lab-reviews/lab-7/release'] = { id: 'lab-7', status: 'REPORT_RELEASED' };
    render(<ClinicalReviewPanel />);

    const open = await screen.findByRole('link', { name: 'Open the report for Electrolytes' });
    expect(open.getAttribute('href')).toMatch(/\/work\/lab-reviews\/lab-7\/report$/);
    expect(screen.getByText(/Critical value: Potassium 6.8/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Review and release Electrolytes' }));
    const submit = screen.getByRole('button', { name: 'Release to the student', hidden: true });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByRole('textbox', { name: 'Note for the student', hidden: true }), { target: { value: 'High potassium — come in today.' } });
    fireEvent.click(submit);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/work/lab-reviews/lab-7/release',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ note: 'High potassium — come in today.' }) })));
  });

  it('says plainly when nothing is waiting', async () => {
    answers['/work/lab-reviews'] = empty;
    render(<ClinicalReviewPanel />);
    expect(await screen.findByText('No reports waiting')).toBeTruthy();
  });
});
