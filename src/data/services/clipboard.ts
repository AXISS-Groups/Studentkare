/**
 * Copies text to the clipboard. Resolves false when it could not (no
 * clipboard API, permission refused, or native, where no clipboard module is
 * bundled), so the caller can say so instead of claiming a copy.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}
