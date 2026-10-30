import React from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedIcon, Icon } from '@/design-system/icons';
import type { SkAnimatedName } from '@/design-system/icons';
import { Rise } from '@/design-system';
import { cardLabel,
  Gradient, HeroCarousel, LiftCard, M2Grid, M2Heading, M2SearchField, M2WideColumn, M2SectionHead, M2_NAV_CLEARANCE, NAVY_STOPS, ProgressRing, RoundButton, SERVICE_HUES,
  ServiceRail, SoftIcon, SoftTileGrid, SosButton, heroStops, m2Text, useLift, useOwnPhoneChrome,
} from '@/design-system/m2';
import type { HeroSlide, PressState, ServiceTile } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, shadow, shadowStyle, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { LiveCatalogItem } from '@/data/types/workflowTypes';
import { money } from '@/data/types/workflowTypes';
import { clockLabel, dayLabel } from '@/features/phoneboards/format';
import { HOME_CONCERNS, productArt } from '../data/storeArt';
import type { ShopFilter } from '../data/storeArt';
import { orderLinePhone } from '../data/orderLine';
import { packageMeta } from './M2LabsView';
import type { M2HomeData } from '../data/useM2Home';

/**
 * Mobile 2.0 Home · For You (canvas page 9 M2Home, Tier 2; replaces
 * HomeDiscover). The student's front page: who and where they are, SOS, search
 * and a prescription upload, the service rail, the highlights, today's
 * medicines and next consult, shop by concern, what they looked at, and the
 * campus services.
 *
 * Health data (Rule L, founder 2026-10-21): only "Medicines today", read from
 * the clinical endpoint and drawn here; nothing from it reaches a catalogue or
 * commerce request. The trust strip is gone (AGENTS.md rule 6). Parts with no
 * backend are left out ("Clinic pickup today", the delivery address picker);
 * "Call to order" shows only once an order line is configured.
 */
export type ServiceKey = 'you' | 'medicines' | 'labs' | 'consults' | 'nearMe' | 'vaccines' | 'insurance' | 'campus';

export interface M2HomeLinks {
  sos: () => void;
  /** The account menu (the avatar). */
  menu?: () => void;
  notifications?: () => void;
  cart: () => void;
  search: () => void;
  uploadRx: () => void;
  /** Where the student's campus and hostel are set (the location row). */
  place: () => void;
  /** The service rail; a service with no screen on this platform is left off the rail. */
  services: Partial<Record<Exclude<ServiceKey, 'you'>, () => void>>;
  /** Highlights: the semester check (lab tests), generics (medicines), any-lab report upload. */
  labs: () => void;
  generics: () => void;
  uploadReport: () => void;
  meds: () => void;
  buyAgain: () => void;
  consult: () => void;
  bookConsult: () => void;
  concern: (filter: ShopFilter) => void;
  product: (item: LiveCatalogItem) => void;
  emergencyCard: () => void;
  pass: () => void;
  hostelVisit: () => void;
  camp: () => void;
}

export interface M2HomeViewProps {
  name: string;
  campus: string;
  verified: boolean;
  data: M2HomeData;
  links: M2HomeLinks;
  /** The cart, where the platform has one (web): its count and add. */
  cart?: { count: number; add: (item: LiveCatalogItem) => void; canAdd: (item: LiveCatalogItem) => boolean };
  recent: readonly LiveCatalogItem[];
  /** Under the board (the Expo app keeps its other destinations and sign-out there). */
  footer?: React.ReactNode;
  /** "From the StudentKare blog": the latest reviewed health tips (features/newsroom M2BlogCard). Editorial, never about the student. */
  blog?: React.ReactNode;
  /**
   * Drawn in the desktop web shell (parity phase 2): the same board laid out wide (the rail in one row,
   * two highlights, Today for you as one bento row, eight concerns a row, campus tiles in a row). The
   * shell's top bar already has the bell, cart, SOS, account and the one search box, so the board's own
   * copies are left out there.
   */
  wide?: boolean;
}

