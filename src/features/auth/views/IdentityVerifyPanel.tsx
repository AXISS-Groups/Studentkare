import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, ErrorState, ProgressRing, Sheet, Skeleton } from '@/design-system';
import { Icon, Illustration } from '@/design-system/icons';
import type { SkIllustrationName } from '@/design-system/icons';
import { M2Callout, M2Card, M2Grid, M2Header, M2Heading, M2PageHero, M2Tile3d, M2WideColumn, m2Text, useM2Layout, useOwnPhoneChrome } from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { BoardArt } from '@/design-system/board/BoardKit';
import { color, focusRing, font, fontWeight, size, space } from '@/design-system/theme';
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
  useOwnPhoneChrome();
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

  const skipLink = (
    <Pressable role="button" accessibilityRole="button" onPress={() => setSheet('skip')} style={({ focused }: PressState) => [styles.inlineLink, styles.linkRow, focused ? focusRing : null]}>
      <Text style={styles.link}>{t('ident.verify.skip')}</Text>
      <Icon name="arrow-right" size={14} color={color.action} />
    </Pressable>
  );

  // Progress: the ring (one accessible image, named "n of m checks verified") beside the words.
  const progress = (
    <M2Card style={styles.progress} testID="verify-progress">
      <ProgressRing value={vm.verifiedCount} total={vm.availableCount} size={wide ? 84 : 72} label={ring} testID="verify-ring" />
      <View style={styles.grow}>
        <Text style={m2Text.cardTitle}>{ring}</Text>
      </View>
      {wide ? <View style={styles.headCta}>{cta}</View> : null}
    </M2Card>
  );

  const rows = !vm.loading ? (
    <M2Grid columns={{ phone: 1, tablet: 2, desktop: 2 }} style={styles.rows}>
      {vm.checks.map((check) => (
        <View key={check.id}>
          <IdentityCheckRow check={check} onPress={open(check.id)} testID={`check-${check.id}`} />
        </View>
      ))}
    </M2Grid>
  ) : null;

  const who = (
    <M2Card style={styles.card} testID="verify-who">
      <M2Heading style={m2Text.section}>{t('ident.who.title')}</M2Heading>
      <View style={styles.whoRow}>
        <M2Tile3d icon="graduation-cap" hue="amber" size={36} />
        <Text style={[m2Text.body, styles.grow]}><Text style={styles.strong}>{t('ident.who.college')}</Text>{t('ident.who.collegeSees')}</Text>
      </View>
      <View style={styles.whoRow}>
        <M2Tile3d icon="lock" hue="indigo" size={36} />
        <Text style={[m2Text.body, styles.grow]}><Text style={styles.strong}>{t('ident.who.partners')}</Text>{t('ident.who.partnersSee')}</Text>
      </View>
    </M2Card>
  );

  // Crisis help sits outside every state, including loading and errors (DESIGN.md §2.4).
  const always = (
    <M2Callout tone="positive" icon="phone-2" hue="green" title={t('ident.always.title')} body={wide ? t('ident.always.body') : t('ident.verify.crisis')} testID="verify-always-open"
      action={{ label: t('ident.verify.getHelp'), onPress: links.openCrisis, testID: 'verify-get-help' }} />
  );

  const privacy = (
    <View style={styles.privacy}>
      <Illustration name="illustration-id-function" size={18} />
      <Text style={styles.privacyText}>{t('ident.verify.privacy')}</Text>
    </View>
  );

  const sheets = (
    <>
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
    </>
  );

  const states = (
    <>
      {vm.loading ? <M2Card style={styles.card}><Skeleton label={t('verify.loading')} lines={['90%', '90%', '90%', '90%']} /></M2Card> : null}
      {vm.loadFailed ? (
        <M2Card style={styles.card}><ErrorState title={t('verify.loadFailedTitle')} body={t('verify.loadFailedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /></M2Card>
      ) : null}
    </>
  );

  const hero = (
    <M2PageHero hue="teal" icon="shield-check" title={wide ? t('verify.title') : undefined} body={t('ident.verify.lead')} testID="verify-hero"
      art={<BoardArt name="image-31444f.png" width={220} height={150} />} artOnPhone={false} />
  );

  if (wide) {
    return (
      <M2WideColumn testID="verify-identity">
        <M2Header backLabel={t('common.back')} onBack={links.back} title={t('verify.title')} testID="verify-header" />
        {hero}
        <TwoThirds
          main={<>{progress}{states}{rows}{privacy}</>}
          side={<>{who}{always}{skipLink}</>}
        />
        {sheets}
      </M2WideColumn>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="verify-identity">
      <M2Header backLabel={t('common.back')} onBack={links.back} title={t('verify.title')} testID="verify-back" />
      <View style={[styles.gutter, styles.column]}>
        {hero}
        {progress}
        {states}
        {rows}
        {who}
        {always}
        {skipLink}
        {privacy}
        {cta}
      </View>
      {sheets}
    </ScrollView>
  );
});

/** Desktop: the checks take two thirds, the side cards one third (the board); narrower they stack. */
function TwoThirds({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  const desktop = useM2Layout() === 'desktop';
  if (!desktop) return <View style={styles.column}>{main}{side}</View>;
  return (
    <View style={styles.twoThirds}>
      <View style={styles.span2}>{main}</View>
      <View style={styles.side}>{side}</View>
    </View>
  );
}

export function IdentityVerifyRoute({ links, wide = false }: { links: IdentityVerifyLinks; wide?: boolean }): React.ReactElement {
  const [vm] = useState(() => new IdentityVerifyViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <IdentityVerifyPanel viewModel={vm} links={links} wide={wide} />;
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: space.s2 },
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { gap: space.s14, paddingBottom: space.s40 },
  gutter: { paddingHorizontal: space.gutterPhone },
  column: { gap: space.s14 },
  span2: { flex: 2, minWidth: 0, gap: space.s14 },
  side: { flex: 1, minWidth: 0, gap: space.s14 },
  twoThirds: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s16 },
  card: { padding: space.s16, gap: space.s10 },
  progress: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.s16, padding: space.s16 },
  headCta: { minWidth: 220 },
  link: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  inlineLink: { minHeight: size.touchTarget, justifyContent: 'center' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: space.s4, alignSelf: 'flex-start' },
  rows: {},
  whoRow: { flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  strong: { fontWeight: fontWeight(font.weight.heavy), color: color.text },
  privacy: { flexDirection: 'row', gap: space.s8, alignItems: 'flex-start' },
  privacyText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text2, lineHeight: font.size.caption * font.lineHeight.body },
  sheetArt: { alignItems: 'center', paddingVertical: space.s8 },
  sheetLead: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center' },
  sheetBody: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2, lineHeight: font.size.body * font.lineHeight.body, marginBottom: space.s12 },
});
