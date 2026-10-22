import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';

const apiRequest = vi.fn();
vi.mock('@/data/services/http', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/data/services/http')>()), apiRequest: (...args: unknown[]) => apiRequest(...args) }));

import { BREAK_GLASS_REASONS, CampusBreakGlassScreen } from '../CampusBreakGlassScreen';

afterEach(() => apiRequest.mockReset());

describe('CampusBreakGlassScreen (no break-glass route)', () => {
  it('renders the two steps, the misuse warning and the not-connected notice', async () => {
    const { container } = render(<CampusBreakGlassScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Emergency access' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1 · Find the student' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2 · Why do you need it now?' })).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/Misuse is reviewed by the super admin/);
    expect(document.body.textContent).toMatch(/Nothing on this page can open a student’s card yet/);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('fails closed: with a reason and details, the card still cannot open and nothing is requested', () => {
    render(<CampusBreakGlassScreen />);
    expect(screen.getAllByRole('button', { pressed: false })).toHaveLength(BREAK_GLASS_REASONS.length);
    fireEvent.click(screen.getByRole('button', { name: 'Seizure' }));
    expect(screen.getByRole('button', { name: 'Seizure' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByRole('textbox', { name: 'What is happening' }), { target: { value: 'Collapsed in the mess' } });
    const open = screen.getByRole('button', { name: /Open emergency card/ });
    expect(open).toBeDisabled();
    fireEvent.submit(open.closest('form') as HTMLFormElement);
    expect(apiRequest).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    // No card, countdown, audit ID or contact is ever drawn.
    expect(document.body.textContent).not.toMatch(/BLOOD GROUP|B\+|Penicillin|BG-2026|\d+:\d\d left|Aarav|\+91/);
  });

  it('keeps student search disabled and says why', () => {
    render(<CampusBreakGlassScreen />);
    expect(screen.getByRole('searchbox', { name: 'Search by name or roll number' })).toBeDisabled();
    expect(screen.getByText('Student search isn’t connected yet.')).toBeInTheDocument();
  });

  it('keeps 108 and 112 one tap away, as keyboard-reachable tel: links', () => {
    render(<CampusBreakGlassScreen />);
    const ambulance = screen.getByRole('link', { name: 'Call 108 ambulance', description: 'Call 108, the ambulance service' });
    expect(ambulance).toHaveAttribute('href', 'tel:108');
    expect(ambulance.tabIndex).toBe(0);
    expect(screen.getByRole('link', { name: 'Call 112', description: 'Call 112, India’s emergency number' })).toHaveAttribute('href', 'tel:112');
  });
});
