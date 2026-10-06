import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PartnerStaffScreen } from '../PartnerStaffScreen';

vi.mock('@/data/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'demo-pharmacy',
      fullName: 'MedPlus Bachupally',
      role: 'VENDOR',
      email: 'pharmacy@studentkare.test',
    },
    logout: vi.fn(),
  }),
}));

vi.mock('@/lib/workflowRouting', () => ({
  navigate: vi.fn(),
  homeForRole: vi.fn((role: string) => (role === 'SUPER_ADMIN' ? 'admin' : role === 'VENDOR' ? 'vendor' : 'health')),
}));

describe('PartnerStaffScreen', () => {
  it('renders heading, subtitle, and table columns', () => {
    render(<PartnerStaffScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Staff & roles' })).toBeInTheDocument();
    expect(
      screen.getByText(/MedPlus · Bachupally · everyone who can scan a student’s pass here/i)
    ).toBeInTheDocument();

    expect(screen.getByText('NAME')).toBeInTheDocument();
    expect(screen.getByText('ROLE')).toBeInTheDocument();
    expect(screen.getByText('COUNCIL REG.')).toBeInTheDocument();
    expect(screen.getByText('STATUS')).toBeInTheDocument();
    expect(screen.getByText('LAST SCAN')).toBeInTheDocument();
    expect(screen.getByText('SCANS · 7D')).toBeInTheDocument();
    expect(screen.getByText('STOPS')).toBeInTheDocument();
  });

  it('renders initial staff rows and policy guidance cards', () => {
    render(<PartnerStaffScreen />);
    expect(screen.getByText('Ravi K.')).toBeInTheDocument();
    expect(screen.getByText('TSPC 45821')).toBeInTheDocument();
    expect(screen.getByText('Sunita M.')).toBeInTheDocument();
    expect(screen.getByText('Imran S.')).toBeInTheDocument();
    expect(screen.getByText('Deepa R.')).toBeInTheDocument();
    expect(screen.getByText('Arjun P.')).toBeInTheDocument();

    expect(screen.getByText(/Why roles matter:/i)).toBeInTheDocument();
    expect(screen.getByText(/When someone leaves,/i)).toBeInTheDocument();
  });

  it('opens add staff drawer and sends invite for counter staff', () => {
    render(<PartnerStaffScreen />);
    const addStaffBtn = screen.getByRole('button', { name: 'Add staff' });
    fireEvent.click(addStaffBtn);

    expect(screen.getByRole('dialog', { name: 'Add staff' })).toBeInTheDocument();

    // Fill form
    const nameInput = screen.getByLabelText(/Staff member full name/i);
    const phoneInput = screen.getByLabelText(/10-digit mobile number/i);
    fireEvent.change(nameInput, { target: { value: 'Pooja V.' } });
    fireEvent.change(phoneInput, { target: { value: '9876543210' } });

    // Pick Counter staff role
    const counterRoleBtn = screen.getByRole('button', { name: /Counter staff/i });
    fireEvent.click(counterRoleBtn);

    // Click Send invite
    const inviteBtn = screen.getByRole('button', { name: /Send invite/i });
    fireEvent.click(inviteBtn);

    expect(screen.getByText('Pooja V.')).toBeInTheDocument();
    expect(screen.getByText(/Invite sent by SMS · they sign in to the staff app/i)).toBeInTheDocument();
  });

  it('requires state pharmacy council registration when adding a pharmacist', () => {
    render(<PartnerStaffScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Add staff' }));

    const nameInput = screen.getByLabelText(/Staff member full name/i);
    const phoneInput = screen.getByLabelText(/10-digit mobile number/i);
    fireEvent.change(nameInput, { target: { value: 'Suresh N.' } });
    fireEvent.change(phoneInput, { target: { value: '9848022338' } });

    // Pick Pharmacist role
    const pharmacistRoleBtn = screen.getByRole('button', { name: /Pharmacist/i });
    fireEvent.click(pharmacistRoleBtn);

    // Registration field should appear
    const regInput = screen.getByLabelText(/State Pharmacy Council Registration/i);
    expect(regInput).toBeInTheDocument();

    // Invite button disabled without registration
    const inviteBtn = screen.getByRole('button', { name: /Send invite/i });
    expect(inviteBtn).toBeDisabled();

    // Fill registration
    fireEvent.change(regInput, { target: { value: 'TSPC 89012' } });
    expect(inviteBtn).not.toBeDisabled();

    fireEvent.click(inviteBtn);
    expect(screen.getByText('Suresh N.')).toBeInTheDocument();
    expect(screen.getByText('TSPC 89012')).toBeInTheDocument();
  });

  it('opens confirmation dialog and removes staff member', () => {
    render(<PartnerStaffScreen />);
    const removeSunitaBtn = screen.getByRole('button', { name: 'Remove Sunita M.' });
    fireEvent.click(removeSunitaBtn);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/Remove Sunita M.\?/i)).toBeInTheDocument();

    // Confirm removal
    const confirmBtn = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(confirmBtn);

    expect(screen.getByText(/Removed · signed out of the staff app now/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Sunita M.' })).not.toBeInTheDocument();
  });

  it('supports cross navigation via sidebar links', () => {
    const onNavigate = vi.fn();
    render(<PartnerStaffScreen onNavigate={onNavigate} />);

    const rxBtn = screen.getByRole('button', { name: /Rx review/i });
    fireEvent.click(rxBtn);
    expect(onNavigate).toHaveBeenCalledWith('rx-review');

    const settlementBtn = screen.getByRole('button', { name: /Settlement/i });
    fireEvent.click(settlementBtn);
    expect(onNavigate).toHaveBeenCalledWith('settlement');
  });
});
