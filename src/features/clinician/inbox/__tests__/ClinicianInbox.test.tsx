import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { InboxView, InboxViewModel, KIND, unconnectedInboxSource } from '../ClinicianInboxScreen';
import type { InboxItem, InboxSource } from '../ClinicianInboxScreen';

/** Test fixture only — no inbox source exists yet, and no build shows sample items. */
function items(): InboxItem[] {
  return [
    { id: 'i1', kind: 'critical', who: 'Arjun Nair, 20', line: 'Potassium flagged critical', ageMinutes: 8, window: '15 min', body: 'Call the patient now.', values: [{ name: 'K+', value: '6.8', flag: 'critical' }, { name: 'Na+', value: '138', flag: 'normal' }] },
    { id: 'i2', kind: 'message', who: 'Kavya Iyer, 19', line: '“Should I stop?”', ageMinutes: 22, window: '72-h window', body: '“Should I stop using it?”' },
    { id: 'i3', kind: 'result', who: 'Sneha Patel, 21', line: 'Lipid profile ready to sign', ageMinutes: 45, window: 'Today', body: 'Add a summary.', values: [{ name: 'HDL', value: '36', flag: 'out-of-range' }] },
    { id: 'i4', kind: 'referral', who: 'Dermatology · Dr. Rao', line: 'Accepted your referral', ageMinutes: 300, window: 'FYI', body: 'Accepted.' },
  ];
}

const source = (extra: Partial<InboxSource> = {}): InboxSource => ({ load: async () => items(), ...extra });

async function renderWith(src: InboxSource) {
  const vm = new InboxViewModel(src);
  const onNavigate = vi.fn();
  render(<InboxView viewModel={vm} onNavigate={onNavigate} />);
  await act(async () => { await vm.load(); });
  return { vm, onNavigate };
}

describe('InboxViewModel', () => {
  it('keeps critical results on top whatever their age, and filters by kind', async () => {
    const vm = new InboxViewModel(source());
    await vm.load();
    expect(vm.shown[0].kind).toBe('critical');
    vm.setFilter('message');
    expect(vm.shown.every((i) => i.kind === 'message')).toBe(true);
    expect(vm.count('all')).toBe(4);
  });

  it('will not send a reply or release a result without words', async () => {
    const act_ = vi.fn(() => Promise.resolve());
    const vm = new InboxViewModel(source({ act: act_ }));
    await vm.load();
    vm.select('i2');
    const send = KIND.message.actions[0];
    expect(vm.canDo(send)).toBe(false);
    vm.setText('Stop for two days.');
    await vm.act(send);
    expect(act_).toHaveBeenCalledWith('i2', 'reply', 'Stop for two days.');
    expect(vm.data?.some((i) => i.id === 'i2')).toBe(false);
    expect(vm.outcome).toEqual({ key: 'clinInbox.done.reply', ok: true });
  });

  it('cannot act at all when the source has no way to', async () => {
    const vm = new InboxViewModel(source());
    await vm.load();
    expect(vm.canDo(KIND.critical.actions[0])).toBe(false);
  });
});

describe('InboxView', () => {
  it('reads out which values are critical and which are outside the range', async () => {
    const { vm } = await renderWith(source());
    expect(screen.getByText('6.8').closest('dd')).toHaveTextContent('6.8 (critical)');
    act(() => vm.select('i3'));
    expect(screen.getByText('36').closest('dd')).toHaveTextContent('36 (outside the lab’s range)');
  });

  it('shows the canvas tick and one line when a filter has nothing', async () => {
    const { vm } = await renderWith(source());
    act(() => vm.setFilter('renewal'));
    const detail = screen.getByRole('region', { name: 'Selected item' });
    expect(detail).toHaveTextContent('Inbox zero for this filter');
    expect(detail.querySelector('[data-icon="check-2"]')).not.toBeNull();
  });

  it('is not connected in every build: the layout and its filters, no invented patient', async () => {
    await renderWith(unconnectedInboxSource);
    expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Filter the inbox' })).toBeInTheDocument();
    expect(screen.getByText('Your inbox isn’t connected yet.')).toBeInTheDocument();
    expect(screen.queryByText(/Arjun|Kavya|Potassium/)).not.toBeInTheDocument();
  });

  it('shows the board’s empty state when connected and empty', async () => {
    const { onNavigate } = await renderWith({ load: async () => [] });
    expect(screen.getByRole('heading', { level: 1, name: 'Inbox zero — nothing needs your decision.' })).toBeInTheDocument();
    expect(document.querySelector('[data-icon="3d:stetho-alt--p4"]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open your schedule' }));
    expect(onNavigate).toHaveBeenCalledWith('clinician/schedule');
  });

  it('shows a calm error with retry and a reference', async () => {
    await renderWith({ load: () => Promise.reject(new Error('down')) });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Ref INBOX · ClinicianInbox');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(alert.querySelector('[data-icon="alert-triangle"]')).not.toBeNull();
  });

  it('names its loading skeleton', () => {
    const vm = new InboxViewModel({ load: () => new Promise(() => undefined) });
    render(<InboxView viewModel={vm} onNavigate={vi.fn()} />);
    expect(screen.getByRole('status', { name: 'Loading your inbox' })).toHaveAttribute('aria-busy', 'true');
  });
});
