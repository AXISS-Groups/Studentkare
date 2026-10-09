import React, { useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, CrisisLinks, Eyebrow, Note, TextField } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { AyushViewModel, REFUSAL_NOTE } from '../viewmodel/AyushViewModel';
import type { AyushReply } from '../viewmodel/AyushViewModel';

const STARTERS: MessageKey[] = ['ayush.starter1', 'ayush.starter2', 'ayush.starter3'];

function ReplyCard({ reply }: { reply: AyushReply }): React.ReactElement {
  const t = useT();
  if (reply.outcome === 'CRISIS' && reply.crisis) {
    return (
      <Card>
        <Note tone="danger" title={t('ayush.notAlone')}>{reply.answer}</Note>
        {reply.crisis.resources.map((resource) => (
          <Button
            key={`${resource.label}-${resource.number}`}
            label={`${resource.label} · ${resource.number}`}
            variant="danger"
            accessibilityLabel={t('ayush.callSpoken', { label: resource.label, number: resource.number })}
            fullWidth
            onPress={() => void Linking.openURL(`tel:${resource.number.replace(/[^\d+]/g, '')}`)}
          />
        ))}
      </Card>
    );
  }
  const noteKey = REFUSAL_NOTE[reply.outcome];
  const note = noteKey ? t(noteKey) : null;
  return (
    <Card>
      <Text style={styles.answer}>{reply.answer}</Text>
      {note ? <Note tone="info">{note}</Note> : null}
      {reply.citations.length > 0 ? (
        <View style={styles.sources}>
          <Text style={styles.meta}>{t('ayush.sources')}</Text>
          {reply.citations.map((c) => (
            <Text key={`${c.sourceId}-${c.version}`} style={styles.meta}>{`${c.title} · v${c.version}${c.stale ? ` · ${t('ayush.mayBeOld')}` : ''}`}</Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/** Ask Ayush (design page 2: AyushChat). Answers come only from the server agent, with their sources. */
export const AyushChatNativeView = observer(function AyushChatNativeView({ viewModel: vm }: { viewModel: AyushViewModel }) {
  const t = useT();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Eyebrow>{t('ayush.eyebrow')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('ayush.title')}</Text>
      <Text style={styles.meta}>{t('ayush.intro')}</Text>
      <CrisisLinks />

      {vm.thread.length === 0 ? (
        <View style={styles.starters}>
          {STARTERS.map((key) => <Button key={key} label={t(key)} variant="secondary" fullWidth onPress={() => void vm.send(t(key))} />)}
        </View>
      ) : null}

      {vm.thread.map(({ question, reply }, index) => (
        <View key={`${vm.conversationId}-${index}`} style={styles.turn}>
          <Text style={styles.question}>{question}</Text>
          <ReplyCard reply={reply} />
        </View>
      ))}

      {vm.error ? <Note tone="danger">{t(vm.error)}</Note> : null}
      <TextField label={t('ayush.question')} value={vm.question} onChangeText={vm.setQuestion} hint={t('ayush.questionHint')} />
      <Button label={t('ayush.ask')} size="cta" fullWidth busy={vm.sending} disabled={!vm.canSend && !vm.sending} onPress={() => void vm.send()} />
    </ScrollView>
  );
});

export function AyushChatRoute(): React.ReactElement {
  const [vm] = useState(() => new AyushViewModel());
  return <AyushChatNativeView viewModel={vm} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 600, width: '100%', alignSelf: 'center' },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  meta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
  starters: { gap: space.s8 },
  turn: { gap: space.s8 },
  question: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
  answer: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text, lineHeight: font.size.body * font.lineHeight.body },
  sources: { gap: space.s4 },
});
