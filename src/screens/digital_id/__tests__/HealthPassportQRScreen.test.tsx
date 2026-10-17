import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { apiRequest } from '@/data/http';
import type { MemberProfile } from '@/data/workflowTypes';
import { HealthPassportQRScreen } from '../HealthPassportQRScreen';

vi.mock('@/data/http', () => ({ apiRequest: vi.fn() }));
const mocked = vi.mocked(apiRequest);

const profile = (overrides: Partial<MemberProfile> = {}): MemberProfile => ({
  id: 'acc_1', fullName: 'Test Member', role: 'STUDENT', email: 't@example.test', phone: '',
  dob: '', university: '', rollNumber: '', bloodGroup: '', ageVerified: true, isVerifiedStudent: false,
  emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
  allergies: [], chronicConditions: [], updatedAt: null,
  ...overrides,
});


describe('HealthPassportQRScreen', () => {
  it('shows only what the member saved and never invents health values', async () => {
    mocked.mockResolvedValue(profile());
    render(<HealthPassportQRScreen />);
    expect(await screen.findByText('Test Member')).toBeTruthy();
    expect(screen.getByText('No allergies added yet')).toBeTruthy();
    expect(screen.getByText(/No emergency contact yet/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Aarav|Penicillin|Peanuts|O\+|IIT Hyderabad|98765|Dr\./);
  });

  it('renders the saved blood group, allergies and contact from /profile', async () => {
    mocked.mockResolvedValue(profile({ bloodGroup: 'B-', allergies: ['Latex'], emergencyContactName: 'Kin', emergencyContactPhone: '+91 00000 00000', emergencyContactRelation: 'Sibling' }));
    render(<HealthPassportQRScreen />);
    expect(await screen.findByText('B-')).toBeTruthy();
    expect(screen.getByText('Latex')).toBeTruthy();
    expect(screen.getByText('+91 00000 00000')).toBeTruthy();
    expect(mocked).toHaveBeenCalledWith('/profile', expect.anything());
  });

  it('fails closed: a failed request shows the error, not a placeholder passport', async () => {
    // vi.fn tracks settled results, which would otherwise report this
    // rejection as unhandled before the hook's own catch runs.
    mocked.mockImplementation(() => { const failed = Promise.reject(new Error('Network down')); failed.catch(() => undefined); return failed; });
    render(<HealthPassportQRScreen />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Network down');
    expect(screen.queryByText('BLOOD GROUP')).toBeNull();
  });
});
