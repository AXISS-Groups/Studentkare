import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';
import { WebLegalView } from '../WebLegalView';

const path = vi.hoisted(() => ({ current: '/privacy' }));
vi.mock('@/core/navigation', () => ({ useRoutePath: () => path.current }));
const phone = vi.hoisted(() => ({ current: false }));
vi.mock('@/design-system/navigation/usePhoneFrame', () => ({ usePhoneFrame: () => phone.current }));

const legal = vi.hoisted(() => ({ published: false }));
vi.mock('@/features/privacy/privacyRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/privacy/privacyRepository')>();
  return {
    ...actual,
    privacyRepository: {
      ...actual.privacyRepository,
      legal: async (kind: string) => legal.published
        ? { kind, published: true, version: 'v-legal-1', title: 'Published title', body: 'Words from legal.', publishedAt: 1_760_000_000 }
        : { kind, published: false, version: null, title: null, body: null, publishedAt: null },
    },
  };
});

beforeEach(() => { path.current = '/privacy'; phone.current = false; legal.published = false; });

describe('WebLegal (canvas 3b, Tier 1)', () => {
  it('draws its own frame with the three tabs and opens on the route’s document', async () => {
    path.current = '/terms';
    const { container } = render(<WebLegalView />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy, terms and grievances' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Terms of use' }).getAttribute('aria-pressed')).toBe('true');
    expect(await screen.findByText('Our terms of use are not published yet.')).toBeTruthy();
    const v = await axeViolations(container);
    expect(v, describeViolations(v)).toEqual([]);
  });

  it('names no grievance officer, version or response time, because none exists', async () => {
    render(<WebLegalView />);
    fireEvent.click(screen.getByRole('button', { name: 'Grievance officer' }));
    expect(await screen.findByText('No grievance officer is named yet')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Ms\.|Version \d|within 30 days|within 48 hours|data fiduciary|@studentkare/);
    expect(screen.getByRole('link', { name: '112' }).getAttribute('href')).toBe('tel:112');
  });

  it('shows the published text and its version once a super admin publishes it', async () => {
    legal.published = true;
    const { container } = render(<WebLegalView />);
    expect(await screen.findByText('Words from legal.')).toBeTruthy();
    expect(screen.getByText(/Version v-legal-1/)).toBeTruthy();
    expect(screen.queryByText('Our privacy notice is not published yet.')).toBeNull();
    const v = await axeViolations(container);
    expect(v, describeViolations(v)).toEqual([]);
  });

  it('at phone width, the phone board is drawn instead', () => {
    phone.current = true;
    render(<WebLegalView />);
    expect(screen.queryByText('Privacy, terms and grievances')).toBeNull();
  });
});
