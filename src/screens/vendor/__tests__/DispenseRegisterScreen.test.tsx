import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DispenseRegisterScreen } from '../DispenseRegisterScreen';

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
    expect(screen.getByText('H1 ENTRIES THIS MONTH')).toBeInTheDocument();
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

    expect(screen.getByRole('dialog', { name: /Azee 500 → Azithral 500/i })).toBeInTheDocument();
    expect(screen.getByText(/SUBSTITUTION REQUESTED/i)).toBeInTheDocument();
    expect(screen.getByText(/S. Kulkarni · D.Pharm TS-44120/i)).toBeInTheDocument();

    const signBtn = screen.getByRole('button', { name: /Sign and dispense/i });
    fireEvent.click(signBtn);

    expect(screen.getByText(/signed & dispensed by Pharmacist S. Kulkarni/i)).toBeInTheDocument();
  });

  it('logs a new manual statutory entry', () => {
    render(<DispenseRegisterScreen />);
    const logBtn = screen.getByRole('button', { name: /Log statutory entry/i });
    fireEvent.click(logBtn);

    expect(screen.getByRole('dialog', { name: /Log Manual Prescription Dispense/i })).toBeInTheDocument();

    const drugInput = screen.getByPlaceholderText(/e.g. Amoxicillin \+ Clavulanic Acid 625mg/i);
    fireEvent.change(drugInput, { target: { value: 'Doxycycline 100mg' } });

    const patientInput = screen.getByPlaceholderText(/e.g. Rohan Sen/i);
    fireEvent.change(patientInput, { target: { value: 'Karan Mehra' } });

    fireEvent.click(screen.getByRole('button', { name: /Record Statutory Entry/i }));

    expect(screen.getByText(/Statutory audit entry/i)).toBeInTheDocument();
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

    expect(screen.getByText(/Schedule H1 statutory register downloaded as CSV/i)).toBeInTheDocument();
    expect(clickMock).toHaveBeenCalled();
  });
});
