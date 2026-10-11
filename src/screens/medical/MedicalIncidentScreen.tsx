import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Card, CrisisLinks, Eyebrow, Note, RadioGroup } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

const SITUATIONS = ['bleeding', 'breathing', 'allergy', 'fever', 'stomach', 'overwhelmed'] as const;
type Situation = (typeof SITUATIONS)[number];

/**
 * Public routes /crisis and /medical-incident. No sign-in, no network.
 *
 * This page used to lead with an incident "report" form — including a
 * "CRITICAL 1 — Immediate Ambulance Needed" severity — that appended to an
 * in-memory list and sent nothing to anyone. A student in trouble could choose
 * that option instead of calling. There is no incident service, so the form is
 * gone. What is left works without a server: the call buttons, a plain
 * statement that this page cannot send help, and short first steps for common
 * situations, each saying when to call 112.
 *
 * The first-step wording needs clinical review before launch (AGENTS.md, Tier 1).
 */
export function MedicalIncidentScreen(): React.ReactElement {
  const t = useT();
  const [situation, setSituation] = useState<Situation | null>(null);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <CrisisLinks titleKey="crisis.pageCannotSend" testID="crisis-links" />

      <Eyebrow>{t('help.eyebrow')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('help.title')}</Text>
      <Note tone="danger">{t('help.cannotSend')}</Note>

      <Card>
        <Text accessibilityRole="header" style={styles.cardTitle}>{t('help.whileYouWait')}</Text>
        <RadioGroup<Situation>
          label={t('help.whatsHappening')}
          options={SITUATIONS.map((s) => ({ value: s, label: t(`help.${s}.label` as MessageKey) }))}
          value={situation}
          onChange={setSituation}
        />
        {situation ? (
          <>
            <Text style={styles.body}>{t(`help.${situation}.steps` as MessageKey)}</Text>
            <Note tone="danger" title={t('help.call112If')}>{t(`help.${situation}.callIf` as MessageKey)}</Note>
          </>
        ) : null}
        <Text style={styles.meta}>{t('help.notAdvice')}</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text, lineHeight: font.size.body * font.lineHeight.body },
  meta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
});
