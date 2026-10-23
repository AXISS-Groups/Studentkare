import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BrandLogo, Icon } from '@/design-system/icons';
import { Rise } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import { IconTile, SearchField, Tag, phoneLayout, Heading } from '@/features/phoneKit/phoneParts';

/**
 * Home / Discover (canvas HomeDiscover, SK-034). The student's front page on a
 * phone: where they are, crisis support first, the search field, and the way
 * into the wellness shop and their cover. Nothing on it is drawn from the
 * health record.
 *
 * On the web the phone frame already draws the brand, the bell and the tab
 * bar; the Expo app draws the brand row here (`brandRow`).
 */
export interface HomeDiscoverLinks {
  openSearch: () => void;
  openCrisis: () => void;
  call112: () => void;
  openShop: () => void;
  /** The student's cover (ClaimsHub). The Expo app has no cover screen yet, so it leaves the tile out. */
  openCover?: () => void;
  openAyush: () => void;
  openNotifications?: () => void;
}

export interface HomeDiscoverViewProps {
  links: HomeDiscoverLinks;
  /** The student's campus, as their account names it; '' when none is linked. */
  campus: string;
  verified: boolean;
  brandRow?: boolean;
  /** Drawn after the board (the Expo app keeps its other destinations and sign-out there). */
  footer?: React.ReactNode;
}

type Pressed = { pressed: boolean; focused?: boolean };

