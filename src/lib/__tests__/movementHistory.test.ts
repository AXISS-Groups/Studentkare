import { describe, expect, it } from 'vitest';
import { formatDuration } from '../movementHistory';


describe('movement history', () => {
  it('formats duration', () => {
    expect(formatDuration(0)).toBe('0m 00s');
    expect(formatDuration(65)).toBe('1m 05s');
    expect(formatDuration(754)).toBe('12m 34s');
  });
});
