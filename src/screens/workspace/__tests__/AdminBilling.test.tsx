import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { displayDate } from '../../../data/workflowTypes';

// Behaviour of Super Admin → Organisations → Inquiries & contracts. Only the HTTP layer is
// mocked, keyed by request path, so these tests hold for any implementation of the screen.
const apiAnswers: Record<string, (init?: RequestInit) => Promise<unknown>> = {};
const apiRequest = vi.fn((path: string, init?: RequestInit) => apiAnswers[path]?.(init) ?? new Promise(() => undefined));
const navigate = vi.fn();

vi.mock('../../../data/http', async importOriginal => ({ ...(await importOriginal<typeof import('../../../data/http')>()), apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init) }));
vi.mock('../../../lib/workflowRouting', async importOriginal => ({ ...(await importOriginal<typeof import('../../../lib/workflowRouting')>()), navigate: (path: string) => navigate(path) }));

import { ContractsView as Subject } from '../../../features/admin/views/ContractsView';

const INQUIRIES = '/billing/admin/inquiries';
const CONTRACTS = '/billing/contracts';
const inquiry = { id: 'inq-1', organization: 'IIT Example', contactName: 'Asha Rao', email: 'asha@iit.example', seats: 1200, planId: 'CAMPUS', message: 'Two hostels first.', status: 'NEW', createdAt: 1790000000 };
const contract = { id: 'con-1', organization: 'NIT Example', planId: 'ENTERPRISE', status: 'ACTIVE', seats: 800, assigned: ['a', 'b'], annualAmountPaise: 0, amountPaidPaise: 0, periodStart: 1790000000, periodEnd: 1821536000, paymentReference: '' };
const paths = () => apiRequest.mock.calls.map(([path]) => path);
const answerLists = (inquiries: unknown[] = [inquiry], contracts: unknown[] = [contract]) => {
  apiAnswers[INQUIRIES] = () => Promise.resolve({ items: inquiries });
  apiAnswers[CONTRACTS] = () => Promise.resolve({ items: contracts });
};

beforeEach(() => {
  Object.keys(apiAnswers).forEach(key => delete apiAnswers[key]);
  apiRequest.mockClear();
  navigate.mockReset();
});

