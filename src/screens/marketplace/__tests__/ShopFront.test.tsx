import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShopFront } from '../ShopFront';

describe('ShopFront (/shop)', () => {
  const handlers = () => ({ onCategory: vi.fn(), onConcern: vi.fn(), onPrescription: vi.fn(), onLabs: vi.fn(), onVaccines: vi.fn() });

  it('every tile does something real', () => {
    const h = handlers();
    render(<ShopFront {...h} />);
    const tiles = screen.getByRole('navigation', { name: 'Shop by category' }).querySelectorAll('button');
    expect(tiles).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: 'Everyday medicines' }));
    fireEvent.click(screen.getByRole('button', { name: 'Heart care' }));
    fireEvent.click(screen.getByRole('button', { name: 'Match a prescription' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lab tests' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adult vaccines' }));
    expect(h.onCategory).toHaveBeenCalledWith('medicines');
    expect(h.onConcern).toHaveBeenCalledWith('heart');
    expect(h.onPrescription).toHaveBeenCalled();
    expect(h.onLabs).toHaveBeenCalled();
    expect(h.onVaccines).toHaveBeenCalled();
  });

  it('claims no pharmacist check, delivery time or unbacked service', () => {
    render(<ShopFront {...handlers()} />);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/pharmacist|Rx verified|by 9 ?pm|Nearby pharmacy|NABL/i);
  });
});
