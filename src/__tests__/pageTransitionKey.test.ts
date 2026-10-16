import { describe, expect, it } from 'vitest';
import { consoleHasOwnChrome, pageTransitionKey } from '../App';

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
  });

  it('is still drawn for everyone else, including a student on the shared pages', () => {
    expect(consoleHasOwnChrome('/notifications', 'STUDENT')).toBe(false);
    expect(consoleHasOwnChrome('/support', 'CAMPUS_ADMIN')).toBe(false);
    expect(consoleHasOwnChrome('/clinical-review', 'SUPER_ADMIN')).toBe(false);
    expect(consoleHasOwnChrome('/health', 'NMC_DOCTOR')).toBe(false);
    expect(consoleHasOwnChrome('/administration', 'STUDENT')).toBe(false);
  });
});
