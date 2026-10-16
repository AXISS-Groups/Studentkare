import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MemberProfile } from '@/data/types/workflowTypes';
import { EmergencyCardViewModel, isValidIndianMobile } from '../../viewmodel/EmergencyCardViewModel';
import { EmergencyCardView } from '../WebEmergencyCard';

type Requester = typeof import('@/data/http').apiRequest;
const profile = (over: Partial<MemberProfile> = {}): MemberProfile => ({
  id: 'u1', fullName: 'Test Student', role: 'STUDENT', email: '', phone: '', dob: '', university: '', rollNumber: '',
  bloodGroup: '', ageVerified: false, isVerifiedStudent: false, emergencyContactName: '', emergencyContactPhone: '',
  emergencyContactRelation: '', allergies: [], chronicConditions: [], updatedAt: null, ...over,
});

function api(onPatch: (body: Record<string, unknown>) => MemberProfile, initial = profile()) {
  const patches: Record<string, unknown>[] = [];
  const request = vi.fn(async (_path: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') { const body = JSON.parse(String(init.body)); patches.push(body); return onPatch(body); }
    return initial;
  }) as unknown as Requester;
  return { request, patches };
}

describe('EmergencyCardViewModel', () => {
  it('starts from the student’s real profile, with nothing invented', async () => {
    const vm = new EmergencyCardViewModel(api(() => profile()).request);
    await vm.load();
    expect(vm.saved).toEqual({ bloodGroup: '', allergies: '', conditions: '', contactName: '', contactPhone: '', contactRelation: '' });
  });

  it('sends hyphenated blood groups and list fields the backend accepts', async () => {
    const { request, patches } = api((b) => profile({ bloodGroup: String(b.bloodGroup), allergies: b.allergies as string[] }));
    const vm = new EmergencyCardViewModel(request);
    await vm.load();
    vm.set('bloodGroup', 'O-');
    vm.set('allergies', 'Penicillin, , Peanuts ');
    await vm.save();
    expect(patches[0]).toMatchObject({ bloodGroup: 'O-', allergies: ['Penicillin', 'Peanuts'] });
    expect(patches[0]).not.toHaveProperty('medicines');
    expect(vm.notice).toBe('ice.saved');
    expect(vm.dirty).toBe(false);
  });

  it('fails closed: a failed save keeps the last saved card and says so', async () => {
    const vm = new EmergencyCardViewModel(api(() => { throw new Error('offline'); }).request);
    await vm.load();
    vm.set('contactName', 'Asha');
    await vm.save();
    expect(vm.error).toBe('ice.saveFailed');
    expect(vm.saved?.contactName).toBe('');
    expect(vm.notice).toBeNull();
  });

  it('blocks saving an invalid mobile number', async () => {
    const vm = new EmergencyCardViewModel(api(() => profile()).request);
    await vm.load();
    vm.set('contactPhone', '12345');
    expect(vm.phoneError).toBe(true);
    expect(vm.canSave).toBe(false);
    expect(isValidIndianMobile('9876543210')).toBe(true);
  });

  it('lists what a responder still needs', async () => {
    const vm = new EmergencyCardViewModel(api(() => profile()).request);
    await vm.load();
    expect(vm.missing).toEqual(['ice.missing.blood', 'ice.missing.contact']);
  });
});

describe('EmergencyCardView', () => {
  it('shows no invented data and makes no offline or QR claim', async () => {
    const vm = new EmergencyCardViewModel(api(() => profile()).request);
    await vm.load();
    render(<EmergencyCardView vm={vm} />);
    for (const fake of [/Sunita/, /Salbutamol/, /Works offline/, /ICE QR/, /break-glass/]) {
      expect(screen.queryByText(fake)).toBeNull();
    }
    expect(screen.getByText(/There is no offline card or QR code yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Call 112/ })).toBeInTheDocument();
  });

  it('saves through the server and shows the saved preview', async () => {
    const { request } = api((b) => profile({ emergencyContactName: String(b.emergencyContactName), emergencyContactPhone: String(b.emergencyContactPhone), emergencyContactRelation: String(b.emergencyContactRelation) }));
    const vm = new EmergencyCardViewModel(request);
    await vm.load();
    render(<EmergencyCardView vm={vm} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Asha' } });
    fireEvent.change(screen.getByLabelText('Mobile number, India +91'), { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save card' }));
    await waitFor(() => expect(screen.getByText('Saved to your profile.')).toBeInTheDocument());
    expect(screen.getByText(/Asha · \+91 9876543210/)).toBeInTheDocument();
  });
});
