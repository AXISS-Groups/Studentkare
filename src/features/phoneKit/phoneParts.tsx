import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, size, space, webOnly } from '@/design-system/theme';

/**
 * Small pieces the phone boards of design page 2 share (discover, search,
 * shop, checkout, orders): the round back button, the search field, the icon
 * tile, status tags, the underline tabs and the sheet choice row. React Native
 * primitives, so web (react-native-web) and Expo draw the same thing.
 */

type Pressed = { pressed: boolean; focused?: boolean };

/**
 * A heading whose colour is its own (on the navy bands). On the web the
 * heading role is carried by a wrapper, because the app's global heading rule
 * (`.wf-application :is(h1…h4) { color: ink }`) would otherwise repaint the
 * text ink on navy; the text inside keeps the token colour it is given.
 */
export function Heading({ children, style, numberOfLines, testID }: { children: React.ReactNode; style: React.ComponentProps<typeof Text>['style']; numberOfLines?: number; testID?: string }) {
  return (
    <View accessibilityRole="header" testID={testID}>
      <Text numberOfLines={numberOfLines} style={style}>{children}</Text>
    </View>
  );
}

/** Tile and tag colours by role. Status colours keep their meaning (DESIGN.md §3). */
export type Tone = 'action' | 'positive' | 'attention' | 'danger' | 'neutral';

export const TONE: Record<Tone, { bg: string; ink: string }> = {
  action: { bg: color.surface3, ink: color.action },
  positive: { bg: color.positiveBg, ink: color.positive },
  attention: { bg: color.attentionBg, ink: color.attention },
  danger: { bg: color.dangerBg, ink: color.danger },
  neutral: { bg: color.neutralBg, ink: color.text2 },
};

export function BackButton({ label, onPress, onHero = false, testID = 'board-back' }: { label: string; onPress: () => void; onHero?: boolean; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      role="button"
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-label={label}
      onPress={onPress}
      style={({ focused }: Pressed) => [styles.round, onHero ? styles.roundOnHero : null, focused ? focusRing : null]}
    >
      <Icon name="arrow-left" size={size.navIcon} color={onHero ? color.onHero : color.text} />
    </Pressable>
  );
}

/** A round icon button (the bag in the shop header, the phone on a tracking card). */
export function RoundIconButton({ icon, label, onPress, badge, tone = 'surface', testID }: {
  icon: SkIconName; label: string; onPress: () => void; badge?: number; tone?: 'surface' | 'hero' | 'action'; testID?: string;
}) {
  const ink = tone === 'hero' ? color.onHero : tone === 'action' ? color.onAction : color.action;
  return (
    <Pressable
      testID={testID}
      role="button"
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-label={label}
      onPress={onPress}
      style={({ focused }: Pressed) => [
        styles.round,
        tone === 'hero' ? styles.roundOnHero : tone === 'action' ? styles.roundAction : null,
        focused ? focusRing : null,
      ]}
    >
      <Icon name={icon} size={size.navIcon} color={ink} />
      {badge ? (
        <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export interface SearchFieldProps {
  value: string;
  onChangeText?: (value: string) => void;
  onSubmit?: () => void;
  /** Tapping opens search elsewhere (Discover, shop header): the field is a button, not an input. */
  onPress?: () => void;
  placeholder: string;
  label: string;
  /** "Clear search" — drawn as the x when there is text. */
  clearLabel?: string;
  onClear?: () => void;
  /** The microphone, shown as unavailable: voice search is not connected. */
  mic?: { label: string };
  focused?: boolean;
  autoFocus?: boolean;
  onHero?: boolean;
  testID?: string;
}

/** The board's search field: search-2 on the left, x to clear, the microphone on the right. */
export function SearchField({ value, onChangeText, onSubmit, onPress, placeholder, label, clearLabel, onClear, mic, focused = false, autoFocus = false, onHero = false, testID = 'search-field' }: SearchFieldProps) {
  // The box shows the input's focus (the input's own outline is off, so there is one ring, on the box).
  const [inputFocused, setInputFocused] = useState(false);
  const body = (
    <>
      <Icon name="search-2" size={18} color={focused ? color.action : color.text3} />
      {onPress ? (
        <Text numberOfLines={1} style={[styles.searchText, value ? null : styles.searchPlaceholder]}>{value || placeholder}</Text>
      ) : (
        <TextInput
          testID={`${testID}-input`}
          accessibilityLabel={label}
          aria-label={label}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={color.text3}
          returnKeyType="search"
          autoFocus={autoFocus}
          autoCorrect={false}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          style={[styles.searchInput, webOnly({ outlineStyle: 'none' as const })]}
        />
      )}
      {value && onClear && clearLabel ? (
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={clearLabel} aria-label={clearLabel} onPress={onClear}
          testID={`${testID}-clear`} style={({ focused: f }: Pressed) => [styles.inlineButton, f ? focusRing : null]}>
          <Icon name="x" size={16} color={color.text3} />
        </Pressable>
      ) : null}
      {mic ? (
        <View role="img" accessibilityLabel={mic.label} aria-label={mic.label} style={styles.inlineButton} testID={`${testID}-mic`}>
          <Icon name="mic" size={18} color={color.text3} />
        </View>
      ) : null}
    </>
  );
  const box = [styles.search, onHero ? styles.searchOnHero : null, focused || inputFocused ? styles.searchFocused : null];
  if (onPress) {
    return (
      <Pressable testID={testID} accessibilityRole="search" accessibilityLabel={label} aria-label={label} onPress={onPress}
        style={({ focused: f }: Pressed) => [...box, f ? focusRing : null]}>
        {body}
      </Pressable>
    );
  }
  return <View testID={testID} accessibilityRole="search" style={box}>{body}</View>;
}

/** The rounded square holding an icon (search rows, category cards, order cards). */
export function IconTile({ icon, tone = 'action', size: tileSize = 40, iconSize = 18, solid = false }: {
  icon: SkIconName; tone?: Tone; size?: number; iconSize?: number; solid?: boolean;
}) {
  const t = TONE[tone];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { width: tileSize, height: tileSize, backgroundColor: solid ? color.action : t.bg }]}
    >
      <Icon name={icon} size={iconSize} color={solid ? color.onAction : t.ink} />
    </View>
  );
}

/** A small status tag ("In stock", "Live", "NABL"). */
export function Tag({ label, tone = 'action', dot = false, testID }: { label: string; tone?: Tone; dot?: boolean; testID?: string }) {
  const t = TONE[tone];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }]} testID={testID}>
      {dot ? <View style={[styles.dot, { backgroundColor: t.ink }]} /> : null}
      <Text style={[styles.tagText, { color: t.ink }]}>{label}</Text>
    </View>
  );
}

