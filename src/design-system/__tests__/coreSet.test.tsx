import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../motion', async (importOriginal) => ({ ...(await importOriginal<typeof import('../motion')>()), useReducedMotion: () => true }));

import { Checkbox, Chip, CodeInput, ListRow, PhoneInput, ResultMomentView, Select, Sheet, SourceBadge, Table, Toast, VerifiedBadge } from '..';

describe('Checkbox', () => {
  it('is a named checkbox that toggles, and stays put when disabled', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Checkbox label="I agree" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'I agree' }));
    expect(onChange).toHaveBeenCalledWith(true);
    rerender(<Checkbox label="I agree" checked={false} onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'I agree' }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('Chip', () => {
  it('reports its pressed state', () => {
    render(<Chip label="Unread" selected onPress={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Unread' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('CodeInput', () => {
  it('keeps digits only, up to six, and announces an error', () => {
    const onChangeText = vi.fn();
    render(<CodeInput label="Verification code" value="" onChangeText={onChangeText} error="That code has expired." />);
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '12a34567' } });
    expect(onChangeText).toHaveBeenCalledWith('123456');
    expect(screen.getByRole('alert')).toHaveTextContent('That code has expired.');
  });
});

describe('PhoneInput', () => {
  it('stores the 10-digit number without +91 and says the country in its name', () => {
    const onChangeText = vi.fn();
    render(<PhoneInput label="Mobile number" value="" onChangeText={onChangeText} />);
    fireEvent.change(screen.getByLabelText('Mobile number, India +91'), { target: { value: '98765 43210 9' } });
    expect(onChangeText).toHaveBeenCalledWith('9876543210');
  });
});

describe('Select', () => {
  it('opens, lists options as radios, and picks one', () => {
    const onChange = vi.fn();
    render(<Select label="Schedule" options={[{ value: 'OTC', label: 'OTC' }, { value: 'H', label: 'Schedule H' }]} value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Schedule: not chosen' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Schedule H' }));
    expect(onChange).toHaveBeenCalledWith('H');
    expect(screen.queryByRole('radio')).toBeNull();
  });
});

describe('ListRow', () => {
  it('is plain content without an action and one button with one', () => {
    const { rerender } = render(<ListRow title="CBC report" detail="Lab" />);
    expect(screen.queryByRole('button')).toBeNull();
    const onPress = vi.fn();
    rerender(<ListRow title="CBC report" detail="Lab" value="₹499" onPress={onPress} />);
    fireEvent.click(screen.getByRole('button', { name: 'CBC report, Lab, ₹499' }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('Toast', () => {
  it('announces success as a status and dismisses itself; errors stay', () => {
    vi.useFakeTimers();
    const done = vi.fn();
    const { rerender } = render(<Toast message="Saved" tone="success" onDone={done} />);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    act(() => { vi.advanceTimersByTime(4100); });
    expect(done).toHaveBeenCalledTimes(1);
    rerender(<Toast message="Not saved" tone="error" onDone={done} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Not saved');
    act(() => { vi.advanceTimersByTime(10000); });
    expect(done).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe('Sheet', () => {
  it('is a modal dialog with a named close button that refuses while busy', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<Sheet visible title="Cancel booking?" onClose={onClose}><></></Sheet>);
    expect(await screen.findByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<Sheet visible title="Cancel booking?" onClose={onClose} busy><></></Sheet>);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Table', () => {
  const columns = [{ key: 'name', header: 'Name', render: (r: { id: string; name: string }) => r.name }];
  it('shows data, empty and error states', () => {
    const { rerender } = render(<Table caption="Orders" columns={columns} rows={[{ id: '1', name: 'Paracetamol' }]} rowKey={(r) => r.id} empty={{ title: 'No orders', body: 'None yet.' }} />);
    expect(screen.getByRole('table', { name: 'Orders' })).toHaveTextContent('Paracetamol');
    rerender(<Table caption="Orders" columns={columns} rows={[]} rowKey={(r) => r.id} empty={{ title: 'No orders', body: 'None yet.' }} />);
    expect(screen.getByText('No orders')).toBeInTheDocument();
    rerender(<Table caption="Orders" columns={columns} rows={null} rowKey={(r) => r.id} error={{ title: 'Couldn’t load', body: 'Try again.', onRetry: () => undefined }} empty={{ title: 'No orders', body: 'None yet.' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load');
  });
});

describe('Result moment and badges', () => {
  it('announces failure as an alert', () => {
    render(<ResultMomentView moment={{ kind: 'failure' }} title="Payment failed" body="Nothing was charged." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Payment failed');
  });

  it('shows Verified only for the server status VERIFIED', () => {
    const { rerender } = render(<VerifiedBadge serverStatus="PENDING" />);
    expect(screen.queryByText(/Verified/)).toBeNull();
    rerender(<VerifiedBadge serverStatus="VERIFIED" />);
    expect(screen.getByText('✓ Verified')).toBeInTheDocument();
  });

  it('labels where a value came from', () => {
    render(<SourceBadge source="typed-by-you" />);
    expect(screen.getByText('Typed by you')).toBeInTheDocument();
  });
});