const NOON = 12;
const EVENING = 17;

function greetingKey(now = new Date()): MessageKey {
  const hour = now.getHours();
  if (hour < NOON) return 'm2.home.morning';
  if (hour < EVENING) return 'm2.home.afternoon';
  return 'm2.home.evening';
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return `${first}${last}`.toUpperCase();
}

const SERVICES: readonly { key: ServiceKey; label: MessageKey; icon: ServiceTile['icon']; hue: ServiceTile['hue']; anim?: SkAnimatedName }[] = [
  { key: 'you', label: 'm2.svc.you', icon: 'star', hue: 'indigo' },
  { key: 'medicines', label: 'm2.svc.medicines', icon: 'pill-3', hue: 'teal' },
  { key: 'labs', label: 'm2.svc.labs', icon: 'lab', hue: 'violet' },
  { key: 'consults', label: 'm2.svc.consults', icon: 'stetho', hue: 'blue' },
  // Find care near you: hospitals, pharmacies, ambulance and doctors by department.
  { key: 'nearMe', label: 'fc.svc.nearMe', icon: 'map-pin-2', hue: 'orange' },
  { key: 'vaccines', label: 'm2.svc.vaccines', icon: 'syringe', hue: 'amber' },
  { key: 'insurance', label: 'm2.svc.insurance', icon: 'shield', hue: 'green' },
  // The campus tile's house is the animated set's anim-home (the pill nav's Home): it plays once as the rail comes into view.
  { key: 'campus', label: 'm2.svc.campus', icon: 'home-2', hue: 'sky', anim: 'anim-home' },
];

/** The same drawings from the animated set: a document for the report, the refresh arrows for buy again. */
const TODAY_ANIM: Readonly<Record<'doc' | 'refresh', SkAnimatedName>> = { doc: 'anim-file-text', refresh: 'anim-refresh' };

function TodayTile({ icon, hue, title, onPress, testID, fill = false }: { icon: 'doc' | 'refresh'; hue: 'orange' | 'green'; title: string; onPress: () => void; testID: string; fill?: boolean }) {
  return (
    <LiftCard label={title} onPress={onPress} testID={testID} fill={fill} style={styles.todayTile}>
      {/* A raised 3D tile that draws its icon once as it comes into view (anim-refresh is a loader loop: once here). The still soft tile is the poster. */}
      <View style={styles.todayArt}>
        <AnimatedIcon name={TODAY_ANIM[icon]} variant="3d" hue={hue} size="mark" play="mount"
          poster={<SoftIcon icon={icon} hue={hue} tile={38} iconSize={20} />} testID={`${testID}-anim`} />
      </View>
      <Text style={m2Text.cardTitle}>{title}</Text>
    </LiftCard>
  );
}

function MedsCard({ data, onPress }: { data: M2HomeData['meds']; onPress: () => void }) {
  const t = useT();
  const s = data.summary;
  const left = s ? s.planned - s.taken - s.skipped : 0;
  const line = data.loading ? t('m2.home.medsLoading') : data.failed ? t('m2.home.medsFailed') : !s ? t('m2.home.medsNone')
    : left > 0 ? t(left === 1 ? 'm2.home.medsLeftOne' : 'm2.home.medsLeft', { count: left }) : t('m2.home.medsAllTaken');
  const spoken = s ? `${t('m2.home.medsEyebrow')}. ${t('m2.home.medsSpoken', { taken: s.taken, planned: s.planned })}. ${line}` : `${t('m2.home.medsEyebrow')}. ${line}`;
  const lift = useLift();
  return (
    <Pressable role="link" accessibilityRole="link" {...cardLabel(spoken)} onPress={onPress} testID="m2-home-meds"
      style={(state: PressState) => [styles.medsPress, lift(state)]}>
      <Gradient colors={NAVY_STOPS} angle={160} style={styles.meds}>
        <Text style={styles.medsEyebrow}>{t('m2.home.medsEyebrow')}</Text>
        {s ? (
          <View style={styles.ringRow}>
            <ProgressRing value={s.taken / s.planned} centre={t('m2.home.medsCount', { taken: s.taken, planned: s.planned })} testID="m2-home-meds-ring" />
            {/* The ring is hidden from screen readers; on the web the card is named by its text, so the count is said in words here. */}
            {Platform.OS === 'web' ? <Text style={styles.spokenOnly}>{t('m2.home.medsSpoken', { taken: s.taken, planned: s.planned })}</Text> : null}
          </View>
        ) : null}
        <Text style={styles.medsLine}>{line}</Text>
        <Text style={styles.medsNote}>{t('m2.home.medsNote')}</Text>
      </Gradient>
    </Pressable>
  );
}

