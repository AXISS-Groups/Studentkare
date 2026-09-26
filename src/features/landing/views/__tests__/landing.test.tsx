import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as http from '@/data/http';
import { LandingView, kindLabel, rupees } from '../LandingView';
import { LandingCampusView } from '../LandingCampusView';
import { LandingClinicianView } from '../LandingClinicianView';
import { LandingPartnershipsView } from '../LandingPartnershipsView';
import { LandingLabTestsView } from '../LandingLabTestsView';

vi.mock('@/data/http', () => ({ apiRequest: vi.fn() }));
const mocked = vi.mocked(http.apiRequest);

function codeOf(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const LANDING = codeOf('src/features/landing/views/LandingView.tsx');
const CAMPUS = codeOf('src/features/landing/views/LandingCampusView.tsx');
const CLINICIAN = codeOf('src/features/landing/views/LandingClinicianView.tsx');
const PARTNERSHIPS = codeOf('src/features/landing/views/LandingPartnershipsView.tsx');
const LABTESTS = codeOf('src/features/landing/views/LandingLabTestsView.tsx');
const PRICING = codeOf('src/screens/billing/PricingScreen.tsx');
const ALL_PAGES = [LANDING, CAMPUS, CLINICIAN, PARTNERSHIPS, LABTESTS, PRICING];

const item = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'c1',
  name: 'Vitamin D3 60K',
  brand: 'Kare',
  kind: 'product',
  pack: 'Strip of 4',
  pricePaise: 29900,
  mrpPaise: 39900,
  ...over,
});

