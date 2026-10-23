import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { LiveCatalogItem, StaffAccount } from '../../../data/types/workflowTypes';
import { money } from '../../../data/types/workflowTypes';

// Behaviour of Super Admin → Catalogue ops. Only the HTTP layer is mocked, keyed by
// request path, so these tests hold for any implementation of the screen.
const apiAnswers: Record<string, (init?: RequestInit) => Promise<unknown>> = {};
const apiRequest = vi.fn((path: string, init?: RequestInit) => apiAnswers[path]?.(init) ?? new Promise(() => undefined));
vi.mock('../../../data/services/http', async importOriginal => ({ ...(await importOriginal<typeof import('../../../data/services/http')>()), apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init) }));

import { superAdminScreen } from '../admin/SuperAdminScreens';

const SUMMARY = '/ops/catalog?limit=200';
const LIST = '/ops/catalog?limit=15&offset=0';
const ACCOUNTS = '/ops/accounts';
const item = (id: string, overrides: Partial<LiveCatalogItem> = {}): LiveCatalogItem => ({
  id, providerId: 'provider-0001-abcdef', kind: 'product', name: `Item ${id}`, brand: 'Brand', category: 'devices', description: 'A description of the item.', pack: '1 unit',
  pricePaise: 49900, mrpPaise: 49900, stock: 12, active: true, requiresPrescription: false, preparation: '', imageUrl: null, ...overrides,
});
const staff = (id: string, role: StaffAccount['role'], active = true): StaffAccount => ({ id, fullName: `Staff ${id}`, identifier: `${id}@example.test`, role, active });
const ACCOUNT_LIST = { items: [staff('v1', 'VENDOR'), staff('v2', 'VENDOR', false), staff('d1', 'NMC_DOCTOR'), staff('s1', 'STUDENT')] };
const paths = () => apiRequest.mock.calls.map(([path]) => path);
const callsTo = (path: string) => apiRequest.mock.calls.filter(([called]) => called === path);
const answer = (path: string, value: unknown) => { apiAnswers[path] = () => Promise.resolve(value); };
const fail = (path: string, message: string) => { apiAnswers[path] = () => Promise.reject(new Error(message)); };
const show = () => render(<Suspense fallback={<p>Loading…</p>}>{superAdminScreen('admin/catalog')}</Suspense>);
const row = (name: string) => screen.getByRole('rowheader', { name: new RegExp(`^Item ${name}`) }).closest('tr') as HTMLElement;
const findRow = async (name: string) => (await screen.findByRole('rowheader', { name: new RegExp(`^Item ${name}`) })).closest('tr') as HTMLElement;
// The error above the list (shown once every drawer is closed).
const topError = () => document.querySelector('.sk-ctp > .sk-board-error');
const figures = (group: HTMLElement) => Array.from(group.querySelectorAll('.sk-stat__value')).map(value => value.textContent);
const openDetails = async (name: string) => { fireEvent.click(within(await findRow(name)).getByRole('button', { name: `Open Item ${name}` })); return screen.getByRole('dialog', { name: `Item ${name}` }); };
const answerPage = (items: LiveCatalogItem[], total = items.length) => { answer(SUMMARY, { items, total }); answer(LIST, { items, total }); answer(ACCOUNTS, ACCOUNT_LIST); };

beforeEach(() => {
  Object.keys(apiAnswers).forEach(key => delete apiAnswers[key]);
  apiRequest.mockClear();
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { this.removeAttribute('open'); };
  URL.createObjectURL = vi.fn(() => 'blob:preview');
});

