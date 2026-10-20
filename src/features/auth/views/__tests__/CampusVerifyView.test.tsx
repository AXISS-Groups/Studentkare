import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiRequest } from '@/data/services/http';
import { CampusVerifyView } from '../CampusVerifyView';

vi.mock('@/data/services/http', () => ({ apiRequest: vi.fn() }));
const mocked = vi.mocked(apiRequest);
const onLeaving = vi.fn();

const PARTNERS = { items: [{ name: 'VNR VJIET' }, { name: 'Sreenidhi University' }] };

async function open(status: Record<string, unknown> = { status: 'NOT_SUBMITTED', university: '', rollNumber: '' }, partners: unknown = PARTNERS) {
  mocked.mockImplementation((path: string) => {
    if (path === '/campus/verification') return Promise.resolve(status) as never;
    if (path === '/campus/partners') return (partners instanceof Error ? Promise.reject(partners) : Promise.resolve(partners)) as never;
    return Promise.resolve({}) as never;
  });
  render(<CampusVerifyView onLeaving={onLeaving} />);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => { mocked.mockReset(); onLeaving.mockReset(); });

describe('Find your campus (canvas CampusVerify)', () => {
  it('lists the campuses the server returns, not a list in the app', async () => {
    await open();
    expect(mocked).toHaveBeenCalledWith('/campus/partners', expect.anything());
    const radios = await screen.findAllByRole('radio');
    expect(radios.map((r) => r.textContent)).toEqual(['VNR VJIET', 'Sreenidhi University']);
    expect(screen.getByText('2 matches')).toBeInTheDocument();
    for (const icon of ['search-2', 'house-door', 'info-2']) expect(document.querySelector(`[data-icon="${icon}"]`)).not.toBeNull();
  });

  it('filters by the search box and selects with a check', async () => {
    await open();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'sree' } });
    expect(screen.getAllByRole('radio')).toHaveLength(1);
    fireEvent.click(screen.getByRole('radio', { name: 'Sreenidhi University' }));
    expect(screen.getByRole('radio', { name: 'Sreenidhi University' })).toHaveAttribute('aria-checked', 'true');
    expect(document.querySelector('[data-icon="check"]')).not.toBeNull();
  });

  it('submits the picked campus and the roll number', async () => {
    await open();
    fireEvent.click(await screen.findByRole('radio', { name: 'VNR VJIET' }));
    const go = screen.getByRole('button', { name: 'Continue' });
    expect(go).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/roll number/i), { target: { value: ' 22B01 ' } });
    fireEvent.click(go);
    await waitFor(() => expect(mocked).toHaveBeenCalledWith('/campus/verification', expect.objectContaining({ method: 'POST' })));
    const call = mocked.mock.calls.find(([path, init]) => path === '/campus/verification' && init?.method === 'POST');
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ university: 'VNR VJIET', rollNumber: '22B01' });
  });

  it('"My campus isn\'t here" lets the student type the name', async () => {
    await open();
    fireEvent.click(await screen.findByRole('button', { name: /my campus isn.t here/i }));
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByLabelText('College or university')).toBeInTheDocument();
  });

  it('falls back to typing when the list cannot be loaded, and says so', async () => {
    await open(undefined, new Error('offline'));
    expect(await screen.findByLabelText('College or university')).toBeInTheDocument();
    expect(screen.getByText(/partner list couldn.t be loaded/i)).toBeInTheDocument();
  });

  it('falls back to typing when no campus is a partner yet', async () => {
    await open(undefined, { items: [] });
    expect(await screen.findByLabelText('College or university')).toBeInTheDocument();
  });

  it('a verified student sees that, and the way to leaving campus', async () => {
    await open({ status: 'VERIFIED', university: 'VNR VJIET', rollNumber: 'R1' });
    expect(await screen.findByText(/verified/i)).toBeInTheDocument();
    expect(screen.queryByRole('radio')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /leaving campus/i }));
    expect(onLeaving).toHaveBeenCalled();
  });

  it('shows a pending submission as pending', async () => {
    await open({ status: 'PENDING', university: 'VNR VJIET', rollNumber: 'R1' });
    expect(await screen.findByText(/current status/i)).toBeInTheDocument();
  });
});
