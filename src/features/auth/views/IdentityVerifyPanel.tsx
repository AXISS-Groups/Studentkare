import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, ErrorState, ProgressRing, Sheet, Skeleton } from '@/design-system';
import { Icon, Illustration } from '@/design-system/icons';
import type { SkIllustrationName } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { IdentityVerifyViewModel } from '../viewmodel/IdentityVerifyViewModel';
import type { IdentityCheckId } from '../viewmodel/IdentityVerifyViewModel';
import { CHECK_TITLE, IdentityCheckRow } from './IdentityCheckRow';

export interface IdentityVerifyLinks {
  /** Where the student sends campus details. Omitted where that screen does not exist (native today). */
  openCampusVerification?: () => void;
  /** Crisis support: never behind verification (DESIGN.md §2.4). */
  openCrisis: () => void;
  back: () => void;
}

/** Art for each check's "not available yet" sheet (brief illustrations). */
const CHECK_ART: Record<IdentityCheckId, SkIllustrationName> = {
  photo: 'illustration-face-oval-guide-3',  // the phone board's face guide; the web board's is -4 (WEB_FACE_ART)
  email: 'illustration-email-verify',
  campus: 'illustration-campus-verify',
  gov: 'illustration-gov-id-verify',
};
const WEB_FACE_ART: SkIllustrationName = 'illustration-face-oval-guide-4';
const UNAVAILABLE_BODY: Record<Exclude<IdentityCheckId, 'campus'>, MessageKey> = {
  photo: 'ident.unavailable.photo', email: 'ident.unavailable.email', gov: 'ident.unavailable.gov',
};

type SheetId = IdentityCheckId | 'skip' | null;

/**
 * Verify it's you (canvas VerifyIdentity / WebVerify, Tier 1, approved 2026-10-21;
 * decision D3-6: build the four-row frame now).
 *
 * One source for web (phone frame and the wide web board) and native. Only the
 * server can turn a row green; today that is the campus check (GET /identity).
 * Photo, email and government ID have no backend: each row says "Not available
 * yet" and its sheet explains, rather than pretending to take a selfie or an
 * Aadhaar number. Progress counts only checks that exist. Crisis help sits
 * outside every state, including loading and errors.
 */
export const IdentityVerifyPanel = observer(function IdentityVerifyPanel({ viewModel: vm, links, wide = false }: { viewModel: IdentityVerifyViewModel; links: IdentityVerifyLinks; wide?: boolean }) {
  const t = useT();
  const [sheet, setSheet] = useState<SheetId>(null);
  const done = vm.remaining === 0 && vm.availableCount > 0 && !vm.loading && !vm.loadFailed;
  const ring = t('ident.verify.ring', { done: vm.verifiedCount, total: vm.availableCount });

  const open = (id: IdentityCheckId) => () => {
    if (id === 'campus') {
      if (links.openCampusVerification && vm.campusStatus !== 'VERIFIED') links.openCampusVerification();
      else setSheet('campus');
      return;
    }
    setSheet(id);
  };

  const cta = (
    <Button
      testID="verify-next"
      size="cta"
      fullWidth={!wide}
      disabled={!done}
      label={done ? t('ident.verify.done') : t('ident.verify.more', { count: Math.max(vm.remaining, 0) })}
      onPress={links.back}
    />
  );

  const crisis = (
    <View style={styles.crisis} testID="verify-crisis">
      <Icon name="phone-2" size={18} color={color.danger} />
      <View style={styles.crisisWords}>
        <Text style={styles.crisisText}>{t('ident.verify.crisis')}</Text>
        <View style={styles.crisisLinks}>
          <Pressable role="link" accessibilityRole="link" onPress={links.openCrisis} style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.inlineLink, focused ? focusRing : null]}>
            <Text style={styles.crisisLink}>{t('ident.verify.getHelp')}</Text>
          </Pressable>
          <Pressable role="button" accessibilityRole="button" onPress={() => setSheet('skip')} style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.inlineLink, focused ? focusRing : null]}>
            <Text style={styles.crisisLink}>{t('ident.verify.skip')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, wide ? styles.contentWide : null]}>
      {!wide ? (
        <Pressable
          testID="verify-back"
          role="button"
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          aria-label={t('common.back')}
          onPress={links.back}
          style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.back, focused ? focusRing : null]}
        >
          <Icon name="chevron-left" size={20} color={color.text} />
        </Pressable>
      ) : null}

      <View style={styles.head}>
        <ProgressRing value={vm.verifiedCount} total={vm.availableCount} size={wide ? 92 : 76} label={ring} testID="verify-ring" />
        <View style={styles.headWords}>
          <Text accessibilityRole="header" style={[styles.title, wide ? styles.titleWide : null]}>{t('verify.title')}</Text>
          <Text style={styles.lead}>{t('ident.verify.lead')}</Text>
          {wide ? (
            <Pressable role="button" accessibilityRole="button" onPress={() => setSheet('skip')} style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.inlineLink, styles.linkRow, focused ? focusRing : null]}>
              <Text style={styles.link}>{t('ident.verify.skip')}</Text>
              <Icon name="arrow-right" size={14} color={color.action} />
            </Pressable>
          ) : null}
        </View>
        {wide ? <View style={styles.headCta}>{cta}</View> : null}
      </View>

      {vm.loading ? <Skeleton label={t('verify.loading')} lines={['90%', '90%', '90%', '90%']} /> : null}
      {vm.loadFailed ? (
        <ErrorState title={t('verify.loadFailedTitle')} body={t('verify.loadFailedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} />
      ) : null}

      {!vm.loading ? (
        <View style={[styles.rows, wide ? styles.rowsWide : null]} role="list">
          {vm.checks.map((check) => (
            <View key={check.id} style={wide ? styles.cellWide : null} role="listitem">
              <IdentityCheckRow check={check} onPress={open(check.id)} testID={`check-${check.id}`} />
            </View>
          ))}
        </View>
      ) : null}

      {wide ? (
        <View style={styles.cards}>
          <View style={[styles.card, styles.cardGrow]}>
            <Text style={styles.eyebrow}>{t('ident.who.title')}</Text>
            <Text style={styles.cardBody}><Text style={styles.strong}>{t('ident.who.college')}</Text>{t('ident.who.collegeSees')}</Text>
            <Text style={styles.cardBody}><Text style={styles.strong}>{t('ident.who.partners')}</Text>{t('ident.who.partnersSee')}</Text>
          </View>
          <View style={[styles.card, styles.cardDanger, styles.cardGrow]} testID="verify-always-open">
            <Text style={[styles.eyebrow, styles.eyebrowDanger]}>{t('ident.always.title')}</Text>
            <Text style={styles.cardBody}>{t('ident.always.body')}</Text>
            <View style={styles.cardAction}>
              <Button variant="danger" label={t('ident.verify.getHelp')} onPress={links.openCrisis} />
            </View>
          </View>
        </View>
      ) : crisis}

      {!wide ? (
        <View style={styles.foot}>
          <View style={styles.privacy}>
            <Illustration name="illustration-id-function" size={18} />
            <Text style={styles.privacyText}>{t('ident.verify.privacy')}</Text>
          </View>
          {cta}
        </View>
      ) : null}

      <Sheet visible={sheet === 'skip'} title={t('ident.skip.title')} onClose={() => setSheet(null)}>
        <Text style={styles.sheetBody}>{t('ident.skip.body')}</Text>
        <Button label={t('ident.close')} variant="secondary" fullWidth onPress={() => setSheet(null)} />
      </Sheet>

      {(['photo', 'email', 'gov'] as const).map((id) => (
        <Sheet key={id} visible={sheet === id} title={t(CHECK_TITLE[id])} onClose={() => setSheet(null)}>
          <View style={styles.sheetArt}><Illustration name={id === 'photo' && wide ? WEB_FACE_ART : CHECK_ART[id]} size={56} /></View>
          <Text style={styles.sheetLead}>{t('ident.meta.unavailable')}</Text>
          <Text style={styles.sheetBody}>{t(UNAVAILABLE_BODY[id])}</Text>
          <Text style={styles.sheetBody}>{t('ident.unavailable.note')}</Text>
          <Button label={t('ident.close')} variant="secondary" fullWidth onPress={() => setSheet(null)} />
        </Sheet>
      ))}

      <Sheet visible={sheet === 'campus'} title={t(CHECK_TITLE.campus)} onClose={() => setSheet(null)}>
        <View style={styles.sheetArt}><Illustration name={CHECK_ART.campus} size={56} /></View>
        <Text style={styles.sheetBody}>{vm.campusVerified ? t('ident.campus.verifiedBody') : t('verify.campusOnWeb')}</Text>
        <Button label={t('ident.close')} variant="secondary" fullWidth onPress={() => setSheet(null)} />
      </Sheet>
    </ScrollView>
  );
});

