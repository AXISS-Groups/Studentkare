import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Keyboard, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { VaccineDirectoryViewModel, type ListVaccines } from '@/features/preventive/VaccineDirectoryViewModel';
import type { Page, VaccineOffering } from '@/features/preventive/models';
import { careServices, influenzaSource } from '@/features/preventive/providerResources';
import { useNavigate } from './navigation';
import { useNativeFade } from './useNativeFade';
import { color } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

type Translate = ReturnType<typeof useT>;

/** Translations for the shared service list, keyed by its English title; anything else is shown as written. */
const SERVICE_TEXT: Readonly<Record<string, { title: MessageKey; description: MessageKey }>> = {
  'Medicines & health products': { title: 'assist.services.medicines', description: 'assist.services.medicinesBody' },
  'Lab tests & packages': { title: 'assist.services.labs', description: 'assist.services.labsBody' },
  'Doctor consultations': { title: 'assist.services.consults', description: 'assist.services.consultsBody' },
  'Current offers': { title: 'assist.services.offers', description: 'assist.services.offersBody' },
};

export function nativeApiBaseUrl(): string {
  // Expo only inlines direct dot-notation references. No web /api fallback.
  const value = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  const message = 'Set EXPO_PUBLIC_API_BASE_URL to an absolute HTTPS API URL (include /api), then restart Expo. HTTP localhost is allowed only in development.';
  try {
    if (!value || !/^https?:\/\//i.test(value)) throw new Error(message);
    const url = new URL(value);
    const localDevelopment = typeof __DEV__ !== 'undefined' && __DEV__ &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (!url.hostname || url.username || url.password || url.search || url.hash ||
        (url.protocol !== 'https:' && !(url.protocol === 'http:' && localDevelopment))) {
      throw new Error(message);
    }
    return url.toString().replace(/\/+$/, '');
  } catch {
    throw new Error(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTimestamp(value: unknown): boolean {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 8.64e12);
}

function isOffering(value: unknown): value is VaccineOffering {
  if (!isRecord(value)) return false;
  return ['id', 'providerId', 'providerName', 'vaccineName', 'pincode', 'region', 'sourceUrl'].every(key => typeof value[key] === 'string') &&
    (value.bookingUrl === null || typeof value.bookingUrl === 'string') &&
    isTimestamp(value.lastVerifiedAt) && isTimestamp(value.expiresAt) &&
    (value.pricePaise === null || (typeof value.pricePaise === 'number' && Number.isSafeInteger(value.pricePaise) && value.pricePaise >= 0)) &&
    value.currency === 'INR' && ['UNKNOWN', 'CONFIRMED'].includes(String(value.availability)) &&
    ['UNVERIFIED', 'VERIFIED', 'EXPIRED'].includes(String(value.verificationStatus));
}

/** Public transport only: no shared authenticated client, session headers or PHI. */
const listNativeVaccines: ListVaccines = async ({ query, pincode, provider, offset, limit }) => {
  const base = nativeApiBaseUrl();
  const params = Object.entries({ query, pincode, provider, offset, limit })
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    let response: Response;
    try {
      response = await fetch(`${base}/preventive/vaccines?${params}`, {
        method: 'GET', headers: { Accept: 'application/json' }, credentials: 'omit', signal: controller.signal,
      });
    } catch {
      throw new Error(controller.signal.aborted
        ? 'The directory request timed out. Please retry.'
        : 'Cannot connect to the vaccine directory. Check your connection and retry.');
    }
    let result: unknown;
    try {
      result = await response.json();
    } catch {
      throw new Error(`The directory returned unreadable JSON (HTTP ${response.status}). Please retry.`);
    }
    // Do not expose arbitrary server detail/debug envelopes to the public UI.
    if (!response.ok) throw new Error(`The vaccine directory is unavailable (HTTP ${response.status}). Please retry.`);
    if (!isRecord(result) || !Array.isArray(result.items) || !result.items.every(isOffering) ||
        typeof result.total !== 'number' || !Number.isSafeInteger(result.total) || result.total < 0 ||
        result.offset !== offset || result.limit !== limit || result.items.length > limit ||
        (result.items.length > 0 && offset + result.items.length > result.total)) {
      throw new Error('The directory returned an invalid listing response. Please retry.');
    }
    return result as unknown as Page<VaccineOffering>;
  } finally {
    clearTimeout(timeout);
  }
};

async function openExternalUrl(value: string, t: Translate) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw new Error('Invalid external URL');
    await Linking.openURL(url.toString());
  } catch {
    Alert.alert(t('assist.native.openFailedTitle'), t('assist.native.openFailedBody'));
  }
}

