import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import { Button, Card, CodeInput, ErrorState, Note, PhoneInput, Rise, Skeleton, TextField } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { ConfirmDialog } from '@/components/interface/ConfirmDialog';
import { useAuth } from '@/data/contexts/AuthContext';
import { homeForRole, navigate } from '@/lib/utils/workflowRouting';
import { QrCells } from '@/features/digital_id/views/DigitalIdNativeView';
import { TwoFactorViewModel } from '../viewmodel/TwoFactorViewModel';
import { PasscodeViewModel } from '@/features/auth/viewmodel/PasscodeViewModel';
import { CONTACT_KINDS, ContactsViewModel } from '../viewmodel/ContactsViewModel';
import { PasswordCardViewModel } from '../viewmodel/PasswordCardViewModel';
import { PASSWORD_MAX_LENGTH } from '@/features/auth/viewmodel/AuthViewModel';
import type { ContactKind } from '../viewmodel/ContactsViewModel';

/** Groups the key in fours ("JBSW Y3DP EHPK 3PXP"): easier to type into an app. */
const grouped = (secret: string) => secret.replace(/(.{4})(?=.)/g, '$1 ');

/**
 * Sign-in & security (design page 3b, WebSecurity, Tier 2): two-step sign-in.
 *
 * The design's "Where you're signed in" and "Recent sign-ins" cards are drawn
 * as not available yet: the server has no endpoint that lists sessions or
 * sign-in history, and a list we can't fill would be invented data
 * (DESIGN.md §2.7). Signing every other session out is the lost-phone flow
 * (POST /sessions/revoke-others), reached from the banner above.
 */
/**
 * The student's optional passcode (plan tier1-canvas-wp03, amendment 2026-10-22 b):
 * on or off and its length, from GET /auth/passcode. Adding, changing and turning
 * it off happen on /set-passcode. Students only, with the switch on; team accounts
 * keep their own PIN on the staff page.
 */
const PasscodeCard = observer(function PasscodeCard({ vm }: { vm: PasscodeViewModel }) {
  const t = useT();
  if (vm.phase !== 'ready' || !vm.usable) return null;
  const on = vm.hasPasscode;
  return (
    <Card testID="passcode-card">
      <View style={styles.cardHead}>
        <Icon name="key" size={22} color={color.action} />
        <View style={styles.cardHeadText}>
          <Text accessibilityRole="header" style={styles.cardTitle}>{t('authpc.card.title')}</Text>
          <Text style={styles.body}>{t('authpc.card.lead')}</Text>
        </View>
        <View style={[styles.pill, on ? styles.pillOn : styles.pillOff]}>
          {on ? <Icon name="check-2" size={14} color={color.positive} /> : null}
          <Text style={[styles.pillText, { color: on ? color.positive : color.text2 }]}>
            {on ? t('authpc.card.on', { length: vm.status?.length ?? 0 }) : t('authpc.card.off')}
          </Text>
        </View>
      </View>
      <Button
        label={t(on ? 'authpc.card.change' : 'authpc.card.add')}
        variant={on ? 'secondary' : 'primary'}
        onPress={() => navigate('set-passcode')}
        icon={on ? undefined : <Icon name="key" size={16} color={color.onAction} />}
      />
    </Card>
  );
});

/**
 * The student's password (plan tier1-auth-password-2026-10-22, C): set or not,
 * Set / Change, and the form. Changing needs the current one unless the student
 * has just signed in with a code ("Forgot your password?" goes through a code).
 */
