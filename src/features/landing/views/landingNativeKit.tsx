import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { skTokens } from '@/theme/tokens/generated/skTokens';
import { kindLabel, rupees } from '../viewmodel/LandingViewModel';
import type { LandingCatalogItem, LandingViewModel } from '../viewmodel/LandingViewModel';

/**
 * Building blocks shared by the five native landing pages. They live with the
 * feature, not in src/components, because nothing outside the public site uses
 * them yet (DESIGN.md §4: promote when a second feature needs one).
 *
 * Every colour, size and space comes from skTokens. Light palette only: dark
 * mode is undecided for launch (DESIGN.md D3).
 */

/**
 * Where a landing page can send someone. Every destination is optional: a
 * platform passes only the screens it has built, and a link without a handler
 * is not drawn — never a button that goes nowhere.
 */
export interface LandingDestinations {
  students?: () => void;
  campuses?: () => void;
  clinicians?: () => void;
  labTests?: () => void;
  consult?: () => void;
  partnerships?: () => void;
  programs?: () => void;
  plans?: () => void;
  wellness?: () => void;
  signUp?: () => void;
  signIn?: () => void;
  lostPhone?: () => void;
  verify?: () => void;
  guardianConsent?: () => void;
  shop?: () => void;
  vaccines?: () => void;
  privacy?: () => void;
  terms?: () => void;
}

export const color = skTokens.color.light;
const { size, weight, lineHeight } = skTokens.font;
const { space, radius } = skTokens;

/** React Native takes font weights as strings. */
function fontWeight(value: (typeof weight)[keyof typeof weight]): '500' | '700' | '800' {
  return value === 500 ? '500' : value === 700 ? '700' : '800';
}

export function Page({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.column}>{children}</View>
    </ScrollView>
  );
}

export function Hero({ eyebrow, title, lede, children }: { eyebrow: string; title: string; lede: string; children?: React.ReactNode }) {
  return (
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.display} accessibilityRole="header">{title}</Text>
      <Text style={styles.lede}>{lede}</Text>
      {children}
    </View>
  );
}

export function Actions({ children }: { children: React.ReactNode }) {
  return <View style={styles.actions}>{children}</View>;
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading} accessibilityRole="header">{title}</Text>
      {children}
    </View>
  );
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

export function Meta({ children }: { children: React.ReactNode }) {
  return <Text style={styles.meta}>{children}</Text>;
}

export function PromiseCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

/** A tagged list of what is and is not reachable — "Can see", "Not for sale". */
export function BoundaryList({ items }: { items: ReadonlyArray<{ tag: string; body: string }> }) {
  return (
    <View style={styles.boundary}>
      {items.map((item, index) => (
        <View key={index} style={[styles.boundaryItem, index > 0 && styles.boundaryDivider]}>
          <Text style={styles.tag}>{item.tag.toUpperCase()}</Text>
          <Text style={styles.body}>{item.body}</Text>
        </View>
      ))}
    </View>
  );
}

/** States, in the page itself, something the design promises that is not built. */
export function GapNote({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.gap} accessibilityRole="summary">
      <Text style={styles.gapTitle}>{title}</Text>
      {children}
    </View>
  );
}

const HELPLINES = [
  { number: '112', label: 'Emergency' },
  { number: '108', label: 'Ambulance' },
  { number: '14416', label: 'Tele-MANAS, mental health, 24×7' },
] as const;

