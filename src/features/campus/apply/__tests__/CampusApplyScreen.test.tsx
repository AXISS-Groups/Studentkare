import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';

const navigate = vi.fn();
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: (route: string) => navigate(route) }));

import { APPLY_STEPS, CampusApplyScreen, fieldOk } from '../CampusApplyScreen';
import { canAccessRoute, publicRoutes } from '@/lib/utils/workflowRouting';

afterEach(() => navigate.mockReset());

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('CampusApplyScreen', () => {
  it('is a public page', () => {
    expect(publicRoutes).toContain('campuses/apply');
    expect(canAccessRoute('campuses/apply', null)).toBe(true);
  });

  it('says up front that nothing is sent, and opens on step 1 of 4', async () => {
    const { container } = render(<CampusApplyScreen />);
    expect(screen.getByRole('note')).toHaveTextContent('Online applications aren’t connected yet');
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Your institution' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'About joining' })).toHaveTextContent('never individual health data');
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('validates each step before moving on, as the canvas does', () => {
    render(<CampusApplyScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Fill in the highlighted items to continue.');
    type('Institution name', 'VNR Vignana Jyothi Institute of Engineering & Technology');
    type('AISHE code', 'X-1');
    expect(screen.getByText('Like C-12345')).toBeInTheDocument();
    type('AISHE code', 'C-12345');
    type('Students on campus', '4200');
    fireEvent.click(screen.getByRole('radio', { name: 'Yes, on campus' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { level: 1, name: 'People we’ll work with' })).toHaveFocus();
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('AISHE code')).toHaveValue('C-12345');
  });

  it('ends on a disabled "Send for signature" with the reason', () => {
    render(<CampusApplyScreen />);
    type('Institution name', 'VNR VJIET');
    type('AISHE code', 'C-12345');
    type('Students on campus', '4200');
    fireEvent.click(screen.getByRole('radio', { name: 'No hostels' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    type('Campus admin (name, email)', 'Priya Rao, priya@vnrvjiet.in');
    type('Health desk contact', '+91 40 2304 2758');
    type('Counsellor on call', 'Ms. Kavya');
    type('Nearest hospital for emergencies', 'SLG Hospitals');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.change(screen.getByLabelText(/Roll list/), { target: { files: [new File(['roll'], 'roll.csv', { type: 'text/csv' })] } });
    expect(screen.getByText('roll.csv · stays on this computer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Match against roll list' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /never an individual student’s health/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
    const send = screen.getByRole('button', { name: /Send for signature/ });
    expect(send).toBeDisabled();
    expect(send).toHaveTextContent('nothing leaves this page');
  });

  it('checks fields the way the canvas does', () => {
    const [aishe, students] = [APPLY_STEPS[0].fields[1], APPLY_STEPS[0].fields[2]];
    expect(fieldOk(aishe, 'c-12345')).toBe(true);
    expect(fieldOk(aishe, '12345')).toBe(false);
    expect(fieldOk(students, '4200')).toBe(true);
    expect(fieldOk(students, 'many')).toBe(false);
    expect(fieldOk(APPLY_STEPS[2].fields[2], true)).toBe(true);
    expect(fieldOk(APPLY_STEPS[2].fields[2], false)).toBe(false);
  });
});
