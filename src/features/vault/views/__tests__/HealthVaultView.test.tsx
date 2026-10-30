import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => true,
}));
// The Prescriptions tab reads through the shared hook (useApiResource → apiRequest); the vault itself through its view-model.
const http: { request: (path: string, init?: RequestInit) => Promise<unknown> } = { request: async (path) => { throw new Error(`unexpected ${path}`); } };
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => http.request(path, init),
}));

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Text } from 'react-native';
import { M2Responsive, M2SosProvider } from '@/design-system/m2';
import type { M2Layout } from '@/design-system/m2';
import { fakeRequest } from '@/features/phoneKit/__tests__/fixtures';
import { axeViolations, describeViolations } from '@/test/axe';
import { HealthVaultViewModel } from '../../viewmodel/HealthVaultViewModel';
import type { RecordShare, VaultDocument } from '../../viewmodel/HealthVaultViewModel';
import { HealthVaultView } from '../HealthVaultView';
import type { HealthVaultLinks, VaultTab } from '../HealthVaultView';

/**
 * Health vault, one view at both widths (Tier 1 parity plan 2026-10-24 §6–7,
 * design boards T1Vault / T1VaultDesktop / T1VaultEmpty).
 */
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const settle = async () => { await act(async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); }); };

const doc = (id: string, category: string, createdAt = 1_760_000_000): VaultDocument => ({ id, title: `Doc ${id}`, category, filename: `${id}.pdf`, mimeType: 'application/pdf', createdAt });
const share = (id: string, documentId: string, clinician = 'Dr Test'): RecordShare => ({ id, clinician, document: `Doc ${documentId}`, documentId, grantedAt: 0, expiresAt: 4_000_000_000, revoked: false, active: true });

function routes(over: Record<string, unknown> = {}) {
  return {
    '/health/documents': { items: [doc('d1', 'LAB', 1_760_100_000), doc('d2', 'LAB'), doc('d3', 'PRESCRIPTION')], total: 3 },
    '/records/shares': { items: [share('s1', 'd3')] },
    '/prescriptions': { items: [], total: 0 },
    '/lab-orders': { items: [], total: 0 },
    ...over,
  };
}

function links(): HealthVaultLinks {
  return { back: vi.fn(), addDocument: vi.fn(), saveExport: vi.fn(), download: vi.fn(), visitSummaries: vi.fn(), verify: vi.fn() };
}

function mount(layout: M2Layout, over: Record<string, unknown> = {}, opts: { online?: boolean; tab?: VaultTab; sos?: () => void; verified?: boolean; prescriptions?: boolean } = {}) {
  const { request, calls } = fakeRequest(routes(over));
  http.request = request as unknown as typeof http.request;
  const vm = new HealthVaultViewModel(request);
  const to = links();
  const onTabChange = vi.fn();
  const ui = (tab: VaultTab = opts.tab ?? 'documents') => (
    <M2Responsive layout={layout}>
      <HealthVaultView viewModel={vm} online={opts.online ?? true} tab={tab} onTabChange={onTabChange} links={to} locale="en-IN" verified={opts.verified ?? true}
        prescriptions={opts.prescriptions === false ? undefined : { links: {} }} panels={{ who: <Text testID="who-panel">who</Text>, family: <Text testID="family-panel">family</Text> }} />
    </M2Responsive>
  );
  const view = render(opts.sos ? <M2SosProvider value={opts.sos}>{ui()}</M2SosProvider> : ui());
  return { vm, calls, links: to, onTabChange, ...view, ui };
}