describe('Catalogue summary', () => {
  it('requests the summary, the first page and the accounts, in that order', async () => {
    answerPage([item('a')]);
    show();
    expect(screen.getByRole('status', { name: 'Loading the catalogue…' })).toBeInTheDocument();
    await screen.findByRole('group', { name: 'Catalogue summary' });
    expect(paths()).toEqual([SUMMARY, LIST, ACCOUNTS]);
  });

  it('counts entries, products, other services and products out of stock, noting a partial sample', async () => {
    const items = [item('a', { stock: 3 }), item('b', { stock: 0 }), item('c', { kind: 'lab', stock: 0 })];
    answer(SUMMARY, { items, total: 250 });
    answer(LIST, { items: [item('a')], total: 1 });
    show();
    const group = await screen.findByRole('group', { name: 'Catalogue summary' });
    await waitFor(() => expect(figures(group)).toEqual(['250', '2', '1', '1']));
    expect(group).toHaveTextContent('With stock tracked · first 3');
    expect(group).toHaveTextContent('Labs, consultations, vaccines · first 3');
    expect(group).toHaveTextContent('Stock at 0 · first 3');
  });

  it('shows the figures as “—”, never 0, while the summary has failed', async () => {
    fail(SUMMARY, 'Summary timed out');
    answer(LIST, { items: [item('a')], total: 1 });
    show();
    await findRow('a');
    const group = screen.getByRole('group', { name: 'Catalogue summary' });
    await waitFor(() => expect(figures(group)).toEqual(['—', '—', '—', '—']));
  });
});

describe('Catalogue list', () => {
  it('lists each entry with its price and MRP saving, schedule, stock, state and actions', async () => {
    answerPage([item('a', { active: false }), item('b', { kind: 'lab', mrpPaise: 99900 }), item('c', { requiresPrescription: true, stock: 0 })]);
    show();
    const a = await findRow('a');
    expect(a).toHaveTextContent('Brand · 1 unit');
    expect(a).toHaveTextContent(money(49900));
    expect(a).toHaveTextContent('OTC');
    expect(a).toHaveTextContent('Hidden');
    expect(within(a).getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    const b = row('b');
    expect(b).toHaveTextContent(`${money(50000)} off MRP ${money(99900)}`);
    expect(b).toHaveTextContent('Lab');
    expect(b).toHaveTextContent('Live');
    expect(within(b).getByRole('button', { name: 'Hide' })).toBeInTheDocument();
    expect(row('c')).toHaveTextContent('Prescription');
    expect(screen.getByRole('columnheader', { name: 'MRP / Price' })).toBeInTheDocument();
  });

  it('shows the empty catalogue with one next step', async () => {
    answerPage([]);
    show();
    expect(await screen.findByText('Your catalog is empty.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add catalog entry' })).toBeInTheDocument();
  });

  it('shows a list error with the board’s reference, and Try again requests the same page again', async () => {
    answer(SUMMARY, { items: [], total: 0 });
    fail(LIST, 'Catalogue unavailable');
    answer(ACCOUNTS, ACCOUNT_LIST);
    show();
    const alert = (await screen.findByText('Catalogue unavailable')).closest('[role=alert]') as HTMLElement;
    expect(alert).toHaveTextContent('Couldn’t load catalogue ops');
    expect(alert).toHaveTextContent('Ref ERR-503 · CatalogOps');
    answer(LIST, { items: [item('a')], total: 1 });
    fireEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    await findRow('a');
    expect(callsTo(LIST)).toHaveLength(2);
    expect(callsTo(SUMMARY)).toHaveLength(1);
  });

  it('searches from the first page and pages by 15, with the exact query, keeping the table while it loads', async () => {
    answer(SUMMARY, { items: [], total: 40 });
    answer(LIST, { items: [item('a')], total: 40 });
    answer(ACCOUNTS, ACCOUNT_LIST);
    show();
    await findRow('a');
    expect(screen.getByRole('navigation', { name: 'Pages' })).toHaveTextContent('page 1 of 3');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(paths()[paths().length - 1]).toBe('/ops/catalog?limit=15&offset=15');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search the catalog' }), { target: { value: 'blood test' } });
    expect(paths()[paths().length - 1]).toBe('/ops/catalog?limit=15&offset=0&query=blood%20test');
    expect(screen.getByRole('searchbox', { name: 'Search the catalog' })).toHaveValue('blood test');
    expect(callsTo(SUMMARY)).toHaveLength(1);
    expect(callsTo(ACCOUNTS)).toHaveLength(1);
  });

  it('says when a search matches nothing', async () => {
    answerPage([item('a')]);
    answer('/ops/catalog?limit=15&offset=0&query=zzz', { items: [], total: 0 });
    show();
    await findRow('a');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search the catalog' }), { target: { value: 'zzz' } });
    expect(await screen.findByText('Nothing matches “zzz”.')).toBeInTheDocument();
  });

  it('shows an entry’s details in a drawer', async () => {
    answerPage([item('a', { imageUrl: '/media/a.png', mrpPaise: 59900, preparation: 'Fast for 8 hours.', requiresPrescription: true })]);
    show();
    const drawer = await openDetails('a');
    expect(within(drawer).getByRole('img', { name: 'Item a' })).toHaveAttribute('src', '/media/a.png');
    expect(drawer).toHaveTextContent('Published');
    expect(drawer).toHaveTextContent(money(59900));
    expect(drawer).toHaveTextContent('Fast for 8 hours.');
    expect(drawer).toHaveTextContent('Required');
    expect(drawer).toHaveTextContent('provider-0001-abcdef');
  });
});

