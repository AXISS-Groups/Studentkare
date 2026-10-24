import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Chip, ErrorState, Note, OfflineBanner, Sheet, Skeleton, TextField, useOnline } from '@/design-system';
import { Icon } from '@/design-system/icons';
import {
  Gradient, M2Card, M2Grid, M2Header, M2Heading, M2ListRow, M2PageHero, M2Tile3d, M2WideColumn, NAVY_STOPS, ProgressRing, cardLabel, m2Text, useOwnPhoneChrome,
} from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { EMERGENCY_NUMBER } from '@/design-system/CrisisLinks';
import { BLOOD_GROUPS, EmergencyCardViewModel, RELATIONS, isValidIndianMobile, splitList } from '../viewmodel/EmergencyCardViewModel';
import type { BloodGroup, EmergencyCardDraft, EmergencyCardOwner } from '../viewmodel/EmergencyCardViewModel';
import { WalletPassSection } from './WalletPassPanel';

export interface EmergencyCardLinks {
  /** Expo: the stack's back. In the web frame back is the browser's. */
  back?: () => void;
  /** The emergency contacts board (IceContacts). */
  contacts: () => void;
  /** "Nearest hospitals": Find care on the Hospitals tab (plan tier1-care-directory-2026-10-21 §3). */
  nearestHospitals?: () => void;
}

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

/** What a responder needs first, computed from the card being edited (never a guess). */
export function readiness(draft: EmergencyCardDraft): { checks: Array<{ key: MessageKey; done: boolean }>; percent: number } {
  const checks = [
    { key: 'swt.ice.check.blood' as MessageKey, done: draft.bloodGroup !== '' },
    { key: 'swt.ice.check.contact' as MessageKey, done: draft.contactName.trim() !== '' && isValidIndianMobile(draft.contactPhone) },
  ];
  const done = checks.filter((check) => check.done).length;
  return { checks, percent: Math.round((done / checks.length) * 100) };
}

const PERCENT = 100;

/** Call 112 — red (founder rule: red for SOS and emergency calls), on every state of the card. */
export function Call112Button({ testID = 'card-call-112', compact = false }: { testID?: string; compact?: boolean }): React.ReactElement {
  const t = useT();
  return (
    <Pressable
      testID={testID}
      role="button"
      accessibilityRole="button"
      accessibilityLabel={t('crisis.call112Spoken')}
      aria-label={t('crisis.call112Spoken')}
      onPress={() => void Linking.openURL(`tel:${EMERGENCY_NUMBER}`)}
      style={({ focused }: PressState) => [styles.call112, compact ? styles.call112Compact : null, focused ? focusRing : null]}
    >
      <Icon name="phone-2" size={size.navIcon} color={color.onDangerFill} />
      <Text style={styles.call112Text}>{t('crisis.call112')}</Text>
    </Pressable>
  );
}

/**
 * The card face (canvas T1EmergencyCard): identity strip on the navy, blood
 * group in words, long-term conditions, allergies as red chips, and the
 * contact to call with the middle of the number hidden. The phone draws the
 * saved card; the desktop draws the draft live beside the editor.
 */