async function openLanding(body: unknown = { items: [item()], total: 1 }) {
  mocked.mockImplementation(() => Promise.resolve(body));
  render(<LandingView />);
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

describe('claims no page may make', () => {
  it('never says ABHA-linked', () => {
    // There is no ABDM integration; the only ABHA text in the repo is a string
    // inside a RAG document.
    for (const page of ALL_PAGES) {
      expect(page).not.toMatch(/ABHA/i);
      expect(page).not.toMatch(/ABDM/i);
    }
  });

  it('never claims a record is portable after graduation', () => {
    for (const page of ALL_PAGES) {
      expect(page).not.toMatch(/portable after you graduate|portable/i);
    }
  });

  it('never asserts NABL accreditation or a verified register check', () => {
    // Guardrail 6: no registration number is stored and nothing is checked
    // against any register, so nobody here is "verified".
    for (const page of ALL_PAGES) {
      expect(page).not.toMatch(/NABL/i);
      expect(page).not.toMatch(/NMC-registered|NMC-verified|NMC register, not a form/i);
    }
  });

  it('never asserts a compliance state', () => {
    for (const page of ALL_PAGES) {
      expect(page).not.toMatch(/HIPAA|ISO ?27|certified|compliant/i);
    }
  });

  it('never promises an offline emergency card or live tracking', () => {
    for (const page of ALL_PAGES) {
      expect(page).not.toMatch(/offline emergency card|live phlebotomist tracking/i);
    }
  });

  it('never links to an app store', () => {
    // Nothing is published to either store, so both badges would be dead ends.
    for (const page of ALL_PAGES) {
      expect(page).not.toMatch(/App Store|Google Play|play\.google|apps\.apple/i);
    }
  });

  it('offers no newsletter signup, because nothing would receive it', () => {
    // Scoped to the landing pages, and matched on the newsletter rather than the
    // word: the pricing page legitimately says "a student subscribes directly"
    // about plan billing.
    for (const page of [LANDING, CAMPUS, CLINICIAN, PARTNERSHIPS, LABTESTS]) {
      expect(page).not.toMatch(/Kare Letter|newsletter/i);
    }
  });

  it('quotes no consultation service level', () => {
    for (const page of ALL_PAGES) {
      expect(page).not.toMatch(/within \d+ minutes|usually within/i);
    }
  });
});

describe('the student landing page', () => {
  it('leads with the emergency number, which needs no account', async () => {
    await openLanding();
    expect(screen.getByRole('link', { name: /call 112/i })).toHaveAttribute('href', 'tel:112');
  });

  it('states the age gate', async () => {
    await openLanding();
    expect(document.body.textContent).toMatch(/adults aged 18 and over/i);
  });

  it('shows real published items with real prices', async () => {
    await openLanding();
    expect(screen.getByText('Vitamin D3 60K')).toBeInTheDocument();
    expect(screen.getByText('₹299')).toBeInTheDocument();
  });

  it('reads the same public catalog the shop reads', async () => {
    await openLanding();
    expect(mocked).toHaveBeenCalledWith('/catalog?limit=6', expect.anything());
  });

  it('shows no products at all rather than placeholders when none load', async () => {
    // A price is not a thing to invent, so an empty catalog drops the section.
    await openLanding({ items: [], total: 0 });
    expect(screen.queryByText(/published right now/i)).toBeNull();
    expect(document.body.textContent).not.toMatch(/₹/);
  });

  it('drops the section on a failure rather than showing sample stock', async () => {
    (http as { apiRequest: unknown }).apiRequest = () => Promise.reject(new Error('down'));
    render(<LandingView />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.queryByText(/published right now/i)).toBeNull();
  });

  it('says the product is unfinished', async () => {
    await openLanding();
    expect(document.body.textContent).toMatch(/still being built/i);
  });

  it('reaches the legal pages and both audience pages', async () => {
    await openLanding();
    for (const [name, href] of [
      ['Privacy', '/privacy'],
      ['Terms', '/terms'],
      ['For campuses', '/campuses'],
      ['For clinicians', '/clinicians'],
    ] as const) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });
});

describe('the campus page', () => {
  it('quotes no suppression threshold, because none is enforced', () => {
    // The design promises "a cohort under 20 students is suppressed before the
    // result leaves the database". No campus analytics endpoint exists at all.
    expect(CAMPUS).not.toMatch(/under 20|cohort of \d+|k-anonym|suppressed before/i);
  });

  it('says cohort reporting does not exist yet', () => {
    render(<LandingCampusView />);
    expect(screen.getByText(/cohort reporting does not exist yet/i)).toBeInTheDocument();
  });

  it('promises no number it cannot enforce', () => {
    render(<LandingCampusView />);
    expect(document.body.textContent).toMatch(/not going to quote you a number that no code enforces/i);
  });

  it('states what a campus genuinely cannot see', () => {
    render(<LandingCampusView />);
    const text = document.body.textContent ?? '';
    expect(text).toMatch(/no endpoint returns them to a campus role/i);
    expect(text).toMatch(/leaving is never reported to a campus/i);
  });
});

describe('the clinician page', () => {
  it('keeps the two access claims that are enforced', () => {
    render(<LandingClinicianView />);
    const text = document.body.textContent ?? '';
    expect(text).toMatch(/the share is the authorisation/i);
    expect(text).toMatch(/room and initials/i);
  });

  it('admits registration is not checked', () => {
    render(<LandingClinicianView />);
    expect(document.body.textContent).toMatch(/do not yet verify a registration number/i);
  });

  it('publishes no commission share', () => {
    // The design says 90%/10% on two screens, but nothing configures a rate and
    // /work/earnings reports gross only.
    expect(CLINICIAN).not.toMatch(/90%|10% commission|of every consult is yours/i);
    render(<LandingClinicianView />);
    expect(document.body.textContent).toMatch(/no commission rate is configured/i);
  });

  it('offers no application form, because nothing would receive it', () => {
    render(<LandingClinicianView />);
    expect(document.body.textContent).toMatch(/no application form here yet/i);
    expect(document.body.querySelector('form')).toBeNull();
  });
});

describe('accessibility', () => {
  it('hides the decorative marks on every page', async () => {
    await openLanding();
    render(<LandingCampusView />);
    render(<LandingClinicianView />);
    for (const svg of document.body.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('gives each page one first-level heading', () => {
    for (const View of [LandingCampusView, LandingClinicianView]) {
      document.body.innerHTML = '';
      render(<View />);
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    }
  });
});

describe('rupees', () => {
  it('groups in the Indian system', () => {
    expect(rupees(1000000000)).toBe('₹1,00,00,000');
  });

  it('shows paise only when there are any', () => {
    expect(rupees(29900)).toBe('₹299');
    expect(rupees(29950)).toBe('₹299.50');
  });
});

describe('kindLabel', () => {
  it('names the kinds the catalog serves', () => {
    expect(kindLabel('product')).toBe('Medicine');
    expect(kindLabel('lab')).toBe('Lab test');
    expect(kindLabel('consultation')).toBe('Consultation');
    expect(kindLabel('vaccine')).toBe('Vaccine');
  });

  it('passes an unknown kind through rather than guessing', () => {
    expect(kindLabel('device')).toBe('device');
  });
});


describe('the pricing page no longer badges itself', () => {
  it('asserts no ABDM or ABHA compliance', () => {
    // This was live on a public page: "ABDM & ABHA Compliant".
    expect(PRICING).not.toMatch(/ABDM ?& ?ABHA Compliant|ABHA Compliant/i);
  });

  it('claims no encryption of health records', () => {
    // "256-bit encrypted personal health records". Records are not encrypted at
    // rest; the only encryption in the repo is Fernet for provider secrets, and
    // only when INTEGRATIONS_ENCRYPTION_KEY is set.
    expect(PRICING).not.toMatch(/256-bit|encrypted personal health records/i);
  });

  it('claims no verified clinical network', () => {
    expect(PRICING).not.toMatch(/100% verified|Verified Labs/i);
  });

  it('claims no instant activation', () => {
    // Signup writes isVerifiedStudent: false and verification starts
    // NOT_SUBMITTED, so there is an onboarding delay by design.
    expect(PRICING).not.toMatch(/Instant Activation|Zero onboarding delay/i);
  });

  it('claims no device health sync', () => {
    expect(PRICING).not.toMatch(/Apple Health|Health Connect/i);
  });

  it('claims no campus telemetry dashboard', () => {
    expect(PRICING).not.toMatch(/aggregate telemetry dashboards/i);
  });

  it('promises no unlimited entitlement', () => {
    expect(PRICING).not.toMatch(/unlimited/i);
  });

  it('keeps the honest disclaimer that was already there', () => {
    expect(PRICING).toMatch(/never sees a member's record/i);
  });
});

describe('the partnerships page', () => {
  it('keeps the no-paid-placement claim, which is enforced', () => {
    mocked.mockImplementation(() => Promise.resolve({}));
    // clinical_api ranks by pincode match then legal name, and says so on every
    // response: "never by commission or paid placement".
    render(<LandingPartnershipsView />);
    const text = document.body.textContent ?? '';
    expect(text).toMatch(/no sponsored slots/i);
    expect(text).toMatch(/never by what you pay/i);
  });

  it('states the real ordering, not the one from the design', () => {
    // The design says "stock, distance and turnaround". Nothing implements that.
    expect(PARTNERSHIPS).not.toMatch(/stock, distance and turnaround/i);
    render(<LandingPartnershipsView />);
    expect(document.body.textContent).toMatch(/pincode match, then name/i);
  });

  it('publishes no commission rate', () => {
    render(<LandingPartnershipsView />);
    expect(document.body.textContent).toMatch(/commission is not published yet/i);
  });

  it('shows no partner logos and no founder note', () => {
    // The design marks both PLACEHOLDER.
    expect(PARTNERSHIPS).not.toMatch(/as seen in|founder portrait|Krishna Chintakayala/i);
    render(<LandingPartnershipsView />);
    expect(document.body.textContent).toMatch(/until a partner has signed/i);
  });

  it('promises no reply time', () => {
    expect(PARTNERSHIPS).not.toMatch(/within a week|reply within/i);
  });

  it('posts the application to an endpoint that exists', async () => {
    mocked.mockImplementation(() => Promise.resolve({ id: 'inq_1', status: 'NEW' }));
    render(<LandingPartnershipsView />);
    fireEvent.change(screen.getByLabelText(/organisation/i), { target: { value: 'Kare Labs' } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'a@b.test' } });
    fireEvent.click(screen.getByRole('checkbox'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send application/i }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mocked).toHaveBeenCalledWith('/billing/inquiries', expect.objectContaining({ method: 'POST' }));
  });

  it('cannot be submitted without consent, which is never pre-ticked', () => {
    render(<LandingPartnershipsView />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: /send application/i })).toBeDisabled();
  });

  it('confirms without inventing a response time', async () => {
    mocked.mockImplementation(() => Promise.resolve({ id: 'inq_1', status: 'NEW' }));
    render(<LandingPartnershipsView />);
    fireEvent.change(screen.getByLabelText(/organisation/i), { target: { value: 'Kare Labs' } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: 'a@b.test' } });
    fireEvent.click(screen.getByRole('checkbox'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send application/i }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText(/not going to promise you one/i)).toBeInTheDocument();
  });
});

describe('the lab tests page', () => {
  async function openLabs(body: unknown = { items: [item({ kind: 'lab', name: 'Vitamin D, 25-OH' })], total: 1 }) {
    mocked.mockImplementation(() => Promise.resolve(body));
    render(<LandingLabTestsView />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('reads the published lab catalog', async () => {
    await openLabs();
    expect(mocked).toHaveBeenCalledWith('/catalog?kind=lab&limit=12', expect.anything());
    expect(screen.getByText('Vitamin D, 25-OH')).toBeInTheDocument();
  });

  it('quotes no turnaround time', () => {
    expect(LABTESTS).not.toMatch(/24 ?h|within 24|results in \d/i);
  });

  it('claims no cold chain', async () => {
    // "Time and temperature ... both are tracked and shown to you." Neither is.
    expect(LABTESTS).not.toMatch(/°C|temperature are tracked|a sample is not a parcel/i);
    await openLabs();
    expect(document.body.textContent).toMatch(/not going to imply a cold chain/i);
  });

  it('does not say a clinician signs a report first', async () => {
    // The real order is the opposite and it is opt-in. Implying a signature
    // would have a student waiting for one that is not coming.
    await openLabs();
    expect(document.body.textContent).toMatch(/nothing waits on a signature/i);
    expect(LABTESTS).not.toMatch(/clinician-signed|the moment a clinician signs/i);
  });

  it('says so plainly when nothing is published', async () => {
    await openLabs({ items: [], total: 0 });
    expect(screen.getByText(/no lab tests are published yet/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/₹/);
  });
});
