import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { pressable } from '../pressable';

describe('pressable', () => {
  it('gives a clickable element a button role, a tab stop, and Enter/Space activation', () => {
    const onActivate = vi.fn();
    render(<div {...pressable(onActivate, 'Open camp')}>Camp</div>);
    const el = screen.getByRole('button', { name: 'Open camp' });
    expect(el).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(el, { key: 'Enter' });
    fireEvent.keyDown(el, { key: ' ' });
    fireEvent.keyDown(el, { key: 'a' });
    fireEvent.click(el);
    expect(onActivate).toHaveBeenCalledTimes(3);
  });
});
