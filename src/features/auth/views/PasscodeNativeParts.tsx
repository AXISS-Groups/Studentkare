import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import { color, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { Icon } from '@/design-system/icons';
import { PASSWORD_MAX_LENGTH } from '../viewmodel/AuthViewModel';
import type { AuthViewModel } from '../viewmodel/AuthViewModel';
import { PASSCODE_MAX_LENGTH } from '../viewmodel/passcodeRules';
import { authNativeStyles as s } from './AuthNativeParts';

/**
 * Expo: the remembered account ("Continue as …", masked, email or phone) and
 * the student passcode panel, bound to the same AuthViewModel as the web
 * (PasscodeSignInView). The code path is always beside the passcode.
 */
export const RememberedNative = observer(function RememberedNative({ vm }: { vm: AuthViewModel }) {
  const t = useT();
  const device = vm.remembered;
  if (!device) return null;
  return (
    <View style={styles.stack}>
      <Text style={s.lead}>{t(vm.rememberedPasscode ? 'authpc.remembered.leadPasscode' : 'auth.remembered.lead')}</Text>
      <View style={styles.account} testID="remembered-account">
        <View style={styles.avatar}>
          <Icon name={device.channel === 'EMAIL' ? 'mail-2' : 'message-circle-3'} size={20} color={color.onHero} />
        </View>
        <View style={styles.accountWords}>
          <Text style={styles.who}>{t('authpc.remembered.who')}</Text>
          <Text style={styles.masked}>{device.targetMasked}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[s.primary, vm.busy && s.primaryOff]}
        onPress={() => void vm.continueRemembered()}
        disabled={vm.busy}
        accessibilityRole="button"
        accessibilityLabel={t('auth.remembered.continue', { masked: device.targetMasked })}
      >
        {vm.busy ? <ActivityIndicator color={color.onAction} /> : (
          <>
            <Text style={s.primaryText}>{t('auth.remembered.continue', { masked: device.targetMasked })}</Text>
            <Icon name="arrow-right" size={20} color={color.onAction} />
          </>
        )}
      </TouchableOpacity>
      {vm.rememberedPasscode ? <UsePasscodeNative vm={vm} /> : null}
      <TouchableOpacity style={s.link} onPress={vm.useAnotherAccount} disabled={vm.busy} accessibilityRole="button">
        <Text style={s.linkText}>{t('auth.remembered.notYou')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.link} onPress={() => void vm.forgetDevice()} disabled={vm.busy} accessibilityRole="button">
        <Text style={s.linkText}>{t('auth.remembered.forget')}</Text>
      </TouchableOpacity>
    </View>
  );
});

/** "Use my passcode", beside "Send a code" (never instead of it). */
export const UsePasscodeNative = observer(function UsePasscodeNative({ vm }: { vm: AuthViewModel }) {
  const t = useT();
  if (!vm.passcodeEnabled) return null;
  return (
    <>
      <TouchableOpacity style={styles.ghost} onPress={vm.startPasscode} disabled={vm.busy} accessibilityRole="button" accessibilityLabel={t('authpc.usePasscode')}>
        <Icon name="key" size={18} color={color.action} />
        <Text style={styles.ghostText}>{t('authpc.usePasscode')}</Text>
      </TouchableOpacity>
      {vm.passcodeProblem === 'NEED_ID' ? <Text style={s.hint} accessibilityLiveRegion="polite">{t('authpc.needId')}</Text> : null}
    </>
  );
});

