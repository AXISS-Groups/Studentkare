import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import type { SkIconName } from '../icons';
import { CountdownRing } from '../data/CountdownRing';
import type { TileHue } from '../icons/animated/AnimatedTile';
import { color, focusRing, font, fontWeight, radius, shadow, shadowStyle, size, space } from '../theme';
import { Gradient } from './Gradient';
import { webAttrs } from './M2Parts';
import type { PressState } from './M2Parts';
import { isWide, m2Gutter, useM2Layout } from './m2Layout';
import { NAVY_STOPS } from './servicePalette';
import { GlossTile } from './M2Surfaces';

/**
 * Structure the Tier 1 records boards share (designs approved 24 Oct 2026):
 * - `M2Tabs`: a tab list of pills (the vault's sections) or a segmented pair
 *   (Report insights' Clinician summary / History). Roles and arrow keys as a
 *   tab list; on a phone the pills scroll sideways.
 * - `M2Timeline`: steps or parts down a line (the visit note's four parts, the
 *   pass's "how check-in works"), each with a dot or a gloss tile.
 * - `M2TimerRing`: the check-in pass's countdown with the seconds inside; the
 *   ring is decorative, the seconds are read beside it by the caller.
 * - `M2Table`: a `role="table"` of views at every width (the vault's documents
 *   on a desktop, a prescription's items), never a DOM table.
 * Nothing here animates between ticks: no motion on safety content.
 */

export interface M2Tab<K extends string> { key: K; label: string; testID?: string }

/** Web only: arrow keys move between tabs (WAI-ARIA tab list); native has no keyboard. */
function arrowKeys(move: (delta: number) => void): Record<string, unknown> {
  if (Platform.OS !== 'web') return {};
  return {
    onKeyDown: (event: { key: string; preventDefault: () => void }) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); move(1); }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
    },
  };
}

export function M2Tabs<K extends string>({ label, tabs, current, onChange, segmented = false, testID = 'm2-tabs' }: {
  /** Accessible name of the tab list. */
  label: string;
  tabs: readonly M2Tab<K>[];
  current: K;
  onChange: (key: K) => void;
  /** Two or three equal segments in one pill track, instead of separate pills. */
  segmented?: boolean;
  testID?: string;
}) {
  const layout = useM2Layout();
  const index = tabs.findIndex((tab) => tab.key === current);
  const move = (delta: number) => {
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    if (next) onChange(next.key);
  };
  const items = tabs.map((tab) => {
    const selected = tab.key === current;
    return (
      <Pressable
        key={tab.key}
        role="tab"
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        aria-label={tab.label}
        aria-selected={selected}
        accessibilityState={{ selected }}
        onPress={() => onChange(tab.key)}
        testID={tab.testID ?? `${testID}-${tab.key}`}
        {...webAttrs({ tabIndex: selected ? '0' : '-1' })}
        {...arrowKeys(move)}
        style={({ focused }: PressState) => [segmented ? styles.segment : styles.tab, selected && !segmented ? styles.tabOn : null, focused ? focusRing : null]}
      >
        {selected ? <Gradient colors={NAVY_STOPS} style={StyleSheet.absoluteFill} /> : null}
        <Text style={[styles.tabText, selected ? styles.tabTextOn : null]}>{tab.label}</Text>
      </Pressable>
    );
  });
  const a11y = { role: 'tablist' as const, accessibilityRole: 'tablist' as const, accessibilityLabel: label, 'aria-label': label };
  if (segmented) {
    return <View {...a11y} style={[styles.segmentTrack, isWide(layout) ? styles.segmentTrackWide : null]} testID={testID}>{items}</View>;
  }
  if (layout === 'phone') {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} {...a11y} testID={testID}
        style={styles.tabScroll} contentContainerStyle={[styles.tabRow, { paddingHorizontal: m2Gutter(layout) }]}>
        {items}
      </ScrollView>
    );
  }
  return <View {...a11y} style={[styles.tabRow, styles.tabWrap]} testID={testID}>{items}</View>;
}

export interface M2TimelineItem {
  key: string;
  title: string;
  body?: string;
  /** A gloss tile instead of the dot. */
  icon?: SkIconName;
  hue?: TileHue;
  /** The title as a small uppercase label over the body (the note's four parts). */
  eyebrow?: boolean;
}

