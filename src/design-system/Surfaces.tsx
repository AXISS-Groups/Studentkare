import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, fontWeight, radius, shadow, space, webOnly } from './theme';

export type NoteTone = 'info' | 'positive' | 'attention' | 'danger';

const noteTone: Record<NoteTone, { bg: string; fg: string; role: 'none' | 'alert' }> = {
  info: { bg: color.surface3, fg: color.info, role: 'none' },
  positive: { bg: color.positiveBg, fg: color.positive, role: 'none' },
  attention: { bg: color.attentionBg, fg: color.attention, role: 'none' },
  danger: { bg: color.dangerBg, fg: color.danger, role: 'alert' },
};

export interface NoteProps {
  tone?: NoteTone;
  title?: string;
  children: React.ReactNode;
  testID?: string;
}

/**
 * Note / banner (DESIGN.md §4): info, positive, attention, danger. Only
 * `danger` interrupts as an alert. A result outside range is `attention`,
 * never `danger` (DESIGN.md §3).
 */
export function Note({ tone = 'info', title, children, testID }: NoteProps) {
  const t = noteTone[tone];
  return (
    <View
      testID={testID}
      accessibilityRole={t.role === 'alert' ? 'alert' : undefined}
      style={[styles.note, { backgroundColor: t.bg }]}
    >
      {title ? <Text style={[styles.noteTitle, { color: t.fg }]}>{title}</Text> : null}
      <Text style={[styles.noteBody, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

export interface CardProps {
  children: React.ReactNode;
  /** Selected cards sit on `surface-3` with an action border. */
  selected?: boolean;
  testID?: string;
}

/** Card (DESIGN.md §4): default and selected. Interaction belongs to what's inside it. */
export function Card({ children, selected = false, testID }: CardProps) {
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        selected ? { backgroundColor: color.surface3, borderColor: color.action } : null,
      ]}
    >
      {children}
    </View>
  );
}

/** Eyebrow section header: caption, weight 800, 1 px letter-spacing, uppercase (DESIGN.md §3). */
export function Eyebrow({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" style={styles.eyebrow}>
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  note: {
    borderRadius: radius.md,
    paddingVertical: space.s12,
    paddingHorizontal: space.s14,
    gap: space.s4,
  },
  noteTitle: {
    fontFamily: font.family.sans,
    fontSize: font.size.bodySm,
    fontWeight: fontWeight(font.weight.heavy),
  },
  noteBody: {
    fontFamily: font.family.sans,
    fontSize: font.size.bodySm,
    lineHeight: font.size.bodySm * font.lineHeight.body,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.ruleSoft,
    padding: space.s20,
    gap: space.s12,
    ...webOnly({ boxShadow: shadow.card }),
  },
  eyebrow: {
    fontFamily: font.family.sans,
    fontSize: font.size.caption,
    fontWeight: fontWeight(font.weight.heavy),
    letterSpacing: 1,
    color: color.text3,
  },
});
