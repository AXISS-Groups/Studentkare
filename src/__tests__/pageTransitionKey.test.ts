import { describe, expect, it } from 'vitest';
import { pageTransitionKey } from '../App';

describe('page transition key', () => {
  it('is the same for every Super Admin section, so the console stays mounted', () => {
    expect(pageTransitionKey('/admin')).toBe('admin');
    expect(pageTransitionKey('/admin/flags')).toBe('admin');
    expect(pageTransitionKey('/admin/tokens')).toBe('admin');
  });

  it('still changes for other pages, which keep their full-page transition', () => {
    expect(pageTransitionKey('/health')).toBe('/health');
    expect(pageTransitionKey('/login')).toBe('/login');
    expect(pageTransitionKey('/administration')).toBe('/administration');
  });
});
