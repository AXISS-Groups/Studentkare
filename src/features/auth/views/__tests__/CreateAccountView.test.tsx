import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AuthViewModel } from '../../viewmodel/AuthViewModel';
import { CreateAccountView } from '../CreateAccountView';

function draw(channel: 'EMAIL' | 'WHATSAPP' = 'WHATSAPP') {
  const vm = new AuthViewModel('signup', null);
  vm.advance(2);
  vm.setChannel(channel);
  const view = render(<form><CreateAccountView vm={vm} /></form>);
  return { vm, ...view };
}

describe('Create account (canvas CreateAccount)', () => {
  it('draws the board: back, progress at the real step, icon-led fields and the assurance', () => {
    const { container } = draw();
    expect(screen.getByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    for (const icon of ['arrow-left', 'user-5', 'shield-check-4']) {
      expect(container.querySelector(`[data-icon="${icon}"]`)).not.toBeNull();
    }
    expect(screen.getByText(/never sold/i)).toBeInTheDocument();
  });

  it('WhatsApp shows the +91 prefix; email shows the mail icon', () => {
    const { container, vm } = draw('WHATSAPP');
    const fieldIcon = () => container.querySelector('#sk-create-contact')?.parentElement?.querySelector('[data-icon="mail-2"]') ?? null;
    expect(screen.getByText('+91')).toBeInTheDocument();
    expect(fieldIcon()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Email' }));
    expect(vm.channel).toBe('EMAIL');
    expect(fieldIcon()).not.toBeNull();
    expect(screen.queryByText('+91')).toBeNull();
  });

  it('labels every field and keeps the hint tied to the contact field', () => {
    draw();
    expect(screen.getByLabelText('Full name')).toHaveAttribute('autocomplete', 'name');
    const contact = screen.getByLabelText(/whatsapp/i, { selector: 'input' });
    const hint = document.getElementById(contact.getAttribute('aria-describedby') ?? '');
    expect(hint).toHaveTextContent('Used for order updates and consult reminders. No marketing.');
  });

  it('the back arrow returns to the intro step without sending anything', () => {
    const { vm } = draw();
    expect(vm.step).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(vm.step).toBe(1);
  });

  it('draws no text arrows or emoji standing in for icons', () => {
    const { container } = draw();
    expect(container.textContent).not.toMatch(/[←→✓✕]/u);
  });
});
