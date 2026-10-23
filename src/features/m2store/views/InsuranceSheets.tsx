import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Note, Select, Sheet, TextField } from '@/design-system';
import { m2Text } from '@/design-system/m2';
import { space } from '@/design-system/theme';
import { useT } from '@/i18n';
import { checkClaim, checkPolicy, maskPolicy } from '../viewmodel/InsuranceViewModel';
import type { ClaimDraft, DraftErrors, InsuranceViewModel, PolicyDraft } from '../viewmodel/InsuranceViewModel';

/**
 * The two forms M2Insurance opens (web and Expo alike): record a policy
 * (POST /health/policies) and prepare a claim (POST /insurance/claims). The
 * fields and limits are the server's; a claim is saved as prepared and is not
 * sent to an insurer, and the sheet says so before the student saves.
 */
const NO_POLICY: PolicyDraft = { insurer: '', policyNumber: '', sumInsured: '', validUntil: '' };

export const PolicySheet = observer(function PolicySheet({ vm, visible, onClose }: { vm: InsuranceViewModel; visible: boolean; onClose: () => void }) {
  const t = useT();
  const [draft, setDraft] = useState<PolicyDraft>(NO_POLICY);
  const [errors, setErrors] = useState<DraftErrors<PolicyDraft>>({});
  useEffect(() => {
    if (visible) { setDraft(NO_POLICY); setErrors({}); vm.clearSaveError(); }
  }, [visible, vm]);
  const set = (key: keyof PolicyDraft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const err = (key: keyof PolicyDraft) => { const k = errors[key]; return k ? t(k) : undefined; };
  const save = async () => {
    const found = checkPolicy(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    if (await vm.addPolicy(draft)) onClose();
  };
  return (
    <Sheet visible={visible} title={t('m2.ins.policySheetTitle')} onClose={onClose} busy={vm.saving} testID="m2-ins-policy-sheet">
      <View style={styles.form}>
        <Text style={m2Text.body}>{t('m2.ins.userRecorded')}</Text>
        <TextField label={t('member.insurance.insurer')} value={draft.insurer} onChangeText={set('insurer')} maxLength={100} error={err('insurer')} testID="m2-ins-insurer" />
        <TextField label={t('member.insurance.policyNumber')} value={draft.policyNumber} onChangeText={set('policyNumber')} maxLength={100} mono autoComplete="off" error={err('policyNumber')} testID="m2-ins-number" />
        <TextField label={t('member.insurance.sumInsured')} value={draft.sumInsured} onChangeText={set('sumInsured')} keyboardType="numeric" error={err('sumInsured')} testID="m2-ins-sum" />
        <TextField label={t('member.insurance.validUntil')} value={draft.validUntil} onChangeText={set('validUntil')} hint={t('m2.ins.dateHint')} maxLength={10} error={err('validUntil')} testID="m2-ins-until" />
        {vm.saveFailed ? <Note tone="danger">{t('m2.ins.saveFailed')}</Note> : null}
        <Button label={t('member.insurance.savePolicy')} onPress={() => void save()} busy={vm.saving} fullWidth testID="m2-ins-save-policy" />
      </View>
    </Sheet>
  );
});

export const ClaimSheet = observer(function ClaimSheet({ vm, visible, onClose }: { vm: InsuranceViewModel; visible: boolean; onClose: () => void }) {
  const t = useT();
  const first = vm.policy?.id ?? '';
  const [draft, setDraft] = useState<ClaimDraft>({ policyId: first, providerName: '', service: '', amount: '' });
  const [errors, setErrors] = useState<DraftErrors<ClaimDraft>>({});
  useEffect(() => {
    if (visible) { setDraft({ policyId: first, providerName: '', service: '', amount: '' }); setErrors({}); vm.clearSaveError(); }
  }, [visible, first, vm]);
  const set = (key: keyof ClaimDraft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const err = (key: keyof ClaimDraft) => { const k = errors[key]; return k ? t(k) : undefined; };
  const save = async () => {
    const found = checkClaim(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    if (await vm.prepareClaim(draft)) onClose();
  };
  const options = vm.policies.map((p) => ({ value: p.id, label: `${p.insurer} · ${maskPolicy(p.policyNumber)}` }));
  return (
    <Sheet visible={visible} title={t('m2.ins.claimSheetTitle')} onClose={onClose} busy={vm.saving} testID="m2-ins-claim-sheet">
      <View style={styles.form}>
        <Text style={m2Text.body}>{t('member.insurance.claimDialogBody')}</Text>
        {options.length > 1 ? (
          <Select label={t('member.insurance.policy')} options={options} value={draft.policyId || null} onChange={set('policyId')}
            placeholder={t('member.insurance.choosePolicy')} error={err('policyId')} testID="m2-ins-claim-policy" />
        ) : null}
        <TextField label={t('member.insurance.provider')} value={draft.providerName} onChangeText={set('providerName')} maxLength={160} testID="m2-ins-claim-provider" />
        <TextField label={t('member.insurance.service')} value={draft.service} onChangeText={set('service')} maxLength={160} testID="m2-ins-claim-service" />
        <TextField label={t('member.insurance.amount')} value={draft.amount} onChangeText={set('amount')} keyboardType="numeric" error={err('amount')} testID="m2-ins-claim-amount" />
        {vm.saveFailed ? <Note tone="danger">{t('m2.ins.saveFailed')}</Note> : null}
        <Button label={t('member.insurance.saveClaim')} onPress={() => void save()} busy={vm.saving} fullWidth testID="m2-ins-save-claim" />
      </View>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  form: { gap: space.s14, paddingBottom: space.s8 },
});
