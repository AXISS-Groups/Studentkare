import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as billing from '@/data/datasets/billing';
import { LandingPlansView } from '../LandingPlansView';
import { LandingPlansNativeView } from '../LandingPlansNativeView';

vi.mock('@/data/datasets/billing', () => ({ getPlans: vi.fn() }));
const getPlans = vi.mocked(billing.getPlans);

function codeOf(name: string): string {
  return readFileSync(join(process.cwd(), 'src/features/landing/views', name), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const catalog = {
  checkoutAvailable: false,
  publicKey: '',
  plans: [
    { id: 'FREE', name: 'Free Student Account', price: 'Free', period: 'forever', audience: 'student', benefits: ['Personal health records'], description: 'Every account starts free.' },
    { id: 'STUDENT_PLUS', name: 'Student Plus', price: 99, period: 'per month', audience: 'student', benefits: ['Everything in Free'], description: 'Monthly optional benefits pass.' },
  ],
} as const;

async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  getPlans.mockReset();
});

describe('the plans page', () => {
  it('shows the prices the server catalogue publishes', async () => {
    getPlans.mockResolvedValue(catalog as unknown as billing.PlanCatalog);
    render(<LandingPlansView />);
    await settle();
    expect(screen.getByText('Student Plus')).toBeInTheDocument();
    expect(screen.getByText('₹99')).toBeInTheDocument();
    expect(screen.getByText('Free Student Account')).toBeInTheDocument();
  });

  it('shows no price at all when the catalogue cannot be read', async () => {
    getPlans.mockRejectedValue(new Error('offline'));
    render(<LandingPlansView />);
    await settle();
    expect(screen.getByRole('alert')).toHaveTextContent(/plans could not be loaded/i);
    expect(document.body.textContent).not.toMatch(/₹\s?\d/);
  });

  it('refuses a malformed catalogue rather than showing part of it', async () => {
    getPlans.mockResolvedValue({ plans: [{ id: 'X', name: 'Broken', price: null }] } as unknown as billing.PlanCatalog);
    render(<LandingPlansView />);
    await settle();
    expect(screen.queryByText('Broken')).toBeNull();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('retries from the error state', async () => {
    getPlans.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(catalog as unknown as billing.PlanCatalog);
    render(<LandingPlansView />);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    await settle();
    expect(screen.getByText('₹99')).toBeInTheDocument();
  });

  it('types in no price, plan or commission the server does not publish', () => {
    for (const code of [codeOf('LandingPlansView.tsx'), codeOf('LandingPlansNativeView.tsx')]) {
      expect(code).not.toMatch(/₹\s?\d|Care Circle|Care Plus|Premium|\d+% to us|Provider keeps/i);
    }
  });

  it('offers no newsletter signup, because nothing would receive it', () => {
    expect(codeOf('LandingPlansView.tsx')).not.toMatch(/Kare Letter|Subscribed!|newsletter/i);
  });

  it('claims no compliance state and no paid clinical priority', () => {
    for (const code of [codeOf('LandingPlansView.tsx'), codeOf('LandingPlansNativeView.tsx')]) {
      expect(code).not.toMatch(/DPDP|certified|compliant|priority 24\/7|tele-triage/i);
    }
  });

  it('the native screen quotes no price', () => {
    const { container } = render(<LandingPlansNativeView destinations={{}} />);
    expect(container.textContent).not.toMatch(/₹\s?\d/);
    expect(container.textContent).toMatch(/quotes no price/i);
  });
});
