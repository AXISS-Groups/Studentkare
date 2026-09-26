import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as http from '@/data/http';
import {
  WellnessTrainingScreen,
  rupees,
  sittingWhen,
  spotsText,
} from '../WellnessTrainingScreen';
import { WellnessWorkshopsScreen } from '../../institution/WellnessWorkshopsScreen';

vi.mock('@/data/http', () => ({ apiRequest: vi.fn() }));
const mocked = vi.mocked(http.apiRequest);

function codeOf(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const STUDENT = codeOf('src/screens/wellbeing/WellnessTrainingScreen.tsx');
const CAMPUS = codeOf('src/screens/institution/WellnessWorkshopsScreen.tsx');

const sitting = (over: Partial<Record<string, unknown>> = {}) => ({
  slotId: 'slot1',
  slotStart: '2026-10-07T17:00:00.000Z',
  slotEnd: '2026-10-07T18:00:00.000Z',
  capacity: 12,
  spotsLeft: 7,
  ...over,
});

const session = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'yoga',
  name: 'Yoga',
  category: 'yoga',
  description: 'Hatha and vinyasa, all levels.',
  pack: '60 min · mats provided',
  pricePaise: 7900,
  providerName: 'VNR VJIET',
  sittings: [sitting()],
  ...over,
});