function Action({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled}
      onPress={onPress} style={({ pressed }) => [styles.button, (disabled || pressed) && styles.dimmed]}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

function ExternalLink({ title, url }: { title: string; url: string }) {
  const t = useT();
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={t('assist.native.externalLabel', { title, url })}
      accessibilityHint={t('assist.native.externalHint')} onPress={() => void openExternalUrl(url, t)}
      style={({ pressed }) => [styles.link, pressed && styles.dimmed]}>
      <Text style={styles.linkText}>{title} ↗</Text>
      <Text style={styles.url}>{url}</Text>
    </Pressable>
  );
}

function timestampLabel(value: number | null, t: Translate): string {
  return value === null ? t('assist.native.unknown') : new Date(value * 1000).toLocaleString();
}

function VaccineCard({ item }: { item: VaccineOffering }) {
  const t = useT();
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>{item.vaccineName}</Text>
      <Text style={styles.body}>{item.providerName}</Text>
      <Text style={styles.secondary}>{[item.region, item.pincode].filter(Boolean).join(' · ')}</Text>
      <Text style={styles.status}>{t('assist.native.verification', { status: t(`assist.prev.verify.${item.verificationStatus}` as MessageKey) })}</Text>
      <Text style={styles.body}>{t('assist.native.availability', { value: item.availability === 'CONFIRMED' ? t('assist.native.confirmed') : t('assist.native.checkProvider') })}</Text>
      <Text style={styles.body}>{t('assist.native.price', { value: item.pricePaise === null ? t('assist.native.checkProvider') : `₹${(item.pricePaise / 100).toFixed(2)} INR` })}</Text>
      <Text style={styles.secondary}>{t('assist.native.lastVerified', { date: timestampLabel(item.lastVerifiedAt, t) })}</Text>
      <Text style={styles.secondary}>{t('assist.native.expires', { date: timestampLabel(item.expiresAt, t) })}</Text>
      <ExternalLink title={t('assist.native.listingSource', { name: item.vaccineName })} url={item.sourceUrl} />
      {item.bookingUrl
        ? <ExternalLink title={t('assist.native.bookingAt', { name: item.providerName })} url={item.bookingUrl} />
        : <Text style={styles.secondary}>{t('assist.native.noBooking')}</Text>}
      <Text style={styles.secondary}>{t('assist.native.externalNote')}</Text>
    </View>
  );
}

