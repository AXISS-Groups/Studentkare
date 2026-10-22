import React from 'react';
import { Animated, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { OfflineBanner, Rise, TELE_MANAS_NUMBER, useOnline } from '@/design-system';
import { Gradient, M2_NAV_CLEARANCE, ORB_STOPS, RoundButton, SosButton, m2Text, useAmbientMotion, useLoop, useOwnPhoneChrome, M2Heading, webAttrs } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, motion, radius, shadow, shadowStyle, size, space, webOnly } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { REFUSAL_NOTE } from '../viewmodel/AyushViewModel';
import type { AyushReply, AyushViewModel } from '../viewmodel/AyushViewModel';

/**
 * Mobile 2.0 Ask Ayush (canvas page 9 M2AskAyush, Tier 1), in GENERAL MODE
 * only (plan package A, approved by Krishna Chintakayala 2026-10-21): Ayush
 * answers from approved sources through the server agent (crisis gate first,
 * scope guard, grounding and output guards, unchanged) and cannot read the
 * student's records (D-M2-13 not built; the AI-constitution owner signs that
 * part). So the banner says Ayush can't read records, record suggestions and
 * the report card are not drawn, and the header says "Answers from approved
 * sources. Not a doctor." instead of "Explains your own records".
 *
 * The crisis card comes from the server's CRISIS outcome and stays while it is
 * the latest answer (D7-5); the Tele-MANAS line is always on screen and needs
 * no request.
 */
export interface M2AskAyushLinks {
  back: () => void;
  sos: () => void;
  /** The help centre. Omitted where there is none (the Expo app has no Help screen yet). */
  help?: () => void;
  /** Doctor consults. */
  book?: () => void;
}

/** General questions that pass the scope guard (the starters every Ayush surface offers). */
const SUGGESTIONS: readonly MessageKey[] = ['ayush.starter1', 'ayush.starter2', 'ayush.starter3'];

function Orb() {
  const ambient = useAmbientMotion();
  const pulse = useLoop(ambient, motion.duration.ambient);
  const scale = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });
  return (
    <Animated.View style={{ transform: [{ scale }] }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Gradient colors={ORB_STOPS} radial={{ x: 0.3, y: 0.25 }} style={styles.orb} />
    </Animated.View>
  );
}

function TypingDots({ label }: { label: string }) {
  const ambient = useAmbientMotion();
  const beat = useLoop(ambient, motion.duration.ambient / 4);
  return (
    <View style={[styles.bubble, styles.theirs, styles.typing]} role="status" accessibilityLiveRegion="polite" accessibilityLabel={label} aria-label={label} testID="m2-ask-typing">
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={[styles.typingDot, ambient ? {
          opacity: beat.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: i === 0 ? [1, 0.3, 0.3, 1] : i === 1 ? [0.3, 1, 0.3, 0.3] : [0.3, 0.3, 1, 0.3] }),
        } : null]} />
      ))}
    </View>
  );
}

