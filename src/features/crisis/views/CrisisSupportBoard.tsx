import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardScreen, BoardSection, PrivacyNote, boardText } from '@/design-system/board/BoardKit';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { FirstSteps } from '@/screens/medical/MedicalIncidentScreen';

export interface CrisisSupportLinks {
  back?: () => void;
  /** Campus SOS (SosBeacon). */
  sos: () => void;
}

type PressState = { pressed: boolean; focused?: boolean };

/** The lines on this screen. Numbers and helpline names are never translated. */
export const CRISIS_SUPPORT_LINES: readonly {
  key: string; number: string; tel: string; title: MessageKey; meta: MessageKey; spoken: MessageKey; icon: SkIconName; primary: boolean;
}[] = [
  { key: 'telemanas', number: '14416', tel: 'tel:14416', title: 'sf.crisis.teleManas', meta: 'sf.crisis.teleManasMeta', spoken: 'crisis.callTeleManasSpoken', icon: 'phone-2', primary: true },
  { key: 'emergency', number: '112', tel: 'tel:112', title: 'sf.crisis.emergency', meta: 'sf.crisis.emergencyMeta', spoken: 'crisis.call112Spoken', icon: 'shield-2', primary: false },
];

const STEPS: readonly MessageKey[] = ['sf.crisis.step1', 'sf.crisis.step2'];

/**
 * Crisis support (canvas page 2: CrisisSupport, Tier 1 — approved by Krishna
 * Chintakayala, 2026-10-21). Public: no sign-in, no network. It makes no
 * request and sends no telemetry, which is what makes the privacy line true.
 *
 * Drawn from the board: Tele-MANAS and 112 as call cards, what happens when
 * you call, the privacy promise and the Campus SOS link. Not drawn (D6-3): the
 * campus counsellor card and "Book time with a campus counsellor" — there is
 * no student-facing counsellor line or booking to send anyone to, and a dead
 * option is the last thing a student in distress should meet. The existing
 * first steps stay below the cards until clinical review says otherwise.
 */
export function CrisisSupportBoard({ links, after }: { links: CrisisSupportLinks; after?: React.ReactNode }): React.ReactElement {
  const t = useT();
  return (
    <BoardScreen testID="crisis-support">
      <BoardHeader title={t('sf.crisis.title')} subtitle={t('sf.crisis.subtitle')} backIcon="arrow-left" backLabel={t('common.back')} onBack={links.back} />
      <View style={styles.also}>
        <Text style={boardText.eyebrow}>{t('sf.alsoHere')}</Text>
        <Pressable testID="crisis-sos-link" accessibilityRole="link" accessibilityLabel={t('sf.crisis.campusSos')} onPress={links.sos}
          style={({ focused }: PressState) => [styles.alsoChip, focused ? focusRing : null]}>
          <Icon name="map-pin" size={space.s16} color={color.action} />
          <Text style={styles.alsoText}>{t('sf.crisis.campusSos')}</Text>
        </Pressable>
      </View>
      <Text style={styles.lead}>{t('sf.crisis.lead')}</Text>

      <View style={styles.lines}>
        {CRISIS_SUPPORT_LINES.map((line) => (
          <View key={line.key} testID={`crisis-line-${line.key}`} style={[styles.line, line.primary ? styles.linePrimary : null]}>
            <View style={[styles.lineIcon, line.primary ? styles.lineIconPrimary : null]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Icon name={line.icon} size={size.navIcon + space.s2} color={line.primary ? color.onHero : color.action} />
            </View>
            <View style={styles.lineWords}>
              <Text style={[styles.lineTitle, line.primary ? { color: color.onHeroLabel } : null]}>{t(line.title)}</Text>
              <Text style={[styles.lineNumber, line.primary ? { color: color.onHero } : null]}>{line.number}</Text>
              <Text style={[styles.lineMeta, line.primary ? { color: color.onHero2 } : null]}>{t(line.meta)}</Text>
            </View>
            <Pressable
              testID={`crisis-call-${line.key}`}
              accessibilityRole="button"
              accessibilityLabel={t(line.spoken)}
              onPress={() => void Linking.openURL(line.tel)}
              style={({ focused }: PressState) => [styles.call, line.primary ? styles.callPrimary : line.number === '112' ? styles.call112 : null, focused ? focusRing : null]}
            >
              <Text style={[styles.callText, line.primary ? { color: color.onHeroCurrent } : line.number === '112' ? { color: color.onDangerFill } : null]}>{t('sf.crisis.call')}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <BoardSection label={t('sf.crisis.whatHappens')}>
        <View style={styles.steps}>
          {STEPS.map((step, i) => (
            <View key={step} style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{String(i + 1)}</Text></View>
              <Text style={[boardText.body, styles.flex, { color: color.text }]}>{t(step)}</Text>
            </View>
          ))}
        </View>
      </BoardSection>

      <PrivacyNote icon="lock-3" testID="crisis-privacy">{t('sf.crisis.privacy')}</PrivacyNote>
      {after}
    </BoardScreen>
  );
}

/** Public route /crisis: the board, then the first steps while you wait. */
export function CrisisSupportRoute(): React.ReactElement {
  return (
    <View style={styles.page}>
      <CrisisSupportBoard
        links={{
          sos: () => navigate('sos'),
          back: () => (typeof window !== 'undefined' && window.history.length > 1 ? window.history.back() : navigate('landing')),
        }}
        after={<FirstSteps />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.canvas, width: '100%', maxWidth: size.panelMax, alignSelf: 'center' },
  flex: { flex: 1, minWidth: 0 },
  also: { flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  alsoChip: { flexDirection: 'row', alignItems: 'center', gap: space.s6, minHeight: size.touchTarget, paddingHorizontal: space.s12, borderRadius: radius.md, backgroundColor: color.surface3 },
  alsoText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  lead: { fontFamily: font.family.sans, fontSize: font.size.titleSm, color: color.text2, lineHeight: font.size.titleSm * font.lineHeight.body },
  lines: { gap: space.s12 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.s14, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  linePrimary: { backgroundColor: color.heroBg, borderColor: color.heroBg },
  lineIcon: { width: space.s40 + space.s8, height: space.s40 + space.s8, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface3 },
  lineIconPrimary: { backgroundColor: color.onHeroVeil },
  lineWords: { flex: 1, minWidth: 0, gap: space.s2 },
  lineTitle: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 0.8, color: color.text3 },
  lineNumber: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  lineMeta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2, lineHeight: font.size.caption * font.lineHeight.body },
  call: { minHeight: size.touchTarget, minWidth: size.touchTarget + space.s20, paddingHorizontal: space.s20, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.action },
  callPrimary: { backgroundColor: color.heroCurrent },
  call112: { backgroundColor: color.dangerFill },
  callText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  steps: { gap: space.s12, backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, padding: space.s16 },
  step: { flexDirection: 'row', gap: space.s12, alignItems: 'flex-start' },
  stepNum: { width: space.s20 + space.s2, height: space.s20 + space.s2, borderRadius: radius.sm, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action },
});
