import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import * as http from '@/data/http';
import {
  ClinicianChronicScreen,
  nextDueText,
  shortDate,
  stateText,
} from '../ClinicianChronicScreen';

vi.mock('@/data/http', () => ({ apiRequest: vi.fn() }));
const mocked = vi.mocked(http.apiRequest);

/** Replace the export outright for the failure case: a rejection recorded by a
 *  vi.fn is re-reported by the runner as a test failure even once the hook has
 *  caught it. */
function failWith(message: string): void {
  (http as { apiRequest: unknown }).apiRequest = () => Promise.reject(new Error(message));
}

interface Programme {
  id: string;
  label: string;
  programme: string;
  target: string;
  lastReviewAt: number | null;
  nextDueAt: number | null;
  state: string;
  overdueByDays: number | null;
}

interface Tracker {
  items: Programme[];
  onProgramme: number;
  overdue: number;
  dueThisWeek: number;
  endedByStudent: number;
}

const DAY = 86400;
const NOW = Math.floor(Date.UTC(2026, 8, 27) / 1000);

const onTrack: Programme = {
  id: 'p1',
  label: 'B-214 · KC',
  programme: 'Vitamin D',
  target: 'repeat at 12 weeks',
  lastReviewAt: NOW - 7 * DAY,
  nextDueAt: NOW + 77 * DAY,
  state: 'ACTIVE',
  overdueByDays: null,
};

const overdue: Programme = {
  ...onTrack,
  id: 'p2',
  label: 'C-108 · AK',
  programme: 'Asthma',
  target: 'action plan in place',
  nextDueAt: NOW - 12 * DAY,
  overdueByDays: 12,
};

const left: Programme = {
  ...onTrack,
  id: 'p3',
  label: 'A-331 · RM',
  programme: 'Diabetes',
  target: 'HbA1c quarterly',
  nextDueAt: null,
  state: 'ENDED_BY_STUDENT',
  overdueByDays: null,
};

const EMPTY: Tracker = {
  items: [],
  onProgramme: 0,
  overdue: 0,
  dueThisWeek: 0,
  endedByStudent: 0,
};

const loaded: Tracker = {
  items: [overdue, onTrack, left],
  onProgramme: 2,
  overdue: 1,
  dueThisWeek: 0,
  endedByStudent: 1,
};

async function open(body: Tracker | Error = EMPTY) {
  if (body instanceof Error) {
    failWith(body.message);
  } else {
    mocked.mockImplementation(() => Promise.resolve(body));
  }
  render(<ClinicianChronicScreen />);
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

describe('what a clinician sees of a student', () => {
  it('identifies them by room and initials', async () => {
    await open(loaded);
    expect(screen.getByRole('rowheader', { name: 'B-214 · KC' })).toBeInTheDocument();
  });

  it('reads the tracker endpoint and nothing else', async () => {
    // Not asserted here: that no name reaches the screen. The screen renders
    // `label` verbatim, so it has nothing to protect — the guarantee belongs to
    // the endpoint, and backend test_no_name_reaches_the_tracker holds it.
    await open(loaded);
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(mocked).toHaveBeenCalledWith('/work/chronic', expect.anything());
  });

  it('shows the programme and its target', async () => {
    await open(loaded);
    const row = screen.getByRole('row', { name: /C-108/ });
    expect(row.textContent).toContain('Asthma');
    expect(row.textContent).toContain('action plan in place');
  });
});

describe('a student who has left', () => {
  it('is shown as ended by the student', async () => {
    await open(loaded);
    const row = screen.getByRole('row', { name: /A-331/ });
    expect(row.textContent).toContain('Ended by student');
  });

  it('is given no next review date', async () => {
    await open(loaded);
    const row = screen.getByRole('row', { name: /A-331/ });
    expect(row.textContent).toContain('—');
    expect(row.textContent).not.toMatch(/overdue/i);
  });

  it('is still counted as records kept', async () => {
    await open(loaded);
    expect(screen.getByText(/left, records kept/i)).toBeInTheDocument();
  });

  it('states the guarantee on the screen, not only in the API', async () => {
    await open(loaded);
    const text = document.body.textContent ?? '';
    expect(text).toMatch(/keeps everything recorded/i);
    expect(text).toMatch(/nobody is chased after they opt out/i);
    expect(text).toMatch(/never reported to their campus/i);
  });
});

describe('review timing', () => {
  it('says how overdue a review is', async () => {
    await open(loaded);
    expect(screen.getByRole('row', { name: /C-108/ }).textContent).toContain('Overdue by 12 days');
  });

  it('marks an overdue programme as one to chase', async () => {
    await open(loaded);
    expect(screen.getByRole('row', { name: /C-108/ }).textContent).toContain('Chase');
  });

  it('marks a current programme as on track', async () => {
    await open(loaded);
    expect(screen.getByRole('row', { name: /B-214/ }).textContent).toContain('On track');
  });

  it('invents no date for a programme never reviewed', async () => {
    await open({
      ...EMPTY,
      items: [{ ...onTrack, lastReviewAt: null, nextDueAt: null }],
      onProgramme: 1,
    });
    const row = screen.getByRole('row', { name: /B-214/ });
    expect(row.textContent).toContain('Not yet');
    expect(row.textContent).toContain('After first review');
  });
});

describe('states', () => {
  it('says nothing is there yet rather than showing an empty table', async () => {
    await open(EMPTY);
    expect(screen.getByText(/nothing in the chronic tracker yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('says nobody is added without agreeing', async () => {
    await open(EMPTY);
    expect(document.body.textContent).toMatch(/without agreeing to it/i);
  });

  it('surfaces a failure rather than an empty tracker', async () => {
    // An error shown as "nothing yet" would read as "no student needs a review".
    await open(new Error('upstream unavailable'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/nothing in the chronic tracker/i);
  });
});

describe('accessibility', () => {
  it('gives the table real headers', async () => {
    await open(loaded);
    expect(screen.getByRole('columnheader', { name: /student/i })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'C-108 · AK' })).toBeInTheDocument();
  });

  it('hides the decorative marks from assistive technology', async () => {
    await open(loaded);
    for (const svg of document.body.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  });
});

describe('nextDueText', () => {
  const base = { ...onTrack };

  it('is a dash for a programme the student left', () => {
    expect(nextDueText({ ...base, state: 'ENDED_BY_STUDENT', overdueByDays: 40 })).toBe('—');
  });

  it('reads naturally for a single day overdue', () => {
    expect(nextDueText({ ...base, overdueByDays: 1 })).toBe('Overdue by 1 day');
  });

  it('pluralises beyond one day', () => {
    expect(nextDueText({ ...base, overdueByDays: 12 })).toBe('Overdue by 12 days');
  });

  it('waits for a first review rather than inventing a date', () => {
    expect(nextDueText({ ...base, nextDueAt: null })).toBe('After first review');
  });
});

describe('stateText', () => {
  it('prefers "ended" over "chase" for someone who left while overdue', () => {
    // Otherwise the screen tells a clinician to chase a student who opted out.
    expect(stateText({ ...onTrack, state: 'ENDED_BY_STUDENT', overdueByDays: 40 }))
      .toBe('Ended by student');
  });

  it('says chase when a review is overdue', () => {
    expect(stateText({ ...onTrack, overdueByDays: 3 })).toBe('Chase');
  });

  it('says on track otherwise', () => {
    expect(stateText(onTrack)).toBe('On track');
  });
});

describe('shortDate', () => {
  it('renders a day and a short month', () => {
    expect(shortDate(Math.floor(Date.UTC(2026, 7, 14) / 1000))).toMatch(/^14 Aug$/);
  });
});
