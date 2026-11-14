import { Alert, Linking } from 'react-native';
import { publicHomeUrl } from '@/core/env';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

type WebAction = 'export' | 'support' | 'lifeshare' | 'consultation';
type WebPage = 'data-export' | 'support' | 'consults';
const ACTIONS: Record<WebAction, { title: MessageKey; body: MessageKey; path?: WebPage }> = {
  export: { title: 'privacy.rights.access.cta', body: 'native.web.export', path: 'data-export' },
  support: { title: 'privacy.rights.grievance.help', body: 'native.web.support', path: 'support' },
  lifeshare: { title: 'privacy.title', body: 'native.web.unavailable' },
  consultation: { title: 'nav.appointments', body: 'native.web.consultation', path: 'consults' },
};

/** Only the configured HTTPS site, without credentials, query strings or fragments. */
export function nativeWebActionUrl(path: WebPage, site = publicHomeUrl()): string | null {
  // React Native 0.76 has no URL.protocol/username/search implementation.
  // Restrict the configured host and path directly instead of relying on those getters.
  if (!/^https:\/\/[a-z\d](?:[a-z\d.-]*[a-z\d])?(?::\d+)?(?:\/[a-z\d._~-]*)*\/?$/i.test(site)) return null;
  const host = site.split('/')[2]?.split(':')[0];
  if (!host || !host.split('.').every((label) => /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label))) return null;
  return `${site.replace(/\/+$/, '')}/${path}`;
}

/** A truthful handoff. Browser sign-in is separate; no app session or health data is passed. */
export function useNativeWebAction(): (action: WebAction) => void {
  const t = useT();
  return (action) => {
    const { title, body, path } = ACTIONS[action];
    const url = path ? nativeWebActionUrl(path) : null;
    Alert.alert(t(title), t(body), [
      { text: t('common.done'), style: 'cancel' },
      ...(url ? [{ text: t('native.web.open'), onPress: () => {
        void Linking.openURL(url).catch(() => Alert.alert(t(title), t('native.web.failed')));
      } }] : []),
    ]);
  };
}
