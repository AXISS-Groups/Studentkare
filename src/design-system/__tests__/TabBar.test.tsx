import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../motion', async (importOriginal) => ({ ...(await importOriginal<typeof import('../motion')>()), useReducedMotion: () => true }));

import { TabBar } from '..';
import type { TabBarItem } from '..';
import { shadowStyle } from '../theme';
import { skTokens } from '@/theme/tokens/generated/skTokens';

afterEach(cleanup);

const items: readonly TabBarItem<'a' | 'b' | 'c'>[] = [
  { key: 'a', label: 'Discover', icon: 'compass' },
  { key: 'b', label: 'Wellness', icon: 'map-pin' },
  { key: 'c', label: 'Ayush AI', icon: 'sparkle' },
];

describe('TabBar', () => {
  it('is a named tab list with one named tab per destination', () => {
    render(<TabBar label="Main sections" items={items} selected="a" onSelect={() => undefined} />);
    const list = screen.getByRole('tablist', { name: 'Main sections' });
    expect(within(list).getAllByRole('tab').map((tab) => tab.getAttribute('aria-label'))).toEqual(['Discover', 'Wellness', 'Ayush AI']);
  });

  it('announces only the current tab as selected, and shows its label as text', () => {
    render(<TabBar label="Main sections" items={items} selected="b" onSelect={() => undefined} />);
    expect(screen.getByRole('tab', { name: 'Wellness' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Discover' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Wellness' })).toHaveTextContent('Wellness');
    // Unselected tabs are icon-only: the label is their accessible name, not visible text.
    expect(screen.getByRole('tab', { name: 'Discover' })).toHaveTextContent('');
  });

  it('calls onSelect with the pressed tab, and not for the tab already open', () => {
    const onSelect = vi.fn();
    render(<TabBar label="Main sections" items={items} selected="a" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Ayush AI' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Discover' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('c');
  });

  it('selects nothing when the screen on top is not a tab', () => {
    render(<TabBar label="Main sections" items={items} selected={null} onSelect={() => undefined} />);
    for (const tab of screen.getAllByRole('tab')) expect(tab).toHaveAttribute('aria-selected', 'false');
  });
});

describe('TabBar source (rule 11, rule 7)', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/design-system/navigation/TabBar.tsx'), 'utf8');

  it('draws the navy bar and the white current pill from the nav tokens', () => {
    expect(source).toMatch(/backgroundColor: color\.navBg/);
    expect(source).toMatch(/backgroundColor: color\.navCurrent/);
    expect(source).toMatch(/color: color\.onNavCurrent/);
    expect(source).toMatch(/color\.navText/);
  });

  it('keeps every tab at least the touch target and has no literal colours or sizes', () => {
    expect(source).toMatch(/minWidth: size\.touchTarget/);
    expect(source).toMatch(/minHeight: size\.touchTarget/);
    expect(source).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
    // Flex factors (0/1/2) are structural; every dimension comes from a token.
    expect(source).not.toMatch(/(padding|margin|width|height|gap|size|radius|inset)\w*:\s*\d/i);
  });
});

describe('shadowStyle', () => {
  it('passes the token through as a CSS box-shadow on the web', () => {
    expect(shadowStyle(skTokens.shadow.float)).toEqual({ boxShadow: skTokens.shadow.float });
  });
});
