import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { Button, Note, TextField } from '@/design-system';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardRow, BoardScreen, BoardSection, Pill, boardText } from '@/design-system/board/BoardKit';
import type { BoardTone } from '@/design-system/board/BoardKit';
import { color, focusRing, font, radius, size, space } from '@/design-system/theme';
import { apiRequest } from '@/data/services/http';
import { useApiResource } from '@/hooks/api/useApiResource';
import type { SupportTicket } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { shortDate } from '@/features/phoneboards/format';

type HelpTopic = 'orders' | 'prescriptions' | 'records' | 'verify' | 'delete';

export interface HelpCentreLinks {
  back?: () => void;
  topic: Partial<Record<HelpTopic, () => void>>;
  crisis?: () => void;
  requests?: () => void;
  legal?: () => void;
}

const FAQS: readonly { key: HelpTopic; icon: SkIconName; tone: BoardTone; title: MessageKey; meta: MessageKey }[] = [
  { key: 'orders', icon: 'shopping-bag', tone: 'action', title: 'pb.help.q.orders', meta: 'pb.help.q.ordersMeta' },
  { key: 'prescriptions', icon: 'file', tone: 'attention', title: 'pb.help.q.rx', meta: 'pb.help.q.rxMeta' },
  { key: 'records', icon: 'lock-3', tone: 'positive', title: 'pb.help.q.records', meta: 'pb.help.q.recordsMeta' },
  { key: 'verify', icon: 'graduation-cap-3', tone: 'action', title: 'pb.help.q.verify', meta: 'pb.help.q.verifyMeta' },
  { key: 'delete', icon: 'trash', tone: 'danger', title: 'pb.help.q.delete', meta: 'pb.help.q.deleteMeta' },
];

const SUBJECT_MIN = 3;
const MESSAGE_MIN = 10;

type PressState = { pressed: boolean; focused?: boolean };

/**
 * Help centre (canvas page 2, HelpCentre, Tier 2): common questions (the search
 * filters them; there is no article index behind it), a message to support
 * (POST /support, the same tickets as the web panel) and crisis support, which
 * never waits for support. No reply time is promised: none is configured.
 */
