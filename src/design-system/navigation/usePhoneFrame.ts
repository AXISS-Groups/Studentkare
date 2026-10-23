import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { size } from '../theme';

/** The media query for a viewport narrow enough to draw the phone boards (`size.phoneFrameMax`). */
export const PHONE_FRAME_QUERY = `(max-width: ${size.phoneFrameMax}px)`;

function matchesNow(): boolean {
  if (Platform.OS !== 'web') return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(PHONE_FRAME_QUERY).matches;
}

/**
 * True when the screen should be drawn as the phone boards draw it (phone
 * header and tab bar) rather than with the desktop web shell: always on a
 * phone, and on the web at `size.phoneFrameMax` (430 px) or narrower. It
 * follows the window as it is resized or rotated.
 */
export function usePhoneFrame(): boolean {
  const [phone, setPhone] = useState(matchesNow);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(PHONE_FRAME_QUERY);
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return phone;
}
