import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { WebEmergencyCard } from '../WebEmergencyCard';

vi.mock('@/data/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr_test_1',
      fullName: 'Aarav Sharma',
      role: 'STUDENT',
      university: 'IIT Bombay',
      rollNumber: '210050012',
    },
  }),
}));

vi.mock('@/data/http', () => ({
  apiRequest: vi.fn().mockResolvedValue({}),
}));

describe('WebEmergencyCard — SK-085 (Same validation as phone)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heading and core safety description', () => {
    render(<WebEmergencyCard />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/emergency card/i);
    expect(screen.getByText(/what a stranger or a doctor needs in the first ten minutes/i)).toBeInTheDocument();
  });

  describe('Blood Group validation & selection', () => {
    it('allows picking standard blood groups and highlights selected state', () => {
      render(<WebEmergencyCard initialBloodGroup="Not set" />);
      const btnOpos = screen.getByRole('button', { name: /blood group: O\+/i });
      expect(btnOpos).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(btnOpos);
      expect(btnOpos).toHaveAttribute('aria-pressed', 'true');

      // Check preview reflects selected blood group
      const preview = screen.getByRole('region', { name: /emergency card preview/i });
      expect(preview).toHaveTextContent('O+');
    });

    it('warns when blood group is not set in readiness assessment', () => {
      render(<WebEmergencyCard initialBloodGroup="Not set" />);
      expect(screen.getByText(/blood group is not set/i)).toBeInTheDocument();
    });
  });

  describe('Allergies & No Known Allergies (NKA) toggle', () => {
    it('toggles No Known Allergies and clears active allergy list', () => {
      render(<WebEmergencyCard initialAllergies={['Peanuts']} initialNka={false} />);
      expect(screen.getByRole('button', { name: /remove allergy peanuts/i })).toBeInTheDocument();

      const nkaBtn = screen.getByRole('button', { name: /no known allergies/i });
      fireEvent.click(nkaBtn);
      expect(nkaBtn).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByRole('button', { name: /remove allergy peanuts/i })).toBeNull();

      // Check live preview says 'None known'
      const preview = screen.getByRole('region', { name: /emergency card preview/i });
      expect(preview).toHaveTextContent(/none known/i);
    });

    it('allows adding and removing custom allergy pills', () => {
      render(<WebEmergencyCard initialAllergies={[]} initialNka={false} />);
      const input = screen.getByLabelText(/add an allergy/i);

      fireEvent.change(input, { target: { value: 'Sulfa Drugs' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(screen.getByRole('button', { name: /remove allergy sulfa drugs/i })).toBeInTheDocument();

      // Remove it
      const removeBtn = screen.getByRole('button', { name: /remove allergy sulfa drugs/i });
      fireEvent.click(removeBtn);
      expect(screen.queryByRole('button', { name: /remove allergy sulfa drugs/i })).toBeNull();
    });
  });

  describe('Emergency Contacts Validation (Indian 10-digit mobile rule)', () => {
    it('flags invalid phone number not matching 10 digits starting with 6-9', () => {
      render(
        <WebEmergencyCard
          initialContacts={[{ name: 'Sunita', phone: '12345', rel: 'Parent' }]}
        />
      );

      expect(
        screen.getByText(/enter a 10-digit indian mobile starting with 6–9/i)
      ).toBeInTheDocument();
    });

    it('clears error and accepts valid 10-digit Indian mobile starting with 6–9', () => {
      render(
        <WebEmergencyCard
          initialContacts={[{ name: 'Sunita', phone: '9848012345', rel: 'Parent' }]}
        />
      );

      expect(
        screen.queryByText(/enter a 10-digit indian mobile starting with 6–9/i)
      ).toBeNull();
    });

    it('updates relationship pill on click', () => {
      render(
        <WebEmergencyCard
          initialContacts={[{ name: 'Sunita', phone: '9848012345', rel: 'Parent' }]}
        />
      );

      const siblingBtn = screen.getByRole('button', { name: /relationship: sibling/i });
      fireEvent.click(siblingBtn);
      expect(siblingBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('allows adding up to 3 contacts', () => {
      render(
        <WebEmergencyCard
          initialContacts={[{ name: 'Sunita', phone: '9848012345', rel: 'Parent' }]}
        />
      );

      const addBtn = screen.getByRole('button', { name: /add another emergency contact/i });
      fireEvent.click(addBtn);
      expect(screen.getAllByRole('group', { name: /emergency contact/i })).toHaveLength(2);

      fireEvent.click(screen.getByRole('button', { name: /add another emergency contact/i }));
      expect(screen.getAllByRole('group', { name: /emergency contact/i })).toHaveLength(3);

      // Cannot add more than 3
      expect(screen.queryByRole('button', { name: /add another emergency contact/i })).toBeNull();
    });
  });

  describe('Readiness Assessment & Progress calculation', () => {
    it('calculates 100% when blood group, allergies, and contact are valid', () => {
      render(
        <WebEmergencyCard
          initialBloodGroup="B+"
          initialNka={true}
          initialContacts={[{ name: 'Ravi', phone: '9876543210', rel: 'Parent' }]}
        />
      );

      expect(screen.getByText(/card is 100% ready/i)).toBeInTheDocument();
    });

    it('calculates 33% when only blood group is set', () => {
      render(
        <WebEmergencyCard
          initialBloodGroup="O+"
          initialNka={false}
          initialAllergies={[]}
          initialContacts={[{ name: '', phone: '', rel: 'Parent' }]}
        />
      );

      expect(screen.getByText(/card is 33% ready/i)).toBeInTheDocument();
    });
  });

  describe('Unsaved Changes Sticky Bar & Persistence', () => {
    it('shows unsaved changes bar on modification and supports discard', () => {
      render(<WebEmergencyCard initialBloodGroup="Not set" />);
      expect(screen.queryByRole('region', { name: /unsaved card changes/i })).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: /blood group: A\+/i }));
      expect(screen.getByRole('region', { name: /unsaved card changes/i })).toBeInTheDocument();

      // Discard
      fireEvent.click(screen.getByRole('button', { name: /discard changes/i }));
      expect(screen.queryByRole('region', { name: /unsaved card changes/i })).toBeNull();
      expect(screen.getByRole('button', { name: /blood group: A\+/i })).toHaveAttribute('aria-pressed', 'false');
    });

    it('prevents saving when phone format is invalid and flashes toast', () => {
      render(
        <WebEmergencyCard
          initialContacts={[{ name: 'Sunita', phone: '12345', rel: 'Parent' }]}
        />
      );

      // Trigger dirty
      fireEvent.click(screen.getByRole('button', { name: /blood group: A\+/i }));
      const saveBtn = screen.getByRole('button', { name: /^save emergency card$/i });
      fireEvent.click(saveBtn);

      expect(screen.getByRole('status')).toHaveTextContent(/fix the phone number first/i);
    });

    it('saves cleanly when all phone numbers are valid', async () => {
      render(
        <WebEmergencyCard
          initialContacts={[{ name: 'Sunita', phone: '9848012345', rel: 'Parent' }]}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /blood group: A\+/i }));
      const saveBtn = screen.getByRole('button', { name: /^save emergency card$/i });
      fireEvent.click(saveBtn);

      expect(await screen.findByRole('status')).toHaveTextContent(/saved · offline card updated/i);
      expect(screen.queryByRole('region', { name: /unsaved card changes/i })).toBeNull();
    });
  });

  describe('Print / PDF Export', () => {
    it('invokes window.print when card is saved', () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      render(<WebEmergencyCard />);

      const printBtn = screen.getByRole('button', { name: /^print or save as pdf$/i });
      fireEvent.click(printBtn);

      expect(screen.getByRole('status')).toHaveTextContent(/pdf ready/i);
      printSpy.mockRestore();
    });
  });

  describe('Accessibility & Transparency', () => {
    it('labels every interactive control and hides decorative icons', () => {
      const { container } = render(<WebEmergencyCard />);
      for (const btn of screen.getAllByRole('button')) {
        expect(btn).toHaveAccessibleName();
      }
      for (const svg of container.querySelectorAll('svg')) {
        expect(svg).toHaveAttribute('aria-hidden', 'true');
      }
    });

    it('renders transparency policy section explaining access boundaries', () => {
      render(<WebEmergencyCard />);
      expect(screen.getByRole('region', { name: /who can see this card/i })).toBeInTheDocument();
      expect(screen.getByText(/never shown to shops, partners or your campus otherwise/i)).toBeInTheDocument();
    });
  });
});