/** Never behind a loading, error or login state. */
export function EmergencyCard({ onCall }: { onCall: (number: string) => void }) {
  return (
    <View style={styles.emergency} accessibilityRole="summary" accessibilityLabel="Emergency helplines">
      <Text style={styles.emergencyTitle} accessibilityRole="header">In an emergency, call 112.</Text>
      <Text style={styles.emergencyBody}>No account, no login, no waiting for this page.</Text>
      <View style={styles.helplines}>
        {HELPLINES.map(line => (
          <TouchableOpacity
            key={line.number}
            style={styles.callButton}
            accessibilityRole="button"
            accessibilityLabel={`Call ${line.number}, ${line.label}`}
            onPress={() => onCall(line.number)}
          >
            <Text style={styles.callNumber}>Call {line.number}</Text>
            <Text style={styles.callLabel}>{line.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/**
 * Real rows from the public /catalog, in all four states. Nothing is drawn in
 * place of a price that did not load.
 */
export const CatalogSection = observer(({ viewModel, title, emptyText, onShop }: {
  viewModel: LandingViewModel;
  title: string;
  emptyText: string;
  onShop?: () => void;
}) => {
  switch (viewModel.status) {
    case 'loading':
      return (
        <View style={styles.section} accessibilityLabel="Loading published prices" accessibilityLiveRegion="polite">
          <Text style={styles.heading} accessibilityRole="header">{title}</Text>
          <ActivityIndicator color={color.action} accessibilityLabel="Loading" />
          {[0, 1, 2].map(key => <View key={key} style={styles.skeleton} />)}
        </View>
      );
    case 'error':
      return (
        <Section title={title}>
          <View style={styles.note} accessibilityLiveRegion="polite">
            <Text style={styles.cardTitle}>Prices could not be loaded.</Text>
            <Paragraph>
              This is a connection or server problem, not something you did. Nothing is shown rather than a
              price we cannot confirm.
            </Paragraph>
            <Meta>{viewModel.error}</Meta>
            <SecondaryAction title="Try again" onPress={() => void viewModel.load()} />
          </View>
        </Section>
      );
    case 'empty':
      return (
        <Section title={title}>
          <View style={styles.note}>
            <Paragraph>{emptyText}</Paragraph>
            {onShop ? <SecondaryAction title="Browse care and medicines" onPress={onShop} /> : null}
          </View>
        </Section>
      );
    case 'ready':
      return (
        <Section title={title}>
          {viewModel.items.map(item => <CatalogRow key={item.id} item={item} />)}
          {onShop ? <SecondaryAction title="See everything" onPress={onShop} /> : null}
        </Section>
      );
  }
});

function CatalogRow({ item }: { item: LandingCatalogItem }) {
  const meta = [item.brand, item.pack].filter(Boolean).join(' · ');
  const discounted = item.mrpPaise > item.pricePaise;
  const spoken = `${kindLabel(item.kind)}. ${item.name}. ${rupees(item.pricePaise)}${discounted ? `, was ${rupees(item.mrpPaise)}` : ''}.`;
  return (
    <View style={styles.card} accessible accessibilityLabel={spoken}>
      <Text style={styles.tag}>{kindLabel(item.kind).toUpperCase()}</Text>
      <Text style={styles.cardTitle}>{item.name}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      <View style={styles.priceRow}>
        <Text style={styles.price}>{rupees(item.pricePaise)}</Text>
        {discounted ? <Text style={styles.mrp}>{rupees(item.mrpPaise)}</Text> : null}
      </View>
    </View>
  );
}

export function PrimaryAction({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.primary, disabled && styles.primaryDisabled]}
      accessibilityRole="button"
      accessibilityLabel={title}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={[styles.primaryText, disabled && styles.primaryTextDisabled]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function SecondaryAction({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.secondary} accessibilityRole="button" accessibilityLabel={title} onPress={onPress}>
      <Text style={styles.secondaryText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function Footer({ note, links }: { note: string; links: ReadonlyArray<{ title: string; onPress?: () => void }> }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.body}>{note}</Text>
      <View style={styles.footerLinks} accessibilityRole="toolbar" accessibilityLabel="Studentkare">
        {links.map(link => {
          const onPress = link.onPress;
          return onPress ? (
            <TouchableOpacity key={link.title} style={styles.footerLink} accessibilityRole="link" accessibilityLabel={link.title} onPress={onPress}>
              <Text style={styles.footerLinkText}>{link.title}</Text>
            </TouchableOpacity>
          ) : null;
        })}
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingHorizontal: space.gutterPhone, paddingVertical: space.s24 },
  column: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: space.s32 },

  hero: { gap: space.s12 },
  eyebrow: { fontSize: size.caption, fontWeight: fontWeight(weight.heavy), letterSpacing: 1, color: color.action },
  display: { fontSize: size.display, lineHeight: size.display * lineHeight.tight, fontWeight: fontWeight(weight.heavy), color: color.text },
  lede: { fontSize: size.body, lineHeight: size.body * lineHeight.body, fontWeight: fontWeight(weight.regular), color: color.text2 },
  actions: { gap: space.s10, marginTop: space.s8 },
  meta: { fontSize: size.caption, lineHeight: size.caption * lineHeight.body, color: color.text3 },

  primary: {
    minHeight: skTokens.size.controlLg, borderRadius: radius.lg, backgroundColor: color.action,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.s20,
  },
  primaryDisabled: { backgroundColor: color.actionSoft },
  primaryText: { fontSize: size.body, fontWeight: fontWeight(weight.heavy), color: color.onAction },
  primaryTextDisabled: { color: color.text2 },
  secondary: {
    minHeight: skTokens.size.control, borderRadius: radius.lg, borderWidth: 1, borderColor: color.rule,
    backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.s20,
  },
  secondaryText: { fontSize: size.body, fontWeight: fontWeight(weight.heavy), color: color.action },

  emergency: { backgroundColor: color.dangerBg, borderRadius: radius.xl, padding: space.s20, gap: space.s8 },
  emergencyTitle: { fontSize: size.title, fontWeight: fontWeight(weight.heavy), color: color.danger },
  emergencyBody: { fontSize: size.bodySm, lineHeight: size.bodySm * lineHeight.body, color: color.text },
  helplines: { gap: space.s8, marginTop: space.s4 },
  callButton: {
    minHeight: skTokens.size.control, borderRadius: radius.lg, backgroundColor: color.danger,
    paddingHorizontal: space.s16, paddingVertical: space.s8, justifyContent: 'center',
  },
  callNumber: { fontSize: size.body, fontWeight: fontWeight(weight.heavy), color: color.onAction },
  callLabel: { fontSize: size.caption, color: color.onAction },

  section: { gap: space.s12 },
  heading: { fontSize: size.heading, lineHeight: size.heading * lineHeight.tight, fontWeight: fontWeight(weight.heavy), color: color.text },
  card: { backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, padding: space.s16, gap: space.s6 },
  cardTitle: { fontSize: size.titleSm, fontWeight: fontWeight(weight.strong), color: color.text },
  body: { fontSize: size.bodySm, lineHeight: size.bodySm * lineHeight.body, color: color.text2 },
  note: { backgroundColor: color.surface3, borderRadius: radius.md, padding: space.s16, gap: space.s8 },
  skeleton: { height: 96, borderRadius: radius.xl, backgroundColor: color.surface2 },

  boundary: { backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, paddingHorizontal: space.s16 },
  boundaryItem: { paddingVertical: space.s14, gap: space.s4 },
  boundaryDivider: { borderTopWidth: 1, borderTopColor: color.ruleSoft },
  tag: { fontSize: size.caption, fontWeight: fontWeight(weight.heavy), letterSpacing: 1, color: color.text3 },

  gap: { backgroundColor: color.attentionBg, borderRadius: radius.md, padding: space.s16, gap: space.s8 },
  gapTitle: { fontSize: size.titleSm, fontWeight: fontWeight(weight.strong), color: color.attention },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.s8 },
  price: { fontSize: size.title, fontWeight: fontWeight(weight.heavy), color: color.text },
  mrp: { fontSize: size.bodySm, color: color.text3, textDecorationLine: 'line-through' },

  footer: { gap: space.s16, paddingTop: space.s16, borderTopWidth: 1, borderTopColor: color.rule },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  footerLink: { minHeight: skTokens.size.touchTarget, minWidth: skTokens.size.touchTarget, justifyContent: 'center', paddingHorizontal: space.s8 },
  footerLinkText: { fontSize: size.bodySm, fontWeight: fontWeight(weight.strong), color: color.action },

  // Form controls (partnerships).
  field: { gap: space.s6 },
  label: { fontSize: size.bodySm, fontWeight: fontWeight(weight.strong), color: color.text },
  input: {
    minHeight: skTokens.size.control, borderRadius: radius.lg, borderWidth: 1, borderColor: color.ruleStrong,
    backgroundColor: color.surface, paddingHorizontal: space.s14, fontSize: size.body, color: color.text,
  },
  inputMultiline: { minHeight: skTokens.size.control * 2, paddingVertical: space.s12, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  chip: {
    minHeight: skTokens.size.touchTarget, borderRadius: radius.sm, borderWidth: 1, borderColor: color.rule,
    backgroundColor: color.surface, paddingHorizontal: space.s14, justifyContent: 'center',
  },
  chipSelected: { backgroundColor: color.action, borderColor: color.action },
  chipText: { fontSize: size.bodySm, fontWeight: fontWeight(weight.strong), color: color.text },
  chipTextSelected: { color: color.onAction },
  consent: { flexDirection: 'row', gap: space.s12, alignItems: 'flex-start', minHeight: skTokens.size.touchTarget, paddingVertical: space.s8 },
  box: {
    width: 24, height: 24, borderRadius: radius.sm / 2, borderWidth: 2, borderColor: color.ruleStrong,
    backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center',
  },
  boxChecked: { backgroundColor: color.action, borderColor: color.action },
  boxMark: { fontSize: size.bodySm, fontWeight: fontWeight(weight.heavy), color: color.onAction },
  consentText: { flex: 1, fontSize: size.bodySm, lineHeight: size.bodySm * lineHeight.body, color: color.text },
  formError: { backgroundColor: color.dangerBg, borderRadius: radius.md, padding: space.s12 },
  formErrorText: { fontSize: size.bodySm, color: color.danger },
  sent: { backgroundColor: color.positiveBg, borderRadius: radius.md, padding: space.s16, gap: space.s8 },
  sentTitle: { fontSize: size.titleSm, fontWeight: fontWeight(weight.strong), color: color.positive },
});
