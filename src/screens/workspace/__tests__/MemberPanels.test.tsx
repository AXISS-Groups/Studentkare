import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { apiRequest } from '@/data/services/http';
import { LanguageProvider } from '@/i18n';
import { memberEn, memberHi, memberTe } from '@/i18n/areas/member';
import { InsurancePanel, IntegrationsPanel, RecordsPanel } from '../MemberPanels';
import { DigitalIdPanel } from '../DigitalIdPanel';

vi.mock('@/data/services/http', () => ({ apiRequest: vi.fn(), apiFileUrl: (id: string) => `/files/${id}` }));
vi.mock('@/components/health/HITLApprovalConsole', () => ({ HITLApprovalConsole: () => null }));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'STUDENT' } }) }));
const mocked = vi.mocked(apiRequest);

type Responses = Record<string, unknown>;
function serve(responses: Responses) {
  mocked.mockImplementation((path?: string) => {
    const key = Object.keys(responses).sort((a, b) => b.length - a.length).find(prefix => String(path).startsWith(prefix));
    return key ? Promise.resolve(responses[key]) : Promise.reject(new Error(`unexpected ${path}`));
  });
}

// A block body: a function returned from beforeEach is run as its cleanup.
beforeEach(() => { mocked.mockReset(); });

describe('IntegrationsPanel', () => {
  it('describes each integration by the state the server reports, not a fixed "not connected" line', async () => {
    serve({ '/health': { status: 'ok', persistent: true, integrations: { otpChannels: [], payments: true, insurer: false, deviceSync: false, prescriptionReview: false } } });
    render(<IntegrationsPanel />);
    expect(await screen.findByText(memberEn['member.integrations.paymentsOn'])).toBeTruthy();
    expect(screen.queryByText(memberEn['member.integrations.paymentsOff'])).toBeNull();
    expect(screen.getByText(memberEn['member.integrations.insurerOff'])).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/active AI agents/i);
  });
});

describe('InsurancePanel', () => {
  it('says there are no benefit summaries when the directory is empty, instead of "loading" forever', async () => {
    serve({ '/health/policies': { items: [] }, '/insurance/benefits': { items: [] }, '/insurance/claims': { items: [] } });
    render(<InsurancePanel />);
    expect(await screen.findByText(memberEn['member.insurance.benefitsEmptyTitle'])).toBeTruthy();
    expect(screen.queryByText(/Benefit directory is loading/)).toBeNull();
  });

  it('never says a claim reached the insurer', () => {
    for (const text of [memberEn['member.insurance.claimSubmitted'], memberEn['member.insurance.claimNotSubmitted']]) {
      expect(text).not.toMatch(/submitted to (your|the) insurer/i);
    }
  });

  it('shows the server’s own words when a claim was not submitted', async () => {
    serve({
      '/health/policies': { items: [] }, '/insurance/benefits': { items: [] },
      '/insurance/claims/c1/submit': { submitted: false, message: 'No insurer integration is connected. This claim is not submitted.' },
      '/insurance/claims': { items: [{ id: 'c1', policyId: 'p', providerName: '', service: 'X-ray', amountPaise: 50000, status: 'DRAFT', createdAt: 1 }] },
    });
    render(<InsurancePanel />);
    fireEvent.click(await screen.findByRole('button', { name: memberEn['member.insurance.submitToInsurer'] }));
    expect(await screen.findByText(/This claim is not submitted/)).toBeTruthy();
  });
});

describe('RecordsPanel', () => {
  it('does not claim that only the student can open records that may be shared', async () => {
    serve({ '/health/documents': { items: [] }, '/records/shares': { items: [] } });
    render(<RecordsPanel />);
    expect(await screen.findByText(memberEn['member.records.body'])).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Only you can access these files/);
  });
});

describe('DigitalIdPanel', () => {
  it('labels the ABHA tab as not available and shows no linking flow', async () => {
    serve({ '/identity': { fullName: 'Test', memberId: 'M1', university: '', rollNumber: '', campusStatus: 'NOT_SUBMITTED', issued: false, issuedAt: null, qrSvg: null, code: null } });
    render(<DigitalIdPanel />);
    const tab = screen.getByRole('tab', { name: /ABHA linking, not available yet/ });
    fireEvent.click(tab);
    expect(await screen.findByText(memberEn['member.abha.status'])).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(document.body.textContent).not.toMatch(/ABDM certified|linked successfully/i);
  });

  it('renders in Hindi under a Hindi provider', async () => {
    serve({ '/identity': { fullName: 'Test', memberId: 'M1', university: '', rollNumber: '', campusStatus: 'NOT_SUBMITTED', issued: false, issuedAt: null, qrSvg: null, code: null } });
    render(<LanguageProvider initial="hi"><DigitalIdPanel /></LanguageProvider>);
    expect(await screen.findByText(memberHi['member.digitalId.title'])).toBeTruthy();
  });
});

describe('member catalogue', () => {
  it('keeps every placeholder in Telugu and Hindi', () => {
    for (const [key, en] of Object.entries(memberEn)) {
      const vars = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(',');
      expect(vars(memberTe[key as keyof typeof memberEn]), key).toBe(vars(en));
      expect(vars(memberHi[key as keyof typeof memberEn]), key).toBe(vars(en));
    }
  });
});