export function HomeDiscoverView({ links, campus, verified, brandRow = false, footer }: HomeDiscoverViewProps): React.ReactElement {
  const t = useT();
  return (
    <ScrollView style={phoneLayout.screen} contentContainerStyle={styles.content} testID="home-discover">
      <View style={styles.alsoHere}>
        <Text style={styles.alsoLabel}>{t('phone.home.alsoHere')}</Text>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('nav.ayush')} onPress={links.openAyush}
          testID="home-ask-ayush" style={({ focused }: Pressed) => [styles.alsoChip, focused ? focusRing : null]}>
          <Icon name="sparkle" size={14} color={color.action} />
          <Text style={styles.alsoChipText}>{t('nav.ayush')}</Text>
        </Pressable>
      </View>

      {brandRow ? (
        <View style={styles.brandRow}>
          <BrandLogo size={size.navIcon + space.s10} label="" />
          <Text accessibilityRole="header" style={styles.brand}>{t('phone.brand')}</Text>
          {verified ? <Tag label={t('phone.home.campusTag')} tone="positive" /> : null}
          <View style={phoneLayout.grow} />
          {links.openNotifications ? (
            <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('bar.notifications')} onPress={links.openNotifications}
              style={({ focused }: Pressed) => [styles.bell, focused ? focusRing : null]}>
              <Icon name="bell-dome" size={size.navIcon} color={color.action} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Rise>
        <View style={styles.where} testID="home-campus">
          <Icon name="map-pin-4" size={16} color={color.action} />
          <Text numberOfLines={1} style={styles.whereName}>{campus || t('phone.home.noCampus')}</Text>
          {campus && verified && !brandRow ? <Tag label={t('phone.home.campusTag')} tone="positive" /> : null}
        </View>
      </Rise>

      {/* Help is one tap away (DESIGN.md §2.4): the crisis card comes before anything else. */}
      <Rise index={1}>
        <View style={styles.crisis}>
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={`${t('phone.home.crisisTitle')}. ${t('phone.home.crisisBody')}`}
            onPress={links.openCrisis} testID="home-crisis" style={({ focused }: Pressed) => [styles.crisisLink, focused ? focusRing : null]}>
            <Icon name="shield-2" size={20} color={color.dangerFill} />
            <View style={phoneLayout.grow}>
              <Text style={styles.crisisTitle}>{t('phone.home.crisisTitle')}</Text>
              <Text style={styles.crisisBody}>{t('phone.home.crisisBody')}</Text>
            </View>
          </Pressable>
          <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('crisis.call112')} onPress={links.call112}
            testID="home-call-112" style={({ focused }: Pressed) => [styles.call, focused ? focusRing : null]}>
            <Text style={styles.callText}>{t('crisis.call112')}</Text>
          </Pressable>
        </View>
      </Rise>

      <Rise index={2}>
        <SearchField value="" onPress={links.openSearch} placeholder={t('phone.search.placeholder')} label={t('phone.search.open')}
          mic={{ label: t('phone.search.micUnavailable') }} testID="home-search" />
      </Rise>

      <Rise index={3}>
        <View style={styles.hero}>
          <View style={styles.heroTag}><Text style={styles.heroTagText}>{t('phone.home.heroEyebrow')}</Text></View>
          <Heading style={styles.heroTitle}>{t('phone.home.heroTitle')}</Heading>
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('phone.home.exploreWellness')} onPress={links.openShop}
            testID="home-explore" style={({ focused }: Pressed) => [styles.heroCta, focused ? focusRing : null]}>
            <Text style={styles.heroCtaText}>{t('phone.home.exploreWellness')}</Text>
            <Icon name="arrow-right" size={15} color={color.onHeroCurrent} />
          </Pressable>
        </View>
      </Rise>

      <Rise index={4}>
        <View style={styles.tiles}>
          <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('phone.home.everyday')} onPress={links.openShop}
            testID="home-everyday" style={({ focused }: Pressed) => [styles.tileCard, focused ? focusRing : null]}>
            <IconTile icon="map-pin" size={34} iconSize={17} />
            <Text style={styles.tileText}>{t('phone.home.everyday')}</Text>
          </Pressable>
          {links.openCover ? (
            <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('phone.home.cover')} onPress={links.openCover}
              testID="home-cover" style={({ focused }: Pressed) => [styles.tileCard, focused ? focusRing : null]}>
              <IconTile icon="flask-2" tone="positive" size={34} iconSize={17} />
              <Text style={styles.tileText}>{t('phone.home.cover')}</Text>
            </Pressable>
          ) : null}
        </View>
      </Rise>
      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.gutterPhone, paddingTop: space.s10, paddingBottom: space.s32, gap: space.s14 },
  alsoHere: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  alsoLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.text3 },
  alsoChip: {
    minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s6, paddingHorizontal: space.s12,
    borderRadius: radius.md, backgroundColor: color.surface3,
  },
  alsoChipText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.action },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  brand: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  bell: { width: size.touchTarget, height: size.touchTarget, alignItems: 'center', justifyContent: 'center' },
  where: { flexDirection: 'row', alignItems: 'center', gap: space.s6, flexWrap: 'wrap' },
  whereName: { flexShrink: 1, fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
  crisis: {
    flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s12, paddingHorizontal: space.s14,
    borderRadius: radius.xl, backgroundColor: color.dangerBg, borderWidth: 1, borderColor: color.dangerRule,
  },
  crisisLink: { flex: 1, minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  crisisTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.danger },
  crisisBody: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.danger },
  call: { minHeight: size.touchTarget, paddingHorizontal: space.s14, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: color.dangerFill },
  callText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.onDangerFill },
  hero: { padding: space.s20, borderRadius: radius.xl, backgroundColor: color.heroBg, gap: space.s10 },
  heroTag: { alignSelf: 'flex-start', paddingHorizontal: space.s10, paddingVertical: space.s4, borderRadius: radius.full, backgroundColor: color.onHeroVeil, borderWidth: 1, borderColor: color.onHeroRule },
  heroTagText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.onHeroPositive },
  heroTitle: { fontFamily: font.family.sans, fontSize: font.size.title, lineHeight: font.size.title * font.lineHeight.tight + space.s2, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  heroCta: {
    alignSelf: 'flex-start', minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s8, marginTop: space.s4,
    paddingHorizontal: space.s20, borderRadius: radius.full, backgroundColor: color.heroCurrent,
  },
  heroCtaText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.onHeroCurrent },
  tiles: { flexDirection: 'row', gap: space.s12 },
  tileCard: { flex: 1, padding: space.s14, gap: space.s10, borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  tileText: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.strong), color: color.text },
});
