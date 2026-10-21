import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PartnerApplyScreen } from '../apply/PartnerApplyScreen';
import { EMPTY_APPLICATION, enquiryFor, problemsOn } from '../apply/applyModel';
import type { ApplyValues } from '../apply/applyModel';

vi.mock('@/lib/utils/workflowRouting', () => ({ navigate: vi.fn() }));

const complete: ApplyValues = {
  ...EMPTY_APPLICATION,
  type: 'pharmacy',
  businessName: 'Campus Pharmacy',
  gstin: '36AABCM1234C1Z5',
  address: 'Plot 4, Bachupally, Hyderabad',
  campuses: 'VNR VJIET',
  contactName: 'Ravi K',
  email: 'ravi@example.com',
  licenceNumber: 'TS/HYD/2021/12345',
  professionalName: 'Ravi K',
  registration: 'TSPC 45821',
  agreed: { ruleL: true, passScan: true, prices: true, dpa: true },
  consent: true,
};

describe('partner application model', () => {
  it('validates each step', () => {
    expect(problemsOn('type', EMPTY_APPLICATION)).toEqual(['type']);
    expect(problemsOn('business', { ...complete, gstin: '36AABCM1234' })).toEqual(['gstin']);
    expect(problemsOn('rules', { ...complete, consent: false })).toEqual(['consent']);
    expect(problemsOn('payouts', EMPTY_APPLICATION)).toEqual([]);
  });

  it('builds the enquiry only when complete, with consent, and never carries bank details', () => {
    expect(() => enquiryFor({ ...complete, consent: false })).toThrow();
    const body = enquiryFor(complete);
    expect(body).toMatchObject({ organization: 'Campus Pharmacy', email: 'ravi@example.com', consent: true, seats: 0, planId: 'ENTERPRISE' });
    expect(body.message).toContain('GSTIN: 36AABCM1234C1Z5');
    expect(body.message).toContain('TSPC 45821');
    expect(body.message).not.toMatch(/IFSC|account number/i);
  });
});

describe('PartnerApply / WebPartnerApply', () => {
  it('walks the five steps, refuses to continue with gaps, and sends the application', async () => {
    const send = vi.fn(async () => ({ id: 'inq_123' }));
    render(<PartnerApplyScreen send={send} />);
    expect(screen.getByRole('heading', { level: 1, name: 'What kind of partner are you?' })).toBeInTheDocument();
    // No invented commission: the fee is "not published yet".
    expect(screen.getAllByText('Commission not published yet · listing is free')).toHaveLength(4);
    expect(screen.queryByText(/15–20%/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Choose the kind of partner you are.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /Pharmacy/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Business details' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Registered business name'), { target: { value: 'Campus Pharmacy' } });
    fireEvent.change(screen.getByLabelText('GSTIN'), { target: { value: '36aabcm1234c1z5' } });
    fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'Plot 4, Bachupally, Hyderabad' } });
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ravi K' } });
    fireEvent.change(screen.getByLabelText('Email for this application'), { target: { value: 'ravi@example' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Enter an email address like name@example.com.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Email for this application'), { target: { value: 'ravi@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByLabelText('Drug licence number (Form 20/21)')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Drug licence number (Form 20/21)'), { target: { value: 'TS/HYD/2021/12345' } });
    fireEvent.change(screen.getByLabelText('Registered pharmacist’s name'), { target: { value: 'Ravi K' } });
    fireEvent.change(screen.getByLabelText('State Pharmacy Council registration no.'), { target: { value: 'TSPC 45821' } });
    expect(screen.getAllByText('We’ll ask for a clear photo by email')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // Payouts: nothing is collected here.
    expect(await screen.findByRole('heading', { level: 1, name: 'Payouts' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/IFSC|account number/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Our rules — read and agree' })).toBeInTheDocument();
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(5);
    boxes.forEach((box) => expect(box).not.toBeChecked());
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(await screen.findByText('Tick every rule, and let us contact you, to apply.')).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
    boxes.forEach((box) => fireEvent.click(box));
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('heading', { name: 'Application received' })).toBeInTheDocument();
    expect(screen.getByText('Campus Pharmacy · pharmacy · ref inq_123')).toBeInTheDocument();
  });

  it('picks a type as a radio and offers sign-in to existing partners', () => {
    render(<PartnerApplyScreen send={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: /Wellness/ }));
    expect(screen.getByRole('radio', { name: /Wellness/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Already a partner? Sign in' })).toBeInTheDocument();
  });
});
