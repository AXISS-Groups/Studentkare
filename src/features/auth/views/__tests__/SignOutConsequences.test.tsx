import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { apiRequest } from '@/data/http';
import { SignOutConsequences } from '../SignOutConsequences';

vi.mock('@/data/http', () => ({ apiRequest: vi.fn() }));
const mocked = vi.mocked(apiRequest);

const share = (active: boolean, id = 'shr_1') => ({ id, active, expiresAt: 0 });

async function open(items: ReturnType<typeof share>[] | Error = []) {
  mocked.mockImplementation(() =>
    items instanceof Error ? Promise.reject(items) : Promise.resolve({ items }),
  );
  render(<SignOutConsequences />);
  // then -> catch -> finally is three microtasks deep; flushing one leaves a
  // rejection still in flight, which surfaces as an unhandled rejection.
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => mocked.mockReset());

describe('what it refuses to claim', () => {
  it('does not promise anything is removed from the device', async () => {
    // Signing out clears the session and nothing else. The design's "offline
    // emergency card is removed" is a security assurance this app does not
    // keep — and it appeared twice, on the screen and in the sheet.
    await open();
    expect(document.body.textContent).not.toMatch(
      /removed from this (phone|device)|offline emergency card|wiped|erased/i,
    );
  });

  it('does not claim reminders stop', async () => {
    // They are delivered by WhatsApp and email, not to a device, so they keep
    // arriving. Saying otherwise leaves a student expecting silence.
    await open();
    expect(document.body.textContent).not.toMatch(/reminders stop|stop on this device/i);
  });

  it('says the opposite, and where to change it', async () => {
    await open();
    expect(screen.getByText(/reminders keep arriving/i)).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/turn them off in settings/i);
  });
});

describe('record shares', () => {
  it('counts only the ones still running', async () => {
    await open([share(true, 'a'), share(false, 'b'), share(true, 'c')]);
    expect(screen.getByText(/2 record shares keep running/i)).toBeInTheDocument();
  });

  it('reads naturally for a single share', async () => {
    await open([share(true)]);
    expect(screen.getByText(/1 record share keeps running/i)).toBeInTheDocument();
  });

  it('says so plainly when there are none', async () => {
    await open([]);
    expect(screen.getByText(/no record shares are running/i)).toBeInTheDocument();
  });

  // Not covered: the moment before the list lands, when no count may be
  // claimed yet. Driving that needs a request held open, and a pending promise
  // hangs the runner on teardown. The component guards it with `shares.data ?`
  // — untested, and worth revisiting with a proper deferred helper.
});

describe('accessibility', () => {
  it('hides the decorative marks from assistive technology', async () => {
    await open([share(true)]);
    for (const svg of document.body.querySelectorAll('svg')) {
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