function CrisisCard({ reply }: { reply: AyushReply }) {
  const t = useT();
  return (
    <View role="alert" accessibilityRole="alert" style={styles.crisis} testID="m2-ask-crisis">
      <Text style={styles.crisisTitle}>{t('ayush.notAlone')}</Text>
      <Text style={styles.crisisText}>{reply.answer}</Text>
      {(reply.crisis?.resources ?? []).map((r) => (
        <Pressable key={`${r.label}-${r.number}`} role="link" accessibilityRole="link" accessibilityLabel={t('ayush.callSpoken', { label: r.label, number: r.number })}
          aria-label={t('ayush.callSpoken', { label: r.label, number: r.number })} onPress={() => void Linking.openURL(`tel:${r.number.replace(/[^\d+]/g, '')}`)}
          style={({ focused }: PressState) => [styles.crisisCall, focused ? focusRing : null]}>
          <Icon name="phone" size={16} color={color.onDangerFill} />
          <Text style={styles.crisisCallText}>{`${r.label} · ${r.number}`}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** "I couldn't find this": never a dead end — the help centre and a doctor, where the app has them. */
function NoSourceNext({ links }: { links: M2AskAyushLinks }) {
  const t = useT();
  const next = [
    links.help ? { key: 'help', label: t('assist.ayush.noSource.help'), onPress: links.help } : null,
    links.book ? { key: 'book', label: t('assist.ayush.noSource.book'), onPress: links.book } : null,
  ].filter((item): item is { key: string; label: string; onPress: () => void } => item !== null);
  if (!next.length) return null;
  return (
    <View style={styles.nextRow} testID="m2-ask-no-source-next">
      {next.map((item) => (
        <Pressable key={item.key} role="link" accessibilityRole="link" accessibilityLabel={item.label} aria-label={item.label} onPress={item.onPress}
          testID={`m2-ask-next-${item.key}`} style={({ focused }: PressState) => [styles.next, focused ? focusRing : null]}>
          <Text style={styles.nextText}>{item.label}</Text>
          <Icon name="arrow-right" size={14} color={color.action} />
        </Pressable>
      ))}
    </View>
  );
}

function Answer({ reply, links }: { reply: AyushReply; links: M2AskAyushLinks }) {
  const t = useT();
  if (reply.outcome === 'CRISIS' && reply.crisis) return <CrisisCard reply={reply} />;
  if (reply.outcome === 'NO_SOURCE') {
    return (
      <View style={[styles.bubble, styles.theirs]} testID="m2-ask-answer">
        <Text style={styles.theirText}>{t('assist.ayush.noSource.title')}</Text>
        <Text style={styles.refusal}>{t('assist.ayush.noSource.next')}</Text>
        <NoSourceNext links={links} />
      </View>
    );
  }
  const note = REFUSAL_NOTE[reply.outcome];
  return (
    <View style={[styles.bubble, styles.theirs]} testID="m2-ask-answer">
      <Text style={styles.theirText}>{reply.answer}</Text>
      {note ? <Text style={styles.refusal}>{t(note)}</Text> : null}
      {reply.citations.length > 0 ? (
        <View style={styles.sources} accessibilityLabel={t('ayush.sources')} aria-label={t('ayush.sources')}>
          {reply.citations.map((c) => (
            <View key={`${c.sourceId}-${c.version}`} style={styles.source}>
              <Icon name="check" size={12} color={color.positive} strokeWidth={2.8} />
              <Text style={styles.sourceText}>{`${c.title}${c.stale ? ` · ${t('ayush.mayBeOld')}` : ''}`}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export const M2AskAyushView = observer(function M2AskAyushView({ vm, links }: { vm: AyushViewModel; links: M2AskAyushLinks }) {
  const t = useT();
  useOwnPhoneChrome();
  const online = useOnline();
  // The thread sits just above the input, so a new answer lands next to where the student typed.
  const turns = vm.thread.length;
  const send = (text?: string) => { if (online) void vm.send(text); };
  const canSend = online && vm.canSend;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="m2-ask-ayush">
      <View pointerEvents="none" style={styles.glow} />
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label={t('m2.ask.back')} onPress={links.back} testID="m2-ask-back" />
        <Orb />
        <View style={styles.grow}>
          <View style={styles.titleRow}>
            <M2Heading level={1} style={styles.title}>{t('m2.ask.title')}</M2Heading>
            <View style={styles.beta}><Text style={styles.betaText}>{t('m2.ask.beta')}</Text></View>
          </View>
          <Text style={m2Text.meta}>{t('m2.ask.sub')}</Text>
        </View>
        <SosButton label={t('m2.sos')} spoken={t('m2.sosSpoken')} onPress={links.sos} testID="m2-ask-sos" />
      </View>

      <View style={[styles.gutter, styles.banner]} testID="m2-ask-banner">
        <Icon name="shield" size={18} color={color.text2} />
        <Text style={[styles.bannerText, styles.grow]}>{t('m2.ask.noRecords')}</Text>
      </View>

      {!online ? <View style={styles.gutter}><OfflineBanner message={t('m2.ask.offline')} /></View> : null}

      <View style={[styles.gutter, styles.thread]} aria-live="polite" testID="m2-ask-thread" {...webAttrs({ 'aria-label': t('assist.ayush.conversationLabel') })}>
        {turns === 0 ? (
          <Rise>
            <View style={[styles.bubble, styles.theirs]} testID="m2-ask-greeting">
              <Text style={styles.theirText}>{t('m2.ask.greeting')}</Text>
            </View>
          </Rise>
        ) : null}
        {vm.thread.map(({ question, reply }, index) => (
          <Rise key={`${vm.conversationId}-${index}`}>
            <View style={styles.turn}>
              <Gradient colors={[color.brandNavyLight, color.brandNavy]} angle={150} style={[styles.bubble, styles.mine]}>
                <Text style={styles.mineText}>{question}</Text>
              </Gradient>
              <Answer reply={reply} links={links} />
            </View>
          </Rise>
        ))}
        {vm.sending ? <TypingDots label={t('m2.ask.typing')} /> : null}
        {vm.error ? <Text accessibilityRole="alert" style={styles.error} testID="m2-ask-error">{t(vm.error)}</Text> : null}
        {turns === 0 && vm.history.length > 0 ? (
          <View style={styles.history} testID="m2-ask-history">
            <Text style={m2Text.eyebrow}>{t('assist.ayush.historyTitle')}</Text>
            <Text style={m2Text.meta}>{t('assist.ayush.historyPrivate')}</Text>
            {vm.history.slice(-5).reverse().map((turn) => <Text key={turn.id} style={styles.historyItem}>{turn.question}</Text>)}
          </View>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions} keyboardShouldPersistTaps="handled" testID="m2-ask-suggestions">
        {SUGGESTIONS.map((key) => (
          <Pressable key={key} role="button" accessibilityRole="button" accessibilityLabel={t(key)} aria-label={t(key)} disabled={!online || vm.sending}
            onPress={() => send(t(key))} style={({ focused }: PressState) => [styles.suggestion, focused ? focusRing : null]}>
            <Text style={styles.suggestionText}>{t(key)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.gutter]}>
        <View style={styles.crisisLine} testID="m2-ask-crisis-line">
          <Icon name="phone" size={18} color={color.danger} />
          <Text style={[styles.crisisLineText, styles.grow]}>{t('m2.ask.crisisLine')}</Text>
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.ask.callSpoken', { number: TELE_MANAS_NUMBER })} aria-label={t('m2.ask.callSpoken', { number: TELE_MANAS_NUMBER })}
            onPress={() => void Linking.openURL(`tel:${TELE_MANAS_NUMBER}`)} testID="m2-ask-call" style={({ focused }: PressState) => [styles.call, focused ? focusRing : null]}>
            <Text style={styles.callText}>{t('m2.ask.call', { number: TELE_MANAS_NUMBER })}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.gutter}>
        <View style={styles.input}>
          <TextInput
            testID="m2-ask-input"
            accessibilityLabel={t('m2.ask.inputLabel')}
            aria-label={t('m2.ask.inputLabel')}
            value={vm.question}
            onChangeText={vm.setQuestion}
            onSubmitEditing={() => { if (canSend) send(); }}
            placeholder={t('m2.ask.placeholder')}
            placeholderTextColor={color.text3}
            maxLength={1000}
            returnKeyType="send"
            editable={online}
            style={[styles.inputText, webOnly({ outlineStyle: 'none' as const })]}
          />
          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('m2.ask.send')} aria-label={t('m2.ask.send')} disabled={!canSend}
            accessibilityState={{ disabled: !canSend, busy: vm.sending }} onPress={() => send()} testID="m2-ask-send"
            style={({ focused }: PressState) => [styles.sendWrap, !canSend ? styles.sendOff : null, focused ? focusRing : null]}>
            <Gradient colors={[color.brandNavyLight, color.brandNavy]} angle={150} style={styles.send}>
              <Icon name="arrow-right" size={18} color={color.onHero} strokeWidth={2.4} />
            </Gradient>
          </Pressable>
        </View>
        <Text style={styles.footer}>{t('m2.ask.footer')}</Text>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s12, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', top: -160, left: -60, width: 420, height: 360, borderRadius: radius.full, backgroundColor: color.surface3, opacity: 0.8 },
  gutter: { paddingHorizontal: space.gutterPhone },
  grow: { flex: 1, minWidth: 0 },
  header: { paddingTop: space.s16, paddingHorizontal: space.gutterPhone, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  orb: { width: 40, height: 40, borderRadius: radius.full },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.s6 },
  title: { fontFamily: font.family.sans, fontSize: 19, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  beta: { paddingHorizontal: space.s8, paddingVertical: space.s2, borderRadius: radius.full, backgroundColor: color.neutralBg },
  betaText: { fontFamily: font.family.sans, fontSize: 10.5, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  banner: {
    marginHorizontal: space.gutterPhone, paddingVertical: space.s10, paddingHorizontal: space.s12, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', gap: space.s10,
    backgroundColor: color.surface, ...shadowStyle(shadow.hairline),
  },
  bannerText: { fontFamily: font.family.sans, fontSize: 11.5, lineHeight: 16, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  thread: { gap: space.s12, paddingTop: space.s4, minHeight: 220 },
  turn: { gap: space.s12 },
  bubble: { maxWidth: 290, paddingVertical: 11, paddingHorizontal: space.s14 },
  mine: { alignSelf: 'flex-end', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20, borderBottomLeftRadius: 6, backgroundColor: color.surface, ...shadowStyle(shadow.hairline) },
  mineText: { fontFamily: font.family.sans, fontSize: 13.5, lineHeight: 19, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
  theirText: { fontFamily: font.family.sans, fontSize: 13.5, lineHeight: 19, fontWeight: fontWeight(font.weight.strong), color: color.text },
  refusal: { marginTop: space.s8, fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: 17, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  sources: { marginTop: space.s8, flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
  source: { flexDirection: 'row', alignItems: 'center', gap: space.s4, paddingHorizontal: space.s8, paddingVertical: space.s2, borderRadius: radius.full, backgroundColor: color.positiveBg },
  nextRow: { marginTop: space.s8, flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  next: {
    minHeight: size.touchTarget, paddingHorizontal: space.s12, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: space.s4,
    borderWidth: 1, borderColor: color.rule, backgroundColor: color.surface,
  },
  nextText: { fontFamily: font.family.sans, fontSize: 12.5, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  sourceText: { fontFamily: font.family.sans, fontSize: 11, fontWeight: fontWeight(font.weight.strong), color: color.positive },
  typing: { flexDirection: 'row', gap: 5, paddingVertical: space.s12 },
  typingDot: { width: 7, height: 7, borderRadius: radius.full, backgroundColor: color.action },
  error: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: 17, fontWeight: fontWeight(font.weight.strong), color: color.danger },
  history: { gap: space.s4, paddingTop: space.s8 },
  historyItem: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
  crisis: { borderRadius: 22, padding: space.s14, gap: space.s10, backgroundColor: color.dangerBg, borderWidth: 2, borderColor: color.danger },
  crisisTitle: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.danger },
  crisisText: { fontFamily: font.family.sans, fontSize: 13.5, lineHeight: 19, fontWeight: fontWeight(font.weight.strong), color: color.text },
  crisisCall: { minHeight: size.touchTarget, borderRadius: radius.full, paddingHorizontal: space.s14, flexDirection: 'row', alignItems: 'center', gap: space.s8, backgroundColor: color.dangerFill },
  crisisCallText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onDangerFill },
  suggestions: { paddingHorizontal: space.gutterPhone, gap: space.s8 },
  suggestion: { minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, justifyContent: 'center', borderWidth: 1, borderColor: color.rule, backgroundColor: color.surface },
  suggestionText: { fontFamily: font.family.sans, fontSize: 12.5, fontWeight: fontWeight(font.weight.strong), color: color.action },
  crisisLine: { paddingVertical: space.s8, paddingLeft: space.s12, paddingRight: space.s4, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', gap: space.s10, backgroundColor: color.dangerBg },
  crisisLineText: { fontFamily: font.family.sans, fontSize: 11.5, lineHeight: 16, fontWeight: fontWeight(font.weight.strong), color: color.text },
  call: { minHeight: size.touchTarget, minWidth: size.touchTarget, paddingHorizontal: space.s10, justifyContent: 'center' },
  callText: { fontFamily: font.family.sans, fontSize: 12.5, fontWeight: fontWeight(font.weight.heavy), color: color.danger },
  input: {
    minHeight: 56, borderRadius: radius.full, paddingLeft: space.s16, paddingRight: space.s6, flexDirection: 'row', alignItems: 'center', gap: space.s8,
    backgroundColor: color.surface, ...shadowStyle(shadow.card),
  },
  inputText: { flex: 1, minWidth: 0, paddingVertical: space.s10, fontFamily: font.family.sans, fontSize: 14, fontWeight: fontWeight(font.weight.strong), color: color.text },
  sendWrap: { borderRadius: radius.full },
  sendOff: { opacity: 0.5 },
  send: { width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  footer: { marginTop: space.s8, textAlign: 'center', fontFamily: font.family.sans, fontSize: 10.5, lineHeight: 15, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
});
