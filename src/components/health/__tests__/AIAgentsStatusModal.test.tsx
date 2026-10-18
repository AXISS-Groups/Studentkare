import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

// Only HTTP is mocked.
type Answer = () => Promise<unknown>;
let answer: Answer = () => new Promise(() => undefined);
const apiRequest = vi.fn((_path: string, _init?: RequestInit) => answer());
vi.mock('../../../data/services/http', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));

import { ApiError } from '../../../data/services/http';
import { LanguageProvider, translate } from '../../../i18n';
import type { Lang } from '../../../i18n';
import { AIAgentsStatusModal } from '../AIAgentsStatusModal';

const INVENTED = /ACTIVE_ONLINE|LOOP_RUNNING|Phlebotomist|Rajesh|PTS|donors/;

beforeEach(() => {
  apiRequest.mockClear();
  answer = () => new Promise(() => undefined);
});

describe('AI agents status modal', () => {
  it.each<Lang>(['en', 'te', 'hi'])('shows an honest error with a retry when status cannot load (%s)', async lang => {
    answer = () => Promise.reject(new ApiError('Server error', 500));
    render(<LanguageProvider initial={lang}><AIAgentsStatusModal isOpen onClose={() => undefined} /></LanguageProvider>);
    expect(await screen.findByRole('alert')).toHaveTextContent(translate(lang, 'admin.agents.loadError'));
    expect(document.body.textContent).not.toMatch(INVENTED);

    answer = () => Promise.resolve({ agents: [{ key: 'reminder_reconcile', name: 'Notification & reminder reconciliation', status: 'OPERATIONAL', intervalSeconds: 45, lastRunAt: null, lastStatus: 'SUCCESS' }] });
    fireEvent.click(screen.getByRole('button', { name: translate(lang, 'common.tryAgain') }));
    expect(await screen.findByText('Notification & reminder reconciliation')).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(apiRequest.mock.calls.every(([path]) => path === '/agents/live-status')).toBe(true);
  });

  it('lists only the agents the server reports, with their real cadence', async () => {
    answer = () => Promise.resolve({ agents: [{ key: 'account_erasure', name: 'Erase accounts', status: 'SCHEDULED', intervalSeconds: 7200, lastRunAt: null, lastStatus: 'NEVER_RUN' }] });
    render(<AIAgentsStatusModal isOpen onClose={() => undefined} />);
    expect(await screen.findByText('Erase accounts')).toBeInTheDocument();
    expect(screen.getByText(/every 2h · last never/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(INVENTED);
  });

  it('shows an empty state, not invented agents, when none are scheduled', async () => {
    answer = () => Promise.resolve({ agents: [] });
    render(<AIAgentsStatusModal isOpen onClose={() => undefined} />);
    expect(await screen.findByText('No background agents are scheduled yet.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(INVENTED);
  });

  it('does not fetch while closed', () => {
    render(<AIAgentsStatusModal isOpen={false} onClose={() => undefined} />);
    expect(apiRequest).not.toHaveBeenCalled();
  });
});
