import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button, Card, EmptyState, ErrorState, Note, OfflineBanner, Skeleton, Stepper, TextField, bezierFromToken } from '..';
import { Easing } from 'react-native';

describe('Button', () => {
  it('is a labelled button that fires onPress', () => {
    const onPress = vi.fn();
    render(<Button label="Continue" onPress={onPress} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('takes no presses and reports busy while busy', () => {
    const onPress = vi.fn();
    render(<Button label="Pay ₹499" onPress={onPress} busy />);
    const button = screen.getByRole('button', { name: 'Pay ₹499' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('takes no presses when disabled', () => {
    const onPress = vi.fn();
    render(<Button label="Continue" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('meets the 44 px hit target at every size', () => {
    for (const size of ['default', 'cta'] as const) {
      const { unmount } = render(<Button label={size} onPress={() => {}} size={size} />);
      const minHeight = parseFloat(getComputedStyle(screen.getByRole('button', { name: size })).minHeight);
      expect(minHeight).toBeGreaterThanOrEqual(44);
      unmount();
    }
  });
});

describe('TextField', () => {
  it('is named by its visible label and reports changes', () => {
    const onChange = vi.fn();
    render(<TextField label="College email" value="" onChangeText={onChange} />);
    const input = screen.getByLabelText('College email');
    fireEvent.change(input, { target: { value: 'a@b.edu' } });
    expect(onChange).toHaveBeenCalledWith('a@b.edu');
  });

  it('marks itself invalid and announces the error', () => {
    render(<TextField label="College email" value="x" onChangeText={() => {}} error="Use your college email." />);
    expect(screen.getByLabelText('College email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Use your college email.');
  });
});

describe('Note', () => {
  it('interrupts only for danger', () => {
    const { rerender } = render(<Note tone="attention">Outside the lab's range</Note>);
    expect(screen.queryByRole('alert')).toBeNull();
    rerender(<Note tone="danger">Photo does not match</Note>);
    expect(screen.getByRole('alert')).toHaveTextContent('Photo does not match');
  });
});

describe('Stepper', () => {
  it('announces position and clamps out-of-range input', () => {
    render(<Stepper current={9} total={4} label="Step 4 of 4" />);
    const bar = screen.getByRole('progressbar', { name: 'Step 4 of 4' });
    expect(bar).toHaveAttribute('aria-valuenow', '4');
    expect(bar).toHaveAttribute('aria-valuemax', '4');
  });
});

describe('States', () => {
  it('skeleton is a named, busy progress region', () => {
    render(<Skeleton label="Loading your records" lines={['100%', '78%', '54%']} />);
    expect(screen.getByRole('progressbar', { name: 'Loading your records' })).toHaveAttribute('aria-busy', 'true');
  });

  it('empty state offers its one next step', () => {
    const onPress = vi.fn();
    render(<EmptyState title="No reports yet" body="Reports from your lab appear here." action={{ label: 'Book a test', onPress }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Book a test' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('error state retries and shows a reference code', () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        title="Couldn't load this"
        body="This is on our side, not yours. Try again."
        retryLabel="Try again"
        onRetry={onRetry}
        reference={{ label: 'Reference', code: 'SK-4F2A' }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('SK-4F2A');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('offline banner is a polite status, with no action', () => {
    render(<OfflineBanner message="You're offline." />);
    expect(screen.getByRole('status')).toHaveTextContent("You're offline.");
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('card renders its children', () => {
    render(<Card><Button label="Open" onPress={() => {}} /></Card>);
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });
});

describe('motion', () => {
  it('parses the easing token and falls back to linear on a bad one', () => {
    expect(bezierFromToken('cubic-bezier(0.16, 1, 0.3, 1)')(1)).toBeCloseTo(1);
    expect(bezierFromToken('ease-in')).toBe(Easing.linear);
  });
});

describe('SwitchRow', () => {
  it('is a named switch that reports its state and toggles', async () => {
    const { SwitchRow } = await import('../SwitchRow');
    const onChange = vi.fn();
    render(<SwitchRow label="Email" value={false} onChange={onChange} />);
    const sw = screen.getByRole('switch', { name: 'Email' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