export function EmergencyCardFace({ card, owner, onEdit, onAddBlood, onAddContact, live = false, testID = 'card-face' }: {
  card: EmergencyCardDraft; owner: EmergencyCardOwner | null; onEdit?: () => void; onAddBlood?: () => void; onAddContact?: () => void;
  /** Drawn from the draft (desktop preview): no call button, the number shown in full once valid. */
  live?: boolean; testID?: string;
}) {
  const t = useT();
  const allergies = splitList(card.allergies);
  const conditions = splitList(card.conditions);
  const digits = card.contactPhone.replace(/\D/g, '');
  const hasContact = card.contactName.trim() !== '' && isValidIndianMobile(digits);
  const relation = card.contactRelation && (RELATIONS as readonly string[]).includes(card.contactRelation) ? t(`ice.rel.${card.contactRelation}` as MessageKey) : card.contactRelation;
  const place = owner ? [owner.campus, owner.hostel].filter(Boolean).join(' · ') : '';
  return (
    <View style={styles.face} testID={testID}>
      <Gradient colors={NAVY_STOPS} angle={150} style={styles.faceHead}>
        <View pointerEvents="none" style={styles.faceRing} />
        <View style={styles.grow}>
          <M2Heading style={styles.faceName}>{owner?.name || t('swt.ice.you')}</M2Heading>
          {place ? <Text style={styles.facePlace}>{place}</Text> : null}
        </View>
        {onEdit ? (
          <Pressable testID="card-edit" role="button" accessibilityRole="button" accessibilityLabel={t('sf.card.editLabel')} aria-label={t('sf.card.editLabel')} onPress={onEdit}
            style={({ focused }: PressState) => [styles.editPill, focused ? focusRing : null]}>
            <Icon name="pencil" size={14} color={color.onHero} strokeWidth={2.4} />
            <Text style={styles.editPillText}>{t('sf.card.edit')}</Text>
          </Pressable>
        ) : null}
      </Gradient>
      <View style={styles.faceBody}>
        {!card.bloodGroup && onAddBlood ? (
          <View testID="card-missing-blood" style={styles.missing}>
            <Icon name="alert-triangle" size={16} color={color.attention} />
            <Text style={[m2Text.body, styles.grow, { color: color.attention }]}>{t('sf.card.missingBlood')}</Text>
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('sf.card.addBlood')} aria-label={t('sf.card.addBlood')} onPress={onAddBlood}
              style={({ focused }: PressState) => [styles.inlineLink, focused ? focusRing : null]}>
              <Text style={m2Text.link}>{t('sf.card.add')}</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.facts}>
          <View style={styles.fact} testID="card-blood" accessible {...cardLabel(`${t('sf.card.blood')}: ${card.bloodGroup ? t(BLOOD_WORDS[card.bloodGroup]) : t('sf.card.notSet')}`)}>
            <Text style={styles.factLabel}>{t('sf.card.blood')}</Text>
            <Text style={[styles.factValue, card.bloodGroup ? styles.factBig : styles.factWarn]}>{card.bloodGroup ? t(BLOOD_WORDS[card.bloodGroup]) : t('sf.card.notSet')}</Text>
          </View>
          <View style={styles.fact} testID="card-conditions" accessible {...cardLabel(`${t('sf.card.conditions')}: ${conditions.length ? conditions.join(', ') : t('ice.noneRecorded')}`)}>
            <Text style={styles.factLabel}>{t('sf.card.conditions')}</Text>
            <Text style={styles.factValue}>{conditions.length ? conditions.join(', ') : t('ice.noneRecorded')}</Text>
          </View>
        </View>
        <View testID="card-allergies" accessible {...cardLabel(`${t('sf.card.allergies')}: ${allergies.length ? allergies.join(', ') : t('ice.notRecorded')}`)}>
          <Text style={styles.factLabel}>{t('sf.card.allergies')}</Text>
          {allergies.length ? (
            <View style={styles.chips}>
              {allergies.map((a, i) => <View key={`${a}-${i}`} style={styles.allergyChip}><Text style={styles.allergyText}>{a}</Text></View>)}
            </View>
          ) : <Text style={styles.factValue}>{t('ice.notRecorded')}</Text>}
        </View>
        <View style={styles.rule} />
        <Text style={styles.factLabel}>{t('sf.card.unresponsive')}</Text>
        {hasContact ? (
          <View style={styles.contact} testID="card-contact">
            <M2Tile3d icon="user" hue="rose" size={44} />
            <View style={styles.grow}>
              <Text style={m2Text.cardTitle}>{card.contactName.trim()}</Text>
              <Text style={m2Text.meta}>{`${relation ? t('sf.card.contactRole', { relation }) : t('sf.card.contactRolePlain')} · ${live ? `+91 ${digits}` : maskMobile(digits)}`}</Text>
            </View>
            {live ? null : (
              <Pressable testID="card-call-contact" role="button" accessibilityRole="button"
                accessibilityLabel={t('sf.card.callContact', { name: card.contactName.trim() })} aria-label={t('sf.card.callContact', { name: card.contactName.trim() })}
                onPress={() => void Linking.openURL(`tel:+91${digits}`)}
                style={({ focused }: PressState) => [styles.callRound, focused ? focusRing : null]}>
                <Icon name="phone-2" size={18} color={color.onDangerFill} />
              </Pressable>
            )}
          </View>
        ) : (
          <View testID="card-no-contact" style={styles.noContact}>
            <Text style={m2Text.body}>{live ? t('swt.ice.noContact') : t('sf.card.noContact')}</Text>
            {onAddContact ? (
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('sf.card.addContact')} aria-label={t('sf.card.addContact')} onPress={onAddContact}
                style={({ focused }: PressState) => [styles.inlineLink, focused ? focusRing : null]}>
                <Text style={m2Text.link}>{t('sf.card.addContact')}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

/** The editor's fields: the same six profile fields at every width, on the same view-model. */
const Editor = observer(function Editor({ vm, disabled, testID = 'card-editor' }: { vm: EmergencyCardViewModel; disabled: boolean; testID?: string }) {
  const t = useT();
  const [draftAllergy, setDraftAllergy] = useState('');
  const d = vm.draft;
  if (!d) return null;
  const allergies = splitList(d.allergies);
  const addAllergy = () => {
    const next = draftAllergy.trim().replace(/,/g, ' ');
    if (!next || allergies.some((a) => a.toLowerCase() === next.toLowerCase())) { setDraftAllergy(''); return; }
    vm.set('allergies', [...allergies, next].join(', '));
    setDraftAllergy('');
  };
  const relationLabel = (value: string) => ((RELATIONS as readonly string[]).includes(value) ? t(`ice.rel.${value}` as MessageKey) : value);
  return (
    <View style={styles.editor} testID={testID} {...(Platform.OS === 'web' ? { role: 'form', 'aria-label': t('swt.ice.editorLabel') } : {})}>
      <Text style={styles.fieldLabel}>{t('sf.card.blood')}</Text>
      <View role="radiogroup" accessibilityLabel={t('sf.card.blood')} aria-label={t('sf.card.blood')} style={styles.chips}>
        {BLOOD_GROUPS.map((g) => (
          <Chip key={g || 'none'} label={g ? g : t('sf.card.notSet')} selected={d.bloodGroup === g} disabled={disabled} onPress={() => vm.set('bloodGroup', g)} testID={`card-blood-${g || 'none'}`} />
        ))}
      </View>
      <Text style={m2Text.meta}>{t('ice.bloodHint')}</Text>

      <Text style={styles.fieldLabel}>{t('sf.card.allergies')}</Text>
      {allergies.length ? (
        <View style={styles.chips}>
          {allergies.map((a, i) => (
            <Pressable key={`${a}-${i}`} role="button" accessibilityRole="button" accessibilityLabel={t('sf.card.removeAllergy', { name: a })} aria-label={t('sf.card.removeAllergy', { name: a })}
              disabled={disabled} onPress={() => vm.set('allergies', allergies.filter((_, j) => j !== i).join(', '))}
              style={({ focused }: PressState) => [styles.allergyChip, styles.allergyChipEdit, focused ? focusRing : null]}>
              <Text style={styles.allergyText}>{a}</Text>
              <Icon name="x" size={14} color={color.danger} strokeWidth={2.6} />
            </Pressable>
          ))}
        </View>
      ) : <Text style={m2Text.meta}>{t('sf.card.noAllergiesYet')}</Text>}
      <View style={styles.addRow}>
        <TextInput
          accessibilityLabel={t('sf.card.addAllergyLabel')}
          aria-label={t('sf.card.addAllergyLabel')}
          placeholder={t('sf.card.addAllergyPlaceholder')}
          placeholderTextColor={color.text3}
          value={draftAllergy}
          editable={!disabled}
          onChangeText={setDraftAllergy}
          onSubmitEditing={addAllergy}
          onBlur={addAllergy}
          style={styles.addInput}
          testID="card-allergy-input"
        />
        <Button label={t('sf.card.addAllergy')} variant="secondary" onPress={addAllergy} disabled={disabled || !draftAllergy.trim()} />
      </View>
      <Text style={m2Text.meta}>{t('swt.ice.allergyHint')}</Text>

      <TextField label={t('ice.conditions')} hint={t('ice.conditionsHint')} placeholder={t('swt.ice.conditionsPlaceholder')} value={d.conditions} disabled={disabled} onChangeText={(v) => vm.set('conditions', v)} />

      <View style={styles.rule} />
      <M2Heading style={m2Text.section}>{t('swt.ice.contactTitle')}</M2Heading>
      <TextField label={t('ice.contactName')} value={d.contactName} disabled={disabled} onChangeText={(v) => vm.set('contactName', v)} testID="card-contact-name" />
      <TextField label={t('ice.contactPhone')} value={d.contactPhone} disabled={disabled} keyboardType="phone-pad" placeholder={t('swt.ice.phonePlaceholder')} mono maxLength={10}
        error={vm.phoneError ? t('ice.contactPhoneError') : undefined} onChangeText={(v) => vm.set('contactPhone', v.replace(/\D/g, ''))} testID="card-contact-phone" />
      <Text style={styles.fieldLabel}>{t('ice.relation')}</Text>
      <View role="radiogroup" accessibilityLabel={t('ice.relation')} aria-label={t('ice.relation')} style={styles.chips}>
        {RELATIONS.map((r) => <Chip key={r} label={relationLabel(r)} selected={d.contactRelation === r} disabled={disabled} onPress={() => vm.set('contactRelation', r)} testID={`card-relation-${r}`} />)}
      </View>
      <Text style={m2Text.meta}>{t('swt.ice.oneContact')}</Text>
    </View>
  );
});

/** Readiness (desktop side column): the ring and the two checks, from the draft being edited. */
function Readiness({ draft }: { draft: EmergencyCardDraft }) {
  const t = useT();
  const ready = readiness(draft);
  return (
    <M2Card style={styles.sideCard} testID="card-readiness">
      <View style={styles.readyHead}>
        <View accessible accessibilityLabel={t('swt.ice.readyLabel')} aria-label={t('swt.ice.readyLabel')} {...(Platform.OS === 'web' ? { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': PERCENT, 'aria-valuenow': ready.percent } : {})}>
          <ProgressRing value={ready.percent / PERCENT} centre="" size={64} tone={color.positive} track={color.surface3} />
          <View style={styles.readyIcon} pointerEvents="none"><Icon name="check-2" size={20} color={color.positive} /></View>
        </View>
        <View style={styles.grow}>
          <M2Heading style={m2Text.section}>{t('swt.ice.ready', { percent: ready.percent })}</M2Heading>
          <Text style={m2Text.meta}>{t('swt.ice.readyLabel')}</Text>
        </View>
      </View>
      {ready.checks.map((check) => (
        <View key={check.key} style={styles.checkRow} accessible {...cardLabel(`${t(check.key)}: ${check.done ? t('swt.ice.done') : t('swt.ice.todo')}`)}>
          <View style={[styles.checkDot, check.done ? styles.checkDotDone : null]}>
            <Icon name={check.done ? 'check' : 'circle'} size={14} color={check.done ? color.onAction : color.text3} strokeWidth={2.8} />
          </View>
          <Text style={[m2Text.body, styles.grow, { color: color.text }]}>{t(check.key)}</Text>
        </View>
      ))}
    </M2Card>
  );
}

/**
 * The emergency card, one view at every width (canvas page 2 EmergencyCard,
 * approved 2026-10-21; canvas 3b WebEmergencyCard, superseded; Tier 1 look
 * T1EmergencyCard / Edit / Offline / Wallet / Desktop, approved by Krishna
 * Chintakayala 2026-10-24; plan tier1-parity-2026-10-24 §21). Everything on
 * it is the student's own profile (GET/PATCH /api/profile) through
 * EmergencyCardViewModel; the phone shows the saved card and edits in a sheet,
 * the desktop shows the editor beside the live card built from the draft.
 *
 * Not drawn, on purpose (decision D6-2): the board's "OFFLINE · stored on this
 * phone, works without unlocking" promise. Keeping blood group and allergies
 * on the device needs a guardrail-9 exception nobody has signed, so the card
 * loads from the server and says so. The student may instead put a copy in the
 * phone's own wallet (WalletPassSection; plan tier1-emergency-card-wallet-2026-10-24),
 * which the app does not store either. Also not drawn: the ABHA number and
 * "current medicines" (no such profile fields), "No known allergies" (the
 * server cannot tell it from "not recorded"), a QR or public link (D9-7).
 * Call 112 works with no data, in every state.
 */
export const EmergencyCardBoard = observer(function EmergencyCardBoard({ vm, links, wide = false }: { vm: EmergencyCardViewModel; links: EmergencyCardLinks; wide?: boolean }) {
  const t = useT();
  useOwnPhoneChrome();
  const online = useOnline();
  const [editing, setEditing] = useState(false);
  const s = vm.saved;
  const d = vm.draft;

  const openEdit = () => { vm.discard(); setEditing(true); };
  const closeEdit = () => { vm.discard(); setEditing(false); };
  const save = async () => {
    await vm.save();
    if (!vm.error) setEditing(false);
  };
  const print = () => { if (Platform.OS === 'web') window.print(); };

  const stateNotes = (
    <>
      {vm.loading ? <M2Card style={styles.card}><Skeleton label={t('ice.loading')} lines={['60%', '90%', '75%']} /></M2Card> : null}
      {vm.loadFailed && !online ? (
        <View testID="card-offline" role="status" style={styles.offline}>
          <Icon name="wifi-off" size={size.navIcon} color={color.attention} />
          <View style={styles.grow}>
            <Text style={[m2Text.cardTitle, { color: color.attention }]}>{t('sf.card.offlineTitle')}</Text>
            <Text style={[m2Text.body, { color: color.attention }]}>{t('sf.card.offlineBody')}</Text>
          </View>
        </View>
      ) : null}
      {vm.loadFailed ? <M2Card style={styles.card}><ErrorState title={t('ice.failedTitle')} body={t('ice.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /></M2Card> : null}
      {s && !online ? <OfflineBanner message={t('sf.card.offlineBody')} /> : null}
    </>
  );

  const alsoHere = (
    <View style={styles.section}>
      <Text style={m2Text.eyebrow}>{t('sf.alsoHere')}</Text>
      <M2ListRow icon="users" hue="rose" title={t('sf.card.contactsLink')} onPress={links.contacts} testID="card-open-contacts" />
      {links.nearestHospitals ? <M2ListRow icon="hospital" hue="sky" title={t('fc.nearestHospitals')} onPress={links.nearestHospitals} testID="card-find-care" /> : null}
    </View>
  );

  const whoCanSee = (
    <M2Card style={styles.sideCard} testID="card-who">
      <M2Heading style={m2Text.section}>{t('swt.ice.whoTitle')}</M2Heading>
      {(['swt.ice.who1', 'swt.ice.who2', 'swt.ice.who3'] as const).map((key) => (
        <View key={key} style={styles.checkRow}>
          <View style={styles.lockDot}><Icon name="lock" size={14} color={color.action} strokeWidth={2.4} /></View>
          <Text style={[m2Text.body, styles.grow]}>{t(key)}</Text>
        </View>
      ))}
    </M2Card>
  );

  const wallet = s ? <WalletPassSection refreshKey={s} /> : null;

  const notices = (
    <>
      {vm.error && !editing ? <Note tone="danger">{t(vm.error)}</Note> : null}
      {vm.notice && !editing ? <Note tone="positive">{t(vm.notice)}</Note> : null}
    </>
  );

  const hero = (
    <M2PageHero hue="rose" icon="heart-pulse" title={wide ? t('sf.card.title') : undefined} body={t('sf.card.intro')} testID="card-hero"
      art={<M2Tile3d icon="heart-pulse" hue="rose" size={96} float />} artOnPhone={false}
      actions={wide ? (
        <>
          <Call112Button compact />
          {Platform.OS === 'web' && d ? (
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('swt.ice.print')} aria-label={t('swt.ice.print')} onPress={print} disabled={vm.dirty}
              accessibilityState={vm.dirty ? { disabled: true } : undefined} testID="card-print"
              style={({ focused }: PressState) => [styles.heroGhost, vm.dirty ? styles.heroGhostOff : null, focused ? focusRing : null]}>
              <Icon name="file-text" size={18} color={color.onHero} />
              <Text style={styles.heroGhostText}>{vm.dirty ? t('swt.ice.printSaveFirst') : t('swt.ice.print')}</Text>
            </Pressable>
          ) : null}
        </>
      ) : undefined} />
  );

  // Desktop: the editor beside the live card (the 3b layout, rebuilt with the shared pieces).
  if (wide) {
    return (
      <M2WideColumn testID="emergency-card-board">
        {hero}
        {stateNotes}
        {s && d ? (
          <M2Grid columns={{ desktop: 2, tablet: 1 }}>
            <M2Card style={styles.card} testID="card-editor-card">
              <Editor vm={vm} disabled={!online} />
              {notices}
              <View style={[styles.unsaved, vm.dirty ? null : styles.unsavedIdle]} {...(Platform.OS === 'web' ? { role: 'region', 'aria-label': t('swt.ice.unsavedLabel') } : {})} testID="card-unsaved">
                <Text style={[styles.unsavedText, styles.grow]}>{vm.dirty ? t('swt.ice.unsaved') : t('swt.ice.previewNote')}</Text>
                {vm.dirty ? <Button label={t('ice.discard')} variant="ghost" onPress={vm.discard} disabled={vm.saving} /> : null}
                <Button label={vm.saving ? t('swt.ice.saving') : t('sf.card.save')} busy={vm.saving} disabled={!vm.canSave || !online} onPress={() => void save()} testID="card-save" />
              </View>
            </M2Card>
            <View style={styles.side}>
              <Text style={m2Text.eyebrow}>{t('swt.ice.previewLabel')}</Text>
              <EmergencyCardFace card={d} owner={vm.owner} live testID="card-preview" />
              <Text style={m2Text.meta}>{t('swt.ice.previewNote')}</Text>
              {wallet}
              <Readiness draft={d} />
              {whoCanSee}
              {alsoHere}
            </View>
          </M2Grid>
        ) : null}
        <Text style={m2Text.meta}>{t('sf.card.footnote')}</Text>
      </M2WideColumn>
    );
  }

  // Phone (and Expo): the saved card, Edit in a sheet.
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="emergency-card-board">
      <M2Header backLabel={t('common.back')} onBack={links.back} title={t('sf.card.title')} testID="card-header" />
      <View style={styles.gutter}><Call112Button /></View>
      <View style={styles.gutter}>{hero}</View>
      <View style={[styles.gutter, styles.section]}>
        {stateNotes}
        {s ? <EmergencyCardFace card={s} owner={vm.owner} onEdit={online ? openEdit : undefined} onAddBlood={online ? openEdit : undefined} onAddContact={online ? openEdit : undefined} /> : null}
        {notices}
        {wallet}
        {alsoHere}
        <Text style={[m2Text.meta, styles.footnote]}>{t('sf.card.footnote')}</Text>
      </View>

      <Sheet visible={editing} title={t('sf.card.editTitle')} onClose={closeEdit} busy={vm.saving} testID="card-edit-sheet">
        {d ? (
          <View style={styles.sheet}>
            <Editor vm={vm} disabled={!online} />
            {vm.error ? <Note tone="danger">{t(vm.error)}</Note> : null}
            <Button label={t('sf.card.save')} size="cta" fullWidth busy={vm.saving} disabled={(!vm.canSave || !online) && !vm.saving} onPress={() => void save()} testID="card-save" />
            <Button label={t('common.cancel')} variant="secondary" fullWidth onPress={closeEdit} />
          </View>
        ) : null}
      </Sheet>
    </ScrollView>
  );
});

/** Route /emergency-card: the card for the signed-in student; `wide` in the desktop shell's column. */
export function EmergencyCardRoute({ links, wide = false }: { links: EmergencyCardLinks; wide?: boolean }): React.ReactElement {
  const [vm] = useState(() => new EmergencyCardViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <EmergencyCardBoard vm={vm} links={links} wide={wide} />;
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { gap: space.s14, paddingBottom: space.s40 },
  gutter: { paddingHorizontal: space.gutterPhone },
  section: { gap: space.s12 },
  card: { padding: space.s16, gap: space.s12 },
  side: { gap: space.s12 },
  sideCard: { padding: space.s16, gap: space.s10 },
  footnote: { textAlign: 'center', lineHeight: font.size.caption * font.lineHeight.body },
  offline: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s10, backgroundColor: color.attentionBg, borderRadius: radius.xl, padding: space.s14 },
  call112: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s10, minHeight: size.controlLg, borderRadius: radius.full, backgroundColor: color.dangerFill, paddingHorizontal: space.s20 },
  call112Compact: { alignSelf: 'flex-start', minHeight: size.control },
  call112Text: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onDangerFill },
  heroGhost: { flexDirection: 'row', alignItems: 'center', gap: space.s8, minHeight: size.control, paddingHorizontal: space.s16, borderRadius: radius.full, backgroundColor: color.onHeroVeil, borderWidth: 1, borderColor: color.onHeroRule },
  heroGhostOff: { opacity: 0.6 },
  heroGhostText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  face: { borderRadius: 24, overflow: 'hidden', backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  faceHead: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s16, overflow: 'hidden' },
  faceRing: { position: 'absolute', right: -40, top: -60, width: 160, height: 160, borderRadius: radius.full, backgroundColor: color.onHeroVeil },
  faceName: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  facePlace: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.onHero2 },
  editPill: { flexDirection: 'row', alignItems: 'center', gap: space.s6, minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, backgroundColor: color.onHeroVeil, borderWidth: 1, borderColor: color.onHeroRule },
  editPillText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  faceBody: { padding: space.s16, gap: space.s12 },
  missing: { flexDirection: 'row', alignItems: 'center', gap: space.s8, backgroundColor: color.attentionBg, borderRadius: radius.md, paddingLeft: space.s12, paddingRight: space.s4 },
  inlineLink: { minHeight: size.touchTarget, justifyContent: 'center', paddingHorizontal: space.s8 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12 },
  fact: { flexGrow: 1, flexBasis: '45%', gap: space.s4 },
  factLabel: { fontFamily: font.family.sans, fontSize: 11, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 0.8, textTransform: 'uppercase', color: color.text3 },
  factValue: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text, lineHeight: font.size.body * font.lineHeight.body },
  factBig: { fontFamily: font.family.mono, fontSize: font.size.title, color: color.clinicalValue },
  factWarn: { color: color.attention },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  allergyChip: { flexDirection: 'row', alignItems: 'center', gap: space.s6, minHeight: 30, paddingHorizontal: space.s10, borderRadius: radius.full, backgroundColor: color.dangerBg },
  allergyChipEdit: { minHeight: size.touchTarget, paddingHorizontal: space.s12 },
  allergyText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.danger },
  rule: { height: 1, backgroundColor: color.ruleSoft },
  contact: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  callRound: { width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, backgroundColor: color.dangerFill, alignItems: 'center', justifyContent: 'center' },
  noContact: { gap: space.s2 },
  editor: { gap: space.s10 },
  fieldLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  addInput: { flex: 1, minHeight: size.control, borderWidth: 1, borderColor: color.rule, borderRadius: radius.lg, paddingHorizontal: space.s12, fontFamily: font.family.sans, fontSize: font.size.body, color: color.text, backgroundColor: color.surface },
  unsaved: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.s10, padding: space.s12, borderRadius: radius.lg, backgroundColor: color.attentionBg },
  unsavedIdle: { backgroundColor: color.surface2 },
  unsavedText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text, minWidth: 160 },
  readyHead: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  readyIcon: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  checkDot: { width: 28, height: 28, borderRadius: radius.full, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  checkDotDone: { backgroundColor: color.positive },
  lockDot: { width: 28, height: 28, borderRadius: radius.sm, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  sheet: { gap: space.s12 },
});
