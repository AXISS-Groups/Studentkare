import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { LanguageProvider, translate } from '@/i18n';
import { CampusSosDesk } from '../CampusSosDesk';

vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'CAMPUS_ADMIN' } }) }));
vi.mock('@/core/storage/CrossPlatformStorage', () => ({ CrossPlatformStorage: { get: async () => '', set: async () => undefined } }));
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: async (path: string) => ({ items: path === '/ops/sos' ? [{
    id: 'synthetic-alert', status: 'ACTIVE', campus: 'Synthetic Campus', locationNote: null,
    createdAt: 1, acknowledgedAt: null, student: { name: 'Synthetic Student', contact: '', hostel: null },
    deliveries: [{ recipientKind: 'EMERGENCY_CONTACT', channel: 'WHATSAPP', recipient: 'Synthetic Contact', status: 'UNKNOWN', detail: '' }],
  }] : [] }),
}));

afterEach(cleanup);

describe('Campus SOS delivery outcomes', () => {
  it.each(['en', 'te', 'hi'] as const)('%s: shows an uncertain attempt without claiming delivery or failure', async (lang) => {
    render(<LanguageProvider initial={lang}><CampusSosDesk /></LanguageProvider>);
    const article = await screen.findByRole('article');
    const deliveries = within(article).getByRole('list', { name: translate(lang, 'campus.sos.whoAlerted') });
    expect(deliveries).toHaveTextContent(translate(lang, 'campus.sos.delivery.UNKNOWN'));
    expect(within(deliveries).queryByText(translate(lang, 'campus.sos.delivery.SENT'), { exact: true })).toBeNull();
    expect(within(deliveries).queryByText(translate(lang, 'campus.sos.delivery.FAILED'), { exact: true })).toBeNull();
  });
});
