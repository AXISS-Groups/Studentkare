import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '../../../data/services/http';

// A doctor edits a draft encounter note, then signs it. Only HTTP is mocked.
type Answer = unknown | ((init?: RequestInit) => unknown);
const answers: Record<string, Answer> = {};
const apiRequest = vi.fn((path: string, init?: RequestInit) => {
  if (!(path in answers)) return new Promise(() => undefined);
  const answer = answers[path];
  try {
    return Promise.resolve(typeof answer === 'function' ? (answer as (init?: RequestInit) => unknown)(init) : answer);
  } catch (error) {
    return Promise.reject(error);
  }
});
vi.mock('../../../data/services/http', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));

import { EncounterNotesPanel } from '../EncounterNotesPanel';

const draft = { id: 'enc_abc12345x', appointmentId: 'apt-1', status: 'DRAFT', subjective: 'Headache two days', objective: 'Afebrile', assessment: 'Tension headache', plan: 'Hydrate', createdAt: 1_790_000_000, signedAt: null };
const signedAt = 1_790_000_600;

let serverNote: typeof draft | (Omit<typeof draft, 'signedAt'> & { signedAt: number });

beforeEach(() => {
  const dialog = HTMLDialogElement.prototype as { showModal?: () => void; close?: () => void };
  dialog.showModal ??= vi.fn();
  dialog.close ??= vi.fn();
  Object.keys(answers).forEach(key => delete answers[key]);
  apiRequest.mockClear();
  serverNote = { ...draft };
  answers['/work/appointments'] = { items: [] };
  answers['/encounters'] = () => ({ items: [serverNote] });
});

const signedVersion = () => ({ ...draft, status: 'FINAL', signedAt });

describe('Encounter notes: edit, sign, read-only', () => {
  it('saves edits to a draft with PATCH', async () => {
    answers['/encounters/enc_abc12345x'] = (init?: RequestInit) => {
      serverNote = { ...serverNote, ...JSON.parse(String(init?.body)) };
      return { id: draft.id, status: 'DRAFT' };
    };
    render(<EncounterNotesPanel />);

    expect(await screen.findByText('Draft')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit draft encounter ENC_ABC1' }));
    const plan = screen.getByRole('textbox', { name: 'Plan', hidden: true });
    expect((plan as HTMLTextAreaElement).value).toBe('Hydrate');
    fireEvent.change(plan, { target: { value: 'Hydrate; review in 3 days' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes', hidden: true }));

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/encounters/enc_abc12345x', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ subjective: draft.subjective, objective: draft.objective, assessment: draft.assessment, plan: 'Hydrate; review in 3 days' }),
    })));
    expect(await screen.findByText('Draft saved.')).toBeTruthy();
    expect(await screen.findByText('Hydrate; review in 3 days')).toBeTruthy();
  });

  it('signs only after the confirm dialog, then shows the note as signed and read-only', async () => {
    answers['/encounters/enc_abc12345x/finalize'] = () => { serverNote = signedVersion(); return { id: draft.id, status: 'FINAL', signedAt }; };
    render(<EncounterNotesPanel />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sign encounter ENC_ABC1' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Sign this note?' });
    expect(within(dialog).getByText(/can’t be changed/)).toBeTruthy();
    expect(within(dialog).getByText(/student will be told/)).toBeTruthy();
    expect(apiRequest).not.toHaveBeenCalledWith('/encounters/enc_abc12345x/finalize', expect.anything());

    fireEvent.click(within(dialog).getByRole('button', { name: 'Sign note' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/encounters/enc_abc12345x/finalize', expect.objectContaining({ method: 'POST' })));

    expect(await screen.findByText('Note signed. The student will be notified.')).toBeTruthy();
    expect(await screen.findByText('Signed')).toBeTruthy();
    expect(screen.getByText(/^Signed .+ · Signed notes can’t be changed\.$/)).toBeTruthy();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryByRole('button', { name: /Edit draft/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Sign encounter/ })).toBeNull();
  });

  it('cancelling the confirm dialog signs nothing', async () => {
    render(<EncounterNotesPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Sign encounter ENC_ABC1' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(apiRequest.mock.calls.some(([path]) => path.endsWith('/finalize'))).toBe(false);
    expect(screen.getByText('Draft')).toBeTruthy();
  });

  it('when signing returns 409, refreshes and tells the doctor it was already signed', async () => {
    answers['/encounters/enc_abc12345x/finalize'] = () => { serverNote = signedVersion(); throw new ApiError('This note is already signed.', 409); };
    render(<EncounterNotesPanel />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sign encounter ENC_ABC1' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sign note' }));

    expect(await screen.findByText(/already signed, perhaps in another tab/)).toBeTruthy();
    expect(await screen.findByText('Signed')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Sign encounter/ })).toBeNull();
  });

  it('when saving returns 409, keeps the text visible, blocks saving and refreshes the list', async () => {
    answers['/encounters/enc_abc12345x'] = () => { serverNote = signedVersion(); throw new ApiError('A finalised note cannot be changed.', 409); };
    render(<EncounterNotesPanel />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit draft encounter ENC_ABC1' }));
    const plan = screen.getByRole('textbox', { name: 'Plan', hidden: true }) as HTMLTextAreaElement;
    fireEvent.change(plan, { target: { value: 'My unsaved plan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes', hidden: true }));

    expect(await screen.findByText(/already been signed, perhaps in another tab/)).toBeTruthy();
    expect(plan.value).toBe('My unsaved plan');
    expect(plan.readOnly).toBe(true);
    expect((screen.getByRole('button', { name: 'Save changes', hidden: true }) as HTMLButtonElement).disabled).toBe(true);
    await waitFor(() => expect(apiRequest.mock.calls.filter(([path]) => path === '/encounters').length).toBe(2));
  });

  it('keeps the draft and shows the error when signing fails for another reason', async () => {
    answers['/encounters/enc_abc12345x/finalize'] = () => { throw new ApiError('Cannot connect to the care service.', 0); };
    render(<EncounterNotesPanel />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sign encounter ENC_ABC1' }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sign note' }));

    expect(await within(dialog).findByText('Cannot connect to the care service.')).toBeTruthy();
    expect(screen.getByText('Draft')).toBeTruthy();
    expect(screen.queryByText('Note signed. The student will be notified.')).toBeNull();
  });

  it('shows a signed note read-only with its signed time', async () => {
    serverNote = signedVersion();
    render(<EncounterNotesPanel />);
    expect(await screen.findByText('Signed')).toBeTruthy();
    expect(screen.getByText(/Signed notes can’t be changed/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Edit draft/ })).toBeNull();
  });
});
