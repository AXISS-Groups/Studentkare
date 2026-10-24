import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLanguage, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Button, OfflineBanner, Skeleton, useOnline } from '@/design-system';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { M2EdgeCard, M2Grid, M2Header, M2Heading, M2PageHero, M2Tile3d, M2WideColumn, SERVICE_HUES, m2Text, useOwnPhoneChrome } from '@/design-system/m2';
import type { TileHue3d } from '@/design-system/m2';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { getSetting } from '@/data/services/config';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { useLegalDocument } from './LegalText';
import { privacyRepository, paragraphs } from './privacyRepository';
import type { LegalDocument, LegalKind } from './privacyRepository';
import { dateOf } from './dates';

interface Right {
  id: string; icon: SkIconName; hue: TileHue3d; edge: string; title: MessageKey; body: MessageKey;
  actions: { label: MessageKey; route: RoutePath; icon: SkIconName; tone?: 'danger' | 'primary' }[];
}

const RIGHTS: readonly Right[] = [
  { id: 'access', icon: 'download', hue: 'indigo', edge: SERVICE_HUES.indigo.light, title: 'privacy.rights.access.title', body: 'privacy.rights.access.body',
    actions: [{ label: 'privacy.rights.access.cta', route: 'data-export', icon: 'download', tone: 'primary' }] },
  { id: 'correct', icon: 'pencil', hue: 'violet', edge: SERVICE_HUES.violet.light, title: 'privacy.rights.correct.title', body: 'privacy.rights.correct.body',
    actions: [{ label: 'privacy.rights.correct.cta', route: 'profile', icon: 'pencil' }, { label: 'privacy.rights.correct.card', route: 'emergency-card', icon: 'file-text' }] },
  { id: 'erase', icon: 'trash', hue: 'danger', edge: color.danger, title: 'privacy.rights.erase.title', body: 'privacy.rights.erase.body',
    actions: [{ label: 'privacy.rights.erase.cta', route: 'delete-account', icon: 'trash', tone: 'danger' }] },
  { id: 'consent', icon: 'shield-check', hue: 'green', edge: SERVICE_HUES.green.light, title: 'privacy.rights.consent.title', body: 'privacy.rights.consent.body',
    actions: [{ label: 'privacy.rights.consent.cta', route: 'privacy-consent', icon: 'arrow-right' }] },
];

/**
 * Your data rights (audit H2; Tier 1 look T1DataRights / T1DataRightsDesktop,
 * approved by Krishna Chintakayala 2026-10-24, plan tier1-parity-2026-10-24
 * §14): access (download), correction (edit details where the student may),
 * erasure (delete account, with the grace days from the settings registry),
 * consent withdrawal, and grievance. The grievance officer is shown only from
 * the published GRIEVANCE_OFFICER document (Super admin → Legal documents);
 * until one is published the page says "not published yet" and points to
 * Help. No name is ever written here. React Native, so Expo can register it.
 */
