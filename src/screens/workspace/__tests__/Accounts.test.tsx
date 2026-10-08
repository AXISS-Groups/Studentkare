import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { OpsFeedEvent, StaffAccount } from '../../../data/workflowTypes';

// Behaviour of Super Admin → Accounts & roles, including Manage accounts. Only the HTTP
// layer is mocked, keyed by request path, so these tests hold for any implementation.
const apiAnswers: Record<string, () => Promise<unknown>> = {};
const apiRequest = vi.fn((path: string, _init?: RequestInit) => apiAnswers[path]?.() ?? new Promise(() => undefined));
vi.mock('../../../data/http', async importOriginal => ({ ...(await importOriginal<typeof import('../../../data/http')>()), apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init) }));

import { superAdminScreen } from '../admin/SuperAdminScreens';

const ROLES = ['STUDENT', 'NMC_DOCTOR', 'VENDOR', 'CAMPUS_ADMIN', 'SUPER_ADMIN'] as const;
const countPath = (role: string) => `/ops/accounts?limit=1&role=${role}`;
const COUNT_PATHS = ROLES.map(countPath);
const LIST = '/ops/accounts?limit=15&offset=0';
const RECENT = '/ops/feed?domain=ACCOUNT&limit=200';
const paths = () => apiRequest.mock.calls.map(([path]) => path);
const answer = (path: string, value: unknown) => { apiAnswers[path] = () => Promise.resolve(value); };
const answerCounts = (totals: number[]) => ROLES.forEach((role, index) => answer(countPath(role), { items: [], total: totals[index] }));
const account = (id: string, overrides: Partial<StaffAccount> = {}): StaffAccount => ({ id, fullName: `Person ${id}`, identifier: `${id}@example.test`, role: 'NMC_DOCTOR', active: true, ...overrides });
const feedEvent = (id: string, kind: string, summary: string): OpsFeedEvent => ({ id, kind, domain: 'ACCOUNT', severity: 'ATTENTION', actorId: 'a', actorRole: 'SUPER_ADMIN', subjectId: 's', providerId: '', resourceType: '', resourceId: '', summary, createdAt: 1_700_000_000, acknowledgedAt: null, acknowledgedBy: '' });
const show = () => render(<Suspense fallback={<p>Loading…</p>}>{superAdminScreen('admin/accounts')}</Suspense>);
const listTable = () => document.querySelector('.wf-table-scroll table') as HTMLElement;
const listRows = () => Array.from(listTable().querySelectorAll('tbody tr')).map(row => Array.from(row.querySelectorAll('td')).map(cell => cell.textContent));

beforeEach(() => {
  Object.keys(apiAnswers).forEach(key => delete apiAnswers[key]);
  apiRequest.mockClear();
  // jsdom has no modal dialogs: open and close the element the way a browser does.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute('open'); };
});

