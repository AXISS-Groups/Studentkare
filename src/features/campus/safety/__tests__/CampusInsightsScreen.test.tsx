import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';

const navigate = vi.fn();
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: (route: string) => navigate(route) }));
const apiRequest = vi.fn();
vi.mock('@/data/services/http', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/data/services/http')>()), apiRequest: (...args: unknown[]) => apiRequest(...args) }));

import { CampusInsightsScreen } from '../CampusInsightsScreen';
import { CAMPUS_MIN_GROUP } from '@/features/campus/boards/boardKit';

afterEach(() => { navigate.mockReset(); apiRequest.mockReset(); });

describe('CampusInsightsScreen (no aggregate source)', () => {
  it('draws the board with every figure "—", no shares and no sample numbers', async () => {
    const { container } = render(<CampusInsightsScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Health insights' })).toBeInTheDocument();
    for (const label of ['Screened', 'Vaccinated', 'BP checked', 'Eye test']) {
      expect(screen.getByText(label, { selector: 'dt' }).parentElement).toHaveTextContent('—');
    }
    expect(screen.getByText('n = —')).toBeInTheDocument();
    expect(screen.getByText('Cohort aggregates aren’t connected yet')).toBeInTheDocument();
    // No board sample: shares, cohort size, band words or extra cohorts.
    expect(document.body.textContent).not.toMatch(/\d+%|3,184|Obese|Stage 2|1st year|Civil/);
    expect(apiRequest).not.toHaveBeenCalled();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('states the suppression floor from its one source, never the picture', () => {
    render(<CampusInsightsScreen />);
    expect(screen.getByText(`Groups smaller than ${CAMPUS_MIN_GROUP} students`)).toBeInTheDocument();
    expect(document.body.textContent).toMatch(new RegExp(`smaller than ${CAMPUS_MIN_GROUP} students is withheld on the server`));
  });

  it('always shows what the page will never show, and points to access requests', () => {
    render(<CampusInsightsScreen />);
    expect(screen.getByRole('heading', { name: 'What this page will never show' })).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/Counsellor, crisis, mental-health or sexual-health counts/);
    fireEvent.click(screen.getByRole('link', { name: 'Open access requests' }), { button: 0 });
    expect(navigate).toHaveBeenCalledWith('campus-access-requests');
  });

  it('keeps the export disabled and says why', () => {
    render(<CampusInsightsScreen />);
    const exportButton = screen.getByRole('button', { name: /Export aggregate PDF/ });
    expect(exportButton).toBeDisabled();
    expect(exportButton).toHaveTextContent(/no aggregates to export/);
  });
});
