import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, radius, space } from './theme';

export type ToastTone = 'neutral' | 'success' | 'error';

const tone: Record<ToastTone, { bg: string; fg: string }> = {
  neutral: { bg: color.brandNavy, fg: color.onAction },
  success: { bg: color.positiveBg, fg: color.positive },
  error: { bg: color.dangerBg, fg: color.danger },
};

export interface ToastProps {
  message: string;
  tone?: ToastTone;
  /** Called after `durationMs`. Errors stay until dismissed by the caller, so they aren't missed. */
  onDone?: () => void;
  durationMs?: number;
  testID?: string;
}

/**
 * Toast (DESIGN.md §4: neutral, success, error; wraps on phone). Announced as
 * a status, an error as an alert. It confirms an action; it never carries the
 * only copy of something the user must act on.
 */
export function Toast({ message, tone: t = 'neutral', onDone, durationMs = 4000, testID }: ToastProps) {
  useEffect(() => {
    if (!onDone || t === 'error') return undefined;
    const timer = setTimeout(onDone, durationMs);
    return () => clearTimeout(timer);
  }, [onDone, durationMs, t, message]);
  const c = tone[t];
  return (
    <View
      testID={testID}
      role={t === 'error' ? 'alert' : 'status'}
      accessibilityLiveRegion={t === 'error' ? 'assertive' : 'polite'}
      style={[styles.toast, { backgroundColor: c.bg }]}
    >
      <Text style={[styles.text, { color: c.fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: { borderRadius: radius.md, paddingVertical: space.s12, paddingHorizontal: space.s16, maxWidth: 560, alignSelf: 'center' },
  text: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body },
});
