import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '../../../data/http';

// A super admin assigns a doctor to a held lab report nobody can review. Only HTTP is mocked.
type Answer = () => Promise<unknown>;
const answers: Record<string, Answer> = {};
const apiRequest = vi.fn((path: string, _init?: RequestInit) => answers[path]?.() ?? new Promise(() => undefined));
vi.mock('../../../data/http', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../data/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));

import { LabReviewerAssignmentView } from '../../../features/admin/views/LabReviewerAssignmentView';

const QUEUE = '/work/lab-reviews';
const DOCTORS = '/ops/accounts?limit=200&offset=0&role=NMC_DOCTOR';
const queue = {
  items: [
    { id: 'lab-1', testPanel: ['Electrolytes'], criticalFlag: true, waitingSeconds: 7200 },
    { id: 'lab-2', testPanel: ['Lipid profile', 'HbA1c'], criticalFlag: false, waitingSeconds: 300 },
  ],
  total: 2,
};
const doctors = {
  items: [
    { id: 'doc-1', fullName: 'Dr. Asha Rao', identifier: 'asha@example.test', role: 'NMC_DOCTOR', active: true },
    { id: 'doc-2', fullName: 'Dr. Retired', identifier: 'old@example.test', role: 'NMC_DOCTOR', active: false },
  ],
  total: 2,
};
const ok = (value: unknown): Answer => () => Promise.resolve(value);

beforeEach(() => {
  // jsdom has no <dialog>.showModal(); opening it is enough for its content to be reachable.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute('open'); };
  Object.keys(answers).forEach(key => delete answers[key]);
  apiRequest.mockClear();
  answers[QUEUE] = ok(queue);
  answers[DOCTORS] = ok(doctors);
});

const openAssign = async (tests: string) => {
  render(<LabReviewerAssignmentView />);
  fireEvent.click(await screen.findByRole('button', { name: `Assign a doctor to review ${tests}` }));
  return screen.findByRole('combobox', { name: 'Doctor' });
};

describe('Lab report reviewers', () => {
  it('lists held reports critical first with the wait, and never a result', async () => {
    render(<LabReviewerAssignmentView />);
    const rows = await screen.findAllByRole('row');
    expect(rows.slice(1).map(row => within(row).getAllByRole('cell')[0].textContent)).toEqual(['Electrolytes', 'Lipid profile, HbA1c']);
    expect(rows[1]).toHaveTextContent('Critical');
    expect(rows[1]).toHaveTextContent('2 hr');
    expect(screen.getByText('Critical waiting: 1')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledWith(QUEUE, expect.anything());
    // The admin never opens a held report.
    expect(apiRequest.mock.calls.some(([path]) => path.includes('/report'))).toBe(false);
  });

  it('assigns an active doctor, removes the row and says who was notified', async () => {
    answers['/work/lab-reviews/lab-1/assign'] = ok({ id: 'lab-1', reviewerId: 'doc-1' });
    const select = await openAssign('Electrolytes');
    // Inactive doctors are not offered, and no contact detail is shown.
    expect(within(select).getAllByRole('option').map(option => option.textContent)).toEqual(['Choose a doctor', 'Dr. Asha Rao']);
    expect(document.body.textContent).not.toContain('asha@example.test');
    expect(screen.getByRole('button', { name: 'Assign' })).toBeDisabled();
    fireEvent.change(select, { target: { value: 'doc-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/work/lab-reviews/lab-1/assign', expect.objectContaining({ method: 'POST', body: JSON.stringify({ doctorId: 'doc-1' }) })));
    expect(await screen.findByRole('status')).toHaveTextContent('Dr. Asha Rao will review Electrolytes and has been notified.');
    expect(screen.queryByRole('button', { name: 'Assign a doctor to review Electrolytes' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Assign a doctor to review Lipid profile, HbA1c' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Doctor' })).toBeNull();
  });

  it('keeps the row and explains a 422 (the doctor is not active), then reloads the doctors', async () => {
    answers['/work/lab-reviews/lab-1/assign'] = () => Promise.reject(new ApiError('Assign an active doctor account.', 422));
    const select = await openAssign('Electrolytes');
    fireEvent.change(select, { target: { value: 'doc-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That doctor account is not active any more. Choose another doctor.');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: 'Assign a doctor to review Electrolytes' })).toBeInTheDocument();
    await waitFor(() => expect(apiRequest.mock.calls.filter(([path]) => path === DOCTORS)).toHaveLength(2));
  });

  it('shows an empty state when every held report has a reviewer', async () => {
    answers[QUEUE] = ok({ items: [], total: 0 });
    render(<LabReviewerAssignmentView />);
    expect(await screen.findByText('Every held report has a reviewer.')).toBeInTheDocument();
    expect(screen.queryByText(/Critical waiting/)).toBeNull();
  });

  it('shows an error with a retry, and unknown counts as —', async () => {
    let fail = true;
    answers[QUEUE] = () => fail ? Promise.reject(new ApiError('Server error', 500)) : Promise.resolve(queue);
    render(<LabReviewerAssignmentView />);
    expect(await screen.findByText('Reports waiting for a reviewer could not be loaded.')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Reports waiting for a reviewer' })).getAllByText('—')).toHaveLength(3);
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Assign a doctor to review Electrolytes' })).toBeInTheDocument();
  });
});
