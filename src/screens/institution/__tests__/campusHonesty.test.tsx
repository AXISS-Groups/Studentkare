import { describe, expect, it } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HostelOutbreakEarlyWarningRadar } from '@/components/institution/HostelOutbreakEarlyWarningRadar';
import { CampusEpidemicOutbreakRadar } from '@/components/CampusEpidemicOutbreakRadar';
import { CampusAccessRequestsScreen, CampusBreakGlassScreen, CampusIsolationScreen } from '@/features/campus/safety';
import { LanguageProvider } from '@/i18n';
import { ThemeProvider } from '@/theme/tokens/theme';
import { campusEn, campusHi, campusTe } from '@/i18n/areas/campus';
import { campusSafetyHi } from '@/i18n/areas/campusSafety';

function codeOf(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const text = () => document.body.textContent ?? '';

describe('outbreak radars say no surveillance source is connected', () => {
  it('the hostel radar shows the honest empty state and no fake dispatch', () => {
    render(<HostelOutbreakEarlyWarningRadar />);
    expect(screen.getByText(/no surveillance data source connected/i)).toBeInTheDocument();
    expect(text()).toMatch(/does not mean there is no outbreak/i);
    expect(text()).not.toMatch(/dispatch/i);
  });

  it('the campus radar shows the honest state and claims no enforced anonymity', () => {
    render(<ThemeProvider><CampusEpidemicOutbreakRadar /></ThemeProvider>);
    expect(screen.getByText(/no surveillance data source connected/i)).toBeInTheDocument();
    expect(text()).not.toMatch(/anonymity enforced|dispatched/i);
  });

  it('neither radar keeps a local list that a button can mark as dispatched', () => {
    for (const path of ['src/components/CampusEpidemicOutbreakRadar.tsx', 'src/components/institution/HostelOutbreakEarlyWarningRadar.tsx']) {
      const code = codeOf(path);
      expect(code).not.toMatch(/useState|Dispatched|ENFORCED/);
    }
  });
});

describe('break-glass and access requests fail closed and say so up front', () => {
  it('break-glass says nothing can open a card and never reports access granted', () => {
    render(<CampusBreakGlassScreen />);
    expect(text()).toMatch(/nothing on this page can open a student’s card yet/i);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse / unconscious' }));
    fireEvent.change(screen.getByRole('textbox', { name: /what is happening/i }), { target: { value: 'Unconscious student' } });
    expect(screen.getByRole('button', { name: /open emergency card/i })).toBeDisabled();
    expect(text()).not.toMatch(/access granted|audit id|left$/i);
  });

  it('access requests say nothing reaches the student and cannot send', async () => {
    render(<CampusAccessRequestsScreen />);
    expect(text()).toMatch(/no request can reach a student yet/i);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'New request' })); });
    expect(screen.getByRole('button', { name: /send request to student/i })).toBeDisabled();
    expect(codeOf('src/features/campus/safety/CampusAccessRequestsScreen.tsx')).not.toMatch(/setTimeout|apiRequest|Request sent/);
  });

  it('follows the app language instead of its own toggle', () => {
    render(<LanguageProvider initial="hi"><CampusBreakGlassScreen /></LanguageProvider>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(campusSafetyHi['campusSafety.breakGlass.title']);
    expect(screen.queryByRole('button', { name: /switch to/i })).toBeNull();
  });
});

// The counsellor queue is live now; its honest empty state is covered in CounsellorQueueScreen.test.tsx.
describe('disconnected queues never read as all-quiet', () => {
  it('the isolation board does not say no student is isolated', () => {
    render(<CampusIsolationScreen />);
    expect(text()).not.toMatch(/no students in hostel isolation rooms/i);
    expect(text()).toMatch(/does not mean no student is in isolation/i);
  });
});

describe('no unbacked verification or compliance claims', () => {
  it('does not call an unchecked doctor registration "verified"', () => {
    expect(codeOf('src/screens/institution/MedicalLeaveApprovalsScreen.tsx')).not.toMatch(/Verified NMC/i);
    expect(campusEn['campus.leave.doctorReg']).toMatch(/not checked/i);
  });

  it('does not attribute Rule L to DPDP or claim a suppression is enforced', () => {
    const copy = Object.values(campusEn).join('\n');
    expect(copy).not.toMatch(/DPDP|enforced|certified|compliant/i);
  });

  it('every campus key has Telugu and Hindi', () => {
    for (const key of Object.keys(campusEn) as (keyof typeof campusEn)[]) {
      expect(campusTe[key].length).toBeGreaterThan(0);
      expect(campusHi[key].length).toBeGreaterThan(0);
    }
  });
});
