import React, { useState } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axeViolations, describeViolations } from '@/test/axe';

vi.mock('../motion', async (importOriginal) => ({ ...(await importOriginal<typeof import('../motion')>()), useReducedMotion: () => true }));

import { Banner, ConfirmDialog, Drawer, FormField, Overlay, Sheet, SheetOption, Toast } from '..';
import { color } from '../theme';

const noop = () => undefined;
afterEach(() => { vi.useRealTimers(); });

function Opener({ children }: { children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      {open ? children(() => setOpen(false)) : null}
    </>
  );
}

describe('Overlay (S7: one API for sheet, drawer and dialog)', () => {
  it.each(['dialog', 'sheet', 'drawer'] as const)('%s is a named modal dialog with the page scroll locked', (variant) => {
    render(<Overlay open variant={variant} title="Choose a pickup slot" onClose={noop}><button type="button">Tomorrow</button></Overlay>);
    const dialog = screen.getByRole('dialog', { name: 'Choose a pickup slot' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(dialog.closest('.sk-ov')).toHaveClass(`sk-ov--${variant}`);
  });

  it('closes on Esc and on the scrim, but not while busy', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Overlay open variant="sheet" title="Filter lab tests" onClose={onClose}><p>Body</p></Overlay>);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(document.querySelector('.sk-ov__scrim') as Element);
    expect(onClose).toHaveBeenCalledTimes(2);
    rerender(<Overlay open variant="sheet" title="Filter lab tests" onClose={onClose} busy><p>Body</p></Overlay>);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(document.querySelector('.sk-ov__scrim') as Element);
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('a critical value only closes by acting: no close button, Esc and scrim do nothing', () => {
    const onClose = vi.fn();
    render(<Overlay open variant="drawer" title="SMP-77412" eyebrow="Critical value" eyebrowTone="danger" dismissible={false} onClose={onClose}><button type="button">Release now</button></Overlay>);
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(document.querySelector('.sk-ov__scrim') as Element);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('moves focus in, traps Tab, and returns focus to the opener', () => {
    render(
      <Opener>
        {(close) => (
          <Overlay open variant="dialog" title="Discard your changes?" onClose={close}>
            <button type="button" data-autofocus onClick={close}>Keep editing</button>
            <button type="button">Discard</button>
          </Overlay>
        )}
      </Opener>,
    );
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole('button', { name: 'Keep editing' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Discard' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Keep editing' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Discard' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });

  it('renders nothing when closed', () => {
    render(<Overlay open={false} variant="sheet" title="Hidden" onClose={noop}><p>Body</p></Overlay>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('ConfirmDialog (board ConfirmDialogs)', () => {
  it('asks once: alertdialog named by the question, described by the body, safe choice focused', () => {
    render(<ConfirmDialog open icon="log-out" title="Sign out of this device?" body="You’ll need your OTP to get back in." confirmLabel="Sign out" onConfirm={noop} onCancel={noop} />);
    const dialog = screen.getByRole('alertdialog', { name: 'Sign out of this device?' });
    expect(dialog).toHaveAccessibleDescription('You’ll need your OTP to get back in.');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(dialog.querySelector('[data-icon="shield-half"]')).not.toBeNull();
  });

  it('uses the navy action for an ordinary confirm and danger for a destructive one', () => {
    const { rerender } = render(<ConfirmDialog open title="Log out?" body="b" confirmLabel="Log out" onConfirm={noop} onCancel={noop} />);
    expect(document.querySelector('.sk-confirm')).toHaveAttribute('data-tone', 'action');
    rerender(<ConfirmDialog open tone="danger" icon="cancel-booking" title="Cancel this lab booking?" body="b" cancelLabel="Keep booking" confirmLabel="Cancel booking" onConfirm={noop} onCancel={noop} />);
    expect(document.querySelector('.sk-confirm')).toHaveAttribute('data-tone', 'danger');
    expect(document.querySelector('[data-icon="calendar-x"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Keep booking' })).toBeInTheDocument();
  });

  it.each([['end-sessions', 'devices'], ['stop-sharing', 'lock-keyhole'], ['discard', 'pencil']] as const)('%s shows the %s badge', (icon, name) => {
    render(<ConfirmDialog open icon={icon} title="t" body="b" confirmLabel="Go" onConfirm={noop} onCancel={noop} />);
    expect(document.querySelector(`[data-icon="${name}"]`)).not.toBeNull();
  });

  it('confirms once, then spins with its busy label and cannot be cancelled or confirmed again', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { rerender } = render(<ConfirmDialog open title="Stop sharing?" body="b" confirmLabel="Stop sharing" busyLabel="Revoking…" onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Stop sharing' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    rerender(<ConfirmDialog open busy title="Stop sharing?" body="b" confirmLabel="Stop sharing" busyLabel="Revoking…" onConfirm={onConfirm} onCancel={onCancel} />);
    const busy = screen.getByRole('button', { name: 'Revoking…' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy.querySelector('[data-icon="circle"]')).not.toBeNull();
    fireEvent.click(busy);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('becomes a small success card when done', () => {
    const onAction = vi.fn();
    render(<ConfirmDialog open title="Stop sharing?" body="b" confirmLabel="Stop sharing" onConfirm={noop} onCancel={noop}
      done={{ title: 'Access removed', body: 'Logged in your access history.', actionLabel: 'View access history', onAction }} />);
    expect(screen.getByRole('dialog', { name: 'Access removed' })).toBeInTheDocument();
    expect(document.querySelector('[data-icon="check"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'View access history' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('renders extra controls under the body', () => {
    render(<ConfirmDialog open title="t" body="b" confirmLabel="Go" onConfirm={noop} onCancel={noop}><label><input type="checkbox" /> Remember me</label></ConfirmDialog>);
    expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeInTheDocument();
  });

  it('passes axe', async () => {
    render(<ConfirmDialog open icon="log-out" title="Log out?" body="Your records stay." confirmLabel="Log out" onConfirm={noop} onCancel={noop} />);
    const violations = await axeViolations(document.body);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});

describe('Drawer and Sheet are the overlay', () => {
  it('Drawer keeps its "Close panel" button', () => {
    const onClose = vi.fn();
    render(<Drawer open title="Add a drug" onClose={onClose}><p>Body</p></Drawer>);
    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }));
    expect(onClose).toHaveBeenCalled();
    expect(document.querySelector('.sk-ov--drawer')).not.toBeNull();
  });

  it('Sheet is the sheet variant', () => {
    render(<Sheet visible title="Choose a pickup slot" subtitle="Phlebotomist comes to Block B" onClose={noop}><p>Body</p></Sheet>);
    expect(screen.getByRole('dialog', { name: 'Choose a pickup slot' })).toHaveAccessibleDescription('Phlebotomist comes to Block B');
    expect(document.querySelector('.sk-ov--sheet .sk-ov__grabber')).not.toBeNull();
  });

  it('SheetOption selects with a tick and a locked row stays on', () => {
    const onChange = vi.fn();
    const { rerender } = render(<SheetOption kind="radio" label="Tomorrow, 7:00–8:00 AM" meta="Block B lobby" selected={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: /Tomorrow/ }));
    expect(onChange).toHaveBeenCalledWith(true);
    rerender(<SheetOption label="Crisis alerts and SOS" tag="LOCKED" selected locked onChange={onChange} />);
    const locked = screen.getByRole('checkbox', { name: /Crisis alerts/ });
    expect(locked).toHaveAttribute('aria-checked', 'true');
    expect(locked.querySelector('[data-icon="check"]')).not.toBeNull();
    fireEvent.click(locked);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('Toast (board Feedback)', () => {
  it('a confirming toast has a title, an action and dismisses itself after the token duration', () => {
    vi.useFakeTimers();
    const done = vi.fn();
    const track = vi.fn();
    render(<Toast tone="success" title="Order placed" message="Arriving at Block B by 9 PM" action={{ label: 'Track', onPress: track }} onDone={done} />);
    expect(screen.getByRole('status')).toHaveTextContent('Order placed');
    fireEvent.click(screen.getByRole('button', { name: 'Track' }));
    expect(track).toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(4100); });
    expect(done).toHaveBeenCalledTimes(1);
  });

  it.each([['error', 'alert', 'x'], ['attention', 'status', 'alert-triangle-4']] as const)('%s holds until acted on', (tone, role, icon) => {
    vi.useFakeTimers();
    const done = vi.fn();
    const dismiss = vi.fn();
    render(<Toast tone={tone} title="t" message="m" onDone={done} onDismiss={dismiss} />);
    const toast = screen.getByRole(role);
    expect(toast.querySelector(`[data-icon="${icon}"]`)).not.toBeNull();
    act(() => { vi.advanceTimersByTime(20000); });
    expect(done).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(dismiss).toHaveBeenCalled();
  });

  it('info uses the info icon', () => {
    render(<Toast tone="info" title="Saved offline" message="Your emergency card works without a network." />);
    expect(screen.getByRole('status').querySelector('[data-icon="info-4"]')).not.toBeNull();
  });
});

describe('Banner (board Feedback)', () => {
  it.each([['attention', 'alert-triangle-4'], ['info', 'info-4'], ['crisis', 'shield-2']] as const)('%s draws %s and persists', (tone, icon) => {
    const { container } = render(<Banner tone={tone} title="Title">Body</Banner>);
    expect(container.querySelector(`[data-icon="${icon}"]`)).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('danger is an alert; announce makes a status; the action is a named button', () => {
    const call = vi.fn();
    const { rerender } = render(<Banner tone="danger">Not saved</Banner>);
    expect(screen.getByRole('alert')).toHaveTextContent('Not saved');
    rerender(<Banner tone="crisis" announce title="Crisis support is always open" action={{ label: 'Call', onPress: call }}>Tele-MANAS 14416</Banner>);
    expect(screen.getByRole('status')).toHaveTextContent('Crisis support is always open');
    fireEvent.click(screen.getByRole('button', { name: 'Call' }));
    expect(call).toHaveBeenCalled();
  });

});

describe('theme: light and dark come from tokens only', () => {
  it.each(['overlays/overlays.css', 'feedback/feedback.css'])('%s draws colour only with var(--sk-…)', (file) => {
    const css = readFileSync(resolve(__dirname, '..', file), 'utf8');
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
    expect(css).toMatch(/var\(--sk-color-/);
  });

  it('the toast and banner palette is the theme palette (CSS variables on web, so dark mode follows)', () => {
    for (const value of [color.attentionBg, color.dangerBg, color.positiveBg, color.surface3, color.action]) {
      expect(String(value)).toMatch(/^var\(--sk-color-/);
    }
  });
});

describe('FormField (inline validation)', () => {
  it('idle: label, hint described, not invalid', () => {
    render(<FormField label="Campus email address" hint="We send a code here"><input /></FormField>);
    const input = screen.getByRole('textbox', { name: 'Campus email address' });
    expect(input).toHaveAccessibleDescription('We send a code here');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('invalid: aria-invalid, the fix is announced and described, a cross is drawn', () => {
    const { container } = render(
      <FormField label="Campus email address" hint="hint" status="invalid" message="Use your institute email to unlock Edu ID pricing.">
        <input aria-describedby="extra" />
      </FormField>,
    );
    const input = screen.getByRole('textbox', { name: 'Campus email address' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toMatch(/^extra .+-note$/);
    expect(screen.getByRole('alert')).toHaveTextContent('Use your institute email');
    expect(container.querySelector('[data-icon="x"]')).not.toBeNull();
    expect(container.querySelector('.sk-field')).toHaveAttribute('data-status', 'invalid');
  });

  it('valid: a labelled tick', () => {
    render(<FormField label="Hostel block" status="valid"><input defaultValue="North Dorm, Block B" /></FormField>);
    expect(screen.getByRole('img', { name: 'Looks right' })).toHaveAttribute('data-icon', 'check');
  });

  it.each([
    ['Toast with action', <Toast tone="success" title="Report shared" message="Access expires in 14 days." action={{ label: 'Undo', onPress: noop }} />],
    ['Banner with action', <Banner tone="attention" title="Consent expired" action={{ label: 'Renew', onPress: noop }}>Renew if your follow-up is still going.</Banner>],
    ['FormField invalid', <FormField label="Email" status="invalid" message="Enter a full email address."><input type="email" /></FormField>],
  ])('%s passes axe', async (_name, element) => {
    const { container } = render(<main>{element}</main>);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
