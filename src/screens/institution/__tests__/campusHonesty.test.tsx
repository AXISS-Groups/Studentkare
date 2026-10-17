import { describe, expect, it } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HostelOutbreakEarlyWarningRadar } from '@/components/institution/HostelOutbreakEarlyWarningRadar';
import { CampusEpidemicOutbreakRadar } from '@/components/CampusEpidemicOutbreakRadar';
import { CampusBreakGlass } from '../CampusBreakGlass';
import { CampusAccessRequests } from '../CampusAccessRequests';
import { OutbreakIsolationDeskScreen } from '../OutbreakIsolationDeskScreen';
import { LanguageProvider } from '@/i18n';
import { ThemeProvider } from '@/theme/theme';
import { campusEn, campusHi, campusTe } from '@/i18n/areas/campus';

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
  it('break-glass warns before submit and never reports access granted', async () => {
    render(<CampusBreakGlass />);
    expect(text()).toMatch(/submitting this form grants no access/i);
    fireEvent.change(screen.getByLabelText(/emergency reason/i), { target: { value: 'Unconscious student' } });
    fireEvent.change(screen.getByRole('textbox', { name: /authorising officer/i }), { target: { value: 'Dr. A' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /declare emergency/i })); });
    expect(screen.getByRole('alert')).toHaveTextContent(/no access was granted/i);
    expect(text()).not.toMatch(/access granted|audit logged/i);
  });

  it('access requests warn before submit and never report a request sent', async () => {
    render(<CampusAccessRequests />);
    expect(text()).toMatch(/does not reach the student/i);
    expect(codeOf('src/screens/institution/CampusAccessRequests.tsx')).not.toMatch(/setTimeout|successTitle|Request Sent/);
  });

  it('follows the app language instead of its own toggle', () => {
    render(<LanguageProvider initial="hi"><CampusBreakGlass /></LanguageProvider>);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(campusHi['campus.breakGlass.title']);
    expect(screen.queryByRole('button', { name: /switch to/i })).toBeNull();
  });
});

// The counsellor queue is live now; its honest empty state is covered in CounsellorQueueScreen.test.tsx.
describe('disconnected queues never read as all-quiet', () => {
  it('the isolation desk does not say no student is isolated', () => {
    render(<OutbreakIsolationDeskScreen />);
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
