import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { LiftCard, M2Header, M2_BOTTOM_SPACE, M2_NAV_CLEARANCE, m2Text, useOwnPhoneChrome } from '@/design-system/m2';
import { color, font, fontWeight, size, space } from '@/design-system/theme';
import { getSetting } from '@/data/services/config';
import { useT } from '@/i18n';
import type { PostTeaser } from '../data/NewsroomRepository';
import { M2PostCard, useLatestPosts } from './M2PostParts';

export interface M2WhatsNewLinks {
  back: () => void;
  open: (post: PostTeaser) => void;
  allNews: () => void;
}

/**
 * What's new (M2WhatsNew, from Profile): the team's product update posts,
 * newest first. Published posts only; empty says "No posts yet".
 */
export function M2WhatsNewView({ links, wide = false }: { links: M2WhatsNewLinks; wide?: boolean }): React.ReactElement {
  const t = useT();
  useOwnPhoneChrome();
  const [attempt, setAttempt] = useState(0);
  const state = useLatestPosts('PRODUCT_UPDATE', getSetting('newsroom.page_size'), attempt);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, wide ? styles.wide : null]} testID="m2-whats-new">
      <M2Header backLabel={t('news.whatsNew.back')} onBack={links.back} eyebrow={t('news.whatsNew.eyebrow')} title={t('news.whatsNew.title')} />
      <Text style={styles.body}>{t('news.whatsNew.body')}</Text>
      {state.phase === 'loading' ? <View style={styles.skeleton} accessibilityLabel={t('news.loading')} aria-label={t('news.loading')} /> : null}
      {state.phase === 'error' ? (
        <LiftCard label={t('news.retry')} role="button" onPress={() => setAttempt((n) => n + 1)} style={styles.state}>
          <Icon name="alert-circle" size={22} color={color.text2} />
          <Text style={m2Text.cardTitle}>{t('news.error')}</Text>
          <Text style={styles.stateText}>{t('news.errorBody')}</Text>
        </LiftCard>
      ) : null}
      {state.phase === 'ready' && !state.posts.length ? (
        <View style={styles.state} testID="m2-whats-new-empty">
          <Icon name="sparkles" size={22} color={color.text2} />
          <Text style={m2Text.cardTitle}>{t('news.empty')}</Text>
          <Text style={styles.stateText}>{t('news.whatsNew.emptyBody')}</Text>
        </View>
      ) : null}
      {state.phase === 'ready' ? state.posts.map((post) => <M2PostCard key={post.id} post={post} onOpen={links.open} testID={`m2-whats-new-${post.slug}`} />) : null}
      <LiftCard label={t('news.whatsNew.allNews')} onPress={links.allNews} style={styles.all}>
        <Icon name="megaphone" size={18} color={color.action} />
        <Text style={styles.allText}>{t('news.whatsNew.allNews')}</Text>
        <Icon name="chevron-right" size={16} color={color.text3} strokeWidth={2.4} />
      </LiftCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingHorizontal: space.gutterPhone, paddingTop: space.s16, paddingBottom: M2_NAV_CLEARANCE + M2_BOTTOM_SPACE, gap: space.s14, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center' },
  wide: { maxWidth: size.panelMax, paddingBottom: M2_BOTTOM_SPACE },
  body: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: 20, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  skeleton: { height: 116, borderRadius: 22, backgroundColor: color.surface2 },
  state: { alignItems: 'center', gap: space.s6, padding: space.s20, borderRadius: 22, backgroundColor: color.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: color.rule },
  stateText: { textAlign: 'center', fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: 18, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  all: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.s10, paddingHorizontal: space.s16, borderRadius: 18, backgroundColor: color.surface },
  allText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.action },
});