const PasswordCard = observer(function PasswordCard({ vm }: { vm: PasswordCardViewModel }) {
  const t = useT();
  if (vm.phase !== 'ready' || !vm.status?.enabled) return null;
  const on = vm.status.hasPassword;
  const problem = vm.problem ? t(vm.problem, { min: vm.minLength }) : undefined;
  return (
    <Card testID="password-card">
      <View style={styles.cardHead}>
        <Icon name="lock-keyhole" size={22} color={color.action} />
        <View style={styles.cardHeadText}>
          <Text accessibilityRole="header" style={styles.cardTitle}>{t('authpw.card.title')}</Text>
          <Text style={styles.body}>{t('authpw.card.lead')}</Text>
        </View>
        <View style={[styles.pill, on ? styles.pillOn : styles.pillOff]}>
          {on ? <Icon name="check-2" size={14} color={color.positive} /> : null}
          <Text style={[styles.pillText, { color: on ? color.positive : color.text2 }]}>{t(on ? 'authpw.card.on' : 'authpw.card.off')}</Text>
        </View>
      </View>
      {vm.saved ? <Note tone="positive">{t('authpw.card.saved')}</Note> : null}
      {vm.editing ? (
        <View style={styles.contactForm}>
          {vm.needsCurrent ? (
            <TextField label={t('authpw.card.current')} value={vm.current} onChangeText={vm.setCurrent} secure autoComplete="current-password"
              maxLength={PASSWORD_MAX_LENGTH} hint={t('authpw.card.currentHint')} error={vm.problem === 'authpw.card.proofNeeded' ? problem : undefined} disabled={vm.busy} testID="password-current" />
          ) : on ? <Note tone="info">{t('authpw.card.noCurrent')}</Note> : null}
          <TextField label={t('authpw.card.new')} value={vm.password} onChangeText={vm.setPassword} secure autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH} hint={t('authpw.length', { min: vm.minLength })}
            error={vm.problem && vm.problem !== 'authpw.card.proofNeeded' && vm.problem !== 'authpw.mismatch' ? problem : undefined} disabled={vm.busy} testID="password-new" />
          <TextField label={t('authpw.card.again')} value={vm.again} onChangeText={vm.setAgain} secure autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH} error={vm.problem === 'authpw.mismatch' ? problem : undefined} disabled={vm.busy} testID="password-again" />
          <View style={styles.actions}>
            <Button label={vm.busy ? t('authpw.card.saving') : t('authpw.card.save')} onPress={() => void vm.save()} busy={vm.busy} disabled={!vm.canSave && !vm.busy} />
            <Button label={t('authpw.card.cancel')} variant="ghost" onPress={vm.close} disabled={vm.busy} />
          </View>
        </View>
      ) : (
        <Button label={t(on ? 'authpw.card.change' : 'authpw.card.set')} variant={on ? 'secondary' : 'primary'} onPress={vm.open}
          icon={on ? undefined : <Icon name="lock-keyhole" size={16} color={color.onAction} />} />
      )}
    </Card>
  );
});

const CONTACT_ICON = { EMAIL: 'mail-2', WHATSAPP: 'message-square-text' } as const;

/**
 * Your email and WhatsApp number (plan tier1-auth-password-2026-10-22, section A):
 * each verified or not, the sign-in ID marked. Add the missing one, verify one an
 * admin typed for you, or remove the second. Codes for signing in go only to a
 * verified contact, so the card says which are.
 */
