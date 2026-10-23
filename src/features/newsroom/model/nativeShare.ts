/**
 * The device's own share sheet for a post (Web Share API on phones and Safari).
 * Native builds use nativeShare.native.ts (React Native's Share). Never reports
 * "shared" unless the platform said so; a closed sheet is "dismissed".
 */
export type NativeShareOutcome = 'shared' | 'dismissed' | 'unavailable' | 'failed';

export interface PostShare { title: string; text: string; url: string }

export function canShareNatively(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function sharePostNatively(post: PostShare): Promise<NativeShareOutcome> {
  if (!canShareNatively()) return 'unavailable';
  try {
    await navigator.share({ title: post.title, text: post.text, url: post.url });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'dismissed';
    return 'failed';
  }
}
