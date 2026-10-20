import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductArtwork } from '../ProductArtwork';

const item = { name: 'Vitamin D3', brand: 'Acme', color: 'artTint8' as const, shape: 'jar' as const, artLabel: 'Vitamin D3' };

describe('ProductArtwork', () => {
  it('labels the illustration as one and invents no product claim', () => {
    render(<ProductArtwork item={item} />);
    expect(screen.getByRole('img', { name: 'Illustrative Vitamin D3 packaging' })).toBeTruthy();
    // Every jar used to say "COCOA BLEND", whatever was in it.
    expect(document.body.textContent ?? '').not.toMatch(/cocoa/i);
  });

  it('falls back to the labelled illustration when a product photo fails to load', () => {
    render(<ProductArtwork item={item} imageUrl="https://example.invalid/broken.png" />);
    fireEvent.error(screen.getByRole('img', { name: 'Vitamin D3' }));
    expect(screen.getByRole('img', { name: 'Illustrative Vitamin D3 packaging' })).toBeTruthy();
  });
});
