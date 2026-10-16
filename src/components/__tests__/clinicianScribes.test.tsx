import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/data/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../../data/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

import { NMCDoctorEPrescriptionScribe } from '../NMCDoctorEPrescriptionScribe';
import { ThemeProvider } from '../../theme/theme';
import { IntegratedTeleconsultSoapScribe } from '../clinician/IntegratedTeleconsultSoapScribe';

describe('NMCDoctorEPrescriptionScribe', () => {
  it('never claims a prescription was signed or dispatched', () => {
    render(<ThemeProvider><NMCDoctorEPrescriptionScribe patientId="p1" patientName="Test" patientAllergies={[]} /></ThemeProvider>);
    const sign = screen.getByText('Sign and send to pharmacy');
    fireEvent.click(sign);
    expect(screen.queryByText(/dispatched/i)).toBeNull();
    expect(screen.queryByText(/digitally signed/i)).toBeNull();
    expect(screen.getAllByText(/Nothing has been signed or sent/).length).toBeGreaterThan(0);
  });

  it('does not invent a dose, frequency or duration for an added drug', () => {
    render(<ThemeProvider><NMCDoctorEPrescriptionScribe patientId="p1" patientName="Test" patientAllergies={[]} /></ThemeProvider>);
    fireEvent.change(screen.getByLabelText('Brand name (e.g. Augmentin 625)'), { target: { value: 'Brand' } });
    fireEvent.change(screen.getByLabelText('Molecule / active salt (e.g. Amoxicillin)'), { target: { value: 'Molecule' } });
    fireEvent.click(screen.getByText('Add drug'));
    expect(screen.getByText('No drugs added yet.')).toBeTruthy();
    expect(screen.queryByText(/500mg|BD \(After Food\)/)).toBeNull();
  });
});

describe('IntegratedTeleconsultSoapScribe', () => {
  it('does not offer an AI voice scribe that does not exist', () => {
    render(<IntegratedTeleconsultSoapScribe />);
    expect(screen.queryByText(/AI Voice Scribe/i)).toBeNull();
    expect(screen.queryByText(/AI SOAP/i)).toBeNull();
    expect(screen.getByText(/Notes typed here aren’t saved/)).toBeTruthy();
  });
});