export function DataRightsView({ loadLegal = privacyRepository.legal, wide = false }: { loadLegal?: (kind: LegalKind) => Promise<LegalDocument>; wide?: boolean }): React.ReactElement {
  const t = useT();
  const { lang } = useLanguage();
  useOwnPhoneChrome();
  const online = useOnline();
  const grievance = useLegalDocument('GRIEVANCE_OFFICER', loadLegal);
  const graceDays = getSetting('privacy.deletion_grace_days');

  const cards = RIGHTS.map((right) => (
    <M2EdgeCard key={right.id} edge={right.edge} fill testID={`right-${right.id}`}>
      <View style={styles.head}>
        <M2Tile3d icon={right.icon} hue={right.hue} size={48} />
        <View style={styles.grow}>
          <M2Heading style={m2Text.section}>{t(right.title)}</M2Heading>
          <Text style={m2Text.body}>{t(right.body, { days: graceDays })}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        {right.actions.map((action) => (
          <Button key={action.route} label={t(action.label)} variant={action.tone === 'danger' ? 'dangerOutline' : action.tone === 'primary' ? 'primary' : 'secondary'}
            disabled={!online && action.route === 'data-export'} onPress={() => navigate(action.route)}
            icon={<Icon name={action.icon} size={16} color={action.tone === 'danger' ? color.danger : action.tone === 'primary' ? color.onAction : color.action} />} />
        ))}
      </View>
    </M2EdgeCard>
  ));

  const grievanceCard = (
    <M2EdgeCard edge={SERVICE_HUES.amber.light} testID="right-grievance">
      <View style={styles.head}>
        <M2Tile3d icon="volume" hue="amber" size={48} />
        <View style={styles.grow}>
          <M2Heading style={m2Text.section}>{t('privacy.rights.grievance.title')}</M2Heading>
          {grievance.status === 'loading' ? <Skeleton label={t('privacy.rights.grievance.loading')} lines={['80%', '60%']} /> : null}
          {grievance.status === 'error' ? <Text role="alert" accessibilityRole="alert" style={styles.error}>{t('privacy.rights.grievance.error')}</Text> : null}
          {grievance.status === 'ready' && grievance.doc.published ? <LegalBody doc={grievance.doc} lang={lang} /> : null}
          {grievance.status === 'ready' && !grievance.doc.published ? (
            <>
              <Text style={[m2Text.body, { color: color.text }]} testID="grievance-unpublished">{t('privacy.rights.grievance.unpublished')}</Text>
              <Text style={m2Text.body}>{t('privacy.rights.grievance.meanwhile')}</Text>
            </>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
        {grievance.status === 'error' ? <Button label={t('common.tryAgain')} variant="secondary" onPress={grievance.retry} /> : null}
        <Button label={t('privacy.rights.grievance.help')} variant="secondary" onPress={() => navigate('support')} icon={<Icon name="help-circle" size={16} color={color.action} />} />
      </View>
    </M2EdgeCard>
  );

  const hero = <M2PageHero hue="violet" icon="shield-2" title={wide ? t('privacy.rights.title') : undefined} body={t('privacy.rights.sub')} testID="rights-hero" art={<M2Tile3d icon="shield-check" hue="violet" size={96} float />} artOnPhone={false} />;
  const offline = !online ? <OfflineBanner message={t('common.retryConnection')} /> : null;

  if (wide) {
    return (
      <M2WideColumn testID="data-rights">
        <M2Header backLabel={t('common.back')} onBack={() => navigate('privacy-consent')} title={t('privacy.rights.title')} testID="rights-header" />
        {hero}
        {offline}
        <M2Grid columns={{ desktop: 4, tablet: 2 }}>{cards}</M2Grid>
        {grievanceCard}
      </M2WideColumn>
    );
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="data-rights">
      <M2Header backLabel={t('common.back')} onBack={() => navigate('privacy-consent')} title={t('privacy.rights.title')} testID="rights-header" />
      <View style={[styles.gutter, styles.column]}>
        {hero}
        {offline}
        {cards}
        {grievanceCard}
      </View>
    </ScrollView>
  );
}

/** A published legal text exactly as the super admin published it from legal's words: version and date, then its paragraphs. Never authored in code. */
function LegalBody({ doc, lang }: { doc: LegalDocument; lang: ReturnType<typeof useLanguage>['lang'] }) {
  const t = useT();
  if (!doc.body) return null;
  return (
    <View style={styles.legal}>
      {doc.title ? <Text style={m2Text.cardTitle}>{doc.title}</Text> : null}
      <Text style={m2Text.meta}>{t('privacy.legal.version', { version: doc.version ?? '', date: dateOf(doc.publishedAt ?? 0, lang) })}</Text>
      {paragraphs(doc.body).map((text, index) => <Text key={index} style={[m2Text.body, { color: color.text }]}>{text}</Text>)}
    </View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0, gap: space.s4 },
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { gap: space.s14, paddingBottom: space.s40 },
  gutter: { paddingHorizontal: space.gutterPhone },
  column: { gap: space.s14 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8, marginTop: 'auto' },
  legal: { gap: space.s6 },
  error: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.danger },
});
