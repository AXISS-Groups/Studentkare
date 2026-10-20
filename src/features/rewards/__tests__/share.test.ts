import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyInvite, shareInvite } from '../share';

const invite = { message: 'Join with my code ABCD2345: https://studentkare.co/signup?ref=ABCD2345', url: 'https://studentkare.co/signup?ref=ABCD2345', title: 'Join me' };

function setNavigator(share?: (data: ShareData) => Promise<void>, writeText?: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });
  Object.defineProperty(navigator, 'clipboard', { value: writeText ? { writeText } : undefined, configurable: true, writable: true });
}

afterEach(() => setNavigator(undefined, undefined));

describe('shareInvite (web)', () => {
  it('uses the browser share sheet with the prefilled message', async () => {
    const share = vi.fn(async () => undefined);
    setNavigator(share);
    expect(await shareInvite(invite)).toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'Join me', text: invite.message });
  });

  it('treats a cancelled sheet as dismissed, not an error', async () => {
    setNavigator(async () => { throw new DOMException('cancelled', 'AbortError'); });
    expect(await shareInvite(invite)).toBe('dismissed');
  });

  it('falls back to copying the message when there is no share sheet', async () => {
    const writeText = vi.fn(async () => undefined);
    setNavigator(undefined, writeText);
    expect(await shareInvite(invite)).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(invite.message);
  });

  it('says it failed when neither works', async () => {
    setNavigator(undefined, async () => { throw new Error('denied'); });
    expect(await copyInvite('x')).toBe('failed');
    setNavigator(undefined, undefined);
    expect(await shareInvite(invite)).toBe('failed');
  });
});