export const PasscodeEntryNative = observer(function PasscodeEntryNative({ vm, onSuccess }: { vm: AuthViewModel; onSuccess?: () => void }) {
  const t = useT();
  const [shown, setShown] = useState(false);
  const problem = vm.passcodeProblem;
  return (
    <View style={styles.stack}>
      <View style={styles.head}>
        <Text style={s.title} accessibilityRole="header">{t('authpc.enter.title')}</Text>
        <Text style={s.lead}>{vm.remembered ? t('authpc.enter.lead', { masked: vm.remembered.targetMasked }) : t('authpc.enter.leadTyped')}</Text>
      </View>
      <View style={s.field}>
        <Text style={s.label}>{t('authpc.enter.label')}</Text>
        <View style={[s.control, problem === 'FAILED' ? s.controlInvalid : null]}>
          <Icon name="lock-keyhole" size={18} color={color.text2} />
          <TextInput
            style={s.controlInput}
            value={vm.passcode}
            onChangeText={vm.setPasscode}
            secureTextEntry={!shown}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            maxLength={PASSCODE_MAX_LENGTH}
            autoFocus
            accessibilityLabel={t('authpc.enter.label')}
            testID="passcode-input"
          />
          <TouchableOpacity style={styles.eye} onPress={() => setShown((v) => !v)} accessibilityRole="button" accessibilityLabel={t('authpc.enter.show')} aria-selected={shown}>
            <Icon name={shown ? 'eye-off' : 'eye'} size={20} color={shown ? color.action : color.text2} />
          </TouchableOpacity>
        </View>
        <Text style={s.hint}>{t('authpc.enter.hint')}</Text>
      </View>

      {problem === 'NEW_DEVICE' ? (
        <View style={[styles.note, styles.noteInfo]} accessibilityRole="alert">
          <Icon name="devices" size={20} color={color.action} />
          <View style={styles.noteWords}>
            <Text style={styles.noteTitle}>{t('authpc.newDevice.title')}</Text>
            <Text style={styles.noteBody}>{t('authpc.newDevice.body')}</Text>
            <TouchableOpacity style={styles.noteAction} onPress={() => void vm.useCodeInstead()} accessibilityRole="button">
              <Text style={styles.noteActionText}>{t('authpc.newDevice.action')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : problem === 'FAILED' || problem === 'OTHER' || problem === 'DISABLED' ? (
        <View style={[styles.note, styles.noteAttention]} accessibilityRole="alert">
          <Icon name="alert-circle-4" size={20} color={color.attention} />
          <View style={styles.noteWords}>
            <Text style={styles.noteTitle}>{t(problem === 'FAILED' ? 'authpc.enter.failedTitle' : 'authpc.enter.otherTitle')}</Text>
            <Text style={styles.noteBody}>{problem === 'DISABLED' ? t('authpc.disabled') : vm.passcodeMessage}</Text>
          </View>
        </View>
      ) : null}

      <TouchableOpacity
        style={[s.primary, !vm.canSubmitPasscode && s.primaryOff]}
        onPress={() => void vm.signInWithPasscode(() => onSuccess?.())}
        disabled={!vm.canSubmitPasscode}
        accessibilityRole="button"
        accessibilityLabel={t('authpc.enter.submit')}
      >
        {vm.busy ? <ActivityIndicator color={color.onAction} /> : (
          <Text style={[s.primaryText, !vm.canSubmitPasscode && s.primaryTextOff]}>{t('authpc.enter.submit')}</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={s.link} onPress={() => void vm.useCodeInstead()} disabled={vm.busy} accessibilityRole="button">
        <Text style={s.linkText}>{t('authpc.enter.useCode')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.link} onPress={() => void vm.forgotPasscode()} disabled={vm.busy} accessibilityRole="button">
        <Text style={s.linkText}>{t('authpc.enter.forgot')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.link} onPress={vm.leavePasscode} disabled={vm.busy} accessibilityRole="button">
        <Icon name="arrow-left" size={16} color={color.action} />
        <Text style={s.linkText}>{t('authpc.enter.back')}</Text>
      </TouchableOpacity>
    </View>
  );
});

/** "Use my password", beside "Send a code" (plan tier1-auth-password-2026-10-22, D). */
export const UsePasswordNative = observer(function UsePasswordNative({ vm }: { vm: AuthViewModel }) {
  const t = useT();
  if (!vm.studentPasswordEnabled) return null;
  return (
    <>
      <TouchableOpacity style={styles.ghost} onPress={vm.startPassword} disabled={vm.busy} accessibilityRole="button" accessibilityLabel={t('authpw.usePassword')}>
        <Icon name="lock-keyhole" size={18} color={color.action} />
        <Text style={styles.ghostText}>{t('authpw.usePassword')}</Text>
      </TouchableOpacity>
      {vm.passwordProblem === 'NEED_ID' ? <Text style={s.hint} accessibilityLiveRegion="polite">{t('authpw.needId')}</Text> : null}
    </>
  );
});

/**
 * The student's password with the email or number typed on the form. One answer
 * from the server for every failure; the code path is always beside it.
 */
export const PasswordEntryNative = observer(function PasswordEntryNative({ vm, onSuccess }: { vm: AuthViewModel; onSuccess?: () => void }) {
  const t = useT();
  const [shown, setShown] = useState(false);
  const problem = vm.passwordProblem;
  return (
    <View style={styles.stack}>
      <View style={styles.head}>
        <Text style={s.title} accessibilityRole="header">{t('authpw.enter.title')}</Text>
        <Text style={s.lead}>{t('authpw.enter.lead', { id: vm.identifier.trim() })}</Text>
      </View>
      <View style={s.field}>
        <Text style={s.label}>{t('authpw.enter.label')}</Text>
        <View style={[s.control, problem === 'FAILED' ? s.controlInvalid : null]}>
          <Icon name="lock-keyhole" size={18} color={color.text2} />
          <TextInput
            style={s.controlInput}
            value={vm.password}
            onChangeText={vm.setStudentPassword}
            secureTextEntry={!shown}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            maxLength={PASSWORD_MAX_LENGTH}
            autoFocus
            accessibilityLabel={t('authpw.enter.label')}
            testID="password-input"
          />
          <TouchableOpacity style={styles.eye} onPress={() => setShown((v) => !v)} accessibilityRole="button"
            accessibilityLabel={t(shown ? 'authpw.enter.hide' : 'authpw.enter.show')} aria-selected={shown}>
            <Icon name={shown ? 'eye-off' : 'eye'} size={20} color={shown ? color.action : color.text2} />
          </TouchableOpacity>
        </View>
        <Text style={s.hint}>{t('authpw.enter.hint')}</Text>
      </View>
      {problem === 'FAILED' || problem === 'OTHER' || problem === 'DISABLED' ? (
        <View style={[styles.note, styles.noteAttention]} accessibilityRole="alert">
          <Icon name="alert-circle-4" size={20} color={color.attention} />
          <View style={styles.noteWords}>
            <Text style={styles.noteTitle}>{t(problem === 'FAILED' ? 'authpw.enter.failedTitle' : 'authpw.enter.otherTitle')}</Text>
            <Text style={styles.noteBody}>{problem === 'DISABLED' ? t('authpw.disabled') : vm.passwordMessage}</Text>
          </View>
        </View>
      ) : null}
      <TouchableOpacity
        style={[s.primary, !vm.canSubmitStudentPassword && s.primaryOff]}
        onPress={() => void vm.signInWithStudentPassword(() => onSuccess?.())}
        disabled={!vm.canSubmitStudentPassword}
        accessibilityRole="button"
        accessibilityLabel={t('authpw.enter.submit')}
      >
        {vm.busy ? <ActivityIndicator color={color.onAction} /> : (
          <Text style={[s.primaryText, !vm.canSubmitStudentPassword && s.primaryTextOff]}>{t('authpw.enter.submit')}</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={s.link} onPress={() => { vm.leavePassword(); void vm.sendCode(); }} disabled={vm.busy} accessibilityRole="button">
        <Text style={s.linkText}>{t('authpw.enter.useCode')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.link} onPress={() => void vm.forgotPassword()} disabled={vm.busy} accessibilityRole="button">
        <Text style={s.linkText}>{t('authpw.enter.forgot')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.link} onPress={vm.leavePassword} disabled={vm.busy} accessibilityRole="button">
        <Icon name="arrow-left" size={16} color={color.action} />
        <Text style={s.linkText}>{t('authpw.enter.back')}</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  stack: { gap: space.s14 },
  head: { gap: space.s6 },
  account: {
    flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s14,
    borderRadius: radius.lg, borderWidth: 1, borderColor: color.ruleSoft, backgroundColor: color.surface2,
  },
  avatar: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.brandNavy },
  accountWords: { flex: 1, gap: space.s2 },
  who: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(700), color: color.text2 },
  masked: { fontFamily: font.family.mono, fontSize: font.size.titleSm, fontWeight: fontWeight(700), color: color.text },
  ghost: {
    minHeight: size.controlLg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s8,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: color.rule, backgroundColor: color.surface,
  },
  ghostText: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(800), color: color.action },
  eye: { width: size.touchTarget, height: size.touchTarget, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12, padding: space.s14, borderRadius: radius.lg, borderWidth: 1 },
  noteInfo: { backgroundColor: color.surface3, borderColor: color.ruleSoft },
  noteAttention: { backgroundColor: color.attentionBg, borderColor: color.ruleSoft },
  noteWords: { flex: 1, gap: space.s4 },
  noteTitle: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(800), color: color.text },
  noteBody: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: 20, color: color.text2 },
  noteAction: {
    alignSelf: 'flex-start', minHeight: size.touchTarget, justifyContent: 'center', marginTop: space.s6,
    paddingHorizontal: space.s16, borderRadius: radius.full, backgroundColor: color.action,
  },
  noteActionText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(800), color: color.onAction },
});
