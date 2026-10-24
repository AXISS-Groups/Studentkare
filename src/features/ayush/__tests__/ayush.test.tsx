import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { apiRequest } from '@/data/services/http';
import { navigate } from '@/lib/utils/workflowRouting';
import { LanguageProvider, translate } from '@/i18n';
import { M2SosProvider } from '@/design-system/m2';
import { EMERGENCY_NUMBER, TELE_MANAS_NUMBER } from '@/design-system';
import { axeViolations, describeViolations } from '@/test/axe';
import { AyushViewModel } from '@/features/chat/viewmodel/AyushViewModel';
import { M2AskAyushView } from '@/features/chat/views/M2AskAyushView';
import type { M2AskAyushLinks } from '@/features/chat/views/M2AskAyushView';
import { AyushWidget, ayushWidgetShownOn } from '../AyushWidget';

vi.mock('@/data/services/http', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/data/services/http')>()), apiRequest: vi.fn() }));
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: vi.fn() }));

/**
 * Ask Ayush, one view at every width, and the widget on the same client
 * (Tier 1 parity plan 2026-10-24 §1, §9, §10).
 */
const en = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) => translate('en', key, vars);
const api = vi.mocked(apiRequest);
const go = vi.mocked(navigate);
const settle = async () => { await act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); }); };
const answered = { agent: 'ayush', outcome: 'ANSWERED', answer: 'Open the record and choose Share.', citations: [{ sourceId: 'k1', title: 'Sharing a record', category: 'how-to', version: 2, snippet: 'From the source', score: 0.41, stale: false }], answered: true };
const crisis = {
  agent: 'ayush', outcome: 'CRISIS', answer: 'You are not alone.', citations: [], answered: false,
  crisis: { kind: 'self_harm', resources: [{ label: 'Emergency', number: '112', detail: '' }, { label: 'Tele-MANAS', number: '14416', detail: '24/7' }] },
};
const noSource = { agent: 'ayush', outcome: 'NO_SOURCE', answer: 'server text', citations: [], answered: false };

beforeEach(() => {
  api.mockReset(); go.mockReset();
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
});

function page({ wide = false, sos }: { wide?: boolean; sos?: () => void } = {}) {
  const vm = new AyushViewModel(api);
  const links: M2AskAyushLinks = { back: vi.fn(), help: vi.fn(), book: vi.fn(), manageHistory: vi.fn() };
  const view = <M2AskAyushView vm={vm} links={links} wide={wide} />;
  const utils = render(<LanguageProvider>{sos ? <M2SosProvider value={sos}>{view}</M2SosProvider> : view}</LanguageProvider>);
  return { vm, links, ...utils };
}

async function ask(text: string) {
  fireEvent.change(screen.getByTestId('m2-ask-input'), { target: { value: text } });
  fireEvent.click(screen.getByTestId('m2-ask-send'));
  await settle();
}

