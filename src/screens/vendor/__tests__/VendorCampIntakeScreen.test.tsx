import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { VendorCampIntakeScreen } from '../VendorCampIntakeScreen';

describe('VendorCampIntake', () => {
  it('shows the batch table not connected, with no sample batches or held counts', () => {
    render(<VendorCampIntakeScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Camp intake' })).toBeInTheDocument();
    expect(screen.getByText('Camp batches aren’t connected yet.')).toBeInTheDocument();
    for (const fake of [/CMP-0412/, /16 samples held/, /212 of 300/, /692/]) expect(screen.queryByText(fake)).toBeNull();
  });

  it('opens the staff app’s camp fast mode', () => {
    const onNavigate = vi.fn();
    render(<VendorCampIntakeScreen onNavigate={onNavigate} />);
    expect(screen.getByRole('list', { name: 'What fast mode checks' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open fast mode' }));
    expect(onNavigate).toHaveBeenCalledWith('camp-fast');
  });
});
