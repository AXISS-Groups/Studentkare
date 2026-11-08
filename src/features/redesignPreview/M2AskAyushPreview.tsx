import React from 'react';
import { useT } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Note, m2Text } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';

const noop = () => undefined;

/**
 * Flat, non-functional 1mg-inspired preview of M2AskAyush. Krishna asked to
 * extend the canvas's style past the 12 already built. Content from
 * design/screens/briefs/M2AskAyush.md (Tier 1: AI answers about the
 * student's own records). The guardrail this screen enforces is kept as
 * written content, not just decoration: Ayush's answer below ends by
 * routing to a doctor, never giving its own clinical verdict. Not wired,
 * not replacing the real screen. See NOTES.md.
 */
export function M2AskAyushPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-m2-ask-ayush">
      <View style={styles.header}>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
          <Icon name="arrow-left" size={20} color={color.text} />
        </Pressable>
        <Text style={styles.title}>{t('dest.AiChat.label')}</Text>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('ebar.call')} onPress={noop} style={({ focused }: PressState) => [styles.backBtn, focused ? focusRing : null]}>
          <Icon name="phone" size={18} color={color.text2} />
        </Pressable>
      </View>
      <View style={styles.scroll}>
        <View style={styles.body}>
          <M2Note tone="info" icon="shield" title={t('preview.aboutYourRecords')}>{t('preview.ayushCanSeeYourReportsAndMedicinesTo')}</M2Note>
          <View style={styles.reportCard}>
            <Text style={m2Text.eyebrow}>{t('preview.latestReport')}</Text>
            <Text style={styles.reportTitle}>{t('preview.lipidProfile14Oct2026')}</Text>
          </View>
          <View style={[styles.bubble, styles.studentBubble]}>
            <Text style={styles.bubbleText}>{t('preview.whatDoesHdlMean')}</Text>
          </View>
          <View style={[styles.bubble, styles.ayushBubble]}>
            <Text style={styles.bubbleText}>{t('preview.hdlIsOftenCalledGoodCholesterolItHelps')}</Text>
          </View>
          <View style={styles.chipRow}>
            {['Is my HbA1c serious?', 'What should I eat less of?'].map((chip) => (
              <Pressable key={chip} role="button" accessibilityRole="button" accessibilityLabel={chip} onPress={noop} style={({ focused }: PressState) => [styles.chip, focused ? focusRing : null]}>
                <Text style={styles.chipText}>{chip}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.inputBar}>
        <View style={styles.inputField}><Text style={styles.inputPlaceholder}>{t('preview.askAboutYourRecords')}</Text></View>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('m2.ask.send')} onPress={noop} style={({ focused }: PressState) => [styles.sendBtn, focused ? focusRing : null]}>
          <Icon name="arrow-right" size={18} color={color.onAction} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s8, paddingHorizontal: space.gutterPhone, paddingVertical: space.s12, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  backBtn: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center' },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s12 },
  reportCard: { backgroundColor: color.surface2, borderRadius: radius.md, padding: space.s12, gap: space.s2 },
  reportTitle: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, fontWeight: fontWeight(font.weight.strong), color: color.text },
  bubble: { maxWidth: '82%', borderRadius: radius.lg, padding: space.s12 },
  studentBubble: { alignSelf: 'flex-end', backgroundColor: color.action },
  ayushBubble: { alignSelf: 'flex-start', backgroundColor: color.surface },
  bubbleText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text, lineHeight: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8, marginTop: space.s4 },
  chip: { paddingHorizontal: space.s12, height: 34, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.action },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: space.s8, padding: space.gutterPhone, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  inputField: { flex: 1, height: 44, borderRadius: radius.full, backgroundColor: color.surface2, paddingHorizontal: space.s16, justifyContent: 'center' },
  inputPlaceholder: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text3 },
  sendBtn: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
});
