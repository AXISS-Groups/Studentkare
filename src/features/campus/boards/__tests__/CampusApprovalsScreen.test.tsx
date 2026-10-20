import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';

vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: vi.fn() }));

import { ApiError } from '@/data/services/http';
import { CampusApprovalsScreen, maskEmail } from '../CampusApprovalsScreen';
import type { ApprovalsSource, PendingStudent } from '../CampusApprovalsScreen';

const flush = () => act(async () => { for (let i = 0; i < 4; i += 1) await Promise.resolve(); });

const KABIR: PendingStudent = { accountId: 'a1', fullName: 'Kabir Joshi', email: 'kabir@vnrvjiet.in', university: 'VNR VJIET', rollNumber: '22B81A0577' };
const SRI: PendingStudent = { accountId: 'a2', fullName: 'Sri Valli', email: 'sri@vnrvjiet.in', university: 'VNR VJIET', rollNumber: '21B81A0412' };

function source(pending: PendingStudent[] | Error, decide = vi.fn(async () => undefined)): ApprovalsSource & { load: ReturnType<typeof vi.fn>; decide: typeof decide } {
  return { load: vi.fn(() => (pending instanceof Error ? Promise.reject(pending) : Promise.resolve(pending))), decide };
}

describe('maskEmail', () => {
  it('keeps the first letter and the domain only', () => {
    expect(maskEmail('kabir@vnrvjiet.in')).toBe('k•••••@vnrvjiet.in');
    expect(maskEmail('')).toBe('');
  });
});

describe('CampusApprovalsScreen', () => {
  it('shows a labelled skeleton while loading', () => {
    render(<CampusApprovalsScreen source={{ load: () => new Promise(() => undefined), decide: vi.fn() }} />);
    expect(screen.getByRole('status', { name: 'Loading the verification queue' })).toBeInTheDocument();
  });

  it('lists the real queue with masked emails; unsourced figures and the funnel say not connected', async () => {
    const { container } = render(<CampusApprovalsScreen source={source([KABIR, SRI])} />);
    await flush();
    expect(screen.getByRole('heading', { level: 1, name: 'Verification queue' })).toBeInTheDocument();
    expect(screen.getByText('Pending').parentElement).toHaveTextContent('2');
    for (const label of ['Auto-verified', 'Median decision', 'Rejected, 30 days']) expect(screen.getByText(label).parentElement).toHaveTextContent('—');
    expect(screen.getByText('The sign-up funnel isn’t connected yet')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Verification queue' });
    expect(within(table).getByText('k•••••@vnrvjiet.in')).toBeInTheDocument();
    expect(within(table).queryByText('kabir@vnrvjiet.in')).toBeNull();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('confirms enrolment through the real decision, then reloads the queue', async () => {
    const live = source([KABIR]);
    render(<CampusApprovalsScreen source={live} />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Review Kabir Joshi' }));
    const drawer = screen.getByRole('dialog', { name: 'Kabir Joshi' });
    expect(within(drawer).getByText('Needs a decision')).toBeInTheDocument();
    expect(within(drawer).getByText('No automatic checks yet')).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Confirm enrolled' }));
    await flush();
    expect(live.decide).toHaveBeenCalledWith('a1', 'VERIFIED');
    expect(live.load).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Kabir Joshi is confirmed as enrolled.')).toBeInTheDocument();
  });

  it('rejects, and explains when the server refuses a self-review', async () => {
    const live = source([KABIR], vi.fn(async () => { throw new ApiError('own', 403); }));
    render(<CampusApprovalsScreen source={live} />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Review Kabir Joshi' }));
    const drawer = screen.getByRole('dialog', { name: 'Kabir Joshi' });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Reject' }));
    await flush();
    expect(live.decide).toHaveBeenCalledWith('a1', 'REJECTED');
    expect(within(drawer).getByRole('alert')).toHaveTextContent('Another campus admin must review it');
  });

  it('fails closed when the account has no campus (403), and shows the error and empty states', async () => {
    const { unmount } = render(<CampusApprovalsScreen source={source(new ApiError('no campus', 403))} />);
    await flush();
    expect(screen.getByRole('heading', { name: 'Your account isn’t linked to a campus yet' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    unmount();
    const second = render(<CampusApprovalsScreen source={source(new ApiError('down', 500))} />);
    await flush();
    expect(screen.getByText('Ref ERR-500 · CampusApprovals')).toBeInTheDocument();
    second.unmount();
    render(<CampusApprovalsScreen source={source([])} />);
    await flush();
    expect(screen.getByRole('heading', { name: 'No one is waiting for verification.' })).toBeInTheDocument();
  });
});
