import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { VendorRxReviewScreen } from '../VendorRxReviewScreen';
import type { RxReview, RxReviewQueue } from '@/features/partner/work/pharmacyWork';

/** WP-15 VendorRxReview (Tier 1, approved 2026-10-21): fixtures only. */

vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'ph-1', fullName: 'MedPlus Bachupally', role: 'VENDOR', partnerKind: 'PHARMACY' } }) }));
vi.mock('@/lib/utils/workflowRouting', () => ({ navigate: vi.fn() }));
const approveRx = vi.fn();
const rejectRx = vi.fn();
const rxUploadLink = vi.fn();
vi.mock('@/features/partner/work/pharmacyWork', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/partner/work/pharmacyWork')>()),
  approveRx: (...args: unknown[]) => approveRx(...args),
  rejectRx: (...args: unknown[]) => rejectRx(...args),
  rxUploadLink: (...args: unknown[]) => rxUploadLink(...args),
}));

const now = Date.now() / 1000;
const review = (over: Partial<RxReview> = {}): RxReview => ({
  dispenseId: 'disp-2231', receivedAt: now - 180, prescriberRegNo: 'TSMC 45122', issuedAt: now - 86400, validUntil: now + 86400 * 20, expired: false,
  items: [
    { id: 'l1', genericName: 'Cetirizine', brandName: '', strength: '10 mg', form: 'tablet', dose: '1 tablet', frequency: 'once daily', quantity: 5, scheduleClass: 'OTC', registerRequired: false, substitutionAllowed: true },
    { id: 'l2', genericName: 'Budesonide', brandName: '', strength: '200 mcg', form: 'inhaler', dose: '1 puff', frequency: 'twice daily', quantity: 1, scheduleClass: 'H', registerRequired: true, substitutionAllowed: false },
  ],
  ...over,
});
const queue = (over: Partial<RxReviewQueue> = {}): RxReviewQueue => ({ reviews: [review()], total: 1, uploads: [], uploadsTotal: 0, ...over });
const twoFactorOn = async () => ({ enabled: true });
const setOnline = (value: boolean) => Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });

const CHECKS = ['Doctor registration verified', 'Prescription date valid', 'Patient matches order', 'Allergy check', 'Schedule H items logged'];

beforeEach(() => { approveRx.mockReset(); rejectRx.mockReset(); rxUploadLink.mockReset(); setOnline(true); });
afterEach(() => setOnline(true));

