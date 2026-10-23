import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VendorReorderScreen } from '../VendorReorderScreen';

describe('VendorReorder — not connected', () => {
  it('keeps the designed figures and columns, with no sample stock or purchase orders', () => {
    render(<VendorReorderScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Reorder rules' })).toBeInTheDocument();
    for (const label of ['Below trigger', 'Out of stock', 'Expiring within 60 days', 'Essential items watched']) expect(screen.getByText(label)).toBeInTheDocument();
    for (const column of ['Item', 'On hand', 'Trigger at', 'Rule', 'State']) expect(screen.getByRole('columnheader', { name: column })).toBeInTheDocument();
    expect(screen.getByText('Reorder rules aren’t connected yet.')).toBeInTheDocument();
    for (const fake of [/Salbutamol/, /ORS sachets/, /PO raised/, /4 below trigger/]) expect(screen.queryByText(fake)).toBeNull();
  });
});
