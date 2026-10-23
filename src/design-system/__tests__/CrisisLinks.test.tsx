import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Linking } from 'react-native';
import { CrisisLinks } from '..';

describe('CrisisLinks', () => {
  it('dials 112 and Tele-MANAS 14416 in one tap, with spoken labels', () => {
    const open = vi.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    render(<CrisisLinks />);
    fireEvent.click(screen.getByRole('button', { name: /Call 112, emergency services/ }));
    fireEvent.click(screen.getByRole('button', { name: /Tele-MANAS 14416/ }));
    expect(open).toHaveBeenCalledWith('tel:112');
    expect(open).toHaveBeenCalledWith('tel:14416');
    open.mockRestore();
  });
});

/**
 * DESIGN.md §2.4: help is never behind a login or verification gate. These
 * screens are reached before an account exists, so each must carry the links.
 * Asserted on source because several render through the native navigator.
 */
describe('crisis help on screens before sign-in', () => {
  it.each([
    'src/screens/medical/MedicalIncidentScreen.tsx',
    'src/features/auth/screens/AuthenticatedFlowScreen.tsx',
    'src/features/auth/views/VerifyGateView.tsx',
    'src/features/auth/views/AuthNativeParts.tsx',
    'src/features/auth/views/SignInFrame.tsx',
    'src/features/auth/views/VerifyGateNativeView.tsx',
  ])('%s renders CrisisLinks', (file) => {
    expect(readFileSync(resolve(process.cwd(), file), 'utf8')).toMatch(/<CrisisLinks\b/);
  });

  // Sign in and create account on Expo draw through the shared frame, whose
  // emergency strip sits outside the scroll so it is always in view.
  it.each([
    'src/features/auth/views/SignInNativeView.tsx',
    'src/features/auth/views/CreateAccountNativeView.tsx',
  ])('%s draws through AuthNativeFrame', (file) => {
    expect(readFileSync(resolve(process.cwd(), file), 'utf8')).toMatch(/<AuthNativeFrame\b/);
  });

  it('keeps the SOS and toolbar controls at the 44 px touch target', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/theme/styles/indigo.css'), 'utf8');
    expect(css).not.toMatch(/\.care-bar-action-btn[^{]*\{[^}]*min-height:\s*3\dpx/);
    expect(css).not.toMatch(/\.wf-emergency-sos-button[^{]*\{[^}]*min-height:\s*3\dpx/);
  });

  it('the crisis page does not claim live triage', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/screens/medical/MedicalIncidentScreen.tsx'), 'utf8');
    expect(source).not.toMatch(/TRIAGE ACTIVE|triage dispatch/i);
  });
});