describe('Ask Ayush, one view (§9)', () => {
  it.each([false, true])('a crisis reply is the crisis card with the server’s 112 and Tele-MANAS calls (wide=%s)', async (wide) => {
    api.mockResolvedValue(crisis);
    const open = vi.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    page({ wide });
    await ask('I feel hopeless');
    const card = screen.getByTestId('m2-ask-crisis');
    expect(card).toHaveAttribute('role', 'alert');
    expect(card).toHaveTextContent(en('ayush.notAlone'));
    fireEvent.click(within(card).getByRole('link', { name: en('ayush.callSpoken', { label: 'Emergency', number: '112' }) }));
    fireEvent.click(within(card).getByRole('link', { name: en('ayush.callSpoken', { label: 'Tele-MANAS', number: '14416' }) }));
    expect(open.mock.calls.map((c) => c[0])).toEqual(['tel:112', 'tel:14416']);
    open.mockRestore();
    // The Tele-MANAS strip stays on screen beside the card.
    expect(screen.getByTestId('m2-ask-crisis-line')).toBeInTheDocument();
  });

  it.each([false, true])('nothing found offers Help and a consult, not a dead end (wide=%s)', async (wide) => {
    api.mockResolvedValue(noSource);
    const { links } = page({ wide });
    await ask('How do I juggle?');
    expect(screen.getByText(en('assist.ayush.noSource.title'))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('m2-ask-next-help'));
    fireEvent.click(screen.getByTestId('m2-ask-next-book'));
    expect(links.help).toHaveBeenCalled();
    expect(links.book).toHaveBeenCalled();
  });

  it('answers with the server’s sources, and a failed ask can be sent again', async () => {
    api.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(answered);
    const { vm } = page({ wide: true });
    await ask('How do I share?');
    expect(screen.getByTestId('m2-ask-error')).toHaveTextContent(en('ayush.unreachable'));
    fireEvent.click(screen.getByTestId('m2-ask-retry'));
    await settle();
    expect(api).toHaveBeenLastCalledWith('/agents/ayush/ask', expect.objectContaining({ body: JSON.stringify({ question: 'How do I share?', conversationId: vm.conversationId }) }));
    expect(screen.getByText('Open the record and choose Share.')).toBeInTheDocument();
    expect(screen.getByText('Sharing a record')).toBeInTheDocument();
    expect(screen.queryByTestId('m2-ask-error')).toBeNull();
  });

  it('desktop: the side column (what Ayush will not do, the transcript note, talk to a person), no SOS of its own', async () => {
    const open = vi.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const { links, container } = page({ wide: true });
    const side = screen.getByTestId('m2-ask-side');
    expect(within(side).getByText(en('swt.ayush.limit.diagnose'))).toBeInTheDocument();
    expect(within(side).getByText(en('swt.ayush.limit.source'))).toBeInTheDocument();
    expect(within(side).getByText(en('swt.ayush.transcriptBody'))).toBeInTheDocument();
    fireEvent.click(within(side).getByRole('link', { name: en('swt.ayush.manage') }));
    expect(links.manageHistory).toHaveBeenCalled();
    fireEvent.click(within(side).getByRole('link', { name: en('swt.crisis.callTelemanas') }));
    expect(open).toHaveBeenCalledWith(`tel:${TELE_MANAS_NUMBER}`);
    open.mockRestore();
    expect(screen.queryByTestId('m2-ask-limits')).toBeNull();
    expect(screen.queryByTestId('m2-ask-sos')).toBeNull();
    const v = await axeViolations(container);
    expect(v, describeViolations(v)).toEqual([]);
  });

  it('phone: "What Ayush won’t do" is a card under the banner, closed until opened; SOS is the shell’s', async () => {
    const sos = vi.fn();
    const { container } = page({ sos });
    expect(screen.queryByTestId('m2-ask-side')).toBeNull();
    const toggle = screen.getByTestId('m2-ask-limits-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(en('swt.ayush.limit.diagnose'))).toBeNull();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(en('swt.ayush.limit.diagnose'))).toBeInTheDocument();
    const buttons = screen.getAllByTestId('m2-ask-sos');
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0] as HTMLElement);
    expect(sos).toHaveBeenCalledTimes(1);
    const v = await axeViolations(container);
    expect(v, describeViolations(v)).toEqual([]);
  });

  it.each([false, true])('offline: the question cannot be sent, the chips are off, the helpline stays (wide=%s)', (wide) => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    page({ wide });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByTestId('m2-ask-send')).toHaveAttribute('aria-disabled', 'true');
    within(screen.getByTestId('m2-ask-suggestions')).getAllByRole('button').forEach((chip) => expect(chip).toHaveAttribute('aria-disabled', 'true'));
    expect(screen.getByRole('link', { name: en('m2.ask.callSpoken', { number: TELE_MANAS_NUMBER }) })).toBeInTheDocument();
  });

  it('no phone number is written into the views: every call comes from the shared constants or the server', () => {
    for (const file of ['../../chat/views/M2AskAyushView.tsx', '../../chat/views/AyushThread.tsx', '../AyushWidget.tsx']) {
      expect(readFileSync(resolve(__dirname, file), 'utf8'), file).not.toMatch(/tel:\d|['"`](112|14416)['"`]/);
    }
  });
});

