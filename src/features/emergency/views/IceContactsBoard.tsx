import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Chip, ErrorState, Note, PhoneInput, Sheet, Skeleton, TextField } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardCard, BoardRow, BoardScreen, BoardSection, Pill, boardText } from '@/design-system/board/BoardKit';
import { color, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { EmergencyCardViewModel, RELATIONS } from '../viewmodel/EmergencyCardViewModel';

export interface IceContactsLinks {
  back?: () => void;
}

/**
 * What an SOS actually sends the emergency contact (backend/services/emergency_api.py):
 * a WhatsApp message with the student's name, the time and the location they typed.
 * Messages carry no health data, so the clinical rows are "never".
 */
const WHAT_THEY_SEE: readonly { label: MessageKey; shared: boolean }[] = [
  { label: 'sf.ice.see.nameTime', shared: true },
  { label: 'sf.ice.see.location', shared: true },
  { label: 'sf.ice.see.blood', shared: false },
  { label: 'sf.ice.see.record', shared: false },
];

/** "+91 ·····4417": the last four digits, enough to recognise the number. */
function lastFour(digits: string): string {
  return digits.length === 10 ? `+91 ·····${digits.slice(6)}` : '';
}

/**
 * Emergency contacts (canvas page 2: IceContacts, Tier 1 — approved by Krishna
 * Chintakayala, 2026-10-21). The profile holds one emergency contact, so the
 * board's ordered list of three with roles (D6-6) is drawn as that one
 * contact; adding a second, ordering and roles wait for a backend and a
 * clinical decision on who receives what. "What they see" describes what the
 * SOS really sends, not the board's sample.
 */
export const IceContactsBoard = observer(function IceContactsBoard({ vm, links }: { vm: EmergencyCardViewModel; links: IceContactsLinks }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const s = vm.saved;
  const d = vm.draft;
  const has = Boolean(s && s.contactName && s.contactPhone.length === 10);
  const relationOf = (value: string) => ((RELATIONS as readonly string[]).includes(value) ? t(`ice.rel.${value}` as MessageKey) : value);

  const open = () => { vm.discard(); setEditing(true); };
  const close = () => { vm.discard(); setEditing(false); };
  const save = async () => {
    await vm.save();
    if (!vm.error) setEditing(false);
  };
  const missingName = Boolean(d && d.contactPhone && !d.contactName.trim());

  return (
    <BoardScreen testID="ice-contacts-board">
      <BoardHeader title={t('sf.ice.header')} backIcon="arrow-left" backLabel={t('common.back')} onBack={links.back} />
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={boardText.title}>{t('sf.ice.title')}</Text>
        <Text style={boardText.body}>{t('sf.ice.intro')}</Text>
      </View>

      {vm.loading ? <Skeleton label={t('ice.loading')} lines={['80%', '60%']} /> : null}
      {vm.loadFailed ? <ErrorState title={t('ice.failedTitle')} body={t('ice.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}

      {s ? (
        <BoardSection label={t('sf.ice.yourContact')}>
          {has ? (
            <BoardRow
              testID="ice-contact-row"
              title={s.contactName}
              meta={[s.contactRelation ? relationOf(s.contactRelation) : '', lastFour(s.contactPhone)].filter(Boolean).join(' · ')}
              accessibilityLabel={t('sf.ice.editLabel', { name: s.contactName })}
              onPress={open}
              trailing={<Icon name="chevron-right-2" size={size.navIcon} color={color.text3} />}
            >
              <View style={styles.rowTop}>
                <View style={styles.order}><Text style={styles.orderText}>{'1'}</Text></View>
                <Pill label={t('sf.ice.primary')} tone="neutral" />
              </View>
              <Text style={[boardText.meta, { color: color.positive }]}>{t('sf.ice.messagedFirst')}</Text>
            </BoardRow>
          ) : (
            <BoardCard testID="ice-empty">
              <Text style={boardText.strong}>{t('sf.ice.emptyTitle')}</Text>
              <Text style={boardText.body}>{t('sf.ice.emptyBody')}</Text>
            </BoardCard>
          )}
        </BoardSection>
      ) : null}

      {s ? (
        <View style={styles.told}>
          <Text style={[boardText.strong, { color: color.attention }]}>{t('sf.ice.notToldTitle')}</Text>
          <Text style={[boardText.body, { color: color.attention }]}>{t('sf.ice.notToldBody')}</Text>
        </View>
      ) : null}

      <BoardSection label={t('sf.ice.whatTheySee')}>
        <View style={styles.seeList}>
          {WHAT_THEY_SEE.map((row) => (
            <View key={row.label} style={styles.seeRow} accessible accessibilityLabel={`${t(row.label)}: ${row.shared ? t('sf.ice.yes') : t('sf.ice.never')}`}>
              <View style={[styles.dot, { backgroundColor: row.shared ? color.positive : color.text3 }]} />
              <Text style={[boardText.body, styles.flex, { color: color.text }]}>{t(row.label)}</Text>
              <Text style={[styles.verdict, { color: row.shared ? color.positive : color.text3 }]}>{row.shared ? t('sf.ice.yes') : t('sf.ice.never')}</Text>
            </View>
          ))}
        </View>
      </BoardSection>

      {s ? <Button label={has ? t('sf.ice.change') : t('sf.ice.add')} size="cta" fullWidth onPress={open} testID="ice-add" /> : null}
      {vm.notice && !editing ? <Note tone="positive">{t(vm.notice)}</Note> : null}
      <Text style={boardText.meta}>{t('sf.ice.footnote')}</Text>

      <Sheet visible={editing} title={has ? t('sf.ice.sheetTitleEdit') : t('sf.ice.sheetTitle')} onClose={close} busy={vm.saving} testID="ice-sheet">
        {d ? (
          <View style={styles.sheet}>
            <TextField label={t('ice.contactName')} value={d.contactName} onChangeText={(v) => vm.set('contactName', v)}
              error={missingName ? t('sf.ice.nameNeeded') : undefined} testID="ice-name" />
            <PhoneInput label={t('ice.contactPhone')} value={d.contactPhone} onChangeText={(v) => vm.set('contactPhone', v)}
              error={vm.phoneError ? t('ice.contactPhoneError') : undefined} testID="ice-phone" />
            <Text style={boardText.eyebrow}>{t('ice.relation')}</Text>
            <View role="radiogroup" accessibilityLabel={t('ice.relation')} style={styles.chips}>
              {RELATIONS.map((r) => (
                <Chip key={r} label={t(`ice.rel.${r}` as MessageKey)} selected={d.contactRelation === r} onPress={() => vm.set('contactRelation', r)} />
              ))}
            </View>
            <Text style={boardText.meta}>{t('sf.ice.sheetNote')}</Text>
            {vm.error ? <Note tone="danger">{t(vm.error)}</Note> : null}
            <Button label={t('sf.ice.save')} size="cta" fullWidth busy={vm.saving} disabled={(!vm.canSave || missingName) && !vm.saving} onPress={() => void save()} testID="ice-save" />
            <Button label={t('common.cancel')} variant="secondary" fullWidth onPress={close} />
          </View>
        ) : null}
      </Sheet>
    </BoardScreen>
  );
});

/** Route /ice-contacts: the signed-in student's own contact. */
export function IceContactsRoute({ links }: { links: IceContactsLinks }): React.ReactElement {
  const [vm] = useState(() => new EmergencyCardViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <IceContactsBoard vm={vm} links={links} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  intro: { gap: space.s8 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.s8, marginBottom: space.s2 },
  order: { width: space.s24, height: space.s24, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  orderText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  told: { gap: space.s6, backgroundColor: color.attentionBg, borderRadius: radius.xl, padding: space.s16 },
  seeList: { gap: space.s8 },
  seeRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: size.touchTarget, paddingHorizontal: space.s16, borderRadius: radius.lg, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  dot: { width: space.s8, height: space.s8, borderRadius: radius.full },
  verdict: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase' },
  sheet: { gap: space.s12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
});
