import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../../theme/theme';
import { ApiError } from '../../../data/http';
import { LanguageProvider } from '../../../i18n';

// Integrations shows only what the server has stored: nothing unset is shown as a
// default, as "connected", or as "all services real-time". Only HTTP is mocked.
// One answer for every request in a test: a value, or an error the request rejects with.
let answer: () => Promise<unknown> = () => new Promise(() => undefined);
vi.mock('../../../data/http', async importOriginal => ({ ...(await importOriginal<typeof import('../../../data/http')>()), apiRequest: () => answer() }));

import { IntegrationsSettingsModule } from '../IntegrationsSettingsModule';

const renderModule = (lang: 'en' | 'te' = 'en') => render(<LanguageProvider initial={lang}><ThemeProvider><IntegrationsSettingsModule /></ThemeProvider></LanguageProvider>);

beforeEach(() => { answer = () => new Promise(() => undefined); });

describe('Integrations settings', () => {
  it('never claims an unset service is connected or names a default model', async () => {
    answer = () => Promise.resolve({ integrations: { posthog: { host: '' }, firebase: { project_id: '' }, llm: { provider: '', model: '' }, otp: {} } });
    renderModule();
    expect(await screen.findByText('Platform Integrations & Brand Settings')).toBeInTheDocument();
    expect(screen.queryByText(/All Services Real-Time/i)).toBeNull();
    expect(screen.queryByText('Analytics connected')).toBeNull();
    expect(screen.queryByText('FCM configured')).toBeNull();
    expect(screen.queryByText(/gpt-4o-mini/)).toBeNull();
    expect(screen.getByText('Provider: not set · Model: not set')).toBeInTheDocument();
    expect(screen.getByText('Channel: not set · TTL: not set')).toBeInTheDocument();
    expect(screen.getAllByText('Not configured').length).toBeGreaterThanOrEqual(2);
  });

  it('fails closed on a network error without claiming it is an access problem', async () => {
    answer = () => Promise.reject(new ApiError('Cannot connect to the care service.', 0));
    renderModule();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load integrations');
    expect(alert).not.toHaveTextContent('Super-admin access is required.');
    expect(screen.queryByText('Platform Integrations & Brand Settings')).toBeNull();
  });

  it('says access is restricted when the server refuses', async () => {
    answer = () => Promise.reject(new ApiError('Forbidden', 403));
    renderModule();
    expect(await screen.findByRole('alert')).toHaveTextContent('Access restricted');
  });

  it('reads in Telugu', async () => {
    answer = () => Promise.resolve({ integrations: {} });
    renderModule('te');
    expect(await screen.findByText('ప్లాట్‌ఫామ్ ఇంటిగ్రేషన్లు & బ్రాండ్ సెట్టింగ్స్')).toBeInTheDocument();
  });
});