export function IdentityVerifyRoute({ links, wide = false }: { links: IdentityVerifyLinks; wide?: boolean }): React.ReactElement {
  const [vm] = useState(() => new IdentityVerifyViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <IdentityVerifyPanel viewModel={vm} links={links} wide={wide} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: size.phoneWidth, width: '100%', alignSelf: 'center' },
  contentWide: { maxWidth: size.webContentMax, padding: space.s32, alignSelf: 'stretch', gap: space.s20 },
  back: {
    width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, backgroundColor: color.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.s16, flexWrap: 'wrap' },
  headWords: { flex: 1, minWidth: 200, gap: space.s6 },
  headCta: { minWidth: 240 },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  titleWide: { fontSize: font.size.display },
  lead: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, lineHeight: font.size.bodySm * font.lineHeight.body },
  link: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  inlineLink: { minHeight: size.touchTarget, justifyContent: 'center' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: space.s4, alignSelf: 'flex-start' },
  rows: { gap: space.s12 },
  rowsWide: { flexDirection: 'row', flexWrap: 'wrap' },
  cellWide: { flexGrow: 1, flexBasis: 420 },
  crisis: {
    flexDirection: 'row', gap: space.s10, padding: space.s14, borderRadius: radius.lg,
    backgroundColor: color.dangerBg, borderWidth: 1, borderColor: color.dangerRule,
  },
  crisisWords: { flex: 1, gap: space.s2 },
  crisisText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.danger, lineHeight: font.size.bodySm * font.lineHeight.body },
  crisisLinks: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.s16 },
  crisisLink: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.danger, textDecorationLine: 'underline' },
  foot: { gap: space.s14, marginTop: space.s8 },
  privacy: { flexDirection: 'row', gap: space.s8, alignItems: 'flex-start' },
  privacyText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2, lineHeight: font.size.caption * font.lineHeight.body },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s16 },
  card: { padding: space.s20, borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft, gap: space.s8 },
  cardGrow: { flexGrow: 1, flexBasis: 420 },
  cardDanger: { backgroundColor: color.dangerBg, borderColor: color.dangerRule },
  cardAction: { alignItems: 'flex-start', marginTop: space.s6 },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.text2 },
  eyebrowDanger: { color: color.danger },
  cardBody: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text, lineHeight: font.size.bodySm * font.lineHeight.body },
  strong: { fontWeight: fontWeight(font.weight.heavy) },
  sheetArt: { alignItems: 'center', paddingVertical: space.s8 },
  sheetLead: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center' },
  sheetBody: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2, lineHeight: font.size.body * font.lineHeight.body, marginBottom: space.s12 },
});
