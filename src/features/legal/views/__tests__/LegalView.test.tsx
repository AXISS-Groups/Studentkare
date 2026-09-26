import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { careModule } from '@/features/care/module';
import { LegalView } from '../LegalView';

const path = vi.hoisted(() => ({ current: '/privacy' }));
vi.mock('@/core/navigation', () => ({ useRoutePath: () => path.current }));

function at(route: string) {
  path.current = route;
  document.body.innerHTML = '';
  render(<LegalView />);
}

const SOURCE = readFileSync(
  join(process.cwd(), 'src/features/legal/views/LegalView.tsx'),
  'utf-8',
);

describe('the routes no longer serve the shop', () => {
  it('privacy and terms do not load the marketplace', () => {
    // Both were `import('./screens/CareScreen')`, which renders
    // LiveMarketplaceScreen. Following "Privacy" on a product holding health
    // records showed a shop.
    for (const path of ['/privacy', '/terms']) {
      const route = careModule.routes.find((r) => r.path === path);
      expect(route, path).toBeDefined();
      expect(String(route?.load), path).not.toMatch(/CareScreen/);
      expect(String(route?.load), path).toMatch(/LegalView/);
    }
  });

  it('both stay public, because they must be readable without an account', () => {
    for (const path of ['/privacy', '/terms']) {
      expect(careModule.routes.find((r) => r.path === path)?.public).toBe(true);
    }
  });
});

describe('what it does not pretend to be', () => {
  it('states that the notice is not published', () => {
    at('/privacy');
    expect(screen.getByText(/privacy notice is not published yet/i)).toBeInTheDocument();
  });

  it('states the same for terms', () => {
    at('/terms');
    expect(screen.getByText(/terms of use are not published yet/i)).toBeInTheDocument();
  });

  it('asserts no compliance state', () => {
    // Guardrail 6. A legal page is the likeliest place for a claim like this,
    // and the least defensible.
    expect(SOURCE).not.toMatch(/HIPAA|ISO ?27|GDPR-compliant|DPDP-compliant|fully compliant|certified/i);
  });

  it('names no grievance officer', () => {
    // The DPDP Act requires a real one who answers real complaints. Inventing a
    // name and an address is worse than admitting there is none.
    at('/privacy');
    const text = document.body.textContent ?? '';
    expect(text).toMatch(/a named grievance officer/i);
    expect(text).toMatch(/not going to print a name and an address that nobody is behind/i);
  });

  it('contains no invented contact details', () => {
    expect(SOURCE).not.toMatch(/@studentkare|grievance@|\+91[\s\d-]{8,}/);
  });

  it('gives no retention period it cannot keep', () => {
    at('/privacy');
    expect(document.body.textContent).not.toMatch(/we retain .* for \d+|deleted within \d+/i);
  });
});

describe('what it does say', () => {
  it('lists what has to exist before the notice can be written', () => {
    at('/privacy');
    const text = document.body.textContent ?? '';
    expect(text).toMatch(/a stated purpose for each kind of data/i);
    expect(text).toMatch(/legal review and sign-off/i);
  });

  it('separates checkable behaviour from commitments', () => {
    at('/privacy');
    expect(document.body.textContent).toMatch(/things the code does today, not commitments/i);
  });

  it('describes the share model and the age gate', () => {
    at('/privacy');
    const text = document.body.textContent ?? '';
    expect(text).toMatch(/only through a share you granted/i);
    expect(text).toMatch(/adults aged 18 and over/i);
  });

  it('warns against relying on it', () => {
    at('/privacy');
    expect(document.body.textContent).toMatch(/do not put anything here you would mind losing/i);
  });
});

describe('navigation', () => {
  it('offers the other legal page and a way back', () => {
    at('/privacy');
    expect(screen.getByRole('link', { name: /terms of use/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /back to studentkare/i })).toHaveAttribute('href', '/');
  });

  it('swaps the cross-link on the terms page', () => {
    at('/terms');
    expect(screen.getByRole('link', { name: /privacy notice/i })).toHaveAttribute('href', '/privacy');
  });

  it('keeps the emergency number reachable', () => {
    at('/privacy');
    expect(screen.getByRole('link', { name: '112' })).toHaveAttribute('href', 'tel:112');
  });
});

describe('accessibility', () => {
  it('has one first-level heading', () => {
    at('/privacy');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('labels each section by its heading', () => {
    at('/privacy');
    for (const region of document.body.querySelectorAll('section')) {
      expect(region).toHaveAttribute('aria-labelledby');
    }
  });

  it('hides the decorative mark', () => {
    at('/privacy');
    for (const svg of document.body.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
