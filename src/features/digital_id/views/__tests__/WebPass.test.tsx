import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, act } from '@testing-library/react';
import { WebPass, generateBackupCode } from '../WebPass';

vi.mock('@/data/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr_test_student',
      fullName: 'Krishna Chaitanya',
      role: 'STUDENT',
      university: 'VNR VJIET',
      rollNumber: '22071A0589',
    },
  }),
}));

describe('WebPass — SK-085 (Pass rotates every 30 s)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders student identity credential header', () => {
    render(<WebPass />);
    expect(screen.getByText('Krishna Chaitanya')).toBeInTheDocument();
    expect(screen.getByText(/VNR VJIET · Roll 22071A0589/i)).toBeInTheDocument();
    expect(screen.getByText(/✓ Identity verified · 4 of 4/i)).toBeInTheDocument();
  });

  it('renders scannable QR pass image with accessible description', () => {
    render(<WebPass initialSeed={10} />);
    const qrPass = screen.getByRole('img', {
      name: /your check-in qr code\. it changes every 30 seconds\./i,
    });
    expect(qrPass).toBeInTheDocument();
  });

  it('displays verbal 6-digit backup code formatted with space', () => {
    render(<WebPass initialSeed={10} />);
    const expectedCode = generateBackupCode(10);
    expect(screen.getByText(expectedCode)).toBeInTheDocument();
    expect(screen.getByText(/or say this code/i)).toBeInTheDocument();
  });

  it('rotates pass every 30 seconds automatically', () => {
    render(<WebPass initialSeed={10} />);
    const initialCode = generateBackupCode(10);
    expect(screen.getByText(initialCode)).toBeInTheDocument();
    expect(screen.getByText('30s')).toBeInTheDocument();

    // Advance 10 seconds
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText('20s')).toBeInTheDocument();
    expect(screen.getByText(initialCode)).toBeInTheDocument(); // Code unchanged yet

    // Advance remaining 20 seconds (30s rotation complete)
    act(() => {
      vi.advanceTimersByTime(20000);
    });

    // Pass has rotated to next seed (11)
    const nextCode = generateBackupCode(11);
    expect(screen.queryByText(initialCode)).toBeNull();
    expect(screen.getByText(nextCode)).toBeInTheDocument();
    expect(screen.getByText('30s')).toBeInTheDocument();
  });

  describe('Recent Check-in Events', () => {
    it('renders recent check-ins list with provider details and match status', () => {
      render(<WebPass />);
      expect(screen.getByRole('feed', { name: /recent check-in events/i })).toBeInTheDocument();
      expect(screen.getByText(/medplus · bachupally/i)).toBeInTheDocument();
      expect(screen.getByText(/vijaya diagnostics/i)).toBeInTheDocument();
      expect(screen.getByText(/campus clinic · dr\. s\. menon/i)).toBeInTheDocument();
      expect(screen.getByText(/photo matched · order SK-48120/i)).toBeInTheDocument();
    });
  });

  describe('Dispute Reporting Modal ("This wasn’t me")', () => {
    it('opens dispute confirmation dialog on clicking "This wasn’t me"', () => {
      render(<WebPass />);
      const disputeBtns = screen.getAllByRole('button', { name: /report unauthorized check-in/i });
      expect(disputeBtns.length).toBeGreaterThan(0);

      fireEvent.click(disputeBtns[0]);

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveTextContent(/report “medplus · bachupally”?/i);
      expect(dialog).toHaveTextContent(/we’ll pause check-ins with your pass, tell the provider/i);
    });

    it('cancels dispute modal without altering pass', () => {
      render(<WebPass initialSeed={10} />);
      const initialCode = generateBackupCode(10);
      const disputeBtns = screen.getAllByRole('button', { name: /report unauthorized check-in/i });

      fireEvent.click(disputeBtns[0]);
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /cancel dispute report/i }));
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(screen.getByText(initialCode)).toBeInTheDocument();
    });

    it('confirms dispute, marks item as reported, and immediately rotates the pass', () => {
      const onDisputeSpy = vi.fn();
      render(<WebPass initialSeed={10} onDisputeReported={onDisputeSpy} />);
      const initialCode = generateBackupCode(10);

      const disputeBtns = screen.getAllByRole('button', { name: /report unauthorized check-in/i });
      fireEvent.click(disputeBtns[0]);

      // Confirm
      fireEvent.click(screen.getByRole('button', { name: /confirm this check-in was not me/i }));

      // Dialog closes
      expect(screen.queryByRole('alertdialog')).toBeNull();

      // Item marked reported
      expect(screen.getByText(/reported — support will call you/i)).toBeInTheDocument();

      // Pass immediately rotated to new seed (10 + 101 = 111)
      const rotatedCode = generateBackupCode(111);
      expect(screen.queryByText(initialCode)).toBeNull();
      expect(screen.getByText(rotatedCode)).toBeInTheDocument();

      // Toast feedback displayed
      expect(screen.getByRole('status')).toHaveTextContent(/reported · new pass issued · support will call within 2 h/i);
      expect(onDisputeSpy).toHaveBeenCalledWith('chk-1');
    });
  });

  describe('Security Principles & Accessibility', () => {
    it('displays the three security pillars', () => {
      render(<WebPass />);
      expect(screen.getByText('Scanned')).toBeInTheDocument();
      expect(screen.getByText('Photo matched')).toBeInTheDocument();
      expect(screen.getByText('Visit only')).toBeInTheDocument();
    });

    it('labels every interactive control and marks decorative icons aria-hidden', () => {
      const { container } = render(<WebPass />);
      for (const btn of screen.getAllByRole('button')) {
        expect(btn).toHaveAccessibleName();
      }
      for (const svg of container.querySelectorAll('svg')) {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      }
    });
  });
});
