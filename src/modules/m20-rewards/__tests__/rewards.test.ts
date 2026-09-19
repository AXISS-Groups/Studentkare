import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { RewardsRepository } from '../data/rewards.repository';

describe('Rewards Module (M20)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M20');
    expect(config.dataClass).toBe('commercial');
  });

  it('fetches challenges from repository', async () => {
    const repo = new RewardsRepository();
    const items = await repo.fetchChallenges();
    expect(Array.isArray(items)).toBe(true);
  });
});