function ConsultCard({ data, links, wide = false }: { data: M2HomeData['consult']; links: M2HomeLinks; wide?: boolean }) {
  const t = useT();
  const next = data.next;
  const when = next ? t('m2.home.consultWhen', { day: dayLabel(next.slotStart, t), time: clockLabel(next.slotStart) }) : '';
  const status = next ? t(next.status === 'CONFIRMED' ? 'm2.home.consultConfirmed' : 'm2.home.consultRequested') : '';
  const label = next ? `${t('m2.home.nextConsult')}: ${when}. ${status}. ${t('m2.home.details')}` : `${t('m2.home.noConsult')}. ${t('m2.home.bookConsult')}`;
  return (
    <LiftCard label={label} onPress={next ? links.consult : links.bookConsult} testID="m2-home-consult" fill={wide} style={[styles.consult, wide ? styles.consultWide : null]}>
      <SoftIcon icon="stetho" hue="blue" tile={52} iconSize={24} />
      <View style={styles.grow}>
        <Text style={m2Text.eyebrow}>{t('m2.home.nextConsult')}</Text>
        {data.loading ? <Text style={m2Text.body}>{t('m2.home.consultLoading')}</Text> : next ? (
          <>
            <Text style={styles.consultWhen}>{when}</Text>
            <Text style={m2Text.body}>{status}</Text>
          </>
        ) : <Text style={styles.consultWhen}>{t('m2.home.noConsult')}</Text>}
      </View>
      <View style={styles.pill}><Text style={styles.pillText}>{next ? t('m2.home.details') : t('m2.home.book')}</Text></View>
    </LiftCard>
  );
}

function RecentCard({ item, onOpen, cart, wide = false }: { item: LiveCatalogItem; onOpen: () => void; cart?: M2HomeViewProps['cart']; wide?: boolean }) {
  const t = useT();
  const art = productArt(item);
  const hue = SERVICE_HUES[art.hue];
  const canAdd = cart ? cart.canAdd(item) : false;
  return (
    <View style={wide ? styles.recentWide : styles.recent}>
      <LiftCard label={`${item.name}, ${item.pack}, ${money(item.pricePaise)}`} onPress={onOpen} testID={`m2-recent-${item.id}`} style={styles.recentOpen}>
        <View style={[styles.recentArt, { backgroundColor: hue.soft }]}><Icon name={art.icon} size={34} color={hue.ink} strokeWidth={1.8} /></View>
        <Text numberOfLines={2} style={m2Text.cardTitle}>{item.name}</Text>
        <Text numberOfLines={1} style={m2Text.meta}>{item.pack}</Text>
        <Text style={m2Text.price}>{money(item.pricePaise)}</Text>
      </LiftCard>
      {cart && canAdd ? (
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('m2.addSpoken', { name: item.name })} aria-label={t('m2.addSpoken', { name: item.name })}
          onPress={() => cart.add(item)} testID={`m2-recent-add-${item.id}`} style={({ focused }: PressState) => [styles.add, focused ? focusRing : null]}>
          <Icon name="plus" size={16} color={color.onAction} strokeWidth={2.6} />
        </Pressable>
      ) : null}
    </View>
  );
}

