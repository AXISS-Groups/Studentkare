import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/data/services/http';
import { LanguageProvider } from '@/i18n';
import { axeViolations, describeViolations } from '@/test/axe';
import { skBrandLogo } from '@/design-system/icons/generated/skIconData';

// Set, change, reset and turn off the student's passcode (plan tier1-canvas-wp03,
// amendment 2026-10-22 b), the 4-6-8 rule, the strength hint, and the logo geometry.

let status: Record<string, unknown> = {};
let saveAnswer: () => Promise<unknown> = async () => ({ hasPasscode: true, length: 8 });
const apiRequest = vi.fn(async (path: string, init?: RequestInit): Promise<unknown> => {
  if (path === '/auth/passcode' && (!init || !init.method)) return status;
  if (path === '/auth/passcode' && init?.method === 'PUT') return saveAnswer();
  if (path === '/auth/passcode/remove') return { hasPasscode: false };
  return {};
});
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));

import { PasscodeViewModel } from '../../viewmodel/PasscodeViewModel';
import { PASSCODE_LENGTHS, localPasscodeProblem, passcodeStrength, saveProblemKey } from '../../viewmodel/passcodeRules';
import { SetPasscodeView } from '../SetPasscodeView';

const NOW = 1_800_000_000_000;
const base = { available: true, enabled: true, hasPasscode: false, lengths: [4, 6, 8], recommendedLength: 8, replaceWithoutCurrentUntil: null };
const bodies = (path: string) => apiRequest.mock.calls.filter(([p, i]) => p === path && i?.method).map(([, i]) => JSON.parse(String(i?.body)) as Record<string, unknown>);

async function renderView(onDone = vi.fn()) {
  const vm = new PasscodeViewModel(() => NOW);
  await vm.load();
  const view = render(<LanguageProvider><main className="sk-signin"><SetPasscodeView vm={vm} onDone={onDone} /></main></LanguageProvider>);
  return { vm, onDone, ...view };
}

beforeEach(() => {
  apiRequest.mockClear();
  status = { ...base };
  saveAnswer = async () => ({ hasPasscode: true, length: 8 });
});

describe('the rules', () => {
  it('allows exactly 4, 6 or 8 characters', () => {
    expect(PASSCODE_LENGTHS).toEqual([4, 6, 8]);
    for (const ok of ['k7#q', 'k7#Qm2', 'k7#Qm2!x']) expect(localPasscodeProblem(ok)).toBeNull();
    for (const bad of ['k7#', 'k7#Qm', 'k7#Qm2!', 'k7#Qm2!x9']) expect(localPasscodeProblem(bad)).toBe('authpc.set.badLength');
    expect(localPasscodeProblem('k7 q')).toBe('authpc.set.badChars');
  });

  it('says 4 is the weakest and 8 with a mix is strong', () => {
    expect(passcodeStrength('')).toBe('empty');
    expect(passcodeStrength('k7#q')).toBe('weak');
    expect(passcodeStrength('k7#Qm2')).toBe('fair');
    expect(passcodeStrength('abcdefgh')).toBe('fair');
    expect(passcodeStrength('k7#Qm2!x')).toBe('strong');
  });

  it('turns the server’s refusals into the student’s language', () => {
    expect(saveProblemKey(new ApiError('x', 422, { code: 'PASSCODE_WEAK', reason: 'PERSONAL' }))).toBe('authpc.set.weak.PERSONAL');
    expect(saveProblemKey(new ApiError('x', 422, { code: 'PASSCODE_WEAK', reason: 'SEQUENCE' }))).toBe('authpc.set.weak.SEQUENCE');
    expect(saveProblemKey(new ApiError('x', 403, { code: 'PASSCODE_PROOF_NEEDED' }))).toBe('authpc.set.proof');
    expect(saveProblemKey(new Error('offline'))).toBe('authpc.set.failed');
  });
});

describe('set a passcode', () => {
  it('shows the lengths plainly, the strength hint, and saves only a matching 4/6/8', async () => {
    await renderView();
    expect(screen.getByRole('heading', { name: 'Add a secret passcode' })).toBeTruthy();
    expect(screen.getByText(/4 characters: the weakest/)).toBeTruthy();
    expect(screen.getByText(/8 characters: recommended/)).toBeTruthy();
    expect(screen.queryByLabelText('Current passcode')).toBeNull();
    const save = screen.getByRole('button', { name: 'Save passcode' }) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText('New passcode'), { target: { value: 'k7#q' } });
    expect(screen.getByText('Weak: 4 characters is the weakest')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('New passcode'), { target: { value: 'k7#Qm' } });
    expect(screen.getByText('A passcode is exactly 4, 6 or 8 characters.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('New passcode'), { target: { value: 'k7#Qm2!x' } });
    expect(screen.getByText('Strong')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'k7#Qm2!y' } });
    expect(screen.getByText('The two passcodes don’t match.')).toBeTruthy();
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'k7#Qm2!x' } });
    expect(save.disabled).toBe(false);
    status = { ...base, hasPasscode: true, length: 8 };
    fireEvent.click(save);
    expect(await screen.findByText(/Your passcode is saved/)).toBeTruthy();
    expect(bodies('/auth/passcode')).toEqual([{ passcode: 'k7#Qm2!x' }]);
    // Nothing typed is kept.
    expect((screen.getByLabelText('New passcode') as HTMLInputElement).value).toBe('');
  });

  it('shows a weak refusal from the server and keeps no passcode', async () => {
    saveAnswer = async () => { throw new ApiError('too easy', 422, { code: 'PASSCODE_WEAK', reason: 'COMMON' }); };
    await renderView();
    fireEvent.change(screen.getByLabelText('New passcode'), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save passcode' }));
    expect(await screen.findByText('That one is too common. Pick something only you would know.')).toBeTruthy();
  });

  it('show / hide draws eye while hidden and eye-off while shown', async () => {
    await renderView();
    const field = screen.getByLabelText('New passcode') as HTMLInputElement;
    const toggle = screen.getAllByRole('button', { name: 'Show passcode' })[0];
    expect(field.type).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('eye');
    fireEvent.click(toggle);
    expect(field.type).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('eye-off');
  });

  it('"Not now" leaves without saving', async () => {
    const { onDone } = await renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onDone).toHaveBeenCalled();
    expect(bodies('/auth/passcode')).toEqual([]);
  });
});

