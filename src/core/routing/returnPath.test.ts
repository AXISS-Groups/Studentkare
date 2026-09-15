import { describe, expect, it } from 'vitest';
import { readReturnPath } from './returnPath';

describe('authentication return destinations', () => {
  it.each(['checkout', 'records', 'admin/catalog', 'clinical-notes'])('preserves the protected destination %s', path => {
    expect(readReturnPath(`?next=${encodeURIComponent(path)}`)).toBe(path);
  });

  it.each(['', '?next=', '?next=login', '?next=signup', '?next=shop', '?next=https://example.com', '?next=//example.com', '?next=../admin', '?next=unknown', '?next=records&next=checkout', '?next=records%3Fnext%3Dadmin'])('rejects an invalid or ambiguous return query: %s', search => {
    expect(readReturnPath(search)).toBeNull();
  });
});