export function HelpCentreBoard({ links }: { links: HelpCentreLinks }): React.ReactElement {
  const t = useT();
  const tickets = useApiResource<{ items: SupportTicket[] }>('/support');
  const [query, setQuery] = useState('');
  const [writing, setWriting] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const q = query.trim().toLowerCase();
  const faqs = FAQS.filter((f) => links.topic[f.key]).filter((f) => !q || `${t(f.title)} ${t(f.meta)}`.toLowerCase().includes(q));
  const canSend = subject.trim().length >= SUBJECT_MIN && message.trim().length >= MESSAGE_MIN && !busy;
  const send = () => {
    if (!canSend) return;
    setBusy(true);
    setError('');
    apiRequest('/support', { method: 'POST', body: JSON.stringify({ subject: subject.trim(), message: message.trim() }) })
      .then(() => { setSent(true); setWriting(false); setSubject(''); setMessage(''); tickets.reload(); }, (reason: Error) => setError(reason.message))
      .finally(() => setBusy(false));
  };

  return (
    <BoardScreen testID="help-centre">
      <BoardHeader title={t('pb.help.title')} backIcon="arrow-left" backLabel={t('common.back')} onBack={links.back} />
      <View style={styles.search}>
        <Icon name="search-2" size={size.navIcon} color={color.text3} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('pb.help.search')}
          placeholderTextColor={color.text3}
          accessibilityLabel={t('pb.help.search')}
          style={styles.searchInput}
          testID="help-search"
        />
      </View>

      <BoardSection label={t('pb.help.common')}>
        {faqs.length === 0 ? <Text style={boardText.body}>{t('pb.help.noMatch')}</Text> : null}
        {faqs.map((f) => (
          <BoardRow key={f.key} testID={`help-${f.key}`} icon={f.icon} tone={f.tone} title={t(f.title)} meta={t(f.meta)} onPress={links.topic[f.key]}
            trailing={<Icon name="chevron-right" size={size.navIcon - space.s2} color={color.text3} />} />
        ))}
      </BoardSection>

      <BoardSection label={t('pb.help.stuck')}>
        <View style={styles.pair}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('pb.help.message')} onPress={() => { setWriting(true); setSent(false); }} testID="help-message"
            style={({ focused }: PressState) => [styles.half, focused ? focusRing : null]}>
            <View style={[styles.tile, { backgroundColor: color.surface3 }]}><Icon name="message-circle-3" size={size.navIcon} color={color.action} /></View>
            <Text style={boardText.strong}>{t('pb.help.message')}</Text>
            <Text style={boardText.meta}>{t('pb.help.messageMeta')}</Text>
          </Pressable>
          {links.crisis ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t('pb.help.crisis')} onPress={links.crisis} testID="help-crisis"
              style={({ focused }: PressState) => [styles.half, styles.crisis, focused ? focusRing : null]}>
              <View style={[styles.tile, { backgroundColor: color.dangerBg }]}><Icon name="shield-2" size={size.navIcon} color={color.danger} /></View>
              <Text style={boardText.strong}>{t('pb.help.crisis')}</Text>
              <Text style={boardText.meta}>{t('pb.help.crisisMeta')}</Text>
            </Pressable>
          ) : null}
        </View>
        {writing ? (
          <View style={styles.form} testID="help-form">
            <TextField label={t('member.support.subject')} value={subject} onChangeText={setSubject} maxLength={160} />
            <TextField label={t('member.support.message')} value={message} onChangeText={setMessage} maxLength={2000} />
            <Text style={boardText.meta}>{t('pb.help.formNote')}</Text>
            {error ? <Note tone="danger">{error}</Note> : null}
            <Button label={t('member.support.send')} fullWidth busy={busy} disabled={!canSend && !busy} onPress={send} />
          </View>
        ) : null}
        {sent ? <Note tone="positive">{t('pb.help.sent')}</Note> : null}
      </BoardSection>

      {tickets.data?.items.length ? (
        <BoardSection label={t('pb.help.yours')}>
          {tickets.data.items.map((ticket) => (
            <BoardRow key={ticket.id} title={ticket.subject} meta={shortDate(ticket.createdAt)}
              trailing={<Pill label={ticket.status === 'OPEN' ? t('pb.help.open') : t('pb.help.resolved')} tone={ticket.status === 'OPEN' ? 'action' : 'positive'} />} />
          ))}
        </BoardSection>
      ) : null}

      <View style={styles.note}>
        <Icon name="help-circle-2" size={size.navIcon} color={color.action} />
        <Text style={[boardText.body, styles.flex]}>{t('pb.help.scope')}</Text>
      </View>

      <View style={styles.footLinks}>
        {links.requests ? <FootLink label={t('pb.more.requests')} onPress={links.requests} /> : null}
        {links.legal ? <FootLink label={t('pb.help.legal')} onPress={links.legal} /> : null}
      </View>
    </BoardScreen>
  );
}

function FootLink({ label, onPress }: { label: string; onPress: () => void }): React.ReactElement {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress}
      style={({ focused }: PressState) => [styles.foot, focused ? focusRing : null]}>
      <Text style={[boardText.strong, styles.flex]}>{label}</Text>
      <Icon name="chevron-right" size={size.navIcon - space.s2} color={color.action} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.s10, minHeight: size.control, borderRadius: radius.lg, backgroundColor: color.surface2, paddingHorizontal: space.s16 },
  searchInput: { flex: 1, minHeight: size.touchTarget, fontFamily: font.family.sans, fontSize: font.size.body, color: color.text },
  pair: { flexDirection: 'row', gap: space.s12 },
  half: { flex: 1, gap: space.s6, backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, padding: space.s16, minHeight: size.touchTarget },
  crisis: { borderColor: color.dangerRule },
  tile: { width: size.touchTarget - space.s4, height: size.touchTarget - space.s4, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: space.s6 },
  form: { gap: space.s12, backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, padding: space.s16 },
  note: { flexDirection: 'row', gap: space.s12, backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, padding: space.s16 },
  footLinks: { gap: space.s10 },
  foot: { flexDirection: 'row', alignItems: 'center', minHeight: size.control, backgroundColor: color.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: color.ruleSoft, paddingHorizontal: space.s16 },
});
