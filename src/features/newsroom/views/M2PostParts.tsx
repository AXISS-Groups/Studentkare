import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, Icon3d } from '@/design-system/icons';
import { Gradient, LiftCard, M2SectionHead, NAVY_STOPS, heroStops, m2Text } from '@/design-system/m2';
import { color, font, fontWeight, radius, shadow, shadowStyle, space } from '@/design-system/theme';
import { getSetting } from '@/data/services/config';
import { useLanguage, useT } from '@/i18n';
import { NewsroomRepository } from '../data/NewsroomRepository';
import type { PostTeaser } from '../data/NewsroomRepository';
import { TEMPLATES } from '../model/templates';
import type { PostTemplate } from '../model/templates';
import { formatDate } from '../model/share';

/**
 * The newsroom inside the student app (Mobile 2.0): published posts only, in
 * their template's colours. Posts are editorial; nothing here reads or shows
 * anything about the student (Rule L), and no post is about a student.
 */
export type PostsState = { phase: 'loading' } | { phase: 'error' } | { phase: 'ready'; posts: PostTeaser[] };

/** The latest published posts of one template (Home: health tips; What's new: product updates). */
export function useLatestPosts(template: PostTemplate, count: number, attempt = 0): PostsState {
  const [state, setState] = useState<PostsState>({ phase: 'loading' });
  useEffect(() => {
    if (count <= 0) {
      setState({ phase: 'ready', posts: [] });
      return undefined;
    }
    const controller = new AbortController();
    setState({ phase: 'loading' });
    new NewsroomRepository().list({ template, pageSize: count }, controller.signal).then(
      (res) => setState({ phase: 'ready', posts: [...(res.featured ? [res.featured] : []), ...res.items].slice(0, count) }),
      () => { if (!controller.signal.aborted) setState({ phase: 'error' }); },
    );
    return () => controller.abort();
  }, [template, count, attempt]);
  return state;
}

export function homeTeaserCount(): number {
  return getSetting('newsroom.home_teasers');
}

function stopsFor(template: PostTemplate): readonly string[] {
  const hue = TEMPLATES[template].hue;
  return hue === 'indigo' ? NAVY_STOPS : heroStops(hue);
}

/** A post as a phone card: a small cover in its template's gradient, then title, summary and date. */
export function M2PostCard({ post, onOpen, testID }: { post: PostTeaser; onOpen: (post: PostTeaser) => void; testID?: string }): React.ReactElement {
  const t = useT();
  const { lang } = useLanguage();
  const spec = TEMPLATES[post.template];
  const art = post.coverArt && (spec.art as readonly string[]).includes(post.coverArt) ? spec.art.find((a) => a === post.coverArt) : undefined;
  return (
    <LiftCard label={post.title} onPress={() => onOpen(post)} testID={testID} style={styles.card}>
      <Gradient colors={stopsFor(post.template)} style={styles.cover}>
        <View style={styles.coverTop}>
          <Icon name={spec.icon} size={14} color={color.onHero} strokeWidth={2.2} />
          <Text style={styles.coverLabel}>{t(spec.label)}</Text>
        </View>
        {art ? <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Icon3d name={art} size={46} /></View> : null}
      </Gradient>
      <View style={styles.text}>
        <Text style={m2Text.cardTitle} numberOfLines={2}>{post.title}</Text>
        {post.summary ? <Text style={styles.summary} numberOfLines={2}>{post.summary}</Text> : null}
        <Text style={styles.meta}>{`${formatDate(post.publishedAt, lang)} · ${t('news.minRead', { n: post.readingMinutes })}`}</Text>
        {post.reviewed ? (
          <View style={styles.reviewed}>
            <Icon name="shield-check" size={13} color={color.positive} strokeWidth={2.2} />
            <Text style={styles.reviewedText} numberOfLines={1}>{t('news.reviewedShort', { name: post.reviewed.by })}</Text>
          </View>
        ) : null}
        {post.sample ? <Text style={styles.sample}>{t('news.sample')}</Text> : null}
      </View>
    </LiftCard>
  );
}

/** "From the StudentKare blog" on Home: the latest health tips, each reviewed by a clinician. */
export function M2BlogCard({ state, onOpen, onAll, onRetry }: { state: PostsState; onOpen: (post: PostTeaser) => void; onAll: () => void; onRetry: () => void }): React.ReactElement | null {
  const t = useT();
  return (
    <View testID="m2-home-blog" style={styles.section}>
      <M2SectionHead title={t('news.home.title')} action={{ label: t('news.home.seeAll'), spoken: t('news.home.seeAllSpoken'), onPress: onAll }} />
      {state.phase === 'loading' ? <View style={styles.skeleton} accessibilityLabel={t('news.loading')} aria-label={t('news.loading')} /> : null}
      {state.phase === 'error' ? (
        <LiftCard label={t('news.home.failed')} role="button" onPress={onRetry} style={styles.empty}>
          <Icon name="refresh" size={18} color={color.text2} />
          <Text style={styles.emptyText}>{t('news.home.failed')}</Text>
        </LiftCard>
      ) : null}
      {state.phase === 'ready' && !state.posts.length ? (
        <View style={styles.empty} testID="m2-home-blog-empty">
          <Icon name="book" size={18} color={color.text2} />
          <Text style={styles.emptyText}>{t('news.empty')}</Text>
        </View>
      ) : null}
      {state.phase === 'ready' ? state.posts.map((post) => <M2PostCard key={post.id} post={post} onOpen={onOpen} testID={`m2-home-blog-${post.slug}`} />) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.s12 },
  card: { flexDirection: 'row', gap: space.s12, padding: space.s10, borderRadius: 22, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  cover: { width: 112, minHeight: 96, borderRadius: radius.lg, padding: space.s8, justifyContent: 'space-between', overflow: 'hidden' },
  coverTop: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  coverLabel: { flexShrink: 1, fontFamily: font.family.sans, fontSize: 10, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 0.6, textTransform: 'uppercase', color: color.onHero },
  art: { alignSelf: 'flex-end' },
  text: { flex: 1, minWidth: 0, gap: space.s4, justifyContent: 'center' },
  summary: { fontFamily: font.family.sans, fontSize: font.size.caption, lineHeight: 17, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  reviewed: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  reviewedText: { flexShrink: 1, fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  sample: { alignSelf: 'flex-start', paddingHorizontal: space.s8, paddingVertical: space.s2, borderRadius: radius.full, overflow: 'hidden', backgroundColor: color.attentionBg, color: color.attention, fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  skeleton: { height: 116, borderRadius: 22, backgroundColor: color.surface2 },
  empty: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.s8, paddingHorizontal: space.s16, borderRadius: 22, backgroundColor: color.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: color.rule },
  emptyText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text2 },
});
