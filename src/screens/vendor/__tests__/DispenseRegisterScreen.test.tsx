import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DispenseRegisterScreen } from '../DispenseRegisterScreen';

vi.mock('@/data/contexts/AuthContext', () => ({
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

vi.mock('@/lib/utils/workflowRouting', () => ({
  navigate: vi.fn(),
  homeForRole: vi.fn((role: string) => (role === 'SUPER_ADMIN' ? 'admin' : role === 'VENDOR' ? 'vendor' : 'health')),
}));

describe('DispenseRegisterScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders title, eyebrow, and top stats', () => {
    render(<DispenseRegisterScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Dispensing register' })).toBeInTheDocument();
    expect(screen.getByText(/SCHEDULE H1 · RETAINED THREE YEARS/i)).toBeInTheDocument();
    expect(screen.getByText('AWAITING SIGN-OFF')).toBeInTheDocument();
    expect(screen.getByText('H1 ENTRIES')).toBeInTheDocument();
    expect(screen.getByText('REFUSED')).toBeInTheDocument();
    expect(screen.getByText('REGISTER GAPS')).toBeInTheDocument();
  });

  it('renders table headers and statutory column definitions', () => {
    render(<DispenseRegisterScreen />);
    expect(screen.getByText('ENTRY')).toBeInTheDocument();
    expect(screen.getByText('DRUG DISPENSED')).toBeInTheDocument();
    expect(screen.getByText('PRESCRIBER')).toBeInTheDocument();
    expect(screen.getByText('PATIENT')).toBeInTheDocument();
    expect(screen.getByText('STATE')).toBeInTheDocument();
  });

  it('renders Schedule H1 initial rows', () => {
    render(<DispenseRegisterScreen />);
    expect(screen.getByText('REG-4412')).toBeInTheDocument();
    expect(screen.getByText('Azithromycin 500 mg')).toBeInTheDocument();
    expect(screen.getByText('Dr. Ananya Reddy')).toBeInTheDocument();
    expect(screen.getByText('NMC-TS-88412')).toBeInTheDocument();
  });

  it('filters rows by switching tabs', () => {
    render(<DispenseRegisterScreen />);
    const allTab = screen.getByRole('tab', { name: /All dispenses/i });
    fireEvent.click(allTab);

    expect(screen.getByText('Paracetamol 650 mg')).toBeInTheDocument();
    expect(screen.getByText('Amoxicillin 500 mg')).toBeInTheDocument();
  });

  it('filters rows via search bar', () => {
    render(<DispenseRegisterScreen />);
    const searchInput = screen.getByLabelText(/Search dispensing register/i);
    fireEvent.change(searchInput, { target: { value: 'Alprazolam' } });

    expect(screen.getByText('Alprazolam 0.25 mg')).toBeInTheDocument();
    expect(screen.queryByText('Azithromycin 500 mg')).not.toBeInTheDocument();
  });

  it('opens substitution sign-off drawer and completes pharmacist dispense', () => {
    render(<DispenseRegisterScreen />);
    const pendingRow = screen.getByLabelText(/Dispense record REG-4412/i);
    fireEvent.click(pendingRow);

    expect(screen.getByRole('dialog', { name: /Azithromycin 500 mg/i })).toBeInTheDocument();
    expect(screen.getByText(/SUBSTITUTION REQUESTED/i)).toBeInTheDocument();

    const signBtn = screen.getByRole('button', { name: /Sign and dispense/i });
    fireEvent.click(signBtn);

    expect(screen.getByText(/Entry REG-4412 marked signed on this screen. It is not saved to the server./i)).toBeInTheDocument();
  });

  it('logs a new manual statutory entry', () => {
    render(<DispenseRegisterScreen />);
    const logBtn = screen.getByRole('button', { name: /Log statutory entry/i });
    fireEvent.click(logBtn);

    expect(screen.getByRole('dialog', { name: /Log a manual prescription dispense/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Medicine name and strength/i), { target: { value: 'Doxycycline 100mg' } });
    fireEvent.change(screen.getByLabelText(/Prescribing doctor/i), { target: { value: 'Dr. Test Prescriber' } });
    fireEvent.change(screen.getByLabelText(/reg. no./i), { target: { value: 'NMC-TEST-1' } });
    fireEvent.change(screen.getByLabelText(/Student \/ patient name/i), { target: { value: 'Karan Mehra' } });
    fireEvent.change(screen.getByLabelText(/ID you checked/i), { target: { value: 'Photo ID checked' } });
    fireEvent.change(screen.getByLabelText(/Manufacturer batch no./i), { target: { value: 'BATCH-1' } });

    fireEvent.click(screen.getByRole('button', { name: /Record statutory entry/i }));

    expect(screen.getByText(/added on this screen only. It is not saved to the server/i)).toBeInTheDocument();
    expect(screen.getByText('Doxycycline 100mg')).toBeInTheDocument();
    expect(screen.getByText('Karan Mehra')).toBeInTheDocument();
  });

  it('exports Schedule H1 register as CSV', () => {
    const clickMock = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName === 'a') {
        el.click = clickMock;
      }
      return el;
    });

    render(<DispenseRegisterScreen />);
    const exportBtn = screen.getByRole('button', { name: /Export Schedule H1/i });
    fireEvent.click(exportBtn);

    expect(screen.getByText(/Schedule H1 entries on this screen downloaded as CSV/i)).toBeInTheDocument();
    expect(clickMock).toHaveBeenCalled();
  });

  it('is honest: no fabricated pharmacist, prescriber defaults, passed checks or zero-gap claim', () => {
    render(<DispenseRegisterScreen />);
    expect(screen.getByRole('note')).toHaveTextContent(/not connected to the server/i);
    expect(screen.queryByText('Every dispense has an entry')).not.toBeInTheDocument();
    expect(screen.queryByText(/MedPlus/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Dispense record REG-4412/i));
    expect(screen.queryByText(/Kulkarni/)).not.toBeInTheDocument();
    expect(screen.getByText(/This screen has not checked them/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Close panel/i }));

    fireEvent.click(screen.getByRole('button', { name: /Log statutory entry/i }));
    expect(screen.getByLabelText(/Prescribing doctor/i)).toHaveValue('');
    expect(screen.getByLabelText(/reg. no./i)).toHaveValue('');
    expect(screen.getByLabelText(/Manufacturer batch no./i)).toHaveValue('');
  });
});
