import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

// Background jobs console. Only HTTP is mocked.
type Answer = () => Promise<unknown>;
const answers: Record<string, Answer> = {};
const apiRequest = vi.fn((path: string, _init?: RequestInit) => answers[path]?.() ?? new Promise(() => undefined));
vi.mock('../../../data/http', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../data/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));

import { ApiError } from '../../../data/http';
import { LanguageProvider, translate } from '../../../i18n';
import type { Lang } from '../../../i18n';
import { TelemetryConsole } from '../TelemetryConsole';

const job = {
  key: 'reminder_reconcile', name: 'Notification & reminder reconciliation', enabled: true, intervalSeconds: 45,
  lastRunAt: null, nextRunAt: null, lastStatus: 'SUCCESS', lastError: null,
};
const ok = (value: unknown): Answer => () => Promise.resolve(value);

beforeEach(() => {
  Object.keys(answers).forEach(key => delete answers[key]);
  apiRequest.mockClear();
  answers['/ops/jobs'] = ok({ jobs: [job] });
  answers['/ops/integration-health'] = ok({ summary: { checked_at: 0, interval_seconds: 7200, checks: [], overall: 'operational' } });
  answers['/ops/agent-eval'] = ok({ metrics: {} });
});

describe('Telemetry console jobs', () => {
  it('shows a sub-hour cadence in seconds, not "every 0h"', async () => {
    render(<TelemetryConsole />);
    expect(await screen.findByText(/every 45s/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/every 0h/);
  });

  it.each<Lang>(['en', 'te', 'hi'])('says the job is already running on 409 (%s)', async lang => {
    answers['/ops/jobs/reminder_reconcile/run'] = () => Promise.reject(new ApiError('This job is already running. Try again shortly.', 409));
    render(<LanguageProvider initial={lang}><TelemetryConsole /></LanguageProvider>);
    const name = translate(lang, 'admin.telemetry.runNowFor', { name: job.name });
    fireEvent.click(await screen.findByRole('button', { name }));
    expect(await screen.findByText(translate(lang, 'admin.jobs.alreadyRunning'))).toBeInTheDocument();
  });

  it('passes other failures through unchanged', async () => {
    answers['/ops/jobs/reminder_reconcile/run'] = () => Promise.reject(new ApiError('Unknown job.', 404));
    render(<TelemetryConsole />);
    fireEvent.click(await screen.findByRole('button', { name: `Run now: ${job.name}` }));
    expect(await screen.findByText('Unknown job.')).toBeInTheDocument();
    expect(screen.queryByText('Already running — try again in a moment.')).toBeNull();
  });
});