describe('VendorRxReview', () => {
  it('approve stays disabled until every check, every line and the pharmacist’s name are done', async () => {
    approveRx.mockResolvedValue({});
    const source = vi.fn(async () => queue());
    render(<VendorRxReviewScreen source={source} twoFactorSource={twoFactorOn} />);
    const approve = await screen.findByRole('button', { name: 'Approve and pack' });
    expect(approve).toBeDisabled();
    for (const name of CHECKS) fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(name) }));
    expect(approve).toBeDisabled();
    for (const box of screen.getAllByRole('checkbox', { name: 'Matches the prescription as written' })) fireEvent.click(box);
    expect(approve).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Verifying pharmacist’s name/), { target: { value: 'R. Kumar' } });
    expect(approve).toBeEnabled();
    fireEvent.click(approve);
    await waitFor(() => expect(approveRx).toHaveBeenCalledWith('review', 'disp-2231', 'R. Kumar', {
      prescriberRegistration: true, prescriptionDate: true, patientMatches: true, allergyChecked: true, scheduleLogged: true,
    }));
    await waitFor(() => expect(source).toHaveBeenCalledTimes(2));
  });

  it('never shows the student’s allergy record; the allergy check is asked in person', async () => {
    render(<VendorRxReviewScreen source={async () => queue()} twoFactorSource={twoFactorOn} />);
    expect(await screen.findByText(/their allergy record isn’t shared with pharmacies/)).toBeInTheDocument();
  });

  it('an expired prescription cannot be approved', async () => {
    render(<VendorRxReviewScreen source={async () => queue({ reviews: [review({ expired: true })] })} twoFactorSource={twoFactorOn} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/has expired/);
    for (const name of CHECKS) fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(name) }));
    for (const box of screen.getAllByRole('checkbox', { name: 'Matches the prescription as written' })) fireEvent.click(box);
    fireEvent.change(screen.getByLabelText(/Verifying pharmacist’s name/), { target: { value: 'R. Kumar' } });
    expect(screen.getByRole('button', { name: 'Approve and pack' })).toBeDisabled();
  });

  it('rejects with the reason the student sees', async () => {
    rejectRx.mockResolvedValue({});
    render(<VendorRxReviewScreen source={async () => queue()} twoFactorSource={twoFactorOn} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
    fireEvent.change(screen.getByLabelText(/Reason for rejecting/), { target: { value: 'Date unreadable' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm rejection' }));
    await waitFor(() => expect(rejectRx).toHaveBeenCalledWith('review', 'disp-2231', 'Date unreadable'));
  });

  it('an uploaded prescription opens only through the server’s short-lived link; OCR is not connected', async () => {
    rxUploadLink.mockResolvedValue({ url: '/api/v1/pharmacy/rx-uploads/up-1/file?token=abc', expiresAt: now + 120 });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<VendorRxReviewScreen source={async () => queue({ reviews: [], total: 0, uploads: [{ reviewId: 'up-1', receivedAt: now - 60, mimeType: 'image/jpeg', source: 'UPLOAD' }], uploadsTotal: 1 })} twoFactorSource={twoFactorOn} />);
    expect(await screen.findByText(/Reading items off an uploaded image isn’t connected yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open the prescription' }));
    await waitFor(() => expect(rxUploadLink).toHaveBeenCalledWith('up-1'));
    await waitFor(() => expect(open).toHaveBeenCalledWith(expect.stringContaining('/api/v1/pharmacy/rx-uploads/up-1/file?token=abc'), '_blank', 'noopener,noreferrer'));
    open.mockRestore();
  });

  it('"Ask the doctor" is not offered (no endpoint), and 2FA shows only when the server says so', async () => {
    const { unmount } = render(<VendorRxReviewScreen source={async () => queue()} twoFactorSource={twoFactorOn} />);
    expect(await screen.findByText('2FA on')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ask the doctor/i })).toBeNull();
    unmount();
    render(<VendorRxReviewScreen source={async () => queue()} twoFactorSource={async () => ({ enabled: false })} />);
    await screen.findByRole('button', { name: 'Approve and pack' });
    expect(screen.queryByText('2FA on')).toBeNull();
  });

  it('offline: nothing can be approved or rejected', async () => {
    setOnline(false);
    render(<VendorRxReviewScreen source={async () => queue()} twoFactorSource={twoFactorOn} />);
    expect(await screen.findByRole('button', { name: 'Reject' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Approve and pack' })).toBeDisabled();
  });

  it('empty and error states', async () => {
    const { unmount } = render(<VendorRxReviewScreen source={async () => queue({ reviews: [], total: 0 })} twoFactorSource={twoFactorOn} />);
    expect(await screen.findByText('No prescriptions waiting for a pharmacist.')).toBeInTheDocument();
    unmount();
    render(<VendorRxReviewScreen source={async () => { throw new Error('down'); }} twoFactorSource={twoFactorOn} />);
    expect(await screen.findByText('Ref RX-REVIEW · VendorRxReview')).toBeInTheDocument();
  });

  it('searches the queue by Rx, medicine or doctor', async () => {
    render(<VendorRxReviewScreen source={async () => queue({ reviews: [review(), review({ dispenseId: 'disp-9999', prescriberRegNo: 'NMC-X', items: [{ ...review().items[0], id: 'z', genericName: 'Azithromycin' }] })], total: 2 })} twoFactorSource={twoFactorOn} />);
    const list = await screen.findByRole('list', { name: 'Prescription queue' });
    expect(within(list).getAllByRole('button')).toHaveLength(2);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search by Rx, medicine or doctor' }), { target: { value: 'azithro' } });
    expect(within(screen.getByRole('list', { name: 'Prescription queue' })).getAllByRole('button')).toHaveLength(1);
  });
});
