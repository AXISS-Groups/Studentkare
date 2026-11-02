import { describe, expect, it } from 'vitest';
import { canonicalPathname } from '../canonicalPath';

const patterns = ['/', '/admin', '/admin/accounts', '/blog', '/blog/featured', '/blog/:slug', '/series/:slug/episodes/:episode'];

describe('canonicalPathname', () => {
  it.each([
    ['/', '/'],
    ['', '/'],
    ['//', '/'],
    ['/admin', '/admin'],
    ['/ADMIN', '/admin'],
    ['/admin/', '/admin'],
    ['/admin//accounts/', '/admin/accounts'],
    ['//Admin///Accounts//', '/admin/accounts'],
  ])('normalises the fixed path %s -> %s', (input, expected) => {
    expect(canonicalPathname(input, patterns)).toBe(expected);
  });

  it.each([
    ['/Blog/Exam-Stress/', '/blog/Exam-Stress'],
    ['/blog//exam-stress', '/blog/exam-stress'],
    ['/BLOG/Exam%20Stress', '/blog/Exam%20Stress'],
    ['/Series/Sleep-Well/EPISODES/Ep-2/', '/series/Sleep-Well/episodes/Ep-2'],
  ])('keeps the parameter as typed in %s -> %s', (input, expected) => {
    expect(canonicalPathname(input, patterns)).toBe(expected);
  });

  it('prefers a fixed route over a parameter route that also matches', () => {
    expect(canonicalPathname('/BLOG/FEATURED', patterns)).toBe('/blog/featured');
  });

  it('keeps the case of a path no route matches, cleaning only its slashes', () => {
    expect(canonicalPathname('/Nope//There/', patterns)).toBe('/Nope/There');
  });

  it('does not match a parameter route without its parameter', () => {
    expect(canonicalPathname('/series/', patterns)).toBe('/series');
  });
});
