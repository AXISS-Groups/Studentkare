import { describe, expect, it } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ABHALinkScreen } from '../ABHALinkScreen';

describe('Link ABHA (canvas AbhaLink), shown not available', () => {
  it('says plainly that linking is not available and collects nothing', () => {
    const { container } = render(<ABHALinkScreen />);
    expect(screen.getByRole('status')).toHaveTextContent(/not available yet/i);
    expect(container.querySelector('input, form')).toBeNull();
    expect(screen.queryByRole('button', { name: /unlink|link/i })).toBeNull();
  });

  it('invents no ABHA number, name, birth year or mobile', () => {
    const { container } = render(<ABHALinkScreen />);
    expect(container.textContent).not.toMatch(/\d{2}-\d{4}-\d{4}-\d{4}|\b(19|20)\d{2}\b|\+91|verified against|matches/i);
  });

  it('lists the checks as future, with neutral ticks, and the promises', () => {
    const { container } = render(<ABHALinkScreen />);
    expect(screen.getByText(/when linking opens/i)).toBeInTheDocument();
    expect(container.querySelectorAll('[data-icon="check"]')).toHaveLength(4);
    expect(screen.getByText(/without a consent request/i)).toBeInTheDocument();
  });
});
