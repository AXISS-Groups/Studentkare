import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Checkbox, ErrorState, Note, Sheet, SwitchRow, useOnline } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { boardText } from '@/design-system/board/BoardKit';
import { M2Tile3d, m2Text } from '@/design-system/m2';
import { color, shadow, shadowStyle, space } from '@/design-system/theme';
import { useLanguage, useT } from '@/i18n';
import type { Lang, MessageKey } from '@/i18n';
import { HEALTH_FIELDS, WALLET_FIELDS, WalletPassViewModel } from '../viewmodel/WalletPassViewModel';
import type { WalletField, WalletPlatform } from '../viewmodel/WalletPassViewModel';
import { deviceWallets, openWalletUrl } from './openWallet';

const ADD: Record<WalletPlatform, MessageKey> = { APPLE: 'wlt.addApple', GOOGLE: 'wlt.addGoogle' };
const REMOVE: Record<WalletPlatform, MessageKey> = { APPLE: 'wlt.removeApple', GOOGLE: 'wlt.removeGoogle' };
const IN_WALLET: Record<WalletPlatform, MessageKey> = { APPLE: 'wlt.status.inApple', GOOGLE: 'wlt.status.inGoogle' };
const MADE: Record<WalletPlatform, MessageKey> = { APPLE: 'wlt.status.madeApple', GOOGLE: 'wlt.status.madeGoogle' };
const WHERE: Record<WalletPlatform, MessageKey> = { APPLE: 'wlt.picker.appleWhere', GOOGLE: 'wlt.picker.googleWhere' };
const FIELD_LABEL: Record<WalletField, MessageKey> = {
  name: 'wlt.field.name', blood: 'wlt.field.blood', contact: 'wlt.field.contact',
  allergies: 'wlt.field.allergies', conditions: 'wlt.field.conditions', medicines: 'wlt.field.medicines',
};
const FIELD_DETAIL: Partial<Record<WalletField, MessageKey>> = {
  contact: 'wlt.field.contactDetail', allergies: 'wlt.field.healthDetail', conditions: 'wlt.field.healthDetail',
  medicines: 'wlt.field.medicinesDetail',
};

