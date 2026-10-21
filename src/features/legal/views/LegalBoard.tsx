import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardScreen, TextLink, boardText } from '@/design-system/board/BoardKit';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

export type LegalTab = 'privacy' | 'terms' | 'grievance';

export interface LegalLinks {
  back?: () => void;
  /** Help centre (signed in) — the board's way to a person. */
  help?: () => void;
}

const TABS: readonly { key: LegalTab; label: MessageKey }[] = [
  { key: 'privacy', label: 'sf.legal.tab.privacy' },
  { key: 'terms', label: 'sf.legal.tab.terms' },
  { key: 'grievance', label: 'sf.legal.tab.grievance' },
];

type PressState = { pressed: boolean; focused?: boolean };

/** Facts the code does today (the existing, reviewed lines on /privacy). Not commitments. */
const NOW: readonly MessageKey[] = ['member.legal.nowShare', 'member.legal.nowEndShare', 'member.legal.nowConsents', 'member.legal.nowAdults'];

/**
 * Privacy, terms and grievance on a phone (canvas page 2: Legal, Tier 1 —
 * layout approved by Krishna Chintakayala, 2026-10-21). The board's tabs and
 * layout, but no notice text: there is no legal-approved privacy notice, no
 * terms and no appointed grievance officer (D6-10), and guardrail 6 rules out
 * writing them. Each tab says so plainly, as /privacy already did, and the
 * safety line ("call 112") ships now.
 */
export function LegalBoard({ initialTab = 'privacy', links }: { initialTab?: LegalTab; links: LegalLinks }): React.ReactElement {
  const t = useT();
  const [tab, setTab] = useState<LegalTab>(initialTab);
  const unpublished: MessageKey = tab === 'terms' ? 'member.legal.termsNotPublished' : tab === 'grievance' ? 'sf.legal.officerNotAppointed' : 'member.legal.privacyNotPublished';

  return (
    <BoardScreen testID="legal-board">
      <BoardHeader title={t('sf.legal.title')} backIcon="chevron-left" backLabel={t('common.back')} onBack={links.back} />
      <View role="tablist" accessibilityRole="tablist" accessibilityLabel={t('sf.legal.title')} style={styles.tabs}>
        {TABS.map((item) => {
          const on = item.key === tab;
          return (
            <Pressable key={item.key} testID={`legal-tab-${item.key}`} role="tab" accessibilityRole="tab" aria-selected={on} accessibilityState={{ selected: on }}
              onPress={() => setTab(item.key)} style={({ focused }: PressState) => [styles.tab, on ? styles.tabOn : null, focused ? focusRing : null]}>
              <Text style={[styles.tabText, on ? styles.tabTextOn : null]}>{t(item.label)}</Text>
            </Pressable>
          );
        })}
      </View>

      <View role="tabpanel" style={styles.panel} testID={`legal-panel-${tab}`}>
        <View role="status" style={styles.notice}>
          <Text style={[boardText.strong, { color: color.attention }]}>{t(unpublished)}</Text>
          <Text style={[boardText.body, { color: color.attention }]}>{tab === 'grievance' ? t('member.legal.officerBody') : t('member.legal.noticeBody')}</Text>
        </View>

        {tab !== 'grievance' ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.heading}>{t('member.legal.nowHeading')}</Text>
            <Text style={boardText.body}>{t('member.legal.nowBody')}</Text>
            {NOW.map((line) => <Text key={line} style={[boardText.body, { color: color.text }]}>{t(line)}</Text>)}
          </View>
        ) : (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.heading}>{t('sf.legal.meanwhileTitle')}</Text>
            <Text style={boardText.body}>{t('sf.legal.meanwhileBody')}</Text>
            {links.help ? <TextLink label={t('sf.legal.help')} onPress={links.help} /> : null}
          </View>
        )}
      </View>

      <View style={styles.emergency} testID="legal-emergency">
        <Text style={[boardText.strong, { color: color.text }]}>{t('sf.legal.notEmergency')}</Text>
        <TextLink label={t('crisis.call112')} accessibilityLabel={t('crisis.call112Spoken')} tone="danger" onPress={() => void Linking.openURL('tel:112')} />
      </View>
    </BoardScreen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  tab: { minHeight: size.touchTarget, justifyContent: 'center', paddingHorizontal: space.s14, borderRadius: radius.full, borderWidth: 1, borderColor: color.rule, backgroundColor: color.surface },
  tabOn: { backgroundColor: color.heroBg, borderColor: color.heroBg },
  tabText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  tabTextOn: { color: color.onHero },
  panel: { gap: space.s16 },
  notice: { gap: space.s6, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.attentionBg },
  section: { gap: space.s8 },
  heading: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  emergency: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s12, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
});