describe('Health vault: layouts and SOS (parity rules 3 and 8)', () => {
  it('phone: one SOS bound to the shell; desktop (no provider): none', async () => {
    const sos = vi.fn();
    const phone = mount('phone', {}, { sos });
    await phone.vm.load();
    await settle();
    expect(screen.getAllByRole('button', { name: 'SOS, get help now' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'SOS, get help now' }));
    expect(sos).toHaveBeenCalled();
    cleanup();
    const desktop = mount('desktop');
    await desktop.vm.load();
    await settle();
    expect(screen.queryByRole('button', { name: 'SOS, get help now' })).toBeNull();
    expect(screen.queryByTestId('vault-header-sos')).toBeNull();
  });

  it('phone: rows and a rail of filter cards; desktop: a table, five cards in one row, the toolbar', async () => {
    const phone = mount('phone');
    await phone.vm.load();
    await settle();
    expect(screen.getByTestId('vault-rows')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByTestId('vault-stat-lab')).toHaveAttribute('aria-label', 'Lab reports · 2');
    cleanup();
    const desktop = mount('desktop');
    await desktop.vm.load();
    await settle();
    const table = screen.getByRole('table', { name: 'Your documents, newest first' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(screen.getByTestId('vault-shared-now')).toHaveTextContent('1');
    const v = await axeViolations(desktop.container);
    expect(v, describeViolations(v)).toEqual([]);
  });

  it('never imports lucide-react and draws no raw svg', () => {
    for (const file of ['HealthVaultView.tsx', 'PrescriptionsTab.tsx', 'HealthVaultRoute.tsx']) {
      const source = readFileSync(resolve(process.cwd(), 'src/features/vault/views', file), 'utf8');
      expect(source).not.toMatch(/lucide-react/);
      expect(source).not.toMatch(/<svg[\s>]/);
    }
  });
});

describe('Health vault: documents, filters and shares', () => {
  it('stat cards and chips filter by type; the shared pill follows active shares', async () => {
    const { vm } = mount('desktop');
    await vm.load();
    await settle();
    const row = (title: string) => screen.getByText(title).closest('[role="row"]') as HTMLElement;
    expect(within(row('Doc d3')).getByText('Shared · 1')).toBeInTheDocument();
    expect(within(row('Doc d1')).getByText('Private')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('vault-chip-PRESCRIPTION'));
    expect(screen.getByTestId('vault-chip-PRESCRIPTION')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Doc d1')).toBeNull();
    fireEvent.click(screen.getByTestId('vault-stat-lab'));
    expect(screen.getByTestId('vault-stat-lab')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Doc d1')).toBeInTheDocument();
    expect(screen.queryByText('Doc d3')).toBeNull();
    expect(screen.queryByText(/Linked to ABDM/)).toBeNull();
  });

  it('search with no match offers to show everything', async () => {
    const { vm } = mount('phone');
    await vm.load();
    await settle();
    fireEvent.change(screen.getByLabelText('Search your documents by name'), { target: { value: 'zzz' } });
    expect(screen.getByTestId('vault-no-match')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show everything' }));
    expect(screen.getByText('Doc d1')).toBeInTheDocument();
  });

  it('phone: a row opens its actions; Stop sharing confirms, names the clinician, and reads the server back', async () => {
    let revoked = false;
    const { vm } = mount('phone', {
      '/records/shares': () => ({ items: revoked ? [] : [share('s1', 'd3', 'Dr Menon')] }),
      'POST /records/shares/s1/revoke': () => { revoked = true; return { success: true }; },
    });
    await vm.load();
    await settle();
    fireEvent.click(screen.getByRole('link', { name: /Doc d3/ }));
    const sheet = screen.getByTestId('vault-actions-sheet');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Stop sharing' }));
    const confirm = screen.getByTestId('vault-revoke-sheet');
    expect(confirm).toHaveTextContent('Stop sharing “Doc d3”?');
    expect(confirm).toHaveTextContent(/Dr Menon can no longer open it/);
    fireEvent.click(within(confirm).getByRole('button', { name: 'Stop sharing' }));
    await waitFor(() => expect(screen.queryByTestId('vault-revoke-sheet')).toBeNull());
    await settle();
    expect(screen.getAllByText('Private')).toHaveLength(3);
    expect(screen.queryByText('Shared · 1')).toBeNull();
    expect(screen.queryByTestId('vault-revoke-failed')).toBeNull();
  });

  it('a revoke that fails keeps the document shared and says who can still see it', async () => {
    const { vm } = mount('desktop', { 'POST /records/shares/s1/revoke': new Error('down') });
    await vm.load();
    await settle();
    fireEvent.click(screen.getByTestId('vault-stop-d3'));
    fireEvent.click(within(screen.getByTestId('vault-revoke-sheet')).getByRole('button', { name: 'Stop sharing' }));
    await waitFor(() => expect(screen.getByTestId('vault-revoke-failed')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent(/Dr Test/);
    expect(screen.getByText('Shared · 1')).toBeInTheDocument();
  });

  it('share: days outside 1–90 are refused before sending; a good share posts the same body', async () => {
    const { vm, calls } = mount('desktop');
    await vm.load();
    await settle();
    fireEvent.click(screen.getByTestId('vault-share-d1'));
    const sheet = screen.getByTestId('vault-share-sheet');
    fireEvent.change(within(sheet).getByLabelText('Clinician’s Student Kare email'), { target: { value: 'dr@example.test' } });
    fireEvent.change(within(sheet).getByLabelText('For how many days (1–90)'), { target: { value: '120' } });
    expect(within(sheet).getByRole('button', { name: 'Share' })).toBeDisabled();
    fireEvent.change(within(sheet).getByLabelText('For how many days (1–90)'), { target: { value: '7' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Share' }));
    await settle();
    const post = calls.find((c) => c.init?.method === 'POST' && c.path === '/records/shares');
    expect(post?.init?.body).toBe(JSON.stringify({ documentId: 'd1', clinicianEmail: 'dr@example.test', expiresInDays: 7 }));
  });

  it('offline: the list is read-only; Share, Stop sharing, Add and Export are disabled with a reason', async () => {
    const { vm } = mount('desktop', {}, { online: false });
    await vm.load();
    await settle();
    expect(screen.getByTestId('vault-share-d1')).toBeDisabled();
    expect(screen.getByTestId('vault-stop-d3')).toBeDisabled();
    expect(screen.getByTestId('vault-add')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('vault-export')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getAllByText('Needs a connection').length).toBeGreaterThan(0);
    expect(screen.getByText('Doc d1')).toBeInTheDocument();
  });
});

describe('Health vault: first time, error, tabs', () => {
  it('first time: the empty card offers upload, and verification only to an unverified student', async () => {
    const { vm, links: to } = mount('phone', { '/health/documents': { items: [], total: 0 }, '/records/shares': { items: [] } }, { verified: false });
    await vm.load();
    await settle();
    expect(screen.getByText('Your vault is empty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Upload a document' }));
    expect(to.addDocument).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Get verified first' }));
    expect(to.verify).toHaveBeenCalled();
    // The brief's 3D tile stands in for the canvas art when none is given.
    expect(document.querySelector('[data-icon="3d:vault-alt--p4"]')).not.toBeNull();
  });

  it('error: calm copy and a retry that reads again', async () => {
    let fail = true;
    const { vm, calls } = mount('desktop', { '/health/documents': () => { if (fail) throw new Error('down'); return { items: [doc('d1', 'LAB')], total: 1 }; } });
    await vm.load();
    await settle();
    expect(screen.getByText('Your vault didn’t load')).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await settle();
    expect(calls.filter((c) => c.path.startsWith('/health/documents'))).toHaveLength(2);
    expect(await screen.findByText('Doc d1')).toBeInTheDocument();
  });

  it('tabs: Documents, Prescriptions, Who can see what, Family; the Visit summaries row under them', async () => {
    const { vm, onTabChange, links: to } = mount('phone');
    await vm.load();
    await settle();
    const tabs = screen.getByRole('tablist', { name: 'Health records sections' });
    expect(within(tabs).getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Documents', 'Prescriptions', 'Who can see what', 'Family']);
    fireEvent.click(within(tabs).getByRole('tab', { name: 'Prescriptions' }));
    expect(onTabChange).toHaveBeenCalledWith('prescriptions');
    fireEvent.click(screen.getByRole('link', { name: /Visit summaries/ }));
    expect(to.visitSummaries).toHaveBeenCalled();
  });

  it('the Prescriptions tab draws both sections on one panel', async () => {
    const { vm } = mount('desktop', {
      '/prescriptions': { items: [{ id: 'rx12345678', issuedAt: 1_760_000_000, validUntil: 4_000_000_000, status: 'ISSUED', advice: 'With food.', prescriberRegNo: 'NMC-1',
        items: [{ id: 'i1', genericName: 'Paracetamol', brandName: '', strength: '500 mg', dose: '1 tablet', frequency: 'Twice a day', durationDays: 5, quantity: 10, scheduleClass: 'OTC' }],
        allergyCheck: { conflicts: [{ substance: 'Penicillin', flag: 'ALLERGY' }] } },
        { id: 'rx00000000', issuedAt: 1_700_000_000, validUntil: 1_700_000_001, status: 'ISSUED', advice: '', prescriberRegNo: '', items: [], allergyCheck: {} }], total: 2 },
      '/lab-orders': { items: [{ id: 'lab-1', testPanel: ['Lipid profile'], status: 'BOOKED', sampleId: '', collectorName: '', fastingRequired: true, collectionMode: 'HOME', criticalFlag: false, rejectionReason: '', createdAt: 1_760_000_000, reviewNote: '', orderedByDoctor: '', paymentStatus: 'UNPAID' }], total: 1 },
    }, { tab: 'prescriptions' });
    await vm.load();
    await settle();
    expect(await screen.findByText('Medicines: 1')).toBeInTheDocument();
    // The allergy line is a red alert; an expired prescription has no Send.
    expect(screen.getByTestId('vault-rx-rx12345678-allergy')).toHaveAttribute('role', 'alert');
    expect(screen.getByRole('button', { name: 'Send prescription rx123456 to a pharmacy' })).toBeInTheDocument();
    expect(screen.getByTestId('vault-rx-rx00000000-status')).toHaveTextContent('Expired');
    expect(screen.queryByRole('button', { name: 'Send prescription rx000000 to a pharmacy' })).toBeNull();
    expect(screen.getByText('Awaiting payment')).toBeInTheDocument();
    expect(screen.queryByText(/₹/)).toBeNull();
  });
});
