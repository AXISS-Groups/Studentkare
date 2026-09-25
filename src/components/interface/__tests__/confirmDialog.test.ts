import { describe, expect, it } from 'vitest';
import { nextFocusIndex } from '../ConfirmDialog';

describe('confirm dialog — focus trap', () => {
  it('moves forward through the focusable elements', () => {
    expect(nextFocusIndex(0, 2, false)).toBe(1);
  });

  it('wraps from the last element back to the first', () => {
    // Without this, Tab escapes the dialog into the page behind it, which is
    // the failure that makes a dialog untrappable for a keyboard user.
    expect(nextFocusIndex(1, 2, false)).toBe(0);
  });

  it('wraps backwards from the first element to the last', () => {
    expect(nextFocusIndex(0, 2, true)).toBe(1);
  });

  it('enters at the first element when focus is outside the dialog', () => {
    expect(nextFocusIndex(-1, 3, false)).toBe(0);
  });

  it('enters at the last element when tabbing backwards from outside', () => {
    expect(nextFocusIndex(-1, 3, true)).toBe(2);
  });

  it('reports no target when there is nothing focusable', () => {
    expect(nextFocusIndex(0, 0, false)).toBe(-1);
  });
});
