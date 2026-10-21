import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/i18n';
import { SignupConsentState, SIGNUP_PURPOSES } from '../../viewmodel/signupConsent';
import { SignupConsent } from '../SignupConsent';

// OnboardingConsent (Tier 1): nothing pre-ticked, continue locked until all three,
// no optional switches (Rule L / no purpose to consent to), no guardian branch.

function renderConsent(consent = new SignupConsentState(), onBack = vi.fn()) {
  const view = render(
    <LanguageProvider>
      <form onSubmit={(e) => e.preventDefault()}>
        <SignupConsent consent={consent} onBack={onBack} progress={{ position: 6, total: 6 }} />
      </form>
    </LanguageProvider>,
  );
  return { consent, onBack, ...view };
}

beforeEach(() => window.localStorage.clear());

describe('OnboardingConsent', () => {
  it('locks continue until the three required items are ticked', () => {
    const { consent } = renderConsent();
    const button = screen.getByRole('button', { name: 'Tick the three required items' });
    expect(button).toBeDisabled();
    for (const name of [/Keep my health records/, /Let my campus confirm/, /I am 18 or older/]) {
      fireEvent.click(screen.getByRole('checkbox', { name }));
    }
    expect(consent.complete).toBe(true);
    expect(screen.getByRole('button', { name: 'Agree and create my account' })).toBeEnabled();
  });

  it('draws the brief’s icons: back arrow, ticks and the continue arrow', () => {
    const consent = new SignupConsentState();
    SIGNUP_PURPOSES.forEach((purpose) => consent.toggle(purpose));
    const { container, onBack } = renderConsent(consent);
    expect(container.querySelector('[data-icon="arrow-left"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-icon="check-2"]')).toHaveLength(3);
    expect(container.querySelector('[data-icon="arrow-right"]')).not.toBeNull();
    expect(container.textContent).not.toContain('→');
    fireEvent.click(screen.getByRole('button', { name: 'Back to campus details' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('offers no optional switches and no guardian route', () => {
    renderConsent();
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
    expect(screen.queryByText(/Partner offers/i)).toBeNull();
    expect(screen.queryByText(/parent or guardian/i)).toBeNull();
    expect(screen.queryByText(/withdrawing is as easy/i)).toBeNull();
  });

  it('reads the same consent in Telugu, keeping the ticks', () => {
    const { consent } = renderConsent();
    fireEvent.click(screen.getByRole('checkbox', { name: /I am 18 or older/ }));
    fireEvent.click(screen.getByRole('button', { name: 'తెలుగు' }));
    expect(screen.getByRole('button', { name: 'తెలుగు' })).toHaveAttribute('aria-pressed', 'true');
    expect(consent.agreed.ADULT_18_PLUS).toBe(true);
    expect(screen.getAllByRole('checkbox').filter((box) => (box as HTMLInputElement).checked)).toHaveLength(1);
  });

  it('says where it sits in sign-up and that the time and version are recorded', () => {
    renderConsent();
    expect(screen.getByRole('progressbar', { name: 'Step 6 of 6' })).toBeInTheDocument();
    expect(screen.getByText('We record the time and version of what you agreed to.')).toBeInTheDocument();
  });
});
