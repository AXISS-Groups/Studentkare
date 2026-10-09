import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock('@/data/http', () => ({ apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init) }));
vi.mock('@/core/storage/CrossPlatformStorage', () => ({ CrossPlatformStorage: { remove: async () => undefined } }));

import { NotificationViewModel } from '../../viewmodel/NotificationViewModel';
import { NotificationNativeView } from '../NotificationNativeView';

async function vmWith(impl: (path: string) => unknown) {
  apiRequest.mockReset();
  apiRequest.mockImplementation(async (path: string) => impl(path));
  const vm = new NotificationViewModel();
  await vi.waitFor(() => expect(vm.loading).toBe(false));
  return vm;
}

describe('NotificationNativeView', () => {
  it('shows an error with a retry when the inbox cannot load', async () => {
    const vm = await vmWith(() => { throw new Error('offline'); });
    render(<NotificationNativeView viewModel={vm} />);
    expect(screen.getByText("Couldn't load notifications")).toBeInTheDocument();
  });

  it('shows an empty state for an empty inbox', async () => {
    const vm = await vmWith(() => ({ items: [] }));
    render(<NotificationNativeView viewModel={vm} />);
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('labels the mark-as-read control for each notification', async () => {
    const vm = await vmWith((path) => (path === '/notifications'
      ? { items: [{ id: 'e1', eventType: 'appointment_reminder', payload: { summary: 'Tomorrow 9am' }, status: 'SENT', createdAt: 1, sentAt: null, readAt: null }] }
      : { success: true }));
    render(<NotificationNativeView viewModel={vm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark "appointment reminder" as read' }));
    await vi.waitFor(() => expect(screen.getAllByText('Read').length).toBeGreaterThan(0));
  });
});
