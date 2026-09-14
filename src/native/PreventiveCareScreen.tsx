import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Keyboard, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { VaccineDirectoryViewModel, type ListVaccines } from '@/features/preventive/VaccineDirectoryViewModel';
import type { Page, VaccineOffering } from '@/features/preventive/models';
import { careServices, influenzaSource } from '@/features/preventive/providerResources';
import { useNavigate } from './navigation';
import { useNativeFade } from './useNativeFade';

function nativeApiBaseUrl(): string {
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
export const listNativeVaccines: ListVaccines = async ({ query, pincode, provider, offset, limit }) => {
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

async function openExternalUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) throw new Error('Invalid external URL');
    await Linking.openURL(url.toString());
  } catch {
    Alert.alert('Could not open external website', 'This link may be invalid or your device could not open it. Please try again later.');
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
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${title}. External website. ${url}`}
      accessibilityHint="Opens outside SA Care in your browser" onPress={() => void openExternalUrl(url)}
      style={({ pressed }) => [styles.link, pressed && styles.dimmed]}>
      <Text style={styles.linkText}>{title} ↗</Text>
      <Text style={styles.url}>{url}</Text>
    </Pressable>
  );
}

function timestampLabel(value: number | null): string {
  return value === null ? 'Unknown' : new Date(value * 1000).toLocaleString();
}

function VaccineCard({ item }: { item: VaccineOffering }) {
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>{item.vaccineName}</Text>
      <Text style={styles.body}>{item.providerName}</Text>
      <Text style={styles.secondary}>{[item.region, item.pincode].filter(Boolean).join(' · ')}</Text>
      <Text style={styles.status}>Listing verification: {item.verificationStatus.toLowerCase()}</Text>
      <Text style={styles.body}>Availability: {item.availability === 'CONFIRMED' ? 'Confirmed in directory' : 'Unknown — check with provider'}</Text>
      <Text style={styles.body}>Listed price: {item.pricePaise === null ? 'Unknown — check with provider' : `₹${(item.pricePaise / 100).toFixed(2)} INR`}</Text>
      <Text style={styles.secondary}>Last verified: {timestampLabel(item.lastVerifiedAt)}</Text>
      <Text style={styles.secondary}>Verification expires: {timestampLabel(item.expiresAt)}</Text>
      <ExternalLink title={`Listing source for ${item.vaccineName}`} url={item.sourceUrl} />
      {item.bookingUrl
        ? <ExternalLink title={`Booking information at ${item.providerName}`} url={item.bookingUrl} />
        : <Text style={styles.secondary}>No booking link supplied.</Text>}
      <Text style={styles.secondary}>External information. Confirm current price, stock and eligibility with the provider; this listing does not reserve a dose or appointment.</Text>
    </View>
  );
}

const PreventiveCareScreen = observer(function PreventiveCareScreen() {
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
          <Text style={styles.eyebrow}>PUBLIC PREVENTIVE CARE</Text>
          <Text accessibilityRole="header" style={styles.title}>Find vaccine information</Text>
          <Text style={styles.body}>Search public provider listings by vaccine, provider name or pincode. Please enter search terms only, not personal health information.</Text>
          <Text style={styles.secondary}>Native access is public only. Sign-in, private patient reports and personal preventive preferences are not available here yet.</Text>
          <Action title="Open camp proof of concept" onPress={() => navigate('Camp')} />
        </Animated.View>

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.cardTitle}>Search directory</Text>
          <View style={[styles.fields, wide && styles.row]}>
            <View style={styles.field}>
              <Text style={styles.label}>Vaccine or provider name</Text>
              <TextInput accessibilityLabel="Vaccine or provider name" placeholder="Search vaccine or provider" placeholderTextColor="#64748b"
                value={vm.query} onChangeText={value => { vm.setQuery(value); setFiltersDirty(true); }}
                maxLength={160} editable={!vm.loading} autoCorrect={false} returnKeyType="search"
                onSubmitEditing={() => search()} style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Pincode (optional)</Text>
              <TextInput accessibilityLabel="Six-digit Indian pincode, optional" placeholder="Six-digit pincode" placeholderTextColor="#64748b"
                value={vm.pincode} onChangeText={value => { vm.setPincode(value); setFiltersDirty(true); }}
                maxLength={6} editable={!vm.loading} keyboardType="number-pad" onSubmitEditing={() => search()} style={styles.input} />
            </View>
          </View>
          <Action title={vm.loading ? 'Loading directory…' : 'Search vaccines'} disabled={vm.loading} onPress={() => search()} />
          {filtersDirty && <Text style={styles.secondary}>Filters changed. Search to update the results before changing pages.</Text>}
        </View>

        <View accessibilityLiveRegion="polite" accessibilityState={{ busy: vm.loading }} style={styles.section}>
          {vm.loading ? <Text style={styles.body}>Loading public vaccine listings…</Text>
            : vm.error ? (
              <View style={styles.error}>
                <Text accessibilityRole="alert" style={styles.errorText}>{vm.error}</Text>
                <Action title="Retry directory search" onPress={() => search(filtersDirty ? 0 : vm.offset)} />
              </View>
            ) : <Text accessibilityRole="header" style={styles.cardTitle}>
              {vm.items.length ? `${vm.offset + 1}–${vm.offset + vm.items.length} of ${vm.total} listings` : 'No listings found'}
            </Text>}
          {!vm.loading && !vm.error && !vm.items.length && <Text style={styles.body}>No vaccine offerings were returned for this search. Try another vaccine or pincode. An empty directory does not establish local availability.</Text>}
        </View>

        <View style={[styles.grid, wide && styles.row]}>
          {vm.items.map(item => <View key={item.id} style={wide ? styles.halfColumn : styles.fullColumn}><VaccineCard item={item} /></View>)}
        </View>

        {!vm.loading && !vm.error && (vm.total > 0 || vm.offset > 0) && (
          <View style={styles.section}>
            <View style={styles.pagination}>
              <Action title="Previous page" disabled={filtersDirty || vm.offset === 0} onPress={() => search(Math.max(0, vm.offset - vm.limit))} />
              <Action title="Next page" disabled={filtersDirty || vm.offset + vm.limit >= vm.total || vm.offset + vm.limit > 10000} onPress={() => search(vm.offset + vm.limit)} />
            </View>
            <Text style={styles.secondary}>Page {Math.floor(vm.offset / vm.limit) + 1} · up to {vm.limit} listings per page</Text>
            {vm.offset + vm.limit > 10000 && vm.offset + vm.limit < vm.total && <Text style={styles.secondary}>Refine your search to see more results within the directory’s pagination limit.</Text>}
          </View>
        )}

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.cardTitle}>Seasonal influenza information</Text>
          <Text style={styles.body}>Read WHO’s public information and ask a qualified clinician about vaccination suitability.</Text>
          <ExternalLink title="WHO seasonal influenza fact sheet" url={influenzaSource} />
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.cardTitle}>Studentkare care services</Text>
          <Text style={styles.body}>Medicines, lab tests, consultations and offers are available inside the Studentkare app. These are in-app destinations, not an external catalog feed or a partnership claim. Availability and prices are confirmed at the point of care.</Text>
        </View>
        {careServices.map(service => (
          <View key={service.title} style={styles.card}>
            <Text style={styles.cardTitle}>{service.title}</Text>
            <Text style={styles.body}>{service.description}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
});

export default PreventiveCareScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 20, gap: 16, maxWidth: 1080, width: '100%', alignSelf: 'center', paddingBottom: 32 },
  section: { gap: 12 },
  eyebrow: { color: '#155e75', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  title: { color: '#0f172a', fontSize: 28, fontWeight: '800' },
  cardTitle: { color: '#0f172a', fontSize: 20, fontWeight: '700' },
  body: { color: '#1e293b', fontSize: 16, flexShrink: 1 },
  secondary: { color: '#475569', fontSize: 14, flexShrink: 1 },
  card: { padding: 18, gap: 12, borderRadius: 16, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff' },
  status: { color: '#155e75', fontSize: 15, fontWeight: '700' },
  fields: { gap: 16 },
  field: { flex: 1, minWidth: 0, gap: 8 },
  label: { color: '#1e293b', fontSize: 16, fontWeight: '600' },
  input: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: '#64748b', borderRadius: 8, fontSize: 17, color: '#0f172a', backgroundColor: '#ffffff' },
  button: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, backgroundColor: '#155e75', justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  dimmed: { opacity: 0.5 },
  link: { minHeight: 48, justifyContent: 'center', paddingVertical: 8, gap: 6 },
  linkText: { color: '#155e75', fontSize: 16, fontWeight: '600', textDecorationLine: 'underline', flexShrink: 1 },
  url: { color: '#475569', fontSize: 13, flexShrink: 1 },
  grid: { gap: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  halfColumn: { flexBasis: '47%', flexGrow: 1, minWidth: 0 },
  fullColumn: { width: '100%' },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  error: { padding: 16, gap: 12, borderRadius: 12, backgroundColor: '#fff1f2' },
  errorText: { color: '#9f1239', fontSize: 16 },
});