describe('AyushWidget (§10)', () => {
  const emergencyLinks = () => screen.getAllByRole('link', { name: en('swt.crisis.call112') });

  it('opens from a labelled launcher, draws the Ask Ayush thread, keeps the emergency line in every state, and Escape returns focus', async () => {
    api.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(answered);
    const { container } = render(<LanguageProvider><AyushWidget /></LanguageProvider>);
    const launcher = screen.getByRole('button', { name: en('swt.ayw.open') });
    expect(launcher.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(launcher);
    const panel = screen.getByRole('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('false');
    expect(within(panel).getByTestId('m2-ask-greeting')).toHaveTextContent(en('m2.ask.greeting'));
    expect(within(panel).getByTestId('m2-ask-crisis-line')).toBeInTheDocument();
    expect(emergencyLinks()).toHaveLength(1);
    expect(emergencyLinks()[0]?.getAttribute('href')).toBe(`tel:${EMERGENCY_NUMBER}`);
    const v = await axeViolations(container);
    expect(v, describeViolations(v)).toEqual([]);

    fireEvent.click(within(panel).getByRole('button', { name: en('ayush.starter1') }));
    await settle();
    expect(within(panel).getByTestId('m2-ask-error')).toHaveTextContent(en('ayush.unreachable'));
    expect(emergencyLinks()).toHaveLength(1);

    fireEvent.click(within(panel).getByTestId('m2-ask-retry'));
    await settle();
    expect(within(panel).getByText('Open the record and choose Share.')).toBeInTheDocument();
    expect(emergencyLinks()).toHaveLength(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: en('swt.ayw.open') }));
  });

  it('a crisis reply in the panel is the same crisis card as on the page', async () => {
    api.mockResolvedValue(crisis);
    render(<LanguageProvider><AyushWidget /></LanguageProvider>);
    fireEvent.click(screen.getByRole('button', { name: en('swt.ayw.open') }));
    const panel = screen.getByRole('dialog');
    fireEvent.change(within(panel).getByTestId('m2-ask-input'), { target: { value: 'I feel hopeless' } });
    fireEvent.click(within(panel).getByTestId('m2-ask-send'));
    await settle();
    const card = within(panel).getByTestId('m2-ask-crisis');
    expect(card).toHaveAttribute('role', 'alert');
    expect(within(card).getByRole('link', { name: en('ayush.callSpoken', { label: 'Tele-MANAS', number: '14416' }) })).toBeInTheDocument();
  });

  it('New starts a fresh conversation', async () => {
    api.mockResolvedValue(answered);
    render(<LanguageProvider><AyushWidget /></LanguageProvider>);
    fireEvent.click(screen.getByRole('button', { name: en('swt.ayw.open') }));
    const panel = screen.getByRole('dialog');
    fireEvent.click(within(panel).getByRole('button', { name: en('ayush.starter1') }));
    await settle();
    const first = JSON.parse(String((api.mock.calls[0]?.[1] as RequestInit).body)).conversationId;
    fireEvent.click(within(panel).getByRole('button', { name: en('swt.ayw.new') }));
    expect(within(panel).getByTestId('m2-ask-greeting')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 5));
    fireEvent.click(within(panel).getByRole('button', { name: en('ayush.starter1') }));
    await settle();
    const second = JSON.parse(String((api.mock.calls[1]?.[1] as RequestInit).body)).conversationId;
    expect(second).not.toBe(first);
  });

  it('offline: the panel says so, cannot send, and the emergency line is still there', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(<LanguageProvider><AyushWidget /></LanguageProvider>);
    fireEvent.click(screen.getByRole('button', { name: en('swt.ayw.open') }));
    expect(screen.getAllByText(/offline/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('m2-ask-send')).toHaveAttribute('aria-disabled', 'true');
    expect(emergencyLinks()).toHaveLength(1);
  });

  it('is never drawn on crisis, SOS, the emergency card, checkout, sign-in or Ayush itself', () => {
    for (const route of ['sos', 'emergency-card', 'checkout', 'login', 'ayush', 'medical-incident'] as const) expect(ayushWidgetShownOn(route), route).toBe(false);
    expect(ayushWidgetShownOn('health')).toBe(true);
    expect(ayushWidgetShownOn('records')).toBe(true);
  });
});
