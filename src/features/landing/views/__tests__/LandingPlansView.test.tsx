import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as billing from '@/data/datasets/billing';
import { LandingPlansView } from '../LandingPlansView';
import { LandingPlansNativeView } from '../LandingPlansNativeView';
import { publicSettingDefaults } from '@/generated/settings';

import { rupeeAmount } from '@/data/datasets/billingPrices';

vi.mock('@/data/datasets/billing', () => ({ getPlans: vi.fn() }));
const getPlans = vi.mocked(billing.getPlans);

function codeOf(name: string): string {
  return readFileSync(join(process.cwd(), 'src/features/landing/views', name), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// Prices are the registry's (src/generated/settings.ts), as the server's catalogue sends them.
const PLUS = publicSettingDefaults['billing.student_plus.monthly_inr'];
const QUARTER = publicSettingDefaults['billing.student_plus.quarter_package_inr'];
const PREMIUM = publicSettingDefaults['billing.premium.from_monthly_inr'];
const inr = rupeeAmount;

const catalog = {
  checkoutAvailable: false,
  publicKey: '',
  plans: [
    { id: 'FREE', name: 'Free Student Account', price: 'Free', period: 'forever', audience: 'student', benefits: ['Personal health records'], description: 'Every account starts free.' },
    { id: 'STUDENT_PLUS', name: 'Student Plus', price: PLUS, priceFrom: false, packages: [{ id: 'QUARTER', months: 3, price: QUARTER }], period: 'per month', audience: 'student', benefits: ['Everything in Free'], description: 'Monthly optional benefits pass.' },
    { id: 'PREMIUM', name: 'Premium', price: PREMIUM, priceFrom: true, packages: [], period: 'per month', audience: 'student', benefits: [], description: 'Premium starts at this price.' },
    { id: 'ENTERPRISE', name: 'Enterprise', price: 'Custom', priceFrom: false, packages: [], period: 'per agreement', audience: 'institution', benefits: ['Multi-campus access'], description: 'Contact sales for a custom quote.' },
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
    expect(screen.getByText(inr(PLUS))).toBeInTheDocument();
    expect(screen.getByText(`3-month package: ${inr(QUARTER)}`)).toBeInTheDocument();
    expect(screen.getByText('Free Student Account')).toBeInTheDocument();
  });

  it('shows a starting price as "from", never as a flat price', async () => {
    getPlans.mockResolvedValue(catalog as unknown as billing.PlanCatalog);
    render(<LandingPlansView />);
    await settle();
    expect(screen.getByText(`from ${inr(PREMIUM)}`)).toBeInTheDocument();
    expect(screen.queryByText(inr(PREMIUM))).toBeNull();
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
    expect(screen.getByText(inr(PLUS))).toBeInTheDocument();
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

  it('the native screen shows the same server prices, and none when the list fails', async () => {
    getPlans.mockResolvedValue(catalog as unknown as billing.PlanCatalog);
    const ok = render(<LandingPlansNativeView destinations={{}} />);
    await settle();
    expect(ok.container.textContent).toContain(inr(PLUS));
    expect(ok.container.textContent).toContain(`from ${inr(PREMIUM)}`);
    expect(ok.container.textContent).toContain(`3-month package: ${inr(QUARTER)}`);
    ok.unmount();
    getPlans.mockRejectedValue(new Error('offline'));
    const failed = render(<LandingPlansNativeView destinations={{}} />);
    await settle();
    expect(failed.container.textContent).toMatch(/plans could not be loaded/i);
    expect(failed.container.textContent).not.toMatch(/₹\s?\d/);
  });
});

describe('the plans page, to the canvas (Tier 1, approved 2026-10-21)', () => {
  it('shows no price while the list loads, only placeholders', () => {
    getPlans.mockReturnValue(new Promise(() => undefined));
    render(<LandingPlansView />);
    expect(screen.getByRole('status', { name: /loading plans/i })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/₹\s?\d/);
  });

  it('gives the error a reference code and keeps the crisis line outside it', async () => {
    getPlans.mockRejectedValue(new Error('offline'));
    render(<LandingPlansView />);
    await settle();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Ref ERR-503 · WebPlans');
    const crisis = screen.getByRole('link', { name: /112/ });
    expect(alert.contains(crisis)).toBe(false);
    expect(crisis).toHaveTextContent('14416');
    expect(crisis).toHaveAttribute('href', '/crisis');
  });

  it('builds the hero chips from the server list only', async () => {
    getPlans.mockResolvedValue(catalog as unknown as billing.PlanCatalog);
    render(<LandingPlansView />);
    await settle();
    const chips = within(screen.getByRole('list', { name: /plans and their prices/i })).getAllByRole('listitem').map((li) => li.textContent);
    expect(chips).toEqual([`Free Student Account · Free`, `Student Plus · ${inr(PLUS)}`, `Premium · from ${inr(PREMIUM)}`]);
  });

  it('draws the hero art without the board\'s lettered prices', async () => {
    getPlans.mockResolvedValue(catalog as unknown as billing.PlanCatalog);
    const { container } = render(<LandingPlansView />);
    await settle();
    const art = container.querySelector('[data-icon="illustration:illustration-care-circle-network"]');
    expect(art).not.toBeNull();
    expect(art?.querySelectorAll('text')).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/₹199|₹249|₹0|Care Circle/);
  });

  it('renders each plan as an article: CTA only where the plan can be had, a note where it cannot', async () => {
    getPlans.mockResolvedValue(catalog as unknown as billing.PlanCatalog);
    render(<LandingPlansView />);
    await settle();
    const card = (name: string) => screen.getByRole('article', { name });
    expect(within(card('Free Student Account')).getByRole('link', { name: 'Create your account' })).toHaveAttribute('href', '/login');
    expect(within(card('Student Plus')).getByRole('link', { name: 'Choose Student Plus' })).toHaveAttribute('href', '/login');
    expect(within(card('Enterprise')).getByRole('link', { name: 'Talk to us' })).toHaveAttribute('href', '/partnerships');
    const premium = card('Premium');
    expect(within(premium).queryByRole('link')).toBeNull();
    expect(premium).toHaveTextContent(/not sold online yet/i);
    expect(premium).toHaveTextContent(/listed here before it goes on sale/i);
  });

  it('makes no popularity, savings or family-plan claim', async () => {
    getPlans.mockResolvedValue(catalog as unknown as billing.PlanCatalog);
    render(<LandingPlansView />);
    await settle();
    expect(document.body.textContent).not.toMatch(/most students|save\b|saving|% off|up to 5 people/i);
    expect(codeOf('LandingPlansView.tsx')).not.toMatch(/save|saving|% off|most students/i);
  });

  it('shows the same-on-every-plan table in every state, as a real table', async () => {
    getPlans.mockRejectedValue(new Error('offline'));
    render(<LandingPlansView />);
    await settle();
    const table = screen.getByRole('table', { name: /the same on every plan/i });
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['What you get', 'Free account', 'Paid plans']);
    const rows = within(table).getAllByRole('rowheader').map((h) => h.textContent ?? '');
    expect(rows).toHaveLength(5);
    expect(rows.join(' ')).toMatch(/Crisis support/);
    expect(within(table).getAllByText('Always free')).toHaveLength(2);
    expect(table.textContent).not.toMatch(/Last 20|Unlimited|Up to 5/);
  });

  it('prints no pay-per-use price and no commission split without a source', async () => {
    getPlans.mockResolvedValue(catalog as unknown as billing.PlanCatalog);
    render(<LandingPlansView />);
    await settle();
    const ppu = screen.getByRole('region', { name: /care is priced per use/i });
    expect(ppu.textContent).not.toMatch(/₹|\d/);
    const money = screen.getByRole('region', { name: /publish our commission/i });
    expect(money.textContent).not.toMatch(/\d+\s?%|keeps/i);
  });

  it('opens and closes answers from the keyboard', async () => {
    getPlans.mockResolvedValue(catalog as unknown as billing.PlanCatalog);
    render(<LandingPlansView />);
    await settle();
    const q = screen.getByRole('button', { name: /seen faster/i });
    expect(q).toHaveAttribute('aria-expanded', 'false');
    q.focus();
    expect(document.activeElement).toBe(q);
    fireEvent.click(q);
    expect(q).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(q.getAttribute('aria-controls') ?? '')).toBeVisible();
  });
});
