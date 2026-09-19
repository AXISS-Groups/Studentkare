import { describe, it, expect } from 'vitest';
import config from '../module.config';
import { ChatRepository } from '../data/chat.repository';

describe('Chat Module (M13)', () => {
  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M13');
    expect(config.dataClass).toBe('clinical');
  });

  it('fetches items from repository', async () => {
    const repo = new ChatRepository();
    const items = await repo.fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });
});
