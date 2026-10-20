import type { InviteShare, ShareOutcome } from './shareTypes';

/**
 * Web: the browser's share sheet when there is one (phones, Safari), else the
 * link and message go to the clipboard. Never reports "shared" unless the
 * browser said so; a cancelled sheet is "dismissed", not an error.
 * Native builds use share.native.ts (React Native's Share).
 */
export async function shareInvite(invite: InviteShare): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: invite.title, text: invite.message });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'dismissed';
      // Not allowed here (e.g. an iframe): fall through to copying.
    }
  }
  return copyInvite(invite.message);
}

/** The web can always try the clipboard. */
export const canCopyLink = true;

export async function copyInvite(text: string): Promise<ShareOutcome> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return 'copied';
    }
  } catch {
    // Clipboard refused (permissions, insecure context): say so below.
  }
  return 'failed';
}
