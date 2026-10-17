/** "Dr. Sameer Menon" → "SM" (title ignored). */
export function initialsOf(fullName: string): string {
  const words = fullName.replace(/^dr\.?\s+/i, '').trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) ?? '';
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
  return `${first}${last}`.toUpperCase() || '?';
}