/** Items down a vertical line: a dot (or a gloss tile) per item, the last without a connector. */
export function M2Timeline({ items, dotColor = color.serviceSkyInk, style, testID }: { items: readonly M2TimelineItem[]; dotColor?: string; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <View style={[styles.timeline, style]} testID={testID}>
      {items.map((item, i) => {
        const last = i === items.length - 1;
        const tiled = Boolean(item.icon);
        return (
          <View key={item.key} style={[styles.tlItem, last ? null : styles.tlItemGap]} testID={testID ? `${testID}-${item.key}` : undefined}>
            <View style={styles.tlRail}>
              {tiled ? <GlossTile icon={item.icon as SkIconName} hue={item.hue ?? 'indigo'} size={44} iconSize={21} /> : (
                <View style={[styles.tlDot, { backgroundColor: dotColor }]}>
                  <View style={[styles.tlDotHalo, { borderColor: dotColor }]} />
                </View>
              )}
              {last ? null : <View style={[styles.tlLine, tiled ? styles.tlLineTiled : null]} />}
            </View>
            <View style={styles.tlWords}>
              <Text style={item.eyebrow ? [styles.tlEyebrow, { color: dotColor }] : styles.tlTitle}>{item.title}</Text>
              {item.body ? <Text style={styles.tlBody}>{item.body}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** The countdown ring with the seconds written inside it. Decorative: name the seconds beside it. */
export function M2TimerRing({ secondsLeft, totalSeconds, label, size: px = 64, testID }: { secondsLeft: number; totalSeconds: number; label: string; size?: number; testID?: string }) {
  return (
    <View style={[styles.ring, { width: px, height: px }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" {...webAttrs({ 'aria-hidden': 'true' })} testID={testID}>
      <CountdownRing secondsLeft={secondsLeft} totalSeconds={totalSeconds} size={px} stroke={6} />
      <Text style={styles.ringLabel}>{label}</Text>
    </View>
  );
}

export interface M2TableColumn<Row> {
  key: string;
  header: string;
  /** Flex share of the row (default 1). */
  flex?: number;
  /** Fixed width instead of a flex share. */
  width?: number;
  align?: 'left' | 'right';
  cell: (row: Row) => React.ReactNode;
}

/** A table of views: `role="table"` at every width (the Trends table pattern), so one source serves phone, app and desktop. */
export function M2Table<Row>({ caption, columns, rows, rowKey, label, style, testID = 'm2-table' }: {
  /** Visible caption over the rows. */
  caption?: string;
  /** Accessible name (defaults to the caption). */
  label?: string;
  columns: readonly M2TableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const name = label ?? caption;
  const cellStyle = (c: M2TableColumn<Row>): StyleProp<ViewStyle> => [c.width ? { width: c.width } : { flex: c.flex ?? 1, minWidth: 0 }, c.align === 'right' ? styles.right : null];
  const textAlign = (c: M2TableColumn<Row>): StyleProp<TextStyle> => (c.align === 'right' ? styles.textRight : null);
  return (
    <View style={[styles.table, style]} testID={testID}>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      <View role="table" {...webAttrs({ 'aria-label': name })} accessibilityLabel={name} style={styles.tableBody}>
        <View role="row" style={[styles.tr, styles.thead]}>
          {columns.map((c) => <Text key={c.key} role="columnheader" style={[styles.th, cellStyle(c) as StyleProp<TextStyle>, textAlign(c)]}>{c.header}</Text>)}
        </View>
        {rows.map((row) => (
          <View key={rowKey(row)} role="row" style={styles.tr} testID={`${testID}-row-${rowKey(row)}`}>
            {columns.map((c) => <View key={c.key} role="cell" style={cellStyle(c)}>{c.cell(row)}</View>)}
          </View>
        ))}
      </View>
    </View>
  );
}

export const m2TableText = StyleSheet.create({
  cell: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  strong: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  mono: { fontFamily: font.family.mono, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text, fontVariant: ['tabular-nums'] },
});

const styles = StyleSheet.create({
  tabScroll: { marginHorizontal: -space.gutterPhone },
  tabRow: { flexDirection: 'row', gap: space.s8 },
  tabWrap: { flexWrap: 'wrap' },
  tab: { minHeight: 40, paddingHorizontal: space.s16, borderRadius: radius.full, justifyContent: 'center', backgroundColor: color.surface, borderWidth: 1, borderColor: color.rule, overflow: 'hidden' },
  tabOn: { borderColor: color.brandNavy, ...shadowStyle(shadow.hairline) },
  tabText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  tabTextOn: { color: color.onHero, fontWeight: fontWeight(font.weight.heavy) },
  segmentTrack: { flexDirection: 'row', padding: space.s4, borderRadius: radius.full, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  segmentTrackWide: { maxWidth: 420 },
  segment: { flex: 1, minHeight: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  timeline: { gap: 0 },
  tlItem: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s14 },
  tlItemGap: { paddingBottom: space.s16 },
  tlRail: { alignItems: 'center', alignSelf: 'stretch' },
  tlDot: { width: 12, height: 12, borderRadius: radius.full, marginTop: space.s4, alignItems: 'center', justifyContent: 'center' },
  tlDotHalo: { position: 'absolute', width: 20, height: 20, borderRadius: radius.full, borderWidth: 4, opacity: 0.25 },
  tlLine: { flex: 1, width: 2, marginTop: space.s6, backgroundColor: color.rule, borderRadius: radius.full },
  tlLineTiled: { marginTop: space.s4 },
  tlWords: { flex: 1, minWidth: 0, gap: space.s4, paddingTop: space.s2 },
  tlEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase' },
  tlTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  tlBody: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  ring: { alignItems: 'center', justifyContent: 'center' },
  ringLabel: { position: 'absolute', fontFamily: font.family.mono, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text, fontVariant: ['tabular-nums'] },
  table: { gap: space.s8 },
  caption: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  tableBody: { borderRadius: radius.xl, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingVertical: space.s10, paddingHorizontal: space.s4, borderTopWidth: 1, borderTopColor: color.ruleSoft, minHeight: size.touchTarget },
  thead: { borderTopWidth: 0, paddingVertical: space.s6 },
  th: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 0.4, color: color.text3 },
  right: { alignItems: 'flex-end' },
  textRight: { textAlign: 'right' },
});