describe('Accounts & roles overview', () => {
  it('requests the account list, then each role’s count, in order', async () => {
    answerCounts([900, 40, 12, 6, 2]);
    answer(LIST, { items: [], total: 0 });
    show();
    expect(screen.getByText('Loading accounts by role…')).toBeInTheDocument();
    await screen.findByRole('table', { name: 'Accounts by role' });
    expect(paths()).toEqual([LIST, ...COUNT_PATHS]);
  });

  it('shows counts per role, the clinical data each may reach and the workspace each uses', async () => {
    answerCounts([900, 40, 12, 6, 2]);
    show();
    const table = await screen.findByRole('table', { name: 'Accounts by role' });
    const tiles = within(screen.getByRole('group', { name: 'Accounts summary' })).getAllByRole('article');
    expect(tiles[0]).toHaveTextContent('960');
    expect(tiles[1]).toHaveTextContent('5');
    const rows = within(table).getAllByRole('row').slice(1).map(row => Array.from(row.querySelectorAll('td')).map(cell => cell.textContent));
    expect(rows).toEqual([
      ['StudentSTUDENTOwns their own record', '900', 'Own record only', 'Student portal'],
      ['NMC DoctorNMC_DOCTORRegistered clinician', '40', 'Consented records only', 'Clinical workspace'],
      ['VendorVENDORPharmacy, lab or provider', '12', 'Permission policy unavailable', 'Vendor workspace'],
      ['Campus AdminCAMPUS_ADMINInstitution staff', '6', 'No clinical access', 'Campus administration'],
      ['Super AdminSUPER_ADMINPlatform operations', '2', 'No clinical access', 'Platform administration'],
    ]);
    expect(document.body.textContent).not.toMatch(/signed-in/);
    // Development-only state switchers are not part of the screen.
    ['Preview', 'Data', 'Loading', 'Empty', 'Error'].forEach(label => expect(screen.queryByRole('button', { name: label })).toBeNull());
    const tagClasses = (role: string) => (within(table).getByText(role).closest('tr') as HTMLElement).querySelector('.sk-admin-tag')?.className;
    expect(ROLES.map(tagClasses)).toEqual(['sk-admin-tag is-positive', 'sk-admin-tag is-positive', 'sk-admin-tag is-attention', 'sk-admin-tag is-positive', 'sk-admin-tag is-positive']);
  });

  it('shows the first failing count’s error, and Try again requests every count again', async () => {
    answerCounts([900, 40, 12, 6, 2]);
    apiAnswers[countPath('VENDOR')] = () => Promise.reject(new Error('Vendor count timed out'));
    apiAnswers[countPath('SUPER_ADMIN')] = () => Promise.reject(new Error('Admin count timed out'));
    answer(LIST, { items: [], total: 0 });
    show();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load accounts by role');
    expect(alert).toHaveTextContent('Vendor count timed out');
    answerCounts([900, 40, 12, 6, 2]);
    fireEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('table', { name: 'Accounts by role' })).toBeInTheDocument();
    expect(paths()).toEqual([LIST, ...COUNT_PATHS, ...COUNT_PATHS]);
  });

  it('loads recent account changes each time that tab opens, showing staff accounts created only', async () => {
    answerCounts([1, 0, 0, 0, 1]);
    answer(RECENT, { items: [feedEvent('1', 'STAFF_ACCOUNT_CREATED', 'Staff account created with the vendor role'), feedEvent('2', 'SUBSCRIPTION_STARTED', 'Plan started'), feedEvent('3', 'STAFF_ACCOUNT_CREATED', '')], total: 3, critical: 0, scope: 'all' });
    show();
    await screen.findByRole('table', { name: 'Accounts by role' });
    expect(paths()).not.toContain(RECENT);
    fireEvent.click(screen.getByRole('tab', { name: 'Recently changed' }));
    expect(screen.getByText('Loading recent account changes…')).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Recently changed accounts' });
    const rows = within(table).getAllByRole('row').slice(1).map(row => Array.from(row.querySelectorAll('td')).map(cell => cell.textContent));
    expect(rows).toEqual([
      ['Staff account created', 'Staff account created with the vendor role', expect.any(String)],
      ['Staff account created', '—', expect.any(String)],
    ]);
    expect(within(table).getAllByRole('row')[1].querySelector('time')).toHaveAttribute('datetime', new Date(1_700_000_000 * 1000).toISOString());
    fireEvent.click(screen.getByRole('tab', { name: 'By role' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Recently changed' }));
    await screen.findByRole('table', { name: 'Recently changed accounts' });
    expect(paths().filter(path => path === RECENT)).toHaveLength(2);
  });

  it('shows recent changes empty, then an error with Try again', async () => {
    answerCounts([1, 0, 0, 0, 1]);
    answer(RECENT, { items: [feedEvent('2', 'SUBSCRIPTION_STARTED', 'Plan started')], total: 1, critical: 0, scope: 'all' });
    show();
    await screen.findByRole('table', { name: 'Accounts by role' });
    fireEvent.click(screen.getByRole('tab', { name: 'Recently changed' }));
    expect(await screen.findByText('No recent access changes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'By role' }));
    apiAnswers[RECENT] = () => Promise.reject(new Error('Feed unavailable'));
    fireEvent.click(screen.getByRole('tab', { name: 'Recently changed' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load recent account changes');
    expect(alert).toHaveTextContent('Feed unavailable');
    answer(RECENT, { items: [feedEvent('1', 'STAFF_ACCOUNT_CREATED', 'Created')], total: 1, critical: 0, scope: 'all' });
    fireEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Created')).toBeInTheDocument();
    expect(paths().filter(path => path === RECENT)).toHaveLength(3);
  });

  it('moves between tabs with the arrow, Home and End keys', async () => {
    answerCounts([1, 0, 0, 0, 1]);
    show();
    const byRole = await screen.findByRole('tab', { name: 'By role' });
    fireEvent.keyDown(byRole, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Pending grants' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Pending grants' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Pending grants' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Recently changed' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Recently changed' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'By role' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'sk-accounts-tab-roles');
  });
});

describe('Manage accounts', () => {
  it('lists accounts with their verified contact, role and status', async () => {
    answer(LIST, { items: [account('a1', { fullName: 'Asha Rao', role: 'CAMPUS_ADMIN' }), account('a2', { active: false })], total: 2 });
    show();
    await waitFor(() => expect(listRows()).toHaveLength(2));
    // A campus admin with no campus sees no students; the column says so and offers to set it.
    expect(listRows()).toEqual([['Asha Rao', 'a1@example.test', 'CAMPUS ADMIN', 'Active', 'Not set — sees no students Set campus'], ['Person a2', 'a2@example.test', 'NMC DOCTOR', 'Inactive', '—']]);
    expect(within(listTable()).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Name', 'Verified at sign-in', 'Role', 'Status', 'Campus']);
    expect(screen.queryByRole('button', { name: /Next/ })).toBeNull();
  });

  it('searches and filters by role from the first page, with the exact query', async () => {
    answer(LIST, { items: [account('a1')], total: 40 });
    show();
    await waitFor(() => expect(listRows()).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(paths()).toContain('/ops/accounts?limit=15&offset=15');
    fireEvent.change(screen.getByPlaceholderText('Search accounts by name or email/phone…'), { target: { value: 'asha r' } });
    expect(paths()).toContain('/ops/accounts?limit=15&offset=0&query=asha%20r');
    fireEvent.change(screen.getByDisplayValue('All roles'), { target: { value: 'VENDOR' } });
    expect(paths()[paths().length - 1]).toBe('/ops/accounts?limit=15&offset=0&query=asha%20r&role=VENDOR');
    fireEvent.change(screen.getByPlaceholderText('Search accounts by name or email/phone…'), { target: { value: '' } });
    expect(paths()[paths().length - 1]).toBe('/ops/accounts?limit=15&offset=0&role=VENDOR');
  });

  it('pages through the list, showing loading while a page arrives', async () => {
    answer(LIST, { items: [account('a1')], total: 40 });
    answer('/ops/accounts?limit=15&offset=15', { items: [account('a16')], total: 40 });
    show();
    await waitFor(() => expect(listRows()).toHaveLength(1));
    expect(screen.getByText(/of/, { selector: '.wf-pagination span' })).toHaveTextContent('Page 1 of 3 (40 items)');
    expect(screen.getByRole('button', { name: /Previous/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getAllByText('Loading your information…').length).toBeGreaterThan(0);
    await waitFor(() => expect(listRows()).toEqual([['Person a16', 'a16@example.test', 'NMC DOCTOR', 'Active', '—']]));
    expect(screen.getByText(/of/, { selector: '.wf-pagination span' })).toHaveTextContent('Page 2 of 3 (40 items)');
  });

  it('shows a list error and requests the same page on Try again', async () => {
    answerCounts([1, 0, 0, 0, 1]);
    apiAnswers[LIST] = () => Promise.reject(new Error('Accounts unavailable'));
    show();
    const alert = await screen.findByText('Accounts unavailable');
    answer(LIST, { items: [account('a1')], total: 1 });
    fireEvent.click(within(alert.closest('[role=alert]') as HTMLElement).getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(listRows()).toHaveLength(1));
    expect(paths().filter(path => path === LIST)).toHaveLength(2);
  });

  it('creates a staff account with the form as entered, closes the form, and reloads the list', async () => {
    answer(LIST, { items: [], total: 0 });
    answer('/ops/accounts', { id: 'new' });
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }));
    const dialog = screen.getByRole('dialog', { name: 'Create a staff account' });
    expect(within(dialog).getByLabelText('Role')).toHaveValue('VENDOR');
    expect(within(dialog).getByLabelText('Sign-in channel')).toHaveValue('EMAIL');
    expect(within(dialog).getByLabelText('Contact address')).toHaveAttribute('type', 'email');
    fireEvent.change(within(dialog).getByLabelText('Full name'), { target: { value: 'Dr Meera Iyer' } });
    fireEvent.change(within(dialog).getByLabelText('Role'), { target: { value: 'NMC_DOCTOR' } });
    fireEvent.change(within(dialog).getByLabelText('Sign-in channel'), { target: { value: 'WHATSAPP' } });
    expect(within(dialog).getByLabelText('Contact address')).toHaveAttribute('type', 'tel');
    fireEvent.change(within(dialog).getByLabelText('Contact address'), { target: { value: '+919800000000' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(apiRequest).toHaveBeenCalledWith('/ops/accounts', { method: 'POST', body: JSON.stringify({ fullName: 'Dr Meera Iyer', identifier: '+919800000000', channel: 'WHATSAPP', role: 'NMC_DOCTOR' }) });
    await waitFor(() => expect(paths().filter(path => path === LIST)).toHaveLength(2));
    // Name and contact clear; role and channel stay as last chosen.
    fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }));
    const again = screen.getByRole('dialog', { name: 'Create a staff account' });
    expect(within(again).getByLabelText('Full name')).toHaveValue('');
    expect(within(again).getByLabelText('Contact address')).toHaveValue('');
    expect(within(again).getByLabelText('Role')).toHaveValue('NMC_DOCTOR');
    expect(within(again).getByLabelText('Sign-in channel')).toHaveValue('WHATSAPP');
  });

  it('keeps the form and shows the error when creating fails, and the error stays after reopening', async () => {
    answer(LIST, { items: [], total: 0 });
    apiAnswers['/ops/accounts'] = () => Promise.reject(new Error('That contact address is already registered'));
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }));
    const dialog = screen.getByRole('dialog', { name: 'Create a staff account' });
    fireEvent.change(within(dialog).getByLabelText('Full name'), { target: { value: 'Asha Rao' } });
    fireEvent.change(within(dialog).getByLabelText('Contact address'), { target: { value: 'asha@example.test' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create account' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('That contact address is already registered');
    expect(within(dialog).getByLabelText('Full name')).toHaveValue('Asha Rao');
    expect(paths().filter(path => path === LIST)).toHaveLength(1);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close dialog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }));
    expect(within(screen.getByRole('dialog', { name: 'Create a staff account' })).getByRole('alert')).toHaveTextContent('That contact address is already registered');
  });

  it('creates one account at a time', async () => {
    answer(LIST, { items: [], total: 0 });
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }));
    const dialog = screen.getByRole('dialog', { name: 'Create a staff account' });
    fireEvent.change(within(dialog).getByLabelText('Full name'), { target: { value: 'Asha Rao' } });
    fireEvent.change(within(dialog).getByLabelText('Contact address'), { target: { value: 'asha@example.test' } });
    const form = dialog.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /Create account/ })).toBeDisabled());
    expect(paths().filter(path => path === '/ops/accounts')).toHaveLength(1);
  });
});
