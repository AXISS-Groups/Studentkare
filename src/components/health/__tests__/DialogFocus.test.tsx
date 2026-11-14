import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationCenterModal } from '../NotificationCenterModal';
import { VideoConsultationDialog } from '../VideoConsultationDialog';
import { ProviderConsultationDialog } from '../ProviderConsultationDialog';
import { LabSlotPickerModal } from '../LabSlotPickerModal';
const server = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/data/services/http', () => ({ apiRequest: server.request }));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'adult-a' } }) }));
vi.mock('../consult/ConsultCallPanel', () => ({ ConsultCallPanel: () => <button>Join test call</button> }));

function Opener({ children }: { children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>Open</button>{open ? children(() => setOpen(false)) : null}</>;
}
beforeEach(() => { server.request.mockReset().mockResolvedValue({ status: 'NOT_STARTED', studentJoined: false, providerJoined: false, liveMedia: false, slots: [] }); });
describe('live workflow dialog focus', () => {
  it.each(['notifications', 'student', 'provider', 'lab'] as const)('%s contains focus, isolates the background and restores focus on Escape', async (kind) => {
    const { container } = render(<Opener>{(close) => kind === 'notifications'
      ? <NotificationCenterModal isOpen onClose={close} />
      : kind === 'student' ? <VideoConsultationDialog appointment={{ id: 'consult-a', slotStart: '2026-11-15T10:00:00Z' }} onClose={close} />
      : kind === 'provider' ? <ProviderConsultationDialog appointment={{ id: 'consult-a', customer: 'Test adult' }} onClose={close} />
      : <LabSlotPickerModal isOpen testName="Test lab" catalogItemId="lab-a" onClose={close} />}</Opener>);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    await act(async () => fireEvent.click(opener));
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
    // In-tree dialogs isolate siblings of their frame rather than their own controls.
    expect(opener).toHaveAttribute('inert');
    const controls = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
    controls[controls.length - 1]?.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    opener.focus();
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
    expect(opener).not.toHaveAttribute('inert');
    expect(container).not.toHaveAttribute('aria-hidden');
  });
  it.each(['student', 'provider'] as const)('%s cannot dismiss unknown or live media through Escape or the backdrop', async (kind) => {
    let resolve: ((state: unknown) => void) | undefined;
    server.request.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const close = vi.fn();
    render(kind === 'student' ? <VideoConsultationDialog appointment={{ id: 'consult-a', slotStart: '2026-11-15T10:00:00Z' }} onClose={close} /> : <ProviderConsultationDialog appointment={{ id: 'consult-a', customer: 'Test adult' }} onClose={close} />);
    const backdrop = screen.getByRole('dialog').parentElement;
    fireEvent.keyDown(document, { key: 'Escape' });
    if (backdrop) fireEvent.click(backdrop);
    expect(close).not.toHaveBeenCalled();
    await act(async () => resolve?.({ status: 'NOT_STARTED', studentJoined: false, providerJoined: false, liveMedia: true }));
    fireEvent.keyDown(document, { key: 'Escape' });
    if (backdrop) fireEvent.click(backdrop);
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(close).toHaveBeenCalledOnce();
  });
  it('a lab submission cannot be abandoned through Escape, backdrop, Close or the appointments link', async () => {
    const slot = { id: 'slot-a', slotStart: new Date(Date.now() + 3600000).toISOString(), slotEnd: new Date(Date.now() + 7200000).toISOString(), capacity: 1, booked: 0, available: 1 };
    server.request.mockResolvedValueOnce({ slots: [slot] }).mockImplementation(() => new Promise(() => undefined));
    const close = vi.fn();
    render(<LabSlotPickerModal isOpen testName="Test lab" catalogItemId="lab-a" onClose={close} />);
    await screen.findByRole('option', { name: /1 available/ });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: slot.id } });
    fireEvent.submit(screen.getByRole('combobox').closest('form') as HTMLFormElement);
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    if (dialog.parentElement) fireEvent.click(dialog.parentElement);
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /view.*appointments/i })).toBeDisabled();
    expect(close).not.toHaveBeenCalled();
  });
});