/** A server time (seconds) as "24 Oct, 4:05 pm" in the reader's language. */
export function walletTime(seconds: number, lang: Lang): string {
  return new Date(seconds * 1000).toLocaleString(`${lang}-IN`, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

/**
 * "Keep it in your phone's wallet" (plan tier1-emergency-card-wallet-2026-10-24, Tier 1 —
 * approved by Krishna Chintakayala 2026-10-24). On the emergency card at every width and
 * in the Expo app. Draws nothing while no wallet is offered (both are off until legal and
 * the clinical lead sign) unless a pass already exists, which can always be removed.
 *
 * No official "Add to Apple Wallet" / "Add to Google Wallet" badge artwork is in
 * design/assets, so the buttons are plain buttons naming the wallet (never hot-linked).
 */
export const WalletPassPanel = observer(function WalletPassPanel({ vm }: { vm: WalletPassViewModel }) {
  const t = useT();
  const { lang } = useLanguage();
  const online = useOnline();

  if (vm.loading || !vm.visible) return null;
  if (vm.loadFailed) {
    return (
      <View style={styles.panel} testID="wallet-panel">
        <ErrorState title={t('wlt.title')} body={t('wlt.failed')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} />
      </View>
    );
  }
  const anyActive = vm.shown.some((p) => vm.passFor(p)?.status === 'ACTIVE');
  const picker = vm.picker;

  return (
    <View style={styles.panel} testID="wallet-panel">
      <View style={styles.head}>
        <M2Tile3d icon="devices" hue="indigo" size={44} />
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={m2Text.section}>{t('wlt.title')}</Text>
          <Text style={boardText.body}>{t('wlt.intro')}</Text>
        </View>
      </View>
      {!anyActive ? <Text testID="wallet-status-none" style={boardText.meta}>{t('wlt.status.none')}</Text> : null}

      {vm.shown.map((platform) => {
        const pass = vm.passFor(platform);
        const active = pass?.status === 'ACTIVE';
        const busy = vm.busy === platform;
        const key = platform.toLowerCase();
        return (
          <View key={platform} style={styles.wallet} testID={`wallet-${key}`}>
            {pass && active ? (
              <View style={styles.statusRow} role="status">
                {pass.inWallet ? <Icon name="check-2" size={space.s16} color={color.positive} /> : null}
                <Text testID={`wallet-${key}-status`} style={[boardText.body, styles.flex]}>
                  {pass.inWallet ? t(IN_WALLET[platform], { time: walletTime(pass.updatedAt, lang) }) : t(MADE[platform])}
                </Text>
              </View>
            ) : null}
            {pass?.pending ? (
              <Text style={boardText.meta} testID={`wallet-${key}-pending`}>{t(active ? 'wlt.status.sending' : 'wlt.status.removing')}</Text>
            ) : null}
            {vm.canAddTo(platform) ? (
              <Button
                label={active ? t('wlt.change') : t(ADD[platform])}
                variant={active ? 'ghost' : 'secondary'}
                fullWidth
                disabled={!online || vm.busy !== null}
                busy={busy && vm.picker === null}
                onPress={() => vm.openPicker(platform)}
                testID={`wallet-${key}-add`}
              />
            ) : null}
            {active ? (
              <Button label={t(REMOVE[platform])} variant="ghost" fullWidth disabled={!online || vm.busy !== null}
                busy={busy} onPress={() => void vm.remove(platform)} testID={`wallet-${key}-remove`} />
            ) : null}
          </View>
        );
      })}

      {!online ? <Text style={boardText.meta} testID="wallet-offline">{t('wlt.offline')}</Text> : null}
      {vm.error && !picker ? <Note tone="danger" testID="wallet-error">{t(vm.error)}</Note> : null}
      {vm.notice ? <Note tone="positive" testID="wallet-notice">{t(vm.notice)}</Note> : null}

      <Sheet visible={picker !== null} title={t('wlt.picker.title')} onClose={vm.closePicker} busy={vm.busy !== null} testID="wallet-picker">
        {picker ? (
          <View style={styles.sheet}>
            <Note tone="attention" testID="wallet-lock-screen">{t('wlt.picker.lockScreen')}</Note>
            <Note tone="info" testID="wallet-where">{t(WHERE[picker])}</Note>

            <Text accessibilityRole="header" style={boardText.eyebrow}>{t('wlt.picker.basics')}</Text>
            {WALLET_FIELDS.filter((f) => !HEALTH_FIELDS.includes(f)).map((field) => (
              <FieldSwitch key={field} field={field} vm={vm} />
            ))}
            <Text accessibilityRole="header" style={boardText.eyebrow}>{t('wlt.picker.health')}</Text>
            {HEALTH_FIELDS.map((field) => <FieldSwitch key={field} field={field} vm={vm} />)}
            <Text style={boardText.body}>{t('wlt.picker.always')}</Text>
            <Text style={boardText.meta}>{t('wlt.picker.updates')}</Text>

            {picker === 'GOOGLE' ? (
              <Checkbox label={t('wlt.google.consent')} checked={vm.googleConsent} onChange={vm.setGoogleConsent} testID="wallet-google-consent" />
            ) : null}
            {vm.chosen.length === 0 ? <Text style={boardText.meta} testID="wallet-nothing">{t('wlt.picker.nothing')}</Text> : null}
            {vm.error ? <Note tone="danger" testID="wallet-picker-error">{t(vm.error)}</Note> : null}
            <Button label={t(ADD[picker])} size="cta" fullWidth busy={vm.busy !== null} disabled={!vm.canAdd || !online}
              onPress={() => void vm.add(lang)} testID="wallet-picker-add" />
            <Button label={t('common.cancel')} variant="secondary" fullWidth disabled={vm.busy !== null} onPress={vm.closePicker} />
          </View>
        ) : null}
      </Sheet>
    </View>
  );
});

const FieldSwitch = observer(function FieldSwitch({ field, vm }: { field: WalletField; vm: WalletPassViewModel }) {
  const t = useT();
  const detail = FIELD_DETAIL[field];
  return (
    <SwitchRow label={t(FIELD_LABEL[field])} detail={detail ? t(detail) : undefined} value={vm.chosen.includes(field)}
      onChange={() => vm.toggle(field)} disabled={vm.busy !== null} testID={`wallet-field-${field}`} />
  );
});

/**
 * The panel with its own view model, loaded on mount and again when `refreshKey`
 * changes (the card's saved state: a save re-dates the pass).
 */
export function WalletPassSection({ refreshKey }: { refreshKey?: unknown }): React.ReactElement {
  const [vm] = useState(() => new WalletPassViewModel(openWalletUrl, deviceWallets));
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm, refreshKey]);
  return <WalletPassPanel vm={vm} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  panel: { backgroundColor: color.surface, borderRadius: 22, padding: space.s16, gap: space.s10, ...shadowStyle(shadow.card) },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12 },
  wallet: { gap: space.s8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  sheet: { gap: space.s12 },
});
