import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { apiRequest } from '@/data/services/http';
import { navigate } from '@/lib/utils/workflowRouting';
import { axeViolations, describeViolations } from '@/test/axe';
import { AyushWidget, ayushWidgetShownOn } from '../AyushWidget';
import { WebAyushView } from '@/features/studentweb/views/t1/WebAyushView';

vi.mock('@/data/services/http', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/data/services/http')>()), apiRequest: vi.fn() }));
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: vi.fn() }));

const api = vi.mocked(apiRequest);
const go = vi.mocked(navigate);
const settle = async () => { await act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); }); };
const answered = { agent: 'ayush', outcome: 'ANSWERED', answer: 'Open the record and choose Share.', citations: [{ sourceId: 'k1', title: 'Sharing a record', category: 'how-to', version: 2, snippet: 'From the source', score: 0.41, stale: false }], answered: true };
const crisis = { agent: 'ayush', outcome: 'CRISIS', answer: 'You are not alone.', citations: [], answered: false, crisis: { kind: 'self_harm', resources: [{ label: 'Tele-MANAS', number: '14416', detail: '24/7' }] } };
const refused = { agent: 'ayush', outcome: 'REFUSED_SCOPE', answer: 'I can’t prescribe.', citations: [], answered: false, refusedFor: 'prescribing' };
const emergencyLinks = () => screen.getAllByRole('link', { name: 'Call 112, emergency services' });

beforeEach(() => { api.mockReset(); go.mockReset(); Object.defineProperty(navigator, 'onLine', { value: true, configurable: true }); });

describe('WebAyush', () => {
  it('shows the answer and citations exactly as the server sent them, without relevance scores or an index chip', async () => {
    api.mockResolvedValue(answered);
    const { container } = render(<WebAyushView />);
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'How do I share?' } });
    fireEvent.click(screen.getByRole('button', { name: /^Ask/ }));
    await settle();
    expect(api).toHaveBeenCalledWith('/agents/ayush/ask', expect.objectContaining({ method: 'POST' }));
    expect(screen.getByText('Open the record and choose Share.')).toBeTruthy();
    expect(screen.getByText('Sharing a record')).toBeTruthy();
    expect(screen.queryByText(/0\.41|relevance|Index current/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show what “Sharing a record” says' }));
    expect(screen.getByText('From the source…')).toBeTruthy();
    const v = await axeViolations(container);
    expect(v, describeViolations(v)).toEqual([]);
  });

  it('names the help pack as StudentKare help, never the raw PRODUCT_HELP category', async () => {
    api.mockResolvedValue({ ...answered, citations: [{ ...answered.citations[0], category: 'PRODUCT_HELP' }] });
    render(<WebAyushView />);
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'How do I share?' } });
    fireEvent.click(screen.getByRole('button', { name: /^Ask/ }));
    await settle();
    expect(screen.getByText('StudentKare help · version 2')).toBeTruthy();
    expect(screen.queryByText(/PRODUCT_HELP/)).toBeNull();
  });

  it('a crisis reply is an alert with call buttons; a refusal routes to a person, never a product', async () => {
    api.mockResolvedValueOnce(crisis).mockResolvedValueOnce(refused);
    render(<WebAyushView />);
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'I feel hopeless' } });
    fireEvent.click(screen.getByRole('button', { name: /^Ask/ }));
    await settle();
    const alert = screen.getByRole('alert');
    expect(within(alert).getByRole('link', { name: /14416/ }).getAttribute('href')).toBe('tel:14416');
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'What medicine should I take?' } });
    fireEvent.click(screen.getByRole('button', { name: /^Ask/ }));
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Find a clinician' }));
    expect(go).toHaveBeenCalledWith('care');
  });

  it('nothing found is not a dead end: it says so and links to Help and to a consult', async () => {
    api.mockResolvedValue({ agent: 'ayush', outcome: 'NO_SOURCE', answer: 'server text', citations: [], answered: false });
    const { container } = render(<WebAyushView />);
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'How do I juggle?' } });
    fireEvent.click(screen.getByRole('button', { name: /^Ask/ }));
    await settle();
    expect(screen.getByText('I couldn’t find this in StudentKare’s help yet.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open Help' }));
    expect(go).toHaveBeenCalledWith('support');
    fireEvent.click(screen.getByRole('button', { name: 'Book a consult' }));
    expect(go).toHaveBeenCalledWith('care');
    const v = await axeViolations(container);
    expect(v, describeViolations(v)).toEqual([]);
  });

  it('a failed ask says so and the crisis lines stay on the page', async () => {
    api.mockRejectedValue(new Error('down'));
    render(<WebAyushView />);
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Hello there' } });
    fireEvent.click(screen.getByRole('button', { name: /^Ask/ }));
    await settle();
    expect(screen.getByRole('alert').textContent).toMatch(/didn’t answer/);
    expect(emergencyLinks().length).toBeGreaterThan(0);
  });
});

describe('AyushWidget', () => {
  it('opens from a labelled launcher, keeps the emergency line in every state, and Escape returns focus', async () => {
    api.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(answered);
    const { container } = render(<AyushWidget />);
    const launcher = screen.getByRole('button', { name: 'Open Ayush' });
    expect(launcher.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(launcher);
    const panel = screen.getByRole('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('false');
    expect(within(panel).getByText(/I don’t diagnose, prescribe or read your records/)).toBeTruthy();
    expect(emergencyLinks()).toHaveLength(1);
    const v = await axeViolations(container);
    expect(v, describeViolations(v)).toEqual([]);

    fireEvent.click(within(panel).getByRole('button', { name: 'How do I share a record with a clinician?' }));
    await settle();
    expect(within(panel).getByRole('alert').textContent).toMatch(/didn’t answer/);
    expect(emergencyLinks()).toHaveLength(1);

    fireEvent.change(within(panel).getByLabelText('Your question'), { target: { value: 'How do I share?' } });
    fireEvent.click(within(panel).getByRole('button', { name: /^Ask/ }));
    await settle();
    expect(within(panel).getByText('Open the record and choose Share.')).toBeTruthy();
    expect(emergencyLinks()).toHaveLength(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open Ayush' }));
  });

  it('offline: the panel says so, cannot send, and the emergency line is still there', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(<AyushWidget />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Ayush' }));
    expect(screen.getAllByText(/offline/i).length).toBeGreaterThan(0);
    expect((screen.getByRole('button', { name: /^Ask/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(emergencyLinks()).toHaveLength(1);
  });

  it('is never drawn on crisis, SOS, the emergency card, checkout, sign-in or Ayush itself', () => {
    for (const route of ['sos', 'emergency-card', 'checkout', 'login', 'ayush', 'medical-incident'] as const) expect(ayushWidgetShownOn(route), route).toBe(false);
    expect(ayushWidgetShownOn('health')).toBe(true);
    expect(ayushWidgetShownOn('records')).toBe(true);
  });
});
