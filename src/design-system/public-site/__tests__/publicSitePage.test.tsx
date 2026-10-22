import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { applyPublicConfig, resetPublicConfig } from '@/data/services/config';
import { PublicAppBand, PublicAudienceHeader, PublicSiteHeader, PublicSitePage, PublicTrustBand } from '..';

vi.mock('@/data/services/http', () => ({ apiRequest: vi.fn(() => Promise.reject(new Error('offline'))) }));

const iconsIn = (el: HTMLElement) => Array.from(el.querySelectorAll('[data-icon]')).map((n) => n.getAttribute('data-icon'));

afterEach(() => {
  resetPublicConfig();
});

describe('PublicSiteHeader, compact', () => {
  it('is the brand, the ten-item nav (Blog and News added) and sign-in, with no shop strip', () => {
    const { container } = render(<PublicSiteHeader current="labTests" variant="compact" />);
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getAllByRole('link')).toHaveLength(10);
    expect(within(nav).getByRole('link', { name: 'Lab tests' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('navigation', { name: 'Shop by category' })).toBeNull();
    expect(iconsIn(container)).toContain('brand:studentkare-logo');
  });
});

describe('PublicAudienceHeader', () => {
  it('links the four audiences, marks the current one and carries the page action', () => {
    render(<PublicAudienceHeader current="clinicians" cta={{ label: 'landing.plans.signIn', href: '/login' }} />);
    const nav = screen.getByRole('navigation', { name: 'Who Student Kare is for' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/', '/campuses', '/clinicians', '/partnerships']);
    expect(within(nav).getByRole('link', { name: 'For clinicians' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });
});

describe('PublicTrustBand', () => {
  it('draws the four pillars in the board art set, and calls nobody verified', () => {
    const { container } = render(<PublicTrustBand art="alternate" />);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4);
    expect(iconsIn(container)).toEqual([
      'illustration:illustration-lock-shield-2',
      'illustration:illustration-verified-badge-2',
      'illustration:illustration-hostel-pin-2',
      'illustration:illustration-rupee-receipt-2',
    ]);
    expect(container.textContent).not.toMatch(/Verified clinicians|NMC|NABL/);
    expect(container.textContent).toMatch(/does not yet check registrations/);
  });

  it('uses the primary drawings for the primary set', () => {
    const { container } = render(<PublicTrustBand art="primary" />);
    expect(iconsIn(container)).toContain('illustration:illustration-lock-shield');
  });
});

describe('PublicAppBand', () => {
  it('says the app is not listed, offers web sign-in and draws no scan code', () => {
    const { container } = render(<PublicAppBand art="primary" />);
    expect(container.textContent).toMatch(/no Studentkare app to download yet/i);
    expect(screen.getByRole('link', { name: /Sign in on the web/ })).toHaveAttribute('href', '/login');
    expect(container.querySelector('[data-icon^="glyph:qr-sample"]')).toBeNull();
    expect(container.textContent).not.toMatch(/or scan/);
    expect(container.textContent).not.toMatch(/Download on the|GET IT ON|live phlebotomist|offline emergency card/i);
    expect(iconsIn(container)).toEqual(expect.arrayContaining(['map-pin-2', 'plus-square', 'flask', 'arrow-right', 'illustration:illustration-phones-dashboard']));
  });

  it('shows a store badge and the scan code only for a published https listing', async () => {
    applyPublicConfig({ settings: { 'public_site.play_store_url': 'https://play.example/sk' } });
    const { container } = render(<PublicAppBand art="alternate" />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('link', { name: /Google Play/ })).toHaveAttribute('href', 'https://play.example/sk');
    expect(screen.queryByRole('link', { name: /Sign in on the web/ })).toBeNull();
    expect(screen.getByText('or scan')).toBeInTheDocument();
    expect(iconsIn(container)).toEqual(expect.arrayContaining(['glyph:qr-sample-2', 'illustration:illustration-phones-consult']));
  });
});

describe('PublicSitePage', () => {
  it('frames the page: header, one main landmark, the closing bands and the footer with the closed Kare Letter', () => {
    render(
      <PublicSitePage header={<PublicSiteHeader current="programmes" variant="compact" />} art="primary" footerNote="Still being built.">
        <h1>Page</h1>
      </PublicSitePage>,
    );
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('region', { name: 'Why students trust Studentkare' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Use Studentkare' })).toBeInTheDocument();
    expect(screen.getByText(/Sign-up is not open yet/)).toBeInTheDocument();
    expect(document.querySelector('form, input')).toBeNull();
    expect(screen.getByText('Still being built.')).toBeInTheDocument();
  });

  it('leaves the closing bands out when the page has its own', () => {
    render(
      <PublicSitePage header={<PublicSiteHeader current="plans" variant="compact" />}>
        <h1>Plans</h1>
      </PublicSitePage>,
    );
    expect(screen.queryByRole('region', { name: 'Why students trust Studentkare' })).toBeNull();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
