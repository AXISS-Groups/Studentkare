import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import * as http from '@/data/http';
import {
  ClinicianEarningsScreen,
  periodLabel,
  rupees,
} from '../ClinicianEarningsScreen';

vi.mock('@/data/http', () => ({ apiRequest: vi.fn() }));
const mocked = vi.mocked(http.apiRequest);

/** Replace the export outright for the failure case: a rejection recorded by a
 *  vi.fn is re-reported by the runner as a test failure even once the hook has
 *  caught it. */
function failWith(message: string): void {
  (http as { apiRequest: unknown }).apiRequest = () => Promise.reject(new Error(message));
}

interface Body {
  periods: { start: string; end: string; consults: number; grossPaise: number }[];
  grossPaise: number;
  consults: number;
  windowDays: number;
  commissionRate: number | null;
  settlementConfigured: boolean;
}

const EMPTY: Body = {
  periods: [],
  grossPaise: 0,
  consults: 0,
  windowDays: 180,
  commissionRate: null,
  settlementConfigured: false,
};

const withConsults: Body = {
  ...EMPTY,
  periods: [
    { start: '2026-09-16', end: '2026-09-30', consults: 38, grossPaise: 756200 },
    { start: '2026-09-01', end: '2026-09-15', consults: 42, grossPaise: 835800 },
  ],
  grossPaise: 1592000,
  consults: 80,
};

async function open(body: Body | Error = EMPTY) {
  if (body instanceof Error) {
    failWith(body.message);
  } else {
    mocked.mockImplementation(() => Promise.resolve(body));
  }
  render(<ClinicianEarningsScreen />);
  // then -> catch -> finally is three microtasks deep; flushing fewer leaves a
  // rejection in flight, which surfaces as an unhandled rejection.
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  (http as { apiRequest: unknown }).apiRequest = mocked;
  mocked.mockReset();
});

describe('what it refuses to claim', () => {
  it('shows no net figure, because no commission rate exists', async () => {
    // The design's "NET TO YOU" column. Gross relabelled as net would have a
    // clinician planning around money that is not theirs.
    await open(withConsults);
    expect(document.body.textContent).not.toMatch(/net to you/i);
    expect(screen.queryByRole('columnheader', { name: /net/i })).toBeNull();
    // The only mention of "net" is the sentence saying none is calculated.
    expect(document.body.textContent).toMatch(/no net figure is calculated/i);
  });

  it('shows no commission percentage', async () => {
    await open(withConsults);
    expect(document.body.textContent).not.toMatch(/10%|commission is/i);
  });

  it('says a rate is not configured instead', async () => {
    await open(withConsults);
    expect(screen.getByText(/no commission rate is configured/i)).toBeInTheDocument();
  });

  it('promises no payout date', async () => {
    // The design's "Due 3 October". No settlement table exists to compute one.
    await open(withConsults);
    expect(document.body.textContent).not.toMatch(/due \d|due on|payout on/i);
    expect(document.body.textContent).toMatch(/settlement is not set up/i);
  });

  it('offers no statement download', async () => {
    await open(withConsults);
    expect(document.body.textContent).not.toMatch(/download statement/i);
    expect(document.body.querySelector('a[download]')).toBeNull();
  });

  it('marks the figures as gross', async () => {
    await open(withConsults);
    expect(document.body.textContent).toMatch(/these are gross figures/i);
  });
});

describe('what it does show', () => {
  it('totals the gross across periods', async () => {
    await open(withConsults);
    expect(screen.getByText('₹15,920')).toBeInTheDocument();
  });

  it('counts the consults', async () => {
    await open(withConsults);
    expect(screen.getByText('80')).toBeInTheDocument();
  });

  it('lists one row per fortnight', async () => {
    await open(withConsults);
    expect(screen.getByRole('row', { name: /1–15 Sept 2026/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /16–30 Sept 2026/ })).toBeInTheDocument();
  });

  it('reads the fortnight totals off the response', async () => {
    await open(withConsults);
    const row = screen.getByRole('row', { name: /16–30 Sept 2026/ });
    expect(row.textContent).toContain('38');
    expect(row.textContent).toContain('₹7,562');
  });
});

describe('states', () => {
  it('says there is nothing yet rather than showing zero rupees', async () => {
    await open(EMPTY);
    expect(screen.getByText(/nothing in earnings yet/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/₹0\b/);
  });

  it('explains what will make a row appear, and what will not', async () => {
    await open(EMPTY);
    expect(document.body.textContent).toMatch(/only completed consults count/i);
    expect(document.body.textContent).toMatch(/no-show/i);
  });

  it('surfaces a failure rather than an empty statement', async () => {
    // An error rendered as "no earnings" would read as "you earned nothing".
    await open(new Error('upstream unavailable'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/nothing in earnings yet/i);
  });

  it('reads from the earnings endpoint', async () => {
    await open(EMPTY);
    expect(mocked).toHaveBeenCalledWith('/work/earnings', expect.anything());
  });
});

describe('accessibility', () => {
  it('gives the table real row and column headers', async () => {
    await open(withConsults);
    expect(screen.getByRole('columnheader', { name: /period/i })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: /1–15 Sept 2026/ })).toBeInTheDocument();
  });

  it('hides the decorative marks from assistive technology', async () => {
    await open(withConsults);
    for (const svg of document.body.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  });
});

describe('rupees', () => {
  it('groups in the Indian system', () => {
    expect(rupees(1592000)).toBe('₹15,920');
    expect(rupees(1000000000)).toBe('₹1,00,00,000');
  });

  it('shows paise only when there are any', () => {
    expect(rupees(29900)).toBe('₹299');
    expect(rupees(29950)).toBe('₹299.50');
    expect(rupees(29905)).toBe('₹299.05');
  });

  it('handles zero', () => {
    expect(rupees(0)).toBe('₹0');
  });
});

describe('periodLabel', () => {
  it('names the month once', () => {
    expect(periodLabel({ start: '2026-09-01', end: '2026-09-15' })).toBe('1–15 Sept 2026');
  });

  it('handles a short February', () => {
    expect(periodLabel({ start: '2026-02-16', end: '2026-02-28' })).toBe('16–28 Feb 2026');
  });

  it('handles a leap February', () => {
    expect(periodLabel({ start: '2028-02-16', end: '2028-02-29' })).toBe('16–29 Feb 2028');
  });

  it('is not shifted by the local timezone', () => {
    // Parsed as UTC on purpose: `new Date('2026-09-01')` in a timezone behind
    // UTC would render the 31st of August.
    expect(periodLabel({ start: '2026-09-01', end: '2026-09-15' })).toMatch(/^1–15 /);
  });
});
