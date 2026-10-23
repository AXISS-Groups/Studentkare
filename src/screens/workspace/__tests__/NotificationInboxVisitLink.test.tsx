import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

// The "notes signed" notification opens that visit summary. Only HTTP and the router are mocked.
const routerNavigate = vi.fn();
vi.mock('@/core/navigation', async importOriginal => ({
  ...(await importOriginal<typeof import('@/core/navigation')>()),
  useNavigate: () => routerNavigate,
}));
vi.mock('../../../data/services/http', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../data/services/http')>()),
  apiRequest: (path: string) => path === '/notifications'
    ? Promise.resolve({ items: [
      { id: 'evt_1', eventType: 'ENCOUNTER_FINALIZED', payload: { summary: 'Your consultation notes have been finalised.', resourceType: 'encounter', resourceId: 'enc_42' }, status: 'SENT', createdAt: 1_790_000_000, sentAt: 1_790_000_001, readAt: null },
      { id: 'evt_2', eventType: 'appointment_reminder', payload: { resourceType: 'appointment', resourceId: 'apt_1' }, status: 'SENT', createdAt: 1_790_000_000, sentAt: 1_790_000_001, readAt: null },
    ] })
    : new Promise(() => undefined),
}));

import { NotificationInboxPanel } from '../NotificationInboxPanel';

describe('Notification inbox: visit summary link', () => {
  it('links only the signed-notes notification to its visit summary', async () => {
    render(<NotificationInboxPanel />);
    expect(await screen.findByText('Visit notes signed')).toBeInTheDocument();
    expect(screen.getByText('Your consultation notes have been finalised.')).toBeInTheDocument();
    const links = screen.getAllByRole('button', { name: 'Read your visit summary' });
    expect(links).toHaveLength(1);
    fireEvent.click(links[0]);
    expect(routerNavigate).toHaveBeenCalledWith('/visit-summaries?id=enc_42');
  });
});