describe('Publishing a catalog entry', () => {
  const fillForm = (dialog: HTMLElement) => {
    fireEvent.change(within(dialog).getByLabelText('Assigned provider'), { target: { value: 'v1' } });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Pulse oximeter' } });
    fireEvent.change(within(dialog).getByLabelText('Brand or provider name'), { target: { value: 'Dr Trust' } });
    fireEvent.change(within(dialog).getByLabelText('Pack size or service details'), { target: { value: '1 device' } });
    fireEvent.change(within(dialog).getByLabelText('Price (₹)'), { target: { value: '1299.50' } });
    fireEvent.change(within(dialog).getByLabelText('Available product stock'), { target: { value: '30' } });
    fireEvent.change(within(dialog).getByLabelText('Description'), { target: { value: 'Clip-on fingertip pulse oximeter.' } });
  };
  const openForm = async () => {
    await screen.findByText('Your catalog is empty.');
    fireEvent.click(screen.getByRole('button', { name: 'Add catalog entry' }));
    return screen.getByRole('dialog', { name: 'Publish a catalog entry' });
  };

  it('offers only active providers of the role the entry type needs, and clears the choice when the type changes', async () => {
    answerPage([]);
    show();
    const dialog = await openForm();
    const providerOptions = () => Array.from((within(dialog).getByLabelText('Assigned provider') as HTMLSelectElement).options).map(option => option.textContent);
    expect(providerOptions()).toEqual(['Choose a provider', 'Staff v1']);
    fireEvent.change(within(dialog).getByLabelText('Assigned provider'), { target: { value: 'v1' } });
    fireEvent.change(within(dialog).getByLabelText('Entry type'), { target: { value: 'consultation' } });
    expect(providerOptions()).toEqual(['Choose a provider', 'Staff d1']);
    expect(within(dialog).getByLabelText('Assigned provider')).toHaveValue('');
    fireEvent.change(within(dialog).getByLabelText('Entry type'), { target: { value: 'lab' } });
    expect(providerOptions()).toEqual(['Choose a provider', 'Staff v1']);
    expect(within(dialog).queryByText('Create an eligible provider account before publishing this service.')).toBeNull();
  });

  it('asks for a provider account when none is eligible, and shows an accounts error in the form', async () => {
    answer(SUMMARY, { items: [], total: 0 });
    answer(LIST, { items: [], total: 0 });
    fail(ACCOUNTS, 'Accounts unavailable');
    show();
    const dialog = await openForm();
    expect(within(dialog).getByText('Create an eligible provider account before publishing this service.')).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByRole('alert')).toHaveTextContent('Accounts unavailable'));
  });

  it('publishes an entry with its photo, closes the form, resets it and reloads the list only', async () => {
    answerPage([]);
    answer('/ops/catalog', { ...item('new'), id: 'new' });
    answer('/ops/catalog/new/image', {});
    show();
    const dialog = await openForm();
    fillForm(dialog);
    fireEvent.click(within(dialog).getByLabelText('Requires prescription review'));
    expect(within(dialog).getByText('This entry can be viewed, but ordering stays unavailable until a prescription-review service is connected.')).toBeInTheDocument();
    const photo = new File(['png'], 'oximeter.png', { type: 'image/png' });
    fireEvent.change(within(dialog).getByLabelText(/Product Photo/), { target: { files: [photo] } });
    expect(within(dialog).getByRole('img', { name: 'Preview' })).toHaveAttribute('src', 'blob:preview');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Publish entry' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const [, created] = callsTo('/ops/catalog')[0];
    expect(created).toEqual({ method: 'POST', body: JSON.stringify({ name: 'Pulse oximeter', brand: 'Dr Trust', kind: 'product', category: 'devices', description: 'Clip-on fingertip pulse oximeter.', pack: '1 device', stock: 30, providerId: 'v1', preparation: '', requiresPrescription: true, pricePaise: 129950 }) });
    const [, uploaded] = callsTo('/ops/catalog/new/image')[0];
    expect(uploaded?.method).toBe('POST');
    expect((uploaded?.body as FormData).get('file')).toBe(photo);
    await waitFor(() => expect(callsTo(LIST)).toHaveLength(2));
    expect(callsTo(SUMMARY)).toHaveLength(1);
    expect(paths().slice(3)).toEqual(['/ops/catalog', '/ops/catalog/new/image', LIST]);
    fireEvent.click(await screen.findByRole('button', { name: 'Add catalog entry' }));
    const again = screen.getByRole('dialog', { name: 'Publish a catalog entry' });
    expect(within(again).getByLabelText('Name')).toHaveValue('');
    expect(within(again).getByLabelText('Entry type')).toHaveValue('product');
    expect(within(again).queryByRole('img', { name: 'Preview' })).toBeNull();
  });

  it('publishes without a photo in one request', async () => {
    answerPage([]);
    answer('/ops/catalog', { ...item('new'), id: 'new' });
    show();
    fillForm(await openForm());
    fireEvent.click(screen.getByRole('button', { name: 'Publish entry' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(paths().filter(path => path.startsWith('/ops/catalog/'))).toEqual([]);
  });

  it('keeps the form and shows the error when publishing fails, and shows it above the list once closed', async () => {
    answerPage([item('a')]);
    fail('/ops/catalog', 'A provider is required');
    show();
    await findRow('a');
    fireEvent.click(screen.getByRole('button', { name: 'Add catalog entry' }));
    const dialog = screen.getByRole('dialog', { name: 'Publish a catalog entry' });
    fillForm(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Publish entry' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('A provider is required');
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Pulse oximeter');
    expect(topError()).toBeNull();
    expect(callsTo(LIST)).toHaveLength(1);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close panel' }));
    await waitFor(() => expect(topError()).toHaveTextContent('A provider is required'));
  });

  it('keeps the form open when the entry is created but its photo upload fails', async () => {
    answerPage([]);
    answer('/ops/catalog', { ...item('new'), id: 'new' });
    fail('/ops/catalog/new/image', 'Image too large');
    show();
    const dialog = await openForm();
    fillForm(dialog);
    fireEvent.change(within(dialog).getByLabelText(/Product Photo/), { target: { files: [new File(['x'], 'big.png', { type: 'image/png' })] } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Publish entry' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Image too large');
    expect(callsTo(LIST)).toHaveLength(1);
  });
});

describe('Stock and publication', () => {
  it('saves an edited stock count from the drawer, reloads, and keeps the edit', async () => {
    answerPage([item('a')]);
    answer('/ops/catalog/a', {});
    show();
    const drawer = await openDetails('a');
    fireEvent.change(within(drawer).getByRole('spinbutton', { name: 'Stock for Item a' }), { target: { value: '25' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save stock' }));
    await waitFor(() => expect(callsTo(LIST)).toHaveLength(2));
    expect(apiRequest).toHaveBeenCalledWith('/ops/catalog/a', { method: 'PATCH', body: JSON.stringify({ stock: 25, active: true }) });
    await waitFor(() => expect(within(screen.getByRole('dialog', { name: 'Item a' })).getByRole('spinbutton', { name: 'Stock for Item a' })).toHaveValue(25));
  });

  it('allows saving only a whole-number stock', async () => {
    answerPage([item('a')]);
    show();
    const drawer = await openDetails('a');
    const input = within(drawer).getByRole('spinbutton', { name: 'Stock for Item a' });
    const save = within(drawer).getByRole('button', { name: 'Save stock' });
    expect(save).toBeEnabled();
    fireEvent.change(input, { target: { value: '2.5' } });
    expect(save).toBeDisabled();
    fireEvent.change(input, { target: { value: '' } });
    expect(save).toBeDisabled();
  });

  it('shows a failed stock save in the drawer, then above the list, and does not reload', async () => {
    answerPage([item('a')]);
    fail('/ops/catalog/a', 'Stock cannot be negative');
    show();
    const drawer = await openDetails('a');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Save stock' }));
    expect(await within(drawer).findByRole('alert')).toHaveTextContent('Stock cannot be negative');
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close panel' }));
    await waitFor(() => expect(topError()).toHaveTextContent('Stock cannot be negative'));
    expect(callsTo(LIST)).toHaveLength(1);
  });

  it('hides and publishes an entry with its current stock', async () => {
    answerPage([item('a', { stock: 7 })]);
    answer('/ops/catalog/a', {});
    show();
    fireEvent.click(within(await findRow('a')).getByRole('button', { name: 'Hide' }));
    await waitFor(() => expect(callsTo(LIST)).toHaveLength(2));
    expect(apiRequest).toHaveBeenCalledWith('/ops/catalog/a', { method: 'PATCH', body: JSON.stringify({ stock: 7, active: false }) });
  });

  it('runs one entry change at a time', async () => {
    answerPage([item('a'), item('b')]);
    show();
    fireEvent.click(within(await findRow('a')).getByRole('button', { name: 'Hide' }));
    await waitFor(() => expect(within(row('b')).getByRole('button', { name: 'Hide' })).toBeDisabled());
    fireEvent.click(within(row('b')).getByRole('button', { name: 'Hide' }));
    expect(paths().filter(path => path.startsWith('/ops/catalog/'))).toEqual(['/ops/catalog/a']);
  });
});

describe('Product photos', () => {
  it('uploads a photo for an entry from the drawer and reloads', async () => {
    answerPage([item('a')]);
    answer('/ops/catalog/a/image', {});
    show();
    const drawer = await openDetails('a');
    expect(within(drawer).getByRole('button', { name: 'Upload Photo' })).toBeDisabled();
    const photo = new File(['png'], 'a.png', { type: 'image/png' });
    fireEvent.change(within(drawer).getByLabelText(/Choose Image File/), { target: { files: [photo] } });
    expect(within(drawer).getByRole('img', { name: 'Preview' })).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Upload Photo' }));
    await waitFor(() => expect(callsTo(LIST)).toHaveLength(2));
    const [, uploaded] = callsTo('/ops/catalog/a/image')[0];
    expect(uploaded?.method).toBe('POST');
    expect((uploaded?.body as FormData).get('file')).toBe(photo);
  });

  it('keeps the drawer open and shows the error when the upload fails', async () => {
    answerPage([item('a')]);
    fail('/ops/catalog/a/image', 'Unsupported image');
    show();
    const drawer = await openDetails('a');
    fireEvent.change(within(drawer).getByLabelText(/Choose Image File/), { target: { files: [new File(['x'], 'a.gif', { type: 'image/gif' })] } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Upload Photo' }));
    expect(await within(drawer).findByRole('alert')).toHaveTextContent('Unsupported image');
    expect(callsTo(LIST)).toHaveLength(1);
  });

  it('removes a photo and reloads', async () => {
    answerPage([item('a', { imageUrl: '/media/a.png' })]);
    answer('/ops/catalog/a/image', {});
    show();
    fireEvent.click(within(await openDetails('a')).getByRole('button', { name: 'Remove photo' }));
    await waitFor(() => expect(callsTo(LIST)).toHaveLength(2));
    expect(apiRequest).toHaveBeenCalledWith('/ops/catalog/a/image', { method: 'DELETE' });
  });

  it('offers no photo removal for an entry without a photo', async () => {
    answerPage([item('a')]);
    show();
    expect(within(await openDetails('a')).queryByRole('button', { name: 'Remove photo' })).toBeNull();
  });
});
