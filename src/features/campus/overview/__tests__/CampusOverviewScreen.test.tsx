import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';

const navigate = vi.fn();
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: (route: string) => navigate(route) }));

import { CampusOverviewScreen } from '../CampusOverviewScreen';
import type { CampusOverviewSource } from '../campusOverviewSource';
import type { CampusOverviewInput } from '../campusOverviewModel';
import { CampusScopeContext } from '@/features/campus/console/campusScope';

const nowSeconds = () => Math.floor(Date.now() / 1000);
const source = (input: CampusOverviewInput | Error): CampusOverviewSource & { load: ReturnType<typeof vi.fn> } => ({
  load: vi.fn(() => (input instanceof Error ? Promise.reject(input) : Promise.resolve(input))),
});
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

function renderOverview(src: CampusOverviewSource) {
  return render(
    <div className="sk-ds">
      <CampusScopeContext.Provider value={{ id: 'campus', label: 'Whole campus' }}>
        <CampusOverviewScreen source={src} />
      </CampusScopeContext.Provider>
    </div>,
  );
}

afterEach(() => navigate.mockReset());

describe('CampusOverviewScreen', () => {
  it('shows a labelled skeleton while loading', () => {
    renderOverview({ load: () => new Promise(() => undefined) });
    expect(screen.getByRole('status', { name: 'Loading overview' })).toHaveAttribute('aria-busy', 'true');
  });

  it('draws the board from real counts, with every unsourced tile "not connected"', async () => {
    const live = source({
      pending: { ok: true, value: [{ accountId: 'a' }, { accountId: 'b' }, { accountId: 'c' }] },
      sos: { ok: true, value: [{ status: 'ACTIVE', createdAt: nowSeconds() - 18 * 60 }] },
    });
    renderOverview(live);
    await flush();
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText(/Everything below is scoped to Whole campus · updated at/)).toBeInTheDocument();

    const tiles = within(screen.getByRole('list', { name: 'Campus at a glance' })).getAllByRole('link');
    expect(tiles).toHaveLength(6);
    expect(tiles[1]).toHaveTextContent(/To verify\s*3\s*pending/);
    expect(tiles[4]).toHaveTextContent(/Open SOS alerts\s*1\s*live/);
    expect(tiles[4]).toHaveTextContent('Oldest raised 18 min ago');
    for (const index of [0, 2, 3, 5]) expect(tiles[index]).toHaveTextContent(/—\s*not connected/);

    const attention = screen.getByRole('region', { name: 'Needs attention' });
    const rows = within(attention).getAllByRole('link');
    expect(rows[0]).toHaveTextContent('An SOS alert is waiting for acknowledgement');
    expect(rows[1]).toHaveTextContent('3 students waiting for verification');
    fireEvent.click(rows[1]);
    expect(navigate).toHaveBeenCalledWith('campus/verification');

    expect(screen.getByText(/no screening or vaccination source reports/)).toBeInTheDocument();
    expect(screen.getByText(/Individual health data is never shown here/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Download report ?, not available yet$/ })).toBeDisabled();
    // Header button and quick action, as on the canvas; both open Health camps.
    const plan = screen.getAllByRole('link', { name: 'Plan a camp' });
    expect(plan).toHaveLength(2);
    fireEvent.click(plan[0]);
    expect(navigate).toHaveBeenCalledWith('campus/camps');
  });

  it('draws every icon the brief names for the board content', async () => {
    const { container } = renderOverview(source({
      pending: { ok: true, value: [{ accountId: 'a' }] },
      sos: { ok: true, value: [{ status: 'ACTIVE', createdAt: nowSeconds() }] },
    }));
    await flush();
    const drawn = new Set(Array.from(container.querySelectorAll('[data-icon]')).map((node) => node.getAttribute('data-icon')));
    for (const name of ['download-2', 'plus', 'alert-circle', 'arrow-right', 'bar-chart', 'upload', 'alert-triangle-2', 'user', 'alert-triangle', 'info']) {
      expect(drawn, name).toContain(name);
    }
  });

  it('shows the empty state with one next step when nothing is waiting', async () => {
    renderOverview(source({ pending: { ok: true, value: [] }, sos: { ok: true, value: [] } }));
    await flush();
    expect(screen.getByRole('heading', { name: 'Nothing in overview yet.' })).toBeInTheDocument();
    expect(document.querySelector('[data-icon="3d:chart-alt--p4"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Import students' }));
    expect(navigate).toHaveBeenCalledWith('campus/students');
  });

  it('shows the calm error with a reference, and retries', async () => {
    const failing = source({ pending: { ok: false, status: 503 }, sos: { ok: false, status: 503 } });
    renderOverview(failing);
    await flush();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load overview');
    expect(alert).toHaveTextContent('Ref ERR-503 · CampusOverview');
    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await flush();
    expect(failing.load).toHaveBeenCalledTimes(2);
  });

  it('says plainly when the account has no campus, instead of an error or zeros', async () => {
    renderOverview(source({ pending: { ok: false, status: 403 }, sos: { ok: false, status: 403 } }));
    await flush();
    expect(screen.getByRole('heading', { name: 'Your account isn’t linked to a campus yet' })).toBeInTheDocument();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('has no axe violations with data', async () => {
    const { container } = renderOverview(source({ pending: { ok: true, value: [{ accountId: 'a' }] }, sos: { ok: true, value: [] } }));
    await flush();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