describe('Inquiries & contracts', () => {
  it('loads inquiries and contracts together, then lists them', async () => {
    answerLists();
    render(<Subject />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading your information…');
    expect(paths()).toEqual([INQUIRIES, CONTRACTS]);
    const inquiries = await screen.findByRole('heading', { name: 'Institutional inquiries' });
    const inquiryRow = within(inquiries.closest('.wf-card') as HTMLElement).getByText('IIT Example').closest('li') as HTMLElement;
    expect(inquiryRow).toHaveTextContent(`Asha Rao · asha@iit.example · 1200 seats · CAMPUS · ${displayDate(1790000000)}`);
    expect(inquiryRow).toHaveTextContent('Two hostels first.');
    expect(within(inquiryRow).getByRole('combobox', { name: 'Inquiry status IIT Example' })).toHaveValue('NEW');
    expect(within(inquiryRow).getAllByRole('option').map(option => option.textContent)).toEqual(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED']);
    const contractsCard = screen.getByRole('heading', { name: 'Active contracts' }).closest('.wf-card') as HTMLElement;
    const contractRow = within(contractsCard).getByText('NIT Example').closest('li') as HTMLElement;
    expect(contractRow).toHaveTextContent(`ENTERPRISE · 800 seats · 2 assigned · ${displayDate(1790000000)} → ${displayDate(1821536000)}`);
    expect(within(contractRow).getByText('ACTIVE')).toHaveClass('wf-status', 'status-completed');
  });

  it('shows no inquiries yet, and marks only an ACTIVE contract as complete', async () => {
    answerLists([], [{ ...contract, status: 'PENDING' }]);
    render(<Subject />);
    expect(await screen.findByText('No inquiries yet.')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toHaveClass('wf-status');
    expect(screen.getByText('PENDING')).not.toHaveClass('status-completed');
  });

  it('shows no contracts yet', async () => {
    answerLists([], []);
    render(<Subject />);
    expect(await screen.findByText('No contracts yet. Create one after signing.')).toBeInTheDocument();
  });

  it('shows a load error, and Try again loads both lists again', async () => {
    apiAnswers[INQUIRIES] = () => Promise.reject(new Error('Billing is unavailable'));
    apiAnswers[CONTRACTS] = () => Promise.resolve({ items: [] });
    render(<Subject />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load this yet.');
    expect(alert).toHaveTextContent('Billing is unavailable');
    answerLists();
    fireEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('IIT Example')).toBeInTheDocument();
    expect(paths()).toEqual([INQUIRIES, CONTRACTS, INQUIRIES, CONTRACTS]);
  });

  it('changes an inquiry’s status, then reloads both lists', async () => {
    answerLists();
    apiAnswers['/billing/admin/inquiries/inq-1'] = () => Promise.resolve({});
    render(<Subject />);
    const select = await screen.findByRole('combobox', { name: 'Inquiry status IIT Example' });
    answerLists([{ ...inquiry, status: 'CONTACTED' }]);
    fireEvent.change(select, { target: { value: 'CONTACTED' } });
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/billing/admin/inquiries/inq-1', { method: 'PATCH', body: JSON.stringify({ status: 'CONTACTED' }) }));
    expect(await screen.findByRole('combobox', { name: 'Inquiry status IIT Example' })).toHaveValue('CONTACTED');
    expect(paths()).toEqual([INQUIRIES, CONTRACTS, '/billing/admin/inquiries/inq-1', INQUIRIES, CONTRACTS]);
  });

  it('shows a failed status change and does not reload', async () => {
    answerLists();
    apiAnswers['/billing/admin/inquiries/inq-1'] = () => Promise.reject(new Error('Inquiry is closed'));
    render(<Subject />);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Inquiry status IIT Example' }), { target: { value: 'QUALIFIED' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Inquiry is closed');
    expect(screen.getByRole('combobox', { name: 'Inquiry status IIT Example' })).toHaveValue('NEW');
    expect(paths()).toEqual([INQUIRIES, CONTRACTS, '/billing/admin/inquiries/inq-1']);
  });

  it('creates a contract with the form as typed, then hides the form and reloads', async () => {
    answerLists();
    apiAnswers['/billing/admin/contracts'] = () => Promise.resolve({});
    render(<Subject />);
    await screen.findByText('IIT Example');
    expect(screen.queryByRole('heading', { name: 'Create a contract' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'New contract' }));
    expect(screen.getByLabelText('Plan')).toHaveValue('CAMPUS');
    expect(screen.getByLabelText('Seats')).toHaveValue(1000);
    expect(screen.getByLabelText('Annual amount (paise)')).toHaveValue(0);
    fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'VIT Example' } });
    fireEvent.change(screen.getByLabelText('Plan'), { target: { value: 'ENTERPRISE' } });
    fireEvent.change(screen.getByLabelText('Manager email'), { target: { value: 'ops@vit.example' } });
    fireEvent.change(screen.getByLabelText('Seats'), { target: { value: '2500' } });
    fireEvent.change(screen.getByLabelText('Annual amount (paise)'), { target: { value: '150000000' } });
    fireEvent.change(screen.getByLabelText('Signed reference'), { target: { value: 'MOU-2026-14' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create contract' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Create a contract' })).toBeNull());
    expect(apiRequest).toHaveBeenCalledWith('/billing/admin/contracts', { method: 'POST', body: JSON.stringify({ organization: 'VIT Example', planId: 'ENTERPRISE', managerEmail: 'ops@vit.example', seats: 2500, annualAmountPaise: 150000000, signedReference: 'MOU-2026-14' }) });
    await waitFor(() => expect(paths()).toEqual([INQUIRIES, CONTRACTS, '/billing/admin/contracts', INQUIRIES, CONTRACTS]));
    // The form is not reset: opening it again shows what was entered.
    fireEvent.click(await screen.findByRole('button', { name: 'New contract' }));
    expect(screen.getByLabelText('Organization')).toHaveValue('VIT Example');
  });

  it('keeps the form open and shows the error when creating a contract fails', async () => {
    answerLists();
    apiAnswers['/billing/admin/contracts'] = () => Promise.reject(new Error('Manager email is already a manager'));
    render(<Subject />);
    await screen.findByText('IIT Example');
    fireEvent.click(screen.getByRole('button', { name: 'New contract' }));
    fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'VIT Example' } });
    fireEvent.change(screen.getByLabelText('Manager email'), { target: { value: 'ops@vit.example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create contract' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Manager email is already a manager');
    expect(screen.getByRole('heading', { name: 'Create a contract' })).toBeInTheDocument();
    expect(paths()).toEqual([INQUIRIES, CONTRACTS, '/billing/admin/contracts']);
  });

  it('runs one action at a time', async () => {
    answerLists();
    render(<Subject />);
    fireEvent.click(await screen.findByRole('button', { name: 'New contract' }));
    fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'VIT Example' } });
    fireEvent.change(screen.getByLabelText('Manager email'), { target: { value: 'ops@vit.example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create contract' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Create contract/ })).toBeDisabled());
    fireEvent.change(screen.getByRole('combobox', { name: 'Inquiry status IIT Example' }), { target: { value: 'CLOSED' } });
    expect(paths()).toEqual([INQUIRIES, CONTRACTS, '/billing/admin/contracts']);
  });

  it('opens the public plans', async () => {
    answerLists();
    render(<Subject />);
    fireEvent.click(screen.getByRole('button', { name: /View public plans/ }));
    expect(navigate).toHaveBeenCalledWith('pricing');
  });
});