const PreventiveCareScreen = observer(function PreventiveCareScreen() {
  const t = useT();
  const [vm] = useState(() => new VaccineDirectoryViewModel(listNativeVaccines));
  const [filtersDirty, setFiltersDirty] = useState(false);
  const navigate = useNavigate();
  const scroll = useRef<ScrollView>(null);
  const { width, fontScale } = useWindowDimensions();
  const wide = width >= 760 && fontScale <= 1.3;
  const opacity = useNativeFade();

  useEffect(() => {
    void vm.search();
    return () => vm.dispose();
  }, [vm]);

  const search = (offset = 0) => {
    Keyboard.dismiss();
    setFiltersDirty(false);
    scroll.current?.scrollTo({ y: 0, animated: false });
    void vm.search(offset);
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
        <Animated.View style={[styles.section, { opacity }]}>
          <Text style={styles.eyebrow}>{t('assist.native.eyebrow')}</Text>
          <Text accessibilityRole="header" style={styles.title}>{t('assist.native.title')}</Text>
          <Text style={styles.body}>{t('assist.native.intro')}</Text>
          <Text style={styles.secondary}>{t('assist.native.publicOnly')}</Text>
          <Action title={t('assist.native.openCamp')} onPress={() => navigate('Camp')} />
        </Animated.View>

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.cardTitle}>{t('assist.native.searchTitle')}</Text>
          <View style={[styles.fields, wide && styles.row]}>
            <View style={styles.field}>
              <Text style={styles.label}>{t('assist.native.queryLabel')}</Text>
              <TextInput accessibilityLabel={t('assist.native.queryLabel')} placeholder={t('assist.native.queryPlaceholder')} placeholderTextColor={color.text3}
                value={vm.query} onChangeText={value => { vm.setQuery(value); setFiltersDirty(true); }}
                maxLength={160} editable={!vm.loading} autoCorrect={false} returnKeyType="search"
                onSubmitEditing={() => search()} style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>{t('assist.prev.pincodeLabel')}</Text>
              <TextInput accessibilityLabel={t('assist.native.pincodeSpoken')} placeholder={t('assist.native.pincodePlaceholder')} placeholderTextColor={color.text3}
                value={vm.pincode} onChangeText={value => { vm.setPincode(value); setFiltersDirty(true); }}
                maxLength={6} editable={!vm.loading} keyboardType="number-pad" onSubmitEditing={() => search()} style={styles.input} />
            </View>
          </View>
          <Action title={vm.loading ? t('assist.native.loadingDirectory') : t('assist.native.search')} disabled={vm.loading} onPress={() => search()} />
          {filtersDirty && <Text style={styles.secondary}>{t('assist.native.filtersChanged')}</Text>}
        </View>

        <View accessibilityLiveRegion="polite" accessibilityState={{ busy: vm.loading }} style={styles.section}>
          {vm.loading ? <Text style={styles.body}>{t('assist.native.loadingListings')}</Text>
            : vm.error ? (
              <View style={styles.error}>
                <Text accessibilityRole="alert" style={styles.errorText}>{vm.error === 'Enter a valid six-digit Indian pincode.' ? t('assist.prev.pincodeInvalid') : vm.error}</Text>
                <Action title={t('assist.native.retry')} onPress={() => search(filtersDirty ? 0 : vm.offset)} />
              </View>
            ) : <Text accessibilityRole="header" style={styles.cardTitle}>
              {vm.items.length ? t('assist.native.range', { from: vm.offset + 1, to: vm.offset + vm.items.length, total: vm.total }) : t('assist.native.noListings')}
            </Text>}
          {!vm.loading && !vm.error && !vm.items.length && <Text style={styles.body}>{t('assist.native.noListingsBody')}</Text>}
        </View>

        <View style={[styles.grid, wide && styles.row]}>
          {vm.items.map(item => <View key={item.id} style={wide ? styles.halfColumn : styles.fullColumn}><VaccineCard item={item} /></View>)}
        </View>

        {!vm.loading && !vm.error && (vm.total > 0 || vm.offset > 0) && (
          <View style={styles.section}>
            <View style={styles.pagination}>
              <Action title={t('assist.native.prevPage')} disabled={filtersDirty || vm.offset === 0} onPress={() => search(Math.max(0, vm.offset - vm.limit))} />
              <Action title={t('assist.native.nextPage')} disabled={filtersDirty || vm.offset + vm.limit >= vm.total || vm.offset + vm.limit > 10000} onPress={() => search(vm.offset + vm.limit)} />
            </View>
            <Text style={styles.secondary}>{t('assist.native.pageInfo', { page: Math.floor(vm.offset / vm.limit) + 1, limit: vm.limit })}</Text>
            {vm.offset + vm.limit > 10000 && vm.offset + vm.limit < vm.total && <Text style={styles.secondary}>{t('assist.native.refine')}</Text>}
          </View>
        )}

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.cardTitle}>{t('assist.native.fluTitle')}</Text>
          <Text style={styles.body}>{t('assist.native.fluBody')}</Text>
          <ExternalLink title={t('assist.native.fluLink')} url={influenzaSource} />
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.cardTitle}>{t('assist.native.servicesTitle')}</Text>
          <Text style={styles.body}>{t('assist.native.servicesBody')}</Text>
        </View>
        {careServices.map(service => {
          const text = SERVICE_TEXT[service.title];
          return (
            <View key={service.title} style={styles.card}>
              <Text style={styles.cardTitle}>{text ? t(text.title) : service.title}</Text>
              <Text style={styles.body}>{text ? t(text.description) : service.description}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
});

export default PreventiveCareScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: color.canvas },
  content: { padding: 20, gap: 16, maxWidth: 1080, width: '100%', alignSelf: 'center', paddingBottom: 32 },
  section: { gap: 12 },
  eyebrow: { color: color.action, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  title: { color: color.text, fontSize: 28, fontWeight: '800' },
  cardTitle: { color: color.text, fontSize: 20, fontWeight: '700' },
  body: { color: color.text, fontSize: 16, flexShrink: 1 },
  secondary: { color: color.text2, fontSize: 14, flexShrink: 1 },
  card: { padding: 18, gap: 12, borderRadius: 16, borderWidth: 1, borderColor: color.rule, backgroundColor: color.surface },
  status: { color: color.action, fontSize: 15, fontWeight: '700' },
  fields: { gap: 16 },
  field: { flex: 1, minWidth: 0, gap: 8 },
  label: { color: color.text, fontSize: 16, fontWeight: '600' },
  input: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: color.ruleStrong, borderRadius: 8, fontSize: 17, color: color.text, backgroundColor: color.surface },
  button: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, backgroundColor: color.action, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: color.onAction, fontSize: 16, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  dimmed: { opacity: 0.5 },
  link: { minHeight: 48, justifyContent: 'center', paddingVertical: 8, gap: 6 },
  linkText: { color: color.action, fontSize: 16, fontWeight: '600', textDecorationLine: 'underline', flexShrink: 1 },
  url: { color: color.text2, fontSize: 13, flexShrink: 1 },
  grid: { gap: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  halfColumn: { flexBasis: '47%', flexGrow: 1, minWidth: 0 },
  fullColumn: { width: '100%' },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  error: { padding: 16, gap: 12, borderRadius: 12, backgroundColor: color.dangerBg },
  errorText: { color: color.danger, fontSize: 16 },
});