async function open(View: React.ComponentType, body: unknown = [session()]) {
  mocked.mockImplementation(() => Promise.resolve(body));
  render(<View />);
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

describe('nothing here measures the student', () => {
  it('keeps the design promise of no leaderboards and no body scores', async () => {
    // Rule L: no gamification of body metrics. The promise is on the screen
    // because it is one this system actually keeps.
    await open(WellnessTrainingScreen);
    expect(document.body.textContent).toMatch(/no leaderboards and no body scores/i);
  });

  it('renders no streak, rank or score anywhere', async () => {
    await open(WellnessTrainingScreen);
    // "leaderboard" is excluded from the match: the only place it appears is the
    // sentence promising there are none, which is the point.
    expect(document.body.textContent).not.toMatch(/streak|\brank\b|calorie|\bBMI\b/i);
    for (const source of [STUDENT, CAMPUS]) {
      expect(source).not.toMatch(/streak|\brank\b|calories|\bbmi\b/i);
    }
  });
});

describe('claims the wellness screens do not make', () => {
  it('never calls a coach certified', () => {
    // Guardrail 6: no certification is recorded or verified for anyone.
    for (const source of [STUDENT, CAMPUS]) {
      expect(source).not.toMatch(/certified|accredited|qualified coach/i);
    }
  });

  it('offers no plan discount', () => {
    // "Premium: ₹20 off every session". No per-item plan discount exists.
    for (const source of [STUDENT, CAMPUS]) {
      expect(source).not.toMatch(/₹20 off|premium:|plan discount/i);
    }
  });

  it('invents no cancellation cutoff', async () => {
    // "Cancel up to 2 hours before, free." Cancelling is free and returns the
    // spot, but no cutoff is implemented.
    expect(STUDENT).not.toMatch(/2 hours before|up to \d+ hours/i);
    await open(WellnessTrainingScreen);
    expect(document.body.textContent).toMatch(/there is no cutoff/i);
  });
});

describe('the student timetable', () => {
  it('reads the published timetable', async () => {
    await open(WellnessTrainingScreen);
    expect(mocked).toHaveBeenCalledWith('/wellness/timetable', expect.anything());
  });

  it('shows the session, its campus and its real price', async () => {
    await open(WellnessTrainingScreen);
    expect(screen.getByRole('heading', { name: 'Yoga' })).toBeInTheDocument();
    expect(document.body.textContent).toContain('VNR VJIET');
    expect(screen.getByText('₹79')).toBeInTheDocument();
  });

  it('shows spots remaining against capacity', async () => {
    await open(WellnessTrainingScreen);
    expect(screen.getByText('7 of 12')).toBeInTheDocument();
  });

  it('books through the appointment path that reserves capacity', async () => {
    // Routed by path: booking triggers a timetable reload, so a single-shape
    // mock would serve the appointment response to the refetch and blow up.
    mocked.mockImplementation((path: string) =>
      Promise.resolve(path.startsWith('/appointments') ? { id: 'appt1' } : [session()]) as never,
    );
    render(<WellnessTrainingScreen />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /book a spot/i }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mocked).toHaveBeenCalledWith(
      '/appointments',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('cannot book a full sitting', async () => {
    await open(WellnessTrainingScreen, [session({ sittings: [sitting({ spotsLeft: 0 })] })]);
    expect(screen.getByRole('button', { name: /full/i })).toBeDisabled();
  });

  it('says so when a session has no sittings scheduled', async () => {
    await open(WellnessTrainingScreen, [session({ sittings: [] })]);
    expect(screen.getByText(/no sittings are scheduled/i)).toBeInTheDocument();
  });

  it('says nothing is published rather than showing an empty table', async () => {
    await open(WellnessTrainingScreen, []);
    expect(screen.getByText(/no sessions are published yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('surfaces a failure rather than an empty timetable', async () => {
    // "No sessions" would read as "your campus runs nothing".
    (http as { apiRequest: unknown }).apiRequest = () => Promise.reject(new Error('down'));
    render(<WellnessTrainingScreen />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/no sessions are published/i);
  });
});

describe('the campus view', () => {
  it('no longer invents workshops or instructors', () => {
    // It held "Dr. Neha Kapoor (Clinical Psychologist)", "Coach S. Ramakrishnan"
    // and RSVP counts of 42 and 28, hardcoded in a useState.
    expect(CAMPUS).not.toMatch(/Neha Kapoor|Ramakrishnan|rsvps|useState/i);
  });

  it('reads the same timetable the students see', async () => {
    await open(WellnessWorkshopsScreen);
    expect(mocked).toHaveBeenCalledWith('/wellness/timetable', expect.anything());
  });

  it('reports take-up from the real booking count', async () => {
    await open(WellnessWorkshopsScreen, [session({ sittings: [sitting({ capacity: 12, spotsLeft: 7 })] })]);
    expect(screen.getByText('5 / 12')).toBeInTheDocument();
  });

  it('shows no student identity, and says so', async () => {
    await open(WellnessWorkshopsScreen);
    const text = document.body.textContent ?? '';
    expect(text).toMatch(/never who took them/i);
    expect(text).toMatch(/not something their university is told about/i);
  });

  it('says nothing is published rather than showing a sample', async () => {
    await open(WellnessWorkshopsScreen, []);
    expect(screen.getByText(/no wellness sessions are published/i)).toBeInTheDocument();
  });
});

describe('accessibility', () => {
  it('gives the tables real headers', async () => {
    await open(WellnessTrainingScreen);
    expect(screen.getByRole('columnheader', { name: /spots left/i })).toBeInTheDocument();
  });

  it('hides the decorative marks', async () => {
    await open(WellnessTrainingScreen);
    for (const svg of document.body.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  });
});

describe('rupees', () => {
  it('says Free rather than a zero price', () => {
    // A meditation sitting is free in the design, and "₹0" reads as a glitch.
    expect(rupees(0)).toBe('Free');
  });

  it('groups in the Indian system', () => {
    expect(rupees(7900)).toBe('₹79');
    expect(rupees(100000000)).toBe('₹10,00,000');
  });

  it('shows paise only when there are any', () => {
    expect(rupees(7950)).toBe('₹79.50');
  });
});

describe('spotsText', () => {
  it('reads as remaining against capacity', () => {
    expect(spotsText(sitting() as never)).toBe('7 of 12');
  });

  it('says Full at zero', () => {
    expect(spotsText(sitting({ spotsLeft: 0 }) as never)).toBe('Full');
  });
});

describe('sittingWhen', () => {
  it('formats a sitting time', () => {
    expect(sittingWhen(sitting() as never)).toMatch(/Oct/);
  });

  it('passes an unparseable time through rather than showing Invalid Date', () => {
    expect(sittingWhen(sitting({ slotStart: 'not-a-time' }) as never)).toBe('not-a-time');
  });
});
