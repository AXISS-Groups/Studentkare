import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import type { CheckState, IdentityCheck, IdentityCheckId } from '../viewmodel/IdentityVerifyViewModel';

/** Row icons from the briefs (VerifyIdentity, VerifyGate): user-2, mail, id-card, shield. */
export const CHECK_ICON: Record<IdentityCheckId, SkIconName> = {
  photo: 'user-2', email: 'mail', campus: 'id-card', gov: 'shield',
};

export const CHECK_TITLE: Record<IdentityCheckId, MessageKey> = {
  photo: 'ident.check.photo', email: 'ident.check.email', campus: 'ident.check.campus', gov: 'ident.check.gov',
};

/** The line under a row's title. Campus wording follows the server's status; the rest are not available. */
export function checkMeta(check: IdentityCheck): MessageKey {
  switch (check.state) {
    case 'verified': return 'ident.meta.verified';
    case 'review': return 'ident.meta.review';
    case 'rejected': return 'ident.meta.rejected';
    case 'todo': return 'ident.meta.todo';
    case 'unknown': return 'ident.meta.unknown';
    default: return 'ident.meta.unavailable';
  }
}

type Tone = 'done' | 'review' | 'todo' | 'fail' | 'off';
const TONE: Record<CheckState, Tone> = {
  verified: 'done', review: 'review', todo: 'todo', rejected: 'fail', unavailable: 'off', unknown: 'off',
};

/** Badge words on the right: Add / In review / Fix. Done is the check mark; "not available" says it in the line under the title. */
const BADGE: Partial<Record<CheckState, MessageKey>> = {
  todo: 'ident.badge.add', review: 'ident.badge.review', rejected: 'ident.badge.fix',
};

export interface IdentityCheckRowProps {
  check: IdentityCheck;
  onPress?: () => void;
  /** The check's illustration, drawn beside the words on the wide board (decorative). */
  art?: React.ReactNode;
  testID?: string;
}

/**
 * One identity check (canvas VerifyIdentity / VerifyGate rows). Drawn done
 * (positive, check mark) only for `verified`, which only the server sets.
 * Rejected is red: a failed verification is a safety alert (founder colour
 * rule, decision D3-1). A row with nowhere to go is not a button.
 */
export function IdentityCheckRow({ check, onPress, art, testID }: IdentityCheckRowProps): React.ReactElement {
  const t = useT();
  const tone = TONE[check.state];
  const title = t(CHECK_TITLE[check.id]);
  const meta = t(checkMeta(check));
  const badge = BADGE[check.state];
  const inner = (
    <>
      <View style={[styles.tile, tileTone[tone]]}>
        <Icon name={CHECK_ICON[check.id]} size={22} color={ICON_TONE[tone]} />
      </View>
      <View style={styles.words}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.meta, metaTone[tone]]}>{meta}</Text>
      </View>
      {art ? <View style={styles.art} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{art}</View> : null}
      {check.state === 'verified' ? (
        <View style={styles.done} testID={testID ? `${testID}-done` : undefined}>
          <Icon name="check" size={16} strokeWidth={2.8} color={color.onAction} />
        </View>
      ) : check.state === 'rejected' ? (
        <View style={[styles.badge, styles.badgeFail]}>
          <Icon name="alert-triangle" size={14} color={color.onDangerFill} />
          <Text style={[styles.badgeText, styles.badgeTextFail]}>{t('ident.badge.fix')}</Text>
        </View>
      ) : check.state === 'unknown' ? (
        <Icon name="circle" size={22} color={color.text3} />
      ) : badge ? (
        <View style={[styles.badge, badgeTone[tone]]}>
          <Text style={[styles.badgeText, tone === 'todo' ? styles.badgeTextOn : null]}>{t(badge)}</Text>
        </View>
      ) : null}
    </>
  );
  const frame = [styles.row, rowTone[tone]];
  if (!onPress) {
    return <View testID={testID} style={frame} accessible accessibilityLabel={`${title}, ${meta}`}>{inner}</View>;
  }
  return (
    <Pressable
      testID={testID}
      role="button"
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${meta}`}
      aria-label={`${title}, ${meta}`}
      onPress={onPress}
      style={({ focused }: { pressed: boolean; focused?: boolean }) => [...frame, focused ? focusRing : null]}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: size.touchTarget + space.s20,
    paddingVertical: space.s12, paddingHorizontal: space.s14, borderRadius: radius.xl, borderWidth: 1.5, backgroundColor: color.surface,
  },
  tile: { width: size.touchTarget, height: size.touchTarget, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  words: { flex: 1, gap: space.s2 },
  art: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: color.surface2, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  meta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body },
  done: { width: 30, height: 30, borderRadius: radius.full, backgroundColor: color.positive, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: space.s4, minHeight: 30, paddingHorizontal: space.s12, borderRadius: radius.full },
  badgeFail: { backgroundColor: color.dangerFill },
  badgeTextFail: { color: color.onDangerFill },
  badgeText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  badgeTextOn: { color: color.onAction },
});

const rowTone = StyleSheet.create({
  done: { borderColor: color.positiveRule },
  review: { borderColor: color.selectedRule },
  todo: { borderColor: color.rule, borderStyle: 'dashed' },
  fail: { borderColor: color.dangerRule, backgroundColor: color.dangerBg },
  off: { borderColor: color.ruleSoft, borderStyle: 'dashed', backgroundColor: color.surface2 },
});
const tileTone = StyleSheet.create({
  done: { backgroundColor: color.positiveBg },
  review: { backgroundColor: color.surface3 },
  todo: { backgroundColor: color.surface3 },
  fail: { backgroundColor: color.surface },
  off: { backgroundColor: color.surface3 },
});
const ICON_TONE: Record<Tone, string> = {
  done: color.positive, review: color.action, todo: color.action, fail: color.danger, off: color.text3,
};
const metaTone = StyleSheet.create({
  done: { color: color.positive },
  review: { color: color.action },
  todo: { color: color.text2 },
  fail: { color: color.danger },
  off: { color: color.text3 },
});
const badgeTone = StyleSheet.create({
  done: {},
  review: { backgroundColor: color.surface3 },
  todo: { backgroundColor: color.action },
  fail: { backgroundColor: color.danger },
  off: { backgroundColor: color.surface3 },
});
