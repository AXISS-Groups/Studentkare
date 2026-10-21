import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { apiRequest } from '@/data/services/http';
import { VaultWorkspaceHub } from '../VaultWorkspaceHub';

vi.mock('@/data/services/http', () => ({ apiRequest: vi.fn() }));
vi.mock('../../workspace/MemberPanels', () => ({ RecordsPanel: () => <p>records panel</p> }));
const mocked = vi.mocked(apiRequest);

describe('VaultWorkspaceHub', () => {
  it('family tab (Care circle board) grants nothing and says sharing is not available', () => {
    render(<VaultWorkspaceHub />);
    fireEvent.click(screen.getByRole('tab', { name: 'Family' }));
    expect(screen.getByText(/isn’t available yet/)).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/Grant Family Access|Revoke/);
    expect(mocked).not.toHaveBeenCalled();
  });

  it('access tab (Consent inbox board) has no approve or deny buttons, only real shares', async () => {
    mocked.mockResolvedValue({ items: [] });
    render(<VaultWorkspaceHub />);
    fireEvent.click(screen.getByRole('tab', { name: 'Access and your data' }));
    expect(screen.queryByRole('button', { name: /approve|deny|allow/i })).toBeNull();
    expect(mocked.mock.calls[0]?.[0]).toBe('/records/shares');
    fireEvent.click(await screen.findByRole('button', { name: 'Open health records' }));
    expect(screen.getByText('records panel')).toBeTruthy();
  });

  it('a failed load of shares is an error, never an empty list', async () => {
    mocked.mockRejectedValue(new Error('down'));
    render(<VaultWorkspaceHub />);
    fireEvent.click(screen.getByRole('tab', { name: 'Access and your data' }));
    expect(await screen.findByText('Couldn’t load your shares')).toBeTruthy();
    expect(screen.queryByText('No one can see your records right now.')).toBeNull();
  });
});
