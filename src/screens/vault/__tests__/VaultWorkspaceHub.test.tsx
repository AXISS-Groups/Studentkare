import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { apiRequest } from '@/data/services/http';
import { VaultWorkspaceHub } from '../VaultWorkspaceHub';

vi.mock('@/data/services/http', () => ({ apiRequest: vi.fn() }));
vi.mock('../../workspace/MemberPanels', () => ({ RecordsPanel: () => <p>records panel</p> }));
const mocked = vi.mocked(apiRequest);

describe('VaultWorkspaceHub', () => {
  it('family tab grants nothing and says sharing is not available', () => {
    render(<VaultWorkspaceHub />);
    fireEvent.click(screen.getByRole('tab', { name: 'Family' }));
    expect(screen.getByRole('status').textContent).toMatch(/isn’t available yet/);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(document.body.textContent).not.toMatch(/ACTIVE|Grant Family Access|Revoke/);
    expect(mocked).not.toHaveBeenCalled();
  });

  it('access tab has no approve or deny buttons, only real actions', () => {
    render(<VaultWorkspaceHub />);
    fireEvent.click(screen.getByRole('tab', { name: 'Access and your data' }));
    expect(screen.queryByRole('button', { name: /approve|deny/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Download my data' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open health records' }));
    expect(screen.getByText('records panel')).toBeTruthy();
  });

  it('a failed export shows the error and downloads nothing', async () => {
    mocked.mockRejectedValueOnce(new Error('Export failed.'));
    const createUrl = vi.fn();
    URL.createObjectURL = createUrl;
    render(<VaultWorkspaceHub />);
    fireEvent.click(screen.getByRole('tab', { name: 'Access and your data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download my data' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(createUrl).not.toHaveBeenCalled();
    expect(mocked).toHaveBeenCalledWith('/records/export');
  });
});
