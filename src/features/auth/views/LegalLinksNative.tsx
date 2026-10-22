import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { publicHomeUrl } from '@/core/env';
import { useT } from '@/i18n';
import { TextLink } from '@/design-system/board/BoardKit';
import { space } from '@/design-system/theme';

/**
 * The public Terms and Privacy Policy pages, opened in the browser from the
 * phone (the app has no copy of them, and the stores ask for an in-app link).
 * The site comes from EXPO_PUBLIC_SITE_URL; without an absolute web address
 * nothing is shown rather than guessing a host.
 */
export function legalPageUrl(page: 'terms' | 'privacy', site: string = publicHomeUrl()): string | null {
  if (!/^https?:\/\//.test(site)) return null;
  return `${site.replace(/\/+$/, '')}/${page}`;
}

export function LegalLinksNative(): React.ReactElement | null {
  const t = useT();
  const terms = legalPageUrl('terms');
  const privacy = legalPageUrl('privacy');
  if (!terms || !privacy) return null;
  return (
    <View style={styles.row} testID="legal-links">
      <TextLink label={t('ident.signin.termsLink')} onPress={() => { void Linking.openURL(terms); }} />
      <TextLink label={t('ident.signin.privacyLink')} onPress={() => { void Linking.openURL(privacy); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: space.s16 },
});
