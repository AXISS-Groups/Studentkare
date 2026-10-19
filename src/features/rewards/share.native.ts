import { Share } from 'react-native';
import type { InviteShare, ShareOutcome } from './shareTypes';

/** Native: the iOS / Android share sheet, prefilled with the invite message. */
export async function shareInvite(invite: InviteShare): Promise<ShareOutcome> {
  try {
    const result = await Share.share({ title: invite.title, message: invite.message }, { dialogTitle: invite.title, subject: invite.title });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'failed';
  }
}

/** No clipboard module is bundled for native; the share sheet has its own "Copy". */
export const canCopyLink = false;

export async function copyInvite(_text: string): Promise<ShareOutcome> {
  return 'failed';
}