/** Section label in caps, with an optional text action on the right ("Clear all", "See all 51"). */
export function SectionHead({ title, action, meta }: { title: string; action?: { label: string; onPress: () => void }; meta?: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text accessibilityRole="header" style={styles.eyebrow}>{title}</Text>
      {action ? (
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={action.label} onPress={action.onPress}
          style={({ focused }: Pressed) => [styles.textAction, focused ? focusRing : null]}>
          <Text style={styles.textActionLabel}>{action.label}</Text>
        </Pressable>
      ) : meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
    </View>
  );
}

export interface UnderlineTab<K extends string> { key: K; label: string }

/** The board's underline tabs (All · Medicines · Lab tests · Doctors). */
export function UnderlineTabs<K extends string>({ label, tabs, selected, onSelect }: {
  label: string; tabs: readonly UnderlineTab<K>[]; selected: K; onSelect: (key: K) => void;
}) {
  return (
    <View role="tablist" accessibilityRole="tablist" accessibilityLabel={label} aria-label={label} style={styles.tabs}>
      {tabs.map((tab) => {
        const on = tab.key === selected;
        return (
          <Pressable
            key={tab.key}
            testID={`tab-${tab.key}`}
            role="tab"
            aria-selected={on}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tab.label}
            onPress={() => onSelect(tab.key)}
            style={({ focused }: Pressed) => [styles.tab, focused ? focusRing : null]}
          >
            <Text numberOfLines={1} style={[styles.tabText, on ? styles.tabTextOn : null]}>{tab.label}</Text>
            <View style={[styles.tabLine, on ? styles.tabLineOn : null]} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Pill tabs on a light or navy band (Popular · Price … / All · Active …). */
export function PillTabs<K extends string>({ label, tabs, selected, onSelect, onHero = false }: {
  label: string; tabs: readonly UnderlineTab<K>[]; selected: K; onSelect: (key: K) => void; onHero?: boolean;
}) {
  return (
    <View role="tablist" accessibilityRole="tablist" accessibilityLabel={label} aria-label={label} style={styles.pills}>
      {tabs.map((tab) => {
        const on = tab.key === selected;
        return (
          <Pressable
            key={tab.key}
            testID={`pill-${tab.key}`}
            role="tab"
            aria-selected={on}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tab.label}
            onPress={() => onSelect(tab.key)}
            style={({ focused }: Pressed) => [
              styles.pill,
              onHero ? (on ? styles.pillHeroOn : styles.pillHero) : (on ? styles.pillOn : styles.pillOff),
              focused ? focusRing : null,
            ]}
          >
            <Text numberOfLines={1} style={[
              styles.pillText,
              onHero ? (on ? styles.pillTextHeroOn : styles.pillTextHero) : (on ? styles.pillTextOn : null),
            ]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A one-of choice inside a sheet: radio, label, meta and an optional tag (board sheets). */
export function ChoiceRow({ label, meta, tag, selected, onPress, testID }: {
  label: string; meta?: string; tag?: string; selected: boolean; onPress: () => void; testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      role="radio"
      aria-checked={selected}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={meta ? `${label}, ${meta}` : label}
      onPress={onPress}
      style={({ focused }: Pressed) => [styles.choice, selected ? styles.choiceOn : null, focused ? focusRing : null]}
    >
      <View style={[styles.radio, selected ? styles.radioOn : null]} />
      <View style={styles.choiceWords}>
        <Text style={styles.choiceLabel}>{label}</Text>
        {meta ? <Text style={styles.choiceMeta}>{meta}</Text> : null}
      </View>
      {tag ? <Tag label={tag} tone="positive" /> : null}
    </Pressable>
  );
}

/** The line at the foot of a commerce board: nothing here comes from the health record (Rule L). */
export function FirewallNote({ text, icon = 'shield-2' }: { text: string; icon?: SkIconName }) {
  return (
    <View style={styles.firewall}>
      <Icon name={icon} size={14} color={color.text3} />
      <Text style={styles.firewallText}>{text}</Text>
    </View>
  );
}

export const phoneText = StyleSheet.create({
  heading: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  display: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  title: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  price: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  mrp: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.text3, textDecorationLine: 'line-through' },
  off: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  mono: { fontFamily: font.family.mono, fontSize: font.size.caption, color: color.text3 },
  link: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
});

export const phoneLayout = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingHorizontal: space.gutterPhone, paddingTop: space.s16, paddingBottom: space.s32, gap: space.s16 },
  card: { backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, padding: space.s14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  grow: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
});

const styles = StyleSheet.create({
  round: {
    width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center',
    backgroundColor: color.surface2, flexShrink: 0,
  },
  roundOnHero: { backgroundColor: color.onHeroVeil },
  roundAction: { backgroundColor: color.action },
  badge: {
    position: 'absolute', top: -space.s4, right: -space.s4, minWidth: space.s20, height: space.s20, borderRadius: radius.full,
    paddingHorizontal: space.s4, alignItems: 'center', justifyContent: 'center', backgroundColor: color.positiveBg,
  },
  badgeText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  search: {
    flexGrow: 1, flexShrink: 1, minWidth: 0, minHeight: size.control, flexDirection: 'row', alignItems: 'center', gap: space.s10,
    paddingHorizontal: space.s14, borderRadius: radius.xl, backgroundColor: color.surface2, borderWidth: 1.5, borderColor: color.surface2,
  },
  searchFocused: { backgroundColor: color.surface, borderColor: color.action },
  searchOnHero: { backgroundColor: color.surface, borderColor: color.surface },
  searchText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
  searchPlaceholder: { fontWeight: fontWeight(font.weight.regular), color: color.text3 },
  searchInput: {
    flex: 1, minWidth: 0, minHeight: size.touchTarget, fontFamily: font.family.sans, fontSize: font.size.body,
    fontWeight: fontWeight(font.weight.strong), color: color.text, paddingVertical: 0,
  },
  inlineButton: { width: size.touchTarget, height: size.touchTarget, alignItems: 'center', justifyContent: 'center', marginRight: -space.s12 },
  tile: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: space.s4, alignSelf: 'flex-start', paddingHorizontal: space.s8, paddingVertical: space.s2, borderRadius: radius.full },
  tagText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  dot: { width: space.s6, height: space.s6, borderRadius: radius.full },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s12 },
  eyebrow: {
    fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1,
    textTransform: 'uppercase', color: color.text2,
  },
  sectionMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  textAction: { minHeight: size.touchTarget, justifyContent: 'center' },
  textActionLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  tab: { flex: 1, minHeight: size.touchTarget, alignItems: 'center', justifyContent: 'flex-end', gap: space.s8, paddingTop: space.s8 },
  tabText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  tabTextOn: { fontWeight: fontWeight(font.weight.heavy), color: color.action },
  tabLine: { height: 3, alignSelf: 'stretch', borderRadius: radius.full, backgroundColor: 'transparent' },
  tabLineOn: { backgroundColor: color.action },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  pill: { minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: color.action },
  pillOff: { backgroundColor: color.surface2 },
  pillHero: { backgroundColor: color.onHeroVeil },
  pillHeroOn: { backgroundColor: color.heroCurrent },
  pillText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  pillTextOn: { fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  pillTextHero: { color: color.onHero },
  pillTextHeroOn: { fontWeight: fontWeight(font.weight.heavy), color: color.onHeroCurrent },
  choice: {
    minHeight: size.control + space.s12, flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s14,
    borderRadius: radius.xl, borderWidth: 1, borderColor: color.rule, backgroundColor: color.surface,
  },
  choiceOn: { borderColor: color.selectedRule, borderWidth: 1.5 },
  radio: { width: space.s20 + space.s2, height: space.s20 + space.s2, borderRadius: radius.full, borderWidth: 1.5, borderColor: color.ruleStrong },
  radioOn: { borderWidth: space.s6, borderColor: color.action },
  choiceWords: { flex: 1, gap: space.s2 },
  choiceLabel: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  choiceMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2 },
  firewall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s6, paddingVertical: space.s8 },
  firewallText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3, textAlign: 'center', flexShrink: 1 },
});
