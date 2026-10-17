import { describe, expect, it } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { EMERGENCY_CONTACTS, EmergencyBar } from '../EmergencyBar';
import { EMERGENCY_NUMBER, TELE_MANAS_PRIMARY } from '@/ai/core/crisisGate';
import { axeViolations } from '@/test/axe';

describe('EmergencyBar', () => {
  it('every helpline is a direct call link — no dialog in between', async () => {
    const { container } = render(<EmergencyBar />);
    expect(screen.getByRole('link', { name: 'Call 112, emergency services' })).toHaveAttribute('href', 'tel:112');
    for (const name of ['Emergency services', 'Ambulance', 'Tele-MANAS mental health', 'Poison helpline']) {
      expect(screen.getByRole('link', { name: new RegExp(`^Call ${name} on`) }).getAttribute('href')).toMatch(/^tel:\d+$/);
    }
    expect(await axeViolations(container)).toEqual([]);
  });

  it('uses the same numbers as the crisis gate', () => {
    const numbers = EMERGENCY_CONTACTS.map((c) => c.number);
    expect(numbers).toContain(EMERGENCY_NUMBER);
    expect(numbers).toContain(TELE_MANAS_PRIMARY);
    // Matches POISON_HELPLINE in backend/services/crisis_gate.py.
    expect(numbers).toContain('1800-116-117');
    expect(numbers).not.toContain('1800-11-0031');
  });
});
