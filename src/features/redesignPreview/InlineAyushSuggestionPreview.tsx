import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional preview — 2026-11-11 gap-analysis pass, round 4
 * (follow-up video re-watch, same batch as `PaymentFailureScreenPreview.tsx`
 * and `PhysiotherapyAtHomeLandingPreview.tsx` built alongside it; see
 * `NOTES.md`). Reference-app feeds surface a short AI suggestion inline
 * between ordinary content cards — a single observation plus a way to ask
 * more — rather than only inside a dedicated full-screen chat. This repo
 * has `M2AskAyushPreview.tsx` (the full chat screen) and
 * `AskAyushOrderCardPreview.tsx` (an order-summary card embedded INSIDE
 * that chat), but nothing shows what an Ayush suggestion looks like
 * embedded in a content feed, outside the chat screen entirely. This
 * preview demonstrates that one new placement, surrounded by two
 * ordinary feed cards for context — it is a SEPARATE additional preview,
 * not an edit to either existing Ayush screen, and does not replace or
 * wire into them.
 *
 * Carries the same guardrail those two screens already state as written
 * content, not just decoration: the card ends by routing to a doctor,
 * never giving its own clinical verdict, and is labelled as a pattern
 * observation rather than a diagnosis. Letting Ayush surface itself
 * unprompted inside a feed (rather than only responding to a typed
 * question) is more than a visual tweak — it is a product decision about
 * when an AI assistant may proactively interrupt a student with health
 * content, under what consent and how often. This preview does not
 * answer that; it only shows the card's shape. Not wired to navigation,
 * any feed, or Ask Ayush's real logic. Every reading, phrase and CTA is
 * bracketed placeholder copy; "Ask a follow-up" and "Dismiss" are `noop`.
 *
 * Built only from approved pieces: `GlossTile`, `M2Card`, `M2Note`,
 * `m2Text` from `@/design-system/m2`; `Icon` from `@/design-system/icons`,
 * limited to `sparkle` (assistant marker, distinct from a real brand
 * mark), `arrow-right` and `x` — all confirmed in
 * `design/icons/icon-manifest.json` before use. Tokens only.
 */
export function InlineAyushSuggestionPreview(): React.ReactElement {
  return (
    <View style={styles.screen} testID="preview-inline-ayush-suggestion">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>[Home]</Text>
      </View>

      <View style={styles.scroll}>
        <View style={styles.body}>
          <M2Card testID="preview-inline-ayush-feed-card-before">
            <Text style={m2Text.eyebrow}>[UPCOMING]</Text>
            <Text style={m2Text.body}>[Health camp at Block C — this Friday, 10 AM]</Text>
          </M2Card>

          {/* The new pattern: an Ayush suggestion sitting inline in the feed, not inside a chat. */}
          <M2Card style={styles.suggestionCard} testID="preview-inline-ayush-suggestion-card">
            <View style={styles.suggestionHeader}>
              <GlossTile icon="sparkle" hue="indigo" size={34} iconSize={17} />
              <View style={styles.suggestionHeaderWords}>
                <Text style={m2Text.eyebrow}>[ASK AYUSH · OBSERVATION]</Text>
                <Text style={styles.suggestionTitle}>[A pattern in your last 3 readings]</Text>
              </View>
              <Pressable
                role="button"
                accessibilityRole="button"
                accessibilityLabel="[Dismiss]"
                onPress={noop}
                style={({ focused }: PressState) => [styles.dismissBtn, focused ? focusRing : null]}
              >
                <Icon name="x" size={14} color={color.text3} />
              </Pressable>
            </View>

            <Text style={styles.suggestionBody}>
              [Your resting heart rate has run a little higher the last 3 mornings. This isn't a diagnosis — a doctor can tell you whether it's worth a closer look.]
            </Text>

            <Pressable
              role="button"
              accessibilityRole="button"
              accessibilityLabel="[Ask a follow-up]"
              onPress={noop}
              style={({ focused }: PressState) => [styles.followUpBtn, focused ? focusRing : null]}
            >
              <Text style={styles.followUpText}>[Ask a follow-up]</Text>
              <Icon name="arrow-right" size={14} color={color.action} />
            </Pressable>
          </M2Card>

          <M2Card testID="preview-inline-ayush-feed-card-after">
            <Text style={m2Text.eyebrow}>[REMINDER]</Text>
            <Text style={m2Text.body}>[Refill your Vitamin D3 strip — 4 tablets left]</Text>
          </M2Card>

          <M2Note tone="info" icon="message-circle" title="What this card can't do yet">
            This preview only shows the shape of an Ayush suggestion embedded in a feed. When and how often Ayush may surface one unprompted is a decision still to be made.
          </M2Note>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { paddingHorizontal: space.gutterPhone, paddingVertical: space.s12, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  headerTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s12 },
  suggestionCard: { gap: space.s10, borderWidth: 1, borderColor: color.actionSoft },
  suggestionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s8 },
  suggestionHeaderWords: { flex: 1, gap: space.s2 },
  suggestionTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  dismissBtn: { width: 24, height: 24, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  suggestionBody: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  followUpBtn: { flexDirection: 'row', alignItems: 'center', gap: space.s6, alignSelf: 'flex-start' },
  followUpText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.heavy), color: color.action },
});
