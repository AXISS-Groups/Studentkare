import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of M2WhatsNew. Krishna asked
 * to extend the canvas's style past the 12 already built. Content from
 * design/screens/briefs/M2WhatsNew.md (Tier 3, editorial only — Rule L:
 * nothing about the student is read or shown). Not wired, not replacing
 * the real screen. See NOTES.md.
 */
export function M2WhatsNewPreview(): React.ReactElement {
  return (
    <View style={styles.screen} testID="preview-m2-whats-new">
      <View style={styles.header}>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel="Back" onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
          <Icon name="arrow-left" size={20} color={color.text} />
        </Pressable>
        <Text style={styles.title}>What's new</Text>
      </View>
      <View style={styles.scroll}>
        <View style={styles.body}>
          {[
            { title: 'Compare lab packages side by side', summary: 'See price, tests and fasting rules before you book.', read: '2 min read' },
            { title: 'Ask Ayush about your reports', summary: "Ayush answers questions about what's in your record.", read: '1 min read' },
          ].map((post) => (
            <Pressable key={post.title} role="link" accessibilityRole="link" accessibilityLabel={post.title} onPress={noop} style={({ focused }: PressState) => [styles.card, focused ? focusRing : null]}>
              <View style={styles.cover}>
                <Icon name="sparkles" size={20} color={color.onHero} />
              </View>
              <Text style={styles.cardTitle}>{post.title}</Text>
              <Text style={m2Text.meta}>{post.summary}</Text>
              <Text style={styles.cardMeta}>5 Nov 2026 · {post.read}</Text>
            </Pressable>
          ))}

          <Pressable role="link" accessibilityRole="link" accessibilityLabel="All StudentKare news" onPress={noop} style={({ focused }: PressState) => [styles.allRow, focused ? focusRing : null]}>
            <Icon name="megaphone" size={18} color={color.action} />
            <Text style={styles.allText}>All StudentKare news</Text>
            <Icon name="chevron-right" size={16} color={color.text3} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.gutterPhone },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  scroll: { flex: 1 },
  body: { paddingHorizontal: space.gutterPhone, gap: space.s16 },
  card: { backgroundColor: color.surface, borderRadius: radius.lg, padding: space.s14, gap: space.s6 },
  cover: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: color.text, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginTop: space.s4 },
  cardMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3, marginTop: space.s2 },
  allRow: { flexDirection: 'row', alignItems: 'center', gap: space.s10, padding: space.s14, borderRadius: radius.lg, backgroundColor: color.surface2 },
  allText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
});