describe('change, reset, turn off', () => {
  it('change needs the current passcode and sends it', async () => {
    status = { ...base, hasPasscode: true, length: 6 };
    await renderView();
    expect(screen.getByRole('heading', { name: 'Change your passcode' })).toBeTruthy();
    const save = screen.getByRole('button', { name: 'Save passcode' }) as HTMLButtonElement;
    fireEvent.change(screen.getByLabelText('New passcode'), { target: { value: 'Rv8!tq3Z' } });
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'Rv8!tq3Z' } });
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Current passcode'), { target: { value: 'k7#Qm2' } });
    fireEvent.click(save);
    await waitFor(() => expect(bodies('/auth/passcode')).toEqual([{ passcode: 'Rv8!tq3Z', currentPasscode: 'k7#Qm2' }]));
  });

  it('after a fresh code sign-in (forgot passcode) a new one is set without the old', async () => {
    status = { ...base, hasPasscode: true, length: 6, replaceWithoutCurrentUntil: NOW / 1000 + 600 };
    await renderView();
    expect(screen.getByRole('heading', { name: 'Set a new passcode' })).toBeTruthy();
    expect(screen.queryByLabelText('Current passcode')).toBeNull();
    fireEvent.change(screen.getByLabelText('New passcode'), { target: { value: 'Rv8!tq3Z' } });
    fireEvent.change(screen.getByLabelText('Type it again'), { target: { value: 'Rv8!tq3Z' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save passcode' }));
    await waitFor(() => expect(bodies('/auth/passcode')).toEqual([{ passcode: 'Rv8!tq3Z' }]));
  });

  it('turn off sends the current passcode when it is needed', async () => {
    status = { ...base, hasPasscode: true, length: 6 };
    await renderView();
    const off = screen.getByRole('button', { name: 'Turn off passcode' }) as HTMLButtonElement;
    expect(off.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Current passcode'), { target: { value: 'k7#Qm2' } });
    status = { ...base };
    fireEvent.click(off);
    expect(await screen.findByText(/Passcode turned off/)).toBeTruthy();
    expect(bodies('/auth/passcode/remove')).toEqual([{ currentPasscode: 'k7#Qm2' }]);
  });

  it('switch off or a team account: says so, no form', async () => {
    status = { ...base, enabled: false };
    await renderView();
    expect(screen.getByText(/Passcodes are turned off right now/)).toBeTruthy();
    expect(screen.queryByLabelText('New passcode')).toBeNull();
  });

  it('a load failure offers a retry', async () => {
    apiRequest.mockImplementationOnce(async () => { throw new Error('offline'); });
    await renderView();
    expect(screen.getByText(/couldn’t load your passcode settings/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('has no axe violations', async () => {
    const { container } = await renderView();
    fireEvent.change(screen.getByLabelText('New passcode'), { target: { value: 'k7#q' } });
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});

describe('the logo mark', () => {
  // The letters' own box (design/brand/studentkare-logo.svg paths), before the centring transform.
  const LETTERS = { left: 109, right: 490, top: 196, bottom: 389 };
  const SHIELD = { left: 6, right: 506, centreX: 256 };

  it('puts SK centred inside the shield, with margin, at every size', () => {
    const match = /<g transform="matrix\(([\d.]+) 0 0 ([\d.]+) ([\d.-]+) ([\d.-]+)\)">/.exec(skBrandLogo);
    expect(match).not.toBeNull();
    const [scale, , dx, dy] = (match ?? []).slice(1).map(Number);
    const left = LETTERS.left * scale + dx;
    const right = LETTERS.right * scale + dx;
    expect(Math.abs((left + right) / 2 - SHIELD.centreX)).toBeLessThan(2);
    expect(left - SHIELD.left).toBeGreaterThan(80);
    expect(SHIELD.right - right).toBeGreaterThan(80);
    expect(LETTERS.top * scale + dy).toBeGreaterThan(150);
    expect(LETTERS.bottom * scale + dy).toBeLessThan(420);
    // The stroke keyline fits inside the drawing's box.
    expect(skBrandLogo).toContain('viewBox="-8 -8 528 616"');
  });
});
