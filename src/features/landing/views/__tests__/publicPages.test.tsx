import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import * as http from '@/data/services/http';
import { LandingView } from '../LandingView';
import { LandingLabTestsView } from '../LandingLabTestsView';
import { LandingLabListView } from '../LandingLabListView';
import { LandingConsultView } from '../LandingConsultView';
import { LandingProgramsView } from '../LandingProgramsView';
import { LandingWellnessView } from '../LandingWellnessView';
import { LandingCampusView } from '../LandingCampusView';
import { LandingClinicianView } from '../LandingClinicianView';
import { LandingPartnershipsView } from '../LandingPartnershipsView';
import { ART_CREDIT } from '@/design-system/public-site/publicSiteNav';

vi.mock('@/data/services/http', () => ({ apiRequest: vi.fn() }));
vi.mock('@/components/clinical/ComprehensiveHealthCalculators', () => ({ ComprehensiveHealthCalculators: () => null }));
const mocked = vi.mocked(http.apiRequest);

const row = (over: Record<string, unknown> = {}) => ({
  id: 'r1', name: 'Daily multivitamin', brand: 'Nourish', kind: 'product', pack: 'Bottle of 30 tablets', pricePaise: 29900, mrpPaise: 44900, ...over,
});

async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** Every route path the feature modules register. */
function registeredRoutes(): Set<string> {
  const root = join(process.cwd(), 'src/features');
  const paths = new Set<string>();
  for (const dir of readdirSync(root)) {
    let code: string;
    try {
      code = readFileSync(join(root, dir, 'module.ts'), 'utf-8');
    } catch {
      continue;
    }
    for (const m of code.matchAll(/path: '(\/[^']*)'/g)) paths.add(m[1]);
  }
  return paths;
}

const iconsIn = (el: HTMLElement) => Array.from(el.querySelectorAll('[data-icon]')).map((n) => n.getAttribute('data-icon'));

const PAGES: ReadonlyArray<[string, () => React.ReactElement, string]> = [
  ['Landing', () => <LandingView />, 'Discover'],
  ['WebLabTests', () => <LandingLabTestsView />, 'Lab tests'],
  ['WebLabList', () => <LandingLabListView />, 'Lab tests'],
  ['WebConsult', () => <LandingConsultView />, 'Find a doctor'],
  ['WebPrograms', () => <LandingProgramsView />, 'Programmes'],
  ['WebWellness', () => <LandingWellnessView />, 'Training'],
  ['LandingCampus', () => <LandingCampusView />, 'For campuses'],
  ['LandingClinician', () => <LandingClinicianView />, 'For clinicians'],
  ['WebPartnerships', () => <LandingPartnershipsView />, 'Partnerships'],
];

beforeEach(() => {
  mocked.mockReset();
  mocked.mockImplementation(() => Promise.resolve({ items: [], total: 0 }));
});

describe.each(PAGES)('%s on the public frame', (_name, Page, current) => {
  it('has the shared header with its page marked, one h1, one main and the footer', async () => {
    render(<Page />);
    await settle();
    const marked = document.querySelectorAll('header [aria-current="page"]');
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveTextContent(current);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Not an emergency service/ })).toHaveAttribute('href', '/crisis');
  });

  it('closes with the four pillars and the app band, and offers no newsletter form', async () => {
    render(<Page />);
    await settle();
    expect(screen.getByRole('region', { name: 'Why students trust Studentkare' })).toBeInTheDocument();
    expect(screen.getByText(/no Studentkare app to download yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign-up is not open yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /subscribe/i })).toBeNull();
  });

  it('draws icons only through the design system, all decorative, and no text arrows', async () => {
    const { container } = render(<Page />);
    await settle();
    for (const svg of container.querySelectorAll('svg')) expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(container.textContent).not.toMatch(/[→✓✕✗←★]/);
    expect(iconsIn(container)).toContain('brand:studentkare-logo');
  });

  it('links only to routes the app registers', async () => {
    const routes = registeredRoutes();
    const { container } = render(<Page />);
    await settle();
    for (const a of container.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href') ?? '';
      // The licence credit for the medical illustrations is the one link out (docs/licences/animation-packs.md).
      if (href.startsWith('#') || href.startsWith('tel:') || href === ART_CREDIT.href) continue;
      const path = href.split(/[?#]/)[0] ?? '';
      expect(routes.has(path), href).toBe(true);
    }
  });

  it('claims no accreditation, register check, rating or partner count', async () => {
    const { container } = render(<Page />);
    await settle();
    expect(container.textContent).not.toMatch(/NABL|NMC-registered|NMC-verified|ABHA|ABDM|★|\d+ campuses live|verified students/i);
  });
});

