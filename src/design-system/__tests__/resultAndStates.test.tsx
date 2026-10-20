import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Reduced motion is switched per test; everything else in motion is real.
const motionState = vi.hoisted(() => ({ reduced: false }));
vi.mock('../motion', async (importActual) => {
  const actual = await importActual<typeof import('../motion')>();
  return { ...actual, useReducedMotion: () => motionState.reduced };
});

import { ResultMomentCard, ResultMomentScreen, StateScreen } from '..';
import { color } from '../theme';

const noop = () => undefined;

afterEach(() => {
  motionState.reduced = false;
});

describe('ResultMomentCard (S5, canvas StatusMoments)', () => {
  it('a commerce success is a status with confetti, share, receipt, parties and one primary step', () => {
    const onTrack = vi.fn();
    render(
      <ResultMomentCard
        moment={{ kind: 'success', context: 'payment' }}
        title="₹578.00 paid"
        sub="Order SK-48120 · campus pharmacy is packing it now"
        share={{ label: 'Copy & share', onPress: noop }}
        receipt={{ label: 'Receipt', accessibilityLabel: 'Receipt, not available yet', onPress: noop, disabled: true }}
        parties={[{ label: 'To', name: 'MedPlus · Bachupally', line: 'Campus pharmacy partner', mono: 'Order SK-48120' }]}
        more={{ rows: [{ k: 'Paid on', v: '24 Sep 2026' }], showLabel: 'Show more details', hideLabel: 'Hide details' }}
        primary={{ label: 'Track order', onPress: onTrack }}
        testID="card"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('₹578.00 paid');
    expect(screen.getByRole('heading', { name: '₹578.00 paid' })).toBeInTheDocument();
    expect(screen.getByTestId('result-confetti')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy & share' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Receipt, not available yet' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('MedPlus · Bachupally')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Track order' }));
    expect(onTrack).toHaveBeenCalled();
  });

  it('folds details behind "Show more details" and says whether they are open', () => {
    render(
      <ResultMomentCard moment={{ kind: 'success', context: 'booking' }} title="Lab test booked" sub="Tomorrow 7 am"
        parties={[{ label: 'To', name: 'Vijaya Diagnostics' }]}
        more={{ rows: [{ k: 'Fasting', v: '10 hours' }], showLabel: 'Show more details', hideLabel: 'Hide details' }}
        primary={{ label: 'View booking', onPress: noop }} />,
    );
    expect(screen.queryByTestId('result-more')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Show more details' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByTestId('result-more')).toHaveTextContent('10 hours');
    expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('a failure is an alert, never celebrates, and its primary step is the danger button', () => {
    const onAnother = vi.fn();
    render(
      <ResultMomentCard moment={{ kind: 'failure' }} title="Payment failed" sub="Nothing was charged."
        primary={{ label: 'Retry ₹578', onPress: noop, testID: 'retry' }}
        secondary={{ label: 'Try another method', onPress: onAnother }} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Nothing was charged.');
    expect(screen.queryByTestId('result-confetti')).toBeNull();
    expect(screen.getByTestId('result-mark-failure')).toBeInTheDocument();
    expect(screen.getByTestId('retry')).toHaveStyle({ backgroundColor: color.danger });
    fireEvent.click(screen.getByRole('button', { name: 'Try another method' }));
    expect(onAnother).toHaveBeenCalled();
  });

  it('pending is a calm status with no confetti', () => {
    render(<ResultMomentCard moment={{ kind: 'pending' }} title="Waiting for your bank" sub="Don’t pay again."
      primary={{ label: 'Back to orders', onPress: noop }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for your bank');
    expect(screen.getByTestId('result-mark-pending')).toBeInTheDocument();
    expect(screen.queryByTestId('result-confetti')).toBeNull();
  });

  it('draws no confetti under reduced motion', () => {
    motionState.reduced = true;
    render(<ResultMomentCard moment={{ kind: 'success', context: 'order' }} title="Order placed" sub="Packing now"
      primary={{ label: 'Track order', onPress: noop }} />);
    expect(screen.queryByTestId('result-confetti')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Order placed');
  });

  it('the screen has a labelled back, Replay, and every control a 44 px target', () => {
    const onBack = vi.fn();
    render(
      <ResultMomentScreen title="Payment" backLabel="Back to payment" onBack={onBack} replayLabel="Replay">
        <ResultMomentCard moment={{ kind: 'pending' }} title="Waiting" sub="…" primary={{ label: 'Orders', onPress: noop }} />
      </ResultMomentScreen>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Back to payment' }));
    expect(onBack).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    expect(screen.getByRole('status')).toHaveTextContent('Waiting');
    expect(screen.getByTestId('result-back')).toHaveStyle({ width: '44px', height: '44px' });
    expect(screen.getByTestId('result-replay')).toHaveStyle({ minHeight: '44px' });
  });
});

describe('StateScreen (S6, canvas StateScreens)', () => {
  it('empty: a status with its chip, title, body and two ways out', () => {
    const add = vi.fn();
    const book = vi.fn();
    render(<StateScreen kind="empty" chip="Empty" title="Your vault is empty" body="Nothing here yet."
      primary={{ label: 'Add a document', onPress: add }} secondary={{ label: 'Book a lab test', onPress: book }} testID="s" />);
    expect(screen.getByRole('status')).toHaveTextContent('Empty');
    expect(screen.getByRole('heading', { name: 'Your vault is empty' })).toBeInTheDocument();
    expect(screen.getByTestId('state-mark-empty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add a document' }));
    fireEvent.click(screen.getByRole('button', { name: 'Book a lab test' }));
    expect(add).toHaveBeenCalled();
    expect(book).toHaveBeenCalled();
  });

  it('failure: an alert with a danger primary and a support reference', () => {
    render(<StateScreen kind="failure" chip="Failure" title="Payment did not go through" body="Nothing was charged."
      primary={{ label: 'Try another method', onPress: noop, testID: 'p' }} reference={{ label: 'Reference', code: 'SK-48120' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Reference SK-48120');
    expect(screen.getByTestId('p')).toHaveStyle({ backgroundColor: color.danger });
  });

  it('success and offline are statuses with their own marks; only primary actions use the action colour', () => {
    const { rerender } = render(<StateScreen kind="success" title="Report shared" body="For 14 days." primary={{ label: 'Back', onPress: noop, testID: 'p' }} />);
    expect(screen.getByTestId('state-mark-success')).toBeInTheDocument();
    expect(screen.getByTestId('p')).toHaveStyle({ backgroundColor: color.action });
    rerender(<StateScreen kind="offline" chip="Offline" title="No connection" body="Saved records still work." primary={{ label: 'Retry now', onPress: noop }} />);
    expect(screen.getByRole('status')).toHaveTextContent('No connection');
    expect(screen.getByTestId('state-mark-offline')).toBeInTheDocument();
  });

  it('loading is a labelled, busy skeleton', () => {
    render(<StateScreen kind="loading" label="Loading lab tests" />);
    const bar = screen.getByRole('progressbar', { name: 'Loading lab tests' });
    expect(bar).toHaveAttribute('aria-busy', 'true');
  });
});