const ContactsCard = observer(function ContactsCard({ vm }: { vm: ContactsViewModel }) {
  const t = useT();
  const kindLabel = (kind: ContactKind) => t(`contacts.kind.${kind}`);
  if (vm.phase === 'loading') return <Skeleton label={t('contacts.loading')} lines={['40%', '100%', '100%']} />;
  if (vm.phase === 'failed') {
    return <ErrorState title={t('contacts.failedTitle')} body={t('contacts.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} />;
  }
  return (
    <Card testID="contacts-card">
      <View style={styles.cardHead}>
        <Icon name="user" size={22} color={color.action} />
        <View style={styles.cardHeadText}>
          <Text accessibilityRole="header" style={styles.cardTitle}>{t('contacts.title')}</Text>
          <Text style={styles.body}>{t('contacts.lead')}</Text>
        </View>
      </View>
      {vm.done ? <Note tone="positive">{t(vm.done.key, { kind: kindLabel(vm.done.kind) })}</Note> : null}
      {vm.problem && !vm.editing ? <Note tone="danger">{t(vm.problem)}</Note> : null}
      {CONTACT_KINDS.map(kind => {
        const contact = vm.contact(kind);
        const editing = vm.editing === kind;
        return (
          <View key={kind} style={styles.contactRow} testID={`contact-${kind}`}>
            <View style={styles.contactHead}>
              <Icon name={CONTACT_ICON[kind]} size={20} color={color.text2} />
              <View style={styles.contactText}>
                <Text style={styles.contactKind}>{kindLabel(kind)}</Text>
                <Text style={styles.contactValue}>{contact ? contact.value : t('contacts.none')}</Text>
                {contact?.primary ? <Text style={styles.meta}>{t('contacts.signInId')}</Text> : null}
              </View>
              {contact ? (
                <View style={[styles.pill, contact.verified ? styles.pillOn : styles.pillOff]}>
                  {contact.verified ? <Icon name="check-2" size={14} color={color.positive} /> : null}
                  <Text style={[styles.pillText, { color: contact.verified ? color.positive : color.text2 }]}>
                    {t(contact.verified ? 'contacts.verified' : 'contacts.unverified')}
                  </Text>
                </View>
              ) : null}
            </View>
            {editing ? (
              <View style={styles.contactForm}>
                {vm.step === 'enter' ? (
                  kind === 'EMAIL'
                    ? <TextField label={t('contacts.emailLabel')} value={vm.value} onChangeText={vm.setValue} keyboardType="email-address" autoComplete="email" maxLength={254} error={vm.problem ? t(vm.problem) : undefined} disabled={vm.busy} testID="contact-value" />
                    : <PhoneInput label={t('contacts.phoneLabel')} value={vm.value} onChangeText={vm.setValue} error={vm.problem ? t(vm.problem) : undefined} disabled={vm.busy} testID="contact-value" />
                ) : (
                  <CodeInput label={t('contacts.codeLabel')} value={vm.code} onChangeText={vm.setCode} hint={t('contacts.codeHint', { target: vm.sentTo })} error={vm.problem ? t(vm.problem) : undefined} disabled={vm.busy} testID="contact-code" />
                )}
                <View style={styles.actions}>
                  {vm.step === 'enter'
                    ? <Button label={vm.busy ? t('contacts.sending') : t('contacts.send')} onPress={() => void vm.sendCode()} busy={vm.busy} disabled={!vm.canSend && !vm.busy} />
                    : <Button label={vm.busy ? t('contacts.confirming') : t('contacts.confirm')} onPress={() => void vm.verify()} busy={vm.busy} disabled={!vm.canVerify && !vm.busy} />}
                  <Button label={t('contacts.cancel')} variant="ghost" onPress={vm.cancel} disabled={vm.busy} />
                </View>
              </View>
            ) : contact?.primary ? null : (
              <View style={styles.actions}>
                {!contact || !contact.verified ? (
                  <Button label={t(contact ? 'contacts.verify' : 'contacts.add', { kind: kindLabel(kind) })} variant={contact ? 'primary' : 'secondary'} onPress={() => vm.start(kind)} disabled={vm.busy || vm.editing !== null} />
                ) : null}
                {contact ? <Button label={t('contacts.remove', { kind: kindLabel(kind) })} variant="ghost" onPress={() => vm.askRemove(kind)} disabled={vm.busy || vm.editing !== null} /> : null}
              </View>
            )}
          </View>
        );
      })}
      <ConfirmDialog
        open={vm.removing !== null}
        tone="destructive"
        title={vm.removing ? t('contacts.removeTitle', { kind: kindLabel(vm.removing) }) : ''}
        body={<Text style={styles.body}>{t('contacts.removeBody')}</Text>}
        confirmLabel={vm.removing ? t('contacts.remove', { kind: kindLabel(vm.removing) }) : ''}
        cancelLabel={t('common.cancel')}
        busy={vm.busy}
        onConfirm={() => void vm.remove()}
        onCancel={vm.cancelRemove}
      />
    </Card>
  );
});

export const SignInSecurityView = observer(function SignInSecurityView({
  viewModel: vm,
  onContinue,
  passcode,
  contacts,
  password,
}: {
  viewModel: TwoFactorViewModel;
  /** Shown once a held session has turned 2FA on: back to the workspace. */
  onContinue?: () => void;
  /** Students: the passcode card. */
  passcode?: PasscodeViewModel;
  /** Students: their email and WhatsApp number. */
  contacts?: ContactsViewModel;
  /** Students: their password. */
  password?: PasswordCardViewModel;
}) {
  const t = useT();
  const status = vm.status;
  const enrolment = vm.enrolment;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Rise>
        <Text accessibilityRole="header" style={styles.title}>{t('sec.title')}</Text>
        <Text style={styles.lead}>{t('sec.lead')}</Text>
      </Rise>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${t('sec.lost.title')} ${t('sec.lost.cta')}`}
        onPress={() => navigate('lost-phone')}
        style={({ focused }) => [styles.lost, focused ? focusRing : null]}
      >
        <Icon name="phone-off" size={22} color={color.danger} />
        <View style={styles.lostText}>
          <Text style={styles.lostTitle}>{t('sec.lost.title')}</Text>
          <Text style={styles.lostBody}>{t('sec.lost.body')}</Text>
        </View>
        <View style={styles.lostCta}>
          <Text style={styles.lostTitle}>{t('sec.lost.cta')}</Text>
          <Icon name="arrow-right" size={16} color={color.danger} />
        </View>
      </Pressable>

      {contacts ? <Rise index={1}><ContactsCard vm={contacts} /></Rise> : null}
      {password ? <Rise index={1}><PasswordCard vm={password} /></Rise> : null}
      {passcode ? <Rise index={1}><PasscodeCard vm={passcode} /></Rise> : null}

      {vm.phase === 'loading' ? <Skeleton label={t('sec.loading')} lines={['50%', '100%', '80%']} /> : null}

      {vm.phase === 'failed' ? (
        <ErrorState title={t('sec.failedTitle')} body={t('sec.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} />
      ) : null}

      {vm.phase === 'ready' && status ? (
        <Rise index={1}>
          <Card testID="two-step-card">
            <View style={styles.cardHead}>
              <Icon name={status.enabled ? 'shield-check-2' : 'lock-keyhole'} size={22} color={color.action} />
              <View style={styles.cardHeadText}>
                <Text accessibilityRole="header" style={styles.cardTitle}>{t('sec.twofa.title')}</Text>
                <Text style={styles.body}>{t('sec.twofa.lead')}</Text>
              </View>
              <View style={[styles.pill, status.enabled ? styles.pillOn : styles.pillOff]}>
                {status.enabled ? <Icon name="check-2" size={14} color={color.positive} /> : null}
                <Text style={[styles.pillText, { color: status.enabled ? color.positive : color.text2 }]}>
                  {status.enabled ? t('sec.twofa.on') : t('sec.twofa.off')}
                </Text>
              </View>
            </View>

            {status.setupRequired && !enrolment ? <Note tone="attention">{t('sec.twofa.required')}</Note> : null}
            {vm.done ? <Note tone="positive">{t(vm.done)}</Note> : null}
            {vm.error && !vm.confirmingOff ? <Note tone="danger">{t(vm.error)}</Note> : null}

            {status.enabled ? (
              <>
                <Text style={styles.body}>{t(status.required ? 'sec.twofa.requiredOn' : 'sec.twofa.statusOn')}</Text>
                {vm.done === 'sec.twofa.enabled' && onContinue ? (
                  <Button label={t('sec.twofa.continue')} onPress={onContinue} icon={<Icon name="arrow-right" size={16} color={color.onAction} />} />
                ) : null}
                {!status.required ? (
                  <Button label={t('sec.twofa.turnOff')} variant="secondary" onPress={vm.askToDisable} disabled={vm.busy} />
                ) : null}
              </>
            ) : enrolment ? (
              <View style={styles.enrol}>
                {enrolment.qrMatrix.length ? (
                  <View style={styles.qrFrame}><QrCells rows={enrolment.qrMatrix} label={t('sec.twofa.qrLabel')} /></View>
                ) : null}
                <View style={styles.enrolSteps}>
                  <View style={styles.stepRow}>
                    <Icon name="qr-code" size={18} color={color.text2} />
                    <Text style={styles.body}>{t('sec.twofa.step1')}</Text>
                  </View>
                  <Text style={styles.body}>{t('sec.twofa.step2')}</Text>
                  <Text style={styles.meta}>{t('sec.twofa.cantScan')}</Text>
                  <Text selectable style={styles.secret} accessibilityLabel={`${t('sec.twofa.cantScan')} ${enrolment.secret.split('').join(' ')}`}>
                    {grouped(enrolment.secret)}
                  </Text>
                  <Button label={t('sec.twofa.openApp')} variant="ghost" onPress={() => void Linking.openURL(enrolment.otpauthUrl)} />
                  <CodeInput
                    label={t('sec.twofa.codeLabel')}
                    value={vm.code}
                    onChangeText={vm.setCode}
                    disabled={vm.busy}
                    testID="two-step-code"
                  />
                  <View style={styles.actions}>
                    <Button label={t('sec.twofa.turnOn')} onPress={() => void vm.enable()} busy={vm.busy} disabled={!vm.canEnable && !vm.busy} />
                    <Button label={t('common.cancel')} variant="ghost" onPress={vm.cancelSetup} disabled={vm.busy} />
                  </View>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.body}>{t('sec.twofa.statusOff')}</Text>
                <Button label={t('sec.twofa.setUp')} onPress={() => void vm.startSetup()} busy={vm.busy}
                  icon={<Icon name="shield" size={16} color={color.onAction} />} />
              </>
            )}
          </Card>
        </Rise>
      ) : null}

      <View style={styles.later}>
        <View style={styles.half}><Card testID="sessions-card">
          <View style={styles.cardHead}>
            <Icon name="devices" size={22} color={color.text2} />
            <View style={styles.cardHeadText}>
              <Text accessibilityRole="header" style={styles.cardTitle}>{t('sec.sessions.title')}</Text>
              <Text style={styles.body}>{t('sec.sessions.lead')}</Text>
            </View>
          </View>
          <Note tone="info">{t('sec.sessions.unavailable')}</Note>
        </Card></View>
        <View style={styles.half}><Card testID="history-card">
          <View style={styles.cardHead}>
            <Icon name="lock-keyhole" size={22} color={color.text2} />
            <View style={styles.cardHeadText}>
              <Text accessibilityRole="header" style={styles.cardTitle}>{t('sec.history.title')}</Text>
              <Text style={styles.body}>{t('sec.history.lead')}</Text>
            </View>
          </View>
          <Note tone="info">{t('sec.history.unavailable')}</Note>
        </Card></View>
      </View>

      <ConfirmDialog
        open={vm.confirmingOff}
        tone="destructive"
        title={t('sec.twofa.offTitle')}
        body={(
          <View style={styles.dialogBody}>
            <Text style={styles.body}>{t('sec.twofa.offBody')}</Text>
            <CodeInput
              label={t('sec.twofa.codeLabel')}
              value={vm.offCode}
              onChangeText={vm.setOffCode}
              error={vm.error ? t(vm.error) : undefined}
              disabled={vm.busy}
              testID="two-step-off-code"
            />
          </View>
        )}
        confirmLabel={t('sec.twofa.turnOff')}
        cancelLabel={t('common.cancel')}
        busy={vm.busy}
        onConfirm={() => void vm.disable()}
        onCancel={vm.cancelDisable}
      />
    </ScrollView>
  );
});

/** Owns the view model's lifetime: the secret is dropped when the screen is left. */
export function SignInSecurityRoute(): React.ReactElement {
  const auth = useAuth();
  const latest = useRef(auth);
  latest.current = auth;
  const [vm] = useState(() => new TwoFactorViewModel(undefined, () => {
    const { user, updateUser } = latest.current;
    // The server has released the session; let the route guard know too.
    if (user?.twoFactorSetupRequired) updateUser({ ...user, twoFactorSetupRequired: false });
  }));
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  const role = auth.user?.role;
  const [passcode] = useState(() => new PasscodeViewModel());
  const [contacts] = useState(() => new ContactsViewModel());
  const [password] = useState(() => new PasswordCardViewModel());
  useEffect(() => {
    if (role === 'STUDENT') {
      void passcode.load();
      void contacts.load();
      void password.load();
    }
    return () => { contacts.dispose(); password.dispose(); };
  }, [passcode, contacts, password, role]);
  return (
    <SignInSecurityView
      viewModel={vm}
      onContinue={role ? () => navigate(homeForRole(role)) : undefined}
      passcode={role === 'STUDENT' ? passcode : undefined}
      contacts={role === 'STUDENT' ? contacts : undefined}
      password={role === 'STUDENT' ? password : undefined}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 1120 },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  lead: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2, marginTop: space.s4 },
  lost: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.s12, minHeight: size.touchTarget,
    padding: space.s16, borderRadius: radius.xl, backgroundColor: color.dangerBg, borderWidth: 1, borderColor: color.danger,
  },
  lostText: { flex: 1, minWidth: 180, gap: space.s2 },
  lostTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.danger },
  lostBody: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.danger },
  lostCta: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12, flexWrap: 'wrap' },
  cardHeadText: { flex: 1, minWidth: 200, gap: space.s4 },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, lineHeight: font.size.bodySm * font.lineHeight.body },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: space.s4, paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full },
  pillOn: { backgroundColor: color.positiveBg },
  pillOff: { backgroundColor: color.surface2 },
  pillText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  enrol: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s20, alignItems: 'flex-start' },
  qrFrame: { padding: space.s8, borderRadius: radius.lg, borderWidth: 1, borderColor: color.rule, overflow: 'hidden' },
  enrolSteps: { flex: 1, minWidth: 240, gap: space.s10 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s8 },
  secret: { fontFamily: font.family.mono, fontSize: font.size.body, color: color.clinicalValue, letterSpacing: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  dialogBody: { gap: space.s12 },
  contactRow: { gap: space.s10, paddingTop: space.s12, borderTopWidth: 1, borderTopColor: color.rule },
  contactHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s10, flexWrap: 'wrap' },
  contactText: { flex: 1, minWidth: 160, gap: space.s2 },
  contactKind: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text2 },
  contactValue: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text },
  contactForm: { gap: space.s10 },
  // Two cards side by side on the web board, stacked when narrow.
  later: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s16, alignItems: 'stretch' },
  half: { flexGrow: 1, flexBasis: 320, minWidth: 0 },
});