describe('the Discover page', () => {
  it('derives the offer and the brands from the catalogue, and hides them when it is empty', async () => {
    mocked.mockImplementation((path: string) =>
      Promise.resolve(path.includes('kind=lab') ? { items: [], total: 0 } : { items: [row(), row({ id: 'r2', name: 'Sunscreen SPF 50', brand: 'Kindskin', pack: 'Tube of 50 g', pricePaise: 42900, mrpPaise: 59900 })], total: 2 }),
    );
    render(<LandingView />);
    await settle();
    const offer = screen.getByRole('region', { name: 'Pick up your everyday favourites' });
    expect(within(offer).getByText('Daily multivitamin')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Brands in the catalogue.' })).toHaveTextContent(/Nourish.*Kindskin/);
    expect(screen.queryByRole('region', { name: 'Health checks, made simpler.' })).toBeNull();
  });

  it('lists published lab tests in the health-check band', async () => {
    mocked.mockImplementation((path: string) =>
      Promise.resolve(path.includes('kind=lab') ? { items: [row({ id: 'l1', name: 'Thyroid profile', kind: 'lab', pack: '3 tests' })], total: 1 } : { items: [], total: 0 }),
    );
    render(<LandingView />);
    await settle();
    const band = screen.getByRole('region', { name: 'Health checks, made simpler.' });
    expect(within(band).getByText('Thyroid profile')).toBeInTheDocument();
    expect(within(band).getByRole('link', { name: 'Book in the shop: Thyroid profile' })).toHaveAttribute('href', '/shop?kind=lab');
  });

  it('says no article is published rather than listing reading times', async () => {
    render(<LandingView />);
    await settle();
    expect(screen.getAllByText('No articles are published here yet.')).toHaveLength(3);
    expect(document.body.textContent).not.toMatch(/min read/);
  });
});

describe('page specifics', () => {
  it('lab tests: WhatsApp booking is shown as not open, not as a link', async () => {
    render(<LandingLabTestsView />);
    await settle();
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).toBeNull();
    expect(screen.getByText('Book by WhatsApp').closest('[aria-disabled="true"]')).not.toBeNull();
  });

  it('training: each kind of session carries its canvas 3D art', () => {
    const { container } = render(<LandingWellnessView />);
    expect(iconsIn(container)).toEqual(expect.arrayContaining(['glyph:dumbbell-3d', 'glyph:kettlebell-3d', 'glyph:yoga-3d', 'glyph:meditation-3d', 'glyph:running-shoe-3d', 'glyph:foam-roller-3d']));
  });

  it('consult: the specialities carry the canvas icons', () => {
    const { container } = render(<LandingConsultView />);
    expect(iconsIn(container)).toEqual(expect.arrayContaining(['doctor-2', 'droplet-2', 'prescription-2', 'brain-2', 'sparkle', 'person-badge', 'clock-3', 'lock-6']));
  });

  it('clinicians: the hero shows no commission art', () => {
    const { container } = render(<LandingClinicianView />);
    expect(iconsIn(container)).not.toContain('illustration:illustration-clinical-line');
    expect(container.textContent).not.toMatch(/90%/);
  });

  it('partnerships: the category is a radio group with nothing but the first picked', () => {
    render(<LandingPartnershipsView />);
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBe(6);
    expect(radios.filter((r) => (r as HTMLInputElement).checked)).toHaveLength(1);
  });
});
