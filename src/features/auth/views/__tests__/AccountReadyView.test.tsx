import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { apiRequest } from '@/data/http';
import { AccountReadyView } from '../AccountReadyView';

vi.mock('@/data/http', () => ({ apiRequest: vi.fn() }));
const mocked = vi.mocked(apiRequest);

const onEnter = vi.fn();

/** Two resources load in parallel; answer each by path rather than by order. */
async function open(
  verification: Record<string, unknown> | Error = { status: 'NOT_SUBMITTED', university: '', rollNumber: '' },
  profile: Record<string, unknown> = { fullName: 'A Student', hostelBlock: '' },
) {
  mocked.mockImplementation((path: string) => {
    if (path === '/campus/verification') {
      return verification instanceof Error ? Promise.reject(verification) : Promise.resolve(verification);
    }
    return Promise.resolve(profile);
  });
  render(<AccountReadyView onEnter={onEnter} />);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  mocked.mockReset();
  onEnter.mockReset();
});

describe('it does not claim a verification that has not happened', () => {
  it('never says the student is verified', async () => {
    // Signup writes isVerifiedStudent: false and creates no CampusVerification
    // row, so at this moment the campus has not even been asked. The design's
    // "You're verified" would be the first thing the app ever told them, and
    // it would be false.
    const { container } = await open().then(() => ({ container: document.body }));
    expect(container.textContent).not.toMatch(/you'?re verified/i);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/workspace is ready/i);
  });

  it('says plainly that campus membership is not verified yet', async () => {
    await open({ status: 'NOT_SUBMITTED', university: '', rollNumber: '' });
    expect(screen.getByRole('status')).toHaveTextContent(/not verified yet/i);
  });

  it('reports a check in progress as in progress', async () => {
    await open({ status: 'PENDING', university: 'VNR VJIET', rollNumber: 'R-1' });
    expect(screen.getByRole('status')).toHaveTextContent(/checking your enrolment/i);
  });

  it('confirms only once the campus actually has', async () => {
    await open({ status: 'VERIFIED', university: 'VNR VJIET', rollNumber: 'R-1' });
    expect(screen.getByRole('status')).toHaveTextContent(/confirmed your enrolment/i);
  });

  it('says what to do when the campus rejects it', async () => {
    await open({ status: 'REJECTED', university: 'VNR VJIET', rollNumber: 'R-1' });
    expect(screen.getByRole('status')).toHaveTextContent(/check your roll number/i);
  });
});

describe('it invents no prices', () => {
  it('shows no rupee amount anywhere', async () => {
    // The design says "10-min telehealth, from ₹199". The only telehealth item
    // in the catalogue is a 30-minute consult at ₹299, and it is demo seed
    // data marked as a concept — both numbers would be made up.
    const { container } = await open().then(() => ({ container: document.body }));
    expect(container.textContent).not.toMatch(/₹|\bRs\.?\s?\d|from \d/i);
  });
});

describe('where the account is linked', () => {
  it('states it only when the server returned somewhere', async () => {
    await open(
      { status: 'PENDING', university: 'VNR VJIET', rollNumber: 'R-1' },
      { fullName: 'A Student', hostelBlock: 'North Dorm Block B' },
    );
    expect(screen.getByText(/VNR VJIET · North Dorm Block B/)).toBeInTheDocument();
  });

  it('says nothing about a campus it was not told', async () => {
    const { container } = await open().then(() => ({ container: document.body }));
    expect(container.textContent).not.toMatch(/linked to/i);
  });
});

describe('when verification cannot be read', () => {
  it('still lets the student into their workspace', async () => {
    // A failed status check is not a reason to trap someone on a welcome
    // screen. It just means nothing is claimed about verification.
    await open(new Error('offline'));
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /enter/i }));
    expect(onEnter).toHaveBeenCalled();
  });
});

describe('accessibility', () => {
  it('names the button and hides decorative icons', async () => {
    const { container } = await open().then(() => ({ container: document.body }));
    expect(screen.getByRole('button', { name: /enter/i })).toHaveAccessibleName();
    for (const svg of container.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
