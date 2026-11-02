import { Share } from 'react-native';
import type { NativeShareOutcome, PostShare } from './nativeShare';

export type { NativeShareOutcome, PostShare } from './nativeShare';

/** Native: the iOS / Android share sheet with the post's title, text and link. */
export function canShareNatively(): boolean {
  return true;
}

export async function sharePostNatively(post: PostShare): Promise<NativeShareOutcome> {
  try {
    const result = await Share.share({ title: post.title, message: `${post.text} ${post.url}`.trim(), url: post.url },
      { dialogTitle: post.title, subject: post.title });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'failed';
  }
}
