import type React from 'react';

/**
 * Makes a non-button element behave like one for keyboard and screen-reader
 * users (guardrail 7): a role, a tab stop, and Enter/Space activation. Prefer
 * a real <button>; use this where layout makes that impractical (a clickable
 * card, a row, an image).
 */
export function pressable(onActivate: () => void, label?: string): {
  role: 'button';
  tabIndex: 0;
  'aria-label'?: string;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
} {
  return {
    role: 'button',
    tabIndex: 0,
    ...(label ? { 'aria-label': label } : {}),
    onClick: onActivate,
    onKeyDown: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onActivate();
      }
    },
  };
}
