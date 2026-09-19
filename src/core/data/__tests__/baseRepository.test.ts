import { describe, it, expect } from 'vitest';
import { BaseRepository, RLSSessionContext } from '../baseRepository';

class TestRepository extends BaseRepository {
  public getContextForTesting() {
    return this.getSessionContext();
  }
}

describe('BaseRepository (P47)', () => {
  it('instantiates successfully with valid RLS session context', () => {
    const context: RLSSessionContext = {
      authenticatedUserId: 'user_123',
      institutionGrantId: 'grant_campus_snist',
      roles: ['student'],
    };

    const repo = new TestRepository(context);
    expect(repo.getContextForTesting().authenticatedUserId).toBe('user_123');
  });

  it('throws an error if instantiated without valid RLS session context (Fail Closed / P47)', () => {
    expect(() => {
      // @ts-expect-error Testing missing context runtime failure
      new TestRepository(null);
    }).toThrow(/\[P47 Violation\]/);

    expect(() => {
      // @ts-expect-error Testing unauthenticated context runtime failure
      new TestRepository({ authenticatedUserId: '' });
    }).toThrow(/\[P47 Violation\]/);
  });
});
