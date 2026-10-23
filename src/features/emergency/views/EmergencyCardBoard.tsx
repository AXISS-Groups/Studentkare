import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Chip, ErrorState, Note, Sheet, Skeleton, TextField, useOnline } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardScreen, TextLink, boardText } from '@/design-system/board/BoardKit';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { initialsOf } from '@/features/account/views/StudentProfileBoard';
import { BLOOD_GROUPS, EmergencyCardViewModel, RELATIONS, splitList } from '../viewmodel/EmergencyCardViewModel';
import type { BloodGroup } from '../viewmodel/EmergencyCardViewModel';

export interface EmergencyCardLinks {
  /** Expo: the stack's back. In the web frame back is the browser's. */
  back?: () => void;
  /** The emergency contacts board (IceContacts). */
  contacts: () => void;
  /** "Nearest hospitals": Find care on the Hospitals tab (plan tier1-care-directory-2026-10-21 §3). */
  nearestHospitals?: () => void;
}

type PressState = { pressed: boolean; focused?: boolean };

/** Blood groups read as words ("O positive"): a symbol alone is easy to misread or mis-hear. */
export const BLOOD_WORDS: Record<Exclude<BloodGroup, ''>, MessageKey> = {
  'A+': 'sf.blood.aPos', 'A-': 'sf.blood.aNeg', 'B+': 'sf.blood.bPos', 'B-': 'sf.blood.bNeg',
  'O+': 'sf.blood.oPos', 'O-': 'sf.blood.oNeg', 'AB+': 'sf.blood.abPos', 'AB-': 'sf.blood.abNeg',
};

/** The visible mobile number with the middle hidden (the card can be open on a lock screen). */
export function maskMobile(digits: string): string {
  if (digits.length !== 10) return '';
  return `+91 ${digits.slice(0, 2)}••• ••${digits.slice(7)}`;
}

type FactTone = 'plain' | 'alert' | 'warn';

function Fact({ label, value, tone, big = false, testID }: { label: string; value: string; tone: FactTone; big?: boolean; testID?: string }) {
  return (
    <View testID={testID} accessible accessibilityLabel={`${label}: ${value}`} style={[styles.fact, tone === 'alert' ? styles.factAlert : tone === 'warn' ? styles.factWarn : null]}>
      <Text style={boardText.eyebrow}>{label}</Text>
      <Text style={[styles.factValue, big ? styles.factBig : null, { color: tone === 'alert' ? color.danger : tone === 'warn' ? color.attention : color.clinicalValue }]}>{value}</Text>
    </View>
  );
}

/** Call 112 — red (founder rule: red for SOS and emergency calls), on every state of the card. */
export function Call112Button({ testID = 'card-call-112' }: { testID?: string }): React.ReactElement {
  const t = useT();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={t('crisis.call112Spoken')}
      onPress={() => void Linking.openURL('tel:112')}
      style={({ focused }: PressState) => [styles.call112, focused ? focusRing : null]}
    >
      <Icon name="phone-2" size={size.navIcon} color={color.onDangerFill} />
      <Text style={styles.call112Text}>{t('crisis.call112')}</Text>
    </Pressable>
  );
}

/**
 * The phone emergency card (canvas page 2: EmergencyCard, Tier 1 — approved
 * by Krishna Chintakayala, 2026-10-21). Everything on it is the student's own
 * profile (GET/PATCH /api/profile) through EmergencyCardViewModel.
 *
 * Not drawn, on purpose (decision D6-2): the board's "OFFLINE · stored on this
 * phone, works without unlocking" promise. Keeping blood group and allergies
 * on the device needs a guardrail-9 exception nobody has signed, so the card
 * loads from the server and says so. Also not drawn: the ABHA number and
 * "current medicines" (no such profile fields) and "No known allergies" (the
 * server cannot tell it from "not recorded"). Call 112 works with no data.
 */
