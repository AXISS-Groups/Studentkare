import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as http from '@/data/services/http';
import { VideoConsultationDialog } from '../VideoConsultationDialog';
import { ProviderConsultationDialog } from '../ProviderConsultationDialog';
import { NotificationCenterModal } from '../NotificationCenterModal';

vi.mock('@/data/services/http', () => ({ apiRequest: vi.fn() }));
const mocked = vi.mocked(http.apiRequest);

afterEach(() => { mocked.mockReset(); });

describe('consultation dialogs: no video service behind the app', () => {
  it('student dialog never asks for the camera and says no call happens here', async () => {
    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    mocked.mockResolvedValue({ status: 'WAITING', studentJoined: true, providerJoined: false, liveMedia: false });

    render(<VideoConsultationDialog appointment={{ id: 'a1', slotStart: '2026-10-12T10:00:00Z' }} onClose={() => undefined} />);

    expect(screen.getByText('No call can be started from the app')).toBeInTheDocument();
    expect(screen.queryByText(/waiting room|in progress|live media|join/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /check in/i }));
    await waitFor(() => expect(screen.getByText('You have checked in.')).toBeInTheDocument());
    expect(mocked).toHaveBeenCalledWith('/consultation/a1/join', { method: 'POST' });
    expect(screen.getByText('Your provider has not started yet.')).toBeInTheDocument();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('provider dialog cannot start before the student checks in, and claims no live media', async () => {
    mocked.mockResolvedValue({ status: 'NOT_STARTED', studentJoined: false, providerJoined: false, liveMedia: false });

    render(<ProviderConsultationDialog appointment={{ id: 'a1', customer: 'Asha' }} onClose={() => undefined} />);

    await waitFor(() => expect(screen.getByText('Student has not checked in yet')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Mark consultation as started' })).toBeDisabled();
    expect(screen.queryByText(/live media|camera|microphone/i)).toBeNull();
  });
});

describe('notification centre', () => {
  it('points to the inbox instead of claiming there is nothing new', () => {
    render(<NotificationCenterModal isOpen onClose={() => undefined} />);
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open notifications' })).toBeInTheDocument();
    expect(screen.queryByText(/all caught up|no active notifications/i)).toBeNull();
  });
});
