import { describe, expect, it } from 'vitest';
import { consoleHasOwnChrome, drawsStudentWebShell, pageTransitionKey } from '../App';

describe('page transition key', () => {
  it('is the same for every Super Admin section, so the console stays mounted', () => {
    expect(pageTransitionKey('/admin')).toBe('admin');
    expect(pageTransitionKey('/admin/flags')).toBe('admin');
    expect(pageTransitionKey('/admin/tokens')).toBe('admin');
  });

  it('is the same for every partner console section, so its shell stays mounted', () => {
    expect(pageTransitionKey('/vendor')).toBe('vendor');
    expect(pageTransitionKey('/lab-queue')).toBe('vendor');
    expect(pageTransitionKey('/vendor-rx-review')).toBe('vendor');
    expect(pageTransitionKey('/staff-roles')).toBe('vendor');
  });

  it('is the same for every clinician console page, including the older panels it now hosts', () => {
    for (const path of ['/clinician', '/clinician/queue', '/clinician/inbox', '/earnings', '/chronic', '/report-reviews', '/clinical-review', '/clinical-notes', '/notifications', '/support']) {
      expect(pageTransitionKey(path)).toBe('clinician');
    }
  });

  it('is the same for every campus console board, and for a campus admin\'s notifications and help', () => {
    for (const path of ['/campus', '/campus/students', '/campus/water', '/campus-wellness', '/campus-access-requests', '/campus-break-glass']) {
      expect(pageTransitionKey(path)).toBe('campus');
    }
    expect(pageTransitionKey('/notifications', 'CAMPUS_ADMIN')).toBe('campus');
    expect(pageTransitionKey('/support', 'CAMPUS_ADMIN')).toBe('campus');
    expect(pageTransitionKey('/notifications', 'NMC_DOCTOR')).toBe('clinician');
    expect(pageTransitionKey('/campuses')).toBe('/campuses');
  });

  it('still changes for other pages, which keep their full-page transition', () => {
    expect(pageTransitionKey('/health')).toBe('/health');
    expect(pageTransitionKey('/login')).toBe('/login');
    expect(pageTransitionKey('/administration')).toBe('/administration');
    expect(pageTransitionKey('/vendors')).toBe('/vendors');
    expect(pageTransitionKey('/clinicians')).toBe('/clinicians');
  });
});

describe('app bar above a console', () => {
  it('is not drawn over consoles with their own sidebar, so the sidebar footer stays on screen', () => {
    expect(consoleHasOwnChrome('/admin', 'SUPER_ADMIN')).toBe(true);
    expect(consoleHasOwnChrome('/admin/accounts', 'SUPER_ADMIN')).toBe(true);
    for (const path of ['/clinician', '/clinician/queue', '/earnings', '/clinical-review', '/notifications', '/support']) {
      expect(consoleHasOwnChrome(path, 'NMC_DOCTOR')).toBe(true);
    }
    for (const path of ['/campus', '/campus/sla', '/campus-break-glass', '/notifications', '/support']) {
      expect(consoleHasOwnChrome(path, 'CAMPUS_ADMIN')).toBe(true);
    }
    expect(consoleHasOwnChrome('/campus/reports', 'SUPER_ADMIN')).toBe(true);
    // Their personal and shared pages open in their own console too (live-run audit #8).
    expect(consoleHasOwnChrome('/support', 'COUNSELLOR')).toBe(true);
    expect(consoleHasOwnChrome('/clinical-review', 'SUPER_ADMIN')).toBe(true);
    expect(consoleHasOwnChrome('/security', 'SUPER_ADMIN')).toBe(true);
    expect(consoleHasOwnChrome('/wellness-training', 'VENDOR')).toBe(true);
  });

  it('is still drawn for everyone else, including a student on the shared pages', () => {
    expect(consoleHasOwnChrome('/notifications', 'STUDENT')).toBe(false);
    expect(consoleHasOwnChrome('/campus', 'STUDENT')).toBe(false);
    expect(consoleHasOwnChrome('/health', 'NMC_DOCTOR')).toBe(false);
    expect(consoleHasOwnChrome('/administration', 'STUDENT')).toBe(false);
  });

  it('draws no app bar above the student web shell: its top nav carries Alerts and SOS', () => {
    for (const path of ['/health', '/orders', '/profile', '/security', '/notification-settings', '/home', '/buy-again', '/shop', '/checkout', '/lab-tests', '/care', '/your-care']) {
      expect(drawsStudentWebShell(path, 'STUDENT', false)).toBe(true);
    }
    // At phone width the phone frame draws its own header; other roles keep their chrome.
    expect(drawsStudentWebShell('/health', 'STUDENT', true)).toBe(false);
    expect(drawsStudentWebShell('/health', 'NMC_DOCTOR', false)).toBe(false);
    expect(drawsStudentWebShell('/shop', null, false)).toBe(false);
    // Visitors on /care keep the public marketplace and its own header.
    expect(drawsStudentWebShell('/care', null, false)).toBe(false);
  });
});
