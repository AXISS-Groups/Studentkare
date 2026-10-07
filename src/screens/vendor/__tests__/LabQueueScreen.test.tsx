import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LabQueueScreen } from '../LabQueueScreen';

vi.mock('@/data/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'demo-lab',
      fullName: 'Vijaya Diagnostics Lab',
      role: 'VENDOR',
      email: 'lab@studentkare.test',
    },
    logout: vi.fn(),
  }),
}));

vi.mock('@/lib/workflowRouting', () => ({
  navigate: vi.fn(),
  homeForRole: vi.fn((role: string) => (role === 'SUPER_ADMIN' ? 'admin' : role === 'VENDOR' ? 'vendor' : 'health')),
}));

describe('LabQueueScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders title, eyebrow, and top stats', () => {
    render(<LabQueueScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sample queue' })).toBeInTheDocument();
    expect(screen.getByText(/BOOKED → COLLECTED → TRANSIT → ANALYSED → RELEASED/i)).toBeInTheDocument();
    expect(screen.getByText('CRITICAL WAITING')).toBeInTheDocument();
    expect(screen.getByText('OVER TRANSIT WINDOW')).toBeInTheDocument();
    expect(screen.getByText('REDO RATE, 30 DAYS')).toBeInTheDocument();
    expect(screen.getByText('2.1%')).toBeInTheDocument();
  });

  it('renders all 5 pipeline columns', () => {
    render(<LabQueueScreen />);
    expect(screen.getByText('BOOKED')).toBeInTheDocument();
    expect(screen.getByText('COLLECTED')).toBeInTheDocument();
    expect(screen.getByText('IN TRANSIT')).toBeInTheDocument();
    expect(screen.getByText('ANALYSED')).toBeInTheDocument();
    expect(screen.getByText('RELEASED')).toBeInTheDocument();
  });

  it('renders core initial samples across stages', () => {
    render(<LabQueueScreen />);
    expect(screen.getAllByText('Vitamin D').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('SMP-77420')).toBeInTheDocument();
    expect(screen.getByText('SMP-77416')).toBeInTheDocument();
    expect(screen.getByText('SMP-77412')).toBeInTheDocument();
    expect(screen.getByText('SMP-77408')).toBeInTheDocument();
  });

  it('filters samples using the search bar', () => {
    render(<LabQueueScreen />);
    const searchInput = screen.getByLabelText(/Search sample queue/i);
    fireEvent.change(searchInput, { target: { value: 'Renal' } });

    expect(screen.getByText('SMP-77412')).toBeInTheDocument();
    expect(screen.queryByText('SMP-77420')).not.toBeInTheDocument();
  });

  it('opens critical value escalation drawer when clicking the critical sample', () => {
    render(<LabQueueScreen />);
    const criticalCard = screen.getByLabelText(/SMP-77412/i);
    fireEvent.click(criticalCard);

    expect(screen.getByRole('dialog', { name: /SMP-77412 · Potassium 6.8/i })).toBeInTheDocument();
    expect(screen.getByText(/CRITICAL VALUE — INTERRUPTS THE QUEUE/i)).toBeInTheDocument();
    expect(screen.getByText(/Call Dr. Ananya Reddy/i)).toBeInTheDocument();
  });

  it('releases critical value immediately upon clicking release button', () => {
    render(<LabQueueScreen />);
    const criticalBtn = screen.getByRole('button', { name: /View critical waiting escalation/i });
    fireEvent.click(criticalBtn);

    const releaseBtn = screen.getByRole('button', { name: /Release critical value now/i });
    fireEvent.click(releaseBtn);

    expect(screen.getByText(/Critical value SMP-77412 released/i)).toBeInTheDocument();
  });

  it('opens sample detail modal and advances stage', () => {
    render(<LabQueueScreen />);
    const sampleCard = screen.getByLabelText(/SMP-77420/i);
    fireEvent.click(sampleCard);

    expect(screen.getByRole('dialog', { name: /SMP-77420: CBC/i })).toBeInTheDocument();
    const advanceBtn = screen.getByRole('button', { name: /Advance to next stage/i });
    fireEvent.click(advanceBtn);

    expect(screen.getByText(/Sample moved to IN TRANSIT/i)).toBeInTheDocument();
  });

  it('books a new walk-in sample', () => {
    render(<LabQueueScreen />);
    const bookBtn = screen.getByRole('button', { name: /Book walk-in sample/i });
    fireEvent.click(bookBtn);

    expect(screen.getByRole('dialog', { name: /Register Diagnostic Sample/i })).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/e.g. Rohith Verma/i);
    fireEvent.change(nameInput, { target: { value: 'Siddharth Rao' } });

    fireEvent.click(screen.getByRole('button', { name: /Book Sample Intake/i }));

    expect(screen.getByText(/Walk-in diagnostic appointment booked for Siddharth Rao/i)).toBeInTheDocument();
    expect(screen.getByText(/Siddharth Rao · Block B Lobby/i)).toBeInTheDocument();
  });
});