function CampusTile({ icon, hue, title, onPress, testID, wide = false }: { icon: 'qr-code-2' | 'home-2' | 'calendar-2'; hue: 'indigo' | 'sky' | 'amber'; title: string; onPress: () => void; testID: string; wide?: boolean }) {
  return (
    <LiftCard label={title} onPress={onPress} testID={testID} fill={wide} style={[styles.campusTile, wide ? styles.campusTileWide : null]}>
      <SoftIcon icon={icon} hue={hue} tile={38} iconSize={20} />
      <Text style={m2Text.cardTitle}>{title}</Text>
    </LiftCard>
  );
}

export function M2HomeView({ name, campus, verified, data, links, cart, recent, footer, blog, wide = false }: M2HomeViewProps): React.ReactElement {
  const t = useT();
  useOwnPhoneChrome();
  const phone = orderLinePhone();
  // Highlights from real data only: the lab package the catalogue lists, Generics when the programme is on, and the
  // report upload (an action, not an offer). No promotional claim the platform cannot back (founder, 23 Oct 2026).
  const lab = data.featuredLab ?? null;
  const slides: HeroSlide[] = [
    ...(lab ? [{ key: 'check', eyebrow: t('m2.labs.heroEyebrow'), title: lab.name, body: t('m2.labs.heroMeta', { meta: packageMeta(lab, t), hours: lab.reportHours }), cta: t('m2.labs.bookSlot'), icon: 'lab' as const, stops: NAVY_STOPS, chipFill: color.brandNavy, ink: color.onHeroCurrent, onPress: links.labs }] : []),
    ...(data.genericsHighlight ? [{ key: 'generics', eyebrow: t('m2.home.s2.eyebrow'), title: t('m2.home.s2.title'), body: t('m2.home.s2.body'), cta: t('m2.home.s2.cta'), icon: 'plus-slash' as const, stops: heroStops('green'), chipFill: SERVICE_HUES.green.end, ink: SERVICE_HUES.green.end, onPress: links.generics }] : []),
    { key: 'report', eyebrow: t('m2.home.s3.eyebrow'), title: t('m2.home.s3.title'), body: t('m2.home.s3.body'), cta: t('m2.home.s3.cta'), icon: 'doc-upload', stops: heroStops('orange'), chipFill: SERVICE_HUES.orange.end, ink: SERVICE_HUES.orange.deep, onPress: links.uploadReport },
  ];
  const tiles: ServiceTile[] = SERVICES.flatMap((s) => {
    const open = s.key === 'you' ? () => undefined : links.services[s.key];
    return open ? [{ key: s.key, label: t(s.label), icon: s.icon, hue: s.hue, anim: s.anim, onPress: open }] : [];
  });
  const buyAgain = data.buyAgainCount === null || data.buyAgainCount === 0 ? t('m2.home.buyAgain')
    : t(data.buyAgainCount === 1 ? 'm2.home.buyAgainOne' : 'm2.home.buyAgainCount', { count: data.buyAgainCount });

  // Wide, the shell's main column gives the gutter; on the phone each section has its own.
  const gutter = wide ? undefined : styles.gutter;
  const placeRow = (
    <View style={[styles.placeRow, wide ? styles.placeRowWide : null]}>
      <Pressable role="link" accessibilityRole="link" onPress={links.place} testID="m2-home-place"
        accessibilityLabel={campus ? t('m2.home.placeSpoken', { place: campus }) : t('m2.home.noCampus')}
        aria-label={campus ? t('m2.home.placeSpoken', { place: campus }) : t('m2.home.noCampus')}
        style={({ focused }: PressState) => [styles.place, focused ? focusRing : null]}>
        <Icon name="map-pin-2" size={16} color={color.action} strokeWidth={2.2} />
        <Text numberOfLines={1} style={styles.placeText}>{campus || t('m2.home.noCampus')}</Text>
        <Icon name="chevron-down" size={14} color={color.text} strokeWidth={2.4} />
      </Pressable>
      {campus && verified ? (
        <View style={[styles.verified, wide ? styles.verifiedWide : null]}><View style={styles.dot} /><Text style={styles.verifiedText}>{t('m2.home.verified')}</Text></View>
      ) : null}
    </View>
  );
  const rxButton = (
    <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.home.uploadRx')} aria-label={t('m2.home.uploadRx')} onPress={links.uploadRx}
      testID="m2-home-rx" style={({ focused }: PressState) => [styles.rxPress, focused ? focusRing : null]}>
      <Gradient colors={NAVY_STOPS} style={styles.rx}><Icon name="doc-upload" size={21} color={color.onHero} strokeWidth={2.2} /></Gradient>
    </Pressable>
  );
  const emergency = (
    <LiftCard key="emergency" label={`${t('m2.home.emergencyCard')}. ${t('m2.home.offlineReady')}`} onPress={links.emergencyCard} testID="m2-home-emergency" fill={wide}
      style={[styles.campusTile, wide ? styles.campusTileWide : null, styles.emergency]}>
      <View style={styles.emergencyTop}>
        <Icon name="card-lines" size={22} color={color.onHeroPositive} />
        <Text style={styles.offline}>{t('m2.home.offlineReady')}</Text>
      </View>
      <Text style={styles.emergencyTitle}>{t('m2.home.emergencyCard')}</Text>
    </LiftCard>
  );
  const campusTiles = [
    emergency,
    <CampusTile key="pass" icon="qr-code-2" hue="indigo" title={t('m2.home.pass')} onPress={links.pass} testID="m2-home-pass" wide={wide} />,
    <CampusTile key="hostel" icon="home-2" hue="sky" title={t('m2.home.hostel')} onPress={links.hostelVisit} testID="m2-home-hostel" wide={wide} />,
    <CampusTile key="camp" icon="calendar-2" hue="amber" testID="m2-home-camp" onPress={links.camp} wide={wide}
      title={data.camp ? t('m2.home.campDay', { day: dayLabel(data.camp.date, t) }) : t('m2.home.camp')} />,
  ];

  const board = (
    <>
      <Rise>
        {wide ? (
          <View style={styles.headerWide}>
            <View style={styles.grow}>
              <Text style={styles.greeting}>{t(greetingKey())}</Text>
              <M2Heading level={1} style={[styles.name, styles.nameWide]}>{name}</M2Heading>
            </View>
            {placeRow}
            {rxButton}
          </View>
        ) : (
          <View style={styles.header}>
            {links.menu ? (
              <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('m2.home.openMenuInitials', { initials: initials(name) })} aria-label={t('m2.home.openMenuInitials', { initials: initials(name) })} onPress={links.menu}
                testID="m2-home-avatar" style={({ focused }: PressState) => [styles.avatar, focused ? focusRing : null]}>
                <Text style={styles.avatarText}>{initials(name)}</Text>
              </Pressable>
            ) : (
              <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Text style={styles.avatarText}>{initials(name)}</Text></View>
            )}
            <View style={styles.grow}>
              <Text style={styles.greeting}>{t(greetingKey())}</Text>
              <M2Heading level={1} style={styles.name}>{name}</M2Heading>
            </View>
            {links.notifications ? <RoundButton icon="bell-dome" label={t('m2.home.notifications')} onPress={links.notifications} testID="m2-home-bell" /> : null}
            <RoundButton icon="cart" label={cart && cart.count > 0 ? t(cart.count === 1 ? 'm2.cartOne' : 'm2.cartCount', { count: cart.count }) : t('m2.cart')}
              badge={cart?.count} onPress={links.cart} testID="m2-home-cart" />
            <SosButton label={t('m2.sos')} spoken={t('m2.sosSpoken')} onPress={links.sos} />
          </View>
        )}
      </Rise>

      {wide ? null : (
        <>
          <Rise index={1}>{placeRow}</Rise>
          <Rise index={2}>
            <View style={styles.searchRow}>
              <M2SearchField placeholder={t('m2.home.search')} label={t('m2.home.searchLabel')} onPress={links.search} micUnavailable={t('m2.micUnavailable')} testID="m2-home-search" />
              {rxButton}
            </View>
          </Rise>
        </>
      )}

      <Rise index={3}><ServiceRail label={t('m2.home.services')} tiles={tiles} current="you" /></Rise>

      <Rise index={4} style={gutter}>
        <HeroCarousel label={t('m2.home.highlights')} slides={slides} dotLabel={(n) => t('m2.home.dot', { n })} />
      </Rise>

      <Rise index={5} style={gutter}>
        <M2SectionHead title={t('m2.home.today')} />
        {wide ? (
          <M2Grid columns={{ tablet: 2, desktop: 4 }}>
            <MedsCard data={data.meds} onPress={links.meds} />
            <TodayTile icon="doc" hue="orange" title={t('m2.home.uploadReport')} onPress={links.uploadReport} testID="m2-home-report" fill />
            <TodayTile icon="refresh" hue="green" title={buyAgain} onPress={links.buyAgain} testID="m2-home-buy-again" fill />
            <ConsultCard data={data.consult} links={links} wide />
          </M2Grid>
        ) : (
          <>
            <View style={styles.todayGrid}>
              <View style={styles.todayCol}><MedsCard data={data.meds} onPress={links.meds} /></View>
              <View style={[styles.todayCol, styles.todayStack]}>
                <TodayTile icon="doc" hue="orange" title={t('m2.home.uploadReport')} onPress={links.uploadReport} testID="m2-home-report" />
                <TodayTile icon="refresh" hue="green" title={buyAgain} onPress={links.buyAgain} testID="m2-home-buy-again" />
              </View>
            </View>
            <ConsultCard data={data.consult} links={links} />
          </>
        )}
      </Rise>

      {blog ? <Rise index={6} style={gutter}>{blog}</Rise> : null}

      <Rise index={6} style={gutter}>
        <M2SectionHead title={t('m2.home.concern')} action={links.services.medicines ? { label: t('m2.seeAll'), spoken: t('m2.home.seeAllMedicines'), onPress: links.services.medicines } : undefined} />
        <SoftTileGrid testID="m2-home-concern" items={HOME_CONCERNS.map((c) => ({ key: c.key, label: t(c.label), icon: c.icon, hue: c.hue, onPress: () => links.concern(c.filter) }))} />
      </Rise>

      {recent.length > 0 ? (
        <Rise index={7}>
          <View style={gutter}><M2SectionHead title={t('m2.home.recent')} /></View>
          {wide ? (
            <M2Grid columns={{ tablet: 3, desktop: 6 }} testID="m2-home-recent">
              {recent.map((item) => <RecentCard key={item.id} item={item} cart={cart} wide onOpen={() => links.product(item)} />)}
            </M2Grid>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} testID="m2-home-recent">
              {recent.map((item) => <RecentCard key={item.id} item={item} cart={cart} onOpen={() => links.product(item)} />)}
            </ScrollView>
          )}
        </Rise>
      ) : null}

      <Rise index={7} style={gutter}>
        <M2SectionHead title={t('m2.home.campus')} />
        {wide ? <M2Grid columns={{ tablet: 2, desktop: 4 }}>{campusTiles}</M2Grid> : <View style={styles.campusGrid}>{campusTiles}</View>}
      </Rise>

      {phone ? (
        <View style={[styles.callRow, wide ? styles.callRowWide : null]}>
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('m2.callOrderSpoken', { number: phone })} aria-label={t('m2.callOrderSpoken', { number: phone })}
            onPress={() => void Linking.openURL(`tel:${phone}`)} testID="m2-home-call" style={({ focused }: PressState) => [styles.call, focused ? focusRing : null]}>
            <Gradient colors={NAVY_STOPS} style={styles.callIcon}><Icon name="phone" size={15} color={color.onHero} strokeWidth={2.4} /></Gradient>
            <Text style={styles.callText}>{t('m2.callOrder')}</Text>
          </Pressable>
        </View>
      ) : null}
      {footer ? <View style={gutter}>{footer}</View> : null}
    </>
  );

  if (wide) {
    return (
      <M2WideColumn testID="m2-home">{board}</M2WideColumn>
    );
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2-home">
      <Gradient colors={[color.surface3, color.canvas]} radial={{ x: 0.5, y: 0.5 }} style={styles.glow} pointerEvents="none" />
      {board}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Read by screen readers, not drawn (opacity, not display: none, so it stays in the accessible name).
  spokenOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingTop: space.s16, paddingBottom: M2_NAV_CLEARANCE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', top: -120, right: -90, width: 300, height: 300, borderRadius: radius.full, opacity: 0.9 },
  gutter: { paddingHorizontal: space.gutterPhone },
  headerWide: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.s16 },
  nameWide: { fontSize: font.size.heading },
  placeRowWide: { paddingHorizontal: 0 },
  verifiedWide: { marginLeft: 0 },
  consultWide: { marginTop: 0, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between' },
  recentWide: { flexGrow: 1 },
  campusTileWide: { flexBasis: 'auto', height: 'auto', minHeight: 112 },
  callRowWide: { paddingHorizontal: 0 },
  grow: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingHorizontal: space.gutterPhone },
  avatar: { width: size.touchTarget, height: size.touchTarget, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface3 },
  avatarText: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  greeting: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  name: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.4, color: color.text },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8, paddingHorizontal: space.gutterPhone },
  place: { flexShrink: 1, minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s6 },
  placeText: { flexShrink: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  verified: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: space.s6, paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full, backgroundColor: color.positiveBg },
  dot: { width: 7, height: 7, borderRadius: radius.full, backgroundColor: color.positiveFill },
  verifiedText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingHorizontal: space.gutterPhone },
  rxPress: { borderRadius: 18, ...shadowStyle(shadow.float) },
  rx: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  todayGrid: { flexDirection: 'row', gap: space.s12 },
  todayCol: { flex: 1, minWidth: 0 },
  todayStack: { gap: space.s12 },
  todayArt: { alignSelf: 'flex-start' },
  todayTile: { flex: 1, minHeight: 104, borderRadius: 24, padding: space.s14, justifyContent: 'space-between', gap: space.s8, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  medsPress: { flex: 1, borderRadius: 24 },
  meds: { flex: 1, minHeight: 220, borderRadius: 24, padding: space.s16, justifyContent: 'space-between', gap: space.s6 },
  medsEyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.onHero2 },
  ringRow: { alignItems: 'center' },
  medsLine: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: 19, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  medsNote: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.onHero2 },
  consult: { marginTop: space.s12, borderRadius: 24, paddingVertical: space.s14, paddingHorizontal: space.s16, flexDirection: 'row', alignItems: 'center', gap: space.s14, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  consultWhen: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  pill: { minHeight: 36, paddingHorizontal: space.s14, borderRadius: radius.full, justifyContent: 'center', backgroundColor: color.surface3 },
  pillText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  rail: { paddingHorizontal: space.gutterPhone, paddingBottom: space.s8, gap: space.s12 },
  recent: { width: 148 },
  recentOpen: { borderRadius: 22, padding: space.s12, gap: space.s6, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  recentArt: { height: 84, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  add: {
    position: 'absolute', right: space.s10, bottom: space.s8, width: size.touchTarget, height: size.touchTarget, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', backgroundColor: color.action,
  },
  campusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12 },
  campusTile: { flexBasis: '46%', flexGrow: 1, height: 112, borderRadius: 22, padding: space.s14, justifyContent: 'space-between', backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  emergency: { backgroundColor: color.brandNavy },
  emergencyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  offline: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 0.6, textTransform: 'uppercase', color: color.onHeroPositive },
  emergencyTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  callRow: { paddingHorizontal: space.gutterPhone, alignItems: 'flex-end' },
  call: {
    minHeight: 48, paddingLeft: space.s12, paddingRight: space.s16, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: space.s8,
    backgroundColor: color.surface, ...shadowStyle(shadow.float),
  },
  callIcon: { width: 30, height: 30, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  callText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
});