export const EmergencyCardBoard = observer(function EmergencyCardBoard({ vm, links }: { vm: EmergencyCardViewModel; links: EmergencyCardLinks }) {
  const t = useT();
  const online = useOnline();
  const [editing, setEditing] = useState(false);
  const [draftAllergy, setDraftAllergy] = useState('');
  const s = vm.saved;
  const d = vm.draft;
  const owner = vm.owner;

  const openEdit = () => { vm.discard(); setDraftAllergy(''); setEditing(true); };
  const closeEdit = () => { vm.discard(); setEditing(false); };
  const save = async () => {
    await vm.save();
    if (!vm.error) setEditing(false);
  };
  const allergies = d ? splitList(d.allergies) : [];
  const addAllergy = () => {
    const next = draftAllergy.trim();
    if (!next || !d) return;
    vm.set('allergies', [...allergies, next].join(', '));
    setDraftAllergy('');
  };

  const savedAllergies = s ? splitList(s.allergies) : [];
  const savedConditions = s ? splitList(s.conditions) : [];
  const contactDigits = s?.contactPhone ?? '';
  const relation = s?.contactRelation && (RELATIONS as readonly string[]).includes(s.contactRelation) ? t(`ice.rel.${s.contactRelation}` as MessageKey) : s?.contactRelation ?? '';

  return (
    <BoardScreen testID="emergency-card-board">
      <BoardHeader title={t('sf.card.title')} backIcon="arrow-left" backLabel={t('common.back')} onBack={links.back} />
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.alsoHere}>{t('sf.alsoHere')}</Text>
          <Pressable testID="card-open-contacts" accessibilityRole="link" accessibilityLabel={t('sf.card.contactsLink')} onPress={links.contacts}
            style={({ focused }: PressState) => [styles.alsoChip, focused ? focusRing : null]}>
            <Text style={styles.alsoChipText}>{t('sf.card.contactsLink')}</Text>
          </Pressable>
        </View>
        <View style={styles.introRow}>
          <Text style={[styles.heroIntro, styles.flex]}>{t('sf.card.intro')}</Text>
          {s ? (
            <Pressable testID="card-edit" accessibilityRole="button" accessibilityLabel={t('sf.card.editLabel')} onPress={openEdit}
              style={({ focused }: PressState) => [styles.editPill, focused ? focusRing : null]}>
              <Text style={styles.editPillText}>{t('sf.card.edit')}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.card}>
          {vm.loading ? <Skeleton label={t('ice.loading')} lines={['60%', '90%', '75%']} /> : null}
          {vm.loadFailed && !online ? (
            <View testID="card-offline" role="status" style={styles.offline}>
              <Icon name="wifi-off" size={size.navIcon} color={color.attention} />
              <View style={styles.flex}>
                <Text style={[boardText.strong, { color: color.attention }]}>{t('sf.card.offlineTitle')}</Text>
                <Text style={[boardText.body, { color: color.attention }]}>{t('sf.card.offlineBody')}</Text>
              </View>
            </View>
          ) : null}
          {vm.loadFailed ? <ErrorState title={t('ice.failedTitle')} body={t('ice.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}

          {s && owner ? (
            <>
              <View style={styles.who}>
                <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <Text style={styles.avatarText}>{initialsOf(owner.name)}</Text>
                </View>
                <View style={styles.flex}>
                  <Text accessibilityRole="header" style={styles.whoName}>{owner.name}</Text>
                  {owner.campus || owner.hostel ? <Text style={boardText.meta}>{[owner.campus, owner.hostel].filter(Boolean).join(' · ')}</Text> : null}
                </View>
              </View>

              {!s.bloodGroup ? (
                <View testID="card-missing-blood" style={styles.missing}>
                  <View style={styles.missingDot} />
                  <Text style={[boardText.body, styles.flex, { color: color.attention }]}>{t('sf.card.missingBlood')}</Text>
                  <TextLink label={t('sf.card.add')} onPress={openEdit} accessibilityLabel={t('sf.card.addBlood')} />
                </View>
              ) : null}

              <View style={styles.facts}>
                <Fact testID="card-blood" label={t('sf.card.blood')} value={s.bloodGroup ? t(BLOOD_WORDS[s.bloodGroup]) : t('sf.card.notSet')} tone={s.bloodGroup ? 'plain' : 'warn'} big={Boolean(s.bloodGroup)} />
                <Fact testID="card-allergies" label={t('sf.card.allergies')} value={savedAllergies.length ? savedAllergies.join(', ') : t('ice.notRecorded')} tone={savedAllergies.length ? 'alert' : 'plain'} />
                <Fact testID="card-conditions" label={t('sf.card.conditions')} value={savedConditions.length ? savedConditions.join(', ') : t('ice.noneRecorded')} tone="plain" />
              </View>

              <View style={styles.rule} />
              <Text accessibilityRole="header" style={boardText.eyebrow}>{t('sf.card.unresponsive')}</Text>
              {s.contactName && contactDigits.length === 10 ? (
                <Pressable testID="card-call-contact" accessibilityRole="button"
                  accessibilityLabel={t('sf.card.callContact', { name: s.contactName })}
                  onPress={() => void Linking.openURL(`tel:+91${contactDigits}`)}
                  style={({ focused }: PressState) => [styles.contact, focused ? focusRing : null]}>
                  <View style={styles.contactTile}><Icon name="phone-2" size={space.s16} color={color.action} /></View>
                  <View style={styles.flex}>
                    <Text style={boardText.strong}>{s.contactName}</Text>
                    <Text style={boardText.meta}>{relation ? t('sf.card.contactRole', { relation }) : t('sf.card.contactRolePlain')}</Text>
                  </View>
                  <Text style={styles.contactNumber}>{maskMobile(contactDigits)}</Text>
                </Pressable>
              ) : (
                <View testID="card-no-contact" style={styles.noContact}>
                  <Text style={boardText.body}>{t('sf.card.noContact')}</Text>
                  <TextLink label={t('sf.card.addContact')} onPress={links.contacts} />
                </View>
              )}
            </>
          ) : null}
        </View>

        {vm.notice && !editing ? (
          <View role="status" style={styles.saved}>
            <Icon name="check-2" size={space.s16} color={color.positive} />
            <Text style={[boardText.body, { color: color.positive }]}>{t(vm.notice)}</Text>
          </View>
        ) : null}

        <Call112Button />
        {links.nearestHospitals ? (
          <TextLink label={t('fc.nearestHospitals')} onPress={links.nearestHospitals} accessibilityLabel={t('fc.nearestHospitalsSpoken')} testID="card-find-care" />
        ) : null}
        <Text style={styles.footnote}>{t('sf.card.footnote')}</Text>
      </View>

      <Sheet visible={editing} title={t('sf.card.editTitle')} onClose={closeEdit} busy={vm.saving} testID="card-edit-sheet">
        {d ? (
          <View style={styles.sheet}>
            <Text style={boardText.eyebrow}>{t('sf.card.blood')}</Text>
            <View role="radiogroup" accessibilityLabel={t('sf.card.blood')} style={styles.chips}>
              {BLOOD_GROUPS.map((g) => (
                <Chip key={g || 'none'} label={g ? g : t('sf.card.notSet')} selected={d.bloodGroup === g} onPress={() => vm.set('bloodGroup', g)} testID={`card-blood-${g || 'none'}`} />
              ))}
            </View>
            <Text style={boardText.meta}>{t('ice.bloodHint')}</Text>

            <Text style={boardText.eyebrow}>{t('sf.card.allergies')}</Text>
            {allergies.length ? (
              <View style={styles.chips}>
                {allergies.map((a, i) => (
                  <Pressable key={`${a}-${i}`} accessibilityRole="button" accessibilityLabel={t('sf.card.removeAllergy', { name: a })}
                    onPress={() => vm.set('allergies', allergies.filter((_, j) => j !== i).join(', '))}
                    style={({ focused }: PressState) => [styles.allergyChip, focused ? focusRing : null]}>
                    <Text style={styles.allergyText}>{a}</Text>
                    <Icon name="x" size={space.s14} color={color.danger} />
                  </Pressable>
                ))}
              </View>
            ) : <Text style={boardText.meta}>{t('sf.card.noAllergiesYet')}</Text>}
            <View style={styles.addRow}>
              <TextInput
                accessibilityLabel={t('sf.card.addAllergyLabel')}
                placeholder={t('sf.card.addAllergyPlaceholder')}
                placeholderTextColor={color.text3}
                value={draftAllergy}
                onChangeText={setDraftAllergy}
                onSubmitEditing={addAllergy}
                style={styles.addInput}
                testID="card-allergy-input"
              />
              <Button label={t('sf.card.addAllergy')} variant="secondary" onPress={addAllergy} disabled={!draftAllergy.trim()} />
            </View>

            <TextField label={t('ice.conditions')} hint={t('ice.conditionsHint')} value={d.conditions} onChangeText={(v) => vm.set('conditions', v)} />
            <TextLink label={t('sf.card.editContacts')} onPress={() => { closeEdit(); links.contacts(); }} />
            {vm.error ? <Note tone="danger">{t(vm.error)}</Note> : null}
            <Button label={t('sf.card.save')} size="cta" fullWidth busy={vm.saving} disabled={!vm.canSave && !vm.saving} onPress={() => void save()} testID="card-save" />
            <Button label={t('common.cancel')} variant="secondary" fullWidth onPress={closeEdit} />
          </View>
        ) : null}
      </Sheet>
    </BoardScreen>
  );
});

/** Route /emergency-card at phone width: the card for the signed-in student. */
export function EmergencyCardRoute({ links }: { links: EmergencyCardLinks }): React.ReactElement {
  const [vm] = useState(() => new EmergencyCardViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <EmergencyCardBoard vm={vm} links={links} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  hero: { backgroundColor: color.heroBg, borderRadius: radius.sheet, padding: space.s16, gap: space.s14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space.s8, flexWrap: 'wrap' },
  alsoHere: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.onHeroLabel },
  alsoChip: { minHeight: size.touchTarget, justifyContent: 'center', paddingHorizontal: space.s12, borderRadius: radius.md, backgroundColor: color.onHeroVeil },
  alsoChipText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  editPill: { minHeight: size.touchTarget, minWidth: size.touchTarget, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.s16, borderRadius: radius.full, backgroundColor: color.heroCurrent },
  editPillText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHeroCurrent },
  introRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12 },
  heroIntro: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.onHero2, lineHeight: font.size.bodySm * font.lineHeight.body },
  card: { backgroundColor: color.surface, borderRadius: radius.xl, padding: space.s16, gap: space.s14 },
  offline: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s10, backgroundColor: color.attentionBg, borderRadius: radius.md, padding: space.s12 },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  avatar: { width: space.s40 + space.s16, height: space.s40 + space.s16, borderRadius: radius.full, backgroundColor: color.action, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onAction },
  whoName: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  missing: { flexDirection: 'row', alignItems: 'center', gap: space.s10, backgroundColor: color.attentionBg, borderRadius: radius.md, borderWidth: 1, borderColor: color.attention, paddingLeft: space.s12, paddingRight: space.s4 },
  missingDot: { width: space.s8, height: space.s8, borderRadius: radius.full, backgroundColor: color.attention },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s10 },
  fact: { flexGrow: 1, flexBasis: '45%', gap: space.s4, padding: space.s12, borderRadius: radius.md, backgroundColor: color.surface2, borderWidth: 1, borderColor: color.ruleSoft },
  factAlert: { backgroundColor: color.dangerBg, borderColor: color.dangerRule },
  factWarn: { backgroundColor: color.attentionBg, borderColor: color.attention, borderStyle: 'dashed' },
  factValue: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), lineHeight: font.size.bodySm * font.lineHeight.body },
  factBig: { fontFamily: font.family.mono, fontSize: font.size.titleSm },
  rule: { height: 1, backgroundColor: color.ruleSoft },
  contact: { flexDirection: 'row', alignItems: 'center', gap: space.s12, minHeight: size.touchTarget, padding: space.s12, borderRadius: radius.md, borderWidth: 1, borderColor: color.ruleSoft, backgroundColor: color.surface2 },
  contactTile: { width: space.s32, height: space.s32, borderRadius: radius.md, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  contactNumber: { fontFamily: font.family.mono, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.action },
  noContact: { gap: space.s4 },
  saved: { flexDirection: 'row', alignItems: 'center', gap: space.s8, backgroundColor: color.positiveBg, borderRadius: radius.md, padding: space.s12 },
  call112: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s10, minHeight: size.controlLg, borderRadius: radius.full, backgroundColor: color.dangerFill },
  call112Text: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onDangerFill },
  footnote: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.onHero2, textAlign: 'center', lineHeight: font.size.caption * font.lineHeight.body },
  sheet: { gap: space.s12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  allergyChip: { flexDirection: 'row', alignItems: 'center', gap: space.s6, minHeight: size.touchTarget, paddingHorizontal: space.s12, borderRadius: radius.md, backgroundColor: color.dangerBg },
  allergyText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.danger },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  addInput: { flex: 1, minHeight: size.control, borderWidth: 1, borderColor: color.rule, borderRadius: radius.lg, paddingHorizontal: space.s12, fontFamily: font.family.sans, fontSize: font.size.body, color: color.text, backgroundColor: color.surface },
});
