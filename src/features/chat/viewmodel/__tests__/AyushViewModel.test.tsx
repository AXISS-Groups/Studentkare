import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Linking } from 'react-native';
import { AyushViewModel } from '../AyushViewModel';
import type { AyushReply } from '../AyushViewModel';
import { AyushChatNativeView } from '../../views/AyushChatNativeView';

type Requester = typeof import('@/data/services/http').apiRequest;
const answered: AyushReply = { agent: 'ayush', outcome: 'ANSWERED', answer: 'Open Appointments and choose a slot.', answered: true,
  citations: [{ sourceId: 'src_1', title: 'Booking guide', category: 'help', version: 2, snippet: '', score: 0.9, stale: false }] };
const crisis: AyushReply = { agent: 'ayush', outcome: 'CRISIS', answer: 'Please reach out now.', answered: false, citations: [],
  crisis: { kind: 'SELF_HARM', resources: [{ label: 'Tele-MANAS', number: '14416', detail: '24×7' }] } };

const replying = (reply: AyushReply) => {
  const calls: { path: string; body: unknown }[] = [];
  const request = vi.fn(async (path: string, init?: RequestInit) => { calls.push({ path, body: JSON.parse(String(init?.body)) }); return reply; }) as unknown as Requester;
  return { request, calls };
};

describe('AyushViewModel', () => {
  it('asks the server agent — the only path through the AI constitution', async () => {
    const { request, calls } = replying(answered);
    const vm = new AyushViewModel(request);
    await vm.send('How do I book?');
    expect(calls).toEqual([{ path: '/agents/ayush/ask', body: { question: 'How do I book?', conversationId: vm.conversationId } }]);
    expect(vm.thread[0].reply.outcome).toBe('ANSWERED');
  });

  it('gives no local answer when the server cannot be reached', async () => {
    const vm = new AyushViewModel((async () => { throw new Error('offline'); }) as unknown as Requester);
    vm.setQuestion('How do I book?');
    await vm.send();
    expect(vm.thread).toEqual([]);
    expect(vm.error).toBe('ayush.unreachable');
    expect(vm.question).toBe('How do I book?');
  });
});

describe('AyushChatNativeView', () => {
  it('shows the answer with its source', async () => {
    const vm = new AyushViewModel(replying(answered).request);
    await vm.send('How do I book?');
    render(<AyushChatNativeView viewModel={vm} />);
    expect(screen.getByText('Open Appointments and choose a slot.')).toBeInTheDocument();
    expect(screen.getByText('Booking guide · v2')).toBeInTheDocument();
  });

  it('turns a crisis reply into one-tap call buttons', async () => {
    const open = vi.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const vm = new AyushViewModel(replying(crisis).request);
    await vm.send('I want to hurt myself');
    render(<AyushChatNativeView viewModel={vm} />);
    fireEvent.click(screen.getByRole('button', { name: /^Call Tele-MANAS 14416/ }));
    expect(open).toHaveBeenCalledWith('tel:14416');
    open.mockRestore();
  });
});
